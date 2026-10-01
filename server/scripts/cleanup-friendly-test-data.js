#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MARKER='friendly_test_cleanup_20261001_v1';

const requestTestSql = `
(
  lower(q.customer_name) ~ '(^|[^a-z0-9])(test|qa|fake|demo|fixture|regression|claude)([^a-z0-9]|$)'
  OR lower(q.customer_name) LIKE '%access engine%'
  OR lower(q.customer_name) LIKE '%access-engine%'
  OR lower(q.customer_email) ~ '@example\\.(com|invalid|test)$'
  OR lower(q.customer_email) ~ '(^|[._+\\-])(test|qa|fake|demo|fixture|regression|claude)([._+\\-]|@)'
  OR lower(q.customer_email) LIKE '%access-engine%'
  OR lower(q.customer_email) LIKE '%access_engine%'
)
`;

const designMarkerSql = `
(
  lower(coalesce(d.project_name,'')) ~ '(^|[^a-z0-9])(test|qa|fake|demo|fixture|regression|claude)([^a-z0-9]|$)'
  OR lower(coalesce(d.event_type,'')) ~ '(^|[^a-z0-9])(test|qa|fake|demo|fixture|regression|claude)([^a-z0-9]|$)'
  OR lower(coalesce(d.anonymous_session_id,'')) ~ '(^|[^a-z0-9])(test|qa|fake|demo|fixture|regression|claude)([^a-z0-9]|$)'
  OR lower(coalesce(d.anonymous_session_id,'')) LIKE '%access-engine%'
  OR lower(coalesce(d.anonymous_session_id,'')) LIKE '%access_engine%'
)
`;

const designSceneTestSql = `
(
  lower(coalesce(d.scene->'customer'->>'name','')) ~ '(^|[^a-z0-9])(test|qa|fake|demo|fixture|regression|claude)([^a-z0-9]|$)'
  OR lower(coalesce(d.scene->'customer'->>'email','')) ~ '@example\\.(com|invalid|test)$'
  OR lower(coalesce(d.scene->'customer'->>'email','')) ~ '(^|[._+\\-])(test|qa|fake|demo|fixture|regression|claude)([._+\\-]|@)'
  OR lower(coalesce(d.scene->>'eventName','')) ~ '(^|[^a-z0-9])(test|qa|fake|demo|fixture|regression|claude)([^a-z0-9]|$)'
)
`;

(async()=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const already=(await client.query('SELECT id FROM platform_admin_audit WHERE action=$1 LIMIT 1',[MARKER])).rows[0];
    if(already){
      const markerV2='friendly_prelaunch_design_cleanup_20261001_v2';
      const second=(await client.query('SELECT id FROM platform_admin_audit WHERE action=$1 LIMIT 1',[markerV2])).rows[0];
      if(second){
        await client.query('ROLLBACK');
        console.log('FRIENDLY_PRELAUNCH_CLEANUP '+JSON.stringify({alreadyApplied:true}));
        return;
      }
      const tenant=(await client.query("SELECT id FROM tenants WHERE slug='friendly' LIMIT 1")).rows[0];
      if(!tenant) throw new Error('friendly tenant not found');
      const cutoff='2026-09-23T00:00:00Z';
      const before=Number((await client.query('SELECT count(*) AS n FROM designs WHERE tenant_id=$1',[tenant.id])).rows[0].n);
      const deleted=await client.query(`
        DELETE FROM designs d
        WHERE d.tenant_id=$1
          AND d.created_at < $2::timestamptz
          AND d.owner_user_id IS NULL
          AND d.project_root_id IS NULL
          AND coalesce(d.project_name,'')=''
          AND coalesce(d.site_notes,'')=''
          AND coalesce(d.crew_notes,'')=''
          AND (d.event_type IS NULL OR lower(d.event_type) IN ('wedding','qa'))
          AND nullif(d.scene->'customer'->>'name','') IS NULL
          AND nullif(d.scene->'customer'->>'email','') IS NULL
          AND nullif(d.scene->>'propertyAddress','') IS NULL
          AND NOT EXISTS (SELECT 1 FROM quote_requests qr WHERE qr.design_id=d.id)
          AND NOT EXISTS (SELECT 1 FROM consumer_payments cp WHERE cp.design_id=d.id AND cp.status='paid')
          AND NOT EXISTS (SELECT 1 FROM entitlements e WHERE e.design_id=d.id AND e.status='active')
          AND NOT EXISTS (SELECT 1 FROM design_share_links sl WHERE sl.design_id=d.id)
          AND NOT EXISTS (SELECT 1 FROM design_revisions dr WHERE dr.design_id=d.id)
          AND NOT EXISTS (SELECT 1 FROM design_background_photos bp WHERE bp.design_id=d.id)
          AND NOT EXISTS (SELECT 1 FROM designs child WHERE child.project_root_id=d.id)
        RETURNING d.id
      `,[tenant.id,cutoff]);
      const after=Number((await client.query('SELECT count(*) AS n FROM designs WHERE tenant_id=$1',[tenant.id])).rows[0].n);
      const metadata={tenant:'friendly',cutoff,before,deleted:deleted.rowCount,after};
      await client.query(`
        INSERT INTO platform_admin_audit(action,target_type,target_label,metadata)
        VALUES($1,'tenant','friendly',$2::jsonb)
      `,[markerV2,JSON.stringify(metadata)]);
      await client.query('COMMIT');
      console.log('FRIENDLY_PRELAUNCH_CLEANUP '+JSON.stringify(metadata));
      return;
    }
    const tenant=(await client.query("SELECT id FROM tenants WHERE slug='friendly' LIMIT 1")).rows[0];
    if(!tenant) throw new Error('friendly tenant not found');
    const tenantId=tenant.id;

    const totalsBefore={
      quoteRequests:Number((await client.query('SELECT count(*) AS n FROM quote_requests WHERE tenant_id=$1',[tenantId])).rows[0].n),
      designs:Number((await client.query('SELECT count(*) AS n FROM designs WHERE tenant_id=$1',[tenantId])).rows[0].n)
    };

    const strictDesignIds=(await client.query(`
      SELECT DISTINCT d.id
      FROM designs d
      LEFT JOIN quote_requests q ON q.design_id=d.id AND q.tenant_id=$1
      WHERE d.tenant_id=$1 AND (
        (${designMarkerSql}) OR
        (${designSceneTestSql}) OR
        (q.id IS NOT NULL AND ${requestTestSql})
      )
    `,[tenantId])).rows.map(r=>r.id);

    const requestDelete=await client.query(`
      DELETE FROM quote_requests q
      WHERE q.tenant_id=$1
        AND ${requestTestSql}
        AND coalesce(q.payment_status,'unpaid') <> 'paid'
        AND coalesce(q.amount_paid_cents,0)=0
        AND q.stripe_payment_intent_id IS NULL
      RETURNING q.id
    `,[tenantId]);

    const protectedSyntheticRequests=Number((await client.query(`
      SELECT count(*) AS n FROM quote_requests q
      WHERE q.tenant_id=$1 AND ${requestTestSql}
    `,[tenantId])).rows[0].n);

    let strictDeleted=0;
    if(strictDesignIds.length){
      const deleted=await client.query(`
        DELETE FROM designs d
        WHERE d.id = ANY($1::uuid[])
          AND d.tenant_id=$2
          AND NOT EXISTS (SELECT 1 FROM consumer_payments cp WHERE cp.design_id=d.id AND cp.status='paid')
          AND NOT EXISTS (SELECT 1 FROM quote_requests qr WHERE qr.design_id=d.id)
        RETURNING d.id
      `,[strictDesignIds,tenantId]);
      strictDeleted=deleted.rowCount;
    }

    const emptyDirectDeleted=await client.query(`
      DELETE FROM designs d
      WHERE d.tenant_id=$1
        AND d.anonymous_session_id LIKE 'direct_%'
        AND d.event_type IS NULL
        AND d.guest_count IS NULL
        AND coalesce(d.project_name,'')=''
        AND CASE WHEN jsonb_typeof(d.scene->'objects')='array' THEN jsonb_array_length(d.scene->'objects') ELSE 0 END=0
        AND NOT EXISTS (SELECT 1 FROM consumer_payments cp WHERE cp.design_id=d.id AND cp.status='paid')
        AND NOT EXISTS (SELECT 1 FROM quote_requests qr WHERE qr.design_id=d.id)
      RETURNING d.id
    `,[tenantId]);

    const totalsAfter={
      quoteRequests:Number((await client.query('SELECT count(*) AS n FROM quote_requests WHERE tenant_id=$1',[tenantId])).rows[0].n),
      designs:Number((await client.query('SELECT count(*) AS n FROM designs WHERE tenant_id=$1',[tenantId])).rows[0].n)
    };

    const metadata={
      tenant:'friendly',
      totalsBefore,
      deleted:{
        syntheticQuoteRequests:requestDelete.rowCount,
        strictSyntheticDesigns:strictDeleted,
        emptyDirectCheckoutPlaceholders:emptyDirectDeleted.rowCount
      },
      protectedSyntheticRequests,
      totalsAfter
    };
    await client.query(`
      INSERT INTO platform_admin_audit(action,target_type,target_label,metadata)
      VALUES($1,'tenant','friendly',$2::jsonb)
    `,[MARKER,JSON.stringify(metadata)]);
    await client.query('COMMIT');
    console.log('FRIENDLY_TEST_DATA_CLEANUP '+JSON.stringify(metadata));
  }catch(err){
    try{await client.query('ROLLBACK');}catch(_){}
    throw err;
  }finally{
    client.release();
    await pool.end();
  }
})().catch(err=>{console.error('FRIENDLY_TEST_DATA_CLEANUP_ERROR',err.message);process.exit(1);});

// one-time cleanup deployment trigger 2026-10-01
