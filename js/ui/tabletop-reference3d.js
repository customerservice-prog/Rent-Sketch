import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {tabletopReference} from '../data/tabletop-reference.js';
import {clothMaterial} from './linen-fabric3d.js';
// Same meshes used by table settings and catalog audit. No flowers, food,
// napkins or other rentals from a marketing photo are added automatically.
export function makeTabletopReference(product,color='White'){
 const p=product.reference||tabletopReference(product);if(!p||p.family==='runner')return null;
 const root=new THREE.Group();root.name=product.name;root.userData={productId:product.productId,referenceSlug:p.referenceSlug,dimensionsConfirmed:false};
 const silver=new THREE.MeshPhysicalMaterial({color:'#bfc6cc',metalness:.86,roughness:.22}),gold=new THREE.MeshPhysicalMaterial({color:'#cba14f',metalness:.72,roughness:.24}),ceramic=new THREE.MeshPhysicalMaterial({color:'#fffefa',roughness:.24,clearcoat:.3}),glass=new THREE.MeshPhysicalMaterial({color:'#eff7f7',transparent:true,opacity:.42,roughness:.06,metalness:0,side:THREE.DoubleSide,depthWrite:false,clearcoat:1});
 silver.name='Stainless steel';gold.name='Gold bead trim';ceramic.name='White porcelain';glass.name='Clear glass';
 const add=(geo,mat,x=0,y=0,z=0,name='')=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 const lathe=(points,mat,y=0,name='')=>add(new THREE.LatheGeometry(points.map(q=>new THREE.Vector2(...q)),48),mat,0,y,0,name);
 const rounded=(w,h,d,mat,x=0,y=0,z=0,r=.02)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),mat,x,y,z);
 if(['plate','charger'].includes(p.family)){
  const r=p.diameterIn/24,mat=p.family==='charger'?glass:ceramic;
  if(p.shape==='square'){
   // One concave square dish with a shallow raised rim; never a circular plate.
   const rings=[[r,.055],[r*.78,.052],[r*.58,.020],[0,.020]],v=[],ind=[],segments=64;
   for(const [radius,y] of rings)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a),scale=Math.max(Math.abs(c),Math.abs(s));v.push(radius*c/scale,y,radius*s/scale);}
   for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const k=j*(segments+1)+i;ind.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(ind);geo.computeVertexNormals();const m=mat.clone();m.side=THREE.DoubleSide;add(geo,m,0,0,0,'Square bread and butter plate');
  }else lathe([[0,.012],[r*.66,.012],[r*.9,.042],[r,.058],[r,.075],[r*.88,.067],[r*.66,.035],[0,.035]],mat,0,'Shallow plate with raised rim');
  if(p.family==='charger')for(let i=0;i<60;i++){const a=i/60*Math.PI*2;add(new THREE.SphereGeometry(.014,7,5),p.beads==='gold'?gold:glass,Math.cos(a)*r*.97,.071,Math.sin(a)*r*.97,'Beaded rim');}
 }else if(p.family==='glass'){
  const h=p.heightFt;let points=[],stem=0;
  const wall=pts=>{const inner=pts.slice().reverse().map(([r,y])=>[Math.max(.008,r-.009),y]);return [...pts,...inner];};
  const foot=radius=>lathe([[0,.01],[radius,.01],[radius,.023],[radius*.35,.036],[0,.036]],glass,0,'Glass foot');
  if(p.glassShape==='martini'){
   stem=h*.47;foot(.14);lathe([[.02,.026],[.013,stem],[.025,stem+.018]],glass,0,'Slender martini stem');points=wall([[.015,0],[.03,.03],[.17,h-stem-.015],[.178,h-stem]]);
  }else if(p.glassShape==='wine'){
   stem=h*.38;foot(.135);lathe([[.022,.027],[.014,stem],[.03,stem+.012]],glass,0,'Wine stem');points=wall([[.025,0],[.075,.022],[.125,.065],[.143,.14],[.135,.23],[.106,h-stem]]);
  }else if(p.glassShape==='goblet'){
   stem=h*.22;foot(.145);lathe([[.06,.028],[.042,stem*.5],[.055,stem]],glass,0,'Short goblet stem');points=wall([[.04,0],[.10,.035],[.142,.12],[.147,.24],[.13,h-stem]]);
  }else if(p.glassShape==='carafe')points=wall([[.125,.02],[.175,.025],[.164,h*.30],[.133,h*.55],[.078,h*.75],[.064,h*.91],[.10,h]]);
  else if(p.glassShape==='pilsner')points=wall([[.12,.018],[.125,.042],[.076,.14],[.10,h*.52],[.14,h*.89],[.145,h]]);
  else if(p.glassShape==='mug')points=wall([[.13,.025],[.142,.045],[.142,h]]);
  else points=wall([[.115,.014],[.12,.04],[.13,h]]);
  lathe(points,glass,stem,'Open '+p.glassShape+' vessel');
  if(p.glassShape==='mug'){
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.135,h*.81,0),new THREE.Vector3(.23,h*.85,0),new THREE.Vector3(.26,h*.52,0),new THREE.Vector3(.20,h*.20,0),new THREE.Vector3(.135,h*.24,0)]);add(new THREE.TubeGeometry(curve,24,.017,8,false),glass,0,0,0,'Curved glass mug handle');
  }
 }else if(['fork','spoon','knife'].includes(p.family)){
  const len=p.lengthFt,handle=len*.61;rounded(.064,.017,handle,silver,0,.014,len*.16,.009);
  if(p.family==='fork'){
   const shape=new THREE.Shape();shape.moveTo(-.030,.03);shape.quadraticCurveTo(-.070,-.10,-.080,-.16);shape.lineTo(.080,-.16);shape.quadraticCurveTo(.070,-.10,.030,.03);shape.closePath();
   const geo=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1});geo.rotateX(Math.PI/2);add(geo,silver,0,.028,-len*.14,'Fork shoulder');
   for(let i=0;i<4;i++){
    const x=-.062+i*.041,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,.020,-len*.23),new THREE.Vector3(x,.030,-len*.39),new THREE.Vector3(x,.042,-len*.50)]);
    add(new THREE.TubeGeometry(curve,10,.008,6,false),silver,0,0,0,'Four fork tines');
   }
  }else if(p.family==='knife'){
   const shape=new THREE.Shape();shape.moveTo(-.025,0);shape.lineTo(-.025,.32);shape.quadraticCurveTo(.075,.38,.090,.23);shape.lineTo(.075,0);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.015,bevelEnabled:true,bevelSize:.005,bevelThickness:.003,bevelSegments:2,steps:1});geo.rotateX(-Math.PI/2);add(geo,silver,0,.018,-len*.10,'Rounded dinner knife blade');
  }else{
   // Concave spoon bowl, not a solid oval lump.
   const points=[[0,.008],[.055,.012],[.105,.05],[.108,.052],[.102,.040],[.052,.003],[0,0]];const bowl=lathe(points,silver,0,'Concave spoon bowl');bowl.scale.set(len/.65,.65,len/.65*1.48);bowl.position.z=-len*.31;
  }
 }else if(p.family==='napkin'){
  const cloth=clothMaterial(color);rounded(.45,.022,.59,cloth,0,.012,0,.008);rounded(.44,.01,.28,cloth,0,.03,.135,.004);rounded(.055,.009,.56,cloth,.17,.025,0,.004);
 }
 return root;
}
