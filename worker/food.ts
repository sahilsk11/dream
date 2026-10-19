import type { Bindings, FoodRow } from "./types.ts";
import { localDate, nowIso } from "./time.ts";
import { scaleFood } from "./lookup.ts";
import type { FoodNutrients } from "./types.ts";

export async function listFood(
  env: Bindings,
  opts: { date?: string; from?: string; to?: string },
): Promise<FoodRow[]> {
  if (opts.date) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM food_entries WHERE local_date = ? ORDER BY eaten_at ASC",
    )
      .bind(opts.date)
      .all<FoodRow>();
    return results ?? [];
  }
  if (opts.from && opts.to) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM food_entries WHERE eaten_at >= ? AND eaten_at <= ? ORDER BY eaten_at ASC",
    )
      .bind(opts.from, opts.to)
      .all<FoodRow>();
    return results ?? [];
  }
  const { results } = await env.DB.prepare(
    "SELECT * FROM food_entries ORDER BY eaten_at DESC LIMIT 300",
  ).all<FoodRow>();
  return results ?? [];
}

export async function recents(env: Bindings, limit = 12): Promise<FoodRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM food_entries
     WHERE id IN (
       SELECT id FROM food_entries e1
       WHERE e1.eaten_at = (
         SELECT MAX(e2.eaten_at) FROM food_entries e2
         WHERE lower(e2.name) = lower(e1.name)
           AND ifnull(e2.fdc_id,'') = ifnull(e1.fdc_id,'')
           AND ifnull(e2.barcode,'') = ifnull(e1.barcode,'')
       )
     )
     ORDER BY eaten_at DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all<FoodRow>();
  return results ?? [];
}

export async function listFavorites(env: Bindings) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM food_favorites ORDER BY name ASC",
  ).all();
  return results ?? [];
}

function foodValues(tz: string, food: FoodNutrients, eatenAt: string, isExample = 0) {
  const now = nowIso();
  const id = crypto.randomUUID();
  return {
    id,
    eaten_at: eatenAt,
    local_date: localDate(new Date(eatenAt), tz),
    name: food.name,
    quantity: food.quantity,
    unit: food.unit,
    grams: food.grams,
    calories: food.calories,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    fdc_id: food.fdc_id,
    barcode: food.barcode,
    source: food.source,
    serving_label: food.serving_label,
    nutrients_json: food.per_100g ? JSON.stringify({ per_100g: food.per_100g }) : null,
    is_favorite: 0,
    is_example: isExample,
    created_at: now,
    updated_at: now,
  };
}

export async function insertFood(
  env: Bindings,
  tz: string,
  food: FoodNutrients,
  eatenAt: string,
  isExample = 0,
): Promise<FoodRow> {
  const row = foodValues(tz, food, eatenAt, isExample);
  await env.DB.prepare(
    `INSERT INTO food_entries (
      id, eaten_at, local_date, name, quantity, unit, grams, calories, protein_g, carbs_g, fat_g,
      fdc_id, barcode, source, serving_label, nutrients_json, is_favorite, is_example, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.eaten_at,
      row.local_date,
      row.name,
      row.quantity,
      row.unit,
      row.grams,
      row.calories,
      row.protein_g,
      row.carbs_g,
      row.fat_g,
      row.fdc_id,
      row.barcode,
      row.source,
      row.serving_label,
      row.nutrients_json,
      row.is_favorite,
      row.is_example,
      row.created_at,
      row.updated_at,
    )
    .run();
  return row as FoodRow;
}

export async function updateFood(
  env: Bindings,
  tz: string,
  id: string,
  patch: Partial<FoodNutrients> & { eaten_at?: string },
): Promise<FoodRow | null> {
  const existing = await env.DB.prepare("SELECT * FROM food_entries WHERE id = ?")
    .bind(id)
    .first<FoodRow>();
  if (!existing) return null;
  let per100: FoodNutrients["per_100g"];
  if (existing.nutrients_json) {
    try {
      per100 = (JSON.parse(existing.nutrients_json) as { per_100g?: FoodNutrients["per_100g"] })
        .per_100g;
    } catch {
      per100 = undefined;
    }
  }
  const base: FoodNutrients = {
    name: patch.name ?? existing.name,
    quantity: existing.quantity,
    unit: existing.unit,
    grams: existing.grams,
    calories: existing.calories,
    protein_g: existing.protein_g,
    carbs_g: existing.carbs_g,
    fat_g: existing.fat_g,
    fdc_id: existing.fdc_id,
    barcode: existing.barcode,
    source: existing.source,
    serving_label: existing.serving_label,
    per_100g: per100,
  };
  const qty = patch.quantity ?? existing.quantity;
  const scaled = scaleFood(base, qty, patch.unit ?? existing.unit);
  const eaten = patch.eaten_at ?? existing.eaten_at;
  const now = nowIso();
  await env.DB.prepare(
    `UPDATE food_entries SET
      eaten_at = ?, local_date = ?, name = ?, quantity = ?, unit = ?, grams = ?,
      calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      eaten,
      localDate(new Date(eaten), tz),
      scaled.name,
      scaled.quantity,
      scaled.unit,
      scaled.grams,
      scaled.calories,
      scaled.protein_g,
      scaled.carbs_g,
      scaled.fat_g,
      now,
      id,
    )
    .run();
  return env.DB.prepare("SELECT * FROM food_entries WHERE id = ?")
    .bind(id)
    .first<FoodRow>();
}

export async function deleteFood(env: Bindings, id: string): Promise<boolean> {
  const res = await env.DB.prepare("DELETE FROM food_entries WHERE id = ?")
    .bind(id)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function addFavorite(env: Bindings, food: FoodNutrients) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO food_favorites (
      id, name, quantity, unit, grams, calories, protein_g, carbs_g, fat_g,
      fdc_id, barcode, source, serving_label, nutrients_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      food.name,
      food.quantity,
      food.unit,
      food.grams,
      food.calories,
      food.protein_g,
      food.carbs_g,
      food.fat_g,
      food.fdc_id,
      food.barcode,
      food.source,
      food.serving_label,
      food.per_100g ? JSON.stringify({ per_100g: food.per_100g }) : null,
      nowIso(),
    )
    .run();
  return { id, ...food };
}

export async function deleteFavorite(env: Bindings, id: string) {
  await env.DB.prepare("DELETE FROM food_favorites WHERE id = ?").bind(id).run();
}

export function totals(rows: FoodRow[]) {
  return rows.reduce(
    (acc, r) => {
      acc.calories += r.calories ?? 0;
      acc.protein_g += r.protein_g ?? 0;
      acc.carbs_g += r.carbs_g ?? 0;
      acc.fat_g += r.fat_g ?? 0;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}
