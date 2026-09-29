import { objectLocalDimensions } from './world-space.js';

// The mesh is built table-local. Its containing scene applies rotation once.
// This is a read-only view of legacy and current saves, never a layout edit.
export function tableModelItem(item) {
  const size=objectLocalDimensions({...item,kind:'table'});
  return {...item,widthFt:size.widthFt,depthFt:size.depthFt,modelWidthFt:size.widthFt,modelDepthFt:size.depthFt,rotationDeg:0};
}

// Shared real-scale chair centers used by equipment cards, 2D and 3D.
export function chairPositions(item, chair = {}) {
  const count = Math.max(0, Math.floor(Number(item.seatCount) || 0));
  const local=tableModelItem(item),width=Number(local.widthFt)||5,depth=Number(local.depthFt)||5;
  const rotation=(Number(item.rotationDeg)||0)*Math.PI/180;
  const gap = (Number(chair.seatDepthFt) || 1.5) / 2 + .35;
  const positions = [];
  if (item.shape === 'half-round') {
    // Sweetheart guests sit together along the straight diameter. Stored width
    // and depth may be the rotated footprint; preserve the table's local size.
    const localWidth=width,localDepth=depth;
    const seats=Math.min(2,count),spacing=Math.min(localWidth/2,Math.max(1.5,(Number(chair.seatWidthFt)||1.5)+.35));
    for(let i=0;i<seats;i++){
      const x=(i-(seats-1)/2)*spacing,y=-localDepth/2-gap;
      positions.push({x,y,angle:-Math.PI/2});
    }
  } else if (item.shape === 'round') {
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      positions.push({x:(width / 2 + gap) * Math.cos(angle), y:(depth / 2 + gap) * Math.sin(angle), angle});
    }
  } else {
    // Place chairs along the long edges, with one at each end when seated.
    const turned = depth > width, long = Math.max(width, depth), short = Math.min(width, depth);
    const ends = count >= 4 ? 2 : 0, sideCount = count - ends;
    for (let side = 0; side < 2; side++) {
      const n = side === 0 ? Math.ceil(sideCount / 2) : Math.floor(sideCount / 2);
      for (let i = 0; i < n; i++) positions.push({x:-long / 2 + long * (i + .5) / n, y:(side === 0 ? -1 : 1) * (short / 2 + gap), angle:side === 0 ? -Math.PI / 2 : Math.PI / 2});
    }
    if (ends) positions.push({x:-long / 2 - gap,y:0,angle:Math.PI},{x:long / 2 + gap,y:0,angle:0});
    if (turned) positions.forEach(p => {const x=p.x;p.x=-p.y;p.y=x;p.angle+=Math.PI / 2;});
  }
  if(rotation)for(const p of positions){
    const x=p.x,y=p.y;p.x=x*Math.cos(rotation)-y*Math.sin(rotation);p.y=x*Math.sin(rotation)+y*Math.cos(rotation);p.angle+=rotation;
  }
  return positions;
}
