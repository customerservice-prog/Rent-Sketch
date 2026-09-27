import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../js/core/scan-navigation.js',import.meta.url),'utf8');
const {scanNavigationPolicy}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('depth preview exposes accepted reference positions and never invents an orbit cone',()=>{
  const policy=scanNavigationPolicy({origin:{x:0,y:5.6,z:-38},references:[{referenceIndex:2,offsetFt:0},{referenceIndex:0,offsetFt:-2.1},{referenceIndex:4,offsetFt:3.9,accepted:false},{referenceIndex:0,offsetFt:-2.1}]});
  assert.equal(policy.allowOrbit,false);assert.equal(policy.allowFreeWalk,false);assert.equal(policy.allowPan,false);assert.equal(policy.metric,false);
  assert.equal(policy.frames.length,2);assert.deepEqual(policy.frames[0].position,{x:-2.1,y:5.6,z:-38});assert.equal(policy.initialFrameIndex,2);
  assert.equal('captureConeDeg' in policy,false);assert.ok(policy.unresolvedAxes.includes('yaw'));
});
test('empty or malformed reference data never enables navigation',()=>{
  const policy=scanNavigationPolicy({references:[{referenceIndex:'bad',offsetFt:4},{referenceIndex:1,offsetFt:Infinity}]});
  assert.equal(policy.frames.length,0);assert.equal(policy.initialFrameIndex,null);assert.equal(policy.allowFreeWalk,false);
});
