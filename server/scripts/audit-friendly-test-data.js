#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const requestTestSql = `
  (
    lower(q.customer_name) ~ '(^|[^a-z0-9])(test|qa|fake|demo|fixture|regression|claude)([^a-z0-9]|$)'
    OR lower(q.customer_name) LIKE '%access engine%'
    OR lower(q.customer_name) LIKE '%access-engine%'
    OR lower(q.customer_email) ~ '@example\\.(com|invalid)$'
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

(async()=>{
  try{
    const tenantResult=await pool.query("SELECT id,name FROM tenants WHERE slug='friendly' LIMIT 1");
    if(!tenantResult.rows[0]) throw new Error('friendly tenant not found');
    const tenantId=tenantResult.rows[0].id;

    const totalRequests=await pool.query('SELECT count(*)::int AS count FROM quote_requests WHERE tenant_id=$1',[tenantId]);
    const fakeRequests=await pool.query(`
      SELECT q.id,q.customer_name,q.customer_email,q.status,q.estimate_total,q.created_at,q.design_id
      FROM quote_requests q
      WHERE q.tenant_id=$1 AND ${requestTestSql}
      ORDER BY q.created_at ASC
    `,[tenantId]);

    const totalDesigns=await pool.query('SELECT count(*)::int AS count FROM designs WHERE tenant_id=$1',[tenantId]);
    const linkedFakeDesigns=await pool.query(`
      SELECT DISTINCT d.id,d.event_type,d.guest_count,d.project_name,d.estimate_total,d.created_at,d.updated_at,
             left(coalesce(d.anonymous_session_id,''),60) AS anonymous_session_id
      FROM designs d
      JOIN quote_requests q ON q.design_id=d.id
      WHERE d.tenant_id=$1 AND q.tenant_id=$1 AND ${requestTestSql}
      ORDER BY d.created_at ASC
    `,[tenantId]);
    const markedDesigns=await pool.query(`
      SELECT d.id,d.event_type,d.guest_count,d.project_name,d.estimate_total,d.created_at,d.updated_at,
             left(coalesce(d.anonymous_session_id,''),60) AS anonymous_session_id
      FROM designs d
      WHERE d.tenant_id=$1 AND ${designMarkerSql}
      ORDER BY d.created_at ASC
    `,[tenantId]);

    const recentDesigns=await pool.query(`
      SELECT d.id,d.event_type,d.guest_count,d.project_name,d.estimate_total,d.created_at,d.updated_at,
             left(coalesce(d.anonymous_session_id,''),40) AS anonymous_session_id
      FROM designs d
      WHERE d.tenant_id=$1
      ORDER BY d.created_at DESC
      LIMIT 60
    `,[tenantId]);

    console.log('FRIENDLY_TEST_DATA_AUDIT_BEGIN');
    console.log(JSON.stringify({
      tenant: tenantResult.rows[0].name,
      totalQuoteRequests: totalRequests.rows[0].count,
      clearlySyntheticQuoteRequests: fakeRequests.rows,
      totalDesigns: totalDesigns.rows[0].count,
      designsLinkedToSyntheticRequests: linkedFakeDesigns.rows,
      designsWithExplicitTestMarkers: markedDesigns.rows,
      recentDesignMetadata: recentDesigns.rows
    },null,2));
    console.log('FRIENDLY_TEST_DATA_AUDIT_END');
  } finally {
    await pool.end();
  }
})().catch(err=>{console.error('FRIENDLY_TEST_DATA_AUDIT_ERROR',err);process.exit(1);});

// dry-run deployment trigger 2026-10-01
