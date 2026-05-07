import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { vocab } from "../db/schema";
import type { VocabRow, VocabStatus } from "./types";

type Row = typeof vocab.$inferSelect;

export async function listVocab(userId: string, sourceLang: string): Promise<VocabRow[]> {
  const rows = await db
    .select()
    .from(vocab)
    .where(and(eq(vocab.userId, userId), eq(vocab.sourceLang, sourceLang)))
    .orderBy(desc(vocab.lastSeen));
  return rows.map(mapVocab);
}

export async function trackExposure(userId: string, sourceLang: string, lemma: string): Promise<VocabRow> {
  const rows = await db
    .insert(vocab)
    .values({ userId, sourceLang, lemma, exposures: 1, status: "tracking" })
    .onConflictDoUpdate({
      target: [vocab.userId, vocab.sourceLang, vocab.lemma],
      set: {
        exposures: sql`${vocab.exposures} + 1`,
        lastSeen: sql`now()`,
      },
    })
    .returning();
  return mapVocab(rows[0]!);
}

export async function setVocabStatus(
  userId: string,
  sourceLang: string,
  lemma: string,
  status: VocabStatus,
): Promise<VocabRow> {
  const rows = await db
    .insert(vocab)
    .values({ userId, sourceLang, lemma, exposures: 0, status })
    .onConflictDoUpdate({
      target: [vocab.userId, vocab.sourceLang, vocab.lemma],
      set: { status, lastSeen: sql`now()` },
    })
    .returning();
  return mapVocab(rows[0]!);
}

function mapVocab(row: Row): VocabRow {
  return {
    userId: row.userId,
    sourceLang: row.sourceLang,
    lemma: row.lemma,
    exposures: row.exposures,
    status: row.status as VocabStatus,
    firstSeen: row.firstSeen.toISOString(),
    lastSeen: row.lastSeen.toISOString(),
  };
}
