#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async()=>{
  try{
    const rows=(await pool.query(`
      SELECT d.id,COALESCE(t.slug,'generic') AS tenant_slug,d.created_at,d.updated_at,
             d.owner_user_id IS NOT NULL AS staff_owned,d.event_type,d.guest_count,d.estimate_total,d.project_name,
             d.scene->>'eventName' AS event_name,
             d.scene->>'tentId' AS tent_id,
             d.scene->'tent'->>'id' AS tent_object_id,
             jsonb_array_length(CASE WHEN jsonb_typeof(d.scene->'objects')='array' THEN d.scene->'objects' ELSE '[]'::jsonb END)::int AS object_count,
             (SELECT COUNT(*)::int FROM quote_requests q WHERE q.design_id=d.id) AS quotes,
             (SELECT COUNT(*)::int FROM entitlements e WHERE e.design_id=d.id) AS entitlements,
             (SELECT COUNT(*)::int FROM consumer_payments p WHERE p.design_id=d.id) AS payments,
             (SELECT COUNT(*)::int FROM design_share_links s WHERE s.design_id=d.id) AS shares,
             (SELECT COUNT(*)::int FROM design_revisions r WHERE r.design_id=d.id) AS revisions,
             (SELECT COUNT(*)::int FROM design_background_photos b WHERE b.design_id=d.id) AS photos,
             (SELECT COUNT(*)::int FROM designs child WHERE child.project_root_id=d.id) AS alternatives
      FROM designs d
      LEFT JOIN tenants t ON t.id=d.tenant_id
      WHERE COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(d.scene->'objects')='array' THEN d.scene->'objects' ELSE '[]'::jsonb END),0)=0
        AND COALESCE(d.scene->>'tentId','')=''
        AND COALESCE(d.scene->'tent'->>'id','')=''
        AND d.guest_count IS NULL
        AND d.event_type IS NULL
        AND d.estimate_total IS NULL
        AND COALESCE(d.project_name,'')=''
        AND d.owner_user_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM quote_requests q WHERE q.design_id=d.id)
      ORDER BY d.created_at
    `)).rows;
    const now=Date.now();
    const summary={
      count:rows.length,
      older24h:rows.filter(r=>now-new Date(r.created_at).getTime()>86400000).length,
      older7d:rows.filter(r=>now-new Date(r.created_at).getTime()>7*86400000).length,
      withDependencies:rows.filter(r=>Number(r.entitlements)+Number(r.payments)+Number(r.shares)+Number(r.revisions)+Number(r.photos)+Number(r.alternatives)>0).length,
      rows:rows.map(r=>({
        id:r.id,tenant:r.tenant_slug,createdAt:r.created_at,eventName:r.event_name||'',
        entitlements:Number(r.entitlements),payments:Number(r.payments),shares:Number(r.shares),
        revisions:Number(r.revisions),photos:Number(r.photos),alternatives:Number(r.alternatives)
      }))
    };
    console.log('ORPHAN_DESIGN_AUDIT '+JSON.stringify(summary));
  }finally{await pool.end();}
})().catch(e=>{console.error('ORPHAN_DESIGN_AUDIT_ERROR',e.message);process.exit(1)});
