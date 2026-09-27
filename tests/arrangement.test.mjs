import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeObjects } from '../js/core/arrangement.js';
import { objectGroundFootprint } from '../js/core/world-space.js';
import { createLayoutStore } from '../js/core/layoutStore.js';
const space={widthFt:60,lengthFt:50};
const rental=(id,x,y,w=4,d=3)=>({id,kind:'table',tableId:'real-sku-'+id,productId:'sku-'+id,x,y,widthFt:w,depthFt:d,modelWidthFt:w,modelDepthFt:d,footprintOriented:true,rotationDeg:0,seatCount:6,tabletop:[{productId:'napkin',qty:6}]});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const physical=item=>{const p=objectGroundFootprint(item);return {left:Math.min(...p.map(q=>q.x)),right:Math.max(...p.map(q=>q.x)),top:Math.min(...p.map(q=>q.y)),bottom:Math.max(...p.map(q=>q.y))};};
const unchangedGeometry=(before,after)=>{for(const key of ['id','productId','tableId','widthFt','depthFt','modelWidthFt','modelDepthFt','rotationDeg','seatCount','tabletop'])assert.deepEqual(after[key],before[key]);};
test('all six alignments use physical edges with unequal dimensions and preserve metadata',()=>{
 const objects=[rental('a',2,3,6,2),rental('b',15,16,2,8),rental('c',33,28,4,4)],before=JSON.stringify(objects);
 for(const edge of ['left','center-x','right','top','center-y','bottom']){
  const result=arrangeObjects(objects,space,{ids:['a','b','c'],action:'align',edge});
  const values=result.objects.map(item=>{const b=physical(item);return edge==='center-x'?(b.left+b.right)/2:edge==='center-y'?(b.top+b.bottom)/2:b[edge];});
  values.forEach(value=>near(value,values[0]));result.objects.forEach((item,i)=>unchangedGeometry(objects[i],item));
 }
 assert.equal(JSON.stringify(objects),before);
});
test('equal spacing respects unequal widths, preserves outside edges, and accepts rotated physical footprints',()=>{
 const objects=[rental('a',2,3,2,2),rental('b',8,5,6,3),rental('c',27,3,4,4)];objects[1].rotationDeg=45;
 const before=objects.map(physical),result=arrangeObjects(objects,space,{ids:['a','b','c'],action:'distribute',axis:'x'}),after=result.objects.map(physical);
 near(after[0].left,before[0].left);near(after[2].right,before[2].right);near(after[1].left-after[0].right,after[2].left-after[1].right);
 result.objects.forEach((item,i)=>{unchangedGeometry(objects[i],item);near(item.y,objects[i].y);});
});
test('vertical equal gaps and group offsets preserve relative positions',()=>{
 const objects=[rental('a',2,2,2,2),rental('b',8,11,3,6),rental('c',12,32,4,4)];
 const evenly=arrangeObjects(objects,space,{ids:['a','b','c'],action:'distribute',axis:'y'}).objects,b=evenly.map(physical);
 near(b[1].top-b[0].bottom,b[2].top-b[1].bottom);
 const moved=arrangeObjects(objects,space,{ids:['a','b'],action:'move',dx:4,dy:2}).objects;
 near(moved[1].x-moved[0].x,objects[1].x-objects[0].x);near(moved[1].y-moved[0].y,objects[1].y-objects[0].y);assert.equal(moved[2],objects[2]);
});
test('duplicate rows use the group extent plus exact gap, deep-copy styling, and supply new identities',()=>{
 const objects=[rental('a',2,4,3,2),rental('b',7,5,2,2)],before=JSON.stringify(objects);
 const result=arrangeObjects(objects,space,{ids:['a','b'],action:'duplicate',axis:'x',copies:2,gapFt:1.5,newIds:['c','d','e','f']});
 assert.equal(result.objects.length,6);assert.deepEqual(result.addedIds,['c','d','e','f']);assert.deepEqual(result.selectedIds,result.addedIds);
 near(result.objects[2].x,10.5);near(result.objects[4].x,19);near(result.objects[3].x-result.objects[2].x,5);
 assert.equal(result.objects[2].productId,objects[0].productId);result.objects[2].tabletop[0].qty=2;assert.equal(objects[0].tabletop[0].qty,6);assert.equal(JSON.stringify(objects),before);
});
test('out-of-space results and overlapping distribution fail atomically',()=>{
 const objects=[rental('a',2,2,8,8),rental('b',3,3,8,8),rental('c',4,4,8,8)],before=JSON.stringify(objects);
 assert.throws(()=>arrangeObjects(objects,space,{ids:['a'],action:'move',dx:-3,dy:0}),/outside/);
 assert.throws(()=>arrangeObjects(objects,space,{ids:['a'],action:'duplicate',axis:'x',copies:8,gapFt:1,newIds:Array.from({length:8},(_,i)=>'copy'+i)}),/outside/);
 assert.throws(()=>arrangeObjects(objects,space,{ids:['a','b','c'],action:'distribute',axis:'x'}),/not enough room/);
 assert.equal(JSON.stringify(objects),before);
});
test('unknown or repeated IDs, invalid numbers, dimensions, axes and duplicate identities are rejected',()=>{
 const objects=[rental('a',2,2),rental('b',12,2)];
 for(const ids of [[],['missing'],['a','a'],[1]])assert.throws(()=>arrangeObjects(objects,space,{ids,action:'move',dx:1,dy:0}));
 assert.throws(()=>arrangeObjects(objects,space,{ids:['a'],action:'move',dx:NaN,dy:0}));
 assert.throws(()=>arrangeObjects([{...objects[0],widthFt:0}],space,{ids:['a'],action:'move',dx:1,dy:0}));
 assert.throws(()=>arrangeObjects(objects,space,{ids:['a'],action:'duplicate',axis:'z',copies:1,gapFt:1,newIds:['c']}));
 assert.throws(()=>arrangeObjects(objects,space,{ids:['a'],action:'duplicate',axis:'x',copies:1,gapFt:1,newIds:['b']}));
 assert.throws(()=>arrangeObjects(objects,space,{ids:['a'],action:'duplicate',axis:'x',copies:1,gapFt:-1,newIds:['c']}));
});
test('one store replacement makes group movement and duplication one undo action each',()=>{
 const objects=[rental('a',2,2),rental('b',12,4)],store=createLayoutStore({objects,tentId:null,zones:[],aisles:[]});
 const moved=arrangeObjects(store.getState().objects,space,{ids:['a','b'],action:'move',dx:2,dy:2});store.replaceObjects(moved.objects);
 assert.equal(store.canUndo(),true);store.undo();assert.deepEqual(store.getState().objects,objects);assert.equal(store.canUndo(),false);store.redo();assert.deepEqual(store.getState().objects,moved.objects);
});
test('dance floor sections remain one connected unit while aligning or distributing',()=>{
 const a={...rental('floor-a',3,3,3,3),kind:'dance'},b={...rental('floor-b',6,3,3,3),kind:'dance'},c=rental('table',18,12,4,4),d=rental('table-2',35,14,3,3),objects=[a,b,c,d];
 assert.throws(()=>arrangeObjects(objects,space,{ids:['floor-a','table'],action:'align',edge:'left'}),/whole dance floor/);
 const aligned=arrangeObjects(objects,space,{ids:objects.map(item=>item.id),action:'align',edge:'left'}).objects;
 near(aligned[1].x-aligned[0].x,3);near(aligned[1].y-aligned[0].y,0);
 const spaced=arrangeObjects(objects,space,{ids:objects.map(item=>item.id),action:'distribute',axis:'x'}).objects;
 near(spaced[1].x-spaced[0].x,3);near(spaced[1].y-spaced[0].y,0);near(spaced[2].x-(spaced[1].x+3),spaced[3].x-(spaced[2].x+4));
});
