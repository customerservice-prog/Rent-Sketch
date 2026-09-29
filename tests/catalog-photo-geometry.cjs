// Actual Three.js geometry, no WebGL and no live data mutation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(require('node:url').pathToFileURL(threePath));
 const draw=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),context=vm.createContext({console,document:{createElement:()=>({width:0,height:0,getContext:()=>draw})}}),cache=new Map();
 const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const k of Object.keys(THREE))this.setExport(k,THREE[k]);},{context});
 function moduleFor(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
 async function load(file){const m=moduleFor(path.join(root,file));if(m.status==='unlinked')await m.link((s,r)=>s==='three'?three:moduleFor(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(r.identifier),s)));if(m.status!=='evaluated')await m.evaluate();return m.namespace;}
 const data=await load('js/data/inflatables.js'),render=await load('js/ui/inflatable3d.js'),walls=await load('js/ui/window-wall3d.js'),contextual=await load('js/core/contextual-products.js');
 let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
 const bounds=model=>{model.updateMatrixWorld(true);return new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());};
 const renamed=data.inflatableCatalog([{id:'real-crayon',name:'Rainbow Castle Bounce House',external_id:'fpr:crayon-bounce-house'}],false)[0];
 check(renamed.variant==='crayon','Source slug takes precedence over renamed display label');
 const models=[];
 for(const p of data.INFLATABLE_PROFILES){
  const raw={id:p.slug,name:p.slug.includes('bounce-house')?'Bounce House':'Water Slide',external_id:'fpr:'+p.slug};
  const product=data.inflatableCatalog([raw],false)[0],item=data.inflatableItem(product,'qa-'+p.slug),snapshot=JSON.stringify(item),mesh=render.createInflatable(item,product),size=bounds(mesh);
  check(size.x<=product.widthFt+.04,`${p.slug}: width ${size.x} exceeds ${product.widthFt}`);
  check(size.z<=product.depthFt+.04,`${p.slug}: depth ${size.z} exceeds ${product.depthFt}`);
  check(size.y<=product.heightFt+.04,`${p.slug}: height ${size.y} exceeds ${product.heightFt}`);
  check(mesh.userData.visualApproval==='pending',p.slug+': geometry rebuild must not claim approval');
  mesh.traverse(o=>{if(o.geometry){const pos=o.geometry.getAttribute('position');if(pos)for(const n of pos.array)assert.ok(Number.isFinite(n),'All vertices must be finite');}});
  const rotated=render.createInflatable({...item,widthFt:item.depthFt,depthFt:item.widthFt,rotationDeg:90},product),turned=bounds(rotated);
  check(Math.abs(turned.x-size.z)<1e-5&&Math.abs(turned.z-size.x)<1e-5,p.slug+': rotation uses saved local footprint once');
  mesh.userData.update(3);check(JSON.stringify(item)===snapshot,p.slug+': rendering cannot change saved placement');
  const s=data.inflatableZones(product).slide;
  if(s?.climb){for(let lane=0;lane<s.lanes;lane++){
    const pt=render.slidePoint(s,lane,.4);check(Math.abs(pt.x-s.climb.x)>(s.laneWidth+s.climb.width)/2,p.slug+': climbing strip must be outside slide lanes');
  }}
  models.push({slug:p.slug,width:+size.x.toFixed(3),depth:+size.z.toFixed(3),height:+size.y.toFixed(3),lanes:s?.lanes||0});
 }
 const legacy={...data.inflatableItem(renamed,'legacy'),modelProfile:{version:2,variant:'rainbow-castle',style:'castle',colors:['#1453bb','#efc829','#d73b30','#36a44d']}};
 check(data.resolvedInflatableDefinition(legacy,renamed).variant==='crayon','Legacy mislabeled style repaired using same source id');
 const skus=[['10x10-pop-up-sidewall','10x10 Pop-Up Sidewall',10,'solid'],['20-side-wall-tent',"20' Side Wall Tent",20,'solid'],['20-side-wall-with-windows',"20' Side Wall with Windows",20,'window']];
 for(const [slug,name,panelFt,type] of skus){const wall=contextual.contextualProducts({products:[{id:slug,external_id:'fpr:'+slug,name,category:'other'}]})[0];check(wall?.panelFt===panelFt&&wall.type===type,name+': real stock parsed without invented metadata');}
 const panel=walls.makeWindowWallSegment(20,7.6,{panelWidthFt:20}),half=walls.makeWindowWallSegment(10,7.6,{panelWidthFt:20});
 check(panel.userData.windowCount===2,'20ft panel has two arched windows');check(half.userData.windowCount===1,'10ft rendered half does not duplicate whole-panel artwork');
 const panes=[];panel.traverse(o=>{if(o.name==='Clear arched pane')panes.push(o);});
 check(panes.length===2,'Separate clear windows, not full transparent wall');
 for(const pane of panes){pane.geometry.computeBoundingBox();const b=pane.geometry.boundingBox;check(b.min.y>0&&b.max.y<7.6,'White vinyl remains above and below pane');}
 console.log(JSON.stringify({checks,models,windowStyle:'two cathedral arches per 20ft panel'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
