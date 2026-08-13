"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, rolePresets, statusEvents } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { applicationInputSchema } from "@/lib/validation";
import { dedupeKey, type MappedRow } from "@/lib/import-mapping";

const MAX_ROWS = 5000;
const CHUNK = 200;

export type ImportOutcome = "create" | "duplicate" | "error";

export type ImportRowResult = {
  sourceRow: number;
  company: string;
  role: string;
  outcome: ImportOutcome;
  message?: string;
};

export type ImportReport = {
  dryRun: boolean;
  created: number;
  duplicates: number;
  errors: number;
  rows: ImportRowResult[];
};

/**
 * Validates and (unless dryRun) inserts mapped rows. Always run with dryRun
 * first — the UI shows that report as the preview, then re-runs for real.
 */
export async function importApplications(
  rows: MappedRow[],
  options: { dryRun: boolean; skipDuplicates: boolean },
): Promise<ImportReport> {
  const db = getDb();
  const userId = await getCurrentUserId();

  if (rows.length > MAX_ROWS) {
    return {
      dryRun: options.dryRun,
      created: 0,
      duplicates: 0,
      errors: rows.length,
      rows: [
        {
          sourceRow: 0,
          company: "",
          role: "",
          outcome: "error",
          message: `Too many rows (${rows.length}). Max is ${MAX_ROWS}.`,
        },
      ],
    };
  }

  const existing = await db
    .select({
      company: applications.company,
      role: applications.role,
      term: applications.term,
      externalId: applications.externalId,
    })
    .from(applications)
    .where(eq(applications.userId, userId));

  const seenKeys = new Set(existing.map((e) => dedupeKey(e.company, e.role, e.term)));
  const seenExternalIds = new Set(
    existing.map((e) => e.externalId).filter((id): id is string => Boolean(id)),
  );

  const results: ImportRowResult[] = [];
  const toInsert: (typeof applications.$inferInsert)[] = [];

  for (const row of rows) {
    const { sourceRow, ...values } = row;
    const parsed = applicationInputSchema.safeParse(values);

    if (!parsed.success) {
      results.push({
        sourceRow,
        company: row.company ?? "",
        role: row.role ?? "",
        outcome: "error",
        message: parsed.error.issues[0]?.message ?? "Invalid row",
      });
      continue;
    }

    const data = parsed.data;
    const key = dedupeKey(data.company, data.role, data.term);
    // A stable id from the source is authoritative: if the export says these
    // are two records, import two. Only fall back to the company+role+term
    // heuristic for rows that arrive without an id, where it's all we have.
    const isDuplicate = data.externalId
      ? seenExternalIds.has(data.externalId)
      : seenKeys.has(key);

    if (isDuplicate && options.skipDuplicates) {
      results.push({
        sourceRow,
        company: data.company,
        role: data.role,
        outcome: "duplicate",
        message: "Already tracked",
      });
      continue;
    }

    // Track within the batch too, so a file with internal duplicates doesn't
    // insert the same application twice.
    seenKeys.add(key);
    if (data.externalId) seenExternalIds.add(data.externalId);

    results.push({ sourceRow, company: data.company, role: data.role, outcome: "create" });
    toInsert.push({ ...data, userId });
  }

  if (!options.dryRun && toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const inserted = await db
        .insert(applications)
        .values(chunk)
        .returning({ id: applications.id, status: applications.status });

      // "Applied" is the baseline, not a path step — see PATH_STATUSES.
      const steps = inserted
        .filter((r) => r.status !== "applied")
        .map((r) => ({
          applicationId: r.id,
          userId,
          fromStatus: null,
          toStatus: r.status,
          note: "Imported",
        }));
      if (steps.length > 0) await db.insert(statusEvents).values(steps);
    }

    // Imported roles become presets, so the dropdown is useful immediately.
    const roles = [...new Set(toInsert.map((r) => r.role))];
    await db
      .insert(rolePresets)
      .values(roles.map((role) => ({ userId, role })))
      .onConflictDoNothing();

    revalidatePath("/");
  }

  return {
    dryRun: options.dryRun,
    created: results.filter((r) => r.outcome === "create").length,
    duplicates: results.filter((r) => r.outcome === "duplicate").length,
    errors: results.filter((r) => r.outcome === "error").length,
    rows: results,
  };
}
