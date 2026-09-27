// Offline authored geometry. Rebuild: node scripts/build-packaged-assets.mjs
// Illustrative product proportions; never promoted to measured inventory data.
import fs from 'node:fs/promises';
import * as THREE from '../tests/node_modules/three/build/three.module.js';
import { GLTFExporter } from '../tests/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from '../tests/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from '../tests/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};

function stanchion(compact=false){
  const root=new THREE.Group();root.name='Retractable-belt stanchion (illustrative)';
  const black=new THREE.MeshStandardMaterial({name:'Powder-coated black steel',color:0x25282b,metalness:.68,roughness:.38});
  const rubber=new THREE.MeshStandardMaterial({name:'Protective rubber and woven belt',color:0x101214,metalness:0,roughness:.88});
  const trim=new THREE.MeshStandardMaterial({name:'Black satin cassette',color:0x272b2e,metalness:.17,roughness:.48});
  const screw=new THREE.MeshStandardMaterial({name:'Dark steel fasteners',color:0x5e6468,metalness:.85,roughness:.29});
  const n=compact?32:64;
  function mesh(geometry,material,x=0,y=0,z=0){const part=new THREE.Mesh(geometry,material);part.position.set(x,y,z);root.add(part);return part;}
  function lathe(points,material){return mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),n),material);}
  const box=(w,h,d,material,x,y,z)=>mesh(new RoundedBoxGeometry(w,h,d,compact?1:2,Math.min(w,h,d)*.16),material,x,y,z);
  // A recessed rubber sole under a domed weighted base, separate from the shaft.
  lathe([[0,0],[.176,0],[.18,.003],[.18,.008],[.174,.011],[0,.011]],rubber);
  lathe([[0,.008],[.177,.008],[.18288,.014],[.18288,.02],[.178,.027],[.153,.037],[.104,.044],[.044,.049],[.026,.053]],black);
  lathe([[.026,.049],[.03,.052],[.03,.067],[.026,.071],[.025,.071],[.025,.049]],trim);
  lathe([[.0245,.061],[.0254,.067],[.0254,.898],[.0245,.902],[.0235,.902],[.0235,.061]],black);
  lathe([[0,.892],[.035,.892],[.039,.897],[.041,.906],[.041,.956],[.039,.964],[.034,.967],[0,.967]],trim);
  lathe([[0,.963],[.034,.963],[.038,.967],[.038,.971],[.034,.97536],[0,.97536]],rubber);
  // Actual socket, retracted belt tab, and three receiver clips. No invented
  // extended belt or second post expands this single-post planning footprint.
  box(.012,.040,.020,rubber,.041,.931,0);
  box(.023,.027,.013,rubber,.052,.931,0);
  box(.011,.032,.017,trim,.066,.931,0);
  for(const a of [Math.PI/2,Math.PI,Math.PI*1.5]){const clip=box(.012,.040,.009,black,Math.sin(a)*.039,.930,Math.cos(a)*.039);clip.rotation.y=a;}
  for(const a of [Math.PI*.25,Math.PI*.75,Math.PI*1.25,Math.PI*1.75]){
    const fastener=mesh(new THREE.CylinderGeometry(.0028,.0028,.0018,compact?6:12),screw,Math.cos(a)*.030,.973,Math.sin(a)*.030);
    if(!compact)box(.0032,.0008,.00065,rubber,fastener.position.x,.974,fastener.position.z);
  }
  root.updateMatrixWorld(true);const buckets=new Map();
  root.traverse(part=>{if(!part.isMesh)return;const g=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();g.applyMatrix4(part.matrixWorld);const bucket=buckets.get(part.material)||[];bucket.push(g);buckets.set(part.material,bucket);});
  root.clear();for(const [material,geometries] of buckets){const combined=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());const part=new THREE.Mesh(combined,material);part.name=material.name;root.add(part);}
  return root;
}
const folder=new URL('../assets/models/stanchion-black/2026.09.27.1/',import.meta.url);await fs.mkdir(folder,{recursive:true});
for(const quality of ['standard','compact']){
  const scene=new THREE.Scene();scene.add(stanchion(quality==='compact'));
  const data=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
  await fs.writeFile(new URL(quality+'.glb',folder),new Uint8Array(data));
  console.log(quality+': '+data.byteLength+' bytes');
}
