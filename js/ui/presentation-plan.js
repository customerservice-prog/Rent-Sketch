import { photoPlanSnapshot } from '../core/photo-plan.js';
import { objectLocalDimensions, objectCenterLayout, objectGroundFootprint } from '../core/world-space.js';
import { chairPositions } from '../core/seating.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n = value => Number.isFinite(Number(value)) ? Math.round(Number(value) * 1000) / 1000 : 0;
const pts = points => points.map(p => n(p.x) + ',' + n(p.y)).join(' ');

// Vector export shares placement and seating math with the interactive views.
// It is always plan-oriented, independent of viewport fitting or camera pose.
export function presentationPlan(snapshot, catalogs = {}) {
  const data = photoPlanSnapshot(snapshot), tent = data.tent || {isSite:true,widthFt:50,lengthFt:60};
  const area = tent.planningArea || tent;
  const width = Math.max(1, Number(area.widthFt) || 50), depth = Math.max(1, Number(area.lengthFt) || 60);
  const items = (data.objects || []).filter(item => item && !item.parentId && item.kind !== 'tabletop');
  const planDimensions = item => data.photoSitePlan || item.shape === 'half-round' ? objectLocalDimensions(item) : {widthFt:Math.max(.01,Number(item.widthFt)||0),depthFt:Math.max(.01,Number(item.depthFt)||0)};
  const planAngle = item => data.photoSitePlan || item.shape === 'half-round' ? Number(item.rotationDeg)||0 : 0;
  let minX = 0, minY = 0, maxX = width, maxY = depth;
  const chairs = new Map();
  items.forEach(item => {
    const center = objectCenterLayout(item), local = objectLocalDimensions(item), chair = (catalogs.chairs || []).find(c => c.id === item.chairId) || {};
    // Photo placements can have arbitrary rotation; conventional layouts keep
    // their legacy oriented box. Match plan2d's shared seating convention.
    const theta = data.photoSitePlan ? (Number(item.rotationDeg) || 0) * Math.PI / 180 : 0;
    const seatingItem = data.photoSitePlan ? {...item, ...local, rotationDeg:0} : item;
    const seats = item.kind === 'table' ? chairPositions(seatingItem, chair).map(p => ({x:center.x+p.x*Math.cos(theta)-p.y*Math.sin(theta),y:center.y+p.x*Math.sin(theta)+p.y*Math.cos(theta),angle:p.angle+theta,width:Number(chair.seatWidthFt)||1.5,depth:Number(chair.seatDepthFt)||1.5})) : [];
    chairs.set(item, seats);
    const dimensions=planDimensions(item);
    objectGroundFootprint({...item,modelWidthFt:dimensions.widthFt,modelDepthFt:dimensions.depthFt,rotationDeg:planAngle(item)}).concat(seats).forEach(p => {minX=Math.min(minX,p.x-1);minY=Math.min(minY,p.y-1);maxX=Math.max(maxX,p.x+1);maxY=Math.max(maxY,p.y+1);});
  });
  const span = Math.max(maxX-minX,maxY-minY), pad=Math.max(3,span*.08), font=Math.max(.65,span*.017), stroke=Math.max(.04,span*.0015);
  const colors={table:'#e6ddcc',chair:'#d6e3dc',inflatable:'#b5d7d4',equipment:'#d2dbe5',accessory:'#e4d9cc',dance:'#ceb997',danceFloor:'#ceb997',buffet:'#d9cfb9'};
  const labels=[];
  const planItems = items.map((item,index) => {
    const local=planDimensions(item),center=objectCenterLayout(item),a=planAngle(item);
    const product=[...(catalogs.tables||[]),...(catalogs.chairs||[]),...(catalogs.equipment||[]),...(catalogs.inflatables||[]),...(catalogs.accessories||[])].find(p=>[item.tableId,item.chairId,item.equipmentId,item.inflatableId,item.accessoryId].includes(p.id));
    labels.push({number:index+1,label:product?.name||item.name||item.kind||'Rental'});
    let shape;
    if(item.shape==='round')shape='<ellipse rx="'+n(local.widthFt/2)+'" ry="'+n(local.depthFt/2)+'"/>';
    else if(item.shape==='half-round')shape='<path d="M '+n(-local.widthFt/2)+' '+n(-local.depthFt/2)+' H '+n(local.widthFt/2)+' A '+n(local.widthFt/2)+' '+n(local.depthFt)+' 0 0 1 '+n(-local.widthFt/2)+' '+n(-local.depthFt/2)+' Z"/>';
    else shape='<rect x="'+n(-local.widthFt/2)+'" y="'+n(-local.depthFt/2)+'" width="'+n(local.widthFt)+'" height="'+n(local.depthFt)+'" rx="'+n(Math.min(.18,local.widthFt*.05))+'"/>';
    const seating=(chairs.get(item)||[]).map(p=>'<rect transform="translate('+n(p.x)+' '+n(p.y)+') rotate('+n(p.angle*180/Math.PI)+')" x="'+n(-p.width/2)+'" y="'+n(-p.depth/2)+'" width="'+n(p.width)+'" height="'+n(p.depth)+'" rx=".18" fill="#f5f4ef" stroke="#74867b"/>').join('');
    return '<g data-plan-item="'+esc(item.id)+'" stroke-width="'+n(stroke)+'">'+seating+'<g transform="translate('+n(center.x)+' '+n(center.y)+') rotate('+n(a)+')" fill="'+(colors[item.kind]||'#dce0d7')+'" stroke="#4d655a">'+shape+'</g><text x="'+n(center.x)+'" y="'+n(center.y)+'" dy=".35em" font-size="'+n(Math.min(font,Math.max(.5,Math.min(local.widthFt,local.depthFt)*.55)))+'" text-anchor="middle" fill="#233c30">'+(index+1)+'</text></g>';
  }).join('');
  const placement=data.planTentPlacement||{x:0,y:0,rotationDeg:0};
  const tentShape=tent.isSite?'':'<polygon points="'+pts(objectGroundFootprint({x:placement.x,y:placement.y,widthFt:tent.widthFt,depthFt:tent.lengthFt,rotationDeg:placement.rotationDeg}))+'" fill="#fcfbf7" stroke="#607b6e" stroke-width="'+n(stroke*2)+'"/>';
  const a=(Number(placement.rotationDeg)||0)*Math.PI/180;
  const tentPoint=p=>{const x=p.x-tent.widthFt/2,y=p.y-tent.lengthFt/2;return {x:placement.x+tent.widthFt/2+x*Math.cos(a)-y*Math.sin(a),y:placement.y+tent.lengthFt/2+x*Math.sin(a)+y*Math.cos(a)};};
  const poles=tent.isSite?'':(tent.centerPoles||[]).map(p=>{const center=tentPoint(p);return '<circle cx="'+n(center.x)+'" cy="'+n(center.y)+'" r="'+n(Math.max(.18,stroke*2))+'" fill="#627064"><title>Tent center pole</title></circle>';}).join('');
  const sidewalls=tent.isSite?'':(data.sidewalls||[]).map(wall=>{
    if(!['solid','window'].includes(wall.type))return '';const start=Number(wall.startFt)||0,end=start+(Number(wall.lengthFt)||10);
    const points=wall.side==='front'?[{x:start,y:0},{x:end,y:0}]:wall.side==='back'?[{x:start,y:tent.lengthFt},{x:end,y:tent.lengthFt}]:wall.side==='left'?[{x:0,y:start},{x:0,y:end}]:wall.side==='right'?[{x:tent.widthFt,y:start},{x:tent.widthFt,y:end}]:[];
    return points.length?'<polyline points="'+pts(points.map(tentPoint))+'" fill="none" stroke="#455f52" stroke-width="'+n(stroke*3)+'"'+(wall.type==='window'?' stroke-dasharray=".7 .3"':'')+'><title>'+esc(wall.type)+' sidewall</title></polyline>':'';
  }).join('');
  const obstacles=(data.photoGeometry||[]).map(item=>'<polygon points="'+pts(objectGroundFootprint(item))+'" fill="#dde0d8" fill-opacity=".8" stroke="#8c9688" stroke-dasharray=".4 .3" stroke-width="'+n(stroke)+'"><title>'+esc(item.type||'Site obstacle')+'</title></polygon>').join('');
  const aisles=(data.aisles||[]).map(item=>'<polygon points="'+pts(objectGroundFootprint({...item,widthFt:item.widthFt||item.width,depthFt:item.depthFt||item.depth}))+'" fill="#d9e9df" stroke="#739884" stroke-dasharray=".6 .4" stroke-width="'+n(stroke)+'"><title>Reserved walkway</title></polygon>').join('');
  const vx=minX-pad,vy=minY-pad,vw=maxX-minX+pad*2,vh=maxY-minY+pad*2;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.max(1,Math.round(2400*vw/Math.max(vw,vh)))+'" height="'+Math.max(1,Math.round(2400*vh/Math.max(vw,vh)))+'" viewBox="'+[vx,vy,vw,vh].map(n).join(' ')+'" role="img" aria-label="Event floor plan" font-family="Arial, sans-serif"><rect x="'+n(vx)+'" y="'+n(vy)+'" width="'+n(vw)+'" height="'+n(vh)+'" fill="#fbfcf9"/><rect x="0" y="0" width="'+n(width)+'" height="'+n(depth)+'" fill="#eef2eb" stroke="#cbd6cc" stroke-width="'+n(stroke)+'"/>'+tentShape+obstacles+aisles+planItems+poles+sidewalls+'<g fill="#52675b" font-size="'+n(font)+'"><text x="'+n(width/2)+'" y="'+n(-pad*.42)+'" text-anchor="middle">'+n(width)+' ft</text><text transform="translate('+n(-pad*.45)+' '+n(depth/2)+') rotate(-90)" text-anchor="middle">'+n(depth)+' ft</text><text x="'+n(width/2)+'" y="'+n(depth+pad*.6)+'" text-anchor="middle">PLAN FRONT · dimensions in feet</text></g></svg>';
  return {svg,labels,widthFt:width,lengthFt:depth,estimated:!!data.photoSitePlan};
}
