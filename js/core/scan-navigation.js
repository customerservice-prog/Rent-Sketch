// The browser depth preview does not solve full camera poses. Navigation is
// therefore limited to accepted captured reference positions, never an orbit
// sector inferred from a good-looking textured surface.
export function scanNavigationPolicy({references=[],origin={},fovDeg=62,imageWidth=4,imageHeight=3,horizonY=.34,trackedPath=null}={}){
  const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
  const center={x:number(origin.x,0),y:number(origin.y,5.6),z:number(origin.z,0)};
  const frames=references.filter(ref=>ref&&ref.accepted!==false&&Number.isFinite(Number(ref.referenceIndex))&&Number.isFinite(Number(ref.offsetFt)))
    .map(ref=>({referenceIndex:Number(ref.referenceIndex),position:{x:center.x+Number(ref.offsetFt),y:center.y,z:center.z},rollDeg:number(ref.rollDeg,0),offsetFt:Number(ref.offsetFt)}))
    .filter((ref,i,all)=>all.findIndex(other=>other.referenceIndex===ref.referenceIndex)===i)
    .sort((a,b)=>a.offsetFt-b.offsetFt);
  const anchor=frames.reduce((best,frame)=>!best||Math.abs(frame.offsetFt)<Math.abs(best.offsetFt)?frame:best,null);
  const horizontalFovDeg=Math.max(35,Math.min(100,number(fovDeg,62))),width=Math.max(1,number(imageWidth,4)),height=Math.max(1,number(imageHeight,3));
  const verticalFovDeg=2*Math.atan(Math.tan(horizontalFovDeg*Math.PI/360)*height/width)*180/Math.PI;
  return {version:1,kind:'captured-viewpoints',allowOrbit:false,allowPan:false,allowFreeWalk:false,
    fovDeg:verticalFovDeg,horizontalFovDeg,imageWidth:width,imageHeight:height,horizonY:Math.max(.08,Math.min(.85,number(horizonY,.34))),frames,initialFrameIndex:anchor?.referenceIndex??null,
    poseStatus:'estimated-lateral-path',metric:false,
    unresolvedAxes:trackedPath?.poseAxes?Object.entries(trackedPath.poseAxes).filter(([,value])=>value==='unresolved').map(([axis])=>axis):['translationY','translationZ','yaw','pitch'],
    reason:'Explore accepted captured positions. Full camera pose and unseen surfaces remain unresolved.'};
}
