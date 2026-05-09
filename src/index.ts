import { app } from "./app";
import { env } from "./env";

export type { App } from "./app";

export default { port: env.port, fetch: app.fetch };
