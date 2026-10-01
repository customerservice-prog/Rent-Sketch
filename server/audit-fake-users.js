#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async()=>{
  try{
    const rows=(await pool.query(`
      SELECT u.id,u.email,u.display_name,u.is_platform_admin,u.created_at,
             COUNT(tm.id)::int AS membership_count,
             COALESCE(json_agg(json_build_object('slug',t.slug,'name',t.name,'role',tm.role))
               FILTER (WHERE tm.id IS NOT NULL),'[]'::json) AS memberships
      FROM users u
      LEFT JOIN tenant_memberships tm ON tm.user_id=u.id
      LEFT JOIN tenants t ON t.id=tm.tenant_id
      GROUP BY u.id
      ORDER BY u.created_at,u.email
    `)).rows;
    console.log('USER_AUDIT '+JSON.stringify({count:rows.length,users:rows}));
  } finally { await pool.end(); }
})().catch(e=>{console.error('USER_AUDIT_ERROR',e.message);process.exit(1)});
