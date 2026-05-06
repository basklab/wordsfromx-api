import { sql } from "./db";
import type { Profile } from "./types";

type ProfileRow = {
  id: string;
  source_lang: string;
  target_lang: string;
};

export async function getProfile(userId: string): Promise<Profile> {
  const rows = await sql<ProfileRow[]>`
    insert into profiles (id)
    values (${userId})
    on conflict (id) do update set id = excluded.id
    returning id, source_lang, target_lang
  `;
  return mapProfile(rows[0]!);
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "sourceLang" | "targetLang">>,
): Promise<Profile> {
  const existing = await getProfile(userId);
  const rows = await sql<ProfileRow[]>`
    update profiles
    set
      source_lang = ${patch.sourceLang ?? existing.sourceLang},
      target_lang = ${patch.targetLang ?? existing.targetLang},
      updated_at = now()
    where id = ${userId}
    returning id, source_lang, target_lang
  `;
  return mapProfile(rows[0]!);
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
  };
}
