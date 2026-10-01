#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async()=>{
  const c=await pool.connect();
  try{
    await c.query('BEGIN');
    const candidates=(await c.query(`
      SELECT d.id,d.tenant_id,COALESCE(t.slug,'generic') AS tenant_slug,d.event_type,d.project_name,d.created_at,
             d.scene->>'eventName' AS event_name,
             d.scene->>'qaProof' AS qa_proof,
             d.scene->>'qaSavedProof' AS qa_saved_proof
      FROM designs d
      LEFT JOIN tenants t ON t.id=d.tenant_id
      WHERE (
        lower(COALESCE(d.event_type,''))='qa'
        OR lower(COALESCE(d.project_name,'')) ~ '(^|[^a-z0-9])(qa|test|fake|fixture|regression|claude)([^a-z0-9]|$)'
        OR lower(COALESCE(d.scene->>'eventName','')) ~ '(^|[^a-z0-9])(qa|test|fake|fixture|regression|claude)([^a-z0-9]|$)'
        OR d.scene ? 'qaProof'
        OR d.scene ? 'qaSavedProof'
        OR (
          d.created_at <= now()-interval '2 hours'
          AND d.owner_user_id IS NULL
          AND COALESCE(d.project_name,'')=''
          AND d.event_type IS NULL
          AND d.guest_count IS NULL
          AND d.estimate_total IS NULL
          AND COALESCE(d.scene->>'eventName','') IN ('','My Event')
          AND NOT (d.scene ? 'tentId')
          AND NOT (d.scene ? 'tent')
          AND jsonb_array_length(CASE WHEN jsonb_typeof(d.scene->'objects')='array' THEN d.scene->'objects' ELSE '[]'::jsonb END)=0
        )
      )
      AND NOT EXISTS (SELECT 1 FROM quote_requests q WHERE q.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM entitlements e WHERE e.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM consumer_payments p WHERE p.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM design_share_links s WHERE s.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM design_revisions r WHERE r.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM design_background_photos b WHERE b.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM designs child WHERE child.project_root_id=d.id)
      ORDER BY d.created_at
    `)).rows;

    const ids=candidates.map(x=>x.id);
    const deleted=ids.length?(await c.query(
      'DELETE FROM designs WHERE id=ANY($1::uuid[]) RETURNING id',
      [ids]
    )).rowCount:0;

    const remaining=(await c.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(scene->'objects')='array' THEN scene->'objects' ELSE '[]'::jsonb END),0)>0
                  OR guest_count IS NOT NULL OR event_type IS NOT NULL OR estimate_total IS NOT NULL OR project_name<>''
             )::int AS meaningful
      FROM designs
    `)).rows[0];

    await c.query('COMMIT');
    console.log('ORPHAN_DESIGN_CLEANUP '+JSON.stringify({
      candidates:candidates.length,
      deleted,
      deletedByTenant:candidates.reduce((a,x)=>{a[x.tenant_slug]=(a[x.tenant_slug]||0)+1;return a;},{}),
      remaining
    }));
  }catch(e){
    try{await c.query('ROLLBACK')}catch(_){}
    throw e;
  }finally{
    c.release();await pool.end();
  }
})().catch(e=>{console.error('ORPHAN_DESIGN_CLEANUP_ERROR',e.message);process.exit(1)});
