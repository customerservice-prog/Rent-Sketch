// One production renderer is shared by the designer, Table Studio and visual QA.
// Keep the existing table/linen/floor topology; refine photo-referenced furniture
// without changing the placement state, product IDs or quote quantities.
import * as THREE from 'three';
import * as base from './equipment-base3d.js';
import {referenceChair,refineReferenceTable} from './furniture-reference3d.js';
import {chairPositions} from '../core/seating.js';
import {byId as chairById} from '../data/chairs.js';
import {byId as tableById} from '../data/tables.js';
export {mergeParts,tableProfile,makeDanceFloor} from './equipment-base3d.js';
export function makeChair(def={}){return referenceChair(def,base.mergeParts)||base.makeChair(def);}
export function makeTable(item){
 const g=base.makeTable({...item,hideChairs:true}),p=g.userData.profile,def=tableById(item.tableId)||{};
 refineReferenceTable(g,p,def,base.mergeParts);
 const chair=chairById(item.chairId)||{},positions=item.hideChairs?[]:chairPositions({...item,widthFt:p.w,depthFt:p.d,...(p.silhouette==='sweetheart-half-round'?{rotationDeg:0}:{})},chair);
 if(positions.length){
   const prototype=makeChair(chair),dummy=new THREE.Object3D();
   for(const part of prototype.children){
     const batch=new THREE.InstancedMesh(part.geometry,part.material,positions.length);batch.name=part.name;batch.userData.role='chairs';
     positions.forEach((point,i)=>{dummy.position.set(point.x,0,point.y);dummy.rotation.set(0,-point.angle-Math.PI/2,0);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
     batch.castShadow=batch.receiveShadow=true;batch.instanceMatrix.needsUpdate=true;g.add(batch);
   }
   prototype.clear();
 }
 g.traverse(mesh=>{mesh.userData.itemId=item.id;});return g;
}
export function makeStandaloneChair(item){const chair=makeChair(chairById(item.chairId)||{});chair.rotation.y=-(item.rotationDeg||0)*Math.PI/180;chair.userData={...chair.userData,itemId:item.id,kind:'chair'};chair.traverse(part=>{part.userData.itemId=item.id;});return chair;}
