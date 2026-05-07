import { app } from "./app";
import { env } from "./env";

export type { App } from "./app";
export default { fetch: app.fetch };

if (import.meta.main) {
  console.log("Running on Bun version:", process.versions.bun);
  app.listen(env.port);
  console.log(`api: http://127.0.0.1:${env.port}`);
}
