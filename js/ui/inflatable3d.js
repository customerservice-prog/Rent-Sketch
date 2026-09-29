import { createInflatable as createGeneric, createInflatableActivity, childPose, slidePoint as genericSlidePoint } from './inflatable-generic3d.js';
import { resolvedInflatableDefinition, byId } from '../data/inflatables.js';
import { createPhotoReferencedInflatable } from './inflatable-reference3d.js';
export { createInflatableActivity, childPose };
export function slidePoint(zone,lane,t){
 const point=genericSlidePoint(zone,lane,t);
 if(Array.isArray(zone.laneCenters)&&Number.isFinite(zone.laneCenters[lane]))point.x=zone.laneCenters[lane];
 return point;
}
export function createInflatable(item,definition=byId(item.inflatableId)){
 const resolved=resolvedInflatableDefinition(item,definition);
 return (resolved&&createPhotoReferencedInflatable(item,resolved))||createGeneric(item,definition);
}
