import { paginateBook } from "./paging";
import { sql } from "./db";
import type { Book, BookSummary } from "./types";

type BookRow = {
  id: number;
  user_id: string;
  title: string;
  author: string | null;
  current_page: number;
  token_count: number;
  page_count?: number;
  created_at: Date | string;
};

type ChapterRow = {
  position: number;
  title: string;
  content: string;
};

export async function listBooks(userId: string): Promise<BookSummary[]> {
  const rows = await sql<BookRow[]>`
    select
      b.id,
      b.user_id,
      b.title,
      b.author,
      b.current_page,
      b.token_count,
      b.created_at,
      coalesce(sum(greatest(1, ceil(length(c.content)::numeric / 1600))), 0)::int as page_count
    from books b
    left join book_chapters c on c.book_id = b.id
    where b.user_id = ${userId}
    group by b.id
    order by b.created_at desc
  `;

  return rows.map((row) => ({
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    author: row.author,
    fileName: row.title,
    pageIdx: row.current_page,
    createdAt: toIso(row.created_at),
    pageCount: row.page_count ?? 0,
  }));
}

export async function getBook(userId: string, id: string): Promise<Book | null> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return null;

  const rows = await sql<BookRow[]>`
    select id, user_id, title, author, current_page, token_count, created_at
    from books
    where id = ${bookId} and user_id = ${userId}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;

  const chapterRows = await sql<ChapterRow[]>`
    select position, title, content
    from book_chapters
    where book_id = ${bookId}
    order by position
  `;

  const pages = paginateBook(
    chapterRows.map((c) => ({ idx: c.position, title: c.title, content: c.content })),
  );

  return {
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    author: row.author,
    fileName: row.title,
    pageIdx: row.current_page,
    createdAt: toIso(row.created_at),
    pages,
  };
}

export type RawChapter = { idx: number; title: string; content: string };

export async function saveBook(
  meta: { userId: string; title: string; author: string | null; fileName: string },
  chapters: RawChapter[],
): Promise<string> {
  const inserted = await sql.begin(async (tx) => {
    const bookRows = await tx<Array<{ id: number }>>`
      insert into books (
        user_id, title, author, language, target_lang, chapter_count, token_count
      )
      values (
        ${meta.userId},
        ${meta.title},
        ${meta.author},
        'en',
        'en',
        ${chapters.length},
        ${chapters.reduce((sum, c) => sum + countTokens(c.content), 0)}
      )
      returning id
    `;
    const insertedBook = bookRows[0]!;

    for (const chapter of chapters) {
      await tx`
        insert into book_chapters (book_id, position, title, content, token_count)
        values (${insertedBook.id}, ${chapter.idx}, ${chapter.title}, ${chapter.content}, ${countTokens(chapter.content)})
      `;
    }

    return insertedBook;
  });

  return String(inserted.id);
}

export async function deleteBook(userId: string, id: string): Promise<boolean> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return false;
  const result = await sql`delete from books where id = ${bookId} and user_id = ${userId}`;
  return result.count > 0;
}

export async function updateProgress(userId: string, id: string, pageIdx: number): Promise<Book | null> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return null;
  const result = await sql`
    update books
    set current_page = ${pageIdx}, updated_at = now()
    where id = ${bookId} and user_id = ${userId}
  `;
  if (result.count === 0) return null;
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

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
