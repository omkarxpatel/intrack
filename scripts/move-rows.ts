/**
 * Move every row owned by one user id onto another.
 *
 *   npm run db:move-rows -- <fromUserId> <toUserId>
 *
 * Needed whenever the identity source changes and ids don't carry over: rows
 * created before auth existed are stamped "local-user", and swapping auth
 * providers reissues ids. It prints counts before and after so the move is
 * verifiable rather than hopeful.
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const [from, to] = process.argv.slice(2);
  if (!from || !to) {
    console.error("Usage: npm run db:move-rows -- <fromUserId> <toUserId>");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);
  const counts = () =>
    sql`select user_id, count(*)::int as n from applications group by user_id order by n desc`;

  console.log("before:", await counts());

  const apps = await sql`
    update applications set user_id = ${to} where user_id = ${from} returning id`;
  const events = await sql`
    update status_events set user_id = ${to} where user_id = ${from} returning id`;
  // (user_id, role) is unique, so skip any preset the target already has and
  // drop the leftover rather than colliding.
  const presets = await sql`
    update role_presets set user_id = ${to}
     where user_id = ${from}
       and role not in (select role from role_presets where user_id = ${to})
    returning id`;
  await sql`delete from role_presets where user_id = ${from}`;

  console.log(
    `moved ${apps.length} applications, ${events.length} status events, ${presets.length} role presets`,
  );
  console.log("after:", await counts());
}

main();
