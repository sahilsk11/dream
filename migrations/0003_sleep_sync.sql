ALTER TABLE sleep_sessions ADD COLUMN in_progress INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sleep_sync_state (
  id TEXT PRIMARY KEY,
  last_sync_at TEXT,
  last_error TEXT,
  last_count INTEGER,
  updated_at TEXT NOT NULL
);
