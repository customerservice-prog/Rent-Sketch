import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {phase5Reference,PHASE5_SLUGS} from '../js/data/phase5-reference.js';
import {applyTenantLighting,lightingForTent,LIGHTING_OPTIONS} from '../js/data/lighting.js';
import {applyTenantDance,DANCE_SECTION,STAGE_SECTION,sectionsForSize} from '../js/data/danceFloor.js';
import {equipmentCatalog,equipmentItem} from '../js/data/equipment.js';
import {buildBookingHandoff} from '../js/core/bookingHandoff.js';
const product=(slug,category,visual,extra={})=>({id:'source-'+slug,external_id:'fpr:'+slug,name:slug,category,visual_model_id:visual,active:true,price_per_day:37,...extra});
test('Phase 5 mapping requires the explicit source, not a familiar name or visual',()=>{
 assert.equal(PHASE5_SLUGS.length,23);assert.equal(phase5Reference({name:'4375-Watt Generator',visual_model_id:'generator'}),null);
 const p=product('30a-power-distribution-spider-box','other','generator');assert.equal(phase5Reference(p).type,'power-distribution');assert.equal(equipmentCatalog([p])[0].type,'power-distribution');
 assert.equal(phase5Reference(product('stage-ramp','dance_floor',null)).kind,'reference-only');
});
test('Live lighting is exact-size and duplicate mappings are blocked',()=>{
 const p=product('tent-lighting-20x40','lighting','lighting-tent',{width_ft:20,length_ft:40});
 applyTenantLighting({tenant:{slug:'friendly',showPrices:true},products:[p]});
 const exact=lightingForTent('lighting-tent',{widthFt:20,lengthFt:40});assert.equal(exact.productId,p.id);assert.equal(exact.reference.type,'c7');assert.equal(exact.pricePerDay,37);
 assert.equal(lightingForTent('lighting-tent',{widthFt:20,lengthFt:30}).available,false);
 applyTenantLighting({tenant:{slug:'friendly'},products:[p,{...p,id:'duplicate',width_ft:40,length_ft:20}]});assert.equal(lightingForTent('lighting-tent',{widthFt:20,lengthFt:40}).available,false);
});
test('Light identity remains available when a tenant hides prices; refresh clears stale IDs',()=>{
 const p=product('battery-operated-crystal-chandelier','lighting','lighting-chandelier');
 applyTenantLighting({tenant:{slug:'friendly',showPrices:false},products:[p]});const l=lightingForTent('lighting-chandelier',{widthFt:20,lengthFt:20});assert.equal(l.productId,p.id);assert.equal(l.pricePerDay,null);assert.equal(l.reference.arms,5);
 applyTenantLighting({tenant:{slug:'another',showPrices:false},products:[]});assert.equal(lightingForTent('lighting-chandelier',{}).available,false);assert.equal(LIGHTING_OPTIONS.find(l=>l.id==='lighting-chandelier').reference,undefined);
});
test('Floor and stage keep exact identity without prices and do not pick duplicate SKUs',()=>{
 const floor=product('dance-floor-3x3-section','dance_floor','dance-floor',{name:'Dance Floor 3x3 Section',width_ft:3,length_ft:3});
 const stage=product('stage-section','dance_floor','stage-section');applyTenantDance({tenant:{slug:'friendly',showPrices:false},products:[floor,stage]});assert.equal(DANCE_SECTION.productId,floor.id);assert.equal(DANCE_SECTION.pricePerDay,null);assert.equal(STAGE_SECTION.productId,stage.id);
 assert.equal(sectionsForSize(12),16);assert.equal(sectionsForSize(15),25);
 applyTenantDance({tenant:{slug:'friendly'},products:[floor,stage,{...stage,id:'duplicate'}]});assert.equal(STAGE_SECTION.productId,undefined);
 applyTenantDance({tenant:{slug:'other'},products:[]});assert.equal(DANCE_SECTION.productId,undefined);assert.equal(DANCE_SECTION.reference,undefined);
});
test('Model changes do not replace saved rental dimensions, identity or quantities',()=>{
 const p=product('4375-watt-generator','other','generator'),source=JSON.stringify(p),def=equipmentCatalog([p],true)[0],item=equipmentItem(def,'saved',2,4);
 assert.equal(JSON.stringify(p),source);assert.equal(item.productId,p.id);assert.equal(item.externalId,p.external_id);assert.equal(def.dimensionsConfirmed,false);
});
test('Each Phase 5 selection has a website checkout identity, not a copied amount',()=>{
 const products=PHASE5_SLUGS.map(slug=>product(slug,'other',null));
 for(const slug of PHASE5_SLUGS){const p=products.find(p=>p.external_id==='fpr:'+slug);assert.ok(p,slug);const qty=slug==='dance-floor-3x3-section'?16:1;
 const payload=buildBookingHandoff({tenant:'friendly',designId:'phase5-test-only',eventDate:'2099-06-20',products,lines:[{productId:p.id,label:p.name,qty,category:p.category}]});assert.equal(payload.items[0].slug,slug);assert.equal(payload.items[0].quantity,qty);assert.equal(payload.items[0].price,undefined);assert.equal(payload.items[0].amount,undefined);}
});
