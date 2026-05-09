import { Elysia } from "elysia";
import { auth, userFromRequest } from "../lib/auth";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .get("/me", async ({ request, status }) => {
    const user = await userFromRequest(request);
    if (!user) return status(401, { error: "unauthorized" });
    return { user };
  })
  .all("/*", ({ request }) => auth.handler(request))
  .all("/", ({ request }) => auth.handler(request));
