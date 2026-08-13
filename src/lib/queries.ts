import "server-only";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, rolePresets, statusEvents, type Application } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import type { StatusStep } from "@/lib/constants";

export type ApplicationFilters = {
  status?: Application["status"];
  term?: Application["term"] & {};
  sort?: "updated" | "applied" | "company";
};

export async function listApplications(filters: ApplicationFilters = {}) {
  const db = getDb();
  const userId = await getCurrentUserId();

  const conditions: SQL[] = [eq(applications.userId, userId)];
  if (filters.status) conditions.push(eq(applications.status, filters.status));
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
