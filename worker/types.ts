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
  WYZE_EMAIL?: string;
  WYZE_PASSWORD?: string;
  WYZE_KEY_ID?: string;
  WYZE_API_KEY?: string;
  WYZE_TOTP_SECRET?: string;
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
  metrics?: ScaleRow;
};

export type ScaleRow = {
  id: string;
  measured_at: string;
  local_date: string | null;
  weight_kg: number | null;
  bmi: number | null;
  bmr: number | null;
  body_fat_pct: number | null;
  visceral_fat: number | null;
  body_water_pct: number | null;
  bone_mineral_kg: number | null;
  muscle_kg: number | null;
  protein_pct: number | null;
  metabolic_age: number | null;
  impedance: string | null;
  measure_type: number | null;
  device_id: string | null;
  measure_ts: number | null;
  body_type: number | null;
  age: number | null;
  gender: number | null;
  height: number | null;
  occupation: number | null;
  timezone: string | null;
  mac: string | null;
  family_member_id: string | null;
  user_id: string | null;
  heart_rate: number | null;
  raw_json: string;
  source: "scale";
  synced_at: string;
};

export type ScaleSyncState = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  user_id: string | null;
  phone_id: string | null;
  access_expires_at: string | null;
  refresh_expires_at: string | null;
  login_backoff_until: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  last_count: number | null;
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
