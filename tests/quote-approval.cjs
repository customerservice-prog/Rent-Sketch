const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),handlers={},sent=[];
const router={post:(p,...f)=>handlers[p]=f.at(-1),get(){},patch(){}};
const tenant={id:'tenant-1',slug:'friendly',name:'Friendly Party Rental',deposit_percent:20,contact_email:'office@example.invalid'};
const existing={id:'quote-1',tenant_id:'tenant-1',customer_name:'Jamie',customer_email:'jamie@example.invalid',estimate_total:'900.00',line_items:[{label:'Tent',qty:1,amount:400}],payment_status:'unpaid',design_id:'design-1'};
let updateArgs;
const db={query:async(sql,args)=>{
  if(sql.startsWith('SELECT * FROM quote_requests'))return{rows:[existing]};
  if(sql.startsWith('UPDATE quote_requests SET status=')){updateArgs=args;return{rows:[{...existing,status:'quoted',approved_total_cents:args[0],approved_line_items:JSON.parse(args[1]),deposit_amount_cents:args[3],payment_token_issued_at:new Date('2026-10-01T20:00:00Z'),approved_at:new Date('2026-10-01T20:00:00Z')}]};}
  throw Error('Unexpected SQL '+sql);
}};
const mod={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'server/src/routes/quoteRequests.js'),'utf8'),{
 module:mod,exports:mod.exports,
 require:id=>id==='express'?{Router:()=>router}:id==='../db'?db:id==='../mailer'?{getMailer:()=>({send:async(to,subject,text)=>{sent.push({to,subject,text});return{};}})}:
 id==='../middleware/requireAuth'?{requireTenantRole:()=>()=>{}}:id==='../orderProviders/quoteRequestOrderProvider'?{syncOrderEntitlement:async()=>{}}:
 id==='../eventPass'?{isPassEnabled:()=>false}:id==='../eventPassAccess'?{activePass:async()=>true}:id==='../designIntelligence'?{scheduleDesignIntelligenceRefresh:()=>{}}:
 id==='../integrationEvents'?{emitTenantEvent:async()=>({sent:true})}:id==='../auth'?{signToken:payload=>{assert.equal(payload.approvedTotalCents,100000);return'signed-approved-token';}}:
 id==='../clientIp'?{clientIp:()=> '127.0.0.1'}:require(id),
 console,Date,Number,String,Object,Array,Math,JSON,Map,Set,Promise
},{filename:'quoteRequests.js'});
(async()=>{
 let out;
 const req={params:{slug:'friendly',id:'quote-1'},tenant,user:{userId:null},body:{approvedTotalCents:100000,lineItems:[{label:'Tent',qty:1,amount:400}]}};
 const res={json:v=>{out=v;return v;},status:n=>({json:v=>{out={status:n,...v};return out;}})};
 await handlers['/:slug/quote-requests/:id/approve'](req,res,e=>{throw e;});
 assert.equal(updateArgs[0],100000);
 assert.equal(updateArgs[3],20000,'20% tenant deposit is calculated from approved quote');
 assert.match(out.paymentUrl,/signed-approved-token/);
 assert.equal(out.quoteRequest.status,'quoted');
 const mail=sent.find(x=>x.to==='jamie@example.invalid');assert.ok(mail);
 assert.match(mail.text,/Approved rental total: \$1000\.00/);
 assert.match(mail.text,/Deposit due: \$200\.00/);
 assert.match(mail.text,/not the earlier layout estimate/i);
 console.log('PASS quote approval: staff-approved total is stored, deposit is server-calculated, signed payment link is issued, and customer email uses the approved amount.');
})().catch(e=>{console.error(e);process.exitCode=1;});