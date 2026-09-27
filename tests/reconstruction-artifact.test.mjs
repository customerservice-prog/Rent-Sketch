import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {buildArtifact,validateJob,readTextModel} from '../scripts/reconstruction/colmap-artifact.mjs';

const fixture=fileURLToPath(new URL('./fixtures/colmap-known-model/',import.meta.url));
const model=await readTextModel(fixture);
const job={version:1,jobId:'known-fixture',imagesDirectory:'images',cameraModel:'PINHOLE',scale:{pointIds:[1,2],distanceFt:6},checks:[{id:'independent',pointIds:[3,4],distanceFt:6}]};
test('COLMAP importer preserves full camera pose, scale provenance and independent checks without publishing',()=>{
  const artifact=buildArtifact(job,model);
  assert.equal(artifact.coordinateSystem.units,'feet');assert.equal(artifact.coordinateSystem.scaleFactor,3);
  assert.deepEqual(artifact.views.map(v=>v.position.map(n=>n===0?0:n)),[[0,0,0],[-3,0,0],[3,0,0]]);
  assert.equal(artifact.evidence.independentChecks[0].status,'within-tolerance');assert.equal(artifact.provenance.checksUsedForFitting,false);
  assert.equal(artifact.releaseGate.eligibleForCustomerNavigation,false);assert.equal(artifact.releaseGate.siteDimensionsVerified,false);
  const wrong=buildArtifact({...job,checks:[{...job.checks[0],distanceFt:8}]},model);
  assert.equal(wrong.evidence.independentChecks[0].status,'failed');assert.deepEqual(wrong.points,artifact.points,'held-out checks never alter geometry');assert.deepEqual(wrong.views,artifact.views);
});
test('unscaled reconstruction remains arbitrary and missing evidence fails closed',()=>{
  const artifact=buildArtifact({...job,scale:null,checks:[]},model);assert.equal(artifact.coordinateSystem.units,'arbitrary');assert.equal(artifact.coordinateSystem.scaleFactor,1);
  assert.throws(()=>validateJob({...job,checks:[{pointIds:[2,1],distanceFt:6}]}),/cannot reuse/);
  assert.throws(()=>buildArtifact({...job,scale:{pointIds:[1,99],distanceFt:6}},model),/absent/);
  assert.throws(()=>buildArtifact(job,{...model,imagesText:model.imagesText.replace('center.png','../private.png')}),/Invalid image name/);
  assert.throws(()=>buildArtifact(job,{...model,imagesText:model.imagesText.replace('1 1 0 0 0 0 0 0','1 2 0 0 0 0 0 0')}),/not normalized/);
  assert.throws(()=>buildArtifact(job,{...model,pointsText:model.pointsText.replace('0 1 0 2 0 3 0','0 1 1 2 0 3 0')}),/does not match/);
});
test('operator CLI imports an actual text model, fingerprints inputs, refuses overwrite, and reports unavailable runtime',async()=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'rentsketch-reconstruction-'));
  try{
    await mkdir(path.join(temp,'images'));
    // Transport-only synthetic pixels: this test verifies artifact import,
    // not COLMAP accuracy or image reconstruction.
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ2kAAAAASUVORK5CYII=','base64');
    for(const name of ['left.png','center.png','right.png'])await writeFile(path.join(temp,'images',name),png);
    const jobPath=path.join(temp,'job.json');await writeFile(jobPath,JSON.stringify(job));
    const cli=fileURLToPath(new URL('../scripts/reconstruct-venue.mjs',import.meta.url)),output=path.join(temp,'output');
    const args=[cli,'--job',jobPath,'--output',output,'--import-model',fixture];
    execFileSync(process.execPath,args,{encoding:'utf8'});
    const artifact=JSON.parse(await readFile(path.join(output,'venue-artifact.json'),'utf8')),state=JSON.parse(await readFile(path.join(output,'job-state.json'),'utf8'));
    assert.equal(state.status,'complete');assert.equal(artifact.provenance.sourceImages.length,3);assert.match(artifact.provenance.sourceImages[0].sha256,/^[a-f0-9]{64}$/);
    assert.throws(()=>execFileSync(process.execPath,args,{stdio:'pipe'}),/new or empty/);
    assert.throws(()=>execFileSync(process.execPath,[cli,'--job',jobPath,'--output',path.join(temp,'without-runtime'),'--colmap',path.join(temp,'missing-colmap')],{stdio:'pipe'}),/COLMAP is unavailable/);
    const plan=JSON.parse(execFileSync(process.execPath,[cli,'--job',jobPath,'--output',path.join(temp,'dry'),'--dry-run'],{encoding:'utf8'}));assert.equal(plan.publishes,false);assert.ok(plan.steps.includes('sparse-reconstruction'));
  }finally{await rm(temp,{recursive:true,force:true});}
});
