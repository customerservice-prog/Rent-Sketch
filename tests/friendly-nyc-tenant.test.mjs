import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Friendly NYC is a real isolated tenant with the approved 198-item seed',()=>{
  const migration=read('server/migrations/024_friendly_nyc_tenant.sql');
  assert.match(migration,/slug='friendly-nyc'|'friendly-nyc'/);
  assert.equal((migration.match(/\('fpr:/g)||[]).length,198);
  assert.match(migration,/customer_access='free'|'free',NULL,30,7,false/);
  assert.match(migration,/friendlypartyrentalnyc\.com/);
  assert.doesNotMatch(migration,/FRIENDLY_NYC_RENTSKETCH_WEBHOOK_SECRET/);
});

test('NYC live refresh cannot deactivate approved seed rows',()=>{
  const sync=read('server/src/friendlyCatalogSync.js');
  assert.match(sync,/syncNycCatalog/);
  assert.match(sync,/friendly-nyc/);
  assert.doesNotMatch(sync,/tenant\.id,seen\]\);\s*\}/);
});

test('NYC order recovery stays tenant-scoped end to end',()=>{
  const consumer=read('server/src/routes/consumerEventPass.js');
  const order=read('server/src/friendlyOrderAccess.js');
  const email=read('server/src/eventPassEmail.js');
  const paywall=read('js/ui/paywall.js');
  const access=read('my-event/access.js');
  assert.match(consumer,/\['friendly','friendly-nyc'\]/);
  assert.match(order,/tenant\.slug\+'-order:'/);
  assert.match(email,/FRIENDLY_NYC_RENTSKETCH_WEBHOOK_SECRET/);
  assert.match(paywall,/\['friendly', 'friendly-nyc', 'generic'\]/);
  assert.match(access,/tenant === 'friendly-nyc'/);
  assert.match(access,/destination\.searchParams\.get\('tenant'\) !== tenant/);
});
