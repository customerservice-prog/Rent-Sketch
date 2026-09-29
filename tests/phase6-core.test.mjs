import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PHASE6_SLUGS,phase6Reference,isPhase6Configuration} from '../js/data/phase6-reference.js';
import {equipmentCatalog,equipmentItem} from '../js/data/equipment.js';
import {accessoryCatalog,accessoryItem} from '../js/data/accessories.js';
import {buildBookingHandoff} from '../js/core/bookingHandoff.js';
// Synthetic prices and IDs here are test fixtures only; production still reads
// Friendly's live catalog. Live IDs/photos are separately checked in browser QA.
const product=slug=>({id:'test-'+slug,external_id:'fpr:'+slug,name:slug.replaceAll('-',' '),category:'other',active:true,price_per_day:'37.25'});
const products=PHASE6_SLUGS.map(product).concat(['cotton-candy-floss-sugar-pink','snow-cone-syrup-cherry','55-oz-popcorn-kernel','sterno-fuel-cans-pack-of-2','20-lb-propane-tank','100-lb-propane-tank','photobooth-extra-hour-attended','photobooth-4x6-print-upgrade','photobooth-custom-backdrop-upgrade'].map(product));
const pFor=slug=>products.find(p=>p.external_id==='fpr:'+slug);
for(const slug of PHASE6_SLUGS){
 test('exact identity and immutable catalog: '+slug,()=>{
  const p=pFor(slug);assert.ok(p,slug);const before=JSON.stringify(p),ref=phase6Reference(p);assert.ok(ref);assert.equal(ref.approved,false);
  if(ref.kind==='equipment'){
   const [a]=equipmentCatalog([p],true),[hidden]=equipmentCatalog([p],false),[legacy]=accessoryCatalog([p],true);
   assert.equal(a.type,ref.type);assert.equal(a.productId,p.id);assert.equal(hidden.productId,p.id);assert.equal(hidden.pricePerDay,null);assert.equal(a.pricePerDay,Number(p.price_per_day));assert.equal(a.dimensionsConfirmed,false);
   assert.equal(legacy.productId,p.id);assert.equal(legacy.accessoryType,ref.type);assert.equal(accessoryItem(legacy,'legacy',2,3).externalId,p.external_id);
   const saved=equipmentItem(a,'saved',4,8),state=JSON.stringify(saved);assert.equal(saved.productId,p.id);assert.equal(saved.x,4);assert.equal(saved.y,8);
   const booking=buildBookingHandoff({tenant:'friendly',products,lines:[{productId:p.id,label:p.name,qty:2,category:'equipment'}],eventDate:'2026-11-20'});
   assert.equal(booking.items.length,1);assert.equal(booking.items[0].quantity,2);assert.equal(booking.items[0].slug,slug);assert.equal(booking.items[0].price,undefined);assert.equal(JSON.stringify(saved),state);
  }
  assert.equal(JSON.stringify(p),before);
  assert.equal(phase6Reference({...p,external_id:'other:'+slug}),null);
  assert.equal(phase6Reference({...p,external_id:null,asset:undefined,externalId:null}),null);
 });
}
test('consumables and add-ons never masquerade as physical machines',()=>{
 for(const p of products.filter(isPhase6Configuration)){
  const before=JSON.stringify(p);assert.equal(equipmentCatalog([p],true).length,0,p.name);assert.equal(accessoryCatalog([p],true).length,0,p.name);assert.equal(JSON.stringify(p),before);
  // Suppression in the visual picker must not rewrite a saved checkout line.
  const b=buildBookingHandoff({tenant:'friendly',products,lines:[{productId:p.id,label:p.name,qty:1}],eventDate:'2026-11-20'});assert.equal(b.items[0].slug,p.external_id.slice(4));
 }
});
test('all seven booth service SKUs stay separate despite sharing a visual',()=>{
 const booths=PHASE6_SLUGS.filter(s=>s.startsWith('photobooth-'));assert.equal(booths.length,7);
 const mapped=equipmentCatalog(booths.map(pFor),true);assert.equal(new Set(mapped.map(p=>p.productId)).size,7);assert.equal(mapped.filter(p=>p.reference.attended).length,4);
});
test('one stanchion is not a two-post bundle and two cornhole boards remain one set',()=>{
 assert.equal(phase6Reference(pFor('crowd-control-stanchion')).physicalCount,1);assert.equal(phase6Reference(pFor('cornhole')).physicalCount,2);
 for(const slug of ['cornhole','crowd-control-stanchion']){const p=pFor(slug),b=buildBookingHandoff({tenant:'friendly',products,lines:[{productId:p.id,qty:1}],eventDate:'2026-11-20'});assert.equal(b.items[0].quantity,1);}
});
