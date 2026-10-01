#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const slugs = [
  'claude-qa-redteam-tenant',
  'claude-qa-trial-banner-test',
  'claude-qa-trial-regression',
  'claude-qa-ui-test-rentals',
  'claude-qa-test-rentals',
  'sample-event-rentals'
];

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = (await client.query(
      `SELECT t.id,t.slug,t.name,
              (SELECT COUNT(*)::int FROM quote_requests q WHERE q.tenant_id=t.id) AS request_count,
              (SELECT COUNT(*)::int FROM quote_requests q WHERE q.tenant_id=t.id
                 AND (q.payment_status='paid' OR COALESCE(q.amount_paid_cents,0)>0 OR q.stripe_payment_intent_id IS NOT NULL)) AS paid_count,
              (SELECT COUNT(*)::int FROM subscriptions s WHERE s.tenant_id=t.id
                 AND s.provider_subscription_id IS NOT NULL) AS provider_sub_count
       FROM tenants t WHERE t.slug=ANY($1::text[]) ORDER BY t.slug`,
      [slugs]
    )).rows;
    const blocked = rows.filter(r => Number(r.paid_count) > 0 || Number(r.provider_sub_count) > 0);
    if (blocked.length) throw new Error('Billing-linked synthetic tenant found; cleanup stopped');

    const ids = rows.map(r => r.id);
    const userIds = ids.length ? (await client.query(
      'SELECT DISTINCT user_id FROM tenant_memberships WHERE tenant_id=ANY($1::uuid[])',
      [ids]
    )).rows.map(r => r.user_id) : [];

    const deleted = ids.length ? (await client.query(
      'DELETE FROM tenants WHERE id=ANY($1::uuid[]) RETURNING id,slug,name',
      [ids]
    )).rows : [];

    const orphanUsers = userIds.length ? (await client.query(
      `DELETE FROM users u
       WHERE u.id=ANY($1::uuid[]) AND u.is_platform_admin IS NOT TRUE
         AND NOT EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.user_id=u.id)
       RETURNING id,email,display_name`,
      [userIds]
    )).rows : [];

    const remaining = (await client.query(
      'SELECT slug,name FROM tenants ORDER BY slug'
    )).rows;

    await client.query('COMMIT');
    console.log('KNOWN_FAKE_TENANT_CLEANUP '+JSON.stringify({
      audited: rows.map(r => ({slug:r.slug,name:r.name,requests:Number(r.request_count||0)})),
      deleted: deleted.map(r => ({slug:r.slug,name:r.name})),
      orphanUsersDeleted: orphanUsers.map(r => r.email),
      remaining
    }));
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
})().catch(err => { console.error('KNOWN_FAKE_TENANT_CLEANUP_ERROR',err.message); process.exit(1); });
