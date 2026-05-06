import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "./env";
import { ensureSchema } from "./lib/db";
import { authRoutes } from "./routes/auth";
import { bookRoutes } from "./routes/books";
import { epubRoutes } from "./routes/epub";
import { translateRoutes } from "./routes/translate";

await ensureSchema();

export const app = new Elysia()
  .use(cors({ origin: env.webOrigin, credentials: true }))
  .get("/health", () => ({ ok: true }))
  .use(authRoutes)
  .use(bookRoutes)
  .use(epubRoutes)
  .use(translateRoutes);

export type App = typeof app;

app.listen(env.port);
console.log(`api: http://127.0.0.1:${env.port}`);
