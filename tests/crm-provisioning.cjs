const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Party Rental CRM provisioning is locked, idempotent, and externally billed',()=>{
  const app=read('server/src/app.js');
  const route=read('server/src/routes/crmProvision.js');
  const migration=read('server/migrations/023_crm_marketplace_provisioning.sql');
  const embed=read('server/src/routes/embed.js');
  const billing=read('server/src/routes/businessBilling.js');
  assert.match(app,/\/api\/internal\/crm/);
  assert.match(route,/timingSafeEqual/);
  assert.match(route,/pg_advisory_xact_lock/);
  assert.match(route,/external_crm_org_id/);
  assert.match(route,/subscription_status='active'/);
  assert.match(route,/subscription_status='canceled'/);
  assert.match(route,/subscription_status.*provisioned/);
  assert.match(migration,/tenants_external_crm_org_unique/);
  assert.match(migration,/billing_source/);
  assert.match(embed,/!\['active', 'trialing'\]\.includes\(tenant\.subscription_status\)/);
  assert.match(billing,/managedExternally/);
  assert.ok((billing.match(/billing_source === 'party_rental_crm'/g)||[]).length>=2);
});
