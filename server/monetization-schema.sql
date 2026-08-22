CREATE TABLE IF NOT EXISTS notulensi_monetization_config (
  config_key TEXT PRIMARY KEY,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notulensi_monetization_config_updated_at
  ON notulensi_monetization_config (updated_at DESC);
