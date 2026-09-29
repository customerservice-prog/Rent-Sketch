import * as THREE from 'three';
import {phase6bReference} from '../data/phase6b-reference.js';
import {phase6bDimensions} from '../data/phase6b-dimensions.js';
import {buildServiceware} from './phase6b-serviceware3d.js';
import {buildEventEquipment} from './phase6b-event-equipment3d.js';
import {mergeStatic} from './phase5-shapes3d.js';
import {attachEquipmentOperation} from './equipment-operation.js';
// This function never mutates a product, item, saved layout or quote.
export function createPhase6bModel(product,item={}){
 const ref=phase6bReference(product);if(!ref)return null;
 const defaults=phase6bDimensions(product),positive=(n,f)=>Number.isFinite(Number(n))&&Number(n)>0?Number(n):f;
 const quarter=Math.abs(Math.abs((Number(item.rotationDeg)||0)%180)-90)<1e-7;
 const w=positive(item.modelWidthFt,positive(quarter?item.depthFt:item.widthFt,positive(product.widthFt,defaults.widthFt))),d=positive(item.modelDepthFt,positive(quarter?item.widthFt:item.depthFt,positive(product.depthFt,defaults.depthFt))),h=positive(item.heightFt,positive(product.heightFt,defaults.heightFt));
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.name=product.name||ref.type;
 let features;
 if(ref.kind==='reference-only'){
  const g=new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),outline=new THREE.LineSegments(g,new THREE.LineDashedMaterial({color:'#a77c3e',dashSize:.065,gapSize:.045}));outline.position.y=.5;outline.computeLineDistances();body.add(outline);features={type:'unverified-footprint',physicalModel:false};
 }else{
  features=ref.kind==='tabletop'?buildServiceware(body,ref):buildEventEquipment(body,ref);if(!features)return null;
  const materials=new Map();body.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const m=o.material,key=JSON.stringify([m.type,m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.opacity,m.transparent,m.depthWrite,m.side,m.map?.uuid,m.normalMap?.uuid,m.roughnessMap?.uuid]);if(materials.has(key)){o.material=materials.get(key);if(m!==o.material)m.dispose();}else materials.set(key,m);});
  body.traverse(o=>{if(o.isMesh&&!o.geometry.getAttribute('uv'))o.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(o.geometry.getAttribute('position').count*2),2));});
  mergeStatic(body);const bounds=new THREE.Box3().setFromObject(body),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(![size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid Phase 6B geometry: '+ref.slug);
  // Give normalized geometry exactly the selected envelope. A taller close-up
  // must never silently move a saved item or expand its rental footprint.
  const depthRatio=ref.verticalFace?Math.min(1,(ref.visualDepthFt||.2)/d):1;body.scale.set(1/size.x,1/size.y,depthRatio/size.z);body.position.set(-center.x/size.x,-bounds.min.y/size.y,-center.z*depthRatio/size.z);
 }
 root.scale.set(w,h,d);
 root.userData={hardwareDetail:ref.kind==='tabletop',previewBackground:['ribbed-pitcher','flute','highball'].includes(ref.type)?'#50635b':undefined,kind:ref.kind==='tabletop'?'tabletop':'equipment',itemId:item.id,productId:product.productId||product.id,reference:ref,features,referenceOnly:ref.kind==='reference-only',dimensionsVerified:false,phase6b:true,asset:{fidelity:ref.kind==='reference-only'?'footprint':'photo-referenced-planning',source:{kind:ref.kind==='reference-only'?'unverified-reference':'catalog-photo',externalId:ref.externalId,referenceUrl:ref.referenceUrl,notes:ref.note}}};
 root.traverse(o=>{o.userData.itemId=item.id;});attachEquipmentOperation(root,'generic',item);return root;
}
