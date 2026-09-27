import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CHAIRS } from '../data/chairs.js';
import { TABLES } from '../data/tables.js';
import { TENTS } from '../data/tents.js';
import { genericEquipment, equipmentItem } from '../data/equipment.js';
import { proceduralVisualDescriptor } from '../data/asset-registry.js';
import { makeChair, makeTable } from './equipment3d.js';
import { makeTent } from './tent3d.js';
import { createEquipment } from './equipment-motion3d.js';
import { enhancePlacedVisual } from './packaged-asset-loader.js';
import { lightingProfile, createLightingEnvironment, SUN_DIRECTION } from './scene-lighting.js';
import { disposeGroup } from './scene-environment.js';

const id=new URLSearchParams(location.search).get('visual'),host=document.getElementById('modelViewport'),status=document.getElementById('status'),facts=document.getElementById('facts');
let destroy=()=>{};
function line(label,value){const p=document.createElement('div'),strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value));facts.append(p);}
try{
  const chair=CHAIRS.find(value=>value.id===id),table=TABLES.find(value=>value.id===id),tent=TENTS.find(value=>value.id===id),equipment=genericEquipment().find(value=>value.type===id);
  const definition=chair||table||tent||equipment;
  if(!definition)throw new Error('This visual does not yet have an inspection view. Return to Products to choose a supported rental model.');
  document.getElementById('modelTitle').textContent=definition.name;
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'}),scene=new THREE.Scene(),profile=lightingProfile({studio:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=profile.exposure;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.domElement.setAttribute('aria-label','Interactive rental model. Drag to orbit and scroll or pinch to zoom.');host.append(renderer.domElement);scene.background=new THREE.Color('#f1efe9');
  const camera=new THREE.PerspectiveCamera(36,1,.02,1200),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.49;
  const ambient=new THREE.HemisphereLight(profile.sky,profile.ground,profile.ambient),sun=new THREE.DirectionalLight(profile.sun,profile.key),fill=new THREE.DirectionalLight('#d6e8fa',profile.fill);sun.position.set(...SUN_DIRECTION);fill.position.set(6,4,-4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.025;sun.shadow.bias=-.0004;scene.add(ambient,sun,fill);
  const env=createLightingEnvironment(renderer,{studio:true});scene.environment=env.texture;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshStandardMaterial({color:'#ebe7df',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
  let model,item,enhancement=null;
  if(chair)model=makeChair(chair);
  else if(table)model=makeTable({id:'review',tableId:table.id,shape:table.shape,widthFt:table.widthFt||table.diameterFt,depthFt:table.depthFt||table.diameterFt,seatCount:0});
  else if(tent)model=makeTent(tent,'stakes');
  else{item=equipmentItem(equipment,'review',0,0);model=createEquipment(item);}
  let live=true,playing=false,frame=0,clock=0,last=0,currentView='overview';
  function paint(){if(live&&host.clientWidth&&host.clientHeight)renderer.render(scene,camera);}
  function frameModel(view=currentView){
    currentView=view;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z);controls.target.copy(center);
    const direction=new THREE.Vector3(...({front:[0,.15,1],side:[1,.15,0],back:[0,.15,-1],overview:[.7,.6,1]}[view]||[.7,.6,1])).normalize();
    const right=new THREE.Vector3(direction.z,0,-direction.x).normalize(),up=new THREE.Vector3().crossVectors(direction,right),tanV=Math.tan(camera.fov*Math.PI/360),tanH=tanV*camera.aspect;let distance=1;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,Math.abs(p.dot(right))/tanH+p.dot(direction),Math.abs(p.dot(up))/tanV+p.dot(direction));}
    camera.position.copy(center).addScaledVector(direction,distance*1.15);controls.minDistance=span*.6;controls.maxDistance=span*6;camera.lookAt(center);controls.update();
    const edge=span*.8+2;sun.shadow.camera.left=sun.shadow.camera.bottom=-edge;sun.shadow.camera.right=sun.shadow.camera.top=edge;sun.shadow.camera.far=500;sun.position.copy(center).add(new THREE.Vector3(...SUN_DIRECTION).normalize().multiplyScalar(span*2+40));sun.target.position.copy(center);scene.add(sun.target);sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;paint();
    document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
  }
  if(item){enhancement=enhancePlacedVisual(model,item,{mobile:innerWidth<700,onReady:()=>{status.textContent='Packaged model loaded · drag to inspect';frameModel();},onError:()=>{status.textContent='Procedural fallback · packaged model unavailable';paint();}});if(enhancement)model=enhancement.group;}
  scene.add(model);status.textContent=enhancement?'Loading packaged model; fallback is visible.':'Procedural visual · drag to inspect';
  model.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  line('Visual format',enhancement?'Versioned GLB with procedural fallback':'Configurable procedural model');
  if(!enhancement)line('Asset version',proceduralVisualDescriptor(definition,chair?'chair':table?'table':tent?'tent':'equipment').version);
  line('Model dimensions',[size.x,size.z,size.y].map(value=>value.toFixed(2)).join(' × ')+' ft (width × depth × height)');
  line('Dimension evidence',definition.dimensionsNote||'Illustrative model proportions. Product measurements and operating clearances require a separate review.');
  line('Planning footprint','Taken from the placed rental; model delivery does not change saved layouts.');
  if(enhancement)line('Asset version','stanchion-black · 2026.09.27.1 · project-owned illustration');
  function resize(){const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();frameModel();}
  controls.addEventListener('change',paint);const observer=new ResizeObserver(resize);observer.observe(host);resize();
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>frameModel(button.dataset.view)));
  const motion=document.getElementById('toggleMotion');motion.hidden=!model.userData.operation?.supported;motion.addEventListener('click',()=>{playing=!playing;motion.setAttribute('aria-pressed',String(playing));motion.textContent=playing?'Pause motion':'Play motion';last=0;if(playing)frame=requestAnimationFrame(tick);else cancelAnimationFrame(frame);});
  function tick(now){if(!live||!playing)return;frame=requestAnimationFrame(tick);if(document.hidden){last=now;return;}if(last)clock+=Math.min(.05,(now-last)/1000);last=now;model.userData.update?.(clock);renderer.shadowMap.needsUpdate=true;paint();}
  const lost=event=>{event.preventDefault();status.textContent='3D was interrupted. Close this review and open it again.';playing=false;cancelAnimationFrame(frame);};renderer.domElement.addEventListener('webglcontextlost',lost);
  destroy=()=>{live=false;cancelAnimationFrame(frame);enhancement?.cancel();observer.disconnect();controls.dispose();disposeGroup(model);floor.geometry.dispose();floor.material.dispose();sun.shadow.dispose();env.dispose();renderer.dispose();renderer.forceContextLoss?.();};
  window.addEventListener('pagehide',destroy,{once:true});
}catch(error){destroy();host.querySelector('canvas')?.remove();status.textContent=error.message;status.style.position='static';status.style.padding='24px';document.querySelector('.controls').hidden=true;}
