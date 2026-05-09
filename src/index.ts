import { app } from "./app";
import { env } from "./env";

export type { App } from "./app";

if (import.meta.main) {
  console.log("Running on Bun version:", process.versions.bun);
  console.log(`api: http://127.0.0.1:${env.port}`);
}

export default { port: env.port, fetch: app.fetch };
