import { Elysia, t } from "elysia";
import { userFromCookieHeader } from "../lib/auth";
import { translateMyMemory } from "../lib/mymemory";
import { getCachedTranslation, saveCachedTranslation } from "../lib/translations";

export const translateRoutes = new Elysia({ prefix: "/translate" }).post(
  "/",
  async ({ body, headers, status }) => {
    const user = await userFromCookieHeader(headers.cookie);
    if (!user) return status(401, { error: "unauthorized" });

    const term = body.term.trim();
    if (!term) return status(400, { error: "empty term" });

    const source = body.source.toLowerCase();
    const target = body.target.toLowerCase();
    const kind = body.kind;

    const cached = await getCachedTranslation(source, target, kind, term);
    if (cached) return { term, translation: cached, cached: true as const };

    const translation = await translateMyMemory(term, source, target);
    await saveCachedTranslation(source, target, kind, term, translation);

    return { term, translation, cached: false as const };
  },
  {
    body: t.Object({
      term: t.String({ minLength: 1, maxLength: 500 }),
      source: t.String({ minLength: 2, maxLength: 5 }),
      target: t.String({ minLength: 2, maxLength: 5 }),
      kind: t.Union([t.Literal("word"), t.Literal("sentence")]),
    }),
  },
);
