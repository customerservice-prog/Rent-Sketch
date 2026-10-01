-- Owner growth + attribution + integrations.
-- Additive and safe to re-run.

ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS approved_total_cents INTEGER;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS approved_line_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS booked_total_cents INTEGER;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS booked_line_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS external_order_id TEXT;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS external_order_source TEXT;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS attribution_updated_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS payment_token_issued_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_external_order_unique
  ON quote_requests(tenant_id, external_order_source, external_order_id)
  WHERE external_order_id IS NOT NULL AND external_order_source IS NOT NULL;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS integration_api_key_hash TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS integration_api_key_last4 TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS integration_provider TEXT;

CREATE TABLE IF NOT EXISTS tenant_design_intelligence_snapshots (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bucket_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,bucket_at)
);
CREATE INDEX IF NOT EXISTS tenant_design_intelligence_snapshots_tenant_idx
  ON tenant_design_intelligence_snapshots(tenant_id,bucket_at DESC);

CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_events_tenant_idx ON integration_events(tenant_id,created_at DESC);
