import { Elysia, t } from "elysia";
import { userFromAuthHeader } from "../lib/auth";
import { getProfile, updateProfile } from "../lib/profile";

export const profileRoutes = new Elysia({ prefix: "/profile" })
  .get("/", async ({ headers, status }) => {
    const user = await userFromAuthHeader(headers.authorization);
    if (!user) return status(401, { error: "unauthorized" });
    return getProfile(user.id);
  })
  .patch(
    "/",
    async ({ body, headers, status }) => {
      const user = await userFromAuthHeader(headers.authorization);
      if (!user) return status(401, { error: "unauthorized" });
      return updateProfile(user.id, body);
    },
    {
      body: t.Object({
        sourceLang: t.Optional(t.String({ minLength: 2, maxLength: 5 })),
        targetLang: t.Optional(t.String({ minLength: 2, maxLength: 5 })),
      }),
    },
  );
