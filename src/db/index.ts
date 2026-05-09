import { SQL } from "bun";
import { drizzle, type BunSQLDatabase } from "drizzle-orm/bun-sql";
import { env } from "../env";
import * as schema from "./schema";

if (!env.databaseUrl) {
  throw new Error("Database connection string is required. Set DATABASE_URL.");
}

// Module-level singleton: on Vercel Fluid Compute the same instance is
// reused across concurrent invocations, so the underlying TCP pool stays
// warm. Vercel's attachDatabasePool only supports drivers that emit a
// connection-release event (pg/mysql2/mongo/ioredis); bun:sql doesn't,
// so we let Bun manage the pool itself.
const client = new SQL(env.databaseUrl);

type Schema = typeof schema;

export const db: BunSQLDatabase<Schema> = drizzle(client, { schema });
export { schema };
