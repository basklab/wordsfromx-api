import { Elysia, t } from "elysia";
import { env } from "../env";
import { authCookie, clearAuthCookie, userFromCookieHeader, userFromToken } from "../lib/auth";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/cookie",
    async ({ body, request, set, status }) => {
      const user = await userFromToken(body.token);
      if (!user) return status(401, { error: "unauthorized" });
      set.headers["Set-Cookie"] = authCookie(body.token, request.url);
      return { user };
    },
    {
      body: t.Object({
        token: t.String({ minLength: 1 }),
      }),
    },
  )
  .delete("/cookie", ({ request, set }) => {
    set.headers["Set-Cookie"] = clearAuthCookie(request.url);
    return { ok: true };
  })
  .get("/me", async ({ headers, status }) => {
    const user = await userFromCookieHeader(headers.cookie);
    if (!user) return status(401, { error: "unauthorized" });
    return { user };
  })
  .all("/*", ({ request }) => proxyBetterAuth(request));

async function proxyBetterAuth(request: Request): Promise<Response> {
  if (!env.neonAuthBaseUrl) {
    return Response.json({ error: "NEON_AUTH_BASE_URL is required." }, { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const upstreamPath = incomingUrl.pathname.replace(/^\/auth/, "") || "/";
  const upstreamUrl = new URL(`${env.neonAuthBaseUrl}${upstreamPath}${incomingUrl.search}`);
  const headers = new Headers(request.headers);

  headers.set("host", upstreamUrl.host);
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(upstreamUrl, init);
  const responseHeaders = rewriteBetterAuthResponseHeaders(upstream.headers, incomingUrl);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function rewriteBetterAuthResponseHeaders(headers: Headers, incomingUrl: URL): Headers {
  const rewritten = new Headers(headers);
  const location = rewritten.get("location");

  if (location && env.neonAuthBaseUrl) {
    const upstreamBase = new URL(env.neonAuthBaseUrl);
    const redirectUrl = new URL(location, upstreamBase);
    if (redirectUrl.origin === upstreamBase.origin && redirectUrl.pathname.startsWith(upstreamBase.pathname)) {
      const localPath = `/auth${redirectUrl.pathname.slice(upstreamBase.pathname.length)}${redirectUrl.search}`;
      rewritten.set("location", localPath);
    }
  }

  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = getSetCookie ? getSetCookie.call(headers) : [];
  if (!setCookies.length) return rewritten;

  rewritten.delete("set-cookie");
  for (const cookie of setCookies) {
    rewritten.append("set-cookie", rewriteSetCookie(cookie, incomingUrl));
  }
  return rewritten;
}

function rewriteSetCookie(cookie: string, incomingUrl: URL): string {
  const secure = incomingUrl.protocol === "https:";
  const parts = cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !/^domain=/i.test(part));

  if (!secure) {
    const withoutSecure = parts.filter((part) => !/^secure$/i.test(part));
    return withoutSecure.map((part) => (/^samesite=/i.test(part) ? "SameSite=Lax" : part)).join("; ");
  }

  return parts.join("; ");
}
