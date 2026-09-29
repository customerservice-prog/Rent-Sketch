import * as THREE from 'three';
import {phase6Reference} from '../data/phase6-reference.js';
import {equipmentAssetDescriptor} from '../data/asset-registry.js';
import {attachEquipmentOperation} from './equipment-operation.js';
import {material,shapes,mergeStatic} from './phase5-shapes3d.js';

// Source-keyed, normalized appearance models. This is deliberately separate
// from price, stock, placement, clearance and the definition of a rental set.
export function createPhase6Equipment(product,item={}){
 const ref=phase6Reference(product);if(!ref)return null;
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.name=product.name||ref.type;
 const dim=(v,f)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):f;
 const quarter=Math.abs(Math.abs((Number(item.rotationDeg)||0)%180)-90)<1e-7;
 const defaults=ref.dimensions||[2,2,2];
 const w=dim(item.modelWidthFt,dim(quarter?item.depthFt:item.widthFt,dim(product.widthFt,defaults[0])));
 const d=dim(item.modelDepthFt,dim(quarter?item.widthFt:item.depthFt,dim(product.depthFt,defaults[1])));
 const h=dim(item.heightFt,dim(product.heightFt,defaults[2]));root.scale.set(w,h,d);
 // A contradictory/missing reference may retain a saved rental selection,
 // but it must not quietly fall through to a convincing, wrong generic model.
 if(ref.kind==='reference-only'){
  const geometry=new THREE.EdgesGeometry(new THREE.BoxGeometry(.98,.98,.98));
  const outline=new THREE.LineSegments(geometry,new THREE.LineDashedMaterial({color:'#a17737',dashSize:.06,gapSize:.035}));
  outline.position.y=.49;outline.computeLineDistances();body.add(outline);
  root.name='Unverified footprint — '+(product.name||ref.type);
  root.userData={kind:'equipment',itemId:item.id,reference:ref,referenceOnly:true,dimensionsVerified:false,
   features:{type:'unverified-footprint',physicalModel:false},
   asset:{...equipmentAssetDescriptor(product,'generic'),fidelity:'footprint',source:{kind:'unverified-reference',externalId:ref.externalId,referenceUrl:ref.referenceUrl,notes:ref.note}}};
  root.traverse(o=>{o.userData.itemId=item.id;});attachEquipmentOperation(root,'generic',item);return root;
 }
 const s=shapes(body),{mesh,box,cyl,rod,curve,lathe}=s;
 const black=material('#202326',{roughness:.76}),rubber=material('#151718',{roughness:.95}),steel=material('#b8c1c5',{metalness:.72,roughness:.29}),white=material('#eeeee8'),blue=material('#294e7c'),red=material('#bc2530'),pink=material('#de72aa'),wood=material('#be915e',{roughness:.8}),darkWood=material('#695036',{roughness:.8}),glass=material('#edf7f4',{transparent:true,opacity:.16,roughness:.08,depthWrite:false,side:THREE.DoubleSide});
 const sphere=(r,m,x,y,z)=>mesh(new THREE.SphereGeometry(r,16,10),m,x,y,z);
 const ring=(r,t,m,x,y,z)=>mesh(new THREE.TorusGeometry(r,t,7,36),m,x,y,z);
 const horizontalRing=(r,t,m,x,y,z)=>{const q=ring(r,t,m,x,y,z);q.rotation.x=Math.PI/2;return q;};
 const disc=(r,depth,m,x,y,z)=>{const q=cyl(r,depth,m,x,y,z,24);q.rotation.x=Math.PI/2;return q;};
 const feet=(x=.38,z=.35,y=.03)=>{for(const a of [-x,x])for(const b of [-z,z])box(.08,y*2,.08,rubber,a,y,b,.01);};
 const vents=(x,y,z,n=8,width=.33)=>{for(let i=0;i<n;i++)box(width,.009,.006,black,x,y+i*.026,z,.002);};
 const knobs=(xs,y,z)=>xs.forEach(x=>{disc(.027,.015,black,x,y,z);box(.007,.025,.006,white,x,y+.006,z+.011,.001);});
 const cabinet=(base=.1,top=.92,half=.43)=>{
  box(half*2,.08,half*2,steel,0,base,0,.015);
  for(const x of [-half,half])for(const z of [-half,half])box(.025,top-base,.025,steel,x,(base+top)/2,z,.005);
  for(const x of [-half,half])box(.004,top-base,half*2,glass,x,(base+top)/2,0,.001);
  for(const z of [-half,half])box(half*2,top-base,.004,glass,0,(base+top)/2,z,.001);
  feet(.36,.36,.025);
 };
 const slottedPanel=(width,height,depth,holes,m,x,y,z)=>{
  const shape=new THREE.Shape();shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height/2);shape.lineTo(-width/2,height/2);shape.closePath();
  for(const hole of holes){const path=new THREE.Path();path.absarc(hole.x,hole.y,hole.r,0,Math.PI*2,true);shape.holes.push(path);}
  const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:20});geo.translate(0,0,-depth/2);return mesh(geo,m,x,y,z);
 };
 let motion=null,reset=null;const animated=[],effects=[];let features={type:ref.type};
 if(ref.type==='connect-four'){
  const holes=[];for(let r=0;r<6;r++)for(let c=0;c<7;c++)holes.push({x:(c-3)*.12,y:(r-2.5)*.115,r:.041});
  slottedPanel(.85,.74,.11,holes,wood,0,.58,0);
  for(const x of [-.465,.465]){box(.055,.83,.16,darkWood,x,.55,0,.006);box(.09,.10,.72,darkWood,x,.05,0,.01);}
  for(const y of [.20,.96])box(.93,.035,.16,darkWood,0,y,0);
  for(const [c,r,color] of [[1,0,red],[2,0,blue],[3,0,red],[4,0,blue],[5,0,blue],[2,1,red],[3,1,blue],[4,1,red],[3,2,red]])disc(.038,.095,color,(c-3)*.12,.58+(r-2.5)*.115,0);
  features={...features,columns:7,rows:6,holes:42,openHoleProbe:{x:-.36,y:.58+.2875,z:0},physicalCount:1};
 }else if(ref.type==='cornhole'){
  // Two boards are one equipment set; the compact preview is NOT a play zone.
  for(const x of [-.247,.247]){
   const board=new THREE.Group();body.add(board);const t=shapes(board),shape=new THREE.Shape();shape.moveTo(-.22,-.46);shape.lineTo(.22,-.46);shape.lineTo(.22,.46);shape.lineTo(-.22,.46);shape.closePath();const hole=new THREE.Path();hole.absarc(0,-.29,.052,0,Math.PI*2,true);shape.holes.push(hole);const geo=new THREE.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:false,curveSegments:20});geo.rotateX(-Math.PI/2);geo.translate(0,.02,0);t.mesh(geo,wood);for(const a of [-.198,.198])t.box(.025,.12,.92,darkWood,a,-.055,0);for(const z of [-.43,.43])t.box(.42,.12,.025,darkWood,0,-.055,z);board.position.set(x,.63,0);board.rotation.x=-.36;
   for(const a of [-.185,.185])t.box(.03,.37,.04,darkWood,a,-.24,-.38);
  }
  features={...features,physicalCount:2,holes:2,playingDistanceVerified:false};
 }else if(ref.type==='tumbling-timbers'){
  for(let r=0;r<18;r++)for(let i=0;i<3;i++){const along=r%2===0;box(along?.86:.275,.047,along?.275:.86,(r+i)%4?wood:material('#d5b790'),along?0:(i-1)*.292,.027+r*.053,along?(i-1)*.292:0,.005);}
  features={...features,layers:18,blocks:54,startingHeightVerified:false};
 }else if(ref.type==='chess'){
  box(.98,.035,.98,white,0,.018,0,.008);
  const green=material('#285640');for(let z=0;z<8;z++)for(let x=0;x<8;x++)box(.115,.007,.115,(x+z)%2?green:white,(x-3.5)*.115,.038,(z-3.5)*.115,.001);
  const order=['rook','knight','bishop','queen','king','bishop','knight','rook'];
  for(const side of [-1,1])for(let col=0;col<8;col++)for(let rank=0;rank<2;rank++){
   const x=(col-3.5)*.115,z=side*(rank===1?.2875:.4025),m=side===1?white:black,type=rank===1?'pawn':order[col],height=rank===1?.42:type==='king'?.9:.73;
   cyl(.042,.045,m,x,.067,z);lathe([[.036,0],[.032,.04],[.020,height*.18],[.015,height*.60],[.027,height*.72]],m,x,.089,z,16);
   if(type==='pawn')sphere(.033,m,x,.089+height*.8,z);
   else if(type==='knight'){const q=box(.04,height*.36,.07,m,x,.089+height*.72,z,.01);q.rotation.x=side*.4;box(.035,.06,.07,m,x,.089+height*.92,z+side*.035,.012);}
   else if(type==='rook'){cyl(.035,.09,m,x,.089+height*.82,z);for(let i=0;i<4;i++)box(.013,.065,.02,m,x+Math.cos(i*Math.PI/2)*.028,.089+height*.92,z+Math.sin(i*Math.PI/2)*.028,.002);}
   else{sphere(.027,m,x,.089+height*.77,z);cyl(.014,.09,m,x,.089+height*.84,z);if(type==='king'){box(.017,.13,.017,m,x,.089+height*.93,z,.002);box(.075,.019,.018,m,x,.089+height*.96,z,.002);}else if(type==='queen')sphere(.023,m,x,.089+height*.94,z);}
  }
  features={...features,squares:64,pieces:32};
 }else if(ref.type==='ladderball'){
  for(const x of [-.28,.28]){
   for(const side of [-1,1]){const a=x+side*.185;rod([a,.03,-.32],[a,.03,.32],.011,black);rod([a,.04,0],[a,.96,0],.011,black);}
   for(const [y,m] of [[.32,white],[.62,red],[.92,blue]])rod([x-.20,y,0],[x+.20,y,0],.013,m);
   for(let i=0;i<3;i++){const bx=x+(i-1)*.08;curve([[bx,.82,.055],[bx-.014,.95,0],[bx-.04,.79,-.05]],.003,white);sphere(.019,x<0?blue:red,bx,.80,.055);sphere(.019,x<0?blue:red,bx-.04,.77,-.05);}
  }
  features={...features,physicalCount:2,rungsPerFrame:3};
 }else if(ref.type==='bucket-pong'){
  for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<=row;i++){
   const x=(i-row/2)*.19,z=side*(.18+row*.12),m=side>0?red:blue;
   lathe([[.057,0],[.055,.02],[.071,.67],[.079,.70],[.084,.69],[.078,.03],[.061,0]],m,x,.01,z,18);
   horizontalRing(.079,.005,m,x,.71,z);
  }
  features={...features,illustrativeArrangement:true,contentsCountConfirmed:false};
 }else if(ref.type==='stanchion'){
  lathe([[0,0],[.43,0],[.46,.035],[.41,.070],[.17,.088],[.06,.11],[.055,.88],[.083,.89],[.083,.99],[0,.99]],black,0,0,0,32);box(.13,.06,.065,rubber,0,.946,.075);features={...features,physicalCount:1,beltExtended:false};
 }else if(ref.type==='trash-can'){
  lathe([[.31,.018],[.35,.026],[.42,.9],[.45,.91],[.45,.95],[.41,.97],[.39,.93],[.365,.10],[.31,.08]],black);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;rod([Math.cos(a)*.34,.10,Math.sin(a)*.34],[Math.cos(a)*.403,.84,Math.sin(a)*.403],.012,black);}
  for(const x of [-.454,.454])box(.08,.12,.25,black,x,.85,0,.01);features={...features,openTop:true,handles:2};
 }else if(ref.type==='cooler'){
  box(.92,.76,.91,blue,0,.42,0,.055);box(.95,.10,.94,white,0,.855,0,.03);for(const x of [-.485,.485]){box(.025,.18,.43,black,x,.62,0,.015);box(.034,.035,.39,black,x,.72,0,.012);}feet(.34,.33,.025);features={...features,body:'blue',lid:'light',handles:2};
 }else if(ref.type==='red-carpet'){
  box(.98,.70,.98,material('#a91429',{roughness:1}),0,.37,0,.005);features={...features,postsIncluded:false};
 }else if(ref.type==='podium'){
  box(.65,.07,.59,black,0,.055,0,.018);box(.56,.042,.5,black,0,.111,0,.012);box(.24,.66,.21,black,0,.438,0,.015);
  for(const x of [-.09,0,.09])box(.012,.60,.01,material('#3b3e40'),x,.44,.111,.002);
  const shelf=box(.92,.055,.55,black,0,.81,0,.01);shelf.rotation.x=.18;box(.89,.043,.025,black,0,.787,.27,.008);
  curve([[-.29,.82,-.16],[-.29,.90,-.16],[-.18,.96,-.14],[.05,.99,-.14]],.005,black);rod([[.05,.99,-.14]][0],[.12,1.015,-.14],.011,rubber);features={...features,microphone:true,color:'black'};
 }else if(ref.type==='photobooth'){
  box(.57,.025,.42,white,0,.035,0,.012);for(const x of [-.22,.22])for(const z of [-.16,.16])sphere(.018,black,x,.018,z);
  box(.16,.68,.105,white,0,.395,0,.016);box(.118,.56,.008,material('#346cc0'),0,.40,.059,.008);
  const colors=['#ec3f48','#e99536','#cbdf44','#40ca66','#42bfc5','#586fda','#8a48c8','#d9479f'];
  for(let i=0;i<8;i++){const q=mesh(new THREE.TorusGeometry(.29,.025,7,8,Math.PI/4+.01),material(colors[i],{emissive:colors[i],emissiveIntensity:.16}),0,.833,0);q.rotation.z=i*Math.PI/4;q.scale.y=.5;}
  const frame=disc(.274,.046,white,0,.833,0);frame.scale.z=.5;
  box(.21,.18,.022,black,0,.835,.04,.012);box(.181,.148,.004,material('#608393',{emissive:'#447389',emissiveIntensity:.12}),0,.837,.055,.004);disc(.012,.008,black,0,.939,.049);
  const screen=material('#376f91',{emissive:'#438eac',emissiveIntensity:.18});box(.174,.14,.004,screen,0,.837,.059,.004);motion=t=>{screen.emissiveIntensity=.18+Math.sin(t*.8)*.035;};reset=()=>{screen.emissiveIntensity=0;};
  features={...features,ringLight:true,tablet:true,hours:ref.hours,attended:ref.attended,physicalBooths:1};
 }else if(ref.type==='speaker'){
  box(.77,.80,.70,black,0,.45,0,.06);box(.035,.17,.033,black,-.20,.902,0,.01);box(.035,.17,.033,black,.20,.902,0,.01);box(.43,.032,.054,rubber,0,.981,0,.012);
  box(.68,.73,.012,material('#2e3236'),0,.45,.36,.04);for(let i=0;i<26;i++)box(.0025,.67,.003,black,-.295+i*.0236,.43,.37,.001);
  const glow=material('#496b86',{emissive:'#426ba8',emissiveIntensity:.18}),rim=ring(.235,.012,glow,0,.32,.39);motion=t=>{glow.emissiveIntensity=.18+Math.max(0,Math.sin(t*3))*.12;};reset=()=>{glow.emissiveIntensity=0;};rim.scale.y=.60;const woofer=disc(.216,.017,black,0,.32,.383);woofer.scale.z=.60;box(.32,.087,.02,black,0,.69,.379,.022);feet(.25,.23,.025);features={...features,portableHandle:true,wooferRing:true};
 }else if(ref.type==='foam-machine'){
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod([0,.42,0],[Math.cos(a)*.42,.035,Math.sin(a)*.42],.018,black);rod([0,.22,0],[Math.cos(a)*.25,.16,Math.sin(a)*.25],.008,black);}
  rod([0,.1,0],[0,.68,0],.019,black);
  const yellow=material('#e3b826'),barrel=mesh(new THREE.CylinderGeometry(.18,.19,.51,32,1,true),yellow,0,.79,0);barrel.rotation.x=Math.PI/2;barrel.rotation.z=.15;
  ring(.182,.01,yellow,0,.79,.255);disc(.155,.008,black,0,.79,-.255);for(let i=0;i<9;i++)box(.265,.004,.006,black,0,.68+i*.027,-.266,.001);
  curve([[-.09,.956,-.03],[-.09,.986,-.03],[.09,.986,-.03],[.09,.956,-.03]],.009,black);curve([[.1,.68,-.19],[.25,.55,-.2],[.36,.20,-.20]],.009,material('#b6c1c7'));
  const rotor=new THREE.Group();root.add(rotor);const r=shapes(rotor);rotor.position.set(0,.79,.24);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;r.rod([0,0,0],[Math.cos(a)*.135,Math.sin(a)*.135,0],.018,black);}animated.push(rotor);motion=t=>{rotor.rotation.z=t*4;};
  features={...features,yellowCannon:true,tripod:true,sprayClearanceVerified:false};
 }else if(ref.type==='cotton-candy'){
  box(.58,.35,.55,pink,0,.225,0,.025);feet(.23,.21,.025);box(.48,.16,.012,black,0,.23,.279,.004);knobs([-.15],.24,.30);for(const x of [.06,.18])box(.055,.049,.019,red,x,.25,.30,.005);vents(0,.1,-.282,7,.4);
  // Reference bowl has near-vertical sides and a rolled lip, not a salad-bowl cone.
  lathe([[.13,.03],[.37,.03],[.438,.055],[.465,.105],[.468,.485],[.481,.493],[.481,.510],[.455,.507],[.450,.48],[.448,.12],[.426,.086],[.365,.067],[.13,.067],[.13,.03]],steel,0,.4,0,48);horizontalRing(.473,.009,steel,0,.903,0);
  const rotor=new THREE.Group();const r=shapes(rotor);r.cyl(.07,.08,steel,0,.52,0);r.box(.18,.016,.019,black,0,.565,0);animated.push(rotor);root.add(rotor);motion=t=>{rotor.rotation.y=t*2.7;};features={...features,openSteelBowl:true,wallProfile:'near-cylindrical',pinkTabletopBase:true,noCart:true};
 }else if(ref.type==='popcorn'){
  cabinet(.16,.87,.36);box(.80,.14,.81,red,0,.905,0,.012);box(.65,.095,.02,steel,0,.215,.386,.005);box(.69,.055,.76,steel,0,.075,0,.009);
  for(const x of [-.18,.18])rod([x,.84,0],[x,.60,0],.009,steel);
  lathe([[.13,0],[.19,.04],[.20,.17],[.22,.19],[.22,.21],[.17,.215],[.13,.20]],steel,0,.47,0,24);cyl(.218,.024,steel,0,.686,0);box(.026,.14,.065,black,.335,.46,.385,.005);knobs([-.16,0,.16],.91,.416);
  const stir=new THREE.Group();root.add(stir);const r=shapes(stir);r.rod([0,.68,0],[0,.78,0],.007,black);r.rod([-.15,.69,0],[.15,.69,0],.007,black);animated.push(stir);motion=t=>{stir.rotation.y=t*.8;};features={...features,clearCabinet:true,suspendedKettle:true,cartIncluded:false,suppliesIncluded:false};
 }else if(ref.type==='snow-cone'){
  cabinet(.06,.60,.38);box(.8,.05,.8,blue,0,.06,0,.008);box(.43,.30,.59,material('#6bafd7'),-.19,.78,-.03,.01);box(.35,.039,.42,steel,-.20,.957,-.03,.006);knobs([-.28,-.12],.903,.28);
  lathe([[.05,0],[.08,.05],[.21,.17],[.225,.24],[.20,.245],[.18,.17],[.065,.055]],steel,.19,.73,-.02,28);horizontalRing(.215,.008,steel,.19,.97,-.02);box(.21,.035,.07,steel,.15,.986,-.02,.01);rod([.32,.64,.28],[.32,.98,-.02],.01,steel);box(.15,.031,.042,black,.32,.987,-.06,.006);const rotor=new THREE.Group();root.add(rotor);const r=shapes(rotor);rotor.position.set(.19,.81,-.02);r.cyl(.06,.018,black);r.box(.15,.009,.02,steel);animated.push(rotor);motion=t=>{rotor.rotation.y=t*4;};
  features={...features,blueDriveHousing:true,clearBin:true,metalHopper:true,noDome:true};
 }else if(ref.type==='chocolate-fountain'){
  lathe([[.21,0],[.32,.04],[.35,.30],[.38,.34],[.40,.40],[.38,.43],[.33,.40],[.30,.35]],steel,0,.015,0,36);horizontalRing(.39,.009,steel,0,.436,0);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const q=box(.011,.033,.008,black,Math.cos(a)*.343,.306,Math.sin(a)*.343,.002);q.rotation.y=-a;}
  cyl(.055,.57,steel,0,.67,0);for(const [r,y] of [[.25,.59],[.195,.77],[.13,.91]])lathe([[.055,0],[r*.82,.015],[r,.04],[r,.045],[r*.72,.06],[.047,.09]],steel,0,y,0,32);feet(.18,.18,.02);const flow=new THREE.Group(),f=shapes(flow),brown=material('#5a321c',{roughness:.35});root.add(flow);for(const [r,y] of [[.24,.60],[.185,.78],[.12,.92]])f.lathe([[r*.78,.043],[r,.032],[r*.98,-.05],[r*.9,-.05]],brown,0,y,0,24);effects.push(flow);animated.push(flow);motion=t=>{brown.roughness=.34+Math.sin(t*1.4)*.018;};
  features={...features,tiers:3,steelBase:true,foodIncluded:false};
 }else if(ref.type==='bun-warmer'){
  box(.94,.81,.90,steel,0,.47,0,.025);box(.85,.66,.025,material('#9ca8ad',{metalness:.58}),0,.49,.462,.008);box(.84,.012,.022,steel,0,.167,.484,.003);for(const x of [-.38,.38])for(const y of [.23,.74])disc(.008,.006,steel,x,y,.481);knobs([.29],.12,.465);box(.065,.055,.011,material('#256b41'),.41,.12,.47,.004);feet(.39,.37,.035);features={...features,drawer:true,rollersIncluded:false};
 }else if(ref.type==='cheese-warmer'){
  box(.79,.59,.78,steel,0,.34,0,.022);feet(.3,.3,.025);cyl(.345,.065,steel,0,.655,0);horizontalRing(.34,.009,steel,0,.691,0);rod([0,.69,0],[0,.97,0],.02,steel);box(.095,.03,.11,black,0,.98,0,.009);curve([[.075,.67,0],[.075,.81,.12],[.075,.81,.43],[.075,.77,.45]],.014,steel);features={...features,pump:true,roundLid:true};
 }else if(ref.type==='roller-grill'){
  box(.87,.23,.78,steel,0,.175,0,.015);feet(.35,.3,.025);for(let i=0;i<7;i++){const q=cyl(.037,.74,steel,0,.31,-.30+i*.10,20);q.rotation.z=Math.PI/2;}
  // Curved clear guard follows the reference instead of a tilted solid slab.
  const profile=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI/2;profile.push({y:.38+.50*Math.cos(a),z:-.38+.82*Math.sin(a)});}
  const vertices=[],indices=[];for(const v of profile)vertices.push(-.42,v.y,v.z,.42,v.y,v.z);
  for(let i=0;i<profile.length-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  const guard=new THREE.BufferGeometry();guard.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));guard.setIndex(indices);guard.computeVertexNormals();mesh(guard,glass);
  for(const x of [-.42,.42]){curve(profile.map(v=>[x,v.y,v.z]),.006,steel);rod([x,.33,-.38],[x,.88,-.38],.008,steel);}knobs([-.26,.04,.29],.17,.405);features={...features,rollers:7,sneezeGuard:true,curvedGuard:true,foodIncluded:false};
 }else if(ref.type==='pretzel-warmer'){
  cabinet(.16,.94,.36);box(.76,.05,.76,steel,0,.949,0,.008);box(.74,.22,.74,steel,0,.14,0,.012);rod([0,.31,0],[0,.87,0],.014,steel);
  for(const y of [.48,.72])for(let i=0;i<4;i++){const a=i*Math.PI/2;rod([0,y,0],[Math.cos(a)*.28,y,Math.sin(a)*.28],.008,steel);rod([Math.cos(a)*.28,y,Math.sin(a)*.28],[Math.cos(a)*.28,y+.04,Math.sin(a)*.28],.008,steel);}
  box(.03,.10,.032,black,.28,.5,.375,.005);features={...features,hangingRack:true,glassCabinet:true,foodIncluded:false};
 }else return null;
 mergeStatic(body);for(const g of animated)mergeStatic(g);
 root.userData={kind:'equipment',itemId:item.id,reference:ref,features,asset:{...equipmentAssetDescriptor(product,ref.type),fidelity:ref.fidelity,source:{kind:'catalog-photo',externalId:ref.externalId,referenceUrl:ref.referenceUrl,notes:ref.note}},dimensionsVerified:false};
 root.traverse(o=>{o.userData.itemId=item.id;});attachEquipmentOperation(root,ref.type,item,motion,{reset,effects});return root;
}
