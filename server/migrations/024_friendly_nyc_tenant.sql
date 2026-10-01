-- Standalone Friendly Party Rental NYC RentSketch tenant.
-- Idempotent: RentSketch re-runs every migration on each deploy.

INSERT INTO tenants (
  slug,name,legal_name,logo_url,contact_email,phone,website,
  primary_color,secondary_color,tagline,show_prices,
  subscription_plan,subscription_status,trial_ends_at,
  embed_key,allowed_origins,powered_by_enabled,
  customer_access,pass_price_cents,pass_duration_days,active_order_grace_days,credit_pass_to_order
)
SELECT
  'friendly-nyc',
  'Friendly Party Rental NYC',
  COALESCE(f.legal_name,'Friendly Party Rental L.L.C.'),
  f.logo_url,
  'customerservice@friendlypartyrental.com',
  '315-884-1498',
  'https://friendlypartyrentalnyc.com',
  f.primary_color,
  f.secondary_color,
  'Plan your NYC / Downstate event in 2D and 3D with Friendly Party Rental NYC',
  true,
  'enterprise',
  'active',
  NULL,
  encode(gen_random_bytes(16), 'hex'),
  '["https://friendlypartyrentalnyc.com","https://www.friendlypartyrentalnyc.com"]'::jsonb,
  true,
  'free',
  NULL,
  30,
  7,
  false
FROM tenants f
WHERE f.slug='friendly'
ON CONFLICT(slug) DO UPDATE SET
  name=EXCLUDED.name,
  legal_name=EXCLUDED.legal_name,
  contact_email=EXCLUDED.contact_email,
  phone=EXCLUDED.phone,
  website=EXCLUDED.website,
  primary_color=EXCLUDED.primary_color,
  secondary_color=EXCLUDED.secondary_color,
  tagline=EXCLUDED.tagline,
  show_prices=true,
  allowed_origins=EXCLUDED.allowed_origins,
  powered_by_enabled=true,
  customer_access='free',
  pass_price_cents=NULL,
  updated_at=now();

-- Clone the proven Friendly visual/product mapping once. A pre-deploy sync then
-- replaces prices/visibility with the standalone NYC storefront catalog.
INSERT INTO products (
  tenant_id,category,external_id,name,sku,price_per_day,price_type,
  width_ft,length_ft,capacity,photo_url,visual_model_id,active,sort_order,metadata
)
SELECT
  nyc.id,p.category,p.external_id,p.name,p.sku,p.price_per_day,p.price_type,
  p.width_ft,p.length_ft,p.capacity,p.photo_url,p.visual_model_id,p.active,p.sort_order,
  COALESCE(p.metadata,'{}'::jsonb) || '{"clonedFromTenant":"friendly"}'::jsonb
FROM products p
JOIN tenants source ON source.id=p.tenant_id AND source.slug='friendly'
JOIN tenants nyc ON nyc.slug='friendly-nyc'
WHERE NOT EXISTS (
  SELECT 1 FROM products existing
  WHERE existing.tenant_id=nyc.id
    AND (
      (p.external_id IS NOT NULL AND existing.external_id=p.external_id)
      OR (p.external_id IS NULL AND existing.external_id IS NULL AND existing.category=p.category AND existing.name=p.name)
    )
);
