import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

if (!env.databaseUrl) {
  throw new Error("Database connection string is required. Set DATABASE_URL.");
}

const client = postgres(env.databaseUrl, { prepare: false });
export const db = drizzle(client, { schema });
export { schema };
