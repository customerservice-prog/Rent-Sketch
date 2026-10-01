const express=require('express');
const db=require('../db');
const {verifyToken}=require('../auth');
const {PLATFORM_FEE_PERCENT}=require('../pricing');
const router=express.Router();

function getStripe(){
  if(!process.env.STRIPE_SECRET_KEY)return null;
  const Stripe=require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

router.get('/:slug/quote-requests/:id/pay',async(req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    const stripe=getStripe();
    if(!stripe)return res.status(503).send('Payments are not configured.');
    let token;
    try{token=verifyToken(String(req.query.token||''));}catch(_){return res.status(400).send('This payment link is invalid or expired.');}
    if(token.kind!=='approved_quote_payment'||String(token.tenantSlug)!==String(req.params.slug)||String(token.quoteRequestId)!==String(req.params.id)){
      return res.status(400).send('This payment link is invalid.');
    }
    const quote=(await db.query(
      "SELECT qr.*,t.slug AS tenant_slug,t.name AS tenant_name,t.deposit_percent,t.stripe_connect_account_id,t.stripe_connect_status FROM quote_requests qr JOIN tenants t ON t.id=qr.tenant_id WHERE qr.id=$1 AND t.slug=$2",
      [req.params.id,req.params.slug]
    )).rows[0];
    if(!quote)return res.status(404).send('Quote not found.');
    if(quote.payment_status==='paid'){
      return res.redirect(303,'https://rentsketch.com/payment/complete/?status=paid&tenant='+encodeURIComponent(req.params.slug));
    }
    const approvedTotal=Number(quote.approved_total_cents),deposit=Number(quote.deposit_amount_cents);
    if(!Number.isSafeInteger(approvedTotal)||approvedTotal<=0||!Number.isSafeInteger(deposit)||deposit<=0
      ||Number(token.approvedTotalCents)!==approvedTotal
      ||!quote.payment_token_issued_at
      ||new Date(token.issuedAt).toISOString()!==new Date(quote.payment_token_issued_at).toISOString()){
      return res.status(409).send('This quote changed after the payment link was created. Ask the rental company for a new link.');
    }
    if(quote.stripe_connect_status!=='active'||!quote.stripe_connect_account_id){
      return res.status(409).send('Online deposits are not enabled for this rental company yet.');
    }

    if(quote.stripe_checkout_session_id){
      try{
        const existing=await stripe.checkout.sessions.retrieve(quote.stripe_checkout_session_id);
        if(existing.payment_status==='paid'){
          return res.redirect(303,'https://rentsketch.com/payment/complete/?status=paid&tenant='+encodeURIComponent(req.params.slug));
        }
        if(existing.status==='open'&&existing.url)return res.redirect(303,existing.url);
        if(existing.status==='expired')return res.status(409).send('This payment link expired. Ask the rental company to approve a new payment link.');
      }catch(err){console.error('[deposit] previous session lookup failed',err.message);}
    }

    const fee=Math.max(0,Math.round(deposit*(Number(PLATFORM_FEE_PERCENT)||0)/100));
    const paymentIntentData={transfer_data:{destination:quote.stripe_connect_account_id}};
    if(fee>0)paymentIntentData.application_fee_amount=fee;
    const success='https://rentsketch.com/payment/complete/?status=success&tenant='+encodeURIComponent(req.params.slug)+'&quote='+encodeURIComponent(quote.id);
    const cancel='https://rentsketch.com/payment/complete/?status=cancel&tenant='+encodeURIComponent(req.params.slug)+'&quote='+encodeURIComponent(quote.id);
    const key='approved-deposit-'+quote.id+'-'+Buffer.from(new Date(quote.payment_token_issued_at).toISOString()).toString('base64url').slice(0,28);
    const session=await stripe.checkout.sessions.create({
      mode:'payment',
      customer_email:quote.customer_email||undefined,
      success_url:success,
      cancel_url:cancel,
      line_items:[{quantity:1,price_data:{
        currency:'usd',
        unit_amount:deposit,
        product_data:{name:(quote.tenant_name||'Rental company')+' approved rental deposit',description:'Deposit for approved quote '+quote.id}
      }}],
      payment_intent_data:paymentIntentData,
      metadata:{
        kind:'rental_deposit',
        quoteRequestId:String(quote.id),
        tenantId:String(quote.tenant_id),
        tenantSlug:String(quote.tenant_slug),
        approvedTotalCents:String(approvedTotal),
        approvedAt:new Date(quote.approved_at).toISOString()
      }
    },{idempotencyKey:key});
    await db.query(
      "UPDATE quote_requests SET stripe_checkout_session_id=$1,platform_fee_cents=$2 WHERE id=$3 AND tenant_id=$4 AND payment_status='unpaid'",
      [session.id,fee,quote.id,quote.tenant_id]
    );
    return res.redirect(303,session.url);
  }catch(err){next(err);}
});

router.post('/:slug/quote-requests/:id/checkout-session',(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.status(410).json({
    code:'approved_quote_required',
    error:'A staff-approved quote and signed payment link are required before collecting a rental deposit.'
  });
});

module.exports=router;
