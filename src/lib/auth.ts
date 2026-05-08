import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../env";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

export const AUTH_COOKIE_NAME = "wordsfromx_auth";

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

export async function userFromCookieHeader(cookie: string | null | undefined): Promise<AuthUser | null> {
  return userFromToken(readCookie(cookie, AUTH_COOKIE_NAME));
}

export async function userFromToken(token: string | null | undefined): Promise<AuthUser | null> {
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

export function authCookie(token: string, requestUrl: string): string {
  const secure = requestUrl.startsWith("https://");
  const sameSite = secure ? "None" : "Lax";
  return [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=900",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearAuthCookie(requestUrl: string): string {
  const secure = requestUrl.startsWith("https://");
  const sameSite = secure ? "None" : "Lax";
  return [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=0",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name) continue;
    const value = rawValue.join("=");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}
