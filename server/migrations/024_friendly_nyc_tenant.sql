-- Provision a dedicated Friendly Party Rental NYC RentSketch tenant.
-- Idempotent: migrations are re-run on every deploy.
-- The NYC tenant intentionally hides RentSketch prices until its catalog-price
-- sync is wired to the NYC storefront; visual inventory is cloned from Friendly,
-- whose public quantities/catalog are the approved NYC source set.

INSERT INTO tenants (
  slug,name,legal_name,logo_url,contact_email,phone,website,
  primary_color,secondary_color,tagline,show_prices,
  subscription_plan,subscription_status,trial_ends_at,
  customer_access,pass_price_cents,pass_duration_days,active_order_grace_days,
  credit_pass_to_order,allowed_origins,powered_by_enabled
)
SELECT
  'friendly-nyc',
  'Friendly Party Rental NYC',
  legal_name,
  logo_url,
  contact_email,
  phone,
  'https://friendlypartyrentalnyc.com',
  primary_color,
  secondary_color,
  'Riverdale & Downstate New York event planning in 2D & 3D',
  false,
  subscription_plan,
  'active',
  NULL,
  'free',
  NULL,
  pass_duration_days,
  active_order_grace_days,
  false,
  '["https://friendlypartyrentalnyc.com","https://www.friendlypartyrentalnyc.com"]'::jsonb,
  powered_by_enabled
FROM tenants
WHERE slug='friendly'
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name,
  website=EXCLUDED.website,
  tagline=EXCLUDED.tagline,
  show_prices=false,
  subscription_status='active',
  customer_access='free',
  allowed_origins=EXCLUDED.allowed_origins,
  updated_at=now();

INSERT INTO products (
  tenant_id,category,external_id,name,sku,price_per_day,price_type,
  width_ft,length_ft,capacity,photo_url,visual_model_id,active,sort_order,metadata
)
SELECT
  nyc.id,p.category,p.external_id,p.name,p.sku,NULL,p.price_type,
  p.width_ft,p.length_ft,p.capacity,p.photo_url,p.visual_model_id,p.active,p.sort_order,
  COALESCE(p.metadata,'{}'::jsonb) || '{"sourceTenant":"friendly","nycPriceHidden":true}'::jsonb
FROM products p
JOIN tenants source ON source.id=p.tenant_id AND source.slug='friendly'
CROSS JOIN tenants nyc
WHERE nyc.slug='friendly-nyc'
  AND NOT EXISTS (
    SELECT 1 FROM products existing
    WHERE existing.tenant_id=nyc.id
      AND COALESCE(existing.external_id,'')=COALESCE(p.external_id,'')
      AND existing.name=p.name
  );
