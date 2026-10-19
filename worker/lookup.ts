import type { Bindings, FoodNutrients, ParsedItem } from "./types.ts";
import { extractJsonArray, parseFoodText } from "./parse.ts";
import { nowIso } from "./time.ts";

const USDA_SEARCH = "https://api.nal.usda.gov/fdc/v1/foods/search";
const OFF_PRODUCT = "https://world.openfoodfacts.org/api/v2/product";
const OFF_UA = "Dream/2.0 (https://dream.ultron.sh; personal tracker)";

type NutrientBag = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

function n(v: unknown): number | null {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
}

function pickNutrient(
  nutrients: Array<{ nutrientId?: number; nutrientNumber?: string; value?: number; nutrientName?: string }>,
  id: number,
  number: string,
): number | null {
  const hit = nutrients.find(
    (x) => x.nutrientId === id || x.nutrientNumber === number,
  );
  return n(hit?.value);
}

function per100FromUsda(food: {
  foodNutrients?: Array<{ nutrientId?: number; nutrientNumber?: string; value?: number }>;
}): NutrientBag {
  const list = food.foodNutrients ?? [];
  return {
    calories: pickNutrient(list, 1008, "208"),
    protein_g: pickNutrient(list, 1003, "203"),
    carbs_g: pickNutrient(list, 1005, "205"),
    fat_g: pickNutrient(list, 1004, "204"),
  };
}

function scale(bag: NutrientBag, grams: number | null, qty: number): NutrientBag {
  if (grams != null && grams > 0) {
    const f = grams / 100;
    return {
      calories: bag.calories == null ? null : n(bag.calories * f),
      protein_g: bag.protein_g == null ? null : n(bag.protein_g * f),
      carbs_g: bag.carbs_g == null ? null : n(bag.carbs_g * f),
      fat_g: bag.fat_g == null ? null : n(bag.fat_g * f),
    };
  }
  return {
    calories: bag.calories == null ? null : n(bag.calories * qty),
    protein_g: bag.protein_g == null ? null : n(bag.protein_g * qty),
    carbs_g: bag.carbs_g == null ? null : n(bag.carbs_g * qty),
    fat_g: bag.fat_g == null ? null : n(bag.fat_g * qty),
  };
}

async function cachedJson(
  env: Bindings,
  key: string,
  loader: () => Promise<unknown>,
  ttlMs = 12 * 60 * 60 * 1000,
): Promise<unknown> {
  const row = await env.DB.prepare(
    "SELECT payload, cached_at FROM food_cache WHERE cache_key = ?",
  )
    .bind(key)
    .first<{ payload: string; cached_at: string }>();
  if (row && Date.now() - Date.parse(row.cached_at) < ttlMs) {
    try {
      return JSON.parse(row.payload);
    } catch {
      /* ignore bad cache */
    }
  }
  const payload = await loader();
  await env.DB.prepare(
    "INSERT OR REPLACE INTO food_cache (cache_key, payload, cached_at) VALUES (?, ?, ?)",
  )
    .bind(key, JSON.stringify(payload), nowIso())
    .run();
  return payload;
}

function usdaToFood(food: Record<string, unknown>, qty = 1, unit = "serving"): FoodNutrients {
  const per100 = per100FromUsda(food);
  const servingSize = n(food.servingSize);
  const servingUnit = String(food.servingSizeUnit || "g").toLowerCase();
  const household = food.householdServingFullText
    ? String(food.householdServingFullText)
    : null;
  let grams: number | null = null;
  let serving_label = "100 g";
  if (servingSize && (servingUnit === "g" || servingUnit === "ml")) {
    grams = servingSize * qty;
    serving_label = household ? `${household} (${servingSize}g)` : `${servingSize}${servingUnit}`;
  } else if (unit === "g") {
    grams = qty;
    serving_label = `${qty} g`;
  } else {
    grams = 100 * qty;
    serving_label = household ?? "100 g";
  }
  const scaled = scale(per100, grams, qty);
  const desc = String(food.description || food.lowercaseDescription || "food");
  const brand = food.brandOwner ? ` · ${food.brandOwner}` : "";
  return {
    name: `${desc}${brand}`,
    quantity: qty,
    unit: unit === "serving" && household ? household : unit,
    grams,
    calories: scaled.calories,
    protein_g: scaled.protein_g,
    carbs_g: scaled.carbs_g,
    fat_g: scaled.fat_g,
    fdc_id: food.fdcId != null ? String(food.fdcId) : null,
    barcode: food.gtinUpc ? String(food.gtinUpc) : null,
    source: "usda",
    serving_label,
    per_100g: per100,
  };
}

export async function searchUsda(
  env: Bindings,
  query: string,
  pageSize = 8,
): Promise<FoodNutrients[]> {
  const q = query.trim();
  if (!q) return [];
  const key = env.USDA_API_KEY || "DEMO_KEY";
  const cacheKey = `usda:${q.toLowerCase()}:${pageSize}`;
  const payload = (await cachedJson(env, cacheKey, async () => {
    const search = async (body: Record<string, unknown>) => {
      const res = await fetch(`${USDA_SEARCH}?api_key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`USDA ${res.status}`);
      }
      return JSON.parse(text) as { foods?: Record<string, unknown>[] };
    };
    let data = await search({
      query: q,
      pageSize,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
    });
    if (!data.foods || data.foods.length < 3) {
      data = await search({ query: q, pageSize });
    }
    return data;
  })) as { foods?: Record<string, unknown>[] };
  return (payload.foods ?? []).slice(0, pageSize).map((f) => usdaToFood(f));
}

export async function lookupBarcode(
  env: Bindings,
  barcode: string,
): Promise<FoodNutrients | null> {
  const code = barcode.replace(/\s+/g, "");
  if (!code) return null;
  const payload = (await cachedJson(env, `off:${code}`, async () => {
    const res = await fetch(`${OFF_PRODUCT}/${encodeURIComponent(code)}.json`, {
      headers: { "user-agent": OFF_UA, accept: "application/json" },
    });
    return res.json();
  })) as {
    status?: number;
    product?: Record<string, unknown> & {
      nutriments?: Record<string, unknown>;
      product_name?: string;
      brands?: string;
      serving_size?: string;
      serving_quantity?: number;
    };
  };
  if (!payload || payload.status !== 1 || !payload.product) return null;
  const p = payload.product;
  const nut = p.nutriments ?? {};
  const per100: NutrientBag = {
    calories: n(nut["energy-kcal_100g"] ?? nut["energy-kcal"]),
    protein_g: n(nut.proteins_100g),
    carbs_g: n(nut.carbohydrates_100g),
    fat_g: n(nut.fat_100g),
  };
  const servingQty = n(p.serving_quantity);
  const grams = servingQty && servingQty > 0 ? servingQty : 100;
  const scaled = scale(per100, grams, 1);
  const name = [p.product_name, p.brands].filter(Boolean).join(" · ") || `barcode ${code}`;
  return {
    name,
    quantity: 1,
    unit: p.serving_size ? String(p.serving_size) : "serving",
    grams,
    calories: scaled.calories,
    protein_g: scaled.protein_g,
    carbs_g: scaled.carbs_g,
    fat_g: scaled.fat_g,
    fdc_id: null,
    barcode: code,
    source: "off",
    serving_label: p.serving_size ? String(p.serving_size) : `${grams} g`,
    per_100g: per100,
  };
}

export async function parseWithLookup(
  env: Bindings,
  text: string,
): Promise<{
  parser: "llm" | "rules";
  items: Array<{ parsed: ParsedItem; matches: FoodNutrients[] }>;
}> {
  let parsed = parseFoodText(text);
  let parser: "llm" | "rules" = "rules";
  if (env.LLM_API_KEY) {
    const llmItems = await llmParse(env, text);
    if (llmItems && llmItems.length) {
      parsed = llmItems;
      parser = "llm";
    }
  }
  const items = [];
  for (const p of parsed) {
    const matches = await searchUsda(env, p.name, 5);
    items.push({ parsed: p, matches });
  }
  return { parser, items };
}

async function llmParse(env: Bindings, text: string): Promise<ParsedItem[] | null> {
  const base = (env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.LLM_MODEL || "gpt-4o-mini";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            'Extract food items from the user. Return ONLY JSON: [{"name":"string","quantity":number,"unit":"g|cup|tbsp|tsp|oz|slice|scoop|piece|serving"}]. No calories, no nutrients, no commentary.',
        },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  return extractJsonArray(content);
}

export function scaleFood(food: FoodNutrients, quantity: number, unit?: string): FoodNutrients {
  const qty = quantity > 0 ? quantity : 1;
  const grams =
    food.grams != null && food.quantity
      ? (food.grams / food.quantity) * qty
      : food.grams;
  const per = food.per_100g;
  const scaled = per ? scale(per, grams, qty) : {
    calories: food.calories != null && food.quantity ? n((food.calories / food.quantity) * qty) : food.calories,
    protein_g: food.protein_g != null && food.quantity ? n((food.protein_g / food.quantity) * qty) : food.protein_g,
    carbs_g: food.carbs_g != null && food.quantity ? n((food.carbs_g / food.quantity) * qty) : food.carbs_g,
    fat_g: food.fat_g != null && food.quantity ? n((food.fat_g / food.quantity) * qty) : food.fat_g,
  };
  return {
    ...food,
    quantity: qty,
    unit: unit ?? food.unit,
    grams,
    calories: scaled.calories,
    protein_g: scaled.protein_g,
    carbs_g: scaled.carbs_g,
    fat_g: scaled.fat_g,
  };
}
