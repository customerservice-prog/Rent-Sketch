import * as THREE from 'three';
import { byId, linenColorHex } from '../data/linens.js';
import { linenDrapeProfile } from '../data/linen-spec.js';
export function clothMaterial(color='White',finish='polyester'){
 const material=new THREE.MeshPhysicalMaterial({color:linenColorHex(color),roughness:finish==='satin'?.32:finish==='sequin'?.28:.88,metalness:finish==='sequin'?.50:0,sheen:finish==='satin'?.9:.35,sheenRoughness:finish==='satin'?.36:.85,side:THREE.DoubleSide});
 material.name=finish==='polyester'?'Linen fabric':'Linen '+finish;material.userData.finish=finish;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  if(ctx){
   ctx.fillStyle=finish==='sequin'?'#999':'#eee';ctx.fillRect(0,0,256,256);
   if(finish==='sequin')for(let row=0;row<20;row++)for(let col=0;col<20;col++){
    const x=col*14+(row%2)*7,y=row*13,shade=155+(row*31+col*17)%95;
    ctx.fillStyle=`rgb(${shade},${shade},${shade})`;ctx.beginPath();ctx.ellipse(x,y,6,5.3,(row+col)*.41,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#666';ctx.lineWidth=.7;ctx.stroke();
   }else for(let i=0;i<256;i+=4){ctx.strokeStyle=i%8?'#e0e0e0':'#f7f7f7';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}
   const bump=new THREE.CanvasTexture(canvas);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(finish==='sequin'?5:6,finish==='sequin'?7:6);material.bumpMap=bump;material.bumpScale=finish==='sequin'?.018:.003;
   if(finish==='sequin'){material.roughnessMap=bump;material.clearcoat=.5;material.clearcoatRoughness=.35;}
  }
 }
 return material;
}
const mesh=(g,geometry,material,name)=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=m.receiveShadow=true;g.add(m);return m;};
function surface(vertices,uv,indices){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;}
export function makeRunner(w,d,height,material,lengthFt=9){
 const g=new THREE.Group();g.name='Selected table runner';const alongX=w>=d,length=Math.max(w,d),half=Math.min(length,lengthFt)/2,width=1.0,drop=Math.max(0,Math.min(height-.03,(lengthFt-length)/2)),v=[],uv=[],ind=[],rows=48;
 // One continuous ribbon folds over the two table ends, never a full-table skirt.
 const path=[];for(let i=0;i<=rows;i++){const s=i/rows*(drop*2+half*2)-drop-half;let x,y;if(s<-half){x=-half-.025;y=height-(-half-s);}else if(s>half){x=half+.025;y=height-(s-half);}else{x=s;y=height+.045;}path.push({x,y});}
 for(let i=0;i<path.length;i++)for(const side of [-1,1]){const p=path[i],fold=Math.sin(i*.8)*.007;v.push(alongX?p.x:side*width/2,p.y+fold,alongX?side*width/2:p.x);uv.push(side<0?0:1,i/rows);if(i<rows&&side===-1){const k=i*2;ind.push(k,k+1,k+2,k+1,k+3,k+2);}}
 mesh(g,surface(v,uv,ind),material,'Runner fabric');return g;
}
export function makeLinen(item,baseProfile){
 const linen=byId(item.linenId),p=linenDrapeProfile(item,baseProfile,linen),spec=p.clothSpec;if(!item.linenId||!spec)return null;
 const g=new THREE.Group();g.name='Selected linen';g.userData={productId:item.linenProductId||linen?.productId||null,clothSpec:spec,profile:p};
 const mat=clothMaterial(item.linenColor||linen?.colors?.[0]||'White',spec.material);
 if(spec.kind==='runner')return makeRunner(p.w,p.d,p.height,mat,(spec.clothLengthIn||108)/12);
 if(spec.kind==='napkin'){const m=mesh(g,new THREE.BoxGeometry(.46,.025,.60),mat,'Single selected napkin');m.position.y=p.height+.04;return g;}
 const round=item.shape==='round',half=p.silhouette==='sweetheart-half-round',segments=round?72:80,rows=16,vertices=[],uv=[],indices=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){
  const t=j/rows,a=i/segments*Math.PI*2;let x,z,nx,nz,physical,edgeU=0;
  if(round){nx=Math.cos(a);nz=Math.sin(a);x=nx*p.w/2;z=nz*p.d/2;physical=p.physicalDrop;edgeU=(a/(Math.PI/2))%1;}
  else if(half){const u=i/segments;if(u<=.4){x=-p.w/2+p.w*u/.4;z=-p.d/2;nx=0;nz=-1;}else{const angle=(u-.4)/.6*Math.PI;x=Math.cos(angle)*p.w/2;z=-p.d/2+Math.sin(angle)*p.d;const len=Math.hypot(Math.cos(angle)/(p.w/2),Math.sin(angle)/p.d);nx=Math.cos(angle)/(p.w/2)/len;nz=Math.sin(angle)/p.d/len;}physical=p.physicalDrop;}
  else{
   const edge=Math.min(3,Math.floor(i/(segments/4))),u=(i-edge*segments/4)/(segments/4);edgeU=u;
   if(edge===0){x=-p.w/2+p.w*u;z=-p.d/2;nx=0;nz=-1;}else if(edge===1){x=p.w/2;z=-p.d/2+p.d*u;nx=1;nz=0;}else if(edge===2){x=p.w/2-p.w*u;z=p.d/2;nx=0;nz=1;}else{x=-p.w/2;z=p.d/2-p.d*u;nx=-1;nz=0;}
   const isLong=p.w>=p.d?nz!==0:nx!==0,center=isLong?p.physicalSideDrop:p.physicalEndDrop,corner=Math.hypot(p.physicalSideDrop,p.physicalEndDrop),near=Math.pow(Math.abs(u-.5)*2,6);physical=center+(corner-center)*near;
  }
  let y;
  if(p.stretch){
   const waist=round?.57:.22,scale=1-waist*Math.pow(Math.sin(Math.PI*t),.85)-.16*t;
   x*=scale;z*=scale;const arch=round?Math.abs(Math.sin(2*a))*.58:Math.pow(Math.sin(Math.PI*edgeU),.7)*.65;
   y=p.height+.035-(p.height+.01-arch)*t;
  }else{
   const traveled=physical*t,fall=Math.min(traveled,p.height-.03),pool=Math.max(0,traveled-(p.height-.03));
   const pleat=(Math.sin(a*(round?20:24)+.2)*.07+Math.sin(a*7)*.015)*Math.pow(t,.7);
   x+=nx*(.035+pleat+pool*.72);z+=nz*(.035+pleat+pool*.72);y=p.height+.03-fall+Math.max(0,pool)*.012;
  }
  vertices.push(x,y,z);uv.push(i/segments,t);
  if(i<segments&&j<rows){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
 }
 mesh(g,surface(vertices,uv,indices),mat,p.stretch?'Fitted stretch fabric and foot pockets':'Loose cloth and folds');
 if(round){const top=mesh(g,new THREE.CylinderGeometry(p.w/2+.035,p.w/2+.035,.02,80),mat,'Linen tabletop');top.position.y=p.height+.04;}
 else if(!half){const top=mesh(g,new THREE.BoxGeometry(p.w+.045,.02,p.d+.045),mat,'Linen tabletop');top.position.y=p.height+.04;}
 else{const s=new THREE.Shape();s.moveTo(-p.w/2,-p.d/2);s.lineTo(p.w/2,-p.d/2);s.absellipse(0,-p.d/2,p.w/2,p.d,0,Math.PI,false);const m=mesh(g,new THREE.ShapeGeometry(s,48),mat,'Half-round linen top');m.rotation.x=Math.PI/2;m.position.y=p.height+.04;}
 return g;
}
