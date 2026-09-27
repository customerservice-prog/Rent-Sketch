import test from 'node:test';
import assert from 'node:assert/strict';
import { walkSceneContext } from '../js/core/walk-scene.js';
import { walkPositionBlocked, walkBlockingObstacles } from '../js/core/walk-navigation.js';

// Feed visible renderer coordinates through the controller's origin conversion,
// then the real collision engine. This detects invisible/shifted blockers.
function hit(context,x,z){return walkPositionBlocked({worldX:x-context.site.worldOffsetX,worldZ:z-context.site.worldOffsetZ,site:context.site,items:context.items,photoGeometry:context.obstacles});}
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('ordinary modeled scenes ignore stale photo placements and property obstacles',()=>{
  const source={tent:{widthFt:20,lengthFt:40},photoSite:{widthFt:80,lengthFt:100},
    objects:[{id:'speaker',kind:'equipment',x:5,y:7,widthFt:3,depthFt:4,heightFt:6,rotationDeg:0,photoPlacement:{x:40,y:60,rotationDeg:90}}],
    photoGeometry:[{id:'old-house',x:0,y:0,widthFt:20,depthFt:40}],scanGeometry:[{id:'old-scan',x:0,y:0,widthFt:20,depthFt:40}]};
  const original=structuredClone(source),context=walkSceneContext(source);
  assert.deepEqual(context.site,{widthFt:20,lengthFt:40,worldOffsetX:0,worldOffsetZ:0});
  assert.equal(context.items[0].x,5);assert.equal(context.items[0].y,7);assert.equal(context.items[0].rotationDeg,0);
  assert.equal(context.items[0].photoPlacement,undefined);assert.deepEqual(context.obstacles,[]);
  assert.equal(hit(context,-3.5,-11).blocker?.id,'speaker','the visible speaker blocks the same ground coordinates');
  assert.equal(hit(context,5,10).blocked,false,'stale property obstacles cannot block the modeled yard');
  assert.deepEqual(source,original,'constructing walk context never rewrites the saved scene');
});

test('enlarged ordinary planning areas retain the tent-centered renderer origin and full yard bounds',()=>{
  const context=walkSceneContext({tent:{widthFt:20,lengthFt:40,planningArea:{widthFt:70,lengthFt:90}},objects:[{id:'slide',kind:'inflatable',x:40,y:50,widthFt:6,depthFt:8,heightFt:12}]});
  assert.deepEqual(context.site,{widthFt:70,lengthFt:90,worldOffsetX:25,worldOffsetZ:25});
  // Layout center(43,54), rendered against the tent center(10,20), is(33,34).
  assert.equal(hit(context,33,34).blocker?.id,'slide');
  assert.equal(hit(context,20,20).blocked,false,'a visible point beyond the tent remains walkable inside the larger yard');
  assert.equal(hit(context,59.5,20).reason,'outside_site','the right yard boundary stays at renderer x=60, including body clearance');
  assert.equal(hit(context,-9.5,20).reason,'outside_site','the left yard boundary stays at renderer x=-10');
  assert.equal(hit(context,0,0).blocked,false,'the old tent origin does not acquire a shifted invisible blocker');
});

test('photo layouts map tent-local rentals into the same rotated site space used by visible meshes',()=>{
  const source={photoMode:true,tent:{widthFt:20,lengthFt:40},photoSite:{widthFt:80,lengthFt:100},photoTentPlacement:{x:20,y:30,rotationDeg:90},
    objects:[{id:'speaker',kind:'equipment',x:2,y:4,widthFt:4,depthFt:6,heightFt:5,rotationDeg:0}],
    photoGeometry:[{id:'wall',type:'fence',x:10,y:10,widthFt:2,depthFt:8}],scanGeometry:[{id:'scan-tree',type:'tree',x:65,y:70,widthFt:4,depthFt:4}]};
  const original=structuredClone(source),context=walkSceneContext(source),item=context.items[0];
  assert.equal(context.site.worldOffsetX,0);assert.equal(context.site.worldOffsetZ,0);
  // Original center(4,7) relative to tent center(10,20) =>(-6,-13).
  // Turn90 =>(13,-6), add site tent center(30,50) =>(43,44).
  near(item.x,41);near(item.y,41);near(item.rotationDeg,90);
  assert.equal(hit(context,3,-6).blocker?.id,'speaker');
  assert.equal(hit(context,-29,-36).blocker?.id,'wall');
  assert.equal(hit(context,27,22).blocker?.id,'scan-tree');
  assert.deepEqual(context.obstacles.map(o=>o.id),['wall','scan-tree']);
  assert.deepEqual(source,original);
});

test('explicit photo placement preserves legacy local dimensions before replacing its orientation',()=>{
  const source={photoMode:true,photoLayoutModel:true,tent:{widthFt:20,lengthFt:40},photoSite:{widthFt:80,lengthFt:100},
    objects:[{id:'legacy-service',kind:'accessory',x:3,y:4,widthFt:2,depthFt:6,heightFt:3,rotationDeg:90,photoPlacement:{x:30,y:40,rotationDeg:0}}]};
  const original=structuredClone(source),context=walkSceneContext(source),item=context.items[0];
  assert.equal(item.x,30);assert.equal(item.y,40);assert.equal(item.rotationDeg,0);
  assert.equal(item.modelWidthFt,6);assert.equal(item.modelDepthFt,2);assert.equal(item.photoPlacement,undefined);
  const polygon=walkBlockingObstacles({items:context.items})[0].polygon;
  near(Math.max(...polygon.map(p=>p.x))-Math.min(...polygon.map(p=>p.x)),6);
  near(Math.max(...polygon.map(p=>p.y))-Math.min(...polygon.map(p=>p.y)),2);
  assert.equal(hit(context,-9,-7).blocker?.id,'legacy-service','neutral photo-layout model retains the same world placement');
  assert.deepEqual(source,original);
});
