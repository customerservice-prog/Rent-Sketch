#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function lower(v){ return String(v || '').trim().toLowerCase(); }
function syntheticEmail(v){
  const e=lower(v);
  return !e ? false :
    /(^|[._+\-])(test|qa|fake|fixture|regression|claude)([._+\-]|@)/.test(e) ||
    e.endsWith('@rentsketch.qa') ||
    e.endsWith('@example.invalid') ||
    e.endsWith('@example.test') ||
    e === 'test@example.com' ||
    e === 'audit-test@example.com' ||
    e.startsWith('claude-qa-') ||
    e.startsWith('qa-') || e.startsWith('qa@');
}

(async () => {
  try {
    const rows=(await pool.query(`
      SELECT p.id,p.status,p.payment_type,p.amount_cents,p.currency,p.customer_email,
             p.stripe_checkout_session_id,p.stripe_payment_intent_id,p.duration_days,p.created_at,
             p.entitlement_id,d.id AS design_id,d.event_type,COALESCE(t.slug,'generic') AS tenant_slug,
             d.scene->>'eventName' AS event_name,d.scene->>'qaProof' AS qa_proof,
             d.scene->>'qaSavedProof' AS qa_saved_proof,e.status AS entitlement_status,e.expires_at
      FROM consumer_payments p
      LEFT JOIN designs d ON d.id=p.design_id
      LEFT JOIN tenants t ON t.id=d.tenant_id
      LEFT JOIN entitlements e ON e.id=p.entitlement_id
      ORDER BY p.created_at ASC
    `)).rows;

    const testMode=rows.filter(r=>String(r.stripe_checkout_session_id||'').startsWith('cs_test_'));
    const explicitQa=rows.filter(r=>
      String(r.stripe_checkout_session_id||'').startsWith('qa_') ||
      String(r.stripe_payment_intent_id||'').startsWith('qa_') ||
      lower(r.event_type)==='qa' || r.qa_proof || r.qa_saved_proof || syntheticEmail(r.customer_email)
    );
    const abandoned=rows.filter(r=>
      r.status==='pending' && !lower(r.customer_email) && !r.stripe_payment_intent_id && !r.entitlement_id
    );
    const livePaid=rows.filter(r=>
      r.status==='paid' &&
      String(r.stripe_checkout_session_id||'').startsWith('cs_live_') &&
      String(r.stripe_payment_intent_id||'').startsWith('pi_') &&
      !syntheticEmail(r.customer_email) &&
      lower(r.event_type)!=='qa' && !r.qa_proof && !r.qa_saved_proof
    );
    const other=rows.filter(r=>!testMode.includes(r)&&!explicitQa.includes(r)&&!abandoned.includes(r)&&!livePaid.includes(r));

    function brief(r){return {
      id:r.id,status:r.status,type:r.payment_type,amount:r.amount_cents,email:r.customer_email,
      checkout:r.stripe_checkout_session_id,intent:r.stripe_payment_intent_id,
      entitlement:r.entitlement_id,tenant:r.tenant_slug,eventType:r.event_type,eventName:r.event_name,createdAt:r.created_at
    };}

    console.log('EVENT_PASS_SUMMARY '+JSON.stringify({
      total:rows.length,
      testModeCount:testMode.length,
      explicitQaCount:explicitQa.length,
      abandonedPendingCount:abandoned.length,
      livePaidCount:livePaid.length,
      otherCount:other.length,
      livePaid:livePaid.map(brief),
      explicitQa:explicitQa.map(brief),
      other:other.map(brief),
      abandonedPending:abandoned.map(brief)
    }));
  } finally { await pool.end(); }
})().catch(err=>{console.error('EVENT_PASS_SUMMARY_ERROR',err.message);process.exit(1);});
