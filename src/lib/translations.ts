import { sql } from "./db";

export type TranslationKind = "word" | "sentence";

export async function getCachedTranslation(
  source: string,
  target: string,
  kind: TranslationKind,
  term: string,
): Promise<string | null> {
  const rows = await sql<Array<{ translation: string }>>`
    select translation
    from translations
    where source_lang = ${source}
      and target_lang = ${target}
      and kind = ${kind}
      and term = ${term}
    limit 1
  `;
  return rows[0]?.translation ?? null;
}

export async function saveCachedTranslation(
  source: string,
  target: string,
  kind: TranslationKind,
  term: string,
  translation: string,
  provider = "mymemory",
): Promise<void> {
  await sql`
    insert into translations (source_lang, target_lang, kind, term, translation, provider)
    values (${source}, ${target}, ${kind}, ${term}, ${translation}, ${provider})
    on conflict (source_lang, target_lang, kind, term)
    do update set translation = excluded.translation, provider = excluded.provider
  `;
}
