import { redirect } from "next/navigation";
import { neonAuth } from "@/lib/neon-auth";

/**
 * Single seam for identity *and* the app's auth gate: every query and action
 * filters on what this returns, so nothing can read or write rows without
 * passing through here first.
 *
 * It redirects rather than returning a fallback id — failing closed beats
 * serving one user another user's applications.
 */
export async function getCurrentUserId(): Promise<string> {
  const { data: session } = await neonAuth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  return session.user.id;
}
