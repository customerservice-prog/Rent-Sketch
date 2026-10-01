#!/usr/bin/env node
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TARGET_EMAILS = [
  'qa-test@friendlypartyrental.test',
  'qa-test-business@example.com',
  'qa-test-1789585350320@example.com',
  'qa-checkout-1789585566694@example.com',
  'qa-diag-1789585711942@test.com'
];

(async()=>{
  const c=await pool.connect();
  try{
    await c.query('BEGIN');
    const targets=(await c.query(`
      SELECT u.id,u.email,u.display_name,u.is_platform_admin,
             (SELECT COUNT(*)::int FROM tenant_memberships tm WHERE tm.user_id=u.id) AS memberships,
             (SELECT COUNT(*)::int FROM designs d WHERE d.owner_user_id=u.id) AS owned_designs
      FROM users u
      WHERE lower(u.email)=ANY($1::text[])
      ORDER BY u.email
    `,[TARGET_EMAILS])).rows;

    const blocked=targets.filter(u=>u.is_platform_admin || Number(u.owned_designs||0)>0);
    if(blocked.length){
      throw new Error('Refusing QA user cleanup because protected/dependent user found: ' +
        blocked.map(u=>u.email+'(admin='+u.is_platform_admin+',designs='+u.owned_designs+')').join(', '));
    }

    const ids=targets.map(u=>u.id);
    const deleted=ids.length?(await c.query(
      'DELETE FROM users WHERE id=ANY($1::uuid[]) RETURNING id,email,display_name',
      [ids]
    )).rows:[];

    const remaining=(await c.query(`
      SELECT u.email,u.display_name,u.is_platform_admin,
             COUNT(tm.id)::int AS membership_count,
             COALESCE(json_agg(json_build_object('slug',t.slug,'role',tm.role))
               FILTER (WHERE tm.id IS NOT NULL),'[]'::json) AS memberships
      FROM users u
      LEFT JOIN tenant_memberships tm ON tm.user_id=u.id
      LEFT JOIN tenants t ON t.id=tm.tenant_id
      GROUP BY u.id
      ORDER BY u.created_at,u.email
    `)).rows;

    await c.query('COMMIT');
    console.log('FAKE_USER_CLEANUP '+JSON.stringify({
      audited:targets.map(u=>({
        email:u.email,name:u.display_name,memberships:Number(u.memberships||0),ownedDesigns:Number(u.owned_designs||0)
      })),
      deleted:deleted.map(u=>({email:u.email,name:u.display_name})),
      remaining
    }));
  }catch(e){
    try{await c.query('ROLLBACK')}catch(_){}
    throw e;
  }finally{
    c.release();
    await pool.end();
  }
})().catch(e=>{console.error('FAKE_USER_CLEANUP_ERROR',e.message);process.exit(1)});
