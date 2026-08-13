import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Managed Better Auth, hosted by Neon alongside the database. Users live in the
 * `neon_auth` schema of the same Postgres as their applications.
 *
 * Kept separate from lib/auth.ts so the rest of the app still imports one
 * identity seam and never touches the provider directly.
 */
export const neonAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
