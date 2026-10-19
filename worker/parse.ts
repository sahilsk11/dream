import type { ParsedItem } from "./types.ts";

const UNITS = [
  "tablespoons",
  "tablespoon",
  "tbsp",
  "teaspoons",
  "teaspoon",
  "tsp",
  "cups",
  "cup",
  "ounces",
  "ounce",
  "oz",
  "grams",
  "gram",
  "g",
  "ml",
  "milliliters",
  "pounds",
  "pound",
  "lbs",
  "lb",
  "slices",
  "slice",
  "servings",
  "serving",
  "scoops",
  "scoop",
  "pieces",
  "piece",
  "pcs",
  "pc",
  "each",
  "x",
];

const UNIT_RE = UNITS.join("|");

function normalizeUnit(unit: string | undefined): string {
  if (!unit) return "serving";
  const u = unit.toLowerCase();
  if (["tablespoons", "tablespoon", "tbsp"].includes(u)) return "tbsp";
  if (["teaspoons", "teaspoon", "tsp"].includes(u)) return "tsp";
  if (["cups", "cup"].includes(u)) return "cup";
  if (["ounces", "ounce", "oz"].includes(u)) return "oz";
  if (["grams", "gram", "g"].includes(u)) return "g";
  if (["ml", "milliliters"].includes(u)) return "ml";
  if (["pounds", "pound", "lbs", "lb"].includes(u)) return "lb";
  if (["slices", "slice"].includes(u)) return "slice";
  if (["scoops", "scoop"].includes(u)) return "scoop";
  if (["pieces", "piece", "pcs", "pc", "each", "x"].includes(u)) return "piece";
  if (["servings", "serving"].includes(u)) return "serving";
  return u;
}

function splitItems(text: string): string[] {
  return text
    .split(/\s*(?:,|;|\band\b|\+)\s*/i)
    .map((s) => s.replace(/^then\s+/i, "").trim())
    .filter((s) => s.length > 0 && !/^(with|a|an|the)$/i.test(s));
}

function parseOne(chunk: string): ParsedItem {
  const cleaned = chunk.replace(/^(had|ate|i ate|i had|log)\s+/i, "").trim();
  const re = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})?\\s*(?:of\\s+)?(.+)$`,
    "i",
  );
  const m = cleaned.match(re);
  if (m) {
    return {
      quantity: Number(m[1]),
      unit: normalizeUnit(m[2]),
      name: m[3].replace(/^(of|a|an)\s+/i, "").trim(),
    };
  }
  const article = cleaned.match(/^(an?)\s+(.+)$/i);
  if (article) {
    return { quantity: 1, unit: "piece", name: article[2].trim() };
  }
  return { quantity: 1, unit: "serving", name: cleaned };
}

/** Deterministic parser. LLM may call this same shape; never invents calories. */
export function parseFoodText(text: string): ParsedItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return splitItems(trimmed).map(parseOne).filter((p) => p.name.length > 0);
}

export function extractJsonArray(text: string): ParsedItem[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < 0) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(raw)) return null;
    const items: ParsedItem[] = [];
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const name = String(r.name || r.item || "").trim();
      if (!name) continue;
      items.push({
        name,
        quantity: Number(r.quantity ?? r.qty ?? 1) || 1,
        unit: normalizeUnit(String(r.unit ?? "serving")),
      });
    }
    return items.length ? items : null;
  } catch {
    return null;
  }
}
