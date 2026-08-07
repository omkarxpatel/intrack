/**
 * Single seam for identity.
 *
 * Today this returns a fixed local user so the app works with no login. When
 * you're ready to publish, replace the body with a real session lookup (Clerk,
 * Auth.js, whatever) and make it throw/redirect when unauthenticated — every
 * query already filters by the id this returns, so nothing else has to change.
 */
export const LOCAL_USER_ID = "local-user";

export async function getCurrentUserId(): Promise<string> {
  return LOCAL_USER_ID;
}
