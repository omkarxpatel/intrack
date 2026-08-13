/**
 * Canonical origin, in one place so metadata, robots, and the sitemap can't
 * disagree. Set NEXT_PUBLIC_SITE_URL when a real domain is attached — until
 * then Vercel serves `x-robots-tag: noindex` on generated *.vercel.app URLs,
 * so nothing here is indexable regardless of what it says.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://intrack-internships-hq.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "Intrack";

export const SITE_DESCRIPTION =
  "A free internship application tracker. Log every application with status, dates, and notes, see your response, interview, and offer rates, and import the spreadsheet you already keep.";
