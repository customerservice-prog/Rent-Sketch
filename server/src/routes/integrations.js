'use strict';
const crypto=require('crypto');
const express=require('express');
const db=require('../db');
const {requireTenantRole}=require('../middleware/requireAuth');
const {scheduleDesignIntelligenceRefresh}=require('../designIntelligence');
const {syncOrderEntitlement}=require('../orderProviders/quoteRequestOrderProvider');
const {logEvent}=require('../integrationEvents');

const router=express.Router();

function hash(value){return crypto.createHash('sha256').update(String(value||'')).digest('hex');}
function safeEqualHex(a,b){
  if(!a||!b)return false;
  const x=Buffer.from(String(a),'hex'),y=Buffer.from(String(b),'hex');
  return x.length===y.length&&crypto.timingSafeEqual(x,y);
}
function text(v,max){return typeof v==='string'?v.trim().slice(0,max):'';}
function cents(v){
  if(v==null||v==='')return null;
  const n=Number(v);
  return Number.isSafeInteger(n)&&n>=0&&n<=10000000000?n:null;
}
function lineItems(value){
  if(!Array.isArray(value))return[];
  return value.slice(0,250).map(x=>{
    x=x&&typeof x==='object'?x:{};
    const label=text(x.label||x.name,240);if(!label)return null;
    const quantity=Number(x.qty??x.quantity??1);
    const amountCents=cents(x.amountCents);
    const unitAmountCents=cents(x.unitAmountCents);
    return{
      label,
      qty:Number.isFinite(quantity)&&quantity>=0&&quantity<=10000?quantity:1,
      amountCents,
      unitAmountCents,
      productId:text(x.productId,160)||null,
      sku:text(x.sku,120)||null,
      category:text(x.category,64)||null
    };
  }).filter(Boolean);
}
async function tenantForSlug(slug){
  return (await db.query('SELECT * FROM tenants WHERE slug=$1',[slug])).rows[0]||null;
}
async function integrationAuth(req,res,next){
  try{
    const tenant=await tenantForSlug(req.params.slug);
    if(!tenant)return res.status(404).json({error:'Tenant not found'});
    const raw=String(req.headers['x-rentsketch-integration-key']||'');
    if(!raw||!tenant.integration_api_key_hash||!safeEqualHex(hash(raw),tenant.integration_api_key_hash)){
      return res.status(401).json({error:'Invalid integration key'});
    }
    req.integrationTenant=tenant;
    next();
  }catch(err){next(err);}
}

router.get('/:slug/integrations',requireTenantRole('viewer'),async(req,res)=>{
  const recent=(await db.query(
    'SELECT direction,event_type,delivery_status,created_at FROM integration_events WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20',
    [req.tenant.id]
  )).rows;
  res.setHeader('Cache-Control','no-store');
  res.json({
    configured:Boolean(req.tenant.integration_api_key_hash),
    provider:req.tenant.integration_provider||null,
    keyLast4:req.tenant.integration_api_key_last4||null,
    webhookConfigured:Boolean(req.tenant.webhook_url),
    recent
  });
});

router.post('/:slug/integrations/key',requireTenantRole('owner'),async(req,res)=>{
  const provider=text(req.body?.provider,80)||'custom';
  const raw='rsi_'+crypto.randomBytes(32).toString('base64url');
  await db.query(
    'UPDATE tenants SET integration_api_key_hash=$1,integration_api_key_last4=$2,integration_provider=$3,updated_at=now() WHERE id=$4',
    [hash(raw),raw.slice(-4),provider,req.tenant.id]
  );
  await logEvent(req.tenant.id,'internal','integration.key_rotated',{provider},'ok');
  res.setHeader('Cache-Control','no-store');
  res.json({apiKey:raw,provider,last4:raw.slice(-4),warning:'Copy this key now. RentSketch stores only its hash.'});
});

router.delete('/:slug/integrations/key',requireTenantRole('owner'),async(req,res)=>{
  await db.query(
    'UPDATE tenants SET integration_api_key_hash=NULL,integration_api_key_last4=NULL,integration_provider=NULL,updated_at=now() WHERE id=$1',
    [req.tenant.id]
  );
  await logEvent(req.tenant.id,'internal','integration.key_revoked',{},'ok');
  res.json({ok:true});
});

router.post('/:slug/integrations/order-attribution',integrationAuth,async(req,res,next)=>{
  try{
    const tenant=req.integrationTenant,body=req.body||{};
    const quoteRequestId=text(body.quoteRequestId,80)||null;
    const designId=text(body.designId,80)||null;
    if(!quoteRequestId&&!designId)return res.status(400).json({error:'quoteRequestId or designId is required'});
    const externalOrderId=text(body.externalOrderId,160);
    if(!externalOrderId)return res.status(400).json({error:'externalOrderId is required'});
    const source=text(body.source,80)||tenant.integration_provider||'external';
    const status=text(body.status,40).toLowerCase()||'booked';
    if(!['booked','updated','canceled'].includes(status))return res.status(400).json({error:'status must be booked, updated, or canceled'});
    const orderTotalCents=body.orderTotalCents==null?null:cents(body.orderTotalCents);
    if(body.orderTotalCents!=null&&orderTotalCents==null)return res.status(400).json({error:'orderTotalCents must be a whole number of cents'});
    const items=lineItems(body.lineItems);

    const quote=(await db.query(
      'SELECT * FROM quote_requests WHERE tenant_id=$1 AND (($2::uuid IS NOT NULL AND id=$2::uuid) OR ($3::uuid IS NOT NULL AND design_id=$3::uuid)) ORDER BY created_at DESC LIMIT 1',
      [tenant.id,quoteRequestId,designId]
    )).rows[0];
    if(!quote)return res.status(404).json({error:'Matching quote request not found'});

    const nextStatus=status==='booked'?'booked':status==='canceled'?'declined':quote.status;
    const row=(await db.query(
      "UPDATE quote_requests SET status=$1,booked_total_cents=CASE WHEN $2::int IS NULL THEN booked_total_cents ELSE $2 END,booked_line_items=CASE WHEN $3::jsonb IS NULL THEN booked_line_items ELSE $3::jsonb END,booked_at=CASE WHEN $1='booked' THEN COALESCE(booked_at,now()) ELSE booked_at END,external_order_id=$4,external_order_source=$5,attribution_updated_at=now() WHERE id=$6 AND tenant_id=$7 RETURNING *",
      [nextStatus,orderTotalCents,items.length?JSON.stringify(items):null,externalOrderId,source,quote.id,tenant.id]
    )).rows[0];

    if(nextStatus==='booked')await syncOrderEntitlement(row,tenant);
    scheduleDesignIntelligenceRefresh();
    await logEvent(tenant.id,'inbound','order.attribution',{
      quoteRequestId:row.id,designId:row.design_id,externalOrderId,source,status,
      orderTotalCents,lineItemCount:items.length
    },'accepted',externalOrderId);

    res.json({
      ok:true,
      quoteRequestId:row.id,
      status:row.status,
      bookedTotalCents:row.booked_total_cents,
      externalOrderId:row.external_order_id,
      externalOrderSource:row.external_order_source
    });
  }catch(err){next(err);}
});

module.exports=router;
