import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { env } from "../env";
import * as schema from "./schema";

if (!env.databaseUrl) {
  throw new Error("Database connection string is required. Set DATABASE_URL.");
}

const client = neon(env.databaseUrl);
export const db = drizzle({ client, schema });
export { schema };
