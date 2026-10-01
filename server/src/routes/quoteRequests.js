const { clientIp } = require('../clientIp');
const express=require('express');
const db=require('../db');
const {getMailer}=require('../mailer');
const {requireTenantRole}=require('../middleware/requireAuth');
const {syncOrderEntitlement}=require('../orderProviders/quoteRequestOrderProvider');
const {isPassEnabled}=require('../eventPass');
const {activePass}=require('../eventPassAccess');
const {scheduleDesignIntelligenceRefresh}=require('../designIntelligence');
const {emitTenantEvent}=require('../integrationEvents');
const {signToken}=require('../auth');

const router=express.Router();
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const buckets=new Map();
const VALID_STATUSES=new Set(['new','contacted','quoted','booked','declined']);

function text(v,max){return typeof v==='string'?v.trim().slice(0,max):'';}
function limited(key){const now=Date.now(),windowMs=60*60*1000,max=10;let b=buckets.get(key);if(!b||now-b.start>windowMs)b={start:now,count:0};b.count++;buckets.set(key,b);return b.count>max;}
function finite(v,min,max){if(v==null||v==='')return null;const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null;}
function integer(v,min,max){const n=Number(v);return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;}
function sanitizeLineItems(value){
  if(!Array.isArray(value))return[];
  return value.slice(0,200).map(item=>{
    item=item&&typeof item==='object'?item:{};
    const label=text(item.label,240);if(!label)return null;
    return{
      label,
      qty:finite(item.qty,0,10000)||0,
      unitPrice:finite(item.unitPrice,0,1000000),
      amount:finite(item.amount,0,100000000),
      productId:text(item.productId,160)||null,
      category:text(item.category,40)||null
    };
  }).filter(Boolean);
}
async function sendMail(to,subject,body,label){
  const mailer=getMailer();
  if(!mailer||!to)return{attempted:false,sent:false};
  try{
    const result=await mailer.send(to,subject,body);
    if(result&&result.error)throw new Error(result.error.message||String(result.error));
    return{attempted:true,sent:true};
  }catch(err){
    console.error('[quote-mail] '+label+' failed:',err.message);
    return{attempted:true,sent:false};
  }
}
function paymentLink(tenant,quote){
  if(!quote.approved_total_cents||!quote.payment_token_issued_at)return null;
  const token=signToken({
    kind:'approved_quote_payment',
    tenantId:String(tenant.id),
    tenantSlug:tenant.slug,
    quoteRequestId:String(quote.id),
    approvedTotalCents:Number(quote.approved_total_cents),
    issuedAt:new Date(quote.payment_token_issued_at).toISOString()
  },{expiresIn:'14d'});
  return 'https://rentsketch-api-production.up.railway.app/api/tenants/'+encodeURIComponent(tenant.slug)+'/quote-requests/'+encodeURIComponent(quote.id)+'/pay?token='+encodeURIComponent(token);
}

router.post('/:slug/quote-requests',wrap(async(req,res)=>{
  const tenant=(await db.query('SELECT * FROM tenants WHERE slug=$1',[req.params.slug])).rows[0];
  if(!tenant)return res.status(404).json({error:'Tenant not found'});
  if(limited(`${tenant.id}:${clientIp(req)}`))return res.status(429).json({error:'Too many quote requests. Please try again later.'});

  const body=req.body||{},
    designId=text(body.designId,80)||null,
    customerName=text(body.customerName,160),
    customerEmail=text(body.customerEmail,254),
    customerPhone=text(body.customerPhone,50),
    eventDate=text(body.eventDate,20),
    eventType=text(body.eventType,100),
    plannerSource=text(body.plannerSource,120)||null,
    notes=text(body.notes,8000),
    guestCount=Number.isFinite(Number(body.guestCount))?Math.max(1,Math.min(100000,Number(body.guestCount))):null,
    estimateTotal=finite(body.estimateTotal,0,100000000),
    lineItems=sanitizeLineItems(body.lineItems),
    rawProperty=body.property&&typeof body.property==='object'&&!Array.isArray(body.property)?body.property:{};

  const property={
    address:text(rawProperty.address,240)||null,
    widthFt:finite(rawProperty.widthFt,0,10000),
    lengthFt:finite(rawProperty.lengthFt,0,10000),
    surfaceType:text(rawProperty.surfaceType,40)||null,
    needDance:!!rawProperty.needDance,
    tentId:text(rawProperty.tentId,120)||null,
    coordinates:null
  };
  const lat=finite(rawProperty.coordinates&&rawProperty.coordinates.latitude,-90,90),
    lng=finite(rawProperty.coordinates&&rawProperty.coordinates.longitude,-180,180);
  if(lat!=null&&lng!=null)property.coordinates={latitude:lat,longitude:lng};

  if(!customerName||!customerEmail)return res.status(400).json({error:'Name and email are required.'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))return res.status(400).json({error:'Please enter a valid email address.'});
  if(eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))return res.status(400).json({error:'Invalid event date.'});

  if(isPassEnabled(tenant)){
    if(!designId)return res.status(402).json({error:'An Event Pass is required to send a RentSketch design for a quote.',code:'event_pass_required'});
    const owned=(await db.query('SELECT id FROM designs WHERE id=$1 AND tenant_id=$2 AND anonymous_session_id=$3',[designId,tenant.id,text(body.anonymousSessionId,160)])).rows[0];
    if(!owned)return res.status(404).json({error:'Open your private event link before sending this design.'});
    if(!await activePass(designId))return res.status(402).json({error:'An active Event Pass is required to send this design.',code:'event_pass_required'});
  }
  if(designId){
    const d=(await db.query('SELECT tenant_id FROM designs WHERE id=$1',[designId])).rows[0];
    if(!d||String(d.tenant_id)!==String(tenant.id))return res.status(400).json({error:'designId does not belong to this tenant'});
  }

  const row=(await db.query(
    `INSERT INTO quote_requests
      (tenant_id,design_id,customer_name,customer_email,customer_phone,event_date,guest_count,event_type,line_items,estimate_total,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [tenant.id,designId,customerName,customerEmail,customerPhone||null,eventDate||null,guestCount,eventType||null,JSON.stringify(lineItems),estimateTotal,notes||null]
  )).rows[0];

  scheduleDesignIntelligenceRefresh();
  const data={
    id:row.id,createdAt:row.created_at,designId,customerName,customerEmail,customerPhone:customerPhone||null,
    eventDate:eventDate||null,eventType:eventType||null,guestCount,estimateTotal,lineItems,notes:notes||null,plannerSource,property
  };
  const staffItems=lineItems.length?'\nItems:\n'+lineItems.map(i=>'- '+(i.qty||1)+' x '+i.label+(i.amount==null?'':' — $'+Number(i.amount).toFixed(2))).join('\n'):'';
  const customerItems=lineItems.length?lineItems.map(i=>'- '+(i.qty||1)+' x '+i.label+(i.amount==null?'':' — $'+Number(i.amount).toFixed(2))).join('\n'):'No itemized rentals were included.';
  const companyName=text(tenant.name,160)||'the rental company';
  const customerBody=[
    'Hi '+customerName,'',
    'We received your RentSketch request for '+companyName+'.','',
    'Event date: '+(eventDate||'not provided'),
    'Guests: '+(guestCount||'not provided'),
    'Event type: '+(eventType||'not provided'),
    ...(estimateTotal==null?[]:['Submitted estimate: $'+estimateTotal.toFixed(2)]),
    '','Requested setup:',customerItems,'',
    'Nothing is booked or charged by sending this request. '+companyName+' will confirm availability, site details, final pricing, delivery/installation requirements, and any changes before the rental order is final.','',
    'Quote request ID: '+row.id,'','Thank you.','RentSketch'
  ].join('\n');

  const [webhook,staffEmail,customerEmailNotice]=await Promise.all([
    emitTenantEvent(tenant,'quote_request.created',data),
    sendMail(tenant.contact_email,`New RentSketch quote request — ${customerName}`,
      `Customer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone||'not provided'}\nEvent date: ${eventDate||'not provided'}\nGuests: ${guestCount||'not provided'}\nEvent type: ${eventType||'not provided'}\nPlanner source: ${plannerSource||'not provided'}\nEvent address: ${property.address||'not provided'}\nUsable area: ${property.widthFt&&property.lengthFt?property.widthFt+' x '+property.lengthFt+' ft':'not provided'}\nSurface: ${property.surfaceType||'not provided'}\nDesign ID: ${designId||'not saved'}\nQuote request ID: ${row.id}${estimateTotal==null?'':'\nSubmitted estimate: $'+estimateTotal.toFixed(2)}${staffItems}\n\n${notes||''}`,'staff'),
    sendMail(customerEmail,`We received your RentSketch request for ${companyName}`,customerBody,'customer')
  ]);

  res.status(201).json({
    id:row.id,createdAt:row.created_at,received:true,
    notificationSent:Boolean(webhook.sent||staffEmail.sent||customerEmailNotice.sent),
    notificationAttempted:Boolean(webhook.attempted||staffEmail.attempted||customerEmailNotice.attempted),
    staffNotificationSent:Boolean(staffEmail.sent),
    customerConfirmationSent:Boolean(customerEmailNotice.sent)
  });
}));

router.get('/:slug/quote-requests',requireTenantRole('viewer'),async(req,res)=>{
  const r=await db.query(
    `SELECT qr.*,d.scene FROM quote_requests qr LEFT JOIN designs d ON d.id=qr.design_id
     WHERE qr.tenant_id=$1 ORDER BY qr.created_at DESC`,[req.tenant.id]
  );
  res.json({quoteRequests:r.rows});
});

router.post('/:slug/quote-requests/:id/approve',requireTenantRole('staff'),wrap(async(req,res)=>{
  const existing=(await db.query('SELECT * FROM quote_requests WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenant.id])).rows[0];
  if(!existing)return res.status(404).json({error:'Quote request not found'});
  if(existing.payment_status==='paid')return res.status(409).json({error:'This request already has a paid deposit.'});

  const body=req.body||{};
  let totalCents=integer(body.approvedTotalCents,1,10000000000);
  if(totalCents==null&&existing.estimate_total!=null)totalCents=Math.round(Number(existing.estimate_total)*100);
  if(!Number.isSafeInteger(totalCents)||totalCents<=0)return res.status(400).json({error:'Enter an approved quote total before creating a payment link.'});
  const approvedItems=body.lineItems===undefined?(Array.isArray(existing.line_items)?existing.line_items:[]):sanitizeLineItems(body.lineItems);
  const pct=Math.max(0,Math.min(100,Number(req.tenant.deposit_percent||20)));
  const depositCents=Math.max(1,Math.round(totalCents*pct/100));

  const row=(await db.query(
    `UPDATE quote_requests SET status='quoted',approved_total_cents=$1,approved_line_items=$2::jsonb,
      approved_at=now(),approved_by_user_id=$3,deposit_amount_cents=$4,payment_token_issued_at=now(),
      stripe_checkout_session_id=NULL,updated_at=COALESCE(updated_at,created_at)
     WHERE id=$5 AND tenant_id=$6 RETURNING *`,
    [totalCents,JSON.stringify(approvedItems),req.user.userId||null,depositCents,req.params.id,req.tenant.id]
  )).rows[0];

  const payUrl=paymentLink(req.tenant,row);
  const companyName=req.tenant.name||'the rental company';
  const approvedTotal=(totalCents/100).toFixed(2),deposit=(depositCents/100).toFixed(2);
  const approvalMail=await sendMail(row.customer_email,`Your ${companyName} quote is ready`,
    `Hi ${row.customer_name},\n\n${companyName} reviewed your RentSketch request.\n\nApproved rental total: $${approvedTotal}\nDeposit due: $${deposit}\n\nPay the approved deposit securely here:\n${payUrl}\n\nThis payment link is based on the rental company's approved quote amount, not the earlier layout estimate. Confirm any final delivery, installation, site, or contract terms with ${companyName}.\n\nRentSketch`,'quote-approval');

  scheduleDesignIntelligenceRefresh();
  await emitTenantEvent(req.tenant,'quote_request.approved',{
    id:row.id,designId:row.design_id,approvedTotalCents:totalCents,depositAmountCents:depositCents,status:row.status
  });
  res.json({quoteRequest:row,paymentUrl:payUrl,customerEmailSent:Boolean(approvalMail.sent)});
}));

router.patch('/:slug/quote-requests/:id',requireTenantRole('staff'),wrap(async(req,res)=>{
  const body=req.body||{},
    status=body.status==null?null:text(body.status,40),
    notes=body.notes==null?null:text(body.notes,8000);
  if(status&&!VALID_STATUSES.has(status))return res.status(400).json({error:'Invalid quote request status'});
  if(body.notes!=null&&typeof body.notes!=='string')return res.status(400).json({error:'notes must be text'});

  const bookedTotalCents=body.bookedTotalCents==null?null:integer(body.bookedTotalCents,0,10000000000);
  if(body.bookedTotalCents!=null&&bookedTotalCents==null)return res.status(400).json({error:'bookedTotalCents must be a whole number of cents'});
  const bookedLineItems=body.bookedLineItems==null?null:sanitizeLineItems(body.bookedLineItems);
  const externalOrderId=body.externalOrderId==null?null:text(body.externalOrderId,160);
  const externalOrderSource=body.externalOrderSource==null?null:text(body.externalOrderSource,80);

  const row=(await db.query(
    `UPDATE quote_requests SET
      status=COALESCE($1,status),notes=COALESCE($2,notes),
      booked_total_cents=COALESCE($3,booked_total_cents),
      booked_line_items=CASE WHEN $4::jsonb IS NULL THEN booked_line_items ELSE $4::jsonb END,
      external_order_id=COALESCE($5,external_order_id),
      external_order_source=COALESCE($6,external_order_source),
      booked_at=CASE WHEN COALESCE($1,status)='booked' THEN COALESCE(booked_at,now()) ELSE booked_at END,
      attribution_updated_at=CASE WHEN $3 IS NOT NULL OR $4::jsonb IS NOT NULL OR $5 IS NOT NULL THEN now() ELSE attribution_updated_at END
     WHERE id=$7 AND tenant_id=$8 RETURNING *`,
    [status,notes,bookedTotalCents,bookedLineItems==null?null:JSON.stringify(bookedLineItems),externalOrderId||null,externalOrderSource||null,req.params.id,req.tenant.id]
  )).rows[0];
  if(!row)return res.status(404).json({error:'Quote request not found'});

  if(status)await syncOrderEntitlement(row,req.tenant);
  scheduleDesignIntelligenceRefresh();
  await emitTenantEvent(req.tenant,status==='booked'?'quote_request.booked':'quote_request.updated',{
    id:row.id,designId:row.design_id,status:row.status,bookedTotalCents:row.booked_total_cents,
    externalOrderId:row.external_order_id,externalOrderSource:row.external_order_source
  });
  res.json({quoteRequest:row});
}));

module.exports=router;
