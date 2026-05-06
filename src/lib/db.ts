import postgres from "postgres";
import { env } from "../env";

if (!env.databaseUrl) {
  throw new Error("Database connection string is required. Set POSTGRES_URL.");
}

export const sql = postgres(env.databaseUrl, { prepare: false });

export const TEST_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "test@example.com",
  name: "Test User",
  password: "test",
};

export async function ensureSchema(): Promise<void> {
  await sql`
    create table if not exists books (
      id bigserial primary key,
      user_id uuid not null references auth.users(id) on delete cascade,
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

  await seedTestUser();
  await sql`alter table books add column if not exists updated_at timestamptz not null default now()`;
  await sql`create index if not exists books_user_id_idx on books(user_id)`;
  await sql`create index if not exists book_chapters_book_id_idx on book_chapters(book_id)`;
  await sql`create index if not exists translations_term_idx on translations(source_lang, target_lang, kind, term)`;
}

async function seedTestUser(): Promise<void> {
  await sql`
    insert into auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      ${TEST_USER.id},
      'authenticated',
      'authenticated',
      ${TEST_USER.email},
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      ${sql.json({ name: TEST_USER.name })},
      now(),
      now()
    )
    on conflict (id) do update set
      email = excluded.email,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now()
  `;
}
