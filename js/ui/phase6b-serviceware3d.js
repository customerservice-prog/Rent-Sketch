import {vesselGeometry} from './phase6b-vessels3d.js';
import * as THREE from 'three';
import {material,shapes} from './phase5-shapes3d.js';
// All shapes are unit envelopes. The shared factory applies only the selected
// product's planning dimensions; these functions never create rental lines.
export function buildServiceware(root,ref){
 const s=shapes(root),{mesh,box,cyl,rod,curve,lathe}=s;
 const steel=material('#d5dadb',{metalness:.52,roughness:.3}),gold=material('#d1ae61',{metalness:.53,roughness:.3}),black=material('#26282b',{roughness:.8}),white=material('#f4f3eb',{roughness:.3}),glass=material('#cedfdf',{transparent:true,opacity:.14,roughness:.08,metalness:.02,depthWrite:false,side:THREE.DoubleSide});
 const torus=(r,t,m,x=0,y=0,z=0,horizontal=false)=>{const q=mesh(new THREE.TorusGeometry(r,t,8,48),m,x,y,z);if(horizontal)q.rotation.x=Math.PI/2;return q;};
 const disk=(r,t,m,x=0,y=0,z=0)=>{const q=cyl(r,t,m,x,y,z,32);q.rotation.x=Math.PI/2;return q;};
 const sphere=(r,m,x=0,y=0,z=0)=>mesh(new THREE.SphereGeometry(r,20,12),m,x,y,z);
 function roundBowl(r=.46,h=.28,m=steel,y=0){return lathe([[0,.008],[r*.45,.008],[r*.60,h*.10],[r*.78,h*.34],[r*.92,h*.70],[r,h],[r-.024,h+.008],[r*.87,h*.70],[r*.72,h*.36],[r*.52,h*.16],[0,.036]],m,0,y,0,48);}
 function pan(width,depth,bottom,top,m=steel){mesh(vesselGeometry(width,depth,bottom,top,{taper:.90,radius:.043,thickness:.012}),m);}
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
  const soup=ref.type==='chafer-soup',bodyY=soup?.28:.37;
  for(let i=0;i<3;i++){
   const a=i*Math.PI*2/3,cos=Math.cos(a),sin=Math.sin(a),tangent=new THREE.Vector3(-sin,0,cos),positions=[],indices=[];
   const stations=[[.43,bodyY+.12],[.37,.20],[.43,.026],[.51,.025]];
   for(const [r,y] of stations)for(const [side,thick] of [[-1,-1],[1,-1],[-1,1],[1,1]]){positions.push(cos*(r+thick*.011)+tangent.x*side*.052,y,sin*(r+thick*.011)+tangent.z*side*.052);}
   for(let j=0;j<stations.length-1;j++){const k=j*4;for(const [p,q] of [[0,1],[1,3],[3,2],[2,0]])indices.push(k+p,k+q,k+p+4,k+q,k+q+4,k+p+4);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,steel);
  }
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod([0,.10,0],[Math.cos(a)*.405,.10,Math.sin(a)*.405],.016,steel);}cyl(.25,.015,steel,0,.091,0,40);
  burners(1,.11);
  if(soup){
   lathe([[0,.015],[.39,.015],[.425,.037],[.44,.43],[.448,.455],[.418,.46],[.406,.07],[0,.058]],steel,0,bodyY,0,56);
   torus(.444,.014,steel,0,bodyY+.451,0,true);
   const lid=new THREE.Group();root.add(lid);lid.position.set(0,bodyY+.43,-.435);const ls=shapes(lid);
   ls.mesh(new THREE.CircleGeometry(.422,48),glass,0,.38,0);const rim=new THREE.Mesh(new THREE.TorusGeometry(.429,.015,8,56),steel);rim.position.y=.38;lid.add(rim);
   ls.curve([[-.085,.36,.025],[-.075,.41,.08],[.075,.41,.08],[.085,.36,.025]],.013,steel);ls.rod([-.13,0,0],[.13,0,0],.025,steel);
   for(const x of [-.53,.53])curve([[x*.8,.57,-.09],[x,.57,-.09],[x,.57,.09],[x*.8,.57,.09]],.018,steel);
  }else{
   lathe([[0,0],[.405,0],[.46,.04],[.47,.18],[.47,.21],[.445,.21],[.425,.05],[0,.035]],steel,0,bodyY,0,56);
   const m=ref.type==='chafer-round-gold'?gold:steel;
   const dome=mesh(new THREE.SphereGeometry(.448,40,26,0,Math.PI*2,0,Math.PI/2),steel,0,bodyY+.212,0);dome.scale.y=.94;
   torus(.47,.014,steel,0,bodyY+.20,0,true);curve([[-.16,bodyY+.34,.415],[-.13,bodyY+.35,.467],[.13,bodyY+.35,.467],[.16,bodyY+.34,.415]],.016,m);for(const x of [-.456,.456])disk(.028,.026,m,x,bodyY+.22,0);
  }
  f={...f,pan:soup?'deep-soup':'round',lid:soup?'upright-hinged':'dome',burnerHolders:1,fuelIncluded:false};
 }else if(ref.type==='insulated-dispenser'){
  // Form the recessed tap opening from separate walls; do not hide it behind
  // an opaque cube, or a recess painted onto the front photograph.
  // One molded front with an open lower tap recess, not stacked boxes.
  const face=new THREE.Shape();face.moveTo(-.43,.025);face.lineTo(-.16,.025);face.lineTo(-.16,.345);face.quadraticCurveTo(-.16,.47,0,.47);face.quadraticCurveTo(.16,.47,.16,.345);face.lineTo(.16,.025);face.lineTo(.43,.025);face.lineTo(.43,.875);face.lineTo(-.43,.875);face.closePath();
  const geom=new THREE.ExtrudeGeometry(face,{depth:.20,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:3,curveSegments:16});mesh(geom,black,0,0,.235);box(.86,.86,.66,black,0,.455,-.095,.019);
  box(.94,.054,.91,black,0,.924,0,.018);
  for(const x of [-.29,.29]){curve([[x-.10,.946,-.08],[x-.10,1.017,-.08],[x,1.037,-.08],[x+.10,1.017,-.08],[x+.10,.946,-.08]],.026,black);box(.078,.088,.041,steel,x,.882,.476,.01);box(.054,.06,.047,black,x,.883,.506,.005);}
  for(const x of [-.385,.385])box(.022,.73,.017,material('#343738'),x,.467,.474,.006);
  box(.10,.08,.06,black,0,.239,.27,.008);rod([0,.215,.278],[0,.215,.363],.022,black);rod([0,.215,.363],[0,.158,.363],.022,black);box(.06,.05,.018,steel,0,.287,.32,.005);box(.22,.051,.012,material('#3b3e3d'),0,.763,.464,.006);
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
   const spoonMaterial=m.clone();spoonMaterial.side=THREE.DoubleSide;
   for(const upper of [false,true]){
    const g=new THREE.Group();root.add(g);g.position.set(0,upper?.070:.035,.43);g.rotation.x=upper?.16:0;const q=shapes(g);
    q.box(.068,.015,.59,m,0,0,-.29,.009);const head=q.mesh(new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI/2),spoonMaterial,0,.006,-.73);head.scale.set(.118,.014,.172);head.rotation.z=Math.PI;
   }
   curve([[0,.035,.435],[0,.035,.495],[0,.070,.495],[0,.070,.435]],.020,m);f={...f,joinedSpring:true,physicalCount:1};
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
  rod([0,.77,0],[0,.96,0],.03,gold);for(const y of [.26,.33,.60,.83]){const bead=sphere(.059,gold,0,y,0);bead.scale.y=.85;}
  const cups=[[0,.98,0]];for(const side of [-1,1])for(const [r,y,z] of [[.42,.74,0],[.28,.89,.18]]){curve([[0,.32,0],[side*r*.65,.36,z],[side*r,.45,z],[side*r,y,z]],.021,gold);cups.push([side*r,y,z]);sphere(.042,gold,side*r,y-.16,z);}
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
