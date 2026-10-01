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
    if(args[0]==='tenant-a')return{rows:[{design_id:'a1',status:'booked',created_at:new Date()}]};
    return{rows:[{design_id:'a1',status:'booked',created_at:new Date()},{design_id:'b1',status:'new',created_at:new Date()}]};
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
  assert.equal(JSON.stringify(scoped).includes('secret-beta-slide'),false,'tenant A intelligence must not include tenant B features');
  const scopedCalls=calls.slice(0,2);
  assert.ok(scopedCalls.every(c=>c.args[0]==='tenant-a'),'both design and request queries are tenant-scoped');
  assert.ok(scopedCalls[0].sql.includes('d.tenant_id=$1'),'design query is tenant-scoped');
  assert.ok(scopedCalls[1].sql.includes('tenant_id=$1'),'request query is tenant-scoped');
  console.log('PASS tenant Design Intelligence: scoped metrics and patterns cannot cross tenant boundaries.');
})().catch(e=>{console.error(e);process.exitCode=1;});
