import test from 'node:test';
import assert from 'node:assert/strict';
import {PHASE6_SLUGS,phase6Reference} from '../js/data/phase6-reference.js';
import {equipmentCatalog,equipmentItem} from '../js/data/equipment.js';
import {accessoryCatalog,accessoryItem} from '../js/data/accessories.js';
import {summarizeEvent} from '../js/core/eventSummary.js';
import {buildBookingHandoff} from '../js/core/bookingHandoff.js';
// Synthetic IDs/prices only: no commercial data is written or bundled here.
const products=PHASE6_SLUGS.map(slug=>({id:'fixture-'+slug,external_id:'fpr:'+slug,name:slug,category:'other',active:true,price_per_day:'31.27'}));
for(const product of products.filter(p=>phase6Reference(p).kind==='equipment')){
 for(const legacy of [false,true])test(`${product.name} ${legacy?'legacy':'modern'} scene keeps one rental line through checkout handoff`,()=>{
  const equipment=equipmentCatalog([product],true),accessories=accessoryCatalog([product],true);
  const item=legacy?accessoryItem(accessories[0],'placed',4,8):equipmentItem(equipment[0],'placed',4,8);
  const scene={objects:[item]},original=JSON.stringify(scene);
  const summary=summarizeEvent(scene,{tents:[],tables:[],chairs:[],linens:[],lighting:[],equipment,accessories,tabletop:[]},{includeTent:false});
  assert.equal(summary.lines.length,1);assert.equal(summary.lines[0].productId,product.id);assert.equal(summary.lines[0].qty,1);assert.equal(summary.lines[0].amount,31.27);
  const handoff=buildBookingHandoff({tenant:'friendly',products,lines:summary.lines,eventDate:'2026-11-20'});
  assert.equal(handoff.items.length,1);assert.equal(handoff.items[0].slug,product.external_id.slice(4));assert.equal(handoff.items[0].quantity,1);assert.equal(handoff.items[0].price,undefined);
  assert.equal(JSON.stringify(scene),original);
 });
}
