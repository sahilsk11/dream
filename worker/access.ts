// Cloudflare Access JWT verification. The Worker is only reachable through
// Access (workers.dev is off), but we still verify the signed
// Cf-Access-Jwt-Assertion so a browser is admitted only as the allowed email.
// Service-token JWTs carry no email, so agents still need the bearer token.
import type { Bindings } from "./types.ts";

type Jwk = JsonWebKey & { kid?: string };
type Claims = {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
  email?: string;
  common_name?: string;
};

export type AccessResult =
  | { ok: true; email: string }
  | { ok: false; reason: "no_jwt" | "bad_jwt" | "not_allowed" | "not_configured" };

let cache: { at: number; team: string; keys: Jwk[] } | null = null;
const CACHE_MS = 60 * 60 * 1000;

function b64urlBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlJson<T>(s: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s))) as T;
}

export type KeyFetcher = (team: string) => Promise<Jwk[]>;

const fetchKeys: KeyFetcher = async (team) => {
  if (cache && cache.team === team && Date.now() - cache.at < CACHE_MS) return cache.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  cache = { at: Date.now(), team, keys: body.keys };
  return body.keys;
};

export async function verifyAccessJwt(
  token: string,
  opts: { team: string; aud: string; now?: number; keys?: KeyFetcher },
): Promise<Claims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header: { alg?: string; kid?: string };
  let claims: Claims;
  try {
    header = b64urlJson(parts[0]);
    claims = b64urlJson(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;
  const keys = await (opts.keys ?? fetchKeys)(opts.team);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!ok) return null;
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (typeof claims.exp !== "number" || claims.exp < now - 30) return null;
  if (typeof claims.nbf === "number" && claims.nbf > now + 30) return null;
  if (claims.iss !== `https://${opts.team}`) return null;
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!auds.includes(opts.aud)) return null;
  return claims;
}

export async function accessUser(
  req: Request,
  env: Bindings,
  keys?: KeyFetcher,
): Promise<AccessResult> {
  // Local `wrangler dev` has no Access in front. DEV_LOCAL_EMAIL lives only in
  // .dev.vars and only counts on localhost; production never sets it.
  const host = new URL(req.url).hostname;
  if (env.DEV_LOCAL_EMAIL && (host === "127.0.0.1" || host === "localhost")) {
    return { ok: true, email: env.DEV_LOCAL_EMAIL };
  }
  const team = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  const allowed = (env.ACCESS_ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!team || !aud || allowed.length === 0) return { ok: false, reason: "not_configured" };
  const token = req.headers.get("cf-access-jwt-assertion");
  if (!token) return { ok: false, reason: "no_jwt" };
  let claims: Claims | null = null;
  try {
    claims = await verifyAccessJwt(token, { team, aud, keys });
  } catch {
    claims = null;
  }
  if (!claims) return { ok: false, reason: "bad_jwt" };
  const email = (claims.email || "").toLowerCase();
  if (!email || !allowed.includes(email)) return { ok: false, reason: "not_allowed" };
  return { ok: true, email };
}
