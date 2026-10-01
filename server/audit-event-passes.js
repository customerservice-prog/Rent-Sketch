#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const CUTOFF = '2026-10-01T12:06:40.743Z';

function lower(v){ return String(v || '').trim().toLowerCase(); }
function syntheticEmail(v){
  const e=lower(v);
  return !!e && (
    /(^|[._+\-])(test|qa|fake|fixture|regression|claude)([._+\-]|@)/.test(e) ||
    e.endsWith('@rentsketch.qa') ||
    e.endsWith('@example.invalid') ||
    e.endsWith('@example.test') ||
    e === 'test@example.com' ||
    e === 'audit-test@example.com' ||
    e.startsWith('claude-qa-') ||
    e.startsWith('qa-') || e.startsWith('qa@')
  );
}

(async () => {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const rows=(await client.query(`
      SELECT p.id,p.entitlement_id,p.design_id,p.status,p.customer_email,
             p.stripe_checkout_session_id,p.stripe_payment_intent_id,p.created_at,
             d.event_type,d.scene->>'qaProof' AS qa_proof,d.scene->>'qaSavedProof' AS qa_saved_proof
      FROM consumer_payments p
      LEFT JOIN designs d ON d.id=p.design_id
      WHERE p.created_at <= $1::timestamptz
      ORDER BY p.created_at
    `,[CUTOFF])).rows;

    const candidates=rows.filter(r=>{
      const checkout=String(r.stripe_checkout_session_id||'');
      const intent=String(r.stripe_payment_intent_id||'');
      const explicitQa=
        checkout.startsWith('cs_test_') ||
        checkout.startsWith('qa_') ||
        intent.startsWith('qa_') ||
        lower(r.event_type)==='qa' ||
        !!r.qa_proof || !!r.qa_saved_proof ||
        syntheticEmail(r.customer_email);
      const abandoned=
        r.status==='pending' &&
        !lower(r.customer_email) &&
        !r.stripe_payment_intent_id &&
        !r.entitlement_id;
      return explicitQa || abandoned;
    });

    const ids=candidates.map(r=>r.id);
    const entitlementIds=[...new Set(candidates.map(r=>r.entitlement_id).filter(Boolean))];

    const deletedPayments=ids.length
      ? (await client.query('DELETE FROM consumer_payments WHERE id=ANY($1::uuid[]) RETURNING id',[ids])).rowCount
      : 0;

    const deletedEntitlements=entitlementIds.length
      ? (await client.query(`
          DELETE FROM entitlements e
          WHERE e.id=ANY($1::uuid[])
            AND NOT EXISTS (SELECT 1 FROM consumer_payments p WHERE p.entitlement_id=e.id)
          RETURNING e.id
        `,[entitlementIds])).rowCount
      : 0;

    const remaining=(await client.query(`
      SELECT p.id,p.status,p.customer_email,p.stripe_checkout_session_id,p.stripe_payment_intent_id,p.created_at
      FROM consumer_payments p ORDER BY p.created_at
    `)).rows;

    await client.query('COMMIT');
    console.log('EVENT_PASS_CLEANUP '+JSON.stringify({
      cutoff:CUTOFF,
      candidates:candidates.length,
      deletedPayments,
      deletedEntitlements,
      remainingCount:remaining.length,
      remaining
    }));
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
})().catch(err=>{console.error('EVENT_PASS_CLEANUP_ERROR',err.message);process.exit(1);});
