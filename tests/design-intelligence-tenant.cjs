const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function load(file,deps){
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),{
    module,exports:module.exports,require:id=>{if(id in deps)return deps[id];throw Error('Unexpected dependency '+id);},
    console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,String,Number,Array,Map,Set,Object,RegExp
  },{filename:file});
  return module.exports;
}
const calls=[];
const db={query:async(sql,args=[])=>{
  calls.push({sql,args});
  if(sql.includes('FROM designs')){
    if(args[0]==='tenant-a')return{rows:[{
      id:'a1',tenant_id:'tenant-a',tenant_slug:'alpha',staff_owned:false,event_type:'wedding',guest_count:80,estimate_total:1200,
      scene:{tentId:'pole-20x40',objects:[{kind:'linen',linenId:'linen-red'},{kind:'lighting',name:'Bistro Lights'}]},
      project_name:'Smith Wedding',revision:2,created_at:new Date(),updated_at:new Date()
    }]};
    return{rows:[
      {id:'a1',tenant_id:'tenant-a',tenant_slug:'alpha',staff_owned:false,event_type:'wedding',guest_count:80,estimate_total:1200,scene:{tentId:'pole-20x40',objects:[{kind:'linen',linenId:'linen-red'}]},project_name:'Smith Wedding',revision:2,created_at:new Date(),updated_at:new Date()},
      {id:'b1',tenant_id:'tenant-b',tenant_slug:'beta',staff_owned:false,event_type:'birthday',guest_count:40,estimate_total:500,scene:{tentId:'frame-20x20',objects:[{kind:'inflatable',inflatableId:'secret-beta-slide'}]},project_name:'Beta Party',revision:1,created_at:new Date(),updated_at:new Date()}
    ]};
  }
  if(sql.includes('FROM quote_requests')){
    if(args[0]==='tenant-a')return{rows:[{design_id:'a1',status:'booked',created_at:new Date(),booked_total_cents:245000,booked_line_items:[{label:'Bistro Lights',qty:1},{label:'Red Linen',qty:8}],booked_at:new Date(),external_order_id:'ERS-9001',external_order_source:'ers'}]};
    return{rows:[{design_id:'a1',status:'booked',created_at:new Date()},{design_id:'b1',status:'new',created_at:new Date()}]};
  }
  if(sql.includes('FROM tenant_design_intelligence_snapshots')){
    return{rows:[
      {bucket_at:'2026-07-01T00:00:00Z',payload:{sample:{learning:2,confidence:'low'},conversion:{requestRate:20,bookedRate:0},attribution:{bookedRevenueCents:0,bookedOrders:0},averages:{objectsPerDesign:4,revisions:3},friction:{missingGuest:{pct:50},missingTent:{pct:25},sparse:{pct:50},highRevision:{pct:50}}}},
      {bucket_at:'2026-09-01T00:00:00Z',payload:{sample:{learning:5,confidence:'low'},conversion:{requestRate:40,bookedRate:20},attribution:{bookedRevenueCents:100000,bookedOrders:1},averages:{objectsPerDesign:6,revisions:2.5},friction:{missingGuest:{pct:20},missingTent:{pct:20},sparse:{pct:20},highRevision:{pct:40}}}},
      {bucket_at:'2026-09-24T00:00:00Z',payload:{sample:{learning:7,confidence:'low'},conversion:{requestRate:50,bookedRate:28},attribution:{bookedRevenueCents:180000,bookedOrders:2},averages:{objectsPerDesign:7,revisions:2.2},friction:{missingGuest:{pct:14},missingTent:{pct:14},sparse:{pct:14},highRevision:{pct:28}}}},
      {bucket_at:'2026-10-01T00:00:00Z',payload:{sample:{learning:9,confidence:'low'},conversion:{requestRate:55,bookedRate:33},attribution:{bookedRevenueCents:245000,bookedOrders:2},averages:{objectsPerDesign:7.5,revisions:2},friction:{missingGuest:{pct:11},missingTent:{pct:11},sparse:{pct:11},highRevision:{pct:22}}}}
    ]};
  }
  throw Error('Unexpected SQL '+sql);
}};
(async()=>{
  const mod=load('server/src/designIntelligence.js',{'./db':db});
  const scoped=await mod.getDesignIntelligence({tenantId:'tenant-a'});
  assert.equal(scoped.mode,'tenant_live_aggregate');
  assert.equal(scoped.sample.tenantScoped,true);
  assert.equal(scoped.sample.learning,1);
  assert.equal(scoped.sample.tenants,1);
  assert.equal(scoped.conversion.requestRate,100);
  assert.equal(scoped.conversion.bookedRate,100);
  assert.equal(scoped.attribution.bookedRevenueCents,245000);
  assert.equal(scoped.attribution.bookedOrders,1);
  assert.equal(scoped.attribution.bookedItems.find(x=>x.name==='Red Linen').count,8);
  assert.equal(JSON.stringify(scoped).includes('secret-beta-slide'),false,'tenant A intelligence must not include tenant B features');
  const scopedCalls=calls.slice(0,2);
  assert.ok(scopedCalls.every(c=>c.args[0]==='tenant-a'),'both design and request queries are tenant-scoped');
  assert.ok(scopedCalls[0].sql.includes('d.tenant_id=$1'),'design query is tenant-scoped');
  assert.ok(scopedCalls[1].sql.includes('tenant_id=$1'),'request query is tenant-scoped');
  const history=await mod.getTenantDesignIntelligenceHistory('tenant-a',2160);
  assert.equal(history.points.length,4);
  assert.equal(history.periods.days7.bookedRevenueCents,65000);
  assert.equal(history.periods.days30.bookedRevenueCents,145000);
  assert.equal(history.periods.days90.bookedRevenueCents,245000);
  assert.equal(history.periods.days7.requestRate,5);
  console.log('PASS tenant Design Intelligence: scoped revenue, booked lines, 7/30/90 trends and patterns cannot cross tenant boundaries.');
})().catch(e=>{console.error(e);process.exitCode=1;});
