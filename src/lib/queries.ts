import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, rolePresets, statusEvents, type Application } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import {
  IN_PROCESS_FILTER,
  IN_PROCESS_STATUSES,
  type StatusStep,
} from "@/lib/constants";

export type ApplicationFilters = {
  status?: Application["status"] | typeof IN_PROCESS_FILTER;
  term?: Application["term"] & {};
  sort?: "updated" | "applied" | "company";
};

export async function listApplications(filters: ApplicationFilters = {}) {
  const db = getDb();
  const userId = await getCurrentUserId();

  const conditions: SQL[] = [eq(applications.userId, userId)];
  // The one filter value that isn't itself a status: it stands for the whole
  // active middle of the pipeline, so it matches a set rather than a value.
  if (filters.status === IN_PROCESS_FILTER) {
    conditions.push(inArray(applications.status, IN_PROCESS_STATUSES));
  } else if (filters.status) {
    conditions.push(eq(applications.status, filters.status));
  }
  if (filters.term) conditions.push(eq(applications.term, filters.term));

  const orderBy = {
    updated: desc(applications.updatedAt),
    // Explicit NULLS LAST: Postgres defaults DESC to NULLS FIRST, which would
    // float every not-yet-applied row to the top. applied_at is a date, so
    // everything applied on the same day ties — created_at breaks the tie so
    // the row you just added lands above the others from today instead of
    // wherever the planner happens to put it.
    applied: sql`${applications.appliedAt} desc nulls last, ${applications.createdAt} desc`,
    company: asc(applications.company),
  }[filters.sort ?? "applied"];

  return db
    .select()
    .from(applications)
    .where(and(...conditions))
    .orderBy(orderBy);
}

export async function getApplication(id: string) {
  const db = getDb();
  const userId = await getCurrentUserId();
  const [row] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getStatusHistory(applicationId: string) {
  const db = getDb();
  const userId = await getCurrentUserId();
  return db
    .select()
    .from(statusEvents)
    .where(and(eq(statusEvents.applicationId, applicationId), eq(statusEvents.userId, userId)))
    .orderBy(desc(statusEvents.occurredAt));
}

/**
 * The full status path per application, oldest first — so a row that went
 * OA → Interview → Rejected shows that journey rather than just the endpoint.
 * One query for the whole list; grouping in JS beats N round-trips.
 */
export async function getStatusPaths(): Promise<Record<string, StatusStep[]>> {
  const db = getDb();
  const userId = await getCurrentUserId();

  const rows = await db
    .select({
      id: statusEvents.id,
      applicationId: statusEvents.applicationId,
      status: statusEvents.toStatus,
      at: statusEvents.occurredAt,
      note: statusEvents.note,
    })
    .from(statusEvents)
    .where(eq(statusEvents.userId, userId))
    .orderBy(asc(statusEvents.occurredAt), asc(statusEvents.id));

  const paths: Record<string, StatusStep[]> = {};
  for (const row of rows) {
    (paths[row.applicationId] ??= []).push({
      id: row.id,
      status: row.status,
      at: row.at,
      note: row.note,
    });
  }
  return paths;
}

/**
 * Which providers the current user can sign in with. Neon Auth keeps its tables
 * in the same database, so this is a plain read rather than a client-side
 * round-trip through the auth API — and it means the settings page renders the
 * real state on first paint instead of flashing a loading row.
 */
export async function listSignInMethods() {
  const db = getDb();
  const userId = await getCurrentUserId();
  const result = await db.execute<{ providerId: string; accountId: string }>(
    sql`select "providerId", "accountId" from neon_auth.account where "userId" = ${userId}`,
  );
  return result.rows;
}

/** Saved role names for the form's dropdown. */
export async function listRolePresets() {
  const db = getDb();
  const userId = await getCurrentUserId();
  const rows = await db
    .select({ role: rolePresets.role })
    .from(rolePresets)
    .where(eq(rolePresets.userId, userId))
    .orderBy(asc(rolePresets.role));
  return rows.map((r) => r.role);
}
