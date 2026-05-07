import { env } from "../env";

if (!env.databaseUrl) {
  throw new Error("Database connection string is required. Set DATABASE_URL.");
}

export const sql = new Bun.SQL({ url: env.databaseUrl, prepare: false });

export async function ensureSchema(): Promise<void> {
  await sql`
    create table if not exists books (
      id bigserial primary key,
      user_id uuid not null references neon_auth."user"(id) on delete cascade,
      title text not null,
      author text,
      cover_image text,
      language text not null default 'en',
      target_lang text not null default 'en',
      current_chapter integer not null default 0,
      current_page integer not null default 0,
      chapter_count integer not null default 0,
      token_count integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists book_chapters (
      id bigserial primary key,
      book_id bigint not null references books(id) on delete cascade,
      position integer not null,
      title text not null,
      content text not null,
      token_count integer not null default 0,
      created_at timestamptz not null default now(),
      unique (book_id, position)
    )
  `;

  await sql`
    create table if not exists translations (
      source_lang text not null,
      target_lang text not null,
      kind text not null check (kind in ('word', 'sentence')),
      term text not null,
      translation text not null,
      provider text not null default 'mymemory',
      created_at timestamptz not null default now(),
      primary key (source_lang, target_lang, kind, term)
    )
  `;

  await sql`
    create table if not exists profiles (
      id uuid primary key references neon_auth."user"(id) on delete cascade,
      source_lang text not null default 'en',
      target_lang text not null default 'ru',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists vocab (
      user_id uuid not null references neon_auth."user"(id) on delete cascade,
      source_lang text not null,
      lemma text not null,
      exposures integer not null default 1,
      status text not null default 'tracking' check (status in ('tracking', 'known', 'ignored')),
      first_seen timestamptz not null default now(),
      last_seen timestamptz not null default now(),
      primary key (user_id, source_lang, lemma)
    )
  `;

  await sql`create index if not exists books_user_id_idx on books(user_id)`;
  await sql`create index if not exists book_chapters_book_id_idx on book_chapters(book_id)`;
  await sql`create index if not exists translations_term_idx on translations(source_lang, target_lang, kind, term)`;
  await sql`create index if not exists vocab_user_status_idx on vocab(user_id, status, last_seen desc)`;
}

