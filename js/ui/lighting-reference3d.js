import * as THREE from 'three';
import {structuralProfile} from '../data/tentStructure.js';
import {phase5Reference} from '../data/phase5-reference.js';
import {shapes,material,mergeStatic} from './phase5-shapes3d.js';
export function lightingReference(option={}){return option.reference||phase5Reference(option);}
function lampMaterials(){return {dark:material('#24262a'),white:material('#eeeade',{roughness:.65}),silver:material('#cfd2d5',{metalness:.65,roughness:.23}),glass:material('#eef4f4',{metalness:.12,roughness:.16,transparent:true,opacity:.72,depthWrite:false}),warm:material('#fff3db',{emissive:'#ffd28a',emissiveIntensity:.7,roughness:.3}),led:material('#b9b2ff',{emissive:'#6452ff',emissiveIntensity:.9,roughness:.25})};}
export function createUplight(m=lampMaterials()){
 const g=new THREE.Group(),s=shapes(g);g.name='Six-lens wireless uplight';
 s.box(.56,.56,.54,m.dark,0,.32,0,.04,'Black fixture');
 for(const x of [-.315,.315])s.box(.035,.57,.24,m.dark,x,.29,0,.011);s.box(.67,.04,.37,m.dark,0,.035,0,.014,'Support yoke');
 s.box(.28,.085,.015,m.silver,0,.30,.279,.004);s.box(.24,.055,.015,m.dark,0,.30,.289,.003);
 for(const x of [-.10,-.03,.04,.11]){const a=s.cyl(.012,.012,m.silver,x,.205,.284,10);a.rotation.x=Math.PI/2;}
 for(let i=0;i<6;i++){const a=i===5?0:i/5*Math.PI*2,x=i===5?0:Math.sin(a)*.173,z=i===5?0:Math.cos(a)*.173;s.cyl(.075,.018,m.silver,x,.607,z,18);s.cyl(.061,.021,m.led,x,.617,z,18);}
 g.userData={fixtureCount:1,lensesPerFixture:6};return mergeStatic(g);
}
export function createChandelier(m=lampMaterials()){
 const g=new THREE.Group(),s=shapes(g);g.name='Five-arm crystal chandelier';
 s.lathe([[.05,.55],[.13,.64],[.10,.91],[.055,1.06],[.10,1.28],[.04,1.58],[.10,1.85],[.16,1.98],[.03,2.04]],m.glass);
 const bead=(x,y,z,r=.035)=>s.mesh(new THREE.IcosahedronGeometry(r,0),m.glass,x,y,z,'Crystal bead');
 const pendant=(x,y,z)=>{const q=s.mesh(new THREE.OctahedronGeometry(.07,1),m.glass,x,y,z,'Teardrop crystal');q.scale.set(.68,1.7,.68);};
 for(let i=0;i<5;i++){
  const a=i/5*Math.PI*2,x=Math.sin(a)*.90,z=Math.cos(a)*.90;
  s.curve([[0,.86,0],[x*.30,.83,z*.30],[x*.57,.58,z*.57],[x*.91,.65,z*.91],[x,1.0,z]],.031,m.white);
  s.lathe([[0,0],[.06,0],[.17,.08],[.19,.12],[.06,.10]],m.glass,x,.98,z);s.cyl(.067,.26,m.white,x,1.22,z,16);
  s.lathe([[.001,0],[.062,.04],[.054,.16],[.020,.25],[0,.28]],m.warm,x,1.35,z,16);
  for(let j=0;j<=14;j++){const t=j/14;bead(x*t,1.91-t*.92-Math.sin(Math.PI*t)*.1,z*t);}
  const b=(i+1)/5*Math.PI*2,x2=Math.sin(b)*.90,z2=Math.cos(b)*.90;
  for(let j=0;j<=12;j++){const t=j/12;bead(x+(x2-x)*t,1.01-Math.sin(Math.PI*t)*.42,z+(z2-z)*t);}
  pendant(x,.61,z);pendant(x*.42,.43,z*.42);pendant((x+x2)*.5,.43,(z+z2)*.5);
 }
 for(let i=0;i<6;i++){const q=s.mesh(new THREE.TorusGeometry(.053,.012,6,12),m.silver,0,2.13+i*.10,0,'Chain link');q.scale.y=1.5;q.rotation.y=i%2?Math.PI/2:0;}
 pendant(0,.18,0);g.userData={fixtureCount:1,arms:5,installationVerified:false};return mergeStatic(g);
}
export function createRopeReel(m=lampMaterials()){
 const g=new THREE.Group(),s=shapes(g);g.name='LED rope lighting reference reel';
 for(const y of [.08,.92])s.cyl(.49,.035,m.dark,0,y,0,48);s.cyl(.30,.82,m.dark,0,.50,0,32);
 const points=[];for(let i=0;i<=900;i++){const a=i/900*13*Math.PI*2;points.push([Math.sin(a)*.41,.13+i/900*.73,Math.cos(a)*.41]);}
 s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),600,.025,6,false),m.white); // A reference spool, not a scale claim about the full cable length.
 for(let i=0;i<168;i++){const t=i/168,a=t*13*Math.PI*2;s.mesh(new THREE.SphereGeometry(.012,5,4),m.warm,Math.sin(a)*.435,.13+t*.73,Math.cos(a)*.435);}
 g.userData={type:'led-rope',runLengthFt:300,routeVerified:false};return mergeStatic(g);
}
export function createStringFixture(type='c7',m=lampMaterials()){
 const g=new THREE.Group(),s=shapes(g),isBistro=type==='bistro',socket=isBistro?m.dark:m.white;
 s.cyl(isBistro?.043:.030,isBistro?.12:.065,socket,0,-.055,0,10);
 if(isBistro){const q=s.mesh(new THREE.SphereGeometry(.081,12,10),m.warm,0,-.177,0,'Round bistro bulb');q.scale.y=1.18;}
 else{s.lathe([[0,0],[.014,.025],[.032,.074],[.028,.103],[.022,.119]],m.warm,0,-.205,0,10);}
 return g;
}
// Used by both the real tent renderer and the product audit. Photometric output is illustrative.
export function makeReferenceLighting(tent,option){
 const group=new THREE.Group();if(!option||option.visual==='none'||option.available===false)return group;
 const ref=lightingReference(option),type=ref?.type||(option.visual==='chandelier'?'chandelier':option.visual?.startsWith('uplight')?'uplight':option.visual==='bistro-cross-runs'?'bistro':'c7');
 const profile=structuralProfile(tent.type||'frame',tent.widthFt,tent.lengthFt),m=lampMaterials(),s=shapes(group),h=profile.eaveHeightFt-.35,hw=tent.widthFt/2,hl=tent.lengthFt/2;
 group.name=option.name||'Event lighting';group.userData.reference=ref;group.userData.installationVerified=false;
 const lights=[];
 if(type==='chandelier'){
  const q=createChandelier(m),x=tent.type==='pole'?2.4:0;q.position.set(x,h-2.25,0);group.add(q);s.rod([x,h+.30,0],[x,profile.peakHeightFt-.4,0],.018,m.silver);group.userData.fixtureCount=1;
 }else if(type==='uplight'){
  const count=ref?.fixtureCount||(option.visual==='uplight-single'?1:12);group.userData.fixtureCount=count;group.userData.lensesPerFixture=6;
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,x=Math.sin(a)*Math.max(.5,hw-.6),z=Math.cos(a)*Math.max(.5,hl-.6),q=createUplight(m);q.position.set(x,0,z);q.rotation.y=a;group.add(q);if(count<=6||i%2===0){const glow=new THREE.PointLight('#7662ff',0,10,1.5);glow.position.set(x,1.3,z);lights.push(glow);}}
 }else{
  const lines=type==='bistro'?profile.lighting.bistro:profile.lighting.perimeter;group.userData.fixtureType=type;let routeLength=0,bulbs=0;
  for(const line of lines){const a=new THREE.Vector3(line.from.x-hw,h,line.from.y-hl),b=new THREE.Vector3(line.to.x-hw,h,line.to.y-hl),length=a.distanceTo(b),points=[];routeLength+=length;
   const point=f=>{const p=a.clone().lerp(b,f);p.y-=Math.sin(f*Math.PI)*(type==='rope'?.06:type==='bistro'?.45:.08);return p;};
   for(let i=0;i<=24;i++)points.push(point(i/24).toArray());s.curve(points,type==='rope'?.018:.009,type==='bistro'?m.dark:m.white);
   if(type==='rope'){
    // LED rope has integral diodes, not hanging bulbs. Bounded density avoids huge scenes.
    const count=Math.min(240,Math.ceil(length*3));for(let i=0;i<count;i++){const p=point((i+.5)/count);s.mesh(new THREE.SphereGeometry(.013,5,4),m.warm,p.x,p.y-.018,p.z,'Rope LED');}bulbs+=count;
   }else{
    const count=Math.max(1,Math.ceil(length/(type==='c7'?1:2.5)));for(let i=0;i<count;i++){const q=createStringFixture(type,m);q.position.copy(point((i+.5)/count));group.add(q);}bulbs+=count;
   }
  }
  group.userData.lightSources=bulbs;group.userData.routeLengthFt=routeLength;group.userData.fullRunInstalled=type==='rope'?false:null;
 }
 mergeStatic(group);
 if(type!=='uplight'){
  const count=type==='chandelier'?1:Math.min(6,Math.max(2,Math.ceil(tent.lengthFt/12)));
  for(let i=0;i<count;i++){const light=new THREE.PointLight('#ffe2b5',0,Math.max(18,tent.widthFt),1.5);light.position.set(type==='chandelier'&&tent.type==='pole'?2.4:(i%2?.45:-.45)*hw,h-1.2,type==='chandelier'?0:((i+.5)/count-.5)*tent.lengthFt*.8);lights.push(light);}
 }
 lights.forEach(l=>group.add(l));group.userData.setNight=night=>{m.warm.emissiveIntensity=night?3.5:.6;m.led.emissiveIntensity=night?2.5:.7;lights.forEach(l=>{l.intensity=night?(type==='uplight'?28:65):0;});};group.userData.setNight(false);
 return group;
}
