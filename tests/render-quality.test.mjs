import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderQuality } from '../js/core/render-quality.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
function feed(quality,count,ms){const changes=[];for(let i=0;i<count;i++){const result=quality.sample(ms);if(result!==null)changes.push(result);}return changes;}

test('resolution responds to sustained render cost rather than one slow frame or invalid timing',()=>{
  const quality=createRenderQuality({maxRatio:1.5,minRatio:1});
  near(quality.ratio,1.5);
  assert.equal(quality.sample(10000),null,'one stalled frame cannot immediately change resolution');
  assert.deepEqual(feed(quality,89,4),[],'a capped outlier among fast renders cannot force a downgrade');
  assert.deepEqual(feed(quality,89,35),[],'pressure must fill a complete observation window');
  for(const invalid of [NaN,Infinity,-1,undefined,'35'])assert.equal(quality.sample(invalid),null);
  near(quality.ratio,1.5);
  near(quality.sample(35),1.3);
  near(quality.ratio,1.3);
});

test('sustained pressure decreases resolution in steps and stops at the configured floor',()=>{
  const quality=createRenderQuality({maxRatio:1.5,minRatio:1});
  const changes=feed(quality,90*8,45);
  assert.equal(changes.length,3);[1.3,1.1,1].forEach((value,index)=>near(changes[index],value));
  near(quality.ratio,1);
  assert.deepEqual(feed(quality,90,100),[],'no repeated resize once the floor is reached');
});

test('resolution recovery needs four consecutive fast windows and mixed workloads reset recovery',()=>{
  const quality=createRenderQuality({maxRatio:2,minRatio:1});
  feed(quality,90*2,35);near(quality.ratio,1.6);
  assert.deepEqual(feed(quality,90*3,5),[],'three fast windows cannot undo a downgrade');
  assert.deepEqual(feed(quality,90,16),[],'normal rendering breaks a recovery streak');
  assert.deepEqual(feed(quality,90*3,5),[],'recovery must build a new sustained fast streak');
  const recovered=feed(quality,90,5);assert.equal(recovered.length,1);near(recovered[0],1.7);
  const slowed=feed(quality,90,25);assert.equal(slowed.length,1,'renewed slow rendering reduces quality promptly');near(slowed[0],1.5);
  assert.deepEqual(feed(quality,90*3,5),[],'slow rendering also clears the recovery streak');
  near(feed(quality,90,5)[0],1.6);
  feed(quality,90*4*20,5);near(quality.ratio,2);
  assert.deepEqual(feed(quality,90*4,5),[],'recovery never exceeds the device resolution cap');
});

test('threshold-adjacent render costs do not oscillate resolution',()=>{
  const quality=createRenderQuality({maxRatio:1.5,minRatio:1});
  const changes=[];
  for(let i=0;i<90*8;i++){const changed=quality.sample(i%2?25:23);if(changed!==null)changes.push(changed);}
  assert.deepEqual(changes,[]);near(quality.ratio,1.5);
});
