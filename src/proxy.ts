import { neonAuth } from "@/lib/neon-auth";

/**
 * Load-bearing for social sign-in, not just route protection.
 *
 * Neon finishes an OAuth round-trip by redirecting back with a
 * `neon_auth_session_verifier` query param, and this is what exchanges that
 * token for the session cookie (`processAuthMiddleware` → `exchangeOAuthToken`).
 * Without it, Google sign-in creates the user and session server-side but the
 * browser never receives a cookie, so the app bounces straight back to sign-in.
 * It also refreshes expiring sessions.
 *
 * Next.js 16 renamed Middleware to Proxy; the file has to be `proxy.ts`.
 * getCurrentUserId() remains the real gate — this runs in front of it.
 */
export default neonAuth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
