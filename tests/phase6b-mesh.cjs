const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(require('node:url').pathToFileURL(threePath));
 const draw=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),context=vm.createContext({console,document:{createElement:()=>({getContext:()=>draw})}}),cache=new Map();
 const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const k of Object.keys(THREE))this.setExport(k,THREE[k]);},{context});
 function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
 async function load(file){const m=mod(path.join(root,file));if(m.status==='unlinked')await m.link((s,r)=>s==='three'?three:mod(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(r.identifier),s)));if(m.status!=='evaluated')await m.evaluate();return m.namespace;}
 const factory=await load('js/ui/phase6b-models3d.js'),reference=await load('js/data/phase6b-reference.js'),dims=await load('js/data/phase6b-dimensions.js'),eq=await load('js/data/equipment.js'),motion=await load('js/ui/equipment-motion3d.js'),accessory=await load('js/ui/accessory3d.js'),tops=await load('js/data/tabletop.js'),topFactory=await load('js/ui/tabletop3d.js');
 const products=JSON.parse(fs.readFileSync(root+'/qa-phase6b/catalog.json')).products;let checks=0;const rows=[];const check=(v,msg)=>{assert.ok(v,msg);checks++;};
 for(const slug of reference.PHASE6B_SLUGS){
  const matches=products.filter(p=>p.external_id==='fpr:'+slug&&p.active!==false);check(matches.length===1,slug+' exact source');const p=matches[0],ref=reference.phase6bReference(p),before=JSON.stringify(p),g=factory.createPhase6bModel(p),expected=dims.phase6bDimensions(p);
  check(!!g,slug+' returned model');g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3());check([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0),slug+' finite bounds');
  check(Math.abs(size.x-expected.widthFt)<.001&&Math.abs(size.z-(ref.verticalFace?Math.min(expected.depthFt,ref.visualDepthFt):expected.depthFt))<.001&&Math.abs(size.y-expected.heightFt)<.001,slug+' exact planning envelope');check(Math.abs(bounds.min.y)<.0001,slug+' grounded');
  let meshes=0,vertices=0;g.traverse(o=>{if(!o.isMesh)return;meshes++;vertices+=o.geometry.attributes.position.count;check([...o.geometry.attributes.position.array].every(Number.isFinite),slug+' finite actual vertices');});
  check(meshes<=20,slug+' bounded draw batches');check(vertices<450000,slug+' bounded geometry');check(JSON.stringify(p)===before,slug+' immutable product');check(g.userData.reference.externalId===p.external_id,slug+' source retained');
  if(ref.kind==='reference-only'){check(meshes===0,slug+' no invented physical model');check(g.userData.referenceOnly===true,slug+' explicit conflict');}
  else check(meshes>0,slug+' physical geometry');
  const originalOp=JSON.stringify(g.children.map(c=>c.matrix.toArray()));g.userData.setOperating?.(true);g.userData.update?.(3);g.updateMatrixWorld(true);check(originalOp===JSON.stringify(g.children.map(c=>c.matrix.toArray())),slug+' no invented flame/recording/effects');
  if((ref.kind==='equipment'||ref.placement==='equipment')){
   const [def]=eq.equipmentCatalog([p],false);check(!!def,slug+' floor catalog');eq.EQUIPMENT.splice(0,eq.EQUIPMENT.length,def);
   for(const angle of [-270,-90,0,90,180,270]){const item={...eq.equipmentItem(def,'saved',8,12),modelWidthFt:3,modelDepthFt:2,heightFt:4,widthFt:angle%180?2:3,depthFt:angle%180?3:2,rotationDeg:angle},saved=JSON.stringify(item),model=motion.createEquipment(item),legacy=accessory.createAccessory3d({...item,kind:'accessory',accessoryType:def.type,externalId:p.external_id});
    check(model.userData.phase6b===true&&legacy.userData.phase6b===true,slug+' actual modern and legacy adapters');check(model.scale.x===3&&model.scale.z===2&&model.scale.y===4,slug+' saved envelope preserved');check(JSON.stringify(item)===saved,slug+' placement immutable');}
  }else{
   const [top]=tops.tabletopCatalog([p],false);check(!!top,slug+' tabletop selection retained');tops.TABLETOP.splice(0,tops.TABLETOP.length,top);
   const item={id:'table',shape:'rect',widthFt:8,depthFt:2.5,seatCount:0,tabletop:[{productId:p.id,qty:2,perSeat:false}]},saved=JSON.stringify(item),model=topFactory.makeTabletop(item,2.5);let shared=0;model.traverse(o=>{if(o.userData.phase6b)shared++;});check(shared===2,slug+' two chosen quantities use same physical factory');check(JSON.stringify(item)===saved,slug+' tabletop selection immutable');
  }
  if(['serving-bowl','wine-bucket','rim-bowl','highball','flute','bus-bin','ribbed-pitcher'].includes(ref.type)){
   // Check the center hits the interior floor, not an opaque cap at rim level.
   const hits=new THREE.Raycaster(new THREE.Vector3(0,expected.heightFt*2,0),new THREE.Vector3(0,-1,0)).intersectObject(g,true);check(hits.length>0,slug+' has an interior base');check(hits[0].point.y<expected.heightFt*.65,slug+' opening is not painted onto a solid cap');
  }
  if(['round-arch','hex-arch','arbor','gold-easel'].includes(ref.type)){const hits=new THREE.Raycaster(new THREE.Vector3(ref.type==='gold-easel'?expected.widthFt*.12:0,expected.heightFt*.58,expected.depthFt*3),new THREE.Vector3(0,0,-1)).intersectObject(g,true);check(hits.length===0,slug+' frame center is open');}
  if(ref.type==='movie-screen'){check(g.userData.features.physicalPackages===1&&g.userData.features.componentRentalLines===0,'one package remains one rental');}
  if(ref.type==='metal-shakers')check(g.userData.features.physicalCount===2,'two physical shakers remain one set');
  if(ref.type==='sheet-pan'||ref.type==='bus-bin')for(const [x,z] of [[.42,0],[0,.42],[.40,.30],[-.40,-.30]]){
   const hits=new THREE.Raycaster(new THREE.Vector3(expected.widthFt*x,expected.heightFt*2,expected.depthFt*z),new THREE.Vector3(0,-1,0)).intersectObject(g,true);check(hits.length>0,slug+' continuous floor-to-wall surface without open edge gaps');
  }
  if(ref.type==='audio-phone'){
   const darkBounds=new THREE.Box3();g.traverse(o=>{if(o.isMesh&&o.material.color?.getHex()===0x24282b)darkBounds.union(new THREE.Box3().setFromObject(o));});
   const center=darkBounds.getCenter(new THREE.Vector3()),span=darkBounds.getSize(new THREE.Vector3());
   for(const offset of [-.25,0,.25]){
    const ray=new THREE.Raycaster(new THREE.Vector3(center.x+span.x*.19,expected.heightFt*2,center.z+span.z*offset),new THREE.Vector3(0,-1,0)),hits=ray.intersectObject(g,true),dial=hits.find(h=>h.object.material.color?.getHex()===0x24282b),housing=hits.find(h=>h.object.material.color?.getHex()===0xeeeae0&&(!dial||h.point.y<dial.point.y));
    check(!!dial&&!!housing,slug+' dial and underlying housing both exist');check(dial.point.y-housing.point.y<expected.heightFt*.08,slug+' dial stays attached to sloped housing across its face');
   }
  }
  if(ref.verticalFace){check(size.z<=.31,slug+' thin panel is not stretched across its support footprint');check(expected.depthFt>=1.5,slug+' uncertain support footprint remains separate');}
  if(ref.type==='sequin-wall'){
   let textureProof=false;g.traverse(o=>{if(o.isMesh&&o.material.map&&o.material.bumpMap){const uv=o.geometry.getAttribute('uv');let max=0;for(let i=0;i<uv.count;i++)max=Math.max(max,uv.getX(i),uv.getY(i));textureProof=max>=12&&o.material.bumpScale<=.002;}});check(textureProof,slug+' fine sequin scale instead of oversized checker texture');
  }
  if(ref.type==='serving-tongs'){
   const hits=new THREE.Raycaster(new THREE.Vector3(0,expected.heightFt*2,-expected.depthFt*.33),new THREE.Vector3(0,-1,0)).intersectObject(g,true);
   check(hits.some(hit=>hit.object.material.side===THREE.DoubleSide),slug+' spoon head remains visible from above');
  }
  if(['chafer-round','chafer-round-gold','chafer-soup'].includes(ref.type)){
   const components=[];g.traverse(o=>{if(o.isMesh)components.push(o);});check(components.length>0,slug+' empty burner holder has modeled support');
  }
  rows.push({slug,name:p.name,placement:ref.kind,meshes,vertices,dimensions:{width:size.x,depth:size.z,height:size.y},features:g.userData.features});
 }
 check(factory.createPhase6bModel({externalId:'other:bus-bin',name:'Bus Bin'})===null,'foreign similar name not matched');
 fs.writeFileSync(root+'/qa-phase6b/geometry.json',JSON.stringify({checks,rows},null,2));console.log('PASS '+checks+' actual Phase 6B geometry, immutable placement, exact identity and shared renderer checks across '+rows.length+' records');
})().catch(e=>{console.error(e);process.exitCode=1;});
