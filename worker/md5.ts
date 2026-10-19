/** Pure MD5 + HMAC-MD5. Workers/WebCrypto cannot HMAC-MD5; Node tests need this too. */

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9,
  14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = new Uint32Array(64);
for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);

function toBytes(input: string | Uint8Array): Uint8Array {
  return typeof input === "string" ? new TextEncoder().encode(input) : input;
}

function rotl(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n));
}

export function md5Bytes(input: string | Uint8Array): Uint8Array {
  const data = toBytes(input);
  const bitLen = data.length * 8;
  const paddedLen = ((data.length + 8) >> 6 << 6) + 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(data);
  buf[data.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, bitLen >>> 0, true);
  view.setUint32(paddedLen - 4, Math.floor(bitLen / 2 ** 32), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let off = 0; off < paddedLen; off += 64) {
    const M = new Int32Array(16);
    for (let i = 0; i < 16; i++) M[i] = view.getInt32(off + i * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      const tmp = D;
      D = C;
      C = B;
      B = (B + rotl((A + F + K[i] + M[g]) | 0, S[i])) | 0;
      A = tmp;
    }
    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setInt32(0, a0, true);
  ov.setInt32(4, b0, true);
  ov.setInt32(8, c0, true);
  ov.setInt32(12, d0, true);
  return out;
}

export function md5Hex(input: string | Uint8Array): string {
  return [...md5Bytes(input)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** HMAC-MD5; key/message are treated as UTF-8 strings unless bytes are passed. */
export function hmacMd5Hex(key: string | Uint8Array, message: string | Uint8Array): string {
  let keyBytes = toBytes(key);
  if (keyBytes.length > 64) keyBytes = md5Bytes(keyBytes);
  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  ipad.set(keyBytes);
  opad.set(keyBytes);
  for (let i = 0; i < 64; i++) {
    ipad[i] ^= 0x36;
    opad[i] ^= 0x5c;
  }
  const inner = toBytes(message);
  const innerAll = new Uint8Array(64 + inner.length);
  innerAll.set(ipad);
  innerAll.set(inner, 64);
  const innerHash = md5Bytes(innerAll);
  const outerAll = new Uint8Array(64 + 16);
  outerAll.set(opad);
  outerAll.set(innerHash, 64);
  return md5Hex(outerAll);
}
