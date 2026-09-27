import path from 'node:path';
import {readFile} from 'node:fs/promises';

const models={SIMPLE_PINHOLE:3,PINHOLE:4,SIMPLE_RADIAL:4,RADIAL:5,OPENCV:8};
const finite=(value,label)=>{const n=Number(value);if(!Number.isFinite(n))throw new Error(`${label} must be finite.`);return n;};
const integer=(value,label)=>{const n=finite(value,label);if(!Number.isSafeInteger(n)||n<0)throw new Error(`${label} must be a nonnegative integer.`);return n;};
const positive=(value,label)=>{const n=finite(value,label);if(n<=0)throw new Error(`${label} must be positive.`);return n;};
const unique=(map,id,value,label)=>{if(map.has(id))throw new Error(`Duplicate ${label} ${id}.`);map.set(id,value);};
const pairKey=ids=>[...ids].sort((a,b)=>a-b).join(':');
function safeImageName(name){if(!name||name.includes('\\')||path.posix.isAbsolute(name)||name.split('/').some(part=>part==='..'||part==='.')||/[\x00-\x1f]/.test(name))throw new Error('Invalid image name in reconstruction.');return name;}
function segment(value,label){
  if(!value||!Array.isArray(value.pointIds)||value.pointIds.length!==2)throw new Error(`${label} needs two sparse point IDs.`);
  const pointIds=value.pointIds.map(id=>integer(id,`${label} point ID`));if(pointIds[0]===pointIds[1])throw new Error(`${label} needs distinct points.`);
  return {id:String(value.id||label),pointIds,distanceFt:positive(value.distanceFt,`${label} measured distance`)};
}
export function validateJob(value){
  if(value?.version!==1||!/^[a-zA-Z0-9_-]{1,80}$/.test(value.jobId||''))throw new Error('Job needs version 1 and a safe jobId.');
  if(typeof value.imagesDirectory!=='string'||!value.imagesDirectory.trim())throw new Error('Job needs imagesDirectory.');
  const cameraModel=value.cameraModel||'SIMPLE_RADIAL';if(!(cameraModel in models))throw new Error('Unsupported camera model.');
  const scale=value.scale?segment(value.scale,'scale'):null;
  const checks=(value.checks||[]).map((check,i)=>segment(check,`check-${i+1}`));
  const keys=new Set();
  for(const check of checks){const key=pairKey(check.pointIds);if(keys.has(key)||scale&&key===pairKey(scale.pointIds))throw new Error('Independent checks cannot reuse the scale segment or another check.');keys.add(key);}
  if(checks.length&&!scale)throw new Error('A separate scale segment is required before physical checks.');
  return {version:1,jobId:value.jobId,imagesDirectory:value.imagesDirectory,cameraModel,singleCamera:value.singleCamera!==false,
    matching:value.matching==='exhaustive'?'exhaustive':'sequential',scale,checks};
}
export function parseCameras(text){
  const out=new Map();
  for(const line of text.split(/\r?\n/)){const trimmed=line.trim();if(!trimmed||trimmed.startsWith('#'))continue;const [id,model,width,height,...params]=trimmed.split(/\s+/);
    if(!(model in models)||params.length!==models[model])throw new Error(`Unsupported or malformed camera ${id}.`);
    const camera={id:integer(id,'camera ID'),model,width:positive(width,'image width'),height:positive(height,'image height'),params:params.map(v=>finite(v,'camera parameter'))};
    if(!Number.isInteger(camera.width)||!Number.isInteger(camera.height)||camera.params[0]<=0||['PINHOLE','OPENCV'].includes(model)&&camera.params[1]<=0)throw new Error('Invalid camera dimensions or focal length.');
    unique(out,camera.id,camera,'camera');
  }
  if(!out.size)throw new Error('No calibrated cameras in model.');return out;
}
function rotation(q){const [w,x,y,z]=q;return [1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y];}
export function parseImages(text,cameras){
  const out=new Map(),lines=text.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();if(!line||line.startsWith('#'))continue;
    const values=line.split(/\s+/);if(values.length<10)throw new Error('Malformed image pose.');
    const id=integer(values[0],'image ID'),q=values.slice(1,5).map(v=>finite(v,'camera quaternion')),t=values.slice(5,8).map(v=>finite(v,'camera translation'));
    const length=Math.hypot(...q);if(Math.abs(length-1)>.001)throw new Error('Camera quaternion is not normalized.');
    const cameraId=integer(values[8],'camera ID');if(!cameras.has(cameraId))throw new Error('Image references an unknown camera.');
    const r=rotation(q.map(v=>v/length)),center=[0,1,2].map(axis=>-(r[axis]*t[0]+r[3+axis]*t[1]+r[6+axis]*t[2]));
    do{i++;}while(i<lines.length&&lines[i].trim().startsWith('#'));
    if(i>=lines.length)throw new Error('Image is missing its observation line.');
    const observationText=lines[i].trim(),tokens=observationText?observationText.split(/\s+/):[];
    if(tokens.length%3)throw new Error('Malformed image observations.');
    const observations=[];for(let j=0;j<tokens.length;j+=3){const pointId=finite(tokens[j+2],'observation point ID');if(!Number.isSafeInteger(pointId)||pointId< -1)throw new Error('Invalid observation point ID.');observations.push({xy:[finite(tokens[j],'observation x'),finite(tokens[j+1],'observation y')],pointId});}
    unique(out,id,{id,cameraId,name:safeImageName(values.slice(9).join(' ')),quaternionWxyz:q,worldToCameraRotation:r,worldToCameraTranslation:t,center,observations},'image');
  }
  if(out.size<3)throw new Error('At least three registered image poses are required.');return out;
}
export function parsePoints(text,images){
  const out=new Map();
  for(const line of text.split(/\r?\n/)){const trimmed=line.trim();if(!trimmed||trimmed.startsWith('#'))continue;const v=trimmed.split(/\s+/);if(v.length<12||(v.length-8)%2)throw new Error('Each point needs at least two track observations.');
    const id=integer(v[0],'point ID'),xyz=v.slice(1,4).map(n=>finite(n,'point coordinate')),rgb=v.slice(4,7).map(n=>integer(n,'point color'));
    if(rgb.some(n=>n>255))throw new Error('Point color outside 0–255.');
    const errorPx=finite(v[7],'point reprojection error');if(errorPx<0)throw new Error('Negative reprojection error.');
    const track=[],seenImages=new Set();for(let i=8;i<v.length;i+=2){const imageId=integer(v[i],'track image ID'),pointIndex=integer(v[i+1],'track observation index'),image=images.get(imageId);
      if(!image||image.observations[pointIndex]?.pointId!==id||seenImages.has(imageId))throw new Error('Point track does not match its image observations.');seenImages.add(imageId);track.push({imageId,pointIndex});}
    unique(out,id,{id,xyz,rgb,errorPx,track},'point');
  }
  if(!out.size)throw new Error('No supported sparse points in model.');
  for(const image of images.values())for(const [index,observation] of image.observations.entries())if(observation.pointId!==-1&&!out.get(observation.pointId)?.track.some(t=>t.imageId===image.id&&t.pointIndex===index))throw new Error('Image observation is absent from its point track.');
  return out;
}
function distance(points,ids){const a=points.get(ids[0]),b=points.get(ids[1]);if(!a||!b)throw new Error('A scale/check point ID is absent from the reconstruction.');return Math.hypot(...a.xyz.map((v,i)=>v-b.xyz[i]));}
function project(camera,image,point){
  const r=image.worldToCameraRotation,t=image.worldToCameraTranslation,p=point.xyz;
  const [X,Y,Z]=[0,1,2].map(axis=>r[axis*3]*p[0]+r[axis*3+1]*p[1]+r[axis*3+2]*p[2]+t[axis]);
  if(Z<=0)throw new Error('A tracked point lies behind its observing camera.');
  let x=X/Z,y=Y/Z;const a=camera.params,simple=camera.model.startsWith('SIMPLE')||camera.model==='RADIAL';
  const fx=a[0],fy=simple?a[0]:a[1],cx=simple?a[1]:a[2],cy=simple?a[2]:a[3],r2=x*x+y*y;
  if(camera.model==='SIMPLE_RADIAL'||camera.model==='RADIAL'){const radial=1+a[3]*r2+(camera.model==='RADIAL'?a[4]*r2*r2:0);x*=radial;y*=radial;}
  else if(camera.model==='OPENCV'){const radial=1+a[4]*r2+a[5]*r2*r2,xx=x*radial+2*a[6]*x*y+a[7]*(r2+2*x*x),yy=y*radial+a[6]*(r2+2*y*y)+2*a[7]*x*y;x=xx;y=yy;}
  return [fx*x+cx,fy*y+cy];
}
export function buildArtifact(jobValue,{camerasText,imagesText,pointsText,sourceImages=[],createdAt=new Date().toISOString(),dense=null}={}){
  const job=validateJob(jobValue),cameras=parseCameras(camerasText),images=parseImages(imagesText,cameras),points=parsePoints(pointsText,images);
  const reprojections=[];
  for(const point of points.values()){
    const residuals=point.track.map(track=>{const image=images.get(track.imageId),uv=project(cameras.get(image.cameraId),image,point),observed=image.observations[track.pointIndex].xy;return Math.hypot(uv[0]-observed[0],uv[1]-observed[1]);});
    point.recomputedErrorPx=residuals.reduce((sum,value)=>sum+value,0)/residuals.length;reprojections.push(...residuals);
  }
  let scaleFactor=1;if(job.scale){const measured=distance(points,job.scale.pointIds);if(measured<1e-8)throw new Error('Scale points are coincident in reconstruction.');scaleFactor=job.scale.distanceFt/measured;}
  const checks=job.checks.map(check=>{const predictedFt=distance(points,check.pointIds)*scaleFactor,residualFt=predictedFt-check.distanceFt,toleranceFt=Math.max(.25,.05*check.distanceFt);return {...check,predictedFt,residualFt,toleranceFt,status:Math.abs(residualFt)<=toleranceFt?'within-tolerance':'failed',scope:'held-out-segment-only'};});
  const errors=reprojections.sort((a,b)=>a-b),scale=v=>v.map(n=>n*scaleFactor);
  return {schema:'rentsketch.captured-venue',version:1,jobId:job.jobId,createdAt,status:'reconstructed-unreviewed',
    coordinateSystem:{convention:'COLMAP right-handed world; cameras look +Z with image +Y down',units:job.scale?'feet':'arbitrary',groundAlignment:'unresolved',scaleFactor},
    provenance:{method:'self-hosted COLMAP SfM',sourceImages,scale:job.scale,checksUsedForFitting:false,unseenSurfaces:'unknown'},
    cameras:[...cameras.values()],views:[...images.values()].map(image=>({id:image.id,cameraId:image.cameraId,name:image.name,quaternionWxyz:image.quaternionWxyz,worldToCameraTranslation:scale(image.worldToCameraTranslation),position:scale(image.center),observationCount:image.observations.filter(p=>p.pointId!==-1).length})),
    points:[...points.values()].map(point=>({id:point.id,position:scale(point.xyz),rgb:point.rgb,reprojectionErrorPx:point.recomputedErrorPx,colmapReportedErrorPx:point.errorPx,observedBy:point.track.map(t=>t.imageId)})),
    evidence:{registeredImages:images.size,sparsePoints:points.size,reprojectionSource:'recomputed from camera intrinsics, poses and observed image coordinates',medianReprojectionErrorPx:errors[Math.floor(errors.length/2)],maxReprojectionErrorPx:errors.at(-1),independentChecks:checks,coverage:'sparse observations only; no whole-property coverage assertion'},dense,
    releaseGate:{eligibleForCustomerNavigation:false,siteDimensionsVerified:false,mayClaimMetricAccuracy:false,reasons:[...(!job.scale?['Physical scale has not been established.']:[]),...(checks.some(c=>c.status==='failed')?['An independent physical check failed.']:[]),'Ground alignment, surface coverage, novel-view quality and representative field performance require review.']}};
}
export async function readTextModel(directory){const [camerasText,imagesText,pointsText]=await Promise.all(['cameras.txt','images.txt','points3D.txt'].map(file=>readFile(path.join(directory,file),'utf8')));return {camerasText,imagesText,pointsText};}
