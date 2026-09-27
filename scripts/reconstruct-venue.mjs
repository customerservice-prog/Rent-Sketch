#!/usr/bin/env node
// Explicit operator-run reconstruction. This tool is not an upload endpoint and
// never publishes a model or enables customer navigation automatically.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {readFile,writeFile,readdir,mkdir,copyFile,rename} from 'node:fs/promises';
import {validateJob,readTextModel,buildArtifact} from './reconstruction/colmap-artifact.mjs';

const HELP=`RentSketch self-hosted venue reconstruction

node scripts/reconstruct-venue.mjs --job job.json --output /new/job-directory [--colmap /path/to/colmap] [--dense]
node scripts/reconstruct-venue.mjs --job job.json --output /new/job-directory --import-model /existing/COLMAP-text-model
node scripts/reconstruct-venue.mjs --job job.json --output /new/job-directory --dry-run

Input: at least three JPG/PNG photos in imagesDirectory, a version-1 job file.
Sparse processing runs locally with COLMAP. --dense also requires COLMAP's
dense stereo runtime/GPU. --import-model validates existing COLMAP text output.
The resulting artifact is unreviewed and cannot certify property dimensions.
No external reconstruction API is used. No assets are published automatically.
`;
function argumentsFor(argv){const args={};for(let i=0;i<argv.length;i++){const key=argv[i];if(['--help','--dry-run','--dense'].includes(key)){args[key.slice(2)]=true;continue;}if(!['--job','--output','--colmap','--import-model'].includes(key)||!argv[i+1]||argv[i+1].startsWith('--'))throw new Error(`Unknown or incomplete argument: ${key}`);args[key.slice(2)]=argv[++i];}return args;}
async function imagesIn(directory,prefix=''){
  const entries=await readdir(path.join(directory,prefix),{withFileTypes:true}),images=[];
  for(const entry of entries){const name=path.posix.join(prefix,entry.name);if(entry.isSymbolicLink())throw new Error('Image folders cannot contain symbolic links.');if(entry.isDirectory())images.push(...await imagesIn(directory,name));else if(entry.isFile()&&/\.(png|jpe?g)$/i.test(name))images.push(name);}
  return images.sort();
}
async function fingerprint(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function atomicJson(file,value){const temp=file+'.tmp';await writeFile(temp,JSON.stringify(value,null,2)+'\n');await rename(temp,file);}
function gpuOption(help,stage){const names=stage==='extract'?['FeatureExtraction','SiftExtraction']:['FeatureMatching','SiftMatching'];const namespace=names.find(name=>help.includes(name+'.use_gpu'));if(!namespace)throw new Error('This COLMAP build has unknown GPU options. Use a supported build or import its text model.');return '--'+namespace+'.use_gpu';}
function probe(binary,command){const result=spawnSync(binary,[command,'-h'],{encoding:'utf8',timeout:15000,maxBuffer:8*1024*1024});if(result.error)throw new Error(`COLMAP is unavailable: ${result.error.message}. Install it locally or use --import-model.`);return String(result.stdout||'')+String(result.stderr||'');}
async function execute(binary,args,logFile){
  await new Promise((resolve,reject)=>{
    const log=createWriteStream(logFile,{flags:'a'}),child=spawn(binary,args,{stdio:['ignore','pipe','pipe'],shell:false});let tail='',expired=false,killTimer;
    for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log.write(chunk);tail=(tail+chunk).slice(-1500);});
    const timer=setTimeout(()=>{expired=true;child.kill('SIGTERM');killTimer=setTimeout(()=>child.kill('SIGKILL'),5000);killTimer.unref();},30*60*1000);timer.unref();
    child.once('error',error=>{clearTimeout(timer);log.end();reject(error);});
    child.once('close',code=>{clearTimeout(timer);clearTimeout(killTimer);log.end();if(code===0&&!expired)resolve();else reject(new Error(`COLMAP ${args[0]} ${expired?'timed out':'failed (exit '+code+')'}. ${tail.trim()}`));});
  });
}
export async function main(argv=process.argv.slice(2)){
  const args=argumentsFor(argv);if(args.help){process.stdout.write(HELP);return;}
  if(!args.job||!args.output)throw new Error('Provide --job and --output; use --help for usage.');
  if(args.dense&&args['import-model'])throw new Error('--dense cannot be combined with --import-model.');
  const jobPath=path.resolve(args.job),job=validateJob(JSON.parse(await readFile(jobPath,'utf8'))),output=path.resolve(args.output),imagesDirectory=path.resolve(path.dirname(jobPath),job.imagesDirectory),names=await imagesIn(imagesDirectory);
  if(names.length<3)throw new Error('At least three JPG/PNG source images are required.');
  const steps=args['import-model']?['validate-text-model','write-unreviewed-artifact']:['feature-extraction','geometric-matching','sparse-reconstruction','export-text',...(args.dense?['undistort','dense-stereo','fuse-depth','mesh']:[]),'validate-text-model','write-unreviewed-artifact'];
  if(args['dry-run']){process.stdout.write(JSON.stringify({jobId:job.jobId,sourceImages:names.length,imagesDirectory,output,steps,requiresColmap:!args['import-model'],requiresDenseGpu:!!args.dense,publishes:false},null,2)+'\n');return;}
  let entries;try{entries=await readdir(output);}catch(error){if(error.code!=='ENOENT')throw error;entries=[];}
  if(entries.length)throw new Error('Output directory must be new or empty; existing jobs are never overwritten.');
  let binary=args.colmap||'colmap',extractGpu,matchGpu;
  if(!args['import-model']){extractGpu=gpuOption(probe(binary,'feature_extractor'),'extract');matchGpu=gpuOption(probe(binary,job.matching+'_matcher'),'match');}
  await mkdir(output,{recursive:true});
  const stateFile=path.join(output,'job-state.json'),textDirectory=path.join(output,'colmap-text'),startedAt=new Date().toISOString();
  const state={version:1,jobId:job.jobId,startedAt,status:'running',step:null,completedSteps:[],publishes:false};
  const update=async step=>{state.step=step;await atomicJson(stateFile,state);process.stdout.write(step+'\n');};
  try{
    await atomicJson(path.join(output,'job.json'),job);await atomicJson(stateFile,state);
    const sourceImages=[];for(const name of names)sourceImages.push({name,sha256:await fingerprint(path.join(imagesDirectory,name))});
    await mkdir(textDirectory);
    let modelDirectory;
    if(args['import-model']){
      modelDirectory=path.resolve(args['import-model']);
      for(const name of ['cameras.txt','images.txt','points3D.txt'])await copyFile(path.join(modelDirectory,name),path.join(textDirectory,name));
    }else{
      const database=path.join(output,'database.db'),sparse=path.join(output,'sparse');await mkdir(sparse);
      const command=async(step,commandArgs)=>{await update(step);await execute(binary,commandArgs,path.join(output,'colmap.log'));state.completedSteps.push(step);await atomicJson(stateFile,state);};
      await command('feature-extraction',['feature_extractor','--database_path',database,'--image_path',imagesDirectory,'--ImageReader.camera_model',job.cameraModel,'--ImageReader.single_camera',job.singleCamera?'1':'0',extractGpu,'0']);
      // Sequential matching uses its default disabled loop detection; no model
      // downloads or network services are requested by this pipeline.
      await command('geometric-matching',[job.matching+'_matcher','--database_path',database,matchGpu,'0']);
      await command('sparse-reconstruction',['mapper','--database_path',database,'--image_path',imagesDirectory,'--output_path',sparse]);
      const models=(await readdir(sparse,{withFileTypes:true})).filter(entry=>entry.isDirectory());
      if(models.length!==1)throw new Error(`COLMAP produced ${models.length} disconnected components. Recapture overlap or explicitly review and import one component; components are not silently merged.`);
      modelDirectory=path.join(sparse,models[0].name);
      await command('export-text',['model_converter','--input_path',modelDirectory,'--output_path',textDirectory,'--output_type','TXT']);
      if(args.dense){
        const dense=path.join(output,'dense');await mkdir(dense);
        await command('undistort',['image_undistorter','--image_path',imagesDirectory,'--input_path',modelDirectory,'--output_path',dense,'--output_type','COLMAP']);
        await command('dense-stereo',['patch_match_stereo','--workspace_path',dense,'--workspace_format','COLMAP','--PatchMatchStereo.geom_consistency','true']);
        await command('fuse-depth',['stereo_fusion','--workspace_path',dense,'--workspace_format','COLMAP','--input_type','geometric','--output_path',path.join(dense,'fused.ply')]);
        await command('mesh',['poisson_mesher','--input_path',path.join(dense,'fused.ply'),'--output_path',path.join(dense,'mesh.ply')]);
      }
    }
    await update('validate-text-model');
    const artifact=buildArtifact(job,{...await readTextModel(textDirectory),sourceImages,dense:args.dense?{pointCloud:'dense/fused.ply',mesh:'dense/mesh.ply',units:'original COLMAP arbitrary units',applyScaleFactor:true,coverageReviewed:false}:null});
    const sourceNames=new Set(names);if(artifact.views.some(view=>!sourceNames.has(view.name)))throw new Error('Reconstruction references photos absent from imagesDirectory.');
    state.completedSteps.push('validate-text-model');await update('write-unreviewed-artifact');await atomicJson(path.join(output,'venue-artifact.json'),artifact);state.completedSteps.push('write-unreviewed-artifact');
    Object.assign(state,{status:'complete',finishedAt:new Date().toISOString(),artifact:'venue-artifact.json'});await atomicJson(stateFile,state);
    process.stdout.write(`Created ${path.join(output,'venue-artifact.json')} (unreviewed; not published).\n`);
  }catch(error){Object.assign(state,{status:'failed',finishedAt:new Date().toISOString(),error:error.message});await atomicJson(stateFile,state);throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
