import type { Bindings } from "./types.ts";
import { nowIso } from "./time.ts";

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE = "dream_session";

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  if (aa.byteLength !== bb.byteLength) {
    const dummy = new Uint8Array(aa.byteLength);
    crypto.subtle.digest("SHA-256", dummy);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aa.byteLength; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("x-api-token");
  if (!h) return null;
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return h.trim();
}

export async function isApiToken(req: Request, env: Bindings): Promise<boolean> {
  const token = bearerToken(req);
  if (!token || !env.DREAM_API_TOKEN) return false;
  return timingSafeEqual(token, env.DREAM_API_TOKEN);
}

export async function sessionToken(req: Request, env: Bindings): Promise<string | null> {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT token FROM sessions WHERE token = ? AND expires_at > ?",
  )
    .bind(token, nowIso())
    .first<{ token: string }>();
  return row?.token ?? null;
}

export async function requireAuth(
  req: Request,
  env: Bindings,
): Promise<{ ok: true; via: "token" | "cookie" } | { ok: false; res: Response }> {
  if (await isApiToken(req, env)) return { ok: true, via: "token" };
  if (await sessionToken(req, env)) return { ok: true, via: "cookie" };
  return {
    ok: false,
    res: json({ error: "unauthorized" }, 401),
  };
}

export async function login(env: Bindings, passcode: string, req?: Request): Promise<Response> {
  if (!env.DREAM_PASSCODE || !(await timingSafeEqual(passcode, env.DREAM_PASSCODE))) {
    return json({ error: "bad passcode" }, 401);
  }
  const token = crypto.randomUUID() + crypto.randomUUID();
  const created = nowIso();
  const expires = new Date(Date.now() + SESSION_MS).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)",
  )
    .bind(token, created, expires)
    .run();
  const secure = req ? new URL(req.url).protocol === "https:" : false;
  const cookie = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": cookie,
    },
  });
}

export async function logout(req: Request, env: Bindings): Promise<Response> {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[COOKIE];
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
}

export function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...extra,
    },
  });
}

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type, authorization, x-api-token",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  };
}
