/**
 * JSON.parse turns integers above Number.MAX_SAFE_INTEGER (~16 digits) into
 * rounded Numbers. Wyze data_id values are 19-digit ints, so stored IDs end
 * in 00 / 000 and the original is also lost from raw_json. Quote those
 * literals as strings before parse.
 */

/** Quote 16+ digit JSON integers that are not already inside a string. */
export function quoteUnsafeJsonInts(text: string): string {
  return text.replace(/"(?:\\.|[^"\\])*"|-?\d{16,}/g, (m) =>
    m.startsWith('"') ? m : `"${m}"`,
  );
}

export function parseWyzeJson(text: string): unknown {
  return JSON.parse(quoteUnsafeJsonInts(text));
}

/** The ID JSON.parse would have stored: String(Number(trueId)). */
export function jsPrecisionLostId(id: string): string | null {
  if (!/^-?\d{16,}$/.test(id)) return null;
  const lost = String(Number(id));
  return lost !== id ? lost : null;
}

/** Stored PK looks like JSON.parse already rounded it (exactly representable). */
export function isRoundedJsId(id: string): boolean {
  return /^-?\d{16,}$/.test(id) && String(Number(id)) === id;
}

/** Pull a field's integer (or quoted) value as a string from raw JSON text. */
export function extractJsonFieldInt(text: string, field: string): string | null {
  const re = new RegExp(`"${field}"\\s*:\\s*"?(-?\\d+)"?`);
  const m = text.match(re);
  return m ? m[1] : null;
}
