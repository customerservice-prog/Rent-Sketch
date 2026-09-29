const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(require('node:url').pathToFileURL(threePath));
 const draw=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),context=vm.createContext({console,document:{createElement:()=>({getContext:()=>draw})}}),cache=new Map();
 const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const k of Object.keys(THREE))this.setExport(k,THREE[k]);},{context});
 function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
 async function load(file){const m=mod(path.join(root,file));if(m.status==='unlinked')await m.link((s,r)=>s==='three'?three:mod(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(r.identifier),s)));if(m.status!=='evaluated')await m.evaluate();return m.namespace;}
 const api=await load('js/ui/catalog-phase5.js'),factory=await load('js/ui/phase5-equipment3d.js'),reference=await load('js/data/phase5-reference.js'),products=JSON.parse(fs.readFileSync(root+'/qa-phase5/catalog.json')).products;let checks=0;const rows=[];
 const check=(v,n)=>{assert.ok(v,n);checks++;};
 for(const p of products.filter(p=>reference.phase5Reference(p))){const before=JSON.stringify(p),result=api.phase5Model(p,products);if(p.external_id==='fpr:stage-ramp'){check(result===null,'ramp photo conflict cannot become a made-up model');continue;}
  check(!!result,p.name);const g=result.model,b=new THREE.Box3().setFromObject(g),size=b.getSize(new THREE.Vector3());check([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0),'finite bounds');check(before===JSON.stringify(p),'catalog unchanged');let vertices=0,meshes=0;
  for(const t of [0,.016,.04,.09])g.userData.update?.(t);g.updateMatrixWorld(true);
  g.traverse(m=>{check(m.matrixWorld.elements.every(Number.isFinite),'finite transformed mesh');if(m.isMesh){check([...m.geometry.attributes.position.array].every(Number.isFinite),'finite vertices');vertices+=m.geometry.attributes.position.count;meshes++;}});
  check(vertices<600000,'bounded geometry');check(meshes<=40,'bounded static draw calls');rows.push({id:p.id,name:p.name,slug:p.external_id.slice(4),meshes,vertices,bounds:{x:size.x,y:size.y,z:size.z},features:g.userData.features||g.userData});
  if(p.external_id==='fpr:uplighting-package-12-lights')check(g.userData.fixtureCount===12,'twelve physical uplights');
  if(p.external_id==='fpr:wireless-led-uplight')check(g.userData.fixtureCount===1,'one physical uplight');
  if(p.external_id==='fpr:battery-operated-crystal-chandelier')check(g.userData.fixtureCount===1,'one chandelier');
  if(result.reference.kind==='lighting'){const installed=api.phase5Model(p,products,{installed:true});check(!!installed,'installed lighting render');installed.model.userData.setNight?.(true);installed.model.traverse(m=>{if(m.isLight)check(Number.isFinite(m.intensity),'finite night intensity');});}
 }
 const original={id:'saved',name:'Generator',productId:'unmodified',externalId:'fpr:4375-watt-generator',modelWidthFt:3,modelDepthFt:2.3,heightFt:2.5,widthFt:2.3,depthFt:3,x:17,y:8,rotationDeg:90},before=JSON.stringify(original),g=factory.createPhase5Equipment({externalId:original.externalId,widthFt:9,depthFt:9,heightFt:9},original);check(JSON.stringify(original)===before,'saved state unchanged');const s=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());check(s.x<=3.01&&s.z<=2.4&&s.y<=2.51,'saved physical envelope retained');g.userData.setOperating(false);const stopped=g.children[1]?.position.y;g.userData.update?.(20);check(g.children[1]?.position.y===stopped,'stopped engine stays still');
 fs.mkdirSync(root+'/qa-phase5',{recursive:true});fs.writeFileSync(root+'/qa-phase5/geometry.json',JSON.stringify({checks,rows},null,2));console.log('PASS Phase 5: '+checks+' source identity, geometry, animation, footprint and lighting checks across '+rows.length+' models.');
})().catch(e=>{console.error(e);process.exitCode=1});
