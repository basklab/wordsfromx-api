const first = (...values: Array<string | undefined>): string | undefined => {
  return values.find((value) => value && value.trim().length > 0);
};

const webOrigins = (
  Bun.env.WEB_ORIGIN ??
  "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const databaseUrl = first(
  Bun.env.DATABASE_URL,
  Bun.env.POSTGRES_URL,
  Bun.env.POSTGRES_PRISMA_URL,
  Bun.env.POSTGRES_URL_NON_POOLING,
);

const neonAuthBaseUrl = first(Bun.env.NEON_AUTH_BASE_URL, Bun.env.VITE_NEON_AUTH_URL)?.replace(/\/$/, "");
const neonAuthAudience = first(Bun.env.NEON_AUTH_AUDIENCE);

export const env = {
  port: Number(first(Bun.env.PORT, Bun.env.API_PORT) ?? 3001),
  webOrigins,
  databaseUrl,
  neonAuthBaseUrl,
  neonAuthAudience,
  myMemoryEmail: Bun.env.MYMEMORY_EMAIL ?? "",
};
