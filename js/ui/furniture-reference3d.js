// Photo-referenced geometry corrections. These change appearance, not a saved
// rental's footprint, SKU, availability or price. Proportions are not surveyed.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const up=new THREE.Vector3(0,1,0);
const material=(color,name,extra={})=>Object.assign(new THREE.MeshStandardMaterial({color,roughness:.6,...extra}),{name});
const modelKey=def=>String(def.visualModelId||def.id||'').split('--')[0];
function mesh(g,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function block(g,w,h,d,mat,x=0,y=0,z=0,r=.025){return mesh(g,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),mat,x,y,z);}
function rod(g,a,b,r,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from),m=mesh(g,new THREE.CylinderGeometry(r,r,v.length(),10),mat);m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,v.normalize());return m;}
function rail(g,a,b,w,d,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from),m=block(g,w,v.length(),d,mat);m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,v.normalize());return m;}
function curved(g,points,r,mat){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(16,points.length*5),r,8,false),mat);}
function seatShape(w,d){const s=new THREE.Shape();s.moveTo(-w*.40,-d*.50);s.quadraticCurveTo(-w*.47,-d*.50,-w*.48,-d*.39);s.lineTo(-w*.5,d*.25);s.quadraticCurveTo(-w*.53,d*.50,-w*.31,d*.50);s.quadraticCurveTo(0,d*.54,w*.31,d*.50);s.quadraticCurveTo(w*.53,d*.5,w*.5,d*.25);s.lineTo(w*.48,-d*.39);s.quadraticCurveTo(w*.47,-d*.5,w*.4,-d*.5);s.closePath();return s;}
function slab(g,w,d,depth,y,mat){const geo=new THREE.ExtrudeGeometry(seatShape(w,d),{depth,bevelEnabled:false,curveSegments:12,steps:1});geo.rotateX(Math.PI/2);return mesh(g,geo,mat,0,y,0);}
function backPanel(g,w,height,depth,y,z,mat,arched=false){const s=new THREE.Shape(),hw=w/2;s.moveTo(-hw,-height*.32);s.quadraticCurveTo(-hw,height*.4,-hw*.8,height*.46);s.quadraticCurveTo(0,height*.62,hw*.8,height*.46);s.quadraticCurveTo(hw,height*.4,hw,-height*.32);s.quadraticCurveTo(0,arched?-height*.02:-height*.60,-hw,-height*.32);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.016,bevelThickness:.012,curveSegments:12});const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.055*(p.getX(i)/hw)**2);geo.computeVertexNormals();const m=mesh(g,geo,mat,0,y,z-depth/2);m.rotation.x=-.16;return m;}
function foot(g,x,z,mat,r=.042){mesh(g,new THREE.CylinderGeometry(r,r*1.08,.045,10),mat,x,.0225,z);}
function spindle(g,x,z,y0,y1,r,mat){rod(g,[x,y0,z],[x,y1,z],r,mat);for(const f of [.12,.32,.77,.93]){const m=mesh(g,new THREE.SphereGeometry(r*1.45,8,6),mat,x,y0+(y1-y0)*f,z);m.scale.y=1.28;}}
function throne(g,def,frame,pad){
 const key=modelKey(def),king=key==='throne-king',w=def.seatWidthFt||2.5,d=def.seatDepthFt||2.3,h=def.backHeightFt||5.2,y=1.48,bh=h-y-.36,bw=w*(king?.59:.83),bz=-d*.37;
 const outline=(width,height)=>{const s=new THREE.Shape(),a=width/2;s.moveTo(-a*.71,0);s.bezierCurveTo(-a*.61,height*.28,-a*.75,height*.49,-a*.97,height*.76);s.bezierCurveTo(-a*1.12,height*.96,-a*.68,height*1.01,-a*.42,height*.92);s.quadraticCurveTo(0,height*1.06,a*.42,height*.92);s.bezierCurveTo(a*.68,height*1.01,a*1.12,height*.96,a*.97,height*.76);s.bezierCurveTo(a*.75,height*.49,a*.61,height*.28,a*.71,0);s.closePath();return s;};
 const relief=(shape,depth,mat,yy,zz)=>mesh(g,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.026,bevelThickness:.025,bevelSegments:2,curveSegments:18}),mat,0,yy,zz);
 relief(outline(bw+.23,bh),.16,frame,y,bz-.12);
 const upholstery=relief(outline(bw,bh-.14),.19,pad,y+.065,bz+.055);upholstery.name='Tufted ivory back upholstery';
 const positions=upholstery.geometry.attributes.position;
 for(let i=0;i<positions.count;i++){const xx=positions.getX(i),yy=positions.getY(i),v=Math.min(1,Math.max(0,yy/(bh-.14)));if(positions.getZ(i)>.16)positions.setZ(i,positions.getZ(i)+.06*Math.sin(Math.PI*v)*Math.max(0,1-(xx/(bw/2))**2));}
 positions.needsUpdate=true;upholstery.geometry.computeVertexNormals();
 const seam=material('#cfc4b2','Upholstery tuft shadows',{roughness:.98});
 const rows=Math.floor((bh-.2)/.47),cols=king?3:4,dx=bw/(cols+1),dy=(bh-.28)/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<cols-(row%2);col++){
   const xx=(col-(cols-(row%2)-1)/2)*dx,yy=y+.19+row*dy,zz=bz+.278;
   mesh(g,new THREE.SphereGeometry(.024,8,6),seam,xx,yy,zz);
   for(const sign of [-1,1])if(row<rows-1&&Math.abs(xx+sign*dx/2)<bw*.34)rod(g,[xx,yy,zz-.009],[xx+sign*dx/2,yy+dy,zz-.009],.006,seam);
 }
 const curl=(x,yy,z,r,sign=1)=>{const points=[];for(let i=0;i<=24;i++){const f=i/24,a=f*Math.PI*2.4,rr=r*(1-f*.68);points.push([x+Math.cos(a)*rr*sign,yy+Math.sin(a)*rr,z]);}curved(g,points,.032,frame);};
 slab(g,w*.95,d*.91,.23,y+.21,pad);block(g,w*.93,.20,.18,frame,0,y-.08,d*.46,.04);
 for(const side of [-1,1]){
   const xx=side*w*.43;
   for(const z of [-d*.36,d*.39]){
     rod(g,[xx,.055,z],[xx,y+.61,z],king?.105:.09,frame);
     for(const yy of [.14,.34,.59,y-.1,y+.37]){const node=mesh(g,new THREE.SphereGeometry(king?.135:.118,10,8),frame,xx,yy,z);node.scale.y=1.3;}
   }
   if(king){block(g,.30,.19,d*.85,frame,xx,y+.58,0,.045);block(g,.22,.055,d*.65,pad,xx,y+.70,0,.023);rod(g,[xx,y,-d*.4],[xx,h-.38,-d*.4],.071,frame);for(const yy of [y+.5,h-1.2,h-.46])spindle(g,xx,-d*.4,yy,yy+.22,.09,frame);mesh(g,new THREE.ConeGeometry(.115,.37,10),frame,xx,h-.205,-d*.4);}
   else {block(g,.26,.47,d*.77,pad,xx,y+.3,0,.08);rod(g,[xx,y+.66,-d*.31],[xx,y+.66,d*.42],.175,pad);curved(g,[[xx,y+.62,d*.52],[xx,y+.78,d*.43],[xx,y+.68,d*.29]],.054,frame);curl(xx,y+.60,d*.55,.15,side);}
   for(let i=0;i<6;i++){const f=i/5,yy=y+.26+f*(bh-.4),edge=bw/2*(.70+.31*Math.sin(f*Math.PI/2));curl(side*(edge+.09),yy,bz+.15,.10+f*.025,side);}
   curl(side*w*.23,y-.18,d*.50,.16,side);
 }
 const crownY=y+bh-.025;
 for(const side of [-1,1])for(let i=0;i<4;i++){
   const leaf=mesh(g,new THREE.SphereGeometry(.075,8,6),frame,side*(.08+i*.09),crownY+.04+Math.cos(i*.48)*.11,bz+.14);leaf.scale.set(.75,1.65,.7);leaf.rotation.z=side*(.3+i*.26);
 }
 mesh(g,new THREE.SphereGeometry(.075,10,6),frame,0,h-.01,bz+.14);
 if(king){curl(-.15,h-.18,bz+.14,.18,-1);curl(.15,h-.18,bz+.14,.18,1);}
 return g;
}
export function referenceChair(def={},merge){
 const family=def.silhouette||'folding';if(!['folding','resin','chiavari','throne'].includes(family))return null;
 const key=modelKey(def),g=new THREE.Group(),w=def.seatWidthFt||1.5,d=def.seatDepthFt||1.5,h=def.backHeightFt||2.6,seatY=1.48;
 const gold=family==='throne'||key==='chiavari-gold',frameColor=gold&&['#d4af37','#b99450'].includes(def.frameColor)?'#bb9654':def.frameColor||'#f2f1ec';
 const frame=material(frameColor,'Chair frame',{metalness:gold?.28:.025,roughness:gold?.4:.58}),pad=material(def.accentColor||def.frameColor||'#f2f1ec','Seat cushion',{roughness:.85}),feet=material(family==='folding'?'#a7aaa5':family==='resin'?'#e4e5df':frameColor,'Non-marking feet');
 g.name=def.name||'Chair';g.userData={silhouette:family,photoReferenced:true,modelKey:key};
 if(family==='throne'){throne(g,def,frame,pad);return merge(g);}
 if(family==='chiavari'){
   slab(g,w,d,.16,seatY+.10,pad);
   for(const side of [-1,1]){
     const x=side*w*.42;spindle(g,x,-d*.42,.035,h,.038,frame);spindle(g,x,d*.41,.035,seatY,.042,frame);
     for(const y of [.47,.83])rod(g,[x,y,-d*.42],[x,y,d*.41],.025,frame);
     rod(g,[x,seatY-.08,-d*.42],[x,seatY-.08,d*.41],.055,frame);
     foot(g,x,-d*.42,feet,.04);foot(g,x,d*.41,feet,.04);
   }
   for(const z of [-d*.42,d*.41])for(const y of [.48,.82,seatY-.08])rod(g,[-w*.42,y,z],[w*.42,y,z],y>1?.05:.025,frame);
   const bandBottom=seatY+(h-seatY)*.55,bandTop=h-.08;
   for(const y of [seatY+.22,bandBottom,bandTop])rod(g,[-w*.42,y,-d*.42],[w*.42,y,-d*.42],.033,frame);
   for(const f of [-.30,-.15,0,.15,.30])spindle(g,w*f,-d*.42,bandBottom,bandTop,.022,frame);
 }else{
   const resin=family==='resin';slab(g,w,d,resin?.13:.09,seatY+.06,resin?frame:pad);if(resin)slab(g,w*.9,d*.88,.066,seatY+.115,pad);
   for(const side of [-1,1]){
     const x=side*w*.43,front=d*.49,back=-d*.5;
     const support=(a,b)=>resin?rail(g,a,b,.105,.075,frame):rod(g,a,b,.028,frame);
     support([x,.035,front],[x,seatY-.02,-d*.34]);support([x,seatY-.02,-d*.34],[x,h-.04,-d*.61]);support([x,.035,back],[x,seatY-.02,d*.33]);
     const hinge=mesh(g,new THREE.CylinderGeometry(.040,.040,.08,10),feet,x,.86,0);hinge.rotation.z=Math.PI/2;
     foot(g,x,front,feet,resin?.045:.034);foot(g,x,back,feet,resin?.045:.034);
   }
   if(resin){block(g,w*.87,.105,.08,frame,0,.36,d*.25,.018);block(g,w*.87,.12,.08,frame,0,.48,-d*.29,.018);block(g,w*.87,.10,.08,frame,0,seatY-.16,-d*.35,.018);}
   else {rod(g,[-w*.43,.32,d*.30],[w*.43,.32,d*.30],.026,frame);rod(g,[-w*.43,seatY-.10,-d*.32],[w*.43,seatY-.10,-d*.32],.025,frame);}
   backPanel(g,w*.89,resin?.44:.51,.065,h-(resin?.25:.27),-d*.55,frame,resin);
 }
 return merge(g);
}
export function refineReferenceTable(g,p,def,merge){
 const key=modelKey(def),simple=['round-5ft','banquet-6ft','banquet-8ft','cocktail','fill-chill-4ft'].includes(key);
 // No side effects on catalog data, rental items, or geometry owned by another view.
 for(const m of g.children){if(m.material?.name==='Wood tabletop'){
   m.material.color.set(key==='sweetheart-half-round-60'?'#c59876':key==='cocktail'?'#c0b3a6':'#d4b391');m.material.roughness=.48;
 }}
 if(!simple)return g;
 for(const m of [...g.children])if(['Folding table supports','Table feet','Black folding basin supports'].includes(m.material?.name)){g.remove(m);m.geometry.dispose();m.material.dispose();}
 const metal=material(key==='cocktail'?'#c0c4c3':'#3d4141','Folding table supports',{metalness:key==='cocktail'?.45:.32,roughness:.43}),feet=material('#333735','Table feet'),edge=material('#282b29','Dark protective table edge');
 const support=new THREE.Group(),long=Math.max(p.w,p.d),short=Math.min(p.w,p.d),turned=p.d>p.w,position=(x,y,z)=>turned?[z,y,x]:[x,y,z];
 if(key==='cocktail'){
   rod(support,[0,.15,0],[0,p.height-.11,0],.050,metal);
   for(let i=0;i<4;i++){const a=i*Math.PI/2,xx=Math.cos(a),zz=Math.sin(a);curved(support,[[0,.28,0],[xx*p.w*.17,.19,zz*p.w*.17],[xx*p.w*.43,.045,zz*p.w*.43]],.035,metal);foot(support,xx*p.w*.43,zz*p.w*.43,feet,.033);}
 }else{
   for(const x of [-long*.30,long*.30]){
     const fill=key==='fill-chill-4ft',height=fill?p.height-.4:p.height;
     for(const side of [-1,1]){
       const zs=side*short,pts=fill?[[x,.045,zs*.35],[x,height-.12,zs*.29]]:[[x,.045,zs*.39],[x,.43,zs*.39],[x,.86,zs*.28],[x,height-.12,zs*.28]];
       curved(support,pts.map(q=>position(...q)),.045,metal);const [fx,,fz]=position(x,.02,zs*(fill?.35:.39));foot(support,fx,fz,feet,.046);
     }
     rod(support,position(x,.91,-short*.28),position(x,.91,short*.28),.039,metal);
     rail(support,position(x,1.05,0),position(x-Math.sign(x)*Math.min(.8,long*.13),height-.12,0),.060,.035,metal);
   }
 }
 if(key!=='fill-chill-4ft'){
   if(key==='round-5ft'||key==='cocktail')mesh(support,new THREE.CylinderGeometry(p.w/2+.003,p.w/2+.003,.083,64,1,true),edge,0,p.height-.046,0);
   else if(key==='banquet-8ft'){
     for(const z of [-p.d/2+.011,p.d/2-.011])block(support,p.w,.085,.022,edge,0,p.height-.05,z,.007);
     for(const x of [-p.w/2+.011,p.w/2-.011])block(support,.022,.085,p.d,edge,x,p.height-.05,0,.007);
   }
 }else{mesh(support,new THREE.CylinderGeometry(.065,.065,.012,16),edge,0,p.height-.308,0);}
 if(key==='banquet-6ft')for(const z of [-short*.32,short*.32])block(support,.14,.08,.18,metal,...position(0,p.height-.17,z),.02);
 merge(support);for(const m of [...support.children])g.add(m);return g;
}
