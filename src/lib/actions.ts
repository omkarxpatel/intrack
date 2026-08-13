"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, rolePresets, statusEvents } from "@/db/schema";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { getCurrentUserId } from "@/lib/auth";
import { applicationInputSchema } from "@/lib/validation";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function invalid<T>(error: z.ZodError<T>): ActionResult<never> {
  const flat = z.flattenError(error);
  const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
  const firstMessage = Object.values(fieldErrors).find((messages) => messages?.length)?.[0];
  return {
    ok: false,
    error: firstMessage ?? flat.formErrors[0] ?? "Invalid input",
    fieldErrors: fieldErrors as Record<string, string[]>,
  };
}

/** Saving an application makes its role available in the dropdown next time. */
async function rememberRole(userId: string, role: string) {
  await getDb().insert(rolePresets).values({ userId, role }).onConflictDoNothing();
}

const roleSchema = z.string().trim().min(1, "Role is required").max(200);

export async function addRolePreset(raw: string): Promise<ActionResult<{ role: string }>> {
  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const userId = await getCurrentUserId();
  await rememberRole(userId, parsed.data);

  revalidatePath("/");
  return { ok: true, data: { role: parsed.data } };
}

/**
 * Renames the preset *and* every application using it. Renaming only the
 * preset would leave those applications on a name no longer in the list, and
 * saving one would silently resurrect the old preset via rememberRole.
 */
export async function renameRolePreset(
  rawFrom: string,
  rawTo: string,
): Promise<ActionResult<{ role: string; applicationsUpdated: number }>> {
  const parsed = z.object({ from: roleSchema, to: roleSchema }).safeParse({
    from: rawFrom,
    to: rawTo,
  });
  if (!parsed.success) return invalid(parsed.error);
  const { from, to } = parsed.data;

  const db = getDb();
  const userId = await getCurrentUserId();
  if (from === to) return { ok: true, data: { role: to, applicationsUpdated: 0 } };

  // The target may already exist, so add-then-remove rather than an UPDATE
  // that could trip the (user_id, role) unique index.
  await db.insert(rolePresets).values({ userId, role: to }).onConflictDoNothing();
  await db
    .delete(rolePresets)
    .where(and(eq(rolePresets.userId, userId), eq(rolePresets.role, from)));

  const moved = await db
    .update(applications)
    .set({ role: to, updatedAt: new Date() })
    .where(and(eq(applications.userId, userId), eq(applications.role, from)))
    .returning({ id: applications.id });

  revalidatePath("/");
  return { ok: true, data: { role: to, applicationsUpdated: moved.length } };
}

export async function deleteRolePreset(raw: string): Promise<ActionResult> {
  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const db = getDb();
  const userId = await getCurrentUserId();
  // Only removes it from the dropdown; applications using it keep their role.
  await db
    .delete(rolePresets)
    .where(and(eq(rolePresets.userId, userId), eq(rolePresets.role, parsed.data)));

  revalidatePath("/");
  return { ok: true, data: null };
}

export async function createApplication(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = applicationInputSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const db = getDb();
  const userId = await getCurrentUserId();

  const [row] = await db
    .insert(applications)
    .values({ ...parsed.data, userId })
    .returning({ id: applications.id });

  // "Applied" is the baseline, not a path step — see PATH_STATUSES.
  if (parsed.data.status !== "applied") {
    await db.insert(statusEvents).values({
      applicationId: row.id,
      userId,
      fromStatus: null,
      toStatus: parsed.data.status,
      note: "Created",
    });
  }

  await rememberRole(userId, parsed.data.role);

  revalidatePath("/");
  return { ok: true, data: { id: row.id } };
}

export async function updateApplication(
  id: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = applicationInputSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const db = getDb();
  const userId = await getCurrentUserId();

  const [existing] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Application not found" };

  await db
    .update(applications)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));

  if (existing.status !== parsed.data.status) {
    await db.insert(statusEvents).values({
      applicationId: id,
      userId,
      fromStatus: existing.status,
      toStatus: parsed.data.status,
    });
  }

  await rememberRole(userId, parsed.data.role);

  revalidatePath("/");
  return { ok: true, data: { id } };
}

const setStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(APPLICATION_STATUSES),
});

export async function setStatus(rawId: string, rawStatus: string): Promise<ActionResult> {
  const parsed = setStatusSchema.safeParse({ id: rawId, status: rawStatus });
  if (!parsed.success) return invalid(parsed.error);
  const { id, status } = parsed.data;

  const db = getDb();
  const userId = await getCurrentUserId();

  // Ownership check and the rewind lookup in one round-trip. Each one costs
  // real latency (the DB is not local), so they're worth collapsing.
  const [existing] = await db
    .select({
      status: applications.status,
      // Moving back to a status the application already reached is a
      // correction, not progress: rewind the path to that step rather than
      // recording a hop backwards, so "Applied → Interview 1 → Applied"
      // collapses to "Applied".
      earliestMatch: sql<Date | null>`(
        select min(${statusEvents.occurredAt}) from ${statusEvents}
        where ${statusEvents.applicationId} = ${applications.id}
          and ${statusEvents.userId} = ${applications.userId}
          and ${statusEvents.toStatus} = ${status}
      )`,
    })
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);

  if (!existing) return { ok: false, error: "Application not found" };
  if (existing.status === status) return { ok: true, data: null };

  const earlier = existing.earliestMatch ? { occurredAt: existing.earliestMatch } : null;

  if (status === "applied") {
    // Back to the baseline: nothing happened after applying, so the path empties.
    await db
      .delete(statusEvents)
      .where(and(eq(statusEvents.applicationId, id), eq(statusEvents.userId, userId)));
  } else if (earlier) {
    await db
      .delete(statusEvents)
      .where(
        and(
          eq(statusEvents.applicationId, id),
          eq(statusEvents.userId, userId),
          gt(statusEvents.occurredAt, earlier.occurredAt),
        ),
      );
  } else {
    await db.insert(statusEvents).values({
      applicationId: id,
      userId,
      fromStatus: existing.status,
      toStatus: status,
    });
  }

  await db
    .update(applications)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));

  revalidatePath("/");
  return { ok: true, data: null };
}

/**
 * The path is the source of truth: after any edit, the application's current
 * status becomes whatever the latest step says. Without this the badge and the
 * trail beneath it could disagree.
 */
async function syncStatusToLatestStep(userId: string, applicationId: string) {
  const db = getDb();
  const [latest] = await db
    .select({ status: statusEvents.toStatus })
    .from(statusEvents)
    .where(and(eq(statusEvents.applicationId, applicationId), eq(statusEvents.userId, userId)))
    .orderBy(desc(statusEvents.occurredAt), desc(statusEvents.id))
    .limit(1);

  if (!latest) return;
  await db
    .update(applications)
    .set({ status: latest.status, updatedAt: new Date() })
    .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)));
}

const addStepSchema = z.object({
  applicationId: z.uuid(),
  status: z.enum(APPLICATION_STATUSES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

/**
 * Steps are ordered by full timestamp but edited as dates, so the time of day
 * is what keeps same-day steps in a stable order. Carry the existing time over
 * on an edit, and stamp the current time on a new step.
 */
function atDate(date: string, timeFrom?: Date) {
  const base = timeFrom ?? new Date();
  const time = [base.getHours(), base.getMinutes(), base.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return new Date(`${date}T${time}`);
}

export async function addStatusStep(raw: {
  applicationId: string;
  status: string;
  date: string;
}): Promise<ActionResult> {
  const parsed = addStepSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const { applicationId, status, date } = parsed.data;

  const db = getDb();
  const userId = await getCurrentUserId();

  const [owned] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
    .limit(1);
  if (!owned) return { ok: false, error: "Application not found" };

  await db.insert(statusEvents).values({
    applicationId,
    userId,
    fromStatus: null,
    toStatus: status,
    occurredAt: atDate(date),
  });

  await syncStatusToLatestStep(userId, applicationId);
  revalidatePath("/");
  return { ok: true, data: null };
}

export async function updateStatusStep(raw: {
  stepId: string;
  status: string;
  date: string;
}): Promise<ActionResult> {
  const parsed = addStepSchema
    .omit({ applicationId: true })
    .extend({ stepId: z.uuid() })
    .safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const { stepId, status, date } = parsed.data;

  const db = getDb();
  const userId = await getCurrentUserId();

  const [step] = await db
    .select({
      applicationId: statusEvents.applicationId,
      occurredAt: statusEvents.occurredAt,
    })
    .from(statusEvents)
    .where(and(eq(statusEvents.id, stepId), eq(statusEvents.userId, userId)))
    .limit(1);
  if (!step) return { ok: false, error: "Step not found" };

  await db
    .update(statusEvents)
    .set({ toStatus: status, occurredAt: atDate(date, step.occurredAt) })
    .where(and(eq(statusEvents.id, stepId), eq(statusEvents.userId, userId)));

  await syncStatusToLatestStep(userId, step.applicationId);
  revalidatePath("/");
  return { ok: true, data: null };
}

export async function deleteStatusStep(stepId: string): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(stepId);
  if (!parsed.success) return { ok: false, error: "Invalid step id" };

  const db = getDb();
  const userId = await getCurrentUserId();

  const [deleted] = await db
    .delete(statusEvents)
    .where(and(eq(statusEvents.id, parsed.data), eq(statusEvents.userId, userId)))
    .returning({ applicationId: statusEvents.applicationId });
  if (!deleted) return { ok: false, error: "Step not found" };

  await syncStatusToLatestStep(userId, deleted.applicationId);
  revalidatePath("/");
  return { ok: true, data: null };
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid id" };

  const db = getDb();
  const userId = await getCurrentUserId();

  // status_events cascade on delete.
  const deleted = await db
    .delete(applications)
    .where(and(eq(applications.id, parsed.data), eq(applications.userId, userId)))
    .returning({ id: applications.id });

  if (deleted.length === 0) return { ok: false, error: "Application not found" };

  revalidatePath("/");
  return { ok: true, data: null };
}
