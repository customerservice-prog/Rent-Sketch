import {vesselGeometry} from './phase6b-vessels3d.js';
import * as THREE from 'three';
import {material,shapes} from './phase5-shapes3d.js';
import {clothMaterial} from './linen-fabric3d.js';
export function buildEventEquipment(root,ref){
 const s=shapes(root),{mesh,box,cyl,rod,curve,lathe}=s;
 const dark=material('#24282b',{roughness:.78}),gray=material('#929795',{roughness:.9}),steel=material('#d5dadb',{metalness:.52,roughness:.3}),gold=material('#d1ae61',{metalness:.53,roughness:.3}),white=material('#eeeae0',{roughness:.58}),blue=material('#2469a0',{roughness:.7}),wood=material('#a87d4e',{roughness:.85});
 const sphere=(r,m,x=0,y=0,z=0)=>mesh(new THREE.SphereGeometry(r,18,12),m,x,y,z);
 const torus=(r,t,m,x=0,y=0,z=0,horizontal=false)=>{const q=mesh(new THREE.TorusGeometry(r,t,8,48),m,x,y,z);if(horizontal)q.rotation.x=Math.PI/2;return q;};
 const disk=(r,t,m,x=0,y=0,z=0)=>{const q=cyl(r,t,m,x,y,z,28);q.rotation.x=Math.PI/2;return q;};
 const frameBox=(w,h,d,m,x=0,y=0,z=0,r=.013)=>{for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2])rod([x+xx,y-h/2,z+zz],[x+xx,y+h/2,z+zz],r,m);for(const yy of [-h/2,h/2]){for(const zz of [-d/2,d/2])rod([x-w/2,y+yy,z+zz],[x+w/2,y+yy,z+zz],r,m);for(const xx of [-w/2,w/2])rod([x+xx,y+yy,z-d/2],[x+xx,y+yy,z+d/2],r,m);}};
 function roundedArch(width,bottom,shoulder,top,depth,m,z=0){const w=width/2,shape=new THREE.Shape();shape.moveTo(-w,bottom);shape.lineTo(w,bottom);shape.lineTo(w,shoulder);shape.quadraticCurveTo(w,top,w*.0,top);shape.quadraticCurveTo(-w,top,-w,shoulder);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24});g.translate(0,0,-depth/2);return mesh(g,m,0,0,z);}
 function openBin(w,d,h,y,m){mesh(vesselGeometry(w,d,y,y+h,{taper:.9,radius:.075,thickness:.028}),m);}
 function speaker(host,scale=1){const q=new THREE.Group();host.add(q);q.scale.setScalar(scale);const p=shapes(q);p.box(.36,.50,.25,dark,0,.70,0,.035);const grille=material('#343c40',{roughness:.86});p.box(.31,.43,.007,grille,0,.70,.128,.03);for(let i=0;i<17;i++)p.box(.003,.39,.006,dark,-.139+i*.0174,.70,.136,.001);p.box(.15,.07,.014,dark,0,.86,.14,.012);for(const [r,y] of [[.102,.65],[.056,.80]]){const c=p.cyl(r,.012,dark,0,y,.14,28);c.rotation.x=Math.PI/2;}
  p.rod([0,.035,0],[0,.465,0],.014,dark);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;p.rod([0,.19,0],[Math.cos(a)*.24,.012,Math.sin(a)*.24],.013,dark);}return q;}
 let f={type:ref.type,decorationsIncluded:false};
 if(ref.type==='bus-bin'){
  openBin(.94,.85,.58,.01,dark);for(const x of [-.484,.484])box(.019,.052,.35,material('#414749'),x,.505,0,.01);f={...f,openTop:true,lidIncluded:false};
 }else if(ref.type==='freezer'){
  box(.95,.79,.83,white,0,.45,0,.019);box(.971,.065,.85,white,0,.893,0,.018);box(.92,.011,.005,gray,0,.851,.429,.002);box(.20,.036,.035,white,.1,.878,.457,.008);
  for(let i=0;i<8;i++)box(.16,.008,.008,gray,.345,.19+i*.026,.426,.002);for(const x of [-.35,.35])for(const z of [-.29,.29])box(.08,.045,.085,dark,x,.025,z,.012);f={...f,chestLid:true,vent:true,contentsIncluded:false};
 }else if(ref.type==='audio-phone'){
  box(.79,.095,.71,white,0,.071,0,.034);
  const v=[-.38,.09,-.335,.38,.09,-.335,.38,.09,.335,-.38,.09,.335,-.38,.405,-.335,.38,.405,-.335,.38,.184,.335,-.38,.184,.335],ix=[0,3,1,1,3,2,0,1,4,1,5,4,1,2,5,2,6,5,2,3,6,3,7,6,3,0,7,0,4,7,4,5,7,5,6,7];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];g.setIndex(ix);g.computeVertexNormals();mesh(g,white);
  const face=new THREE.Group();root.add(face);face.position.set(0,.2945-.06*.33,.06);face.rotation.x=Math.atan(.33);const fs=shapes(face);
  fs.cyl(.21,.016,dark,0,.014,0,48);for(let i=0;i<10;i++){const a=i*Math.PI*2/10+.25;fs.cyl(.029,.008,white,Math.cos(a)*.151,.026,Math.sin(a)*.151,20);fs.cyl(.013,.004,dark,Math.cos(a)*.151,.031,Math.sin(a)*.151,12);}fs.cyl(.065,.012,steel,0,.033,0,28);
  for(const x of [-.29,.29])box(.065,.064,.088,white,x,.42,-.20,.016);
  curve([[-.395,.445,-.20],[-.37,.53,-.20],[0,.59,-.20],[.37,.53,-.20],[.395,.445,-.20]],.066,white);
  for(const x of [-.395,.395]){const q=sphere(.108,white,x,.445,-.20);q.scale.set(1,.48,1);torus(.089,.007,gray,x,.397,-.20,true);}
  const points=[];for(let i=0;i<=125;i++){const u=i/125,a=u*Math.PI*2*15;points.push(new THREE.Vector3(-.41-.022*Math.sin(a),.445-u*.31,-.2+u*.46+.023*Math.cos(a)));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),160,.007,5,false),white);f={...f,handset:true,rotaryStyleDial:true,coiledCord:true,recordingSimulated:false};
 }else if(ref.type==='oversize-cards'){
  const colors=['#bc2834','#2c60a5','#dfb235','#368957'];for(let i=0;i<4;i++){const card=new THREE.Group();root.add(card);card.rotation.y=(i-1.5)*.17;card.position.set((i-1.5)*.17,.009+i*.012,0);const cs=shapes(card);cs.box(.37,.012,.64,white,0,0,0,.014);cs.box(.33,.005,.60,material(colors[i]),0,.010,0,.011);const oval=cs.mesh(new THREE.SphereGeometry(1,20,12),white,0,.015,0);oval.scale.set(.12,.003,.26);oval.rotation.y=.35;cs.box(.06,.004,.27,material(colors[i]),0,.020,0,.003);}
  f={...f,illustrativeCards:4,deckCountVerified:false,furnitureIncluded:false};
 }else if(ref.type==='laptop'){
  box(.94,.055,.70,dark,0,.04,0,.016);box(.88,.008,.45,material('#41474d'),0,.071,-.08,.005);
  for(let row=0;row<5;row++)for(let col=0;col<13;col++)box(.052,.006,.047,dark,-.378+col*.063,.079,-.245+row*.075,.004);box(.23,.004,.13,gray,0,.072,.20,.007);
  const lid=new THREE.Group();root.add(lid);lid.position.set(0,.075,-.33);lid.rotation.x=-.17;const ls=shapes(lid);ls.box(.94,.70,.035,dark,0,.35,0,.02);ls.box(.84,.585,.004,material('#314650',{emissive:'#233b40',emissiveIntensity:.07}),0,.365,.021,.007);ls.cyl(.006,.005,blackOr(dark),0,.664,.023,8).rotation.x=Math.PI/2;f={...f,keyboard:true,touchpad:true,contentIncluded:false};
 }else if(ref.type==='movie-speaker'){
  speaker(root);f={...f,physicalCount:1,tripod:true,otherMovieEquipmentIncluded:false};
 }else if(ref.type==='movie-screen'){
  // One catalog package stays one rental. Main components shown compactly;
  // this is not an optical, audience, power-cable or tie-down layout.
  for(const x of [-.445,.445]){box(.095,.72,.10,dark,x,.59,-.29,.04);box(.17,.11,.38,dark,x,.11,-.25,.05);}box(.98,.08,.10,dark,0,.982,-.29,.032);box(.97,.08,.10,dark,0,.237,-.29,.032);box(.82,.638,.013,white,0,.607,-.277,.004);
  const table=new THREE.Group();root.add(table);table.position.set(.02,0,.33);const ts=shapes(table);ts.box(.17,.014,.19,dark,0,.105,0,.005);for(const x of [-.062,.062])for(const z of [-.07,.07])ts.rod([x,0,z],[x,.102,z],.004,steel);ts.box(.10,.035,.078,white,0,.131,0,.01);const lens=ts.cyl(.016,.008,dark,.025,.13,-.043,20);lens.rotation.x=Math.PI/2;
  const sp=speaker(root,.20);sp.position.set(.29,0,.13);const blower=box(.09,.068,.083,dark,-.48,.04,-.04,.02);cyl(.015,.027,dark,-.48,.08,-.04,16);curve([[-.445,.14,-.24],[-.475,.04,-.13],[-.48,.04,-.04]],.019,dark);
  f={...f,physicalPackages:1,components:['screen','projector','projector-support','speaker','blower'],componentRentalLines:0,throwDistanceVerified:false,nominalSizeLabel:ref.nominalSizeLabel};
 }else if(ref.type==='patio-heater'){
  const brown=material('#443631',{metalness:.25,roughness:.53});lathe([[.13,0],[.205,.012],[.205,.036],[.176,.055],[.169,.305],[.12,.315]],brown,0,.01,0,40);cyl(.031,.43,brown,0,.537,0,28);cyl(.10,.028,steel,0,.764,0,32);cyl(.105,.137,material('#6c777b',{metalness:.5}),0,.838,0,32);for(let i=0;i<20;i++){const a=i*Math.PI/10;rod([Math.cos(a)*.108,.774,Math.sin(a)*.108],[Math.cos(a)*.108,.91,Math.sin(a)*.108],.0035,steel);}lathe([[0,.061],[.10,.056],[.46,.025],[.47,.042],[.45,.048],[.12,.074],[0,.078]],steel,0,.913,0,64);box(.047,.049,.013,dark,0,.699,.044,.007);f={...f,reflector:true,brownHousing:true,flame:false,fuelIncluded:false,clearancesVerified:false};
 }else if(ref.type==='handwash'){
  const casing=material('#89918e',{roughness:.82}),inside=material('#697872',{roughness:.85});
  box(.74,.63,.53,casing,0,.33,-.10,.025);for(const x of [-.25,.25])box(.24,.62,.20,casing,x,.327,.27,.024);box(.23,.23,.17,casing,0,.527,.27,.009);box(.19,.015,.12,dark,0,.038,.26,.012);box(.055,.018,.045,steel,0,.052,.287,.005);
  // Sink is sunk INTO the top opening rather than resting as a bowl above it.
  mesh(vesselGeometry(.51,.46,.518,.705,{taper:.54,radius:.037,thickness:.014}),inside,0,0,.055);
  for(const x of [-.322,.322])box(.13,.13,.66,casing,x,.66,.005,.01);box(.52,.085,.07,casing,0,.68,.301,.007);box(.53,.084,.13,casing,0,.68,-.254,.008);
  box(.73,.34,.10,casing,0,.833,-.305,.013);box(.34,.18,.075,gray,0,.855,-.223,.015);box(.23,.1,.043,white,0,.857,-.173,.011);curve([[.19,.725,-.18],[.19,.782,-.18],[.11,.785,-.01],[.11,.75,.04]],.012,steel);box(.13,.15,.072,gray,-.22,.873,-.22,.016);f={...f,footPump:true,recessedBasin:true,backPanel:true,consumablesIncluded:false};
 }else if(ref.type==='portable-restroom'){
  box(.83,.05,.91,dark,0,.034,0,.015);box(.78,.83,.78,blue,0,.477,0,.021);
  for(const x of [-.391,.391])for(let i=0;i<5;i++)box(.018,.085,.53,material('#3076ad'),x,.22+i*.12,0,.014);
  const door=roundedArch(.62,.092,.79,.873,.018,material('#286fa6'),.404);for(const y of [.20,.34,.49,.64])curve([[-.25,y,.418],[0,y-.014,.42],[.25,y,.418]],.009,material('#3880b5'));
  for(const x of [-.33,.33])box(.02,.80,.025,steel,x,.482,.423,.004);box(.038,.082,.035,steel,.255,.50,.437,.007);for(const y of [.26,.57,.77])box(.041,.044,.039,steel,-.322,y,.427,.004);
  for(let i=0;i<3;i++)box(.086,.036,.01,white,-.246+i*.11,.819,-.396,.003);
  const roof=roundedArch(.89,.888,.926,1,.91,white);box(.91,.027,.96,white,0,.892,0,.013);f={...f,cabin:'blue',roof:'light-arched',closedDoor:true,interiorUnverified:true};
 }else if(ref.type==='round-arch'||ref.type==='hex-arch'){
  if(ref.type==='round-arch'){const ring=torus(.43,.013,gold,0,.51,0);ring.scale.y=.98;for(const x of [-.24,.24]){rod([x,.148,0],[x*1.5,.009,.42],.016,gold);rod([x,.148,0],[x*1.5,.009,-.42],.016,gold);}}
  else{const points=[[-.23,.08,0],[.23,.08,0],[.47,.49,0],[.23,.91,0],[-.23,.91,0],[-.47,.49,0],[-.23,.08,0]];for(let i=0;i<6;i++){const a=new THREE.Vector3(...points[i]),b=new THREE.Vector3(...points[i+1]),delta=b.clone().sub(a),q=box(.032,delta.length(),.13,wood);q.position.copy(a).add(b).multiplyScalar(.5);q.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}for(const x of [-.24,.24]){box(.11,.08,.85,wood,x,.04,0,.006);box(.021,.06,.12,steel,x,.067,0,.005);}}
  f={...f,frameOnly:true,flowersIncluded:false,lightsIncluded:false,signIncluded:false};
 }else if(ref.type==='arbor'){
  for(const x of [-.44,.44])for(const z of [-.36,.36]){box(.064,.80,.067,white,x,.402,z,.004);for(const y of [.38,.80]){box(.086,.027,.09,white,x,y,z,.004);cyl(.032,.08,white,x,y+.035,z,20);}const cap=sphere(.036,white,x,.942,z);cyl(.027,.055,white,x,.918,z,20);}
  for(const x of [-.44,.44]){for(const y of [.11,.40,.72,.84])box(.055,.031,.74,white,x,y,0,.003);for(const z of [-.26,-.13,0,.13,.26]){box(.025,.28,.023,white,x,.25,z,.002);box(.025,.10,.023,white,x,.786,z,.002);}}
  for(const z of [-.36,.36]){const sh=new THREE.Shape();sh.moveTo(-.44,.86);sh.quadraticCurveTo(0,1.1,.44,.86);sh.lineTo(.44,.825);sh.quadraticCurveTo(0,1.03,-.44,.825);sh.closePath();const ge=new THREE.ExtrudeGeometry(sh,{depth:.036,bevelEnabled:false,curveSegments:32});mesh(ge,white,0,0,z-.018);}
  for(const x of [-.31,-.16,0,.16,.31]){const y=.856+.115*(1-(x/.44)**2);box(.032,.021,.81,white,x,y,0,.003);}
  for(const x of [-.42,.42])for(const z of [-.36,.36])curve([[x,.62,z],[x*.97,.74,z],[x*.72,.816,z]],.015,white);f={...f,archedArbor:true,posts:4,slattedSides:true,finials:4};
 }else if(ref.type==='gold-easel'){
  for(const side of [-1,1])rod([side*.42,.012,.32],[side*.035,.96,-.1],.010,gold);rod([0,.86,-.08],[0,.008,-.43],.011,gold);rod([-.25,.43,.16],[.25,.43,.16],.012,gold);for(const x of [-.23,.23])curve([[x,.47,.18],[x,.418,.24],[x,.417,.31]],.009,gold);rod([0,.76,-.10],[0,.48,-.25],.006,gold);f={...f,legs:3,boardIncluded:false,flowersIncluded:false};
 }else if(ref.type==='mirror-sign'){
  roundedArch(.80,.03,.71,.96,.043,gold);roundedArch(.744,.057,.705,.922,.007,material('#d8d5c8',{metalness:.28,roughness:.21}),.027);
  curve([[-.415,.04,.03],[-.412,.72,.03],[-.31,.893,.03],[0,.974,.03],[.31,.893,.03],[.412,.72,.03],[.415,.04,.03]],.017,gold);for(const side of [-1,1])curve([[0,.97,.023],[side*.055,1.016,.023],[side*.12,.999,.023],[side*.087,.962,.023]],.014,gold);sphere(.021,gold,0,1.01,.018);f={...f,archedPanel:true,goldCrest:true,customTextIncluded:false,easelIncluded:false};
 }else if(ref.type==='greenery-wall'){
  box(.94,.94,.014,material('#244c29'),0,.48,0,.007);
  const leaves=[material('#375d2c',{side:THREE.DoubleSide}),material('#476f31',{side:THREE.DoubleSide}),material('#687c34',{side:THREE.DoubleSide}),material('#244626',{side:THREE.DoubleSide})];
  const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,-.012,0,-.006,-.006,.001,-.007,.004,.001,0,.014,0,.007,.004,.001,.006,-.006,.001,0,0,.003],3));leafGeo.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);leafGeo.computeVertexNormals();
  let seed=19483;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let row=0;row<80;row++)for(let col=0;col<80;col++){const shade=Math.floor(random()*4),xj=(random()-.5)*.009,yj=(random()-.5)*.009,zj=random()*.021,leaf=mesh(leafGeo,leaves[shade],-.467+col*.0118+xj,.012+row*.0118+yj,.013+zj);leaf.rotation.z=random()*Math.PI*2;leaf.rotation.x=(random()-.5)*.8;leaf.scale.setScalar(.72+random()*.40);}
  f={...f,foliageLeaves:6400,nominalFaceFt:[8,8],supportFootprintVerified:false,neonSignIncluded:false,flowersOutsidePanelIncluded:false};
 }else if(ref.type==='sequin-wall'||ref.type==='leg-drape'){
  const sequin=ref.type==='sequin-wall',m=clothMaterial(sequin?'Gold':'White',sequin?'sequin':'polyester'),geo=new THREE.PlaneGeometry(.94,.98,96,48),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i)+.50;
   if(sequin)p.setXYZ(i,x,y,.10*Math.sin((x+.47)*Math.PI*2*16)*(.45+.55*(1-y)));
   else{const width=.12+.79*Math.pow(Math.min(1,Math.abs(y-.34)/.60),.70);p.setXYZ(i,x*width,y,.14*Math.sin((x+.47)*Math.PI*18)*(.32+width*.55));}
  }if(sequin){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*12,uv.getY(i)*12);m.bumpScale=.001;m.roughness=.35;m.metalness=.16;m.color.set('#d4ab5b');}geo.computeVertexNormals();mesh(geo,m);
  if(!sequin){const tie=torus(.07,.012,white,0,.34,0,true);tie.scale.z=.6;}
  f={...f,clothOnly:true,pleats:sequin?16:9,standIncluded:false,poleIncluded:false,nominalFaceFt:ref.nominalFaceFt};
 }else if(ref.type==='barrel-cover'){
  const geo=new THREE.CylinderGeometry(.45,.43,.94,72,32,true),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i)+.48,a=Math.atan2(z,x),fold=1+.019*Math.sin(a*14+y*13)+.016*Math.sin(y*29+a*3);p.setXYZ(i,x*fold,y,z*fold);}geo.computeVertexNormals();mesh(geo,clothMaterial('White','polyester'));torus(.45,.012,white,0,.954,0,true);curve([[.44,.08,.02],[.445,.46,.03],[.45,.87,.025]],.012,white);f={...f,hollowSleeve:true,coverOnly:true,barrelIncluded:false,ballastCapacityVerified:false};
 }else return null;
 return f;
}
const blackOr=m=>m;
