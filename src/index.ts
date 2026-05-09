import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "./env";
import { authRoutes } from "./routes/auth";
import { bookRoutes } from "./routes/books";
import { epubRoutes } from "./routes/epub";
import { profileRoutes } from "./routes/profile";
import { translateRoutes } from "./routes/translate";
import { vocabRoutes } from "./routes/vocab";

export const app = new Elysia()
  .use(cors({ origin: env.webOrigins, credentials: true }))
  .onBeforeHandle(({ request, status }) => {
    const origin = request.headers.get("origin");
    if (origin && !env.webOrigins.includes(origin)) {
      return status(403, { error: "forbidden" });
    }
  })
  .get("/health", () => ({ ok: true }))
  .use(authRoutes)
  .use(bookRoutes)
  .use(epubRoutes)
  .use(translateRoutes)
  .use(profileRoutes)
  .use(vocabRoutes);

export type App = typeof app;

export default app;
