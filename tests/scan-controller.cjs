// Exercise real reconstruction + real view3d camera state with a renderer stub.
// This catches stale copied metadata between the wrapper group and scan world;
// it is not a claim about GPU appearance or field reconstruction quality.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{JSDOM}=require('jsdom');
(async()=>{
  const root=path.resolve(__dirname,'..'),threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(pathToFileURL(threePath));
  const {knownScan}=await import('./scan-fixture.mjs'),fixture=knownScan({width:176,height:110,disparity:12,offsets:[-3,-2,-1,0,1,2,3]});
  const dom=new JSDOM('<!doctype html><div id="scene"></div>',{pretendToBeVisual:true}),w=dom.window,container=w.document.getElementById('scene');
  let width=800,height=600,renderer,controls,resize,jobStatus;
  Object.defineProperties(container,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});w.matchMedia=()=>({matches:false});
  class CaptureImage{set src(url){this.frame=fixture.frames[Number(url.split('/').at(-1))]||fixture.frames[3];this.width=this.naturalWidth=this.frame.width;this.height=this.naturalHeight=this.frame.height;this.complete=true;queueMicrotask(()=>this.onload?.());}}
  w.HTMLCanvasElement.prototype.getContext=function(){const canvas=this,context={createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage(image){this.source=image?.frame;},
    getImageData(){const data=new Uint8ClampedArray(canvas.width*canvas.height*4),source=this.source;if(source)for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const sx=Math.min(source.width-1,Math.floor(x/canvas.width*source.width)),sy=Math.min(source.height-1,Math.floor(y/canvas.height*source.height));data.set(source.data.subarray((sy*source.width+sx)*4,(sy*source.width+sx)*4+4),(y*canvas.width+x)*4);}return {width:canvas.width,height:canvas.height,data};},
    createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)})};return new Proxy(context,{get:(target,key)=>target[key]||(()=>{})});};
  class Renderer{constructor(){renderer=this;this.domElement=w.document.createElement('canvas');this.domElement.getBoundingClientRect=()=>({left:0,top:0,width,height});this.shadowMap={};}setPixelRatio(){}setSize(){}render(scene,camera){this.scene=scene;this.camera=camera;}dispose(){}}
  class Controls{constructor(camera){controls=this;this.camera=camera;this.target=new THREE.Vector3();this.touches={};}addEventListener(){}update(){this.camera.lookAt(this.target);this.camera.updateMatrixWorld(true);}dispose(){}}
  class PMREM{fromEquirectangular(){return {texture:new THREE.Texture(),dispose(){}};}fromScene(){return {texture:new THREE.Texture(),dispose(){}};}dispose(){}}
  let rafId=0;const rafs=new Map(),context=vm.createContext({console,window:w,document:w.document,Image:CaptureImage,URL,DOMException,AbortController,setTimeout,clearTimeout,queueMicrotask,performance:{now:()=>0},ResizeObserver:class{constructor(fn){resize=fn;}observe(){}disconnect(){}},requestAnimationFrame:fn=>{rafs.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>rafs.delete(id)}),cache=new Map();
  const overrides={WebGLRenderer:Renderer,PMREMGenerator:PMREM},three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const key of Object.keys(THREE))this.setExport(key,overrides[key]||THREE[key]);},{context});
  const orbit=new vm.SyntheticModule(['OrbitControls'],function(){this.setExport('OrbitControls',Controls);},{context});
  function moduleFor(file){if(cache.has(file))return cache.get(file);const mod=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file,initializeImportMeta(meta){meta.url=pathToFileURL(file).href;}});cache.set(file,mod);return mod;}
  const mod=moduleFor(path.join(root,'js/ui/view3d.js'));await mod.link((specifier,ref)=>specifier==='three'?three:specifier.endsWith('/OrbitControls.js')?orbit:moduleFor(specifier.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',specifier.slice(13)):path.resolve(path.dirname(ref.identifier),specifier)));await mod.evaluate();
  const view=mod.namespace.init(container,{onScanReconstruction:status=>{jobStatus=status;}}),sample=index=>({id:'frame-'+index,url:'https://fixture.test/'+index,offsetFactor:(index-3)/6});
  const scan={frames:[{...sample(0),role:'left'},{...sample(3),role:'center'},{...sample(6),role:'right'}],samples:fixture.frames.map((_,i)=>sample(i)),baselineFt:6,fovDeg:60};
  const state={tent:{id:'scan-site',isSite:true,type:'outdoor',widthFt:50,lengthFt:60},objects:[],photoSite:{widthFt:50,lengthFt:60},photoGeometry:[],photoCalibration:{version:1,horizonY:.35,frontLeft:{x:.06,y:.95},frontRight:{x:.94,y:.95},backRight:{x:.72,y:.47},backLeft:{x:.28,y:.47}},backgroundPhoto:{id:'frame-3',url:'https://fixture.test/3',widthPx:176,heightPx:110},venueScan:scan};
  view.rebuild(state);for(let i=0;i<150&&!jobStatus?.ready;i++)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(jobStatus?.ready,true,jobStatus?.error||'scan becomes ready');assert.equal(view.orbit360(),true);
  const wrapper=renderer.scene.getObjectByName('Metric Space Scan'),world=wrapper.children[0],policy=world.userData.navigationPolicy,frames=policy.frames;
  assert.ok(frames.length>=2,'fixture supplies multiple accepted reference cameras');assert.equal(wrapper.userData,world.userData,'renderer and world retain one live metadata object');
  assert.equal(wrapper.userData.activeReferenceIndex,policy.initialFrameIndex);assert.equal(controls.enabled,false);assert.equal(view.walkWorld(),false,'estimated capture cannot start free walking');
  let current=frames.findIndex(frame=>frame.referenceIndex===policy.initialFrameIndex);
  for(const delta of [1,1,1,1,-1,-1,-1,-1,1]){
    current=(current+delta+frames.length)%frames.length;assert.equal(view.stepCapturedView(delta),true);
    const expected=frames[current];assert.equal(wrapper.userData.activeReferenceIndex,expected.referenceIndex,'each click reads the newly selected live index');
    assert.deepEqual(renderer.camera.position.toArray(),[expected.position.x,expected.position.y,expected.position.z]);
    assert.equal(world.children.filter(child=>child.isMesh&&child.userData.referenceIndex!==undefined&&child.visible).length,1);
    assert.equal(world.children.find(child=>child.isMesh&&child.userData.referenceIndex===expected.referenceIndex).visible,true);
    assert.equal(renderer.camera.userData.photoProjection.scanCapture,true);
  }
  const selected=wrapper.userData.activeReferenceIndex;width=390;height=844;resize();
  assert.equal(wrapper.userData.activeReferenceIndex,selected,'resize retains the selected capture');assert.equal(renderer.camera.userData.photoProjection.scanCapture,true,'resize restores the off-axis capture projection');
  view.matchPhoto();assert.equal(wrapper.visible,false);assert.equal(view.orbit360(),true);assert.equal(wrapper.userData.activeReferenceIndex,policy.initialFrameIndex,'reopening scan intentionally starts at center');
  view.destroy();assert.equal(container.children.length,0);w.close();
  console.log('PASS captured-view controller: real seven-frame reconstruction, repeated Next/Previous including wraparound, shared active index, exact capture pose, resize, mode return and no free walk.');
})().catch(error=>{console.error(error);process.exitCode=1;});
