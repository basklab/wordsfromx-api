import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth";
import { bookRoutes } from "./routes/books";
import { epubRoutes } from "./routes/epub";
import { profileRoutes } from "./routes/profile";
import { translateRoutes } from "./routes/translate";
import { vocabRoutes } from "./routes/vocab";

export const app = new Elysia()
  .get("/health", () => ({ ok: true }))
  .use(authRoutes)
  .use(bookRoutes)
  .use(epubRoutes)
  .use(translateRoutes)
  .use(profileRoutes)
  .use(vocabRoutes);

export type App = typeof app;
