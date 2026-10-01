'use strict';
const crypto=require('crypto');
const db=require('./db');
const {validateWebhookUrl,postWebhook}=require('./outboundWebhook');

function safePayload(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return{};
  return JSON.parse(JSON.stringify(value));
}
async function logEvent(tenantId,direction,eventType,payload,deliveryStatus,externalId=null){
  try{
    await db.query(
      'INSERT INTO integration_events(tenant_id,direction,event_type,external_id,payload,delivery_status) VALUES($1,$2,$3,$4,$5::jsonb,$6)',
      [tenantId,direction,eventType,externalId,JSON.stringify(safePayload(payload)),deliveryStatus||null]
    );
  }catch(err){console.error('[integration-event] log failed:',err.message);}
}
async function emitTenantEvent(tenant,eventType,data){
  if(!tenant||!tenant.id)return{attempted:false,sent:false};
  if(!tenant.webhook_url){
    await logEvent(tenant.id,'outbound',eventType,data,'not_configured');
    return{attempted:false,sent:false};
  }
  const checked=validateWebhookUrl(tenant.webhook_url);
  if(!checked.ok){
    await logEvent(tenant.id,'outbound',eventType,data,'blocked');
    console.error('[integration-event] unsafe webhook for',tenant.slug,checked.error);
    return{attempted:true,sent:false};
  }
  try{
    const payload={id:crypto.randomUUID(),type:eventType,createdAt:new Date().toISOString(),data:safePayload(data)};
    const body=JSON.stringify(payload);
    const signature=tenant.webhook_secret?crypto.createHmac('sha256',tenant.webhook_secret).update(body).digest('hex'):'';
    const response=await postWebhook(checked.url,{headers:{'Content-Type':'application/json','X-RentSketch-Signature':signature},body});
    if(!response.ok)throw new Error('HTTP '+response.status);
    await logEvent(tenant.id,'outbound',eventType,payload,'sent',payload.id);
    return{attempted:true,sent:true,eventId:payload.id};
  }catch(err){
    console.error('[integration-event] delivery failed for',tenant.slug,eventType,err.message);
    await logEvent(tenant.id,'outbound',eventType,data,'failed');
    return{attempted:true,sent:false};
  }
}
async function tenantById(id){
  return (await db.query('SELECT * FROM tenants WHERE id=$1',[id])).rows[0]||null;
}
module.exports={emitTenantEvent,logEvent,tenantById};
