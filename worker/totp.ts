/** RFC 6238 TOTP (6 digits, 30s, SHA-1) matching Python mintotp used by wyze-sdk. */

function base32Decode(secret: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = secret.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const ch of clean) {
    const v = alphabet.indexOf(ch);
    if (v < 0) throw new Error("invalid TOTP secret");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

export async function totp(
  secret: string,
  atMs = Date.now(),
  step = 30,
  digits = 6,
): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(atMs / 1000 / step);
  const buf = new ArrayBuffer(8);
  new DataView(buf).setUint32(4, counter >>> 0);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  const otp = (binary % 10 ** digits).toString();
  return otp.padStart(digits, "0");
}
