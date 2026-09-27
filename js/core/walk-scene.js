import { objectLocalDimensions } from './world-space.js';
import { rentalPhotoPlacement } from './photo-geometry.js';

// The walk controller uses the same origin and mapped placements as the renderer.
export function walkSceneContext(state={}){
  const tent=state.tent||{widthFt:50,lengthFt:60},photo=!!state.photoMode;
  const site=photo?(state.photoSite||tent):(tent.planningArea||tent);
  return {
    site:{...site,worldOffsetX:photo?0:(site.widthFt-tent.widthFt)/2,worldOffsetZ:photo?0:(site.lengthFt-tent.lengthFt)/2},
    items:(state.objects||[]).map(item=>{
      const local=objectLocalDimensions(item),source={...item,modelWidthFt:local.widthFt,modelDepthFt:local.depthFt};
      const mapped=photo?rentalPhotoPlacement(source,tent,site,state.photoTentPlacement):source;
      const {photoPlacement,...result}=mapped;return result;
    }),
    obstacles:photo?[...(state.photoGeometry||[]),...(state.scanGeometry||[])]:[]
  };
}
