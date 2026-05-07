import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { translations } from "../db/schema";

export type TranslationKind = "word" | "sentence";

export async function getCachedTranslation(
  source: string,
  target: string,
  kind: TranslationKind,
  term: string,
): Promise<string | null> {
  const rows = await db
    .select({ translation: translations.translation })
    .from(translations)
    .where(
      and(
        eq(translations.sourceLang, source),
        eq(translations.targetLang, target),
        eq(translations.kind, kind),
        eq(translations.term, term),
      ),
    )
    .limit(1);
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
  await db
    .insert(translations)
    .values({ sourceLang: source, targetLang: target, kind, term, translation, provider })
    .onConflictDoUpdate({
      target: [translations.sourceLang, translations.targetLang, translations.kind, translations.term],
      set: { translation, provider },
    });
}
