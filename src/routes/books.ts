import { Elysia, t } from "elysia";
import { parseEpub } from "../lib/epub";
import { withPages } from "../lib/paging";
import { parseTextBook } from "../lib/text";
import { deleteBook, getBook, listBooks, saveBook, summaryOf, updateProgress } from "../lib/store";
import { userFromAuthHeader } from "../lib/auth";
import type { Book } from "../lib/types";

export const bookRoutes = new Elysia({ prefix: "/books" })
  .get("/", async ({ headers, status }) => {
    const user = await userFromAuthHeader(headers.authorization);
    if (!user) return status(401, { error: "unauthorized" });
    return listBooks(user.id);
  })
  .get("/:id", async ({ headers, params, status }) => {
    const user = await userFromAuthHeader(headers.authorization);
    if (!user) return status(401, { error: "unauthorized" });
    const book = await getBook(user.id, params.id);
    if (!book) return status(404, { error: "book not found" });
    return book;
  })
  .post(
    "/upload",
    async ({ body, headers, status }) => {
      const user = await userFromAuthHeader(headers.authorization);
      if (!user) return status(401, { error: "unauthorized" });
      const file = body.file;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = isEpub(file) ? await parseEpub(bytes) : await parseTextBook(file.name, bytes);

      const book: Book = {
        id: "0",
        userId: user.id,
        title: parsed.title,
        author: parsed.author,
        fileName: file.name,
        chapterIdx: 0,
        pageIdx: 0,
        createdAt: new Date().toISOString(),
        chapters: withPages(parsed.chapters),
      };

      if (!book.chapters.length) return status(422, { error: "book has no readable chapters" });
      const saved = await saveBook(book);
      return summaryOf(saved);
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    },
  )
  .patch(
    "/:id/progress",
    async ({ params, body, headers, status }) => {
      const user = await userFromAuthHeader(headers.authorization);
      if (!user) return status(401, { error: "unauthorized" });
      const book = await getBook(user.id, params.id);
      if (!book) return status(404, { error: "book not found" });

      const chapter = book.chapters[body.chapterIdx];
      if (!chapter || !chapter.pages[body.pageIdx]) {
        return status(422, { error: "invalid reading position" });
      }

      const updated = await updateProgress(user.id, params.id, body.chapterIdx, body.pageIdx);
      return updated ? summaryOf(updated) : status(404, { error: "book not found" });
    },
    {
      body: t.Object({
        chapterIdx: t.Number({ minimum: 0 }),
        pageIdx: t.Number({ minimum: 0 }),
      }),
    },
  )
  .delete("/:id", async ({ headers, params, status }) => {
    const user = await userFromAuthHeader(headers.authorization);
    if (!user) return status(401, { error: "unauthorized" });
    const deleted = await deleteBook(user.id, params.id);
    return deleted ? { ok: true } : status(404, { error: "book not found" });
  });

function isEpub(file: File): boolean {
  return file.name.toLowerCase().endsWith(".epub") || file.type === "application/epub+zip";
}
