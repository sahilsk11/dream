import type { Bindings } from "./types.ts";
import { insertSleep } from "./sleep.ts";
import { addFavorite, insertFood } from "./food.ts";
import { insertWeight } from "./weight.ts";
import { addDays, localDate, tzOf, zonedWallTimeMs } from "./time.ts";
import type { FoodNutrients } from "./types.ts";

function isoAt(dateStr: string, hour: number, minute: number, tz: string): string {
  return new Date(zonedWallTimeMs(dateStr, hour, minute, tz)).toISOString();
}

const BANANA: FoodNutrients = {
  name: "EXAMPLE · Banana, raw",
  quantity: 1,
  unit: "medium",
  grams: 118,
  calories: 105,
  protein_g: 1.3,
  carbs_g: 27,
  fat_g: 0.4,
  fdc_id: "173944",
  barcode: null,
  source: "usda",
  serving_label: "1 medium (118 g)",
  per_100g: { calories: 89, protein_g: 1.1, carbs_g: 22.8, fat_g: 0.3 },
};

const OATS: FoodNutrients = {
  name: "EXAMPLE · Oats, rolled, cooked",
  quantity: 1,
  unit: "cup",
  grams: 234,
  calories: 166,
  protein_g: 5.9,
  carbs_g: 28.1,
  fat_g: 3.6,
  fdc_id: "173904",
  barcode: null,
  source: "usda",
  serving_label: "1 cup (234 g)",
  per_100g: { calories: 71, protein_g: 2.5, carbs_g: 12, fat_g: 1.5 },
};

const YOGURT: FoodNutrients = {
  name: "EXAMPLE · Greek yogurt, plain, nonfat",
  quantity: 1,
  unit: "cup",
  grams: 170,
  calories: 100,
  protein_g: 17.3,
  carbs_g: 6.1,
  fat_g: 0.7,
  fdc_id: "170903",
  barcode: null,
  source: "usda",
  serving_label: "1 cup (170 g)",
  per_100g: { calories: 59, protein_g: 10.2, carbs_g: 3.6, fat_g: 0.4 },
};

const EGGS: FoodNutrients = {
  name: "EXAMPLE · Egg, whole, cooked",
  quantity: 2,
  unit: "large",
  grams: 100,
  calories: 155,
  protein_g: 12.6,
  carbs_g: 1.1,
  fat_g: 10.6,
  fdc_id: "171287",
  barcode: null,
  source: "usda",
  serving_label: "2 large (100 g)",
  per_100g: { calories: 155, protein_g: 12.6, carbs_g: 1.1, fat_g: 10.6 },
};

export async function seedExample(env: Bindings): Promise<{ ok: true; labeled: true }> {
  const tz = tzOf(env.DREAM_TZ);
  const today = localDate(new Date(), tz);
  const yesterday = addDays(today, -1);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM sleep_sessions WHERE is_example = 1"),
    env.DB.prepare("DELETE FROM food_entries WHERE is_example = 1"),
    env.DB.prepare("DELETE FROM weight_entries WHERE is_example = 1"),
    env.DB.prepare("DELETE FROM food_favorites"),
  ]);

  await insertSleep(env, tz, {
    start_at: isoAt(yesterday, 23, 12, tz),
    end_at: isoAt(today, 7, 4, tz),
    source: "sensor",
    confirmed: 0,
    external_id: `example-sensor-night-${today}`,
    notes: "EXAMPLE — bed sensor night (unconfirmed)",
    is_example: 1,
  });
  await insertSleep(env, tz, {
    start_at: isoAt(today, 14, 10, tz),
    end_at: isoAt(today, 14, 52, tz),
    source: "manual",
    confirmed: 1,
    notes: "EXAMPLE — afternoon nap",
    is_example: 1,
  });

  await insertFood(env, tz, OATS, isoAt(today, 8, 15, tz), 1);
  await insertFood(env, tz, BANANA, isoAt(today, 8, 16, tz), 1);
  await insertFood(env, tz, YOGURT, isoAt(today, 12, 40, tz), 1);
  await insertFood(env, tz, EGGS, isoAt(yesterday, 19, 10, tz), 1);

  await addFavorite(env, BANANA);
  await addFavorite(env, YOGURT);

  const weights = [177.4, 176.8, 177.1, 176.2, 176.6, 175.9, 176.4, 176.1];
  for (let i = 0; i < weights.length; i++) {
    const day = addDays(today, i - (weights.length - 1));
    await insertWeight(env, tz, {
      lbs: weights[i],
      weighed_at: isoAt(day, 7, 32, tz),
      source: "manual",
      notes: "EXAMPLE",
      is_example: 1,
    });
  }

  return { ok: true, labeled: true };
}

export async function maybeSeed(env: Bindings): Promise<boolean> {
  if (env.ALLOW_SEED !== "true") return false;
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM sleep_sessions",
  ).first<{ c: number }>();
  if (row && row.c > 0) return false;
  await seedExample(env);
  return true;
}
