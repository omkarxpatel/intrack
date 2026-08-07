// Heuristics for turning an arbitrary exported spreadsheet into our shape.
// Deliberately forgiving: the UI always shows a preview before anything is
// written, so guessing wrong is cheap and correctable.

import { APPLICATION_STATUSES, WORK_MODES, type ApplicationStatus, type WorkMode } from "@/lib/constants";

export const IMPORT_FIELDS = [
  "company",
  "role",
  "jobUrl",
  "location",
  "workMode",
  "term",
  "status",
  "appliedAt",
  "salary",
  "source",
  "notes",
  "externalId",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  company: "Company",
  role: "Role",
  jobUrl: "Job listing URL",
  location: "Location",
  workMode: "Work mode",
  term: "Term",
  status: "Status",
  appliedAt: "Date applied",
  salary: "Compensation",
  source: "Source",
  notes: "Notes",
  externalId: "External ID",
};

export const REQUIRED_IMPORT_FIELDS: ImportField[] = ["company", "role"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Order matters: the first field whose aliases match a header wins, so more
// specific aliases ("joburl") must not be shadowed by looser ones ("url").
const HEADER_ALIASES: Record<ImportField, string[]> = {
  company: ["company", "companyname", "employer", "organization", "org", "firm"],
  role: ["role", "position", "title", "jobtitle", "job", "positiontitle", "rolename"],
  jobUrl: ["joburl", "joblink", "url", "link", "listing", "listingurl", "posting", "postingurl", "applicationlink"],
  appliedAt: ["dateapplied", "applieddate", "appliedon", "applicationdate", "applied", "datesubmitted", "submitted", "date"],
  status: ["status", "stage", "state", "progress", "applicationstatus"],
  term: ["term", "season", "semester", "cycle", "period", "timeperiod", "startdate", "duration"],
  location: ["location", "city", "place", "office", "where"],
  workMode: ["workmode", "worktype", "arrangement", "remote", "onsite", "modality", "locationtype"],
  salary: ["salary", "pay", "payrate", "compensation", "comp", "rate", "hourly", "wage"],
  source: ["source", "via", "platform", "jobboard", "board", "foundvia", "referral"],
  notes: ["notes", "note", "comments", "comment", "description", "details"],
  externalId: ["externalid", "id", "uuid", "recordid", "key"],
};

/** Best-guess mapping from the file's headers to our fields. */
export function guessMapping(headers: string[]): Record<string, ImportField | null> {
  const mapping: Record<string, ImportField | null> = {};
  const taken = new Set<ImportField>();

  for (const field of IMPORT_FIELDS) {
    const aliases = HEADER_ALIASES[field];
    const match = headers.find(
      (h) => !(h in mapping) && aliases.includes(norm(h)),
    );
    if (match) {
      mapping[match] = field;
      taken.add(field);
    }
  }

  // Second pass: substring match for anything still unclaimed.
  for (const header of headers) {
    if (header in mapping) continue;
    const n = norm(header);
    const field = IMPORT_FIELDS.find(
      (f) => !taken.has(f) && HEADER_ALIASES[f].some((a) => n.includes(a) && a.length > 3),
    );
    mapping[header] = field ?? null;
    if (field) taken.add(field);
  }

  return mapping;
}

const STATUS_ALIASES: Record<string, ApplicationStatus> = {
  saved: "saved",
  bookmarked: "saved",
  wishlist: "saved",
  interested: "saved",
  toapply: "saved",
  notapplied: "saved",
  applied: "applied",
  submitted: "applied",
  inprogress: "applied",
  pending: "applied",
  inreview: "applied",
  underreview: "applied",
  oa: "online_assessment",
  onlineassessment: "online_assessment",
  assessment: "online_assessment",
  codingchallenge: "online_assessment",
  challenge: "online_assessment",
  test: "online_assessment",
  hackerrank: "online_assessment",
  interview: "interview",
  interviewing: "interview",
  phonescreen: "interview",
  screen: "interview",
  onsite: "interview",
  final: "interview",
  finalround: "interview",
  superday: "interview",
  offer: "offer",
  offered: "offer",
  accepted: "offer",
  rejected: "rejected",
  reject: "rejected",
  denied: "rejected",
  declined: "rejected",
  nooffer: "rejected",
  ghosted: "ghosted",
  noresponse: "ghosted",
  noreply: "ghosted",
  withdrawn: "withdrawn",
  withdrew: "withdrawn",
  cancelled: "withdrawn",
};

export function normalizeStatus(raw: string | undefined): ApplicationStatus | null {
  if (!raw) return null;
  const n = norm(raw);
  if (!n) return null;
  if (APPLICATION_STATUSES.includes(n as ApplicationStatus)) return n as ApplicationStatus;
  if (STATUS_ALIASES[n]) return STATUS_ALIASES[n];
  // Fall back to a contains check so "Interview - Round 2" still lands.
  const hit = Object.keys(STATUS_ALIASES).find((a) => a.length > 3 && n.includes(a));
  return hit ? STATUS_ALIASES[hit] : null;
}

export function normalizeWorkMode(raw: string | undefined): WorkMode | null {
  if (!raw) return null;
  const n = norm(raw);
  if (WORK_MODES.includes(n as WorkMode)) return n as WorkMode;
  if (n.includes("remote")) return "remote";
  if (n.includes("hybrid")) return "hybrid";
  if (n.includes("onsite") || n.includes("inperson") || n.includes("office")) return "onsite";
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Returns a YYYY-MM-DD string, or null if the value isn't a date we recognize.
 * Handles ISO, US slash/dash dates, and "Jan 5, 2026" style.
 */
export function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(+iso[2])}-${pad(+iso[3])}`;

  // Assumes US month-first ordering, which is what every tracker we care about emits.
  const slash = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const year = +slash[3] < 100 ? 2000 + +slash[3] : +slash[3];
    return `${year}-${pad(+slash[1])}-${pad(+slash[2])}`;
  }

  const named = value.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (named) {
    const month = MONTHS[named[1].slice(0, 3).toLowerCase()];
    if (month) return `${named[3]}-${pad(month)}-${pad(+named[2])}`;
  }

  const dayFirst = value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})$/);
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].slice(0, 3).toLowerCase()];
    if (month) return `${dayFirst[3]}-${pad(month)}-${pad(+dayFirst[1])}`;
  }

  return null;
}

export type MappedRow = Partial<Record<ImportField, string>> & {
  /** 1-based row number in the source file, for error reporting. */
  sourceRow: number;
};

/** Applies a header→field mapping and normalizes the messy fields. */
export function mapRows(
  rows: Record<string, string>[],
  mapping: Record<string, ImportField | null>,
): MappedRow[] {
  return rows.map((row, i) => {
    const mapped: MappedRow = { sourceRow: i + 1 };
    for (const [header, field] of Object.entries(mapping)) {
      if (!field) continue;
      const raw = (row[header] ?? "").trim();
      if (!raw) continue;

      if (field === "status") {
        const status = normalizeStatus(raw);
        if (status) mapped.status = status;
      } else if (field === "workMode") {
        const mode = normalizeWorkMode(raw);
        if (mode) mapped.workMode = mode;
      } else if (field === "appliedAt") {
        const date = normalizeDate(raw);
        if (date) mapped.appliedAt = date;
      } else {
        mapped[field] = raw;
      }
    }
    return mapped;
  });
}

/** Key used to detect rows the user already has. */
export function dedupeKey(company: string, role: string, term: string | null | undefined) {
  return [norm(company), norm(role), norm(term ?? "")].join("|");
}
