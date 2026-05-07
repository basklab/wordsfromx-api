import { env } from "./env";
import { app } from "./app";
import { ensureSchema } from "./lib/db";

await ensureSchema();

app.listen(env.port);
console.log(`api: http://127.0.0.1:${env.port}`);
