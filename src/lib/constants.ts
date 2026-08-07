// Kept free of any server-only imports so client components can use these
// without dragging the Drizzle schema (and pg-core) into the browser bundle.

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "online_assessment",
  "interview",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
] as const;

export const WORK_MODES = ["unknown", "onsite", "hybrid", "remote"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type WorkMode = (typeof WORK_MODES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  online_assessment: "OA",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
  withdrawn: "Withdrawn",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  unknown: "—",
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
};

// Hue carries meaning: neutral = not yet acted on, blue/violet = in flight,
// amber = active conversation, green = won, red = lost, muted = closed out.
export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  saved: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  online_assessment: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  interview: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  offer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  ghosted: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  withdrawn: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

/** Statuses that mean the application is no longer moving. */
export const CLOSED_STATUSES: ApplicationStatus[] = ["rejected", "ghosted", "withdrawn"];
