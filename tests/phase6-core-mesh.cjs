const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(require('node:url').pathToFileURL(threePath));
 const draw=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),context=vm.createContext({console,document:{createElement:()=>({getContext:()=>draw})}}),cache=new Map();
 const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const k of Object.keys(THREE))this.setExport(k,THREE[k]);},{context});
 function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
 async function load(file){const m=mod(path.join(root,file));if(m.status==='unlinked')await m.link((s,r)=>s==='three'?three:mod(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(r.identifier),s)));if(m.status!=='evaluated')await m.evaluate();return m.namespace;}
 const api=await load('js/ui/catalog-phase6.js'),factory=await load('js/ui/phase6-equipment3d.js'),reference=await load('js/data/phase6-reference.js'),products=JSON.parse(fs.readFileSync(root+'/qa-phase6/catalog.json')).products;let checks=0;const rows=[];
 const check=(value,message)=>{assert.ok(value,message);checks++;};
 for(const p of products.filter(p=>reference.phase6Reference(p))){
  const original=JSON.stringify(p),ref=reference.phase6Reference(p),result=api.phase6Model(p);
  if(ref.kind==='reference-only'){
   check(result===null,'reference conflict not guessed in audit');
   const saved={id:'conflict',x:7,y:9,widthFt:3,depthFt:2,heightFt:2,rotationDeg:0},before=JSON.stringify(saved),outline=factory.createPhase6Equipment(p,saved);
   check(outline?.userData.referenceOnly===true,'designer shows outline, never an unrelated modeled machine');
   let physicalMeshes=0;outline.traverse(o=>{if(o.isMesh)physicalMeshes++;});check(physicalMeshes===0,'conflict has no fabricated solid model');
   check(outline.userData.operation.supported===false,'unverified equipment does not animate');check(JSON.stringify(saved)===before,'conflicting rental keeps saved identity and placement');continue;
  }
  check(!!result,p.name);const g=result.model,b=new THREE.Box3().setFromObject(g),size=b.getSize(new THREE.Vector3());
  check([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0),p.name+' bounds');check(original===JSON.stringify(p),'catalog immutable');
  check(b.min.y>=-.025,p.name+' grounded');let meshes=0,vertices=0;
  g.traverse(m=>{if(!m.isMesh)return;meshes++;vertices+=m.geometry.attributes.position.count;check([...m.geometry.attributes.position.array].every(Number.isFinite),'finite vertices');});
  check(meshes<=22,p.name+' merged geometry batches');check(vertices<200000,p.name+' bounded vertices');
  g.userData.setOperating(true);for(const time of [0,.016,.07,.25,1,3])g.userData.update?.(time);g.updateMatrixWorld(true);g.traverse(m=>check(m.matrixWorld.elements.every(Number.isFinite),'finite animated transform'));
  g.userData.setOperating(false);const stopped=g.children.map(o=>o.matrix.toArray());g.userData.update?.(5);g.updateMatrixWorld(true);check(JSON.stringify(stopped)===JSON.stringify(g.children.map(o=>o.matrix.toArray())),'stopped model stable');
  if(ref.type==='connect-four'){check(g.userData.features.holes===42,'42 holes');const q=g.userData.features.openHoleProbe,point=new THREE.Vector3(q.x*wFor(ref),q.y*ref.dimensions[2],10);function wFor(r){return r.dimensions[0];}const hits=new THREE.Raycaster(point,new THREE.Vector3(0,0,-1)).intersectObject(g,true);check(hits.length===0,'empty connect four opening is a real through hole');}
  rows.push({slug:ref.slug,name:p.name,meshes,vertices,features:g.userData.features,bounds:{x:size.x,y:size.y,z:size.z},ground:b.min.y});
 }
 for(const type of ['popcorn-machine','large-connect-four','photobooth-6-hour-no-attendant']){
  const p=products.find(p=>p.external_id==='fpr:'+type);for(const angle of [-270,-90,0,90,180,270,450]){const item={id:'saved',x:8,y:12,modelWidthFt:2,modelDepthFt:3,heightFt:4,widthFt:angle%180?3:2,depthFt:angle%180?2:3,rotationDeg:angle,operationState:'off'},before=JSON.stringify(item);const g=factory.createPhase6Equipment(p,item);check(before===JSON.stringify(item),'saved placement untouched');check(g.scale.x===2&&g.scale.z===3&&g.scale.y===4,'original local envelope retained');}
 }
 for(const slug of ['cotton-candy-machinefloss-maker','hot-dog-roller-grill']){
  const p=products.find(p=>p.external_id==='fpr:'+slug),model=factory.createPhase6Equipment(p);
  check(slug.startsWith('cotton')?model.userData.features.wallProfile==='near-cylindrical':model.userData.features.curvedGuard===true,'reviewed photo-specific shape retained');
 }
 check(factory.createPhase6Equipment({name:'Popcorn Machine',externalId:'other:popcorn-machine'}, {})===null,'similar foreign source not mapped');
 fs.writeFileSync(root+'/qa-phase6/geometry.json',JSON.stringify({checks,rows},null,2));console.log('PASS Phase 6 core: '+checks+' mesh, identity, saved-placement and animation checks across '+rows.length+' source models.');
})().catch(e=>{console.error(e);process.exitCode=1});
