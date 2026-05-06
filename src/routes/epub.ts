import { Elysia, t } from "elysia";
import { userFromAuthHeader } from "../lib/auth";
import { parseEpub } from "../lib/epub";

export const epubRoutes = new Elysia({ prefix: "/epub" }).post(
  "/parse",
  async ({ body, headers, status }) => {
    const user = await userFromAuthHeader(headers.authorization);
    if (!user) return status(401, { error: "unauthorized" });

    const bytes = new Uint8Array(await body.file.arrayBuffer());
    return parseEpub(bytes);
  },
  {
    body: t.Object({
      file: t.File({ type: ["application/epub+zip", "application/zip", "application/octet-stream"] }),
    }),
  },
);
