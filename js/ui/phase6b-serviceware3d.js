import * as THREE from 'three';
import {material,shapes} from './phase5-shapes3d.js';
// All shapes are unit envelopes. The shared factory applies only the selected
// product's planning dimensions; these functions never create rental lines.
export function buildServiceware(root,ref){
 const s=shapes(root),{mesh,box,cyl,rod,curve,lathe}=s;
 const steel=material('#b8c2c7',{metalness:.78,roughness:.24}),gold=material('#b38c36',{metalness:.75,roughness:.27}),black=material('#26282b',{roughness:.8}),white=material('#f4f3eb',{roughness:.3}),glass=material('#cedfdf',{transparent:true,opacity:.33,roughness:.08,metalness:.04,depthWrite:false,side:THREE.DoubleSide});
 const torus=(r,t,m,x=0,y=0,z=0,horizontal=false)=>{const q=mesh(new THREE.TorusGeometry(r,t,8,48),m,x,y,z);if(horizontal)q.rotation.x=Math.PI/2;return q;};
 const disk=(r,t,m,x=0,y=0,z=0)=>{const q=cyl(r,t,m,x,y,z,32);q.rotation.x=Math.PI/2;return q;};
 const sphere=(r,m,x=0,y=0,z=0)=>mesh(new THREE.SphereGeometry(r,20,12),m,x,y,z);
 function roundBowl(r=.46,h=.28,m=steel,y=0){return lathe([[0,.008],[r*.5,.008],[r*.82,.055],[r,h],[r-.024,h+.008],[r*.78,.08],[r*.47,.036],[0,.036]],m,0,y,0,48);}
 function pan(width,depth,bottom,top,m=steel){
  box(width*.82,.028,depth*.76,m,0,bottom,0,.008);
  const a=width/2,b=depth/2,wall=.018;
  for(const sign of [-1,1]){const q=box(wall,top-bottom,depth*.94,m,sign*(a-.012),(top+bottom)/2,0,.005);q.rotation.z=-sign*.08;const t=box(width*.97,top-bottom,wall,m,0,(top+bottom)/2,sign*(b-.012),.005);t.rotation.x=sign*.08;}
  curve([[-a,top,-b],[a,top,-b],[a,top,b],[-a,top,b],[-a,top,-b]],.016,m);
 }
 function loopHandle(x,y,z,m=steel,span=.20){curve([[x-span/2,y,z],[x-span/2,y+.07,z],[x,y+.10,z],[x+span/2,y+.07,z],[x+span/2,y,z]],.013,m);}
 function burners(n,y=.15){for(let i=0;i<n;i++){const x=n===1?0:(i-.5)*.46;lathe([[.09,0],[.09,.04],[.078,.04],[.078,.01],[0,.01],[0,0]],steel,x,y,0,28);torus(.09,.007,steel,x,y+.04,0,true);}}
 let f={type:ref.type,foodIncluded:false};
 if(ref.type==='chafer-rect'||ref.type==='chafer-roll'){
  for(const x of [-.38,.38])for(const z of [-.31,.31]){rod([x,.035,z],[x*.94,.5,z*.93],.032,steel);box(.14,.022,.13,steel,x,.02,z,.009);}
  for(const z of [-.24,.24])rod([-.38,.115,z],[.38,.115,z],.022,steel);burners(2,.16);pan(.91,.75,.42,.64);for(const x of [-.5,.5])curve([[x*.88,.55,-.18],[x,.55,-.18],[x,.55,.18],[x*.88,.55,.18]],.02,steel);
  if(ref.type==='chafer-roll'){
   // Roll-top is curved, raised at the rear, and visibly open above the pan.
   const p=[],idx=[];for(let i=0;i<=28;i++){const a=.04+i/28*Math.PI*.59;p.push(-.455,.66+Math.sin(a)*.32,-.01-Math.cos(a)*.33,.455,.66+Math.sin(a)*.32,-.01-Math.cos(a)*.33);if(i<28){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();mesh(g,material('#b8c2c7',{metalness:.78,roughness:.24,side:THREE.DoubleSide}));
   for(const x of [-.455,.455])curve(Array.from({length:25},(_,i)=>{const a=.04+i/24*Math.PI*.59;return[x,.66+Math.sin(a)*.32,-.01-Math.cos(a)*.33];}),.016,steel);loopHandle(0,.92,.1);
  }else{
   // Sloped lift-off cover: visible taper rather than a flat generic block.
   const g=new THREE.CylinderGeometry(1,.999,1,4,1,false);g.rotateY(Math.PI/4);
   const lid=new THREE.BufferGeometry(),v=[-.47,.65,-.38,.47,.65,-.38,.47,.65,.38,-.47,.65,.38,-.36,.82,-.27,.36,.82,-.27,.36,.82,.27,-.36,.82,.27],ix=[0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4,4,7,5,5,7,6];lid.setAttribute('position',new THREE.Float32BufferAttribute(v,3));lid.setIndex(ix);lid.computeVertexNormals();mesh(lid,steel);loopHandle(0,.823,0);g.dispose();
  }
  f={...f,pan:'rectangular',cover:ref.type==='chafer-roll'?'curved-roll-open':'sloped-lift-off',burnerHolders:2,fuelIncluded:false};
 }else if(['chafer-round','chafer-round-gold','chafer-soup'].includes(ref.type)){
  const soup=ref.type==='chafer-soup',bodyY=soup?.19:.36;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=Math.cos(a)*.40,z=Math.sin(a)*.40;const q=box(.08,bodyY+.10,.09,steel,x*.93,(bodyY+.10)/2,z*.93,.014);q.rotation.z=-Math.cos(a)*.18;q.rotation.x=Math.sin(a)*.18;box(.13,.025,.14,steel,x,.015,z);}
  burners(1,.10);roundBowl(.46,soup?.39:.20,steel,bodyY);torus(.46,.02,steel,0,bodyY+(soup?.40:.20),0,true);
  if(soup){
   const lid=new THREE.Group();root.add(lid);lid.position.set(0,.57,-.40);lid.rotation.x=-.05;
   const ls=shapes(lid);const q=ls.mesh(new THREE.SphereGeometry(.43,36,18,0,Math.PI*2,0,Math.PI/2),steel);q.scale.y=.11;q.rotation.x=Math.PI/2;q.position.y=.39;
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.43,.014,8,48),steel);ring.position.y=.39;lid.add(ring);loopHandle(0,.94,-.345,steel,.16);for(const x of [-.53,.53])curve([[x*.8,.49,-.06],[x,.49,-.06],[x,.49,.15],[x*.8,.49,.15]],.017,steel);
  }else{
   const m=ref.type==='chafer-round-gold'?gold:steel;
   const dome=mesh(new THREE.SphereGeometry(.449,40,22,0,Math.PI*2,0,Math.PI/2),steel,0,.575,0);dome.scale.y=.73;
   torus(.45,.016,steel,0,.573,0,true);curve([[-.14,.685,.411],[-.11,.701,.463],[.11,.701,.463],[.14,.685,.411]],.015,m);for(const x of [-.46,.46])disk(.029,.035,m,x,.584,0);
  }
  f={...f,pan:soup?'deep-soup':'round',lid:soup?'upright-hinged':'dome',burnerHolders:1,fuelIncluded:false};
 }else if(ref.type==='insulated-dispenser'){
  // Form the recessed tap opening from separate walls; do not hide it behind
  // an opaque cube, or a recess painted onto the front photograph.
  box(.92,.46,.87,black,0,.62,0,.06);for(const x of [-.34,.34])box(.24,.43,.87,black,x,.22,0,.042);box(.30,.43,.55,black,0,.22,-.16,.034);
  box(.94,.075,.89,black,0,.887,0,.022);for(const x of [-.35,.35]){loopHandle(x,.932,0,black,.20);box(.10,.115,.045,steel,x,.84,.448,.01);box(.07,.09,.058,black,x,.838,.475,.008);}
  for(const x of [-.405,.405])box(.024,.69,.02,material('#393b3d'),x,.48,.447,.005);
  box(.11,.10,.07,black,0,.28,.257,.008);rod([0,.25,.265],[0,.25,.355],.026,black);rod([0,.25,.355],[0,.19,.355],.026,black);box(.07,.063,.019,steel,0,.33,.32,.006);box(.37,.038,.038,black,0,.413,.456,.009);
  f={...f,insulated:true,body:'black-box',tapRecess:true,capacityLabel:ref.capacityLabel};
 }else if(ref.type==='coffee-urn'){
  cyl(.35,.09,black,0,.055,0,40);lathe([[.34,0],[.35,.015],[.35,.77],[.33,.79],[.325,.03],[.34,0]],steel,0,.10,0,48);cyl(.363,.04,steel,0,.902,0,48);cyl(.092,.035,black,0,.941,0);cyl(.050,.054,black,0,.97,0);
  for(const x of [-.40,.40])curve([[x*.82,.88,-.08],[x,.90,-.08],[x,.90,.1],[x*.82,.88,.1]],.037,black);
  box(.028,.61,.03,black,.12,.53,.356,.004);box(.017,.57,.023,glass,.12,.53,.381,.003);box(.115,.12,.06,black,0,.255,.377,.011);rod([0,.235,.40],[0,.235,.48],.021,black);rod([0,.235,.48],[0,.18,.48],.025,black);loopHandle(0,.30,.41,black,.07);f={...f,gauge:true,spigot:true,handles:2,heatedPreview:false};
 }else if(ref.type==='ribbed-pitcher'){
  lathe([[0,.008],[.27,.008],[.31,.035],[.345,.83],[.325,.83],[.29,.061],[0,.04]],glass,-.06,0,0,44);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;rod([-.06+Math.cos(a)*.29,.08,Math.sin(a)*.29],[-.06+Math.cos(a)*.335,.79,Math.sin(a)*.335],.015,glass);}
  curve([[.26,.71,0],[.46,.72,0],[.51,.55,0],[.47,.32,0],[.26,.22,0]],.028,glass);
  // Mouth lip and a small forward pouring extension remain genuinely open.
  curve(Array.from({length:41},(_,i)=>{const a=i*Math.PI/20;return[-.06+Math.cos(a)*.343,.837+Math.max(0,-Math.sin(a))*.018,Math.sin(a)*(.343+Math.max(0,-Math.sin(a))*.065)];}),.009,glass);
  f={...f,openTop:true,verticalRibs:16,handle:true};
 }else if(['wine-bucket','serving-bowl','rim-bowl','highball','flute'].includes(ref.type)){
  if(ref.type==='wine-bucket'){lathe([[0,.018],[.31,.018],[.42,.94],[.45,.97],[.448,1],[.412,.99],[.285,.058],[0,.058]],steel,0,0,0,48);for(const x of [-.425,.425]){const q=torus(.09,.012,steel,x,.70,0);q.rotation.y=Math.PI/2;const pin=disk(.026,.024,steel,x,.79,0);pin.rotation.y=Math.PI/2;}f={...f,openTop:true,ringHandles:2};}
  if(ref.type==='serving-bowl'){roundBowl(.47,.43,black);torus(.47,.022,black,0,.444,0,true);f={...f,material:'black-plastic',openTop:true};}
  if(ref.type==='rim-bowl'){lathe([[0,.016],[.25,.016],[.345,.135],[.49,.169],[.49,.185],[.336,.155],[.245,.051],[0,.051]],white,0,0,0,48);f={...f,broadRim:true,nominalDiameterIn:8.5};}
  if(ref.type==='highball'){lathe([[0,.016],[.32,.016],[.34,.10],[.34,.98],[.32,.98],[.30,.14],[0,.14]],glass,0,0,0,48);f={...f,stem:false,thickBase:true,openTop:true};}
  if(ref.type==='flute'){lathe([[0,.007],[.39,.007],[.39,.03],[.10,.045],[.037,.09],[.037,.37],[.09,.40],[.20,.47],[.26,.63],[.27,.83],[.245,.99],[.23,.99],[.255,.82],[.246,.64],[.175,.49],[.055,.42],[0,.40]],glass,0,0,0,48);f={...f,stem:true,openTop:true};}
 }else if(ref.type==='serving-tongs'||ref.type==='cake-server'){
  const m=ref.type==='cake-server'?gold:steel;
  if(ref.type==='serving-tongs'){
   for(const sign of [-1,1]){const g=new THREE.Group();root.add(g);g.rotation.y=sign*.075;const q=shapes(g);q.box(.065,.025,.58,m,sign*.022,.04,.15,.014);const head=q.mesh(new THREE.SphereGeometry(1,22,14,0,Math.PI*2,0,Math.PI/2),m,sign*.04,.043,-.32);head.scale.set(.115,.032,.18);head.rotation.z=Math.PI;}
   curve([[-.05,.04,.42],[-.05,.045,.50],[.05,.045,.50],[.05,.04,.42]],.025,m);f={...f,joinedSpring:true,physicalCount:1};
  }else{
   box(.073,.024,.59,m,0,.025,.185,.027);const shape=new THREE.Shape();shape.moveTo(-.07,-.03);shape.quadraticCurveTo(-.15,-.27,0,-.53);shape.quadraticCurveTo(.15,-.27,.07,-.03);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelSize:.005,bevelThickness:.003,bevelSegments:1});g.rotateX(Math.PI/2);mesh(g,m,0,.041,0);for(let i=0;i<21;i++)box(.057,.003,.006,material('#c7a15f',{metalness:.6}),0,.039,.06+i*.017,.001);f={...f,triangularBlade:true,finish:'gold',physicalCount:1};
  }
 }else if(ref.type==='sheet-pan'){
  pan(.97,.73,.023,.068);f={...f,shallow:true,rolledRim:true};
 }else if(ref.type==='metal-shakers'){
  for(const [i,x] of [[0,-.245],[1,.245]]){
   const geo=new THREE.CylinderGeometry(.185,.19,.74,36,16);const a=geo.attributes.position;for(let j=0;j<a.count;j++){const y=a.getY(j),theta=Math.atan2(a.getZ(j),a.getX(j)),k=1+.025*Math.sin(theta*7+y*11)*Math.cos(y*21);a.setX(j,a.getX(j)*k);a.setZ(j,a.getZ(j)*k);}geo.computeVertexNormals();mesh(geo,steel,x,.4,0);cyl(.189,.042,steel,x,.788,0,32);
   for(let n=0;n<(i?7:3);n++){const an=n*Math.PI*2/(i?6:3),r=n===6?0:.059;const q=cyl(.009,.002,black,x+Math.cos(an)*r,.811,Math.sin(an)*r,8);q.castShadow=false;}
  }f={...f,physicalCount:2,metalBody:true,perforatedCaps:true};
 }else if(ref.type==='candelabra'){
  lathe([[0,.006],[.27,.006],[.27,.025],[.16,.075],[.06,.20],[.05,.26],[.09,.31],[.04,.34],[.035,.81],[.065,.85]],gold,0,0,0,36);
  const cups=[[0,.98,0]];for(const side of [-1,1])for(const [r,y,z] of [[.42,.74,0],[.28,.89,.18]]){curve([[0,.32,0],[side*r*.65,.36,z],[side*r,.45,z],[side*r,y,z]],.021,gold);cups.push([side*r,y,z]);}
  for(const [x,y,z] of cups){lathe([[.035,0],[.073,.018],[.076,.032],[.043,.047],[.041,.09],[.024,.09],[.024,.041]],gold,x,y-.09,z,24);torus(.062,.008,gold,x,y-.073,z,true);}f={...f,cups:5,candlesIncluded:false};
 }else if(ref.type==='cake-plateau'){
  cyl(.48,.34,gold,0,.235,0,64);torus(.48,.014,gold,0,.415,0,true);cyl(.476,.017,gold,0,.413,0,64);
  for(let i=0;i<24;i++){const a=i*Math.PI/12,x=Math.cos(a)*.485,z=Math.sin(a)*.485;const scroll=new THREE.Group();root.add(scroll);scroll.position.set(x,.23,z);scroll.rotation.y=-a+Math.PI/2;const ss=shapes(scroll);ss.curve([[-.025,-.09,0],[-.038,-.025,0],[0,.0,0],[.038,.035,0],[.023,.09,0]],.006,gold);}
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.3;const q=sphere(.055,gold,Math.cos(a)*.36,.057,Math.sin(a)*.36);q.scale.y=.7;}
  f={...f,lowPlateau:true,nominalDiameterIn:14,decorativeBand:true};
 }else if(ref.type==='tiered-stand'){
  for(const [r,y] of [[.48,.04],[.37,.39],[.27,.73]]){lathe([[0,0],[r*.9,0],[r,.022],[r,.035],[r*.89,.021],[0,.021]],gold,0,y,0,48);torus(r,.007,gold,0,y+.026,0,true);}rod([0,.04,0],[0,.93,0],.018,gold);torus(.085,.011,gold,0,.975,0);f={...f,trays:3,physicalCount:1};
 }else if(ref.type==='card-box'){
  for(const x of [-.45,.45])for(const z of [-.33,.33])rod([x,.025,z],[x,.59,z],.012,gold);
  for(const y of [.025,.59])for(const z of [-.33,.33])rod([-.45,y,z],[.45,y,z],.012,gold);for(const y of [.025,.59])for(const x of [-.45,.45])rod([x,y,-.33],[x,y,.33],.012,gold);
  box(.89,.54,.005,glass,0,.31,-.33,.001);box(.89,.54,.005,glass,0,.31,.33,.001);for(const x of [-.45,.45])box(.004,.54,.66,glass,x,.31,0,.001);box(.89,.006,.65,gold,0,.03,0,.001);
  // Roof-like lid is closed; a visible central slot does not add another box.
  for(const x of [-.45,.45]){rod([x,.59,-.33],[x,.86,0],.012,gold);rod([x,.86,0],[x,.59,.33],.012,gold);}rod([-.45,.86,0],[.45,.86,0],.012,gold);
  for(const side of [-1,1]){const q=box(.88,.005,.43,glass,0,.72,side*.165,.001);q.rotation.x=side*.69;}box(.29,.009,.026,black,0,.861,0,.004);const lock=torus(.025,.007,gold,0,.50,.35);lock.scale.y=1.25;f={...f,clearPanels:true,cardSlot:true,physicalCount:1};
 }else return null;
 return f;
}
