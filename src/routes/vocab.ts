import { Elysia, t } from "elysia";
import { userFromRequest } from "../lib/auth";
import { listVocab, setVocabStatus, trackExposure } from "../lib/vocab";

export const vocabRoutes = new Elysia({ prefix: "/vocab" })
  .get("/", async ({ query, request, status }) => {
    const user = await userFromRequest(request);
    if (!user) return status(401, { error: "unauthorized" });
    return listVocab(user.id, query.sourceLang);
  }, {
    query: t.Object({
      sourceLang: t.String({ minLength: 2, maxLength: 5 }),
    }),
  })
  .post(
    "/exposure",
    async ({ body, request, status }) => {
      const user = await userFromRequest(request);
      if (!user) return status(401, { error: "unauthorized" });
      return trackExposure(user.id, body.sourceLang, body.lemma);
    },
    {
      body: t.Object({
        sourceLang: t.String({ minLength: 2, maxLength: 5 }),
        lemma: t.String({ minLength: 1, maxLength: 200 }),
      }),
    },
  )
  .patch(
    "/:lemma/status",
    async ({ params, body, request, status }) => {
      const user = await userFromRequest(request);
      if (!user) return status(401, { error: "unauthorized" });
      return setVocabStatus(user.id, body.sourceLang, params.lemma, body.status);
    },
    {
      body: t.Object({
        sourceLang: t.String({ minLength: 2, maxLength: 5 }),
        status: t.Union([t.Literal("tracking"), t.Literal("known"), t.Literal("ignored")]),
      }),
    },
  );
