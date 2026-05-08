import { Elysia, t } from "elysia";
import { parseEpub } from "../lib/epub";
import { parseTextBook } from "../lib/text";
import { deleteBook, getBook, listBooks, saveBook, summaryOf, updateProgress } from "../lib/store";
import { userFromCookieHeader } from "../lib/auth";
import { annotatePage } from "../lib/annotate";
import { getProfile } from "../lib/profile";

const MAX_BOOK_BYTES = 30 * 1024 * 1024;

export const bookRoutes = new Elysia({ prefix: "/books" })
  .get("/", async ({ headers, status }) => {
    const user = await userFromCookieHeader(headers.cookie);
    if (!user) return status(401, { error: "unauthorized" });
    return listBooks(user.id);
  })
  .get("/:id", async ({ headers, params, status }) => {
    const user = await userFromCookieHeader(headers.cookie);
    if (!user) return status(401, { error: "unauthorized" });
    const book = await getBook(user.id, params.id);
    if (!book) return status(404, { error: "book not found" });
    return book;
  })
  .post(
    "/upload",
    async ({ body, headers, status }) => {
      const user = await userFromCookieHeader(headers.cookie);
      if (!user) return status(401, { error: "unauthorized" });
      const file = body.file;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = isEpub(file) ? await parseEpub(bytes) : await parseTextBook(file.name, bytes);

      if (!parsed.chapters.length) return status(422, { error: "book has no readable chapters" });

      const id = await saveBook(
        { userId: user.id, title: parsed.title, author: parsed.author, fileName: file.name },
        parsed.chapters,
      );
      const saved = await getBook(user.id, id);
      if (!saved) return status(500, { error: "failed to load saved book" });
      return summaryOf(saved);
    },
    {
      body: t.Object({
        file: t.File({ maxSize: MAX_BOOK_BYTES }),
      }),
    },
  )
  .patch(
    "/:id/progress",
    async ({ params, body, headers, status }) => {
      const user = await userFromCookieHeader(headers.cookie);
      if (!user) return status(401, { error: "unauthorized" });
      const book = await getBook(user.id, params.id);
      if (!book) return status(404, { error: "book not found" });

      if (!book.pages[body.pageIdx]) {
        return status(422, { error: "invalid reading position" });
      }

      const updated = await updateProgress(user.id, params.id, body.pageIdx);
      return updated ? summaryOf(updated) : status(404, { error: "book not found" });
    },
    {
      body: t.Object({
        pageIdx: t.Number({ minimum: 0 }),
      }),
    },
  )
  .get("/:id/pages/:n/annotation", async ({ headers, params, status }) => {
    const user = await userFromCookieHeader(headers.cookie);
    if (!user) return status(401, { error: "unauthorized" });
    const book = await getBook(user.id, params.id);
    if (!book) return status(404, { error: "book not found" });
    const idx = Number(params.n) - 1;
    const page = book.pages[idx];
    if (!page) return status(404, { error: "page not found" });
    const profile = await getProfile(user.id);
    const tokens = await annotatePage(user.id, profile.sourceLang, profile.targetLang, page.text);
    return { tokens, chapterTitle: page.chapterTitle ?? null };
  })
  .delete("/:id", async ({ headers, params, status }) => {
    const user = await userFromCookieHeader(headers.cookie);
    if (!user) return status(401, { error: "unauthorized" });
    const deleted = await deleteBook(user.id, params.id);
    return deleted ? { ok: true } : status(404, { error: "book not found" });
  });

function isEpub(file: File): boolean {
  return file.name.toLowerCase().endsWith(".epub") || file.type === "application/epub+zip";
}
