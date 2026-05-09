# Server Extraction

## What

`wordsfromx-api--elysia` is the standalone Elysia API extracted from the
Solid and Ripple Elysia worktrees. It runs directly with Bun
(`bun install && bun dev`) and is deployed as Vercel Functions.

## Where

- `src/index.ts` — runtime entrypoint.
- `src/routes/auth.ts` — Better Auth handler mounted at `/auth/*`.
- `src/routes/books.ts`, `src/routes/epub.ts`, `src/routes/translate.ts`,
  `src/routes/profile.ts`, `src/routes/vocab.ts` — feature routes.
- `src/db/index.ts`, `src/db/schema.ts` — Drizzle client and schema
  (see [auth-and-database.md](./auth-and-database.md)).
- `src/lib/*` — EPUB, text, paging, translation, and vocab helpers.
- `drizzle/*.sql` — migrations applied at deploy via `bun run db:migrate`.

## Source worktrees

- `wordsfromx--ripple-elysia` — auth, books, Postgres storage, text
  parsing, paging, EPUB parser.
- `wordsfromx--solid-elysia` — standalone EPUB parse route and
  MyMemory-backed translation route.

## Gaps

- Solid and Ripple clients depend on this API via local package links
  and `VITE_API_URL`.
- OpenAPI generation is not wired yet.

## Alternatives

- Git submodules and raw symlinks — brittle across editors, package
  managers, and CI.
- Sharing server internals directly with clients — avoided because
  OpenAPI is expected to become the contract boundary.
