-- Durable, privacy-safe aggregate learning snapshots for RentSketch.
-- Stores only aggregate intelligence JSON; no customer contact fields.
CREATE TABLE IF NOT EXISTS design_intelligence_snapshots (
  bucket_at TIMESTAMPTZ PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS design_intelligence_snapshots_created_idx
  ON design_intelligence_snapshots(created_at DESC);
