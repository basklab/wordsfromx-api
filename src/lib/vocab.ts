import { sql } from "./db";
import type { VocabRow, VocabStatus } from "./types";

type VocabDbRow = {
  user_id: string;
  source_lang: string;
  lemma: string;
  exposures: number;
  status: VocabStatus;
  first_seen: Date | string;
  last_seen: Date | string;
};

export async function listVocab(userId: string, sourceLang: string): Promise<VocabRow[]> {
  const rows = await sql<VocabDbRow[]>`
    select user_id, source_lang, lemma, exposures, status, first_seen, last_seen
    from vocab
    where user_id = ${userId} and source_lang = ${sourceLang}
    order by last_seen desc
  `;
  return rows.map(mapVocab);
}

export async function trackExposure(userId: string, sourceLang: string, lemma: string): Promise<VocabRow> {
  const rows = await sql<VocabDbRow[]>`
    insert into vocab (user_id, source_lang, lemma, exposures, status, first_seen, last_seen)
    values (${userId}, ${sourceLang}, ${lemma}, 1, 'tracking', now(), now())
    on conflict (user_id, source_lang, lemma) do update set
      exposures = vocab.exposures + 1,
      last_seen = now()
    returning user_id, source_lang, lemma, exposures, status, first_seen, last_seen
  `;
  return mapVocab(rows[0]!);
}

export async function setVocabStatus(
  userId: string,
  sourceLang: string,
  lemma: string,
  status: VocabStatus,
): Promise<VocabRow> {
  const rows = await sql<VocabDbRow[]>`
    insert into vocab (user_id, source_lang, lemma, exposures, status, first_seen, last_seen)
    values (${userId}, ${sourceLang}, ${lemma}, 0, ${status}, now(), now())
    on conflict (user_id, source_lang, lemma) do update set
      status = excluded.status,
      last_seen = now()
    returning user_id, source_lang, lemma, exposures, status, first_seen, last_seen
  `;
  return mapVocab(rows[0]!);
}

function mapVocab(row: VocabDbRow): VocabRow {
  return {
    userId: row.user_id,
    sourceLang: row.source_lang,
    lemma: row.lemma,
    exposures: row.exposures,
    status: row.status,
    firstSeen: toIso(row.first_seen),
    lastSeen: toIso(row.last_seen),
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
