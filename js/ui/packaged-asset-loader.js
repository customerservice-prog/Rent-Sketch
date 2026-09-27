import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PACKAGED_ASSETS, packagedAssetFor } from '../data/packaged-assets.js';
import { inspectPackagedGlb, isPackagedAssetPath } from '../core/asset-validation.js';
import { objectLocalDimensions } from '../core/world-space.js';

// Only validated bytes are shared. Each placement owns its parsed GPU resources,
// so the renderer's normal recursive disposal cannot invalidate another rental.
const byteCache=new Map(),pending=new Map();let cachedBytes=0;
const CACHE_BYTES=12*1024*1024,CACHE_ITEMS=8;
export function clearPackagedAssetCache(){byteCache.clear();cachedBytes=0;}
export function packagedAssetCacheInfo(){return {entries:byteCache.size,bytes:cachedBytes,pending:pending.size};}
export async function fetchPackagedAsset(variant,{fetcher=globalThis.fetch}={}){
  if(!isPackagedAssetPath(variant?.url))throw new Error('Unapproved model path');
  variant=PACKAGED_ASSETS.flatMap(asset=>Object.values(asset.variants)).find(approved=>approved.url===variant.url);
  if(!variant)throw new Error('Unapproved model version');
  if(byteCache.has(variant.url)){const bytes=byteCache.get(variant.url);byteCache.delete(variant.url);byteCache.set(variant.url,bytes);inspectPackagedGlb(bytes,variant);return bytes;}
  if(pending.has(variant.url))return pending.get(variant.url);
  const job=(async()=>{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetcher(variant.url,{credentials:'omit',redirect:'error',signal:controller.signal,cache:'force-cache'});
      if(!response.ok)throw new Error('Model unavailable');
      const length=Number(response.headers.get('content-length'));
      if(length>variant.maxBytes)throw new Error('Model download exceeds budget');
      if(!response.body?.getReader)throw new Error('Bounded model streaming is unavailable');
      const reader=response.body.getReader(),chunks=[];let size=0;
      try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>variant.maxBytes){controller.abort();throw new Error('Model download exceeds budget');}chunks.push(value);}}
      finally{reader.releaseLock();}
      const merged=new Uint8Array(size);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength;}
      const bytes=merged.buffer;inspectPackagedGlb(bytes,variant);
      if(!globalThis.crypto?.subtle)throw new Error('Model integrity verification is unavailable');
      const digest=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))).map(value=>value.toString(16).padStart(2,'0')).join('');
      if(digest!==variant.sha256)throw new Error('Model version integrity mismatch');
      while(byteCache.size>=CACHE_ITEMS||cachedBytes+size>CACHE_BYTES){const oldest=byteCache.keys().next().value;if(oldest===undefined)break;cachedBytes-=byteCache.get(oldest).byteLength;byteCache.delete(oldest);}
      byteCache.set(variant.url,bytes);cachedBytes+=size;return bytes;
    }finally{clearTimeout(timeout);}
  })();
  pending.set(variant.url,job);
  try{return await job;}finally{pending.delete(variant.url);}
}

export function disposeRentalAsset(root){
  if(!root)return;
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(part=>{if(part.geometry)geometries.add(part.geometry);for(const material of Array.isArray(part.material)?part.material:[part.material])if(material){materials.add(material);Object.values(material).forEach(value=>{if(value?.isTexture)textures.add(value);});}});
  geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>{value.dispose();value.source?.data?.close?.();});root.clear();
}

export async function loadRentalAsset(item,options={}){
  const resolved=packagedAssetFor(item,options);if(!resolved)return null;
  const bytes=await fetchPackagedAsset(resolved.variant,options);
  // Reject any secondary resource lookup even if GLTFLoader changes behavior.
  const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(url.startsWith('blob:'))return url;throw new Error('Linked model resources are forbidden');});
  const gltf=await new GLTFLoader(manager).parseAsync(bytes.slice(0),'');
  const root=new THREE.Group(),model=gltf.scene;root.name='Packaged rental: '+resolved.asset.id;root.add(model);
  try{
    model.scale.setScalar(resolved.asset.units==='meters'?1/.3048:1);
    model.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
    if(![size.x,size.y,size.z].every(value=>Number.isFinite(value)&&value>.0001&&value<500))throw new Error('Invalid physical model bounds');
    // Center and ground the visual without touching the saved item's footprint,
    // rotation, position, dimension provenance, clearance, or product identity.
    model.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
    const local=objectLocalDimensions(item),height=Number(item.heightFt)||resolved.asset.dimensions.heightFt;
    if(![local.widthFt,local.depthFt,height].every(value=>Number.isFinite(value)&&value>0&&value<=500))throw new Error('Invalid placement dimensions');
    root.scale.set(local.widthFt/size.x,height/size.y,local.depthFt/size.z);
    root.userData={itemId:item.id,asset:{id:resolved.asset.id,version:resolved.asset.version,format:'glb',quality:resolved.quality,fidelity:'authored-illustration',dimensionsVerified:false},planningFootprint:'unchanged'};
    root.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true;part.userData.itemId=item.id;}});
    return root;
  }catch(error){disposeRentalAsset(root);throw error;}
}

// Returns null for ordinary procedural assets. Call cancel before disposing the
// containing renderer group to prevent an in-flight completion attaching later.
// The fallback remains visible until a complete, checked replacement is ready.
export function enhancePlacedVisual(fallback,item,options={}){
  if(!packagedAssetFor(item,options))return null;
  let cancelled=false,replacement=null;
  const wrapper=new THREE.Group();wrapper.name=fallback.name;wrapper.userData={...fallback.userData};
  wrapper.position.copy(fallback.position);wrapper.rotation.copy(fallback.rotation);wrapper.scale.copy(fallback.scale);
  fallback.position.set(0,0,0);fallback.rotation.set(0,0,0);fallback.scale.set(1,1,1);wrapper.add(fallback);
  const cancel=()=>{cancelled=true;};wrapper.userData.cancelAssetLoad=cancel;
  wrapper.userData.assetDeliveryState='loading';
  const ready=loadRentalAsset(item,options).then(model=>{
    if(cancelled){disposeRentalAsset(model);return false;}
    if(!model)return false;replacement=model;wrapper.add(model);wrapper.remove(fallback);disposeRentalAsset(fallback);
    wrapper.userData.assetDeliveryState='ready';wrapper.userData.deliveredAsset=model.userData.asset;
    options.onReady?.(wrapper);return true;
  }).catch(error=>{if(!cancelled){wrapper.userData.assetDeliveryState='fallback';options.onError?.(error);}return false;});
  return {group:wrapper,ready,cancel,get replacement(){return replacement;}};
}
