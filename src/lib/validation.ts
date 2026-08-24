import { z } from "zod";
import { APPLICATION_STATUSES, TERMS, WORK_MODES } from "@/lib/constants";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().default(null));

// Accepts bare domains ("jobs.acme.com/123") as well as full URLs, so pasted
// values from a spreadsheet don't get rejected on a technicality.
const optionalUrl = z.preprocess((v) => {
  const cleaned = emptyToNull(v);
  if (typeof cleaned !== "string") return cleaned;
  return /^https?:\/\//i.test(cleaned.trim()) ? cleaned.trim() : `https://${cleaned.trim()}`;
}, z.url().max(2000).nullable().default(null));

const optionalIsoDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .default(null),
);

// Coerce a missing key to "" so an absent column reports "Company is required"
// rather than Zod's raw "expected string, received undefined".
const requiredText = (max: number, message: string) =>
  z.preprocess((v) => v ?? "", z.string().trim().min(1, message).max(max));

export const applicationInputSchema = z.object({
  company: requiredText(200, "Company is required"),
  role: requiredText(200, "Role is required"),
  jobUrl: optionalUrl,
  workMode: z.enum(WORK_MODES).default("unknown"),
  term: z.preprocess(emptyToNull, z.enum(TERMS).nullable().default(null)),
  status: z.enum(APPLICATION_STATUSES).default("upcoming"),
  starred: z.boolean().default(false),
  appliedAt: optionalIsoDate,
  salary: optionalText(100),
  source: optionalText(200),
  hasReferral: z.boolean().default(false),
  notes: optionalText(10_000),
  externalId: optionalText(200),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;
