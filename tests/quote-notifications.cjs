const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let handler;const sent=[];
const router={post:(p,f)=>{if(p==='/:slug/quote-requests')handler=f;},get(){},patch(){}};
const db={query:async(sql,args)=>{
  if(sql.startsWith('SELECT * FROM tenants'))return{rows:[{id:'tenant-1',slug:'friendly',name:'Friendly Party Rental',contact_email:'office@example.invalid',webhook_url:null}]};
  if(sql.includes('INSERT INTO quote_requests'))return{rows:[{id:'quote-1',created_at:'2026-10-01T18:30:00Z'}]};
  throw Error('Unexpected SQL '+sql);
}};
const deps={
  express:{Router:()=>router},
  '../db':db,
  '../mailer':{getMailer:()=>({send:async(to,subject,text)=>{sent.push({to,subject,text});return{id:'mail'};}})},
  '../middleware/requireAuth':{requireTenantRole:()=>()=>{}},
  '../orderProviders/quoteRequestOrderProvider':{syncOrderEntitlement:async()=>{}},
  '../designIntelligence':{scheduleDesignIntelligenceRefresh:()=>{}},'../integrationEvents':{emitTenantEvent:async()=>({attempted:false,sent:false})},'../auth':{signToken:()=> 'fixture-token'},
  '../eventPass':{isPassEnabled:()=>false},
  '../eventPassAccess':{activePass:async()=>true},
  '../designIntelligence':{scheduleDesignIntelligenceRefresh:()=>{}}
};
vm.runInNewContext(fs.readFileSync(path.join(root,'server/src/routes/quoteRequests.js'),'utf8'),{
  console,module:{exports:{}},require:id=>id==='crypto'?require(id):id==='../clientIp'?{clientIp:()=> '127.0.0.1'}:deps[id],
  setTimeout,clearTimeout,Date,Math,JSON,String,Number,Array,Map,Set,Object,RegExp
},{filename:'quoteRequests.js'});
(async()=>{
  let body,status;
  await handler({
    params:{slug:'friendly'},headers:{},socket:{remoteAddress:'127.0.0.1'},
    body:{customerName:'Jamie Customer',customerEmail:'jamie@example.invalid',eventDate:'2026-11-14',eventType:'Wedding',guestCount:80,estimateTotal:1234.5,lineItems:[{label:'20x40 Pole Tent',qty:1,amount:400},{label:'Bistro Lights',qty:1,amount:125}]}
  },{status:n=>{status=n;return{json:v=>{body=v;}};}},e=>{throw e;});
  assert.equal(status,201);
  assert.equal(sent.length,2,'staff and customer each receive one email');
  const staff=sent.find(x=>x.to==='office@example.invalid'),customer=sent.find(x=>x.to==='jamie@example.invalid');
  assert.ok(staff);assert.ok(customer);
  assert.match(staff.subject,/New RentSketch quote request/);
  assert.match(staff.text,/Submitted estimate: \$1234\.50/);
  assert.match(customer.subject,/We received your RentSketch request for Friendly Party Rental/);
  assert.match(customer.text,/20x40 Pole Tent/);
  assert.match(customer.text,/Bistro Lights/);
  assert.match(customer.text,/Submitted estimate: \$1234\.50/);
  assert.match(customer.text,/Nothing is booked or charged/);
  assert.doesNotMatch(customer.text,/has been booked|your (?:event|rental|order) is booked|booking confirmed/i);
  assert.equal(body.staffNotificationSent,true);
  assert.equal(body.customerConfirmationSent,true);
  console.log('PASS quote notifications: staff and customer emails are separate, itemized, currency-formatted, and never imply a booking.');
})().catch(e=>{console.error(e);process.exitCode=1;});
