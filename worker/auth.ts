import type { Bindings } from "./types.ts";
import { accessUser } from "./access.ts";


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

export async function requireAuth(
  req: Request,
  env: Bindings,
): Promise<{ ok: true; via: "token" | "access" } | { ok: false; res: Response }> {
  if (await isApiToken(req, env)) return { ok: true, via: "token" };
  const access = await accessUser(req, env);
  if (access.ok) return { ok: true, via: "access" };
  return {
    ok: false,
    res: json({ error: "unauthorized", access: access.reason }, 401),
  };
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
