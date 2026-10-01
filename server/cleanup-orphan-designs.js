#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async()=>{
  const c=await pool.connect();
  try{
    await c.query('BEGIN');
    const rows=(await c.query(`
      SELECT d.id,d.created_at
      FROM designs d
      LEFT JOIN tenants t ON t.id=d.tenant_id
      WHERE COALESCE(t.slug,'generic')='generic'
        AND d.created_at <= now()-interval '24 hours'
        AND d.owner_user_id IS NULL
        AND COALESCE(d.project_name,'')=''
        AND d.event_type IS NULL
        AND d.guest_count IS NULL
        AND d.estimate_total IS NULL
        AND COALESCE(d.scene->>'eventName','') IN ('','My Event')
        AND COALESCE(d.scene->>'tentId','')=''
        AND COALESCE(d.scene->'tent'->>'id','')=''
        AND jsonb_array_length(CASE WHEN jsonb_typeof(d.scene->'objects')='array' THEN d.scene->'objects' ELSE '[]'::jsonb END)=0
        AND NOT EXISTS (SELECT 1 FROM quote_requests q WHERE q.design_id=d.id)
        AND NOT EXISTS (SELECT 1 FROM entitlements e WHERE e.design_id=d.id)
        AND NOT EXISTS (SELECT 1 FROM consumer_payments p WHERE p.design_id=d.id)
        AND NOT EXISTS (SELECT 1 FROM design_share_links s WHERE s.design_id=d.id)
        AND NOT EXISTS (SELECT 1 FROM design_revisions r WHERE r.design_id=d.id)
        AND NOT EXISTS (SELECT 1 FROM design_background_photos b WHERE b.design_id=d.id)
        AND NOT EXISTS (SELECT 1 FROM designs child WHERE child.project_root_id=d.id)
      ORDER BY d.created_at
    `)).rows;

    const ids=rows.map(r=>r.id);
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
    console.log('STALE_GENERIC_DESIGN_CLEANUP '+JSON.stringify({candidates:rows.length,deleted,remaining}));
  }catch(e){
    try{await c.query('ROLLBACK')}catch(_){}
    throw e;
  }finally{c.release();await pool.end();}
})().catch(e=>{console.error('STALE_GENERIC_DESIGN_CLEANUP_ERROR',e.message);process.exit(1)});
