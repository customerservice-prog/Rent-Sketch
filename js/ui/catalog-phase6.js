import {phase6Reference} from '../data/phase6-reference.js';
import {equipmentCatalog,equipmentItem,EQUIPMENT} from '../data/equipment.js';
import {createEquipment} from './equipment-motion3d.js';
import {mountCatalogFurniture} from './catalog-furniture3d.js';
export function phase6Model(product){
 const reference=phase6Reference(product);if(!reference||reference.kind!=='equipment')return null;
 const definition=equipmentCatalog([product],false)[0];if(!definition)return null;
 const index=EQUIPMENT.findIndex(p=>p.productId===product.id);if(index<0)EQUIPMENT.push(definition);else EQUIPMENT[index]=definition;
 const model=createEquipment({...equipmentItem(definition,'phase6-preview'),operationState:'off'});
 return {model,reference,note:reference.note+' Photo-referenced appearance; footprint and height are planning approximations, not verified measurements.'};
}
export function mountCatalogPhase6(host,product,onFailure){
 const result=phase6Model(product);if(!result)return null;
 return {...mountCatalogFurniture(host,{id:product.id,productId:product.id,name:product.name},'equipment',onFailure,result.model),...result};
}
