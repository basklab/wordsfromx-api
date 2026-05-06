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

export const env = {
  port: Number(first(Bun.env.PORT, Bun.env.API_PORT) ?? 3001),
  webOrigins,
  databaseUrl: first(Bun.env.POSTGRES_URL, Bun.env.POSTGRES_PRISMA_URL, Bun.env.POSTGRES_URL_NON_POOLING),
  supabaseUrl: Bun.env.SUPABASE_URL?.replace(/\/$/, "") ?? "http://local.supabase:8000",
  supabaseJwtSecret: Bun.env.SUPABASE_JWT_SECRET,
  myMemoryEmail: Bun.env.MYMEMORY_EMAIL ?? "",
};
