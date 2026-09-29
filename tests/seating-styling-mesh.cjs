// Verify the actual instanced decoration matrices, including tilted torus rims.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const threePath=require.resolve('three').replace('/build/three.cjs','/build/three.module.js'),THREE=await import(require('node:url').pathToFileURL(threePath));
 const draw=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),context=vm.createContext({console,document:{createElement:()=>({width:0,height:0,getContext:()=>draw})}}),cache=new Map();
 const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const k of Object.keys(THREE))this.setExport(k,THREE[k]);},{context});
 function moduleFor(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
 async function load(file){const m=moduleFor(path.join(root,file));if(m.status==='unlinked')await m.link((s,r)=>s==='three'?three:moduleFor(s.startsWith('three/addons/')?path.resolve(path.dirname(threePath),'../examples/jsm',s.slice(13)):path.resolve(path.dirname(r.identifier),s)));if(m.status!=='evaluated')await m.evaluate();return m.namespace;}
 const {createPartyStyling}=await load('js/ui/party-styling.js'),{disposeGroup}=await load('js/ui/scene-environment.js');
 const tent={widthFt:20,lengthFt:20};
 const item=(angle)=>{const quarter=Math.abs(angle%180-90)<.01,w=quarter?2.5:6,d=quarter?6:2.5;return {id:'banquet',kind:'table',tableId:'banquet-6ft',shape:'rect',x:10-w/2,y:10-d/2,widthFt:w,depthFt:d,rotationDeg:angle,seatCount:8,chairId:'plastic-white',linenId:'linen-banquet-72x120',linenColor:'Red'};};
 const unrotated=createPartyStyling(tent,[item(0)]);let transforms=0;
 for(const angle of [0,30,45,90,180,270]){
  const saved=item(angle),before=JSON.stringify(saved),actual=createPartyStyling(tent,[saved]),rotation=new THREE.Matrix4().makeRotationY(-angle*Math.PI/180);
  for(const source of unrotated.children){const target=actual.getObjectByName(source.name);assert.ok(target,source.name);assert.equal(target.count,source.count);
   for(let i=0;i<source.count;i++){
    const local=new THREE.Matrix4(),world=new THREE.Matrix4();source.getMatrixAt(i,local);target.getMatrixAt(i,world);local.premultiply(rotation);
    for(let j=0;j<16;j++)assert.ok(Math.abs(world.elements[j]-local.elements[j])<.00002,source.name+' at '+angle+' matrix component '+j);
    if(source.name==='Table styling · rim'){const normal=new THREE.Vector3(0,0,1).transformDirection(world);assert.ok(Math.abs(normal.y)>.99999,'A plate rim must remain horizontal at '+angle);}
    transforms++;
   }
  }
  assert.equal(JSON.stringify(saved),before);disposeGroup(actual);
 }
 disposeGroup(unrotated);console.log('PASS decoration rotation at six angles: '+transforms+' actual prop matrices; all plate rims stay flat; rental snapshots unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
