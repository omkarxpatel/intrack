import { clerkMiddleware } from "@clerk/nextjs/server";

// Deliberately bare: it only makes the session available to auth(). The actual
// gate lives in getCurrentUserId(), which every read and write already goes
// through — Clerk deprecated createRouteMatcher precisely because a path list
// can drift from how Next.js routes requests and leave a resource reachable.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
