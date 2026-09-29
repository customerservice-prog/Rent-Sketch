import * as THREE from 'three';
import {phase5Reference} from '../data/phase5-reference.js';
import {equipmentAssetDescriptor} from '../data/asset-registry.js';
import {attachEquipmentOperation} from './equipment-operation.js';
import {shapes,material,mergeStatic} from './phase5-shapes3d.js';
// Unit-envelope appearance models. Saved placement dimensions/rotation remain authoritative.
export function createPhase5Equipment(product,item={}){
 const ref=phase5Reference(product);if(!ref||ref.kind!=='equipment'||ref.type==='fan')return null;
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.name=product.name||ref.type;
 const dim=(v,f)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):f;
 const w=dim(item.modelWidthFt,dim(product.widthFt,2)),d=dim(item.modelDepthFt,dim(product.depthFt,2)),h=dim(item.heightFt,dim(product.heightFt,2));
 root.scale.set(w,h,d);const {box,cyl,rod,curve,mesh}=shapes(body);
 const black=material('#202327'),rubber=material('#17191b',{roughness:.92}),silver=material('#b4bec3',{metalness:.65,roughness:.28}),red=material('#ba1e28',{metalness:.2}),yellow=material('#e8b91f',{roughness:.42}),gray=material('#66696c',{roughness:.97});
 let detail=null,animate=null;
 if(ref.type==='generator'){
  // Open chassis, no solid enclosure substituted for the engine.
  for(const z of [-.35,.35])curve([[-.43,.08,z],[-.43,.81,z],[-.40,.92,z],[.40,.92,z],[.43,.81,z],[.43,.08,z]],.027,black);
  for(const y of [.12,.88])for(const x of [-.40,.40])rod([x,y,-.35],[x,y,.35],.024,black);
  box(.76,.15,.62,red,0,.79,0,.026,'Red fuel tank');cyl(.068,.025,black,-.22,.885,-.08);
  const engine=new THREE.Group();body.add(engine);const e=shapes(engine);detail=engine;
  e.box(.41,.37,.46,silver,-.12,.46,-.02,.018,'Exposed engine');e.box(.31,.31,.32,black,.20,.43,-.09,.022);
  for(let i=0;i<8;i++)e.box(.42,.013,.025,black,-.12,.33+i*.03,.227,.002);
  const starter=e.cyl(.15,.035,black,-.12,.46,.24,26);starter.rotation.x=Math.PI/2;
  const inset=e.cyl(.12,.04,silver,-.12,.46,.245,26);inset.rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;e.rod([-.12+Math.cos(a)*.065,.46+Math.sin(a)*.065,.27],[-.12+Math.cos(a)*.12,.46+Math.sin(a)*.12,.27],.006,black);}
  box(.69,.27,.025,black,0,.64,.373,.016,'Control and outlet panel');
  box(.12,.077,.009,silver,-.215,.66,.390,.004);box(.08,.045,.009,material('#586d78'),-.215,.66,.397,.003);
  for(const x of [-.08,.10,.26]){box(.12,.16,.008,rubber,x,.627,.393,.006);for(const y of [.597,.66]){const outlet=cyl(.025,.012,silver,x,y,.40,14);outlet.rotation.x=Math.PI/2;box(.03,.011,.005,black,x,y,.409,.001);}}
  for(const x of [-.34,.34]){const tire=cyl(.157,.105,rubber,x,.16,-.32,32);tire.rotation.z=Math.PI/2;const hub=cyl(.097,.11,black,x,.16,-.32,18);hub.rotation.z=Math.PI/2;for(let n=0;n<6;n++){const a=n*Math.PI/3;rod([x,.16,-.32],[x,.16+Math.cos(a)*.115,-.32+Math.sin(a)*.115],.012,silver);}}
  for(const x of [-.38,.38]){rod([x,.16,.32],[x,.027,.32],.023,black);box(.095,.04,.11,rubber,x,.024,.32);}
  mergeStatic(engine);body.remove(engine);mergeStatic(body);root.add(engine);animate=t=>{engine.position.y=Math.sin(t*22)*.0007;};
  root.userData.features={openFrame:true,fuelTank:'red',wheels:2,engineVisible:true,controlPanel:true};
 }else if(ref.type==='power-distribution'){
  box(.70,.78,.42,yellow,0,.46,0,.014,'Yellow distribution enclosure');box(.85,.035,.72,yellow,0,.89,.03,.014);
  for(const x of [-.42,.42])box(.025,.88,.72,yellow,x,.46,.03,.008);
  box(.32,.035,.28,yellow,0,.963,-.08,.012,'Carrying handle');for(const x of [-.15,.15])box(.025,.08,.16,yellow,x,.92,-.08);
  box(.075,.27,.025,black,-.18,.66,.23,.008,'Switch');box(.20,.29,.025,black,.14,.66,.23,.01,'Breaker cover');
  for(const x of [-.18,.15])for(const y of [.20,.35]){const ring=cyl(.077,.028,black,x,y,.237,20);ring.rotation.x=Math.PI/2;for(const dx of [-.021,.021])box(.011,.039,.006,silver,x+dx,y+.01,.256,.001);const ground=cyl(.014,.008,silver,x,y-.027,.257,10);ground.rotation.x=Math.PI/2;}
  for(const x of [-.27,.27])for(const y of [.10,.84]){const screw=cyl(.016,.009,silver,x,y,.222,10);screw.rotation.x=Math.PI/2;}
  root.userData.features={enclosure:'yellow',visibleReceptacles:4,producesPower:false};mergeStatic(body);
 }else if(ref.type==='stage'){
  box(.98,.095,.98,gray,0,.947,0,.008,'Gray deck');
  for(const x of [-.46,.46])box(.04,.105,.95,black,x,.875,0);
  for(const z of [-.46,.46])box(.94,.105,.04,black,0,.875,z);
  for(const x of [-.43,.43])for(const z of [-.43,.43]){box(.032,.80,.032,black,x,.44,z);box(.074,.032,.065,rubber,x,.027,z);}
  for(const z of [-.43,.43]){rod([-.43,.18,z],[.43,.81,z],.012,black);rod([-.43,.81,z],[.43,.18,z],.012,black);}
  for(const x of [-.43,.43])rod([x,.28,-.43],[x,.28,.43],.015,black);
  root.userData.features={foldingBraces:true,deck:'gray',legs:4};mergeStatic(body);
 }else if(ref.type==='stage-stair'){
  for(const [z,y] of [[.235,.20],[-.235,.39]])box(.79,.04,.46,gray,0,y,z,.007,'Stage tread');
  for(const x of [-.435,.435]){
   curve([[x,.02,.46],[x,.67,.46],[x,.98,-.39],[x,.96,-.47],[x,.02,-.47]],.018,black);
   rod([x,.48,.46],[x,.78,-.47],.014,black);rod([x,.25,.46],[x,.52,-.47],.014,black);
   rod([x,.055,.43],[x,.35,-.42],.018,black);rod([x,.01,0],[x,.37,0],.015,black);
   for(const z of [-.46,.46])box(.065,.035,.064,rubber,x,.018,z);
  }
  root.userData.features={treads:2,handrails:2,accessComplianceVerified:false};mergeStatic(body);
 }else if(ref.type==='stage-skirt'){
  const vertices=[],indices=[],segments=96;
  for(let i=0;i<=segments;i++){const x=-.5+i/segments,z=Math.cos(i/segments*Math.PI*24)*.45;vertices.push(x,.97,-.4,x,.035+Math.sin(i*.63)*.003,z);if(i<segments){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,material('#202128',{roughness:1,side:THREE.DoubleSide}),0,0,0,'Black pleated skirt');box(1,.024,.027,black,0,.975,-.4,.002);
  root.userData.features={pleatedFabric:true,supportIncluded:false,nominalWidthFt:8,nominalHeightFt:31/12};mergeStatic(body);
 }
 root.userData={...root.userData,kind:'equipment',itemId:item.id,asset:{...equipmentAssetDescriptor(product,ref.type),fidelity:ref.fidelity,source:{kind:'catalog-photo',referenceUrl:ref.referenceUrl,notes:ref.note,externalId:ref.externalId}},reference:ref};
 root.traverse(o=>{o.userData.itemId=item.id;});attachEquipmentOperation(root,ref.type,item,animate,{reset:detail?()=>{detail.position.y=0;}:null});return root;
}
