const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(require('node:url').pathToFileURL(threePath));
  const context=vm.createContext({console,TextDecoder,TextEncoder,ArrayBuffer,DataView,Uint8Array,AbortController,setTimeout,clearTimeout,URL,Blob,crypto:require('node:crypto').webcrypto,globalThis:undefined});vm.runInContext('globalThis=this',context);
  const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const key of Object.keys(THREE))this.setExport(key,THREE[key]);},{context}),cache=new Map();
  function moduleFor(file){if(cache.has(file))return cache.get(file);const module=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,module);return module;}
  const entry=moduleFor(path.join(root,'js/ui/packaged-asset-loader.js'));await entry.link((s,ref)=>s==='three'?three:moduleFor(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(ref.identifier),s)));await entry.evaluate();
  const {loadRentalAsset,enhancePlacedVisual,disposeRentalAsset,clearPackagedAssetCache,packagedAssetCacheInfo,fetchPackagedAsset}=entry.namespace;
  let calls=0;const fetcher=async(url,options)=>{calls++;assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return new Response(fs.readFileSync(path.join(root,url)),{headers:{'content-type':'model/gltf-binary'}});};
  const item={id:'post',kind:'equipment',visualType:'stanchion',widthFt:2,depthFt:1.4,heightFt:3.6,rotationDeg:90,x:10,y:20},snapshot=JSON.stringify(item);
  const [a,b]=await Promise.all([loadRentalAsset(item,{fetcher}),loadRentalAsset(item,{fetcher})]);
  assert.equal(calls,1,'concurrent requests share validated bytes');assert.equal(JSON.stringify(item),snapshot,'authoritative placement unchanged');
  a.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(a),size=bounds.getSize(new THREE.Vector3());
  for(const [actual,expected] of [[size.x,2],[size.y,3.6],[size.z,1.4],[bounds.min.y,0]])assert.ok(Math.abs(actual-expected)<1e-5,actual+' expected '+expected);
  assert.equal(a.rotation.y,0,'renderer remains sole placement rotation owner');assert.equal(a.userData.asset.dimensionsVerified,false);
  const ma=[],mb=[];a.traverse(o=>{if(o.isMesh)ma.push(o)});b.traverse(o=>{if(o.isMesh)mb.push(o)});
  assert.equal(ma.length,4);assert.notEqual(ma[0].geometry,mb[0].geometry);assert.notEqual(ma[0].material,mb[0].material);
  let otherDisposed=false;mb[0].geometry.addEventListener('dispose',()=>otherDisposed=true);disposeRentalAsset(a);assert.equal(otherDisposed,false,'one placement disposal does not invalidate another');
  const fallback=()=>{const g=new THREE.Group();g.rotation.y=-Math.PI/2;g.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));return g;};
  const ok=enhancePlacedVisual(fallback(),item,{fetcher});assert.equal(ok.group.userData.assetDeliveryState,'loading');assert.equal(await ok.ready,true);assert.equal(ok.group.userData.assetDeliveryState,'ready');assert.equal(ok.group.rotation.y,-Math.PI/2);disposeRentalAsset(ok.group);
  clearPackagedAssetCache();let finish;const delayed=()=>new Promise(resolve=>finish=resolve),old=fallback(),cancelled=enhancePlacedVisual(old,item,{fetcher:delayed});cancelled.cancel();finish(await fetcher('/assets/models/stanchion-black/2026.09.27.1/standard.glb',{credentials:'omit',redirect:'error'}));assert.equal(await cancelled.ready,false);assert.equal(cancelled.group.children[0],old,'cancelled completion never replaces fallback');disposeRentalAsset(cancelled.group);
  clearPackagedAssetCache();const original=fallback(),failed=enhancePlacedVisual(original,item,{fetcher:async()=>new Response('not a model',{status:503})});assert.equal(await failed.ready,false);assert.equal(failed.group.userData.assetDeliveryState,'fallback');assert.equal(failed.group.children[0],original);
  await assert.rejects(()=>fetchPackagedAsset({url:'/assets/models/unapproved/2026.09.27.1/standard.glb',maxBytes:Infinity},{fetcher}),/Unapproved/);
  clearPackagedAssetCache();assert.equal(packagedAssetCacheInfo().bytes,0);disposeRentalAsset(b);disposeRentalAsset(failed.group);
  console.log('PASS packaged assets: real GLB load, single fetch, dimensions, own GPU resources, fallback, cancellation, and URL allowlist');
})().catch(error=>{console.error(error);process.exitCode=1;});
