// Kept free of any server-only imports so client components can use these
// without dragging the Drizzle schema (and pg-core) into the browser bundle.

// Ordered by how far along the process they are, so dropdowns read as a funnel.
export const APPLICATION_STATUSES = [
  "upcoming",
  "applied",
  "online_assessment",
  "interview_stage_1",
  "interview_stage_2",
  "interview_stage_3",
  "interview_stage_4",
  "interview_stage_5",
  "interview_final",
  "offered",
  "accepted",
  "withdrawn",
  "rejected",
] as const;

export const WORK_MODES = ["unknown", "onsite", "hybrid", "remote"] as const;

export const TERMS = ["spring", "summer", "fall", "winter"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type Term = (typeof TERMS)[number];

export const TERM_LABELS: Record<Term, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  upcoming: "Upcoming",
  applied: "Applied",
  online_assessment: "OA",
  interview_stage_1: "Interview 1",
  interview_stage_2: "Interview 2",
  interview_stage_3: "Interview 3",
  interview_stage_4: "Interview 4",
  interview_stage_5: "Interview 5",
  interview_final: "Final",
  offered: "Offered",
  accepted: "Accepted",
  withdrawn: "Withdrawn",
  rejected: "Rejected",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  unknown: "—",
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
};

/**
 * Monochrome by design: weight, not hue, encodes progress. Dormant statuses sit
 * in a grey outline, anything in flight gets a full-contrast outline, a win is
 * filled solid, and only a rejection is allowed colour. Written against theme
 * tokens rather than fixed palette steps so light and dark both follow.
 */
const DORMANT = "border border-muted-foreground/40 text-muted-foreground";
const IN_FLIGHT = "border border-foreground/70 text-foreground";
const STRONG = "border border-foreground text-foreground font-semibold";
const WON = "border border-foreground bg-foreground text-background font-semibold";
const LOST = "border border-destructive text-destructive";

export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  upcoming: DORMANT,
  applied: DORMANT,
  online_assessment: IN_FLIGHT,
  interview_stage_1: IN_FLIGHT,
  interview_stage_2: IN_FLIGHT,
  interview_stage_3: IN_FLIGHT,
  interview_stage_4: IN_FLIGHT,
  interview_stage_5: IN_FLIGHT,
  interview_final: STRONG,
  offered: STRONG,
  accepted: WON,
  withdrawn: DORMANT,
  rejected: LOST,
};

/** Statuses that mean the application is no longer moving. */
export const CLOSED_STATUSES: ApplicationStatus[] = ["rejected", "withdrawn"];

/**
 * "Applied" is the baseline every tracked application shares, so it carries no
 * information as a path step — the date lives on `applied_at` instead. The path
 * only records what happened *after* applying.
 */
export const PATH_STATUSES = APPLICATION_STATUSES.filter((s) => s !== "applied");

/** Anything between "applied" and a decision — the active pipeline. */
export const IN_PROCESS_STATUSES: ApplicationStatus[] = [
  "online_assessment",
  "interview_stage_1",
  "interview_stage_2",
  "interview_stage_3",
  "interview_stage_4",
  "interview_stage_5",
  "interview_final",
];

/** One hop in an application's status path. Ordered by `at`, and user-editable. */
export type StatusStep = {
  id: string;
  status: ApplicationStatus;
  at: Date;
  note: string | null;
};
