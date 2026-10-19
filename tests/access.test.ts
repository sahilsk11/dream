import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { accessUser, verifyAccessJwt } from "../worker/access.ts";

const TEAM = "team.cloudflareaccess.com";
const AUD = "aud123";

function b64url(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function setup() {
  const kp = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey("jwk", kp.publicKey)) as JsonWebKey & { kid?: string };
  jwk.kid = "k1";
  const sign = async (claims: Record<string, unknown>, kid = "k1") => {
    const h = b64url(JSON.stringify({ alg: "RS256", kid }));
    const p = b64url(JSON.stringify(claims));
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(`${h}.${p}`));
    return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
  };
  return { keys: async () => [jwk], sign };
}

const env = (extra = {}) =>
  ({
    ACCESS_TEAM_DOMAIN: TEAM,
    ACCESS_AUD: AUD,
    ACCESS_ALLOWED_EMAILS: "me@example.com",
    ...extra,
  }) as never;

const req = (jwt?: string, url = "https://dream.ultron.sh/api/me") =>
  new Request(url, { headers: jwt ? { "cf-access-jwt-assertion": jwt } : {} });

const exp = () => Math.floor(Date.now() / 1000) + 600;

describe("access jwt", () => {
  it("admits the allowed email", async () => {
    const { keys, sign } = await setup();
    const jwt = await sign({ aud: [AUD], iss: `https://${TEAM}`, exp: exp(), email: "Me@Example.com" });
    assert.deepEqual(await accessUser(req(jwt), env(), keys), { ok: true, email: "me@example.com" });
  });

  it("rejects other emails and service tokens (no email)", async () => {
    const { keys, sign } = await setup();
    const other = await sign({ aud: AUD, iss: `https://${TEAM}`, exp: exp(), email: "x@example.com" });
    const svc = await sign({ aud: AUD, iss: `https://${TEAM}`, exp: exp(), common_name: "abc.access" });
    assert.equal((await accessUser(req(other), env(), keys)).ok, false);
    assert.deepEqual(await accessUser(req(svc), env(), keys), { ok: false, reason: "not_allowed" });
  });

  it("rejects wrong aud, wrong iss, expired, tampered, unknown kid", async () => {
    const { keys, sign } = await setup();
    const base = { aud: AUD, iss: `https://${TEAM}`, exp: exp(), email: "me@example.com" };
    for (const claims of [
      { ...base, aud: "other" },
      { ...base, iss: "https://evil.cloudflareaccess.com" },
      { ...base, exp: 1000 },
    ]) {
      assert.equal(await verifyAccessJwt(await sign(claims), { team: TEAM, aud: AUD, keys }), null);
    }
    const good = await sign(base);
    const [h, , s] = good.split(".");
    const forged = `${h}.${b64url(JSON.stringify({ ...base, email: "me@example.com", x: 1 }))}.${s}`;
    assert.equal(await verifyAccessJwt(forged, { team: TEAM, aud: AUD, keys }), null);
    assert.equal(await verifyAccessJwt(await sign(base, "nope"), { team: TEAM, aud: AUD, keys }), null);
  });

  it("fails closed without a JWT or config; dev email only on localhost", async () => {
    assert.deepEqual(await accessUser(req(), env()), { ok: false, reason: "no_jwt" });
    assert.deepEqual(await accessUser(req("a.b.c"), { } as never), { ok: false, reason: "not_configured" });
    assert.equal((await accessUser(req(undefined, "https://dream.ultron.sh/"), env({ DEV_LOCAL_EMAIL: "d@x" }))).ok, false);
    assert.equal((await accessUser(req(undefined, "http://127.0.0.1:8787/api/me"), env({ DEV_LOCAL_EMAIL: "d@x" }))).ok, true);
  });
});
