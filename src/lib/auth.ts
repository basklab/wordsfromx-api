import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";
import { env } from "../env";

if (!env.betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is required.");
}

export const auth = betterAuth({
  baseURL: env.betterAuthBaseUrl ?? `http://127.0.0.1:${env.port}`,
  basePath: "/auth",
  secret: env.betterAuthSecret,
  trustedOrigins: env.webOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
});

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

export async function userFromHeaders(headers: Headers): Promise<AuthUser | null> {
  const result = await auth.api.getSession({ headers });
  const u = result?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? u.email,
    image: u.image ?? null,
  };
}

export async function userFromRequest(request: Request): Promise<AuthUser | null> {
  return userFromHeaders(request.headers);
}
