import {phase6Reference} from '../data/phase6-reference.js';
import {equipmentCatalog,equipmentItem,EQUIPMENT} from '../data/equipment.js';
import {createEquipment} from './equipment-motion3d.js';
import {mountCatalogFurniture} from './catalog-furniture3d.js';
export function phase6Model(product){
 const reference=phase6Reference(product);if(!reference)return null;
 if(reference.kind==='reference-only'){
  const model=createEquipment({id:'phase6-preview',kind:'equipment',equipmentId:'unverified-'+product.id,productId:product.id,externalId:product.external_id||null,name:product.name||reference.type,widthFt:reference.dimensions?.[0]||2,depthFt:reference.dimensions?.[1]||2,heightFt:reference.dimensions?.[2]||2,modelWidthFt:reference.dimensions?.[0]||2,modelDepthFt:reference.dimensions?.[1]||2,rotationDeg:0,x:0,y:0,visualType:'generic',operationState:'off',asset:{source:{externalId:product.external_id||null}}});
  return {model,reference,note:reference.note+' Neutral dashed planning volume only; no exact appearance or dimensions are claimed.'};
 }
 if(reference.kind!=='equipment')return null;
 const definition=equipmentCatalog([product],false)[0];if(!definition)return null;
 const index=EQUIPMENT.findIndex(p=>p.productId===product.id);if(index<0)EQUIPMENT.push(definition);else EQUIPMENT[index]=definition;
 const model=createEquipment({...equipmentItem(definition,'phase6-preview'),operationState:'off'});
 return {model,reference,note:reference.note+' Photo-referenced appearance; footprint and height are planning approximations, not verified measurements.'};
}
export function mountCatalogPhase6(host,product,onFailure){
 const result=phase6Model(product);if(!result)return null;
 return {...mountCatalogFurniture(host,{id:product.id,productId:product.id,name:product.name},'equipment',onFailure,result.model),...result};
}
