import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy so that `next build` doesn't crash when DATABASE_URL isn't present yet.
// Deliberately a plain function rather than a Proxy wrapper — Proxies break
// libraries that introspect the client object.
let _db: ReturnType<typeof create> | null = null;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run `vercel env pull .env.local`.");
  return drizzle(neon(url), { schema });
}

export function getDb() {
  if (!_db) _db = create();
  return _db;
}
