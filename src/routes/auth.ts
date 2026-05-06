import { Elysia, t } from "elysia";
import { login, loginTestUser, logout, userFromAuthHeader } from "../lib/auth";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, status }) => {
      const result = await login(body.email, body.password);
      if (!result) return status(401, { error: "invalid email or password" });
      return result;
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )
  .post("/test-login", async () => loginTestUser())
  .get("/me", async ({ headers, status }) => {
    const user = await userFromAuthHeader(headers.authorization);
    if (!user) return status(401, { error: "unauthorized" });
    return { user };
  })
  .post("/logout", async () => {
    await logout();
    return { ok: true };
  });
