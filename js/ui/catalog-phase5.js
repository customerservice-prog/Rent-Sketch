import * as THREE from 'three';
import {phase5Reference} from '../data/phase5-reference.js';
import {equipmentCatalog,equipmentItem,EQUIPMENT} from '../data/equipment.js';
import {applyTenantLighting,LIGHTING_OPTIONS} from '../data/lighting.js';
import {applyTenantDance} from '../data/danceFloor.js';
import {createEquipment} from './equipment-motion3d.js';
import {makeDanceFloor} from './equipment3d.js';
import {makeReferenceLighting,createStringFixture,createRopeReel,createChandelier} from './lighting-reference3d.js';
import {material,shapes,mergeStatic} from './phase5-shapes3d.js';
import {mountCatalogFurniture} from './catalog-furniture3d.js';
export function phase5Model(product,products,{installed=false}={}){
 const reference=phase5Reference(product);if(!reference||reference.kind==='reference-only')return null;
 const detail={tenant:{slug:'friendly',showPrices:false},products};applyTenantDance(detail);applyTenantLighting(detail);
 let model;
 if(reference.kind==='equipment'){
  const definition=equipmentCatalog([product],false)[0];if(!definition)return null;
  const index=EQUIPMENT.findIndex(p=>p.productId===product.id);if(index<0)EQUIPMENT.push(definition);else EQUIPMENT[index]=definition;
  model=createEquipment(equipmentItem(definition,'phase5-preview',0,0));
 }else if(reference.kind==='floor'){
  model=makeDanceFloor([{id:'phase5-preview',kind:'dance',x:0,y:0,widthFt:3,depthFt:3}],{widthFt:3,lengthFt:3});
 }else{
  const base=LIGHTING_OPTIONS.find(p=>p.id===product.visual_model_id);if(!base)return null;
  const option={...base,productId:product.id,externalId:product.external_id,reference,available:true};
  if(reference.type==='rope'&&!installed)model=createRopeReel();
  else if(['c7','bistro'].includes(reference.type)&&!installed){
   model=new THREE.Group();const cord=material(reference.type==='c7'?'#eeeade':'#23242a'),s=shapes(model),points=[];
   for(let i=0;i<=24;i++){const t=i/24;points.push([-2.5+t*5,.55-Math.sin(t*Math.PI)*.35,0]);}s.curve(points,.01,cord);
   const count=reference.type==='c7'?6:4;for(let i=0;i<count;i++){const t=(i+.5)/count,q=createStringFixture(reference.type);q.position.set(-2.5+t*5,.55-Math.sin(t*Math.PI)*.35,0);model.add(q);}mergeStatic(model);model.userData={fixtureType:reference.type,hardwareDetail:true};
  }else if(reference.type==='chandelier'&&!installed){
   // Same chandelier geometry; omit support cable so the hardware fills the view.
   model=createChandelier();
  }else model=makeReferenceLighting({type:'frame',widthFt:reference.widthFt||12,lengthFt:reference.lengthFt||12},option);
 }
 return {model,reference,note:reference.note+(reference.kind==='lighting'&&!installed?' Hardware/fixture preview; mounting and venue are not included.':''),installed};
}
export function mountCatalogPhase5(host,product,products,onFailure,options={}){
 const result=phase5Model(product,products,options);if(!result)return null;
 return {...mountCatalogFurniture(host,{id:product.id,productId:product.id,name:product.name},'equipment',onFailure,result.model),...result};
}
