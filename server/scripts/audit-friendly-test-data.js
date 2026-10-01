#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
  try {
    const tenant=(await pool.query("SELECT id FROM tenants WHERE slug='friendly' LIMIT 1")).rows[0];
    if(!tenant) throw new Error('friendly tenant not found');
    const id=tenant.id;

    const totalQuoteRequests=Number((await pool.query('SELECT count(*) AS n FROM quote_requests WHERE tenant_id=$1',[id])).rows[0].n);
    const syntheticQuoteRequests=Number((await pool.query(`SELECT count(*) AS n FROM quote_requests q WHERE q.tenant_id=$1 AND ${requestTestSql}`,[id])).rows[0].n);
    const totalDesigns=Number((await pool.query('SELECT count(*) AS n FROM designs WHERE tenant_id=$1',[id])).rows[0].n);

    const linkedToSyntheticRequests=Number((await pool.query(`
      SELECT count(DISTINCT d.id) AS n
      FROM designs d JOIN quote_requests q ON q.design_id=d.id
      WHERE d.tenant_id=$1 AND q.tenant_id=$1 AND ${requestTestSql}
    `,[id])).rows[0].n);

    const explicitDesignMarkers=Number((await pool.query(`SELECT count(*) AS n FROM designs d WHERE d.tenant_id=$1 AND ${designMarkerSql}`,[id])).rows[0].n);
    const sceneTestMarkers=Number((await pool.query(`SELECT count(*) AS n FROM designs d WHERE d.tenant_id=$1 AND ${designSceneTestSql}`,[id])).rows[0].n);

    const strictSyntheticDesigns=Number((await pool.query(`
      WITH fake_requests AS (
        SELECT design_id FROM quote_requests q
        WHERE q.tenant_id=$1 AND q.design_id IS NOT NULL AND ${requestTestSql}
      )
      SELECT count(DISTINCT d.id) AS n
      FROM designs d LEFT JOIN fake_requests fr ON fr.design_id=d.id
      WHERE d.tenant_id=$1 AND (fr.design_id IS NOT NULL OR ${designMarkerSql} OR ${designSceneTestSql})
    `,[id])).rows[0].n);

    const stats=(await pool.query(`
      SELECT
        count(*) FILTER (WHERE owner_user_id IS NOT NULL)::int AS staff_owned,
        count(*) FILTER (WHERE anonymous_session_id LIKE 'direct_%')::int AS direct_checkout_placeholders,
        count(*) FILTER (
          WHERE anonymous_session_id LIKE 'direct_%'
          AND event_type IS NULL
          AND guest_count IS NULL
          AND coalesce(project_name,'')=''
          AND CASE WHEN jsonb_typeof(scene->'objects')='array' THEN jsonb_array_length(scene->'objects') ELSE 0 END=0
        )::int AS direct_empty,
        count(*) FILTER (WHERE event_type IS NOT NULL)::int AS with_event_type,
        count(*) FILTER (WHERE guest_count IS NOT NULL)::int AS with_guest_count,
        count(*) FILTER (WHERE coalesce(project_name,'')<>'')::int AS named_projects,
        count(*) FILTER (WHERE nullif(scene->>'propertyAddress','') IS NOT NULL)::int AS with_property_address
      FROM designs WHERE tenant_id=$1
    `,[id])).rows[0];

    console.log('FRIENDLY_TEST_DATA_AUDIT_COMPACT '+JSON.stringify({
      totalQuoteRequests,
      syntheticQuoteRequests,
      totalDesigns,
      linkedToSyntheticRequests,
      explicitDesignMarkers,
      sceneTestMarkers,
      strictSyntheticDesigns,
      ...stats
    }));
  } finally {
    await pool.end();
  }
})().catch(err=>{console.error('FRIENDLY_TEST_DATA_AUDIT_ERROR',err.message);process.exit(1);});
