import { SQL } from "bun";
import { attachDatabasePool } from "@vercel/functions";
import type { DbPool } from "@vercel/functions/db-connections";
import { drizzle, type BunSQLDatabase } from "drizzle-orm/bun-sql";
import { env } from "../env";
import * as schema from "./schema";

if (!env.databaseUrl) {
  throw new Error("Database connection string is required. Set DATABASE_URL.");
}

const client = new SQL(env.databaseUrl);

// Register the pool with Vercel Fluid Compute so connections are reused
// across concurrent invocations on the same instance and drained on
// shutdown. attachDatabasePool duck-types known pool shapes; bun:sql isn't
// one of them, so we cast.
attachDatabasePool(client as unknown as DbPool);

type Schema = typeof schema;

export const db: BunSQLDatabase<Schema> = drizzle(client, { schema });
export { schema };
