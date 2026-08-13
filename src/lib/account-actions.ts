"use server";

import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, rolePresets, statusEvents } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

/**
 * Deletes the account and everything in it.
 *
 * Deliberately not the auth library's delete-user endpoint: that removes the
 * identity but knows nothing about `applications`, which would leave someone's
 * entire job search sitting in the database after they'd asked for it to be
 * gone. Application rows go first, then the auth row — sessions, accounts, and
 * org memberships cascade from it.
 */
export async function deleteAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const userId = await getCurrentUserId();

  // status_events cascade from applications; the explicit delete catches any
  // row whose application is already gone.
  await db.delete(applications).where(eq(applications.userId, userId));
  await db.delete(statusEvents).where(eq(statusEvents.userId, userId));
  await db.delete(rolePresets).where(eq(rolePresets.userId, userId));
  await db.execute(sql`delete from neon_auth."user" where id = ${userId}`);

  // Deleting the session row isn't enough: Neon also caches the session in a
  // signed cookie, and until that expires the app would keep trusting it — a
  // deleted account could still load the tracker and even write rows under an
  // id that no longer exists. Matched by prefix because the names differ
  // between http and https (`__Secure-`).
  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (!cookie.name.includes("neon-auth")) continue;
    // Not store.delete(): these are `__Secure-` prefixed, and a browser only
    // accepts a replacement for those when the Secure attribute is set — the
    // expiry that delete() sends without it is silently ignored.
    store.set({
      name: cookie.name,
      value: "",
      expires: new Date(0),
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return { ok: true };
}
