# Server Extraction

## Status

`wordsfromx-api--elysia` is the standalone Elysia API extracted from the Solid
and Ripple Elysia worktrees.

## Implementation

- Runtime entrypoint: `src/index.ts`
- Auth routes: `src/routes/auth.ts`
- Book routes: `src/routes/books.ts`
- EPUB parse route: `src/routes/epub.ts`
- Translation route: `src/routes/translate.ts`
- Postgres schema bootstrap: `src/lib/db.ts` (Neon, FKs to `neon_auth."user"`)
- Auth verification: `src/lib/auth.ts` (Neon Auth JWKS via `jose`)
- EPUB, text, paging, and book domain helpers: `src/lib/*`

The server runs directly from the repo root with Bun:

```sh
bun install
bun dev
```

## Source Worktrees

- `wordsfromx--ripple-elysia`: auth, books, direct Postgres storage, text parsing,
  paging, and the improved EPUB parser.
- `wordsfromx--solid-elysia`: standalone EPUB parse route and MyMemory-backed
  translation route behavior.

## Known Gaps

- The Solid and Ripple clients point at this API repo through local package
  links and `VITE_API_URL`.
- OpenAPI generation is not wired yet.
- Schema is bootstrapped at startup via `ensureSchema()`. For multi-branch /
  preview workflows this is fine (idempotent on each branch), but a real
  migration tool (drizzle-kit / atlas) is not yet wired in.

## Alternatives Considered

- Git submodules and raw symlinks were avoided because they make the split repo
  workflow brittle across editors, package managers, and CI.
- Sharing server internals directly with clients was avoided because OpenAPI is
  expected to become the contract boundary later.
