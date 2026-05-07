import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { translations, vocab } from "../db/schema";
import { translateMyMemory } from "./mymemory";
import { saveCachedTranslation } from "./translations";
import type { AnnotatedToken, VocabStatus } from "./types";

const WORD_RE = /^\p{L}[\p{L}\p{M}'’-]*$/u;
const SPLIT_RE = /(\s+|[.,!?;:"“”‘’()\[\]—–-])/u;
const TRANSLATE_CONCURRENCY = 6;

export function tokenize(text: string): Array<{ kind: "word" | "raw"; text: string }> {
  return text
    .split(SPLIT_RE)
    .filter((part) => part.length > 0)
    .map((part) => ({ kind: WORD_RE.test(part) ? "word" : "raw", text: part }));
}

export function lemmaOf(word: string): string {
  return word.toLocaleLowerCase();
}

export async function annotatePage(
  userId: string,
  source: string,
  target: string,
  text: string,
): Promise<AnnotatedToken[]> {
  const tokens = tokenize(text);
  const lemmas = new Set<string>();
  for (const tok of tokens) {
    if (tok.kind === "word") lemmas.add(lemmaOf(tok.text));
  }

  const statuses = await loadVocabStatuses(userId, source, [...lemmas]);
  const unknown = [...lemmas].filter((l) => !statuses.has(l));
  const translationsByLemma = await loadTranslations(source, target, unknown);

  return tokens.map((tok): AnnotatedToken => {
    if (tok.kind === "raw") return tok.text;
    const lemma = lemmaOf(tok.text);
    const status = statuses.get(lemma);
    const translation = status ? undefined : translationsByLemma.get(lemma);
    return {
      w: tok.text,
      lemma,
      ...(status ? { status } : {}),
      ...(translation ? { t: translation } : {}),
    };
  });
}

async function loadVocabStatuses(
  userId: string,
  source: string,
  lemmas: string[],
): Promise<Map<string, VocabStatus>> {
  if (!lemmas.length) return new Map();
  const rows = await db
    .select({ lemma: vocab.lemma, status: vocab.status })
    .from(vocab)
    .where(and(eq(vocab.userId, userId), eq(vocab.sourceLang, source), inArray(vocab.lemma, lemmas)));
  return new Map(rows.map((r) => [r.lemma, r.status as VocabStatus]));
}

async function loadTranslations(
  source: string,
  target: string,
  lemmas: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!lemmas.length) return out;

  const cached = await db
    .select({ term: translations.term, translation: translations.translation })
    .from(translations)
    .where(
      and(
        eq(translations.sourceLang, source),
        eq(translations.targetLang, target),
        eq(translations.kind, "word"),
        inArray(translations.term, lemmas),
      ),
    );
  for (const row of cached) out.set(row.term, row.translation);

  const missing = lemmas.filter((l) => !out.has(l));
  if (!missing.length) return out;

  for (let i = 0; i < missing.length; i += TRANSLATE_CONCURRENCY) {
    const batch = missing.slice(i, i + TRANSLATE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (lemma) => {
        const translation = await translateMyMemory(lemma, source, target);
        await saveCachedTranslation(source, target, "word", lemma, translation);
        return [lemma, translation] as const;
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") out.set(r.value[0], r.value[1]);
    }
  }
  return out;
}
