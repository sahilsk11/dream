CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sleep_sessions (
  id TEXT PRIMARY KEY,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  local_date TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('sensor', 'manual', 'edited')),
  confirmed INTEGER NOT NULL DEFAULT 0,
  external_id TEXT,
  notes TEXT,
  is_example INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_external
  ON sleep_sessions(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sleep_date ON sleep_sessions(local_date);
CREATE INDEX IF NOT EXISTS idx_sleep_start ON sleep_sessions(start_at);

CREATE TABLE IF NOT EXISTS food_entries (
  id TEXT PRIMARY KEY,
  eaten_at TEXT NOT NULL,
  local_date TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  grams REAL,
  calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  fdc_id TEXT,
  barcode TEXT,
  source TEXT NOT NULL,
  serving_label TEXT,
  nutrients_json TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_example INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_food_date ON food_entries(local_date);
CREATE INDEX IF NOT EXISTS idx_food_eaten ON food_entries(eaten_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_name ON food_entries(name);

CREATE TABLE IF NOT EXISTS food_favorites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  grams REAL,
  calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  fdc_id TEXT,
  barcode TEXT,
  source TEXT NOT NULL,
  serving_label TEXT,
  nutrients_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS food_cache (
  cache_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  cached_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weight_entries (
  id TEXT PRIMARY KEY,
  weighed_at TEXT NOT NULL,
  local_date TEXT NOT NULL,
  lbs REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'scale', 'edited')),
  external_id TEXT,
  notes TEXT,
  is_example INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_external
  ON weight_entries(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_weight_weighed ON weight_entries(weighed_at DESC);
