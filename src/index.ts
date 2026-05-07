import { env } from "./env";
import { app } from "./app";
import { ensureSchema } from "./lib/db";

async function main(): Promise<void> {
  await ensureSchema();

  console.log("Running on Bun version:", process.versions.bun);
  app.listen(env.port);
  console.log(`api: http://127.0.0.1:${env.port}`);
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
