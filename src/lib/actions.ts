"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, statusEvents } from "@/db/schema";
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

export async function createApplication(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = applicationInputSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const db = getDb();
  const userId = await getCurrentUserId();

  const [row] = await db
    .insert(applications)
    .values({ ...parsed.data, userId })
    .returning({ id: applications.id });

  await db.insert(statusEvents).values({
    applicationId: row.id,
    userId,
    fromStatus: null,
    toStatus: parsed.data.status,
    note: "Created",
  });

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

  const [existing] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Application not found" };
  if (existing.status === status) return { ok: true, data: null };

  await db
    .update(applications)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));

  await db.insert(statusEvents).values({
    applicationId: id,
    userId,
    fromStatus: existing.status,
    toStatus: status,
  });

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
