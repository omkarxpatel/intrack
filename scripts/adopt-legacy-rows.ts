/**
 * One-off: move the pre-auth rows onto a real account.
 *
 * Everything created before Clerk landed carries `userId = "local-user"`, which
 * no real session will ever match. Run this once with your own Clerk user id:
 *
 *   npm run db:adopt -- user_xxxxxxxxxxxxxxxxxxxxxx
 *
 * Clerk development and production instances have separate user pools, so the
 * id differs between them — moving to a production instance means running this
 * again with the new id.
 */
import { neon } from "@neondatabase/serverless";

const LEGACY_USER_ID = "local-user";

async function main() {
  const target = process.argv[2];
  if (!target?.startsWith("user_")) {
    console.error("Usage: npm run db:adopt -- <clerk-user-id>");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);
  const counts = () =>
    sql`select user_id, count(*)::int as n from applications group by user_id order by n desc`;

  console.log("before:", await counts());

  const apps = await sql`
    update applications set user_id = ${target} where user_id = ${LEGACY_USER_ID} returning id`;
  const events = await sql`
    update status_events set user_id = ${target} where user_id = ${LEGACY_USER_ID} returning id`;
  // (user_id, role) is unique, so skip any preset the target already has and
  // drop the leftover rather than colliding.
  const presets = await sql`
    update role_presets set user_id = ${target}
     where user_id = ${LEGACY_USER_ID}
       and role not in (select role from role_presets where user_id = ${target})
    returning id`;
  await sql`delete from role_presets where user_id = ${LEGACY_USER_ID}`;

  console.log(
    `moved ${apps.length} applications, ${events.length} status events, ${presets.length} role presets`,
  );
  console.log("after:", await counts());
}

main();
