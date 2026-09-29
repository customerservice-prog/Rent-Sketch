import {phase6bReference} from './phase6b-reference.js';
const positive=v=>{const n=Number(v);return Number.isFinite(n)&&n>0&&n<=500?n:null;};
export function phase6bDimensions(product={}){
 const ref=phase6bReference(product),m=product.metadata&&typeof product.metadata==='object'?product.metadata:{},d=ref?.dimensions||[2,2,2];
 const width=positive(product.width_ft||m.widthFt),height=positive(product.height_ft||m.heightFt||m.height_ft);
 // 8x8 wall photo metadata describes its face, not an eight-foot-deep base.
 // Only an explicit ground-depth field can confirm that footprint.
 const depth=positive(ref?.verticalFace?(m.footprintDepthFt||m.depthFt):(product.length_ft||m.depthFt||m.lengthFt));
 return {widthFt:width||d[0],depthFt:depth||d[1],heightFt:height||d[2],dimensionsConfirmed:!!(width&&depth),heightConfirmed:!!height,dimensionProvenance:width&&depth?'catalog-supplied':'photo-profile-approximation'};
}
