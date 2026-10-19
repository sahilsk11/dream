export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  DREAM_API_TOKEN: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ACCESS_ALLOWED_EMAILS?: string;
  DEV_LOCAL_EMAIL?: string;
  ALLOW_SEED?: string;
  DREAM_TZ?: string;
  USDA_API_KEY?: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
};

export type SleepSource = "sensor" | "manual" | "edited";
export type WeightSource = "manual" | "scale" | "edited";

export type SleepRow = {
  id: string;
  start_at: string;
  end_at: string;
  local_date: string;
  source: SleepSource;
  confirmed: number;
  external_id: string | null;
  notes: string | null;
  is_example: number;
  created_at: string;
  updated_at: string;
};

export type FoodRow = {
  id: string;
  eaten_at: string;
  local_date: string;
  name: string;
  quantity: number;
  unit: string;
  grams: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fdc_id: string | null;
  barcode: string | null;
  source: string;
  serving_label: string | null;
  nutrients_json: string | null;
  is_favorite: number;
  is_example: number;
  created_at: string;
  updated_at: string;
};

export type WeightRow = {
  id: string;
  weighed_at: string;
  local_date: string;
  lbs: number;
  source: WeightSource;
  external_id: string | null;
  notes: string | null;
  is_example: number;
  created_at: string;
  updated_at: string;
};

export type FoodNutrients = {
  name: string;
  quantity: number;
  unit: string;
  grams: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fdc_id: string | null;
  barcode: string | null;
  source: string;
  serving_label: string | null;
  per_100g?: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  };
};

export type ParsedItem = {
  name: string;
  quantity: number;
  unit: string;
};

export type Env = Bindings;
