import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";
import { sql, TEST_USER } from "./db";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type UserRow = {
  id: string;
  email: string | null;
  raw_user_meta_data: { name?: string } | null;
};

const issuer = `${env.supabaseUrl}/auth/v1`;

function jwtSecret(): Uint8Array {
  if (!env.supabaseJwtSecret) throw new Error("SUPABASE_JWT_SECRET is required for local test auth.");
  return new TextEncoder().encode(env.supabaseJwtSecret);
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser } | null> {
  if (email.toLowerCase() !== TEST_USER.email || password !== TEST_USER.password) return null;
  return loginTestUser();
}

export async function loginTestUser(): Promise<{ token: string; user: AuthUser }> {
  const user = await authUserById(TEST_USER.id);
  if (!user) throw new Error("test user was not seeded in auth.users");
  const token = await new SignJWT({
    email: user.email,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: user.name },
    role: "authenticated",
    aal: "aal1",
    session_id: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(issuer)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecret());

  return { token, user };
}

export async function userFromAuthHeader(authorization: string | null | undefined): Promise<AuthUser | null> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      audience: "authenticated",
    });
    if (payload.iss && payload.iss !== issuer) return null;
    if (!payload.sub) return null;
    return authUserById(payload.sub);
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  return;
}

async function authUserById(id: string): Promise<AuthUser | null> {
  const rows = await sql<UserRow[]>`
    select id, email, raw_user_meta_data
    from auth.users
    where id = ${id}
    limit 1
  `;
  const row = rows[0];
  if (!row?.email) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.raw_user_meta_data?.name ?? row.email,
  };
}
