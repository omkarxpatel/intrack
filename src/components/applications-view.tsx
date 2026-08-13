"use client";

import { useMemo, useState } from "react";
import { CLOSED_STATUSES, IN_PROCESS_STATUSES, type StatusStep } from "@/lib/constants";
import type { Application } from "@/db/schema";
import { ApplicationsTable } from "@/components/applications-table";
import { ApplicationsToolbar } from "@/components/applications-toolbar";

export function ApplicationsView({
  applications,
  rolePresets,
  statusPaths,
}: {
  applications: Application[];
  rolePresets: string[];
  statusPaths: Record<string, StatusStep[]>;
}) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => rank(applications, q), [applications, q]);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={rows.length} />
        <Stat label="Active" value={rows.filter((a) => !CLOSED_STATUSES.includes(a.status)).length} />
        <Stat
          label="In process"
          value={rows.filter((a) => IN_PROCESS_STATUSES.includes(a.status)).length}
        />
        <Stat
          label="Offers"
          value={rows.filter((a) => a.status === "offered" || a.status === "accepted").length}
        />
      </div>

      <div className="mb-4">
        <ApplicationsToolbar q={q} onQChange={setQ} rolePresets={rolePresets} />
      </div>

      <ApplicationsTable
        applications={rows}
        rolePresets={rolePresets}
        statusPaths={statusPaths}
        searching={q.trim().length > 0}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/**
 * Search runs here rather than as a URL param, which used to cost a server
 * round-trip to Neon per keystroke. The whole list is already on the client, so
 * scoring it in memory reorders the table as fast as you can type.
 *
 * Every token has to match something, and the best match rises: company beats
 * role beats notes, and a prefix beats a hit in the middle of a word.
 */
function rank(applications: Application[], query: string): Application[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return applications;

  const matches: { app: Application; score: number; order: number }[] = [];
  applications.forEach((app, order) => {
    const company = app.company.toLowerCase();
    const role = app.role.toLowerCase();
    const notes = app.notes?.toLowerCase() ?? "";

    let score = 0;
    for (const token of tokens) {
      const hit = scoreToken(token, company, role, notes);
      if (hit === 0) return;
      score += hit;
    }
    matches.push({ app, score, order });
  });

  // Ties fall back to the order the server sent, so equally relevant rows keep
  // whichever sort is selected.
  matches.sort((a, b) => b.score - a.score || a.order - b.order);
  return matches.map((m) => m.app);
}

function scoreToken(token: string, company: string, role: string, notes: string): number {
  if (company.startsWith(token)) return 100;
  if (company.includes(` ${token}`)) return 70;
  if (company.includes(token)) return 50;
  if (role.startsWith(token) || role.includes(` ${token}`)) return 30;
  if (role.includes(token)) return 20;
  if (notes.includes(token)) return 5;
  return 0;
}
