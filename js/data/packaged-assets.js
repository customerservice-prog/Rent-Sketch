// Release-owned assets only. Catalog metadata never supplies a model URL.
// Asset dimensions describe the authored illustration, not manufacturer evidence.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const PACKAGED_ASSET_SCHEMA=1;
export const PACKAGED_ASSETS=freeze([{
  schemaVersion:1,id:'stanchion-black',version:'2026.09.27.1',visualModelIds:['stanchion'],
  kind:'equipment',type:'stanchion',format:'glb',units:'meters',origin:'ground-center',forwardAxis:'+Z',
  source:{kind:'authored-illustration',author:'RentSketch',license:'project-owned',notes:'Locally authored retractable-belt post. Illustrative proportions; not a manufacturer scan or a dimension-certified SKU.'},
  review:{status:'release-reviewed',checks:['embedded-resources','geometry-budget','ground-origin','independent-footprint'],dimensionsVerified:false},
  dimensions:{widthFt:1.2,depthFt:1.2,heightFt:3.2,status:'illustrative',source:'visual-profile'},
  planning:{footprintSource:'placed-item',resizePlacement:false},
  variants:{
    standard:{url:'/assets/models/stanchion-black/2026.09.27.1/standard.glb',maxBytes:850000,maxTriangles:12000,sha256:'96336b097f0fc2b83496537c742abedede33982883ce1e0b56a966ff34aa8669'},
    compact:{url:'/assets/models/stanchion-black/2026.09.27.1/compact.glb',maxBytes:350000,maxTriangles:6000,sha256:'d38f6a27287f8e6c839643ff6e157f5fd9babe502a5e596d7db7a18e52bc2549'},
  },
  fallback:{format:'procedural',type:'stanchion'},
}]);

export function packagedAssetFor(item={},options={}){
  if(!['equipment','accessory',undefined].includes(item.kind))return null;
  const type=item.visualType||item.accessoryType||item.type||String(item.asset?.assetId||'').replace(/^procedural\//,'');
  const entry=PACKAGED_ASSETS.find(asset=>asset.type===type);
  if(!entry)return null;
  const pin=item.asset?.delivery;
  if(pin?.format==='glb'&&(pin.assetId!==entry.id||pin.version!==entry.version))return null;
  const quality=options.mobile||options.quality==='compact'?'compact':'standard';
  return {asset:entry,variant:entry.variants[quality],quality};
}

export function packagedAssetDelivery(type){
  const asset=PACKAGED_ASSETS.find(entry=>entry.type===type);
  return asset?{format:'glb',assetId:asset.id,version:asset.version,fidelity:'authored-illustration',fallback:'procedural/'+type}:null;
}
