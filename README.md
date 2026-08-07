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

**Every row carries a `userId`, and every query filters on it.** Right now
`getCurrentUserId()` in `src/lib/auth.ts` returns a constant, so the app works
with no login. Publishing means replacing that one function with a real session
lookup — no schema migration, no query rewrites. Retrofitting multi-tenancy
later is the expensive version of this.

**`status_events` is an append-only log.** Status changes are written there in
addition to updating `applications.status`, so a timeline and "days since last
movement" are available without backfilling history that was never recorded.

## Importing

`/import` takes CSV, TSV, or a JSON array. It guesses the column mapping from
your headers, normalizes messy values (`Interview - Round 2` → Interview,
`01/15/2026` and `Feb 3 2026` → `2026-01-15` / `2026-02-03`), then shows a full
dry-run preview — what will import, what's a duplicate, what's broken — before
writing anything. Duplicates are matched on company + role + term.

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

Linked to the Vercel project `intrack` with Neon attached, so `vercel deploy`
works. Run `npm run db:migrate` against production before the first deploy.

Before making this public, add auth (see `src/lib/auth.ts`) — until then every
visitor shares the same `local-user` row set.
