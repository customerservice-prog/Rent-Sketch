#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MARKER = 'platform_fake_tenant_cleanup_20261001_v1';
const PROTECTED = new Set(['friendly', 'friendly-nyc', 'generic']);

function syntheticReasons(row) {
  const slug = String(row.slug || '').trim().toLowerCase();
  const name = String(row.name || '').trim().toLowerCase();
  const email = String(row.contact_email || '').trim().toLowerCase();
  const reasons = [];

  if (PROTECTED.has(slug)) return [];

  const domain = email.includes('@') ? email.split('@').pop() : '';
  if (domain === 'rentsketch.qa') reasons.push('rentsketch.qa email');
  if (domain === 'example.invalid' || domain === 'example.test' || domain.endsWith('.invalid')) {
    reasons.push('reserved synthetic email domain');
  }

  if (/^rentsketch[-_]?qa(?:[-_]|$)/.test(slug)) reasons.push('RentSketch QA slug');
  if (/^qa(?:[-_]|$)/.test(slug)) reasons.push('QA slug');
  if (/^test(?:[-_]|$)/.test(slug)) reasons.push('test slug');
  if (/^fake(?:[-_]|$)/.test(slug)) reasons.push('fake slug');
  if (/^fixture(?:[-_]|$)/.test(slug)) reasons.push('fixture slug');
  if (/^regression(?:[-_]|$)/.test(slug)) reasons.push('regression slug');
  if (/(?:^|[-_])launch[-_]?qa(?:[-_]|$)/.test(slug)) reasons.push('launch QA slug');

  if (/\bqa\s+(test\s+)?tenant\b/.test(name)) reasons.push('QA tenant name');
  if (/\b(test|fake|fixture|regression)\s+tenant\b/.test(name)) reasons.push('synthetic tenant name');
  if (/^rentsketch\s+qa\b/.test(name)) reasons.push('RentSketch QA name');

  return [...new Set(reasons)];
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const already = (await client.query(
      'SELECT id,metadata FROM platform_admin_audit WHERE action=$1 LIMIT 1',
      [MARKER]
    )).rows[0];
    if (already) {
      await client.query('ROLLBACK');
      console.log('FAKE_TENANT_CLEANUP ' + JSON.stringify({ alreadyApplied: true, metadata: already.metadata || null }));
      return;
    }

    const tenants = (await client.query(`
      SELECT t.id,t.slug,t.name,t.contact_email,t.subscription_plan,t.subscription_status,t.created_at,
             (SELECT COUNT(*)::int FROM tenant_memberships tm WHERE tm.tenant_id=t.id) AS members,
             (SELECT COUNT(*)::int FROM designs d WHERE d.tenant_id=t.id) AS designs,
             (SELECT COUNT(*)::int FROM quote_requests q WHERE q.tenant_id=t.id) AS requests,
             (SELECT COUNT(*)::int FROM products p WHERE p.tenant_id=t.id) AS products,
             (SELECT COUNT(*)::int FROM subscriptions s WHERE s.tenant_id=t.id) AS subscriptions,
             (SELECT COUNT(*)::int FROM quote_requests q WHERE q.tenant_id=t.id
               AND (q.payment_status='paid' OR coalesce(q.amount_paid_cents,0)>0)) AS paid_requests
      FROM tenants t
      ORDER BY t.created_at
    `)).rows;

    const candidates = tenants
      .map(t => ({ row: t, reasons: syntheticReasons(t) }))
      .filter(x => x.reasons.length > 0);

    const before = tenants.length;
    const deleted = [];

    if (candidates.length) {
      const ids = candidates.map(x => x.row.id);
      const result = await client.query(
        'DELETE FROM tenants WHERE id = ANY($1::uuid[]) RETURNING id,slug,name,contact_email',
        [ids]
      );
      deleted.push(...result.rows);
    }

    const orphanSyntheticUsers = (await client.query(`
      DELETE FROM users u
      WHERE u.is_platform_admin IS NOT TRUE
        AND NOT EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.user_id=u.id)
        AND (
          lower(u.email) LIKE '%@rentsketch.qa'
          OR lower(u.email) LIKE '%@example.invalid'
          OR lower(u.email) LIKE '%@example.test'
          OR lower(u.email) ~ '@[^@]+\\.invalid$'
        )
      RETURNING u.id,u.email,u.display_name
    `)).rows;

    const after = Number((await client.query('SELECT COUNT(*) AS n FROM tenants')).rows[0].n);
    const remainingSynthetic = (await client.query('SELECT id,slug,name,contact_email FROM tenants ORDER BY created_at')).rows
      .map(t => ({ ...t, reasons: syntheticReasons(t) }))
      .filter(t => t.reasons.length > 0);

    const summary = {
      before,
      deletedCount: deleted.length,
      deleted: deleted.map(d => ({ id: d.id, slug: d.slug, name: d.name })),
      candidateDetails: candidates.map(x => ({
        id: x.row.id,
        slug: x.row.slug,
        name: x.row.name,
        reasons: x.reasons,
        members: Number(x.row.members || 0),
        designs: Number(x.row.designs || 0),
        requests: Number(x.row.requests || 0),
        products: Number(x.row.products || 0),
        subscriptions: Number(x.row.subscriptions || 0),
        paidRequests: Number(x.row.paid_requests || 0)
      })),
      orphanSyntheticUsersDeleted: orphanSyntheticUsers.map(u => ({ id: u.id, email: u.email })),
      after,
      remainingSyntheticCount: remainingSynthetic.length,
      remainingSynthetic: remainingSynthetic.map(t => ({ id: t.id, slug: t.slug, name: t.name, reasons: t.reasons }))
    };

    await client.query(`
      INSERT INTO platform_admin_audit(action,target_type,target_label,metadata)
      VALUES($1,'platform','synthetic-tenant-cleanup',$2::jsonb)
    `, [MARKER, JSON.stringify(summary)]);

    await client.query('COMMIT');
    console.log('FAKE_TENANT_CLEANUP ' + JSON.stringify(summary));
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('FAKE_TENANT_CLEANUP_ERROR', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();