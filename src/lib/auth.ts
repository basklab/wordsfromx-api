import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../env";

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
      audience: env.neonAuthAudience,
    });
    if (!payload.sub) return null;

    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) return null;

    return {
      id: payload.sub,
      email,
      name: typeof payload.name === "string" && payload.name ? payload.name : email,
      image: typeof payload.image === "string" ? payload.image : null,
    };
  } catch {
    return null;
  }
}
