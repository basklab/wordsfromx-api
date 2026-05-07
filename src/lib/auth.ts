import { TEST_USER } from "./db";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser } | null> {
  if (email.toLowerCase() !== TEST_USER.email || password !== TEST_USER.password) return null;
  return loginTestUser();
}

export async function loginTestUser(): Promise<{ token: string; user: AuthUser }> {
  const user: AuthUser = { id: TEST_USER.id, email: TEST_USER.email, name: TEST_USER.name };
  return { token: `mock-token.${user.id}`, user };
}

export async function userFromAuthHeader(authorization: string | null | undefined): Promise<AuthUser | null> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !token.startsWith("mock-token.")) return null;
  return { id: TEST_USER.id, email: TEST_USER.email, name: TEST_USER.name };
}

export async function logout(): Promise<void> {
  return;
}
