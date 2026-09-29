import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { activityPositions } from '../core/party-scene.js';
import { CHAIRS } from '../data/chairs.js';
import { GUEST_ANATOMY } from '../data/guest-anatomy.js';

// Fully local, articulated party figures. The batches share geometry/materials;
// facial features, clothes and activities never become quote items.
export function guestPositions(tent,objects,limit=32){return activityPositions(tent,objects,CHAIRS,limit);}
const UP=new THREE.Vector3(0,1,0);
const SKIN=['#d5a080','#935e45','#e8bb96','#654333','#b67d59'];
const HAIR=['#30251e','#5e4030','#b79662','#252327','#734e35'];
const OUTFITS=['#34465b','#a66455','#7c9383','#d6bc85','#617c99','#b68695'];
function lathe(points,segments=12){return new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),segments);}
function combine(parts,colors=false){
  const geometry=mergeGeometries(parts.map(([g,color])=>{const geo=g.index?g.toNonIndexed():g.clone();if(colors){const c=new THREE.Color(color),a=new Float32Array(geo.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set([c.r,c.g,c.b],i);geo.setAttribute('color',new THREE.BufferAttribute(a,3));}return geo;}),false);
  parts.forEach(([g])=>g.dispose());return geometry;
}
function sphere(x,y,z,sx,sy,sz){const g=new THREE.SphereGeometry(1,10,7);g.scale(sx,sy,sz);g.translate(x,y,z);return g;}
function headGeometry(){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(GUEST_ANATOMY.positions,3));
  g.setIndex(GUEST_ANATOMY.indices);g.computeVertexNormals();
  // Subtle complexion and lips multiply the individual's skin color. The mesh
  // carries real eyelids, cheeks, jaw, nose, ears and lips instead of glued-on balls.
  const p=g.attributes.position,c=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i)/.32,y=p.getY(i)/.32+7.24,z=p.getZ(i)/.32+.60;
    const front=Math.max(0,Math.min(1,(z-1.34)/.18));
    const lip=Math.exp(-Math.pow((y-6.60)/.075,2)-Math.pow(x/.29,4))*front;
    const brow=Math.exp(-Math.pow((y-7.48)/.035,2)-Math.pow((Math.abs(x)-.37)/.20,4))*Math.max(0,Math.min(1,(z-1.18)/.15));
    c.push(1-.14*lip-.30*brow,.98-.20*lip-.34*brow,.95-.18*lip-.33*brow);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return g;
}
function faceGeometry(){
  const parts=[];
  for(const side of [-1,1]){
    // Eyeballs sit behind the sculpted eyelids. Small irises avoid the old
    // high-contrast, oversized, staring cartoon eyes.
    parts.push([sphere(side*.0985,.013,.206,.0465,.043,.047),'#e6ded4']);
    parts.push([sphere(side*.0985,.013,.250,.018,.018,.004),'#59523f']);
    parts.push([sphere(side*.0985,.013,.254,.008,.008,.002),'#171b19']);
    parts.push([sphere(side*.095,.019,.256,.0026,.0026,.001),'#d7dfdc']);
  }
  return combine(parts,true);
}
function hairGeometry(){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(GUEST_ANATOMY.positions,3));g.setIndex(GUEST_ANATOMY.scalp);g.computeVertexNormals();
  const p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*.012,p.getY(i)+n.getY(i)*.012,p.getZ(i)+n.getZ(i)*.012);
  p.needsUpdate=true;g.computeVertexNormals();return g;
}
function clothTorso(){
  const g=lathe([[.33,-.08],[.405,0],[.445,.16],[.408,.35],[.415,.59],[.45,.82],[.51,1.0],[.565,1.12],[.49,1.24],[.24,1.31],[.175,1.36]],20);
  // Light seam/fold variation reads as fabric without increasing draw calls.
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i)),fold=Math.sin(a*9+y*4)*.005*(1-Math.min(1,Math.abs(y-.6)));p.setX(i,p.getX(i)*(1+fold));}
  g.computeVertexNormals();return g;
}
function sleeveGeometry(){return lathe([[.72,-.54],[.86,-.46],[.89,-.22],[.98,.08],[1,.34],[.91,.51],[.72,.54]],16);}
function shoeGeometry(){return combine([[sphere(0,.01,.02,.155,.085,.29),'#ffffff'],[sphere(0,.075,-.05,.142,.105,.20),'#ffffff'],[new THREE.BoxGeometry(.27,.06,.43).translate(0,-.045,-.03),'#ffffff']]);}
function skirtGeometry(){
  const g=new THREE.CylinderGeometry(.415,.65,1.65,28,10,true),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),v=(.825-p.getY(i))/1.65,f=1+Math.sin(a*14)*.035*v;p.setX(i,p.getX(i)*f);p.setZ(i,p.getZ(i)*f*.80);}
  g.computeVertexNormals();return g;
}
export function guestPose(person,index,time){
  const phase=index*1.731,t=time+phase,seated=person.seated;
  let x=person.x,z=person.z,heading=person.heading,gait=0,sway=0,lift=0;
  if(person.activity==='walk'){
    const route=person.route,period=(route.length-1)*1.25,cycle=(time+phase)%(period*2+2),reverse=cycle>period+1;
    const distance=Math.max(0,Math.min(period,reverse?period*2+1-cycle:cycle))/1.25,segment=Math.min(route.length-2,Math.floor(distance)),f=distance-segment,a=route[segment],b=route[segment+1];
    x=a.x+(b.x-a.x)*f;z=a.z+(b.z-a.z)*f;heading=Math.atan2(b.x-a.x,b.z-a.z)+(reverse?Math.PI:0);if(cycle>=period&&cycle<=period+1)heading+=Math.PI*(cycle-period);else if(cycle>=period*2+1)heading+=Math.PI*(cycle-period*2-1);
    const moving=cycle<period||(cycle>period+1&&cycle<period*2+1);gait=moving?Math.sin(time*5.4+phase):0;
  }else if(person.activity==='dance'){sway=Math.sin(t*1.9)*.16;x+=sway;z+=Math.sin(t*1.9+1)*.12;heading+=Math.sin(t*.8)*.13;lift=Math.abs(Math.sin(t*1.9))*.055;}
  const conversation=Math.sin(t*.75)*.12,gesture=(Math.sin(t*.9) + 1)*.5;
  return {x,z,heading,gait,sway,lift,headTurn:conversation,gesture,seated};
}
export function createGuests(tent,objects,{mobile=false}={}) {
  return createGuestBatch(guestPositions(tent,objects,mobile?24:40),{mobile});
}
// Same production mesh generator is used for isolated visual QA.
export function createGuestBatch(people,{mobile=false}={}) {
  const group=new THREE.Group();group.name='Preview guests';group.userData.decorative=true;
  const dummy=new THREE.Object3D(),direction=new THREE.Vector3(),mid=new THREE.Vector3(),rotation=new THREE.Quaternion(),jointQ=new THREE.Quaternion(),headQ=new THREE.Quaternion();
  const common={roughness:.92};
  const definitions={
    skin:{n:36,g:new THREE.SphereGeometry(1,12,8),m:{roughness:.72}},limb:{n:8,g:sleeveGeometry()},
    torso:{n:1,g:clothTorso()},
    head:{n:1,g:headGeometry(),m:{vertexColors:true,roughness:.72}},face:{n:1,g:faceGeometry(),m:{vertexColors:true,roughness:.75}},
    hair:{n:1,g:hairGeometry(),m:{roughness:.90}},detail:{n:16,g:new THREE.SphereGeometry(1,14,9)},shoe:{n:2,g:shoeGeometry(),m:{roughness:.65}},
    garment:{n:10,g:new THREE.BoxGeometry(1,1,1)},skirt:{n:1,g:skirtGeometry()},
    drink:{n:1,g:new THREE.CylinderGeometry(.10,.073,.30,12),m:{color:'#e8d5aa',roughness:.22,transparent:true,opacity:.78}},
  };
  const colorCache=new Map();let first=true,time=0;
  for(const [name,def] of Object.entries(definitions)){
    def.mesh=new THREE.InstancedMesh(def.g,new THREE.MeshStandardMaterial({...common,...def.m}),Math.max(1,people.length*def.n));def.mesh.name='Guests · '+name;
    def.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);def.mesh.castShadow=def.mesh.receiveShadow=true;def.mesh.frustumCulled=false;group.add(def.mesh);
  }
  function draw(){
    const cursors=Object.fromEntries(Object.keys(definitions).map(k=>[k,0]));
    people.forEach((person,index)=>{
      const pose=guestPose(person,index,time),seated=person.seated,dress=index%4===1,jacket=index%4===0;
      const height=1.02+(index%7-3)*.024,build=.96+(index%4)*.028,hip=seated?1.59:2.95*height,skin=SKIN[index%SKIN.length],hair=HAIR[index%HAIR.length],cloth=OUTFITS[index%OUTFITS.length],pants=jacket?cloth:index%3===0?'#b4a18c':'#3d4650';
      const top=hip+1.3*height,headY=top+.55*height,cos=Math.cos(pose.heading),sin=Math.sin(pose.heading);
      rotation.setFromAxisAngle(UP,pose.heading);headQ.setFromAxisAngle(UP,pose.headTurn);
      function part(kind,x,y,z,sx,sy,sz,color,q){
        dummy.position.set(pose.x+x*cos+z*sin,y+pose.lift,pose.z-x*sin+z*cos);dummy.quaternion.copy(rotation);if(q)dummy.quaternion.multiply(q);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
        const def=definitions[kind],i=cursors[kind]++;def.mesh.setMatrixAt(i,dummy.matrix);
        if(first&&kind!=='face'){if(!colorCache.has(color))colorCache.set(color,new THREE.Color(color));def.mesh.setColorAt(i,colorCache.get(color));}
      }
      function limb(kind,a,b,r1,r2,color){direction.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=direction.length();mid.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);jointQ.setFromUnitVectors(UP,direction.normalize());part(kind,mid.x,mid.y,mid.z,r1,kind==='skin'?length/2+.035:length,r2,color,jointQ);}
      part('torso',0,hip-.035,0,build,height,.60,cloth);
      part('skin',0,top+.09,0,.135,.21,.14,skin);
      part('head',0,headY,.025,height*build,height,height,skin,headQ);
      part('face',0,headY,.025,height*build,height,height,'#ffffff',headQ);
      part('hair',0,headY,.025,height*build,height,height,hair,headQ);
      if(index%4===1){part('detail',0,headY-.07,-.20,.25,.29,.12,hair,headQ);part('detail',0,headY+.14,-.25,.13,.14,.12,hair,headQ);}
      else if(index%4===2)part('detail',.12,headY+.31,-.15,.15,.08,.13,hair,headQ);
      // Collars, shirt opening, belt and buttons distinguish outfits at table scale.
      // Collars sit on the cloth surface, not above the shoulder.
      for(const side of [-1,1]){jointQ.setFromAxisAngle(new THREE.Vector3(0,0,1),side*.45);part('garment',side*.125,top-.16,.24,.105,.14,.022,jacket?'#faf5e9':cloth,jointQ);}
      if(jacket){for(const side of [-1,1]){jointQ.setFromAxisAngle(new THREE.Vector3(0,0,1),side*.31);part('garment',side*.105,top-.39,.262,.065,.35,.022,'#293a50',jointQ);}}
      for(let i=0;i<3;i++)part('detail',0,top-.36-i*.23,.274,.017,.017,.01,jacket?'#27394b':'#bbc1ba');
      if(!dress)part('garment',0,hip+.018,.01,.78,.055,.41,'#433b33');
      if(dress&&!seated)part('skirt',0,hip-.70,0,build,1,1,cloth);
      if(dress&&seated)part('detail',0,hip-.01,.35,.58,.16,.60,cloth);
      for(const side of [-1,1]){
        const stride=pose.gait*side*.47,footZ=seated?.89:stride,footY=.13+(!seated?Math.max(0,pose.gait*side)*.1:0);
        const knee=[side*.25,seated?1.44:1.5*height,seated?.9:stride*.40],ankle=[side*.26,footY+.12,footZ];
        limb('limb',[side*.25,hip-.02,0],knee,.205,.19,dress?cloth:pants);
        limb(dress?'skin':'limb',knee,ankle,.156,.158,dress?skin:pants);
        part(dress?'skin':'detail',...knee,.153,.13,.151,dress?skin:pants);
        part('shoe',side*.26,.105+(!seated?Math.max(0,pose.gait*side)*.1:0),footZ+.10,1,1,1,dress?'#765343':'#34383a');
        const shoulder=[side*.54,top-.16,0],talk=side===1?pose.gesture:1-pose.gesture;
        let elbow=[side*.65,hip+.56,seated?.43:-stride*.38],hand=[side*.46,seated?hip+.66:hip+.02,seated?1.03:-stride*.52];
        if(person.activity==='conversation'&&side===1){hand=[.47,hip+.62+talk*.28,.85+talk*.16];elbow=[.66,hip+.44,.38];}
        if(person.activity==='cocktail'){elbow=[side*.62,hip+.58,.28];hand=[side*.29,hip+.91+(side===1?talk*.28:0),.53];}
        if(person.activity==='dance'){elbow=[side*(.62+talk*.10),hip+(side===1?.89:.36)+talk*.16,.22];hand=[side*.56,hip+(side===1?1.44:.57)+talk*.18,.51];}
        part('detail',...shoulder,jacket?.183:.17,.183,.17,cloth);
        limb('limb',shoulder,elbow,jacket?.175:.16,.17,cloth);
        part('skin',...elbow,.118,.105,.12,skin);
        limb('skin',elbow,hand,.12,.125,skin);
        part('skin',...hand,.095,.115,.065,skin);
        // Individual fingers and an opposed thumb, rather than ball-shaped hands.
        for(let finger=0;finger<4;finger++){
          const length=[.105,.13,.12,.093][finger],fx=hand[0]+(finger-1.5)*.038;
          part('skin',fx,hand[1]-.105-length/2,hand[2]+.016,.020,length/2,.025,skin);
        }
        part('skin',hand[0]-side*.082,hand[1]-.04,hand[2]+.035,.038,.07,.033,skin);
        if(side===1&&person.activity==='cocktail')part('drink',hand[0]-.025,hand[1]+.15,hand[2]+.07,1,1,1,'#f0e5cf');
      }
    });
    for(const [name,def] of Object.entries(definitions)){def.mesh.count=cursors[name];def.mesh.instanceMatrix.needsUpdate=true;if(first&&def.mesh.instanceColor)def.mesh.instanceColor.needsUpdate=true;}
    first=false;
  }
  draw();group.userData.people=people;group.userData.visualVersion='anatomical-guests-20260929-refined';group.userData.update=dt=>{const delta=Number(dt);if(!Number.isFinite(delta)||delta<=0)return;time+=Math.min(.1,delta);draw();};return group;
}
