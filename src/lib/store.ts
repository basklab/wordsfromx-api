import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { bookChapters, books } from "../db/schema";
import { paginateBook } from "./paging";
import type { Book, BookSummary } from "./types";

export async function listBooks(userId: string): Promise<BookSummary[]> {
  const rows = await db
    .select({
      id: books.id,
      userId: books.userId,
      title: books.title,
      author: books.author,
      currentPage: books.currentPage,
      tokenCount: books.tokenCount,
      createdAt: books.createdAt,
      pageCount: sql<number>`coalesce(sum(greatest(1, ceil(length(${bookChapters.content})::numeric / 1600))), 0)::int`,
    })
    .from(books)
    .leftJoin(bookChapters, eq(bookChapters.bookId, books.id))
    .where(eq(books.userId, userId))
    .groupBy(books.id)
    .orderBy(desc(books.createdAt));

  return rows.map((row) => ({
    id: String(row.id),
    userId: row.userId,
    title: row.title,
    author: row.author,
    fileName: row.title,
    pageIdx: row.currentPage,
    createdAt: row.createdAt.toISOString(),
    pageCount: row.pageCount ?? 0,
  }));
}

export async function getBook(userId: string, id: string): Promise<Book | null> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return null;

  const bookRows = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  const row = bookRows[0];
  if (!row) return null;

  const chapterRows = await db
    .select({ position: bookChapters.position, title: bookChapters.title, content: bookChapters.content })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.position));

  const pages = paginateBook(
    chapterRows.map((c) => ({ idx: c.position, title: c.title, content: c.content })),
  );

  return {
    id: String(row.id),
    userId: row.userId,
    title: row.title,
    author: row.author,
    fileName: row.title,
    pageIdx: row.currentPage,
    createdAt: row.createdAt.toISOString(),
    pages,
  };
}

export type RawChapter = { idx: number; title: string; content: string };

export async function saveBook(
  meta: { userId: string; title: string; author: string | null; fileName: string },
  chapters: RawChapter[],
): Promise<string> {
  const totalTokens = chapters.reduce((s, c) => s + countTokens(c.content), 0);
  const inserted = await db
    .insert(books)
    .values({
      userId: meta.userId,
      title: meta.title,
      author: meta.author,
      language: "en",
      targetLang: "en",
      chapterCount: chapters.length,
      tokenCount: totalTokens,
    })
    .returning({ id: books.id });
  const bookId = inserted[0]!.id;

  if (chapters.length) {
    await db.insert(bookChapters).values(
      chapters.map((c) => ({
        bookId,
        position: c.idx,
        title: c.title,
        content: c.content,
        tokenCount: countTokens(c.content),
      })),
    );
  }

  return String(bookId);
}

export async function deleteBook(userId: string, id: string): Promise<boolean> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return false;
  const result = await db
    .delete(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .returning({ id: books.id });
  return result.length > 0;
}

export async function updateProgress(userId: string, id: string, pageIdx: number): Promise<Book | null> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return null;
  const result = await db
    .update(books)
    .set({ currentPage: pageIdx, updatedAt: new Date() })
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .returning({ id: books.id });
  if (!result.length) return null;
  return getBook(userId, id);
}

export function summaryOf(book: Book): BookSummary {
  return {
    id: book.id,
    userId: book.userId,
    title: book.title,
    author: book.author,
    fileName: book.fileName,
    pageIdx: book.pageIdx,
    createdAt: book.createdAt,
    pageCount: book.pages.length,
  };
}

function countTokens(content: string): number {
  return content.split(/\s+/).filter(Boolean).length;
}
