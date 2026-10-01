const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),express=require('express');
const root=path.resolve(__dirname,'..');
let created=[],storedSession=null;
const issued=new Date('2026-10-01T18:00:00.000Z');
const approvedAt=new Date('2026-10-01T17:55:00.000Z');
const quote={
  id:'quote-1',tenant_id:'tenant-1',tenant_slug:'friendly',tenant_name:'Friendly Party Rental',
  customer_email:'buyer@example.invalid',payment_status:'unpaid',approved_total_cents:10000,deposit_amount_cents:2500,
  payment_token_issued_at:issued,approved_at:approvedAt,stripe_connect_account_id:'acct_fixture',stripe_connect_status:'active',
  stripe_checkout_session_id:null
};
const db={query:async(sql,args)=>{
  if(sql.startsWith('SELECT qr.*'))return{rows:[{...quote,stripe_checkout_session_id:storedSession}]};
  if(sql.startsWith('UPDATE quote_requests SET stripe_checkout_session_id')){storedSession=args[0];return{rows:[]};}
  throw Error('Unexpected SQL '+sql);
}};
class FakeStripe{
  checkout={sessions:{
    retrieve:async id=>({id,status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/'+id}),
    create:async(args,opts)=>{created.push({args,opts});return{id:'cs_approved_fixture',url:'https://checkout.stripe.com/c/pay/cs_approved_fixture',status:'open',payment_status:'unpaid'};}
  }};
}
const routerModule={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'server/src/routes/payments.js'),'utf8'),{
  module:routerModule,exports:routerModule.exports,
  require:id=>id==='express'?express:id==='../db'?db:id==='../auth'?{verifyToken:t=>{
    if(t!=='good')throw Error('bad token');
    return{kind:'approved_quote_payment',tenantId:'tenant-1',tenantSlug:'friendly',quoteRequestId:'quote-1',approvedTotalCents:10000,issuedAt:issued.toISOString()};
  }}:id==='../pricing'?{PLATFORM_FEE_PERCENT:5}:id==='stripe'?FakeStripe:id==='crypto'?require('crypto'):require(id),
  process:{env:{STRIPE_SECRET_KEY:'sk_test_fixture'}},console,Buffer,Date,Number,String,Object,Array,Math,JSON,URL
},{filename:'payments.js'});
const app=express();app.use(express.json());app.use('/api/tenants',routerModule.exports);app.use((e,req,res,next)=>res.status(500).json({error:e.message}));
let server,base;
(async()=>{
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
  let r=await fetch(base+'/api/tenants/friendly/quote-requests/quote-1/pay?token=bad',{redirect:'manual'});
  assert.equal(r.status,400);
  r=await fetch(base+'/api/tenants/friendly/quote-requests/quote-1/pay?token=good&amount=1',{redirect:'manual'});
  assert.equal(r.status,303);
  assert.match(r.headers.get('location'),/^https:\/\/checkout\.stripe\.com/);
  assert.equal(created.length,1);
  assert.equal(created[0].args.line_items[0].price_data.unit_amount,2500,'server-stored approved deposit is authoritative');
  assert.equal(created[0].args.payment_intent_data.transfer_data.destination,'acct_fixture');
  assert.equal(created[0].args.payment_intent_data.application_fee_amount,125);
  assert.equal(created[0].args.metadata.approvedTotalCents,'10000');
  r=await fetch(base+'/api/tenants/friendly/quote-requests/quote-1/checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({estimateTotal:.01})});
  assert.equal(r.status,410);const body=await r.json();assert.equal(body.code,'approved_quote_required');
  console.log('PASS approved deposit security: signed staff-approved amount controls Checkout; browser amount injection and legacy estimate checkout are rejected.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server?.close());