CREATE TABLE IF NOT EXISTS scale_measurements (
  id TEXT PRIMARY KEY,
  measured_at TEXT NOT NULL,
  local_date TEXT,
  weight_kg REAL,
  bmi REAL,
  bmr REAL,
  body_fat_pct REAL,
  visceral_fat REAL,
  body_water_pct REAL,
  bone_mineral_kg REAL,
  muscle_kg REAL,
  protein_pct REAL,
  metabolic_age REAL,
  impedance TEXT,
  measure_type INTEGER,
  device_id TEXT,
  measure_ts INTEGER,
  body_type INTEGER,
  age INTEGER,
  gender INTEGER,
  height REAL,
  occupation INTEGER,
  timezone TEXT,
  mac TEXT,
  family_member_id TEXT,
  user_id TEXT,
  heart_rate REAL,
  raw_json TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'scale' CHECK (source = 'scale'),
  synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scale_measured ON scale_measurements(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_scale_device ON scale_measurements(device_id);

CREATE TABLE IF NOT EXISTS scale_sync_state (
  id TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  user_id TEXT,
  phone_id TEXT,
  access_expires_at TEXT,
  refresh_expires_at TEXT,
  login_backoff_until TEXT,
  last_sync_at TEXT,
  last_error TEXT,
  last_count INTEGER,
  updated_at TEXT NOT NULL
);
