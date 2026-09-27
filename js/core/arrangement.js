import { objectGroundFootprint } from './world-space.js';

const number=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(label+' must be a finite number.');return value;};
const clone=value=>Array.isArray(value)?value.map(clone):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clone(item)])):value;
function bounds(item){
  for(const key of ['x','y','widthFt'])number(item[key],key);
  const depth=item.depthFt??item.lengthFt;number(depth,'depthFt');
  if(item.widthFt<=0||depth<=0)throw new RangeError('Rental dimensions must be greater than zero.');
  for(const key of ['modelWidthFt','modelDepthFt'])if(item[key]!=null&&(number(item[key],key)<=0))throw new RangeError('Model dimensions must be greater than zero.');
  if(item.rotationDeg!=null)number(item.rotationDeg,'rotationDeg');
  const points=objectGroundFootprint(item);
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}
function enclosing(items){const boxes=items.map(bounds);return {left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))};}
function requireAxis(axis){if(axis!=='x'&&axis!=='y')throw new TypeError('Choose a horizontal or vertical direction.');return axis;}
function shift(item,dx,dy){return {...item,x:item.x+dx,y:item.y+dy};}

/** Atomic, immutable arrangement in layout feet. No scaling, price changes,
 * inferred operating clearances, or random IDs. Photo callers must supply
 * world-normalized positions and map the returned coordinates to photoPlacement.
 */
export function arrangeObjects(objects,space,request={}){
  if(!Array.isArray(objects))throw new TypeError('The layout is unavailable.');
  const width=number(space?.widthFt,'Space width'),depth=number(space?.lengthFt,'Space depth');
  if(width<=0||depth<=0)throw new RangeError('The planning space needs valid dimensions.');
  if(!Array.isArray(request.ids)||!request.ids.length)throw new Error('Select rentals to arrange.');
  const ids=new Set(request.ids);
  if(ids.size!==request.ids.length||request.ids.some(id=>typeof id!=='string'||!id))throw new Error('The rental selection is invalid.');
  const existing=new Set();for(const item of objects){if(typeof item?.id!=='string'||!item.id||existing.has(item.id))throw new Error('The layout contains an invalid rental identity.');existing.add(item.id);}
  if([...ids].some(id=>!existing.has(id)))throw new Error('A selected rental is no longer in this layout. Refresh the selection.');
  const selected=objects.filter(item=>ids.has(item.id));selected.forEach(bounds);
  const floors=objects.filter(item=>item.kind==='dance'),selectedFloor=selected.filter(item=>item.kind==='dance');
  if(selectedFloor.length&&selectedFloor.length!==floors.length)throw new Error('Select the whole dance floor so its sections stay connected.');
  const units=selected.filter(item=>item.kind!=='dance').map(item=>[item]);if(selectedFloor.length)units.push(selectedFloor);
  const group=enclosing(selected),changed=new Map(),added=[];
  const shiftUnit=(members,dx,dy)=>{for(const item of members)changed.set(item.id,shift(item,dx,dy));};
  if(request.action==='align'){
    if(units.length<2)throw new Error('Select at least two rentals to align. The dance floor counts as one.');
    if(!['left','center-x','right','top','center-y','bottom'].includes(request.edge))throw new TypeError('Choose an alignment edge.');
    for(const members of units){const b=enclosing(members);let dx=0,dy=0;
      if(request.edge==='left')dx=group.left-b.left;
      if(request.edge==='right')dx=group.right-b.right;
      if(request.edge==='center-x')dx=(group.left+group.right-b.left-b.right)/2;
      if(request.edge==='top')dy=group.top-b.top;
      if(request.edge==='bottom')dy=group.bottom-b.bottom;
      if(request.edge==='center-y')dy=(group.top+group.bottom-b.top-b.bottom)/2;
      shiftUnit(members,dx,dy);
    }
  }else if(request.action==='distribute'){
    const axis=requireAxis(request.axis),start=axis==='x'?'left':'top',end=axis==='x'?'right':'bottom';
    if(units.length<3)throw new Error('Select at least three rentals for equal spacing. The dance floor counts as one.');
    const ordered=units.map(members=>({members,box:enclosing(members)})).sort((a,b)=>a.box[start]-b.box[start]);
    const occupied=ordered.reduce((sum,{box})=>sum+box[end]-box[start],0),gap=(group[end]-group[start]-occupied)/(ordered.length-1);
    if(gap<-.000001)throw new RangeError('There is not enough room between the outer rentals. Move them farther apart first.');
    let cursor=group[start];
    for(const {members,box} of ordered){const delta=cursor-box[start];shiftUnit(members,axis==='x'?delta:0,axis==='y'?delta:0);cursor+=box[end]-box[start]+Math.max(0,gap);}
  }else if(request.action==='move'){
    const dx=number(request.dx,'Horizontal move'),dy=number(request.dy,'Vertical move');
    for(const item of selected)changed.set(item.id,shift(item,dx,dy));
  }else if(request.action==='duplicate'){
    const axis=requireAxis(request.axis),copies=number(request.copies,'Additional copies'),gap=number(request.gapFt,'Gap');
    if(!Number.isInteger(copies)||copies<1||copies>20)throw new RangeError('Choose 1 to 20 additional copies.');
    if(gap<0)throw new RangeError('The gap cannot be negative.');
    if(objects.length+copies*selected.length>5000)throw new RangeError('This would exceed 5,000 placed rentals. Duplicate fewer items.');
    const newIds=request.newIds;
    if(!Array.isArray(newIds)||newIds.length!==copies*selected.length||new Set(newIds).size!==newIds.length||newIds.some(id=>typeof id!=='string'||!id||existing.has(id)))throw new Error('New rentals need unique identities. Try again.');
    const distance=(axis==='x'?group.right-group.left:group.bottom-group.top)+gap;
    for(let copy=1;copy<=copies;copy++)for(const item of selected){const duplicate=shift(clone(item),axis==='x'?distance*copy:0,axis==='y'?distance*copy:0);duplicate.id=newIds[added.length];added.push(duplicate);}
  }else throw new TypeError('Choose an arrangement action.');
  for(const item of [...changed.values(),...added]){const b=bounds(item);if(b.left<-.000001||b.top<-.000001||b.right>width+.000001||b.bottom>depth+.000001)throw new RangeError('That arrangement extends outside the planning space. Use a smaller move, fewer copies, or a smaller gap.');}
  const next=objects.map(item=>changed.get(item.id)||item).concat(added);
  return {objects:next,selectedIds:added.length?added.map(item=>item.id):selected.map(item=>item.id),addedIds:added.map(item=>item.id)};
}
