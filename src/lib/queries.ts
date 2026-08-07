import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, statusEvents, type Application } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

export type ApplicationFilters = {
  status?: Application["status"];
  term?: string;
  q?: string;
  sort?: "updated" | "applied" | "company";
};

export async function listApplications(filters: ApplicationFilters = {}) {
  const db = getDb();
  const userId = await getCurrentUserId();

  const conditions: SQL[] = [eq(applications.userId, userId)];
  if (filters.status) conditions.push(eq(applications.status, filters.status));
  if (filters.term) conditions.push(eq(applications.term, filters.term));
  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(applications.company, like),
        ilike(applications.role, like),
        ilike(applications.location, like),
        ilike(applications.notes, like),
      )!,
    );
  }

  const orderBy = {
    updated: desc(applications.updatedAt),
    // Explicit NULLS LAST: Postgres defaults DESC to NULLS FIRST, which would
    // float every not-yet-applied row to the top.
    applied: sql`${applications.appliedAt} desc nulls last`,
    company: asc(applications.company),
  }[filters.sort ?? "updated"];

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

/** Distinct terms the user has actually used, for the filter dropdown. */
export async function listTerms() {
  const db = getDb();
  const userId = await getCurrentUserId();
  const rows = await db
    .selectDistinct({ term: applications.term })
    .from(applications)
    .where(eq(applications.userId, userId));
  return rows.map((r) => r.term).filter((t): t is string => Boolean(t)).sort();
}
