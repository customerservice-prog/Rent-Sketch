// Actual scene placement and production meshes; no booking or network writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(require('node:url').pathToFileURL(threePath));
 const draw=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),context=vm.createContext({console,document:{createElement:()=>({width:0,height:0,getContext:()=>draw})}}),cache=new Map();
 const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const k of Object.keys(THREE))this.setExport(k,THREE[k]);},{context});
 function moduleFor(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
 async function load(file){const m=moduleFor(path.join(root,file));if(m.status==='unlinked')await m.link((s,r)=>s==='three'?three:moduleFor(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(r.identifier),s)));if(m.status!=='evaluated')await m.evaluate();return m.namespace;}
 const models=await load('js/ui/equipment3d.js'),guests=await load('js/ui/scene-guests.js'),tables=await load('js/data/tables.js'),world=await load('js/core/world-space.js'),disposal=await load('js/ui/scene-environment.js');
 Object.assign(context,{table:models.makeTable,objectLocalDimensions:world.objectLocalDimensions});
 const src=fs.readFileSync(path.join(root,'js/ui/view3d.js'),'utf8'),a=src.indexOf('  function modelDimensionsFor(item){'),b=src.indexOf('  function loop(',a);
 assert.ok(a>=0&&b>a);vm.runInContext(src.slice(a,b),context);
 let cases=0,checks=0;const near=(a,b,msg)=>{checks++;assert.ok(Math.abs(a-b)<.0001,`${msg}: ${a} != ${b}`);};
 const tent={type:'frame',widthFt:20,lengthFt:20,centerPoles:[]};
 for(const tableId of ['banquet-6ft','banquet-8ft','round-5ft','sweetheart-half-round-60'])for(const chairId of ['plastic-white','resin-white','chiavari-gold','crossback-natural'])for(const count of (tableId==='sweetheart-half-round-60'?[1,2]:[1,3,6,8]))for(const degrees of [0,90,180,270]){
  const def=tables.byId(tableId),w=def.diameterFt||def.widthFt,d=def.diameterFt||def.depthFt,turned=degrees%180===90;
  const item={id:'test-table',kind:'table',tableId,shape:def.shape,x:6,y:6,widthFt:turned?d:w,depthFt:turned?w:d,seatCount:count,chairId,rotationDeg:degrees};
  if(def.shape==='half-round')Object.assign(item,{modelWidthFt:w,modelDepthFt:d,footprintOriented:true});
  const before=JSON.stringify(item),model=context.placedModel(item);model.position.set(item.x+item.widthFt/2-10,0,item.y+item.depthFt/2-10);model.updateMatrixWorld(true);
  const people=guests.guestPositions(tent,[item],100).filter(p=>p.seated),batch=model.children.find(o=>o.userData.role==='chairs');
  assert.ok(batch);near(batch.count,people.length,'chair/guest count');const used=new Set();
  for(const person of people){let closest=Infinity,index=-1,heading=0;for(let i=0;i<batch.count;i++){const m=new THREE.Matrix4();batch.getMatrixAt(i,m);m.premultiply(batch.matrixWorld);const center=new THREE.Vector3().setFromMatrixPosition(m),forward=new THREE.Vector3(0,0,1).transformDirection(m),distance=Math.hypot(person.x-center.x,person.z-center.z);if(distance<closest){closest=distance;index=i;heading=Math.atan2(forward.x,forward.z);}}
   near(closest,0,`${tableId} ${chairId} ${count} seats at ${degrees} degrees guest on chair`);assert.ok(!used.has(index));used.add(index);near(Math.sin(person.heading-heading),0,'same facing');near(Math.cos(person.heading-heading),1,'not facing backward');}
  const bare=context.placedModel({...item,seatCount:0,linenId:null,tabletop:[]});const bounds=new THREE.Box3().setFromObject(bare),size=bounds.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x-item.widthFt)<.04,`${tableId} at ${degrees} X footprint ${size.x} != ${item.widthFt}`);assert.ok(Math.abs(size.z-item.depthFt)<.04,`${tableId} at ${degrees} Z footprint ${size.z} != ${item.depthFt}`);checks+=2;
  assert.equal(JSON.stringify(item),before);cases++;disposal.disposeGroup(model);disposal.disposeGroup(bare);
 }
 console.log(`PASS ${cases} table/chair/rotation/count cases and ${checks} world-space alignment checks.`);
})().catch(e=>{console.error(e);process.exitCode=1});
