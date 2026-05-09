# Auth & Database (Better Auth + Postgres + Drizzle)

## What

Postgres via `bun:sql` + `drizzle-orm/bun-sql`, no third-party driver.
Runtime uses the **pooled** connection URL (Neon `-pooler` / pgBouncer);
migrations use the unpooled URL. The `SQL` client is a module-level
singleton — Vercel Fluid Compute reuses the same instance across
concurrent invocations, so the underlying TCP pool stays warm.

Auth is a default Better Auth setup, self-hosted inside the Elysia API
at `/auth/*`.

## Where

- `src/env.ts` — reads `DATABASE_URL` (falls back to `POSTGRES_URL`,
  `POSTGRES_PRISMA_URL`), `BETTER_AUTH_SECRET`, optional `BETTER_AUTH_URL`,
  `WEB_ORIGIN`, `MYMEMORY_EMAIL`.
- `src/db/index.ts` — `drizzle(new SQL(databaseUrl))`.
- `src/db/schema.ts` — Better Auth core tables + app tables (`books`,
  `book_chapters`, `translations`, `profiles`, `vocab`). User-bound FKs
  are `text` to match Better Auth ids.
- `src/lib/auth.ts` — `betterAuth({ database: drizzleAdapter(db, { provider: "pg" }), ... })`. Exports `userFromRequest(request)`.
- `src/routes/auth.ts` — mounts `auth.handler` on `/auth/*` plus
  `/auth/me`. Other routes gate via `userFromRequest`.
- `drizzle.config.ts` — uses `DATABASE_URL_UNPOOLED` for migrations.
- `vercel.json` — runs `bun run db:migrate` as the build command.
- Web: `src/lib/auth-client.ts`, `src/lib/api.ts`, `src/lib/auth.tsx`,
  `src/pages/Login.tsx`.

## Migrations

- `bun run db:generate` after schema edits → review + commit
  `drizzle/NNNN_*.sql`. `bun run db:migrate` applies pending.
- `0001_better_auth.sql` is the cut-over from Neon Auth: drops
  user-bound app tables (uuid → `text` ids) and recreates them.
  Translations cache preserved.

## Env vars

- API: `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED` for migrations),
  `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), optional
  `BETTER_AUTH_URL`, `WEB_ORIGIN` (comma-separated), optional
  `MYMEMORY_EMAIL`.
- Web: `VITE_API_URL` (if not same-origin `/api`).

## Gaps

Email verification not enforced; no password reset email flow; no
social providers wired up.

## Alternatives

- **Neon Auth** — vendor-locked, required a JWT cookie-exchange dance.
- **`@neondatabase/serverless`** — needed when raw TCP egress is
  blocked. Vercel Fluid Compute has TCP, and Neon's `-pooler` host
  speaks plain Postgres wire protocol, so `bun:sql` suffices.
- **`drizzle-orm/neon-http`** — no transactions, can't back Better Auth.
- **`postgres-js`** — third-party; `bun:sql` is built in.
- **JWT sessions** — cookie sessions are Better Auth's default and
  need no client-side token handling.
