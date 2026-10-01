const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Friendly NYC gets a dedicated free tenant with hidden designer prices',()=>{
  const sql=read('server/migrations/024_friendly_nyc_tenant.sql');
  assert.match(sql,/'friendly-nyc'/);
  assert.match(sql,/show_prices[\s\S]*false/);
  assert.match(sql,/customer_access.*'free'/s);
  assert.match(sql,/friendlypartyrentalnyc\.com/);
  assert.match(sql,/INSERT INTO products/);
  assert.match(sql,/price_per_day[\s\S]*NULL/);
});

test('order access routes keep Syracuse and NYC tenants isolated',()=>{
  const route=read('server/src/routes/consumerEventPass.js');
  const access=read('my-event/access.js');
  const relay=read('server/src/eventPassEmail.js');
  const quotes=read('server/src/routes/quoteRequests.js');
  const paywall=read('js/ui/paywall.js');
  const intake=read('js/ui/intake.js');
  assert.match(route,/\['friendly','friendly-nyc'\]/);
  assert.match(route,/lookupOrder\(\{ orderNumber, firstName \}, tenantSlug\)/);
  assert.match(route,/accessUrl\(design, tenantSlug/);
  assert.match(access,/friendly-nyc/);
  assert.match(access,/tenant: tenant \|\| 'friendly'/);
  assert.match(relay,/FRIENDLY_NYC_RENTSKETCH_WEBHOOK_URL/);
  assert.match(relay,/FRIENDLY_NYC_RENTSKETCH_WEBHOOK_SECRET/);
  assert.match(quotes,/FRIENDLY_NYC_RENTSKETCH_WEBHOOK_URL/);
  assert.match(quotes,/FRIENDLY_NYC_RENTSKETCH_WEBHOOK_SECRET/);
  assert.match(paywall,/friendly-nyc/);
  assert.match(intake,/friendly-nyc/);
  assert.match(intake,/Riverdale, NY 10463/);
  assert.doesNotMatch(sql,/price_per_day[\s\S]{0,100}p\.price_per_day/);
});
