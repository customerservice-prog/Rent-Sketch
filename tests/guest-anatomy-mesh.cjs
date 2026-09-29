const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'..'),threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(pathToFileURL(threePath));
 const context=vm.createContext({console}),cache=new Map(),three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const key of Object.keys(THREE))this.setExport(key,THREE[key]);},{context});
 function get(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
 const module=get(path.join(root,'js/ui/scene-guests.js'));await module.link((s,r)=>s==='three'?three:get(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(r.identifier),s)));await module.evaluate();
 let checks=0;const check=(ok,message)=>{checks++;assert.ok(ok,message);};
 const fixture={id:'qa-table',kind:'table',tableId:'round-5ft',shape:'round',widthFt:5,depthFt:5,seatCount:8,chairId:'resin-white',x:7.5,y:7.5};
 for(const mobile of [true,false]){
  const objects=[{...fixture}],before=JSON.stringify(objects),group=module.namespace.createGuests({type:'frame',widthFt:20,lengthFt:20},objects,{mobile});
  check(group.userData.decorative===true,'guests are explicitly decorative');check(group.children.length<=11,'eleven instanced guest batches maximum');check(group.userData.people.filter(p=>p.seated).length===8,'each selected chair retains a seated guest');
  check(group.userData.people.every(p=>Math.abs(p.x)<10&&Math.abs(p.z)<10),'guests remain inside tent space');
  const skin=group.getObjectByName('Guests · skin'),initial=Array.from(skin.instanceMatrix.array);
  for(const dt of [0,-1,NaN,Infinity])group.userData.update(dt);
  assert.deepEqual(Array.from(skin.instanceMatrix.array),initial,'invalid or zero delta keeps a static preview');checks++;
  for(let i=0;i<90;i++)group.userData.update(1/30);
  check(Array.from(skin.instanceMatrix.array).some((x,i)=>x!==initial[i]),'real articulated mesh animates');
  let triangles=0;for(const b of group.children){check(b.isInstancedMesh,'batched rendering');check(b.count<=b.instanceMatrix.count,'no instance buffer overrun');check(Array.from(b.instanceMatrix.array).every(Number.isFinite),'finite animated transforms');check(Array.from(b.geometry.attributes.position.array).every(Number.isFinite),'finite model geometry');triangles+=(b.geometry.index?.count||b.geometry.attributes.position.count)/3*b.count;}
  check(triangles<200000,'nine guest test stays below 200k rendered triangles');assert.equal(JSON.stringify(objects),before);checks++;
  const head=group.getObjectByName('Guests · head');head.geometry.computeBoundingBox();check(head.geometry.boundingBox.getSize(new THREE.Vector3()).y<1,'anatomical head is under one foot tall');check(head.geometry.attributes.position.count>3000,'sculpted face is not a sphere');
  group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
 }
 for(const count of [24,40]){const people=Array.from({length:count},(_,i)=>({x:i%8*2,z:Math.floor(i/8)*2,heading:0,seated:false,activity:'conversation'})),group=module.namespace.createGuestBatch(people);group.userData.update(.033);check(group.children.length===11,'crowd size does not add per-person draws');check(group.userData.people.length===count,'requested preview crowd count retained');for(const b of group.children)check(b.count<=b.instanceMatrix.count,'large crowd stays inside buffers');group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
 const view=fs.readFileSync(path.join(root,'js/ui/view3d.js'),'utf8');check(view.includes('prefers-reduced-motion'),'existing reduced-motion behavior retained');
 check(fs.statSync(path.join(root,'js/data/guest-anatomy.js')).size<300000,'local compressed-friendly geometry is bounded');
 console.log('PASS '+checks+' guest geometry, seating, animation, batching, data-preservation and accessibility checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
