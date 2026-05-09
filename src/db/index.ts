import { SQL } from "bun";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleBun, type BunSQLDatabase } from "drizzle-orm/bun-sql";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { env } from "../env";
import * as schema from "./schema";

if (!env.databaseUrl) {
  throw new Error("Database connection string is required. Set DATABASE_URL.");
}

const url = env.databaseUrl;
const isNeon = /\.neon\.tech\b/.test(url);

// Route non-transactional queries over HTTP for faster cold starts.
// Transactions (used by Better Auth) automatically fall back to WebSocket.
neonConfig.poolQueryViaFetch = true;

type Schema = typeof schema;

function buildDb(): BunSQLDatabase<Schema> {
  if (!isNeon) {
    return drizzleBun(new SQL(url), { schema });
  }
  const pool = new Pool({ connectionString: url });
  // Both drivers expose the same drizzle query-builder surface; the cast
  // keeps a single static type for downstream callers.
  return drizzleNeon(pool, { schema }) as unknown as BunSQLDatabase<Schema>;
}

export const db = buildDb();
export { schema };
