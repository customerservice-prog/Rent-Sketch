-- Party Rental CRM managed marketplace provisioning.
-- Safe to re-run. CRM-managed tenants are billed by Party Rental CRM, not by
-- RentSketch's standalone Stripe subscription flow.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS external_crm_org_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_source TEXT NOT NULL DEFAULT 'rentsketch';
CREATE UNIQUE INDEX IF NOT EXISTS tenants_external_crm_org_unique
  ON tenants(external_crm_org_id) WHERE external_crm_org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tenants_billing_source_idx ON tenants(billing_source);
