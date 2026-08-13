# Intrack

An internship application tracker. Next.js App Router + Postgres, deployed on Vercel.

## Setup

```bash
npm install
vercel env pull .env.local   # DATABASE_URL comes from the Neon marketplace integration
npm run db:migrate
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run db:generate` | Write a new migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database |

`drizzle-kit` and other plain Node scripts don't auto-load `.env.local`, which is
why the `db:*` scripts go through `dotenv -e .env.local`.

## Architecture

```
src/
  db/schema.ts          Drizzle schema — applications + status_events
  db/index.ts           Lazy DB client (getDb)
  lib/constants.ts      Status/work-mode enums + labels. No server imports —
                        client components import from here, not from schema.ts
  lib/validation.ts     Zod schema; the single definition of a valid application
  lib/queries.ts        Reads (server-only)
  lib/actions.ts        Writes (server actions)
  lib/import-mapping.ts Header guessing + status/date normalization (pure)
  lib/import-actions.ts Import server action with dry-run + dedupe
  components/           UI
```

Two decisions worth knowing about:

**Every row carries a `userId`, and every query filters on it.** Auth is Clerk,
and the entire gate is `getCurrentUserId()` in `src/lib/auth.ts`: it returns the
session's user id or redirects to `/sign-in`. Because all 20 data paths already
funnel through it, adding real multi-tenancy needed no schema migration and no
query rewrites.

The gate lives there rather than in middleware on purpose — Clerk deprecated
`createRouteMatcher` because a path list can drift from how Next.js routes
requests and leave a resource reachable. `src/middleware.ts` only runs
`clerkMiddleware()` to populate the session. The one route that fetches nothing,
`/import`, calls `getCurrentUserId()` directly so its UI isn't served to
strangers.

**`status_events` records the path, and the path is editable.** Every status
change is written there as well as onto `applications.status`, so each row shows
the journey it took (`Applied → OA → Interview 2`) rather than just where it
landed. "Edit status path" in the row menu adds, retimes, and removes steps —
an import guessing wrong shouldn't leave you stuck with a history you can't
correct. Steps order by timestamp, and `applications.status` is kept in sync
with the latest step so the badge and the trail can never disagree.

## Importing

`/import` takes CSV, TSV, or a JSON array — including a wrapped API response
like `{ "success": true, "data": [...] }`, so a payload copied straight out of
the network tab works. It guesses the column mapping from your headers,
normalizes messy values (`Interview - Round 2` → Interview, `01/15/2026` and
`Feb 3 2026` → `2026-01-15` / `2026-02-03`, `Summer 2027` → Summer), then shows
a full dry-run preview — what will import, what's a duplicate, what's broken —
before writing anything.

Duplicate detection prefers a stable id from the source: if a row carries an
external id, only that id decides. Rows without one fall back to matching on
company + role + term. Two applications to the same role in the same term are
genuinely distinct records if the source says they are, and collapsing them
would silently drop data.

This is provider-agnostic on purpose: it's the permanent path for Tracktern
today and anything else later.

### Getting data out of Tracktern

Tracktern has no export, so the extraction is a throwaway step that feeds the
importer above. In order of effort:

1. **Network tab.** DevTools → Network → filter XHR → reload the applications
   list. If a request returns your applications as JSON, right-click → Copy
   Response and paste it straight into `/import`. If the app is Next.js with
   Server Components the payload may be an RSC flight stream instead — messier,
   but still parseable.
2. **Look for an unadvertised export.** Try `/api/export`, the settings page, or
   any "download my data" / GDPR language. Two minutes, occasionally free.
3. **Copy-paste the table.** Select the rendered table, paste the raw text into
   `/import`, fix up the column mapping. Least reliable, but the preview step
   catches the errors.
4. **Browser automation.** A Playwright script that logs in and paginates the
   list. Works regardless of API shape; breaks whenever their DOM changes.

Check Tracktern's terms before automating. Exporting your own data is normally
fine, but scripted access can trip rate limits or account flags.

## Deploying

Linked to the Vercel project `intrack` with Neon and Clerk attached, so
`vercel deploy` works. Run `npm run db:migrate` against production before the
first deploy.

Rows created before auth landed carry `userId = "local-user"` and no session
will ever match them. `npm run db:adopt -- <clerk-user-id>` moves them onto a
real account; it's a one-off.

The Clerk keys provisioned by the Marketplace are `pk_test`/`sk_test`, i.e. a
development instance. A Clerk *production* instance needs a domain you control
for its Frontend API CNAME, which a `*.vercel.app` host can't provide — so
running this for real users means owning a domain first.
