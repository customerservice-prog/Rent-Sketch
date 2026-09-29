import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Shared small geometry toolkit. Every mesh is owned by its returned model.
export const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.55,...extra});
export function shapes(root){
 const mesh=(g,m,x=0,y=0,z=0,name='')=>{const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.name=name;a.castShadow=!m.transparent;a.receiveShadow=true;root.add(a);return a;};
 const box=(w,h,d,m,x=0,y=0,z=0,r=.006,name='')=>mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(r,w*.2,h*.2,d*.2)),m,x,y,z,name);
 const cyl=(r,h,m,x=0,y=0,z=0,n=20)=>mesh(new THREE.CylinderGeometry(r,r,h,n),m,x,y,z);
 const rod=(a,b,r,m)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);if(delta.length()<1e-6)return null;const q=cyl(r,delta.length(),m);q.position.copy(av).add(bv).multiplyScalar(.5);q.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return q;};
 const curve=(points,r,m)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,7,false),m);
 const lathe=(points,m,x=0,y=0,z=0,n=24)=>mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),n),m,x,y,z);
 return {mesh,box,cyl,rod,curve,lathe};
}
export function mergeStatic(group){
 group.updateWorldMatrix(true,true);const inv=group.matrixWorld.clone().invert(),buckets=new Map(),originals=new Set();
 group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inv.clone().multiply(o.matrixWorld));originals.add(o.geometry);const rows=buckets.get(o.material)||[];rows.push(g);buckets.set(o.material,rows);});
 group.clear();for(const [m,rows] of buckets){const g=mergeGeometries(rows,false);rows.forEach(g=>g.dispose());if(g){const a=new THREE.Mesh(g,m);a.castShadow=!m.transparent;a.receiveShadow=true;group.add(a);}}originals.forEach(g=>g.dispose());return group;
}
