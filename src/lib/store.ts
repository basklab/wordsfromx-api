import { paginateChapter } from "./paging";
import { sql } from "./db";
import type { Book, BookSummary, Chapter } from "./types";

type BookRow = {
  id: number;
  user_id: string;
  title: string;
  author: string | null;
  current_chapter: number;
  current_page: number;
  chapter_count: number;
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
      b.current_chapter,
      b.current_page,
      b.chapter_count,
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
    chapterIdx: row.current_chapter,
    pageIdx: row.current_page,
    createdAt: toIso(row.created_at),
    chapterCount: row.chapter_count,
    pageCount: row.page_count ?? 0,
  }));
}

export async function getBook(userId: string, id: string): Promise<Book | null> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return null;

  const rows = await sql<BookRow[]>`
    select id, user_id, title, author, current_chapter, current_page, chapter_count, token_count, created_at
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

  const chapters = chapterRows.map((chapter): Chapter => ({
    idx: chapter.position,
    title: chapter.title,
    pages: paginateChapter(chapter.content),
  }));

  return {
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    author: row.author,
    fileName: row.title,
    chapterIdx: row.current_chapter,
    pageIdx: row.current_page,
    createdAt: toIso(row.created_at),
    chapters,
  };
}

export async function saveBook(book: Book): Promise<Book> {
  const inserted = await sql.begin(async (tx) => {
    const bookRows = await tx<Array<{ id: number }>>`
      insert into books (
        user_id, title, author, language, target_lang, chapter_count, token_count
      )
      values (
        ${book.userId},
        ${book.title},
        ${book.author},
        'en',
        'en',
        ${book.chapters.length},
        ${book.chapters.reduce((sum, chapter) => sum + countTokens(chapter.pages.map((page) => page.text).join(" ")), 0)}
      )
      returning id
    `;
    const insertedBook = bookRows[0]!;

    for (const chapter of book.chapters) {
      const content = chapter.pages.map((page) => page.text).join("\n\n");
      await tx`
        insert into book_chapters (book_id, position, title, content, token_count)
        values (${insertedBook.id}, ${chapter.idx}, ${chapter.title}, ${content}, ${countTokens(content)})
      `;
    }

    return insertedBook;
  });

  return {
    ...book,
    id: String(inserted.id),
  };
}

export async function deleteBook(userId: string, id: string): Promise<boolean> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return false;
  const result = await sql`delete from books where id = ${bookId} and user_id = ${userId}`;
  return result.count > 0;
}

export async function updateProgress(userId: string, id: string, chapterIdx: number, pageIdx: number): Promise<Book | null> {
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) return null;
  const result = await sql`
    update books
    set current_chapter = ${chapterIdx}, current_page = ${pageIdx}, updated_at = now()
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
    chapterIdx: book.chapterIdx,
    pageIdx: book.pageIdx,
    createdAt: book.createdAt,
    chapterCount: book.chapters.length,
    pageCount: book.chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0),
  };
}

function countTokens(content: string): number {
  return content.split(/\s+/).filter(Boolean).length;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
