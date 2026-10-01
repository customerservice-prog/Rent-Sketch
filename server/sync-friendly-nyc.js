#!/usr/bin/env node
const db = require('./src/db');

const TENANT = 'friendly-nyc';
const CATALOG_URL = process.env.FRIENDLY_NYC_CATALOG_URL || 'https://friendlypartyrentalnyc.com/api/items';

function normalized(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

(async () => {
  try {
    const response = await fetch(CATALOG_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('NYC catalog HTTP ' + response.status);
    const body = await response.json();
    const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
    if (items.length < 180) throw new Error('NYC catalog is unexpectedly small (' + items.length + '); refusing partial sync');

    const publicItems = items.filter(item => item && typeof item.slug === 'string' && item.displayToCustomer !== false);
    const bySlug = new Map(publicItems.map(item => [item.slug, item]));
    const byName = new Map();
    for (const item of publicItems) {
      const key = normalized(item.name);
      if (key && !byName.has(key)) byName.set(key,item);
    }

    const tenant = (await db.query('SELECT id FROM tenants WHERE slug=$1',[TENANT])).rows[0];
    if (!tenant) throw new Error('friendly-nyc tenant does not exist');

    const products = (await db.query('SELECT id,external_id,name,visual_model_id FROM products WHERE tenant_id=$1',[tenant.id])).rows;
    let mapped = 0, disabled = 0;
    const mappedNames = new Map();

    for (const product of products) {
      let item = null;
      if (typeof product.external_id === 'string' && product.external_id.startsWith('fpr:')) {
        item = bySlug.get(product.external_id.slice(4)) || null;
      }
      if (!item) item = byName.get(normalized(product.name)) || null;

      if (item) {
        mapped++;
        mappedNames.set(normalized(product.name), item);
        const price = Number(item.cost);
        if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid NYC price for ' + item.slug);
        const photoUrl = item.slug ? 'https://friendlypartyrentalnyc.com/api/item-image/' + encodeURIComponent(item.slug) : null;
        await db.query(
          `UPDATE products SET name=$2,price_per_day=$3,photo_url=COALESCE($4,photo_url),active=true,
             metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('nycCatalogSlug',$5,'nycCatalogSyncedAt',now()::text),updated_at=now()
           WHERE id=$1`,
          [product.id,item.name,price,photoUrl,item.slug]
        );
      } else if (typeof product.external_id === 'string' && product.external_id.startsWith('fpr:')) {
        disabled++;
        await db.query("UPDATE products SET active=false,metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('nycCatalogUnavailable',true),updated_at=now() WHERE id=$1",[product.id]);
      }
    }

    const active = Number((await db.query('SELECT count(*)::int AS count FROM products WHERE tenant_id=$1 AND active=true',[tenant.id])).rows[0].count);
    if (mapped < 150 || active < 150) throw new Error('Too few RentSketch products mapped to NYC catalog: mapped=' + mapped + ' active=' + active);

    console.log(JSON.stringify({ tenant:TENANT, source:CATALOG_URL, nycPublicItems:publicItems.length, rentSketchProducts:products.length, mapped, disabled, active }));
    await db.pool.end();
  } catch (error) {
    console.error('[friendly-nyc-sync] ' + (error instanceof Error ? error.message : String(error)));
    try { await db.pool.end(); } catch {}
    process.exit(1);
  }
})();
