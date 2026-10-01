#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.status,
        p.payment_type,
        p.amount_cents,
        p.currency,
        p.customer_email,
        p.stripe_checkout_session_id,
        p.stripe_payment_intent_id,
        p.duration_days,
        p.created_at,
        p.entitlement_id,
        d.id AS design_id,
        d.event_type,
        d.created_at AS design_created_at,
        COALESCE(t.slug,'generic') AS tenant_slug,
        d.scene->>'eventName' AS event_name,
        d.scene->>'qaProof' AS qa_proof,
        d.scene->>'qaSavedProof' AS qa_saved_proof,
        e.status AS entitlement_status,
        e.expires_at
      FROM consumer_payments p
      LEFT JOIN designs d ON d.id=p.design_id
      LEFT JOIN tenants t ON t.id=d.tenant_id
      LEFT JOIN entitlements e ON e.id=p.entitlement_id
      ORDER BY p.created_at ASC
    `);
    console.log('EVENT_PASS_AUDIT ' + JSON.stringify({ count: result.rows.length, rows: result.rows }));
  } finally {
    await pool.end();
  }
})().catch(err => { console.error('EVENT_PASS_AUDIT_ERROR', err.message); process.exit(1); });
