// Read-only visual evidence from live public product data and the checked-out renderer.
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out='qa-catalog';fs.mkdirSync(out,{recursive:true});
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(url+' HTTP '+r.status);return r.json();}
const harness=`<!doctype html><meta charset="utf-8"><style>body{margin:0}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/tests/node_modules/three/build/three.module.js","three/addons/":"/tests/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import {inflatableCatalog} from '/js/data/inflatables.js';
import {createInflatable} from '/js/ui/inflatable3d.js';
import {makeTent} from '/js/ui/tent3d.js';
import {makeWindowWallSegment} from '/js/ui/window-wall3d.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(720,600);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.appendChild(renderer.domElement);
window.renderRental=(product,kind='inflatable')=>{
 const scene=new THREE.Scene();scene.background=new THREE.Color('#eff2ef');scene.add(new THREE.HemisphereLight(0xffffff,0x858e88,2.6));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-25,45,35);scene.add(sun);
 let model,definition;
 if(kind==='sidewall'){definition={name:'20ft cathedral panel'};model=makeWindowWallSegment(20,7.6,{panelWidthFt:20});}
 else if(kind==='tent'){definition={id:'frame-20x40',name:'20x40 Frame Tent',type:'frame',widthFt:20,lengthFt:40};const walls=[];for(const side of ['front','left'])for(let i=0;i<(side==='front'?2:4);i++)walls.push({id:side+i,panelId:side+Math.floor(i/2),side,type:'window',startFt:i*10,lengthFt:10,panelWidthFt:20});model=makeTent(definition,'none',walls);}
 else{definition=inflatableCatalog([product],false)[0];if(!definition)throw new Error('No inflatable mapping for '+product.name);model=createInflatable({id:'qa-item',inflatableId:definition.id,rotationDeg:0},definition);}
 scene.add(model);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const camera=new THREE.PerspectiveCamera(36,720/600,.05,1500),dist=Math.max(size.x,size.y,size.z)*1.75;
 const dir=kind==='tent'?new THREE.Vector3(-.8,.52,-1):kind==='sidewall'?new THREE.Vector3(.06,.05,1):new THREE.Vector3(.85,.6,1);dir.normalize();camera.position.copy(center).addScaledVector(dir,dist);camera.lookAt(center);renderer.render(scene,camera);
 return {name:definition.name,slug:definition.slug,variant:definition.variant,style:definition.style,lanes:definition.lanes,widthFt:definition.widthFt,depthFt:definition.depthFt,heightFt:definition.heightFt,bounds:size.toArray(),meshes:(()=>{let n=0;model.traverse(o=>{if(o.isMesh)n++;});return n;})()};
};window.qaReady=true;
</script>`;
fs.writeFileSync(out+'/harness.html',harness);
(async()=>{
 const catalog=await json('https://rentsketch-api-production.up.railway.app/api/tenants/friendly/products'),website=await json('https://www.friendlypartyrental.com/api/items');
 fs.writeFileSync(out+'/rentsketch-products.json',JSON.stringify(catalog,null,2));fs.writeFileSync(out+'/website-items.json',JSON.stringify(website,null,2));
 const products=catalog.products||[],siteItems=website.items||[],selected=products.filter(p=>/bounce\s*house|water\s*slide|waterslide|side\s*wall|sidewall/i.test(p.name)&&!/package/i.test(p.name));
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:720,height:600}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8765/qa-catalog/harness.html');await page.waitForFunction(()=>window.qaReady===true);
 const report=[];
 for(const p of selected){
  const slug=String(p.external_id||'').replace(/^fpr:/,''),matches=siteItems.filter(x=>x.slug===slug||String(x.id)===String(p.id)),match=matches.length===1?matches[0]:null,key=slug.replace(/[^a-zA-Z0-9_-]/g,'_')||p.id;
  const entry={id:p.id,name:p.name,slug,websiteMatch:match?{id:match.id,slug:match.slug,name:match.name,setupArea:match.setupArea,description:match.description}:null,referenceUrl:match?'https://www.friendlypartyrental.com/api/item-image/'+encodeURIComponent(match.slug):p.photo_url};
  if(entry.referenceUrl){try{const r=await fetch(entry.referenceUrl,{signal:AbortSignal.timeout(20000)});entry.photoHttp=r.status;entry.photoType=r.headers.get('content-type');if(r.ok&&entry.photoType?.startsWith('image/')){fs.writeFileSync(path.join(out,key+'-reference.img'),Buffer.from(await r.arrayBuffer()));entry.referenceFile=key+'-reference.img';}}catch(e){entry.photoError=String(e);}}
  if(!/side\s*wall|sidewall/i.test(p.name)){entry.render=await page.evaluate(p=>window.renderRental(p),p);await page.screenshot({path:path.join(out,key+'-model.png')});entry.modelFile=key+'-model.png';}
  report.push(entry);
 }
 for(const kind of ['sidewall','tent']){report.push({type:kind+'-render',render:await page.evaluate(kind=>window.renderRental(null,kind),kind),modelFile:kind+'-model.png'});await page.screenshot({path:out+'/'+kind+'-model.png'});}
 fs.writeFileSync(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),errors,products:report},null,2));console.log(JSON.stringify({captured:report.length,errors,photoFailures:report.filter(r=>r.referenceUrl&&!r.referenceFile).map(r=>({name:r.name,status:r.photoHttp,error:r.photoError}))},null,2));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
