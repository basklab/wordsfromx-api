import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { env } from "../env";
import { db } from "../db";
import { neonAuthUser } from "../db/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function jwks() {
  if (!env.neonAuthBaseUrl) {
    throw new Error("NEON_AUTH_BASE_URL is required to verify Neon Auth tokens.");
  }
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${env.neonAuthBaseUrl}/jwks`));
  }
  return jwksCache;
}

export async function userFromAuthHeader(authorization: string | null | undefined): Promise<AuthUser | null> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwks(), {
      issuer: env.neonAuthBaseUrl,
    });
    if (!payload.sub) return null;
    return userById(payload.sub);
  } catch {
    return null;
  }
}

async function userById(id: string): Promise<AuthUser | null> {
  const rows = await db
    .select({ id: neonAuthUser.id, email: neonAuthUser.email, name: neonAuthUser.name, image: neonAuthUser.image })
    .from(neonAuthUser)
    .where(eq(neonAuthUser.id, id))
    .limit(1);
  const row = rows[0];
  if (!row?.email) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? row.email,
    image: row.image,
  };
}
