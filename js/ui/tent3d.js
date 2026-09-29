import * as THREE from 'three';
import { makeTent as makeBaseTent } from './tent-base3d.js';
import { structuralProfile } from '../data/tentStructure.js';
import { makeWindowWallSegment } from './window-wall3d.js';
export { makeRoof } from './tent-base3d.js';
const box=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
export function makeSidewalls(t,p,sidewalls){
  const group=new THREE.Group();group.name='Sidewalls';
  if(!Array.isArray(sidewalls)||!sidewalls.length)return group;
  const hw=t.widthFt/2,hl=t.lengthFt/2,h=Math.max(6,p.eaveHeightFt-.35);
  const solid=new THREE.MeshPhysicalMaterial({color:0xfffdf8,roughness:.78,side:THREE.DoubleSide});
  for(const seg of sidewalls){
    if(!seg||!['solid','window'].includes(seg.type)||!['front','back','left','right'].includes(seg.side))continue;
    const horizontal=seg.side==='front'||seg.side==='back',sideLength=horizontal?t.widthFt:t.lengthFt;
    const start=Number(seg.startFt)||0,len=Math.min(Number(seg.lengthFt)||10,sideLength-start);
    if(start<0||!Number.isFinite(len)||len<=0)continue;
    let panel;
    if(seg.type==='window')panel=makeWindowWallSegment(len,h,{panelWidthFt:Number(seg.panelWidthFt)||(t.type==='canopy'?10:20)});
    else {panel=new THREE.Group();const sheet=box(len,h,.045,solid);sheet.position.y=h/2;panel.add(sheet);}
    if(horizontal)panel.position.set(-hw+start+len/2,0,seg.side==='front'?-hl:hl);
    else {panel.rotation.y=Math.PI/2;panel.position.set(seg.side==='left'?-hw:hw,0,-hl+start+len/2);}
    panel.userData.panelId=seg.panelId||seg.id;panel.userData.productId=seg.productId||null;
    panel.traverse(o=>{if(o.isMesh){o.userData.kind='sidewall';o.userData.buildStage='sidewalls';o.castShadow=!o.material.transparent;o.receiveShadow=true;}});
    group.add(panel);
  }
  return group;
}

export function makeTent(t,anchor,sidewalls=[]){
 const group=makeBaseTent(t,anchor,[]);
 const empty=group.children.find(child=>child.name==='Sidewalls');if(empty)group.remove(empty);
 group.add(makeSidewalls(t,structuralProfile(t.type,t.widthFt,t.lengthFt),sidewalls));
 return group;
}
