// Real Three.js material/mesh contracts. Browser captures separately assess art
// quality; these checks protect scale, grounding, flow and resource isolation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(require('node:url').pathToFileURL(threePath));
 const draw=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),context=vm.createContext({console,document:{createElement:()=>({width:0,height:0,getContext:()=>draw})}}),cache=new Map();
 const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const k of Object.keys(THREE))this.setExport(k,THREE[k]);},{context});
 function moduleFor(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
 async function load(file){const m=moduleFor(path.join(root,file));if(m.status==='unlinked')await m.link((s,r)=>s==='three'?three:moduleFor(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(r.identifier),s)));if(m.status!=='evaluated')await m.evaluate();return m.namespace;}
 const materials=await load('js/ui/rental-materials.js'),furniture=await load('js/ui/equipment3d.js'),tents=await load('js/ui/tent3d.js'),inflatableData=await load('js/data/inflatables.js'),inflatables=await load('js/ui/inflatable3d.js');
 const wood=materials.woodMaterial(),second=materials.woodMaterial();
 assert.equal(wood.map.colorSpace,THREE.SRGBColorSpace);
 for(const map of [wood.bumpMap,wood.roughnessMap])assert.equal(map.colorSpace,THREE.NoColorSpace,'physical data is never decoded as sRGB');
 assert.notEqual(wood.map,second.map,'disposing an event texture cannot invalidate another preview');
 assert.deepEqual(wood.map.image.data,second.map.image.data,'surfaces remain deterministic across reloads');
 const small=materials.physicalSurfaceUV(new THREE.BoxGeometry(4,.1,2),wood),large=materials.physicalSurfaceUV(new THREE.BoxGeometry(8,.1,2),wood);
 const topUVSpan=g=>{const p=g.attributes.position,uv=g.attributes.uv,n=g.attributes.normal,values=[];for(let i=0;i<p.count;i++)if(n.getY(i)>.99)values.push(uv.getX(i));return Math.max(...values)-Math.min(...values);};
 assert.ok(Math.abs(topUVSpan(large)/topUVSpan(small)-2)<1e-6,'doubling table length repeats the material instead of stretching grain');
 const tentSmall=tents.makeTent({type:'pole',widthFt:20,lengthFt:20},'stake').children[0],tentLarge=tents.makeTent({type:'pole',widthFt:40,lengthFt:40},'stake').children[0];
 const uvSpan=g=>{const a=g.attributes.uv.array;let lo=Infinity,hi=-Infinity;for(let i=0;i<a.length;i+=2){lo=Math.min(lo,a[i]);hi=Math.max(hi,a[i]);}return hi-lo;};
 assert.ok(Math.abs(uvSpan(tentLarge.geometry)/uvSpan(tentSmall.geometry)-2)<1e-6,'canopy weave has a physical scale across tent sizes');
 const table=furniture.makeTable({id:'drape',tableId:'round-5ft',shape:'round',widthFt:5,depthFt:5,seatCount:0,linenId:'linen-round-120',linenColor:'White'});
 const cloth=table.children.find(o=>o.material.name==='Linen fabric');assert.ok(cloth);cloth.geometry.computeBoundingBox();assert.ok(cloth.geometry.boundingBox.min.y>=.019,'full-length linen does not pass through the ground');
 for(const v of cloth.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
 assert.ok(uvSpan(cloth.geometry)>20,'linen is not a single stretched cloth image');
 const product=inflatableData.inflatableCatalog([{id:'slide',name:'Tidal Wave Inflatable Water Slide',external_id:'fpr:tidal-wave-inflatable-water-slide',width_ft:16,length_ft:32,height_ft:17}],true)[0];
 const item=inflatableData.inflatableItem(product,'water',4,8),saved=JSON.stringify(item),model=inflatables.createInflatable(item,product),base=model.getObjectByName('Anchored inflatable base');
 model.updateMatrixWorld(true);const originalBase=base.matrixWorld.clone();
 const film=model.getObjectByName('Downhill water film');assert.ok(film,'slide has a dedicated surface-following water layer');
 const p=film.geometry.attributes.position,uv=film.geometry.attributes.uv,last=p.count-2;
 assert.ok(p.getY(0)>p.getY(last),'flow surface descends from the start');assert.ok(uv.getY(0)<uv.getY(last),'flow coordinates increase down the slide');
 model.userData.update(3);model.updateMatrixWorld(true);assert.deepEqual(base.matrixWorld.elements,originalBase.elements,'animation never scales or rolls the ground base');
 assert.ok(film.material.bumpMap.offset.y<0,'surface detail travels downhill');
 const once=film.material.bumpMap.offset.clone();model.userData.update(3);assert.ok(film.material.bumpMap.offset.equals(once),'repeated absolute time cannot advance water');
 const flexMaterial=base.material,shader={uniforms:{},vertexShader:'void main(){\n#include <begin_vertex>\n}'};flexMaterial.onBeforeCompile(shader);
 assert.equal(shader.uniforms.rentalFlexClock.value,3);assert.match(shader.vertexShader,/smoothstep\(1\.6,/,'upper vinyl deformation masks out the base');
 assert.equal(JSON.stringify(item),saved,'material and animation updates cannot mutate saved geometry');
 console.log('PASS rental surfaces: color/data spaces, isolated texture lifetime, physical grain/weave scale, grounded linen, fixed inflatable base, downhill absolute-clock water, saved placement identity');
})().catch(error=>{console.error(error);process.exitCode=1;});
