// The catalog audit renders the same furniture geometry as the customer designer.
// No test scene, product image, stored thumbnail or invented price is used here.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {makeChair,makeTable} from './equipment3d.js';
import {TABLES} from '../data/tables.js';
import {CHAIRS} from '../data/chairs.js';
export function mountCatalogFurniture(host,definition,category,onFailure,suppliedModel=null){
 if(!host||!definition||(!suppliedModel&&!['table','chair'].includes(category)))throw new Error('A mapped furniture product is required');
 const list=category==='table'?TABLES:CHAIRS,index=list.findIndex(p=>p.id===definition.id);
 if(!suppliedModel){if(index<0)list.push(definition);else list[index]=definition;}
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const scene=new THREE.Scene();scene.background=new THREE.Color(suppliedModel?.userData.previewBackground||'#f5f6f5');scene.add(new THREE.HemisphereLight('#ffffff','#d2c9bd',2.7));
 const key=new THREE.DirectionalLight('#fff8ed',3);key.position.set(-6,10,8);scene.add(key);
 const fill=new THREE.DirectionalLight('#e8f3ff',1.2);fill.position.set(6,5,-4);scene.add(fill);
 const camera=new THREE.PerspectiveCamera(35,1,.01,150),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.49;
 let dead=false,failed=false,visible=true,ready=false,observer=null,visibility=null;
 const item={id:'catalog-preview-'+definition.productId,kind:'table',tableId:definition.id,shape:definition.shape,widthFt:definition.diameterFt||definition.widthFt,depthFt:definition.diameterFt||definition.depthFt,modelWidthFt:definition.widthFt,modelDepthFt:definition.depthFt,rotationDeg:0,seatCount:0,hideChairs:true};
 const model=suppliedModel||(category==='chair'?makeChair(definition):makeTable(item));scene.add(model);
 const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 if(![size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0)){renderer.dispose();controls.dispose();throw new Error('Furniture geometry is unavailable');}
 host.replaceChildren(renderer.domElement);host.classList.add('is-live-3d');renderer.domElement.setAttribute('aria-label',definition.name+' — current RentSketch 3D model. Drag to rotate.');
 function fail(error){if(failed||dead)return;failed=true;onFailure?.(error);destroy();}
 function paint(){if(dead||failed||!visible||!host.clientWidth||!host.clientHeight)return;try{renderer.render(scene,camera);if(!ready){ready=true;host.dataset.renderReady='1';host.dataset.productId=String(definition.productId||'');}}catch(error){fail(error);}}
 function resize(){if(dead||!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();const direction=new THREE.Vector3(.8,.62,1).normalize(),right=new THREE.Vector3(direction.z,0,-direction.x).normalize(),up=new THREE.Vector3().crossVectors(direction,right),tanV=Math.tan(camera.fov*Math.PI/360),tanH=tanV*camera.aspect;let distance=suppliedModel?.userData.hardwareDetail ? .05 : 2;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,Math.abs(v.dot(right))/tanH+v.dot(direction),Math.abs(v.dot(up))/tanV+v.dot(direction));}distance*=1.15;camera.position.copy(center).addScaledVector(direction,distance);controls.target.copy(center);controls.minDistance=Math.max(suppliedModel?.userData.hardwareDetail ? .025 : 1,distance*.45);controls.maxDistance=distance*2.5;camera.lookAt(center);controls.update();paint();}
 const contextLost=event=>{event.preventDefault();fail(new Error('The browser released this 3D preview'));};
 const pageVisibility=()=>{visible=!document.hidden;if(visible)paint();};
 function destroy(){if(dead)return;dead=true;observer?.disconnect();visibility?.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',contextLost);document.removeEventListener('visibilitychange',pageVisibility);window.removeEventListener('pagehide',destroy);const materials=new Set(),textures=new Set();model.traverse(o=>{o.geometry?.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])if(material){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss?.();delete host.dataset.renderReady;}
 controls.addEventListener('change',paint);renderer.domElement.addEventListener('webglcontextlost',contextLost);document.addEventListener('visibilitychange',pageVisibility);window.addEventListener('pagehide',destroy);
 observer=new ResizeObserver(resize);observer.observe(host);visibility=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting!==false&&!document.hidden;if(visible)paint();});visibility.observe(host);resize();return {destroy,fit:resize};
}
