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

/**
 * `.+` rather than `.*` leaves out the home page, and the lookahead leaves out
 * the legal pages: this middleware redirects anything it covers to sign-in, so
 * the public routes have to sit outside it. Everything else stays covered by
 * default — a new route is protected unless it's deliberately excluded here.
 */
export const config = {
  matcher: [
    "/((?!privacy|terms|robots.txt|sitemap.xml|opengraph-image|_next/static|_next/image|icon.svg).+)",
  ],
};
