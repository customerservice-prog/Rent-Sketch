import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PACKAGED_ASSETS,packagedAssetFor} from '../js/data/packaged-assets.js';
import {inspectPackagedGlb,isPackagedAssetPath} from '../js/core/asset-validation.js';
import {equipmentAssetDescriptor} from '../js/data/asset-registry.js';
const file=quality=>{const value=fs.readFileSync(new URL('../assets/models/stanchion-black/2026.09.27.1/'+quality+'.glb',import.meta.url));return value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);};
function rewrite(source,change){
  const data=new DataView(source),length=data.getUint32(12,true),gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(source,20,length)));change(gltf);
  const json=new TextEncoder().encode(JSON.stringify(gltf)),padded=Math.ceil(json.length/4)*4,bin=source.slice(20+length),output=new Uint8Array(20+padded+bin.byteLength),view=new DataView(output.buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,output.byteLength,true);view.setUint32(12,padded,true);view.setUint32(16,0x4e4f534a,true);output.fill(32,20,20+padded);output.set(json,20);output.set(new Uint8Array(bin),20+padded);return output.buffer;
}
test('shipped authored asset variants pass budgets and remain illustrative',()=>{
  const asset=PACKAGED_ASSETS[0];assert.equal(asset.review.dimensionsVerified,false);assert.equal(asset.planning.resizePlacement,false);
  const stats={};for(const quality of ['standard','compact']){stats[quality]=inspectPackagedGlb(file(quality),asset.variants[quality]);assert.equal(stats[quality].primitives,4);assert.ok(stats[quality].triangles>2000);assert.equal(createHash('sha256').update(new Uint8Array(file(quality))).digest('hex'),asset.variants[quality].sha256);}
  assert.ok(stats.compact.triangles<stats.standard.triangles/2);assert.ok(stats.compact.bytes<stats.standard.bytes/2);
  assert.equal(equipmentAssetDescriptor({externalId:'fpr:crowd-control-stanchion'},'stanchion').dimensions.independentlyVerified,false);
  assert.equal(equipmentAssetDescriptor({},'stanchion').delivery.assetId,'stanchion-black');
});
test('only release-owned versioned paths and appropriate rental types resolve',()=>{
  const original={id:'post',kind:'equipment',visualType:'stanchion',x:2,y:3,widthFt:1.4,depthFt:1.2,rotationDeg:90};const snapshot=JSON.stringify(original);
  assert.equal(packagedAssetFor(original).quality,'standard');assert.equal(packagedAssetFor(original,{mobile:true}).quality,'compact');assert.equal(JSON.stringify(original),snapshot);
  assert.equal(packagedAssetFor({...original,kind:'table'}),null);assert.equal(packagedAssetFor({...original,asset:{delivery:{format:'glb',assetId:'stanchion-black',version:'older'}}}),null);
  for(const path of ['https://evil.test/a.glb','//evil.test/a.glb','/assets/models/../secret','/assets/models/x/2026.09.27.1/standard.glb?url=https://evil.test','data:model/gltf-binary;test','/assets/models/x%2fy/2026.09.27.1/standard.glb'])assert.equal(isPackagedAssetPath(path),false,path);
});
test('embedded-resource policy rejects external, data, extension and oversized payloads before parsing',()=>{
  const base=file('compact');
  for(const change of [g=>g.buffers[0].uri='https://private.example/asset',g=>g.buffers[0].uri='data:application/octet-stream;base64,AA==',g=>g.extras={uri:'file:///etc/passwd'},g=>g.extensionsUsed=['KHR_draco_mesh_compression'],g=>g.materials[0].extensions={KHR_materials_unlit:{}},g=>g.bufferViews[0].byteLength=99e6,g=>g.accessors[0].count=99e6,g=>g.nodes[0].children=[0],g=>g.nodes.push({children:[0]}),g=>g.images=[{uri:'https://other.test/x.png'}]])assert.throws(()=>inspectPackagedGlb(rewrite(base,change)),/Model rejected/);
  assert.throws(()=>inspectPackagedGlb(base,{maxBytes:128}),/file size/);assert.throws(()=>inspectPackagedGlb(base,{maxTriangles:500}),/triangle budget/);
  const truncated=base.slice(0,-4);assert.throws(()=>inspectPackagedGlb(truncated),/GLB header/);
});
