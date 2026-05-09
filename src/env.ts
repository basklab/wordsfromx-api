const first = (...values: Array<string | undefined>): string | undefined => {
  return values.find((value) => value && value.trim().length > 0);
};

const runtimeEnv =
  typeof Bun !== "undefined"
    ? Bun.env
    : typeof process !== "undefined"
      ? process.env
      : {};

const webOrigins = (
  runtimeEnv.WEB_ORIGIN ??
  "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Prefer the pooled connection string for runtime queries. On Vercel + Neon,
// DATABASE_URL / POSTGRES_URL point at the pgBouncer pooler; the non-pooled
// variants are reserved for migrations (see drizzle.config.ts).
const databaseUrl = first(
  runtimeEnv.DATABASE_URL,
  runtimeEnv.POSTGRES_URL,
  runtimeEnv.POSTGRES_PRISMA_URL,
);

const betterAuthSecret = first(runtimeEnv.BETTER_AUTH_SECRET);
const betterAuthBaseUrl = first(runtimeEnv.BETTER_AUTH_URL);

export const env = {
  port: Number(first(runtimeEnv.PORT, runtimeEnv.API_PORT) ?? 3001),
  webOrigins,
  databaseUrl,
  betterAuthSecret,
  betterAuthBaseUrl,
  myMemoryEmail: runtimeEnv.MYMEMORY_EMAIL ?? "",
};
