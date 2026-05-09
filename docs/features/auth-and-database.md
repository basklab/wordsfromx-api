# Auth & Database (Better Auth + Postgres + Drizzle)

## Status

- Database: Postgres. The driver is selected at runtime based on
  `DATABASE_URL`:
  - Neon (`*.neon.tech`) → `@neondatabase/serverless` `Pool` +
    `drizzle-orm/neon-serverless`. `neonConfig.poolQueryViaFetch = true`
    so non-transactional queries go over HTTP; transactions fall back to
    WebSocket automatically.
  - Anything else (local Postgres, other providers) → Bun's native
    `bun:sql` client + `drizzle-orm/bun-sql`. No third-party Postgres
    driver dependency.
- Schema lives in `src/db/schema.ts`; SQL migrations in `drizzle/*.sql` are
  generated via `drizzle-kit generate` and applied via `drizzle-kit migrate`.
- Auth: **Better Auth, self-hosted inside the Elysia API.** No external auth
  service. Better Auth owns the `user` / `session` / `account` / `verification`
  tables in the same Postgres database and is mounted at `/auth/*`. The web
  client talks to it via `better-auth/react` and the
  `@daveyplate/better-auth-ui` `<AuthView />`. Sessions are HTTP-only cookies
  on the API origin.

## Implementation

- API
  - `src/env.ts`: reads `DATABASE_URL` (falls back to `POSTGRES_URL`,
    `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`), `BETTER_AUTH_SECRET`
    (required), and the optional `BETTER_AUTH_URL`.
  - `src/db/index.ts`: branches on `DATABASE_URL`. Neon uses the
    serverless WebSocket pool; otherwise `bun:sql`.
  - `src/db/schema.ts`: drizzle-kit-managed tables. Better Auth core
    (`user`, `session`, `account`, `verification`) plus app tables
    (`books`, `book_chapters`, `translations`, `profiles`, `vocab`). User
    ids are `text` (Better Auth default), so user-bound FKs are `text` too.
  - `src/lib/auth.ts`: `betterAuth({ database: drizzleAdapter(db, { provider: "pg" }), emailAndPassword: { enabled: true }, basePath: "/auth", trustedOrigins })`.
    Exports `userFromRequest(request)` which calls
    `auth.api.getSession({ headers })` and normalizes the user shape.
  - `src/routes/auth.ts`: mounts `auth.handler` on `/auth/*`, plus a
    convenience `/auth/me` endpoint. Better Auth handles sign-up, sign-in,
    sign-out, get-session, password reset, etc.
  - All other routes use `userFromRequest(request)` to gate access.
- Web
  - `src/lib/auth-client.ts`: `createAuthClient({ baseURL: ${API}/auth, basePath: "/auth" })`
    with `credentials: "include"`. No JWT plugin, no token cache.
  - `src/lib/api.ts`: Eden treaty client with `credentials: "include"`. The
    Better Auth session cookie is sent automatically.
  - `src/lib/auth.tsx`: bridges `authClient.useSession()` to `useAuth()`.
  - `src/pages/Login.tsx`: lazy-loaded; renders `<AuthView />`.

## Migrations & Deploy

- Local
  - `bun run db:generate` after editing `src/db/schema.ts` produces a new
    `drizzle/NNNN_*.sql` file. Review and commit it.
  - `bun run db:migrate` applies pending migrations against `DATABASE_URL`.
  - The cut-over migration is `0001_better_auth.sql`. It drops the
    user-bound app tables (data tied to old `neon_auth.user` uuid ids
    cannot survive the switch to better-auth `text` ids) and recreates them.
    The translations cache is preserved.
- Vercel
  - `vercel.json` sets `buildCommand: "bun run db:migrate"` and pins
    `regions: ["fra1"]`. Vercel runs the migrate step once per deploy.
  - `DATABASE_URL_UNPOOLED` is preferred for migrations
    (drizzle.config.ts reads it first).

## Required env vars

- API
  - `DATABASE_URL` (and `DATABASE_URL_UNPOOLED` for migrations)
  - `BETTER_AUTH_SECRET` — random 32+ byte secret. Generate with
    `openssl rand -base64 32`.
  - `BETTER_AUTH_URL` — public URL of the API (used for OAuth callbacks
    etc.). Optional for email/password-only setups.
  - `WEB_ORIGIN` — comma-separated list of allowed web origins.
  - `MYMEMORY_EMAIL` (optional).
- Web
  - `VITE_API_URL` (if not same-origin `/api`).

## Known Gaps

- Email verification is not enforced (`emailAndPassword.enabled: true` only).
  Add an email provider + `requireEmailVerification: true` when ready.
- No password reset email flow wired up yet — Better Auth supports it but
  it needs an email-sending integration.
- Social providers (GitHub, Google, etc.) are not configured. Add via
  `socialProviders` in `src/lib/auth.ts`.

## Alternatives Considered

- **Neon Auth (the previous approach)**: managed, but ties auth to a single
  vendor and forced a JWT cookie-exchange dance to authenticate API calls.
  Self-hosted Better Auth removes the vendor lock-in and the indirection.
- **`drizzle-orm/neon-http`**: HTTP-only, no transaction support, so it
  can't back Better Auth. `neon-serverless` (WebSocket) handles both
  transactional and non-transactional queries and is what we use against
  Neon.
- **`postgres-js` for the local branch**: works, but pulls in a
  third-party driver. Bun's native `bun:sql` is built in and removes the
  dependency for the local/preview-without-Neon path.
- **A single driver everywhere**: `bun:sql` can't reach Neon (which
  requires the serverless WebSocket proxy), and `@neondatabase/serverless`
  can't reach a local Postgres without that proxy. The URL switch keeps
  each environment on the right driver.
- **JWT sessions instead of cookie sessions**: cookie sessions are the
  Better Auth default and require zero client-side token handling.
