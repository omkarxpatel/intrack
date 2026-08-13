import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, statusEvents } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import {
  APPLICATION_STATUSES,
  IN_PROCESS_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/constants";

/** How far along the pipeline each status sits. Terminal statuses are absent. */
const STAGE_RANK: Partial<Record<ApplicationStatus, number>> = {
  upcoming: 0,
  applied: 1,
  online_assessment: 2,
  // Every interview round shares rank 3: the funnel measures how far an
  // application got, and reaching round 3 still means "reached interviews".
  interview_stage_1: 3,
  interview_stage_2: 3,
  interview_stage_3: 3,
  interview_stage_4: 3,
  interview_stage_5: 3,
  interview_final: 3,
  offered: 4,
  accepted: 4,
};

/**
 * Reaching a terminal status means the application was submitted, so it counts
 * as "applied" even when no earlier event was recorded — imported rows often
 * arrive as a single `rejected` event with no history behind them.
 */
function rankOf(status: ApplicationStatus): number {
  return STAGE_RANK[status] ?? 1;
}

/** Statuses that only exist because someone on the other side replied. */
const RESPONSE_STATUSES: ApplicationStatus[] = [
  ...IN_PROCESS_STATUSES,
  "offered",
  "accepted",
  "rejected",
];

export const FUNNEL_STAGES = [
  { key: "applied", label: "Applied", rank: 1 },
  { key: "online_assessment", label: "OA", rank: 2 },
  { key: "interview", label: "Interview", rank: 3 },
  { key: "offer", label: "Offer", rank: 4 },
] as const;

export type FunnelStage = {
  label: string;
  count: number;
  /** Share of the first stage, 0–100. */
  pctOfApplied: number;
  /** Share of the stage immediately above, 0–100. Null for the first stage. */
  pctOfPrevious: number | null;
};

export type WeekPoint = { weekStart: string; label: string; count: number };
export type DayCount = { date: string; count: number };

/** Which ramp step a Sankey node paints with. */
export type NodeTone =
  | "stage-1"
  | "stage-2"
  | "stage-3"
  | "stage-4"
  | "positive"
  | "negative"
  | "muted";
export type SankeyGraph = {
  nodes: { name: string; tone: NodeTone }[];
  links: { source: number; target: number; value: number }[];
};

/**
 * The middle column: one mutually exclusive bucket per application, named for
 * the furthest stage it reached.
 *
 * Deliberately NOT a chain of stage-to-stage links. Chaining would assert an
 * order between OA and interview that real histories don't follow — plenty of
 * pipelines run the assessment after a first-round interview — and a recorded
 * back-and-forth between the two is a cycle, which a Sankey cannot draw. One
 * bucket per application sidesteps both problems and still conserves flow.
 */
const REACHED_NODES: Record<number, { name: string; tone: NodeTone }> = {
  1: { name: "No further stage", tone: "stage-1" },
  2: { name: "Reached OA", tone: "stage-2" },
  3: { name: "Reached interview", tone: "stage-3" },
  4: { name: "Reached offer", tone: "stage-4" },
};

/** How finely the middle column splits the interview rounds. */
export type SankeyDetail = "combined" | "rounds";

/**
 * The middle bucket at round-level detail: the exact status an application got
 * furthest to, rather than the whole interview phase folded into one node.
 * Every round keeps the stage-3 tone — they are one stage of the pipeline, and
 * the node labels carry the distinction.
 */
function reachedNode(
  furthest: number,
  furthestStatus: ApplicationStatus | null,
  detail: SankeyDetail,
): { name: string; tone: NodeTone } {
  const combined = REACHED_NODES[Math.min(furthest, 4)];
  if (detail === "combined" || furthest !== 3 || !furthestStatus) return combined;
  return { name: `Reached ${STATUS_LABELS[furthestStatus]}`, tone: "stage-3" };
}

// Keyed by status. Anything not listed is still in play, including a pending
// offer — only accepting one ends the process well.
const OUTCOME_NODES: Record<string, { name: string; tone: NodeTone }> = {
  accepted: { name: "Accepted", tone: "positive" },
  rejected: { name: "Rejected", tone: "negative" },
  withdrawn: { name: "Withdrawn", tone: "muted" },
  active: { name: "Still open", tone: "stage-2" },
};

const SOURCE_NAME = "Applied";

type Journey = {
  furthest: number;
  status: ApplicationStatus;
  /** Furthest status by pipeline position, ignoring closed ones. */
  furthestStatus: ApplicationStatus | null;
};

/**
 * Every application as a flow from Applied, through the furthest stage it
 * reached, to how it ended. Flow is conserved at each node — what arrives
 * either advances or exits — so ribbon widths are comparable across the chart.
 */
function buildSankey(journeys: Journey[], detail: SankeyDetail): SankeyGraph {
  // A separator that cannot occur in a node name, so multi-word names survive.
  const SEP = "\u0000";
  const totals = new Map<string, number>();
  const bump = (from: string, to: string) =>
    totals.set(`${from}${SEP}${to}`, (totals.get(`${from}${SEP}${to}`) ?? 0) + 1);

  const catalog = new Map<string, NodeTone>([
    [SOURCE_NAME, "stage-1"],
    ...Object.values(REACHED_NODES).map((n) => [n.name, n.tone] as const),
    ...Object.values(OUTCOME_NODES).map((n) => [n.name, n.tone] as const),
  ]);

  for (const { furthest, status, furthestStatus } of journeys) {
    if (furthest < 1) continue;

    const reached = reachedNode(furthest, furthestStatus, detail);
    catalog.set(reached.name, reached.tone);
    bump(SOURCE_NAME, reached.name);
    bump(reached.name, (OUTCOME_NODES[status] ?? OUTCOME_NODES.active).name);
  }

  // Recharts errors on nodes with no links, so only keep referenced ones.
  const names: string[] = [];
  const indexOf = (name: string) => {
    let i = names.indexOf(name);
    if (i === -1) i = names.push(name) - 1;
    return i;
  };

  const links = [...totals.entries()]
    .filter(([, value]) => value > 0)
    .map(([key, value]) => {
      const [from, to] = key.split(SEP);
      return { source: indexOf(from), target: indexOf(to), value };
    });

  return {
    nodes: names.map((name) => ({ name, tone: catalog.get(name) ?? "muted" })),
    links,
  };
}

export type Insights = {
  applied: number;
  responseRate: number | null;
  interviewRate: number | null;
  offerRate: number | null;
  medianDaysToResponse: number | null;
  funnel: FunnelStage[];
  sankey: Record<SankeyDetail, SankeyGraph>;
  weekly: WeekPoint[];
  daily: DayCount[];
  /** Label for the window both time charts cover, e.g. "Jun 15". */
  windowStartLabel: string;
  /** Applications with no applied date — excluded from the time-based charts. */
  missingAppliedDate: number;
  totalApplications: number;
};

/** Longest window the volume chart and heatmap will show. */
const MAX_WEEKS = 26;
/** Shortest, so a tracker only days old still gets a chart with shape to it. */
const MIN_WEEKS = 8;

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Midnight on the Monday of the week containing `d`, in local time. */
function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // getDay() is 0=Sunday; shift so Monday is 0.
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

/** Parses the `date` column's "YYYY-MM-DD" as a local date, not UTC. */
function parseDateOnly(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function rate(part: number, whole: number): number | null {
  return whole === 0 ? null : (part / whole) * 100;
}

export async function getInsights(): Promise<Insights> {
  const db = getDb();
  const userId = await getCurrentUserId();

  // Two round-trips and group in JS, matching getStatusPaths — a personal
  // tracker's row count never justifies pushing this into SQL.
  const [apps, events] = await Promise.all([
    db
      .select({
        id: applications.id,
        status: applications.status,
        appliedAt: applications.appliedAt,
      })
      .from(applications)
      .where(eq(applications.userId, userId)),
    db
      .select({
        applicationId: statusEvents.applicationId,
        toStatus: statusEvents.toStatus,
        occurredAt: statusEvents.occurredAt,
      })
      .from(statusEvents)
      .where(eq(statusEvents.userId, userId))
      .orderBy(asc(statusEvents.occurredAt)),
  ]);

  const eventsByApp = new Map<string, { toStatus: ApplicationStatus; occurredAt: Date }[]>();
  for (const e of events) {
    const list = eventsByApp.get(e.applicationId);
    if (list) list.push(e);
    else eventsByApp.set(e.applicationId, [e]);
  }

  let missingAppliedDate = 0;
  const furthestRanks: number[] = [];
  const responseDays: number[] = [];
  const journeys: Journey[] = [];
  let responded = 0;
  const perDay = new Map<string, number>();
  let earliestApplied: Date | null = null;

  for (const app of apps) {
    const history = eventsByApp.get(app.id) ?? [];
    const appliedDate = app.appliedAt ? parseDateOnly(app.appliedAt) : null;

    // Furthest stage reached, not the current one — an application rejected
    // after an interview still counts as having interviewed.
    let furthest = rankOf(app.status);
    for (const e of history) furthest = Math.max(furthest, rankOf(e.toStatus));
    if (appliedDate && furthest < 1) furthest = 1;
    furthestRanks.push(furthest);

    // The exact status it got furthest to, for the round-level Sankey. Closed
    // statuses sit at the end of the ordered list but aren't progress, so they
    // never win here.
    let furthestStatus: ApplicationStatus | null = null;
    for (const s of [app.status, ...history.map((e) => e.toStatus)]) {
      if (STAGE_RANK[s] === undefined) continue;
      if (
        furthestStatus === null ||
        APPLICATION_STATUSES.indexOf(s) > APPLICATION_STATUSES.indexOf(furthestStatus)
      ) {
        furthestStatus = s;
      }
    }
    journeys.push({ furthest, status: app.status, furthestStatus });

    const firstResponse = history.find((e) => RESPONSE_STATUSES.includes(e.toStatus));
    if (firstResponse || RESPONSE_STATUSES.includes(app.status)) responded += 1;

    // Time-to-response needs a submission date to measure from; an application
    // with no applied date contributes to the funnel but not to this median.
    const start =
      appliedDate ?? history.find((e) => e.toStatus === "applied")?.occurredAt ?? null;
    if (start && firstResponse) {
      const days = Math.round(
        (firstResponse.occurredAt.getTime() - start.getTime()) / 86_400_000,
      );
      if (days >= 0) responseDays.push(days);
    }

    if (appliedDate) {
      const key = toDayKey(appliedDate);
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
      if (!earliestApplied || appliedDate < earliestApplied) earliestApplied = appliedDate;
    } else {
      missingAppliedDate += 1;
    }
  }

  const applied = furthestRanks.filter((r) => r >= 1).length;

  const funnel: FunnelStage[] = FUNNEL_STAGES.map((stage, i) => {
    const count = furthestRanks.filter((r) => r >= stage.rank).length;
    const previous =
      i === 0 ? null : furthestRanks.filter((r) => r >= FUNNEL_STAGES[i - 1].rank).length;
    return {
      label: stage.label,
      count,
      pctOfApplied: rate(count, applied) ?? 0,
      pctOfPrevious: previous === null ? null : (rate(count, previous) ?? 0),
    };
  });

  // The window ends on the current week and reaches back to the first
  // application, clamped to [MIN_WEEKS, MAX_WEEKS]. A fixed 26 weeks would be
  // mostly dead space for a tracker started last month, but the floor keeps
  // gaps visible rather than letting two busy weeks fill the chart.
  const thisWeek = startOfWeek(new Date());
  const weeksSinceFirst = earliestApplied
    ? Math.floor((thisWeek.getTime() - startOfWeek(earliestApplied).getTime()) / 604_800_000) + 1
    : MIN_WEEKS;
  const weeks = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, weeksSinceFirst));

  const windowStart = new Date(thisWeek);
  windowStart.setDate(windowStart.getDate() - (weeks - 1) * 7);

  const weekly: WeekPoint[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(windowStart);
    weekStart.setDate(weekStart.getDate() + i * 7);
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      count += perDay.get(toDayKey(day)) ?? 0;
    }
    weekly.push({
      weekStart: toDayKey(weekStart),
      label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    });
  }

  const daily: DayCount[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(windowStart);
    day.setDate(day.getDate() + i);
    const key = toDayKey(day);
    daily.push({ date: key, count: perDay.get(key) ?? 0 });
  }

  return {
    applied,
    responseRate: rate(responded, applied),
    interviewRate: rate(furthestRanks.filter((r) => r >= 3).length, applied),
    offerRate: rate(furthestRanks.filter((r) => r >= 4).length, applied),
    medianDaysToResponse: median(responseDays),
    funnel,
    // Both granularities are computed here so the client toggle is instant and
    // needs no round trip; the row counts involved make this free.
    sankey: {
      combined: buildSankey(journeys, "combined"),
      rounds: buildSankey(journeys, "rounds"),
    },
    weekly,
    daily,
    windowStartLabel: windowStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    missingAppliedDate,
    totalApplications: apps.length,
  };
}
