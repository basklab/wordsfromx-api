# Auth & Database (Neon + Neon Auth + Drizzle)

## Status

- Database: Neon Postgres, accessed via Drizzle ORM (`drizzle-orm/neon-http`
  + `@neondatabase/serverless`).
- Schema lives in `src/db/schema.ts`; SQL migrations in `drizzle/*.sql` are
  generated via `drizzle-kit generate` and applied via `drizzle-kit migrate`.
- Auth: Neon Auth (Better Auth-powered). Frontend talks to it via
  `better-auth/react` with the `jwtClient` plugin; UI is rendered via
  `@daveyplate/better-auth-ui`. The Elysia API verifies bearer JWTs against
  the Neon Auth JWKS endpoint.

## Implementation

- API
  - `src/env.ts`: reads `DATABASE_URL` (falls back to `POSTGRES_URL`,
    `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) and
    `NEON_AUTH_BASE_URL`.
  - `src/db/index.ts`: `drizzle({ client: neon(DATABASE_URL), schema })`.
  - `src/db/schema.ts`: drizzle-kit-managed tables (`books`, `book_chapters`,
    `translations`, `profiles`, `vocab`) plus `neon_auth."user"` declared as
    a read-only reference for FKs and joins.
  - `drizzle.config.ts`: drizzle-kit config; reads `DATABASE_URL_UNPOOLED`
    when present, falling back to pooled.
  - `drizzle/0000_init.sql`: hand-edited to remove the `CREATE TABLE
    neon_auth."user"` statement (Neon Auth owns that table). Keep this in
    mind if you ever regenerate from scratch.
  - `src/lib/auth.ts`: `jose.createRemoteJWKSet(${NEON_AUTH_BASE_URL}/jwks)`
    + `jwtVerify`. User details pulled from `neon_auth."user"` via drizzle.
  - `src/routes/auth.ts`: only `/auth/me` (sign-in/sign-up live in the web
    client).
- Web
  - `src/lib/neon-auth.ts`: `better-auth/react` client with `jwtClient()`.
    Module-level token cache calling `${VITE_NEON_AUTH_URL}/token`.
  - `src/lib/auth.tsx`: bridges `authClient.useSession()` to the existing
    `useAuth()` hook.
  - `src/pages/Login.tsx`: lazy-loaded; renders `<AuthView />` from
    `@daveyplate/better-auth-ui`.
  - `src/App.tsx`: lazy-loads route components; auth UI provider lives only
    in `Login.tsx`.

## Migrations & Deploy

- Local
  - `bun run db:generate` after editing `src/db/schema.ts` produces a new
    `drizzle/NNNN_*.sql` file. Review and commit it.
  - `bun run db:migrate` applies pending migrations against `DATABASE_URL`.
  - `bun run db:studio` opens drizzle's web UI.
- Vercel
  - `apps/api/vercel.json` sets `buildCommand: "bun run db:migrate"`. Vercel
    runs it once per deploy with the env vars for that environment, so
    production deploys migrate the prod branch and preview deploys migrate
    their own ephemeral branch (per Neon's Vercel integration).
  - `DATABASE_URL_UNPOOLED` is preferred for migrations (drizzle.config.ts
    reads it first); the Neon Vercel integration sets both.

## Preview / Prod Setup

- **Neon Vercel integration** for branch-per-PR DBs: every Vercel preview
  gets its own ephemeral Neon branch forked from `main`, auto-deleted with
  the PR. Production reads/writes `main`. The integration sets
  `DATABASE_URL` and `DATABASE_URL_UNPOOLED` per environment.
- **Two Neon Auth projects**: one for production, one shared by Preview +
  local development. Set the keys per Vercel environment so preview
  sign-ups don't pollute the prod user table.
- Required env vars per environment
  - API: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`,
    `WEB_ORIGIN`, `MYMEMORY_EMAIL` (optional).
  - Web: `VITE_NEON_AUTH_URL`, `VITE_API_URL` (if not same-origin `/api`).

## Known Gaps

- The token cache in `neon-auth.ts` polls `/token` every 10 minutes; on
  401s the API client doesn't yet retry with a refreshed token.
- `loginAsTestUser` was removed; for E2E tests, sign in a real Neon Auth
  user with credentials kept in CI secrets.

## Alternatives Considered

- **`drizzle-orm/postgres-js`** as the driver: works fine with Neon's pooled
  URL but adds a dep. `neon-http` is recommended for serverless and is
  what Neon's docs lead with.
- **Migrations at runtime (`migrate()` on cold start)**: rejected because
  it slows cold starts and races between concurrent serverless invocations.
- **`drizzle-kit push`** (no migration files): faster for prototyping but
  loses an audit trail. Migrations make rollbacks and reviewability easier.
