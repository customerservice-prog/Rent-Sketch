import {phase6bReference} from '../data/phase6b-reference.js';
import {createPhase6bModel} from './phase6b-models3d.js';
import {mountCatalogFurniture} from './catalog-furniture3d.js';
export function phase6bModel(product){
 const reference=phase6bReference(product);if(!reference)return null;
 const model=createPhase6bModel(product);if(!model)return null;
 const note=reference.kind==='reference-only'?reference.note+' Neutral dashed planning volume only; no exact appearance or dimensions are claimed.':reference.note+' Shape is photo-referenced; unpublished measurements remain approximate.';
 return {model,reference,note};
}
export function mountCatalogPhase6b(host,product,onFailure){
 const result=phase6bModel(product);if(!result)return null;
 return {...mountCatalogFurniture(host,{id:product.id,productId:product.id,name:product.name},'equipment',onFailure,result.model),...result};
}
