# Auth & Database (Neon + Neon Auth)

## Status

- Database: Neon Postgres (replaces local Postgres / Supabase).
- Auth: Neon Auth (Better Auth-powered). Frontend uses `@neondatabase/auth`
  + `@neondatabase/auth-ui`. The Elysia API verifies bearer JWTs against the
  Neon Auth JWKS endpoint.

## Implementation

- API
  - `src/env.ts`: reads `DATABASE_URL` (falls back to `POSTGRES_URL`,
    `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) and `NEON_AUTH_BASE_URL`.
  - `src/lib/db.ts`: schema FKs to `neon_auth."user"(id)` (text). No more
    `auth.users` seeding.
  - `src/lib/auth.ts`: `jose.createRemoteJWKSet(${NEON_AUTH_BASE_URL}/jwks)` +
    `jwtVerify`. The `sub` claim becomes the user id; user details are pulled
    from `neon_auth."user"`.
  - `src/routes/auth.ts`: only `/auth/me` remains (sign-in/sign-up live in the
    web client via Neon Auth UI).
- Web
  - `src/lib/neon-auth.ts`: `createAuthClient(VITE_NEON_AUTH_URL, {
    adapter: BetterAuthReactAdapter() })` plus a small in-memory token cache
    that calls `${VITE_NEON_AUTH_URL}/token` to mint a JWT for the API.
  - `src/lib/auth.tsx`: bridges `authClient.useSession()` to the existing
    `useAuth()` hook so the rest of the app didn't have to change.
  - `src/pages/Login.tsx`: renders Neon Auth UI's `<AuthView />`.
  - `src/App.tsx`: wraps in `NeonAuthUIProvider` + `AuthProvider`.

## Preview / Prod Setup

The intended deploy topology:

- One Neon project per environment isn't required — instead use **Neon's
  Vercel integration** so each Vercel preview deployment gets its own
  ephemeral Neon database branch (forked from `main`), auto-deleted with the
  PR. Production reads/writes the `main` branch. The integration sets
  `DATABASE_URL` and `DATABASE_URL_UNPOOLED` per Vercel environment.
- Use **two Neon Auth projects**: one for production, one shared by Preview +
  local development. Configure the keys per Vercel environment (Production
  vs Preview vs Development).
- Required env vars per environment:
  - API: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `WEB_ORIGIN`,
    `MYMEMORY_EMAIL` (optional).
  - Web: `VITE_NEON_AUTH_URL`, `VITE_API_URL` (if not using same-origin
    `/api`).

## Known Gaps

- Schema bootstrap runs at API cold start (idempotent). Long-term, swap to a
  real migration runner so Neon branches don't accept implicit DDL.
- The token cache in `neon-auth.ts` polls `/token` every 10 minutes; on 401s
  the API client doesn't yet retry with a refreshed token.
- `loginAsTestUser` was removed; for E2E tests, sign in a real Neon Auth user
  with credentials kept in CI secrets.

## Alternatives Considered

- **Stack Auth** (the legacy Neon Auth integration): superseded by the new
  Better Auth-powered Neon Auth. Avoided to skip an immediate second
  migration.
- **One Neon Auth project across all environments**: simpler, but preview
  sign-ups would pollute the production user table.
