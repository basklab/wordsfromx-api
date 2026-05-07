import { Elysia } from "elysia";
import { userFromAuthHeader } from "../lib/auth";

export const authRoutes = new Elysia({ prefix: "/auth" }).get("/me", async ({ headers, status }) => {
  const user = await userFromAuthHeader(headers.authorization);
  if (!user) return status(401, { error: "unauthorized" });
  return { user };
});
