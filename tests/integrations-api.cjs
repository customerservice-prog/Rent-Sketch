const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),express=require('express');
const root=path.resolve(__dirname,'..'),raw='rsi_friendly_fixture',otherRaw='rsi_other_fixture';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const tenants={
  friendly:{id:'tenant-a',slug:'friendly',name:'Friendly',integration_api_key_hash:hash(raw),integration_api_key_last4:raw.slice(-4),integration_provider:'ers',webhook_url:null},
  other:{id:'tenant-b',slug:'other',name:'Other',integration_api_key_hash:hash(otherRaw),integration_api_key_last4:otherRaw.slice(-4),integration_provider:'custom',webhook_url:null}
};
let quote={id:'11111111-1111-4111-8111-111111111111',tenant_id:'tenant-a',design_id:'22222222-2222-4222-8222-222222222222',status:'quoted',booked_total_cents:null,booked_line_items:[],external_order_id:null,external_order_source:null};
const writes=[],events=[];
const db={query:async(sql,args=[])=>{
  if(sql==='SELECT * FROM tenants WHERE slug=$1')return{rows:[tenants[args[0]]?[tenants[args[0]]]:[]].flat()};
  if(sql.startsWith('SELECT direction,event_type'))return{rows:[]};
  if(sql.startsWith('UPDATE tenants SET integration_api_key_hash=')){writes.push({sql,args});return{rows:[]};}
  if(sql.startsWith('UPDATE tenants SET integration_api_key_hash=NULL')){writes.push({sql,args});return{rows:[]};}
  if(sql.startsWith('SELECT * FROM quote_requests'))return{rows:(args[0]==='tenant-a'&&(args[1]===quote.id||args[2]===quote.design_id))?[quote]:[]};
  if(sql.startsWith('UPDATE quote_requests SET status=')){
    quote={...quote,status:args[0],booked_total_cents:args[1]??quote.booked_total_cents,booked_line_items:args[2]?JSON.parse(args[2]):quote.booked_line_items,external_order_id:args[3],external_order_source:args[4]};
    return{rows:[quote]};
  }
  throw Error('Unexpected SQL '+sql);
}};
const mod={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'server/src/routes/integrations.js'),'utf8'),{
  module:mod,exports:mod.exports,
  require:id=>id==='crypto'?crypto:id==='express'?express:id==='../db'?db:id==='../middleware/requireAuth'?{requireTenantRole:()=>async(req,res,next)=>{req.tenant=tenants[req.params.slug];req.user={userId:'owner'};next();}}:id==='../designIntelligence'?{scheduleDesignIntelligenceRefresh:()=>{}}:id==='../orderProviders/quoteRequestOrderProvider'?{syncOrderEntitlement:async()=>{}}:id==='../integrationEvents'?{logEvent:async(...x)=>events.push(x)}:require(id),
  console,Buffer,Date,Number,String,Object,Array,Math,JSON,Map,Set
},{filename:'integrations.js'});
const app=express();app.use(express.json());app.use('/api/tenants',mod.exports);app.use((e,req,res,next)=>res.status(500).json({error:e.message}));
let server,base;
async function post(url,body,key){const r=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...(key?{'X-RentSketch-Integration-Key':key}:{})},body:JSON.stringify(body||{})});return{status:r.status,body:await r.json()};}
(async()=>{
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
  const payload={quoteRequestId:quote.id,externalOrderId:'ERS-9001',source:'ers',status:'booked',orderTotalCents:245000,lineItems:[{label:'20x40 Pole Tent',qty:1,amountCents:40000},{label:'Bistro Lights',qty:1,amountCents:12500}]};
  assert.equal((await post('/api/tenants/friendly/integrations/order-attribution',payload)).status,401);
  assert.equal((await post('/api/tenants/friendly/integrations/order-attribution',payload,'wrong')).status,401);
  assert.equal((await post('/api/tenants/other/integrations/order-attribution',payload,raw)).status,401,'Friendly key cannot authenticate another tenant');
  const ok=await post('/api/tenants/friendly/integrations/order-attribution',payload,raw);
  assert.equal(ok.status,200);assert.equal(ok.body.status,'booked');assert.equal(ok.body.bookedTotalCents,245000);assert.equal(ok.body.externalOrderId,'ERS-9001');
  assert.equal(quote.booked_line_items.length,2);assert.equal(quote.tenant_id,'tenant-a');
  assert.ok(events.some(x=>x[2]==='order.attribution'));
  const key=await post('/api/tenants/friendly/integrations/key',{provider:'tapgoods'});
  assert.equal(key.status,200);assert.match(key.body.apiKey,/^rsi_/);
  const stored=writes.find(x=>x.sql.startsWith('UPDATE tenants SET integration_api_key_hash='));
  assert.ok(stored);assert.notEqual(stored.args[0],key.body.apiKey);assert.equal(stored.args[0].length,64,'only SHA-256 hash is stored');
  console.log('PASS integrations: tenant-bound hashed keys, one-time key issuance, and real booked order attribution are isolated by tenant.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server?.close());