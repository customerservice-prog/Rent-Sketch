import * as THREE from 'three';
import {shapes,material,mergeStatic} from './phase5-shapes3d.js';
export function makeReferenceFloor(items,tent){
 if(!items.length)return null;
 const minX=Math.min(...items.map(o=>o.x)),minZ=Math.min(...items.map(o=>o.y)),maxX=Math.max(...items.map(o=>o.x+o.widthFt)),maxZ=Math.max(...items.map(o=>o.y+o.depthFt)),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
 const texture=woodTexture();
 const root=new THREE.Group(),s=shapes(root),rim=material('#b9c0c1',{metalness:.58,roughness:.34}),base=material('#44352a'),face=material(texture?'#b39482':'#7b3b20',{roughness:.56,...(texture?{map:texture}:{})});
 const occupied=(x,z)=>items.some(o=>x>o.x+.001&&x<o.x+o.widthFt-.001&&z>o.y+.001&&z<o.y+o.depthFt-.001);
 for(const o of items){const w=o.widthFt,d=o.depthFt,x=o.x+w/2-cx,z=o.y+d/2-cz;
  s.box(w,.08,d,base,x,.04,z,.001);s.box(w-.018,.014,d-.018,face,x,.087,z,.001,'Wood-look section');
  // A single procedural wood texture avoids thousands of grain meshes per panel.
  for(const side of [-1,1]){
   if(!occupied(o.x+w/2,o.y+(side<0?-.02:d+.02)))s.box(w,.075,.075,rim,x,.055,z+side*(d/2-.0375),.004,'Outer floor edging');
   if(!occupied(o.x+(side<0?-.02:w+.02),o.y+d/2))s.box(.075,.075,d,rim,x+side*(w/2-.0375),.055,z,.004,'Outer floor edging');
  }
 }
 mergeStatic(root);root.position.set(cx-tent.widthFt/2,0,cz-tent.lengthFt/2);root.name='Wood-look section dance floor';root.userData={kind:'danceGroup',itemIds:items.map(o=>o.id),physicalSections:items.length,panelFt:3,substrateVerified:false};root.traverse(m=>{m.userData.kind='danceGroup';m.userData.itemIds=root.userData.itemIds;});return root;
}

function woodTexture(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');if(!c)return null;
 c.fillStyle='#854527';c.fillRect(0,0,256,256);
 for(let row=0;row<170;row++){const y=row*256/170;c.strokeStyle=row%3?'rgba(216,169,124,.20)':'rgba(75,36,19,.22)';c.lineWidth=row%4===0?.7:.35;c.beginPath();c.moveTo(0,y);for(let x=0;x<=256;x+=8)c.lineTo(x,y+Math.sin(x*.032+row*.43)*1.1);c.stroke();}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
