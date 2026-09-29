import test from 'node:test';import assert from 'node:assert/strict';
import {PHASE6B_SLUGS,phase6bReference} from '../js/data/phase6b-reference.js';
import {phase6bDimensions} from '../js/data/phase6b-dimensions.js';
import {equipmentCatalog,equipmentItem} from '../js/data/equipment.js';
import {accessoryCatalog,accessoryItem} from '../js/data/accessories.js';
import {tabletopCatalog,tabletopQuantity} from '../js/data/tabletop.js';
import {summarizeEvent} from '../js/core/eventSummary.js';
import {buildBookingHandoff} from '../js/core/bookingHandoff.js';
import {phase6bSymbol} from '../js/ui/phase6b-symbols.js';
const product=slug=>({id:'fixture-'+slug,external_id:'fpr:'+slug,name:slug.replaceAll('-',' '),category:'other',active:true,price_per_day:'17.35'});
const products=PHASE6B_SLUGS.map(product);
for(const p of products)test('Phase 6B exact source and retained rental quantity: '+p.name,()=>{
 const before=JSON.stringify(p),r=phase6bReference(p);assert.ok(r);assert.equal(r.approved,false);assert.equal(phase6bReference({...p,external_id:'other:'+r.slug}),null);assert.equal(phase6bReference({name:p.name}),null);
 let scene,catalog,expected=2;
 if((r.kind==='equipment'||r.placement==='equipment')){
  const [d]=equipmentCatalog([p],true),[hidden]=equipmentCatalog([p],false);assert.ok(d,p.name);assert.equal(d.type,r.type);assert.equal(d.productId,p.id);assert.equal(hidden.pricePerDay,null);assert.equal(hidden.productId,p.id);
  const [old]=accessoryCatalog([p],true);assert.ok(old);assert.equal(old.productId,p.id);const placed=equipmentItem(d,'a',7,9),other=equipmentItem(d,'b',11,9);scene={objects:[placed,other]};catalog={equipment:[d],accessories:[old]};
  const legacy=summarizeEvent({objects:[accessoryItem(old,'old',3,4)]},{accessories:[old]},{includeTent:false});assert.equal(legacy.lines.filter(l=>l.productId===p.id)[0].qty,1);
 }else{
  const [top]=tabletopCatalog([p],true),[renamed]=tabletopCatalog([{...p,name:'Renamed catalog item'}],true);assert.ok(top,p.name);assert.equal(renamed.productId,p.id);assert.equal(equipmentCatalog([p],true).length,0,'serving items must not move into floor equipment');assert.ok(phase6bSymbol(top));
  scene={objects:[{id:'t',kind:'table',tableId:'support',shape:'rect',x:0,y:0,widthFt:8,depthFt:2.5,seatCount:0,tabletop:[{productId:p.id,qty:2,perSeat:false}]}]};catalog={tables:[{id:'support',name:'Support',pricePerDay:0}],tabletop:[top]};
  assert.equal(tabletopQuantity({qty:2,perSeat:false},{seatCount:10}),2);assert.equal(tabletopQuantity({qty:2,perSeat:true},{seatCount:10}),10);
 }
 const original=JSON.stringify(scene),summary=summarizeEvent(scene,catalog,{includeTent:false}),line=summary.lines.find(l=>l.productId===p.id);assert.ok(line,p.name);assert.equal(line.qty,expected);assert.equal(line.amount,34.7);
 const b=buildBookingHandoff({tenant:'friendly',products:[p],lines:[line],eventDate:'2027-02-20'});assert.equal(b.items.length,1);assert.equal(b.items[0].slug,r.slug);assert.equal(b.items[0].quantity,2);assert.equal(b.items[0].price,undefined);assert.equal(JSON.stringify(scene),original);assert.equal(JSON.stringify(p),before);
});
test('upright face dimensions are not ground-depth measurements',()=>{
 const p={...product('sequin-backdrop-panel-8x8'),width_ft:8,length_ft:8};const dim=phase6bDimensions(p);assert.equal(dim.widthFt,8);assert.equal(dim.heightFt,8);assert.equal(dim.depthFt,1.5);assert.equal(dim.dimensionsConfirmed,false);
 const supplied=phase6bDimensions({...p,metadata:{footprintDepthFt:2.25,heightFt:8.2}});assert.equal(supplied.depthFt,2.25);assert.equal(supplied.heightFt,8.2);assert.equal(supplied.dimensionsConfirmed,true);
 const [a]=equipmentCatalog([p]),[b]=accessoryCatalog([p]);assert.equal(a.depthFt,1.5);assert.equal(b.depthFt,1.5);
});
test('conflicting source photos do not acquire invented materials or set counts',()=>{
 for(const slug of ['glass-water-pitcher-64-oz','round-gold-metal-display-dish']){const r=phase6bReference(product(slug));assert.equal(r.kind,'reference-only');assert.equal(r.placement,'tabletop');assert.ok(r.note.includes('conflict'));}
});
test('sets, cover-only rentals and volume labels are not expanded',()=>{
 assert.equal(phase6bReference(product('salt-and-pepper-shaker-set')).physicalCount,2);assert.equal(phase6bReference(product('tiered-cake-display-3-level-gold')).physicalCount,1);
 assert.equal(phase6bReference(product('25-gallon-insulated-beverage-dispenser')).capacityLabel,'2.5 gallon');
 for(const slug of ['water-barrel-cover','leg-drape'])assert.equal(phase6bReference(product(slug)).coverOnly,true);
 assert.equal(phase6bReference(product('25-foot-movie-screen-with-projector')).bundleVisual,true);
});


test('the named hexagon is not approved against a seven-sided source photograph',()=>{
 const p=product('hexagon-wedding-arch'),r=phase6bReference(p);assert.equal(r.kind,'reference-only');assert.equal(r.placement,'equipment');assert.match(r.note,/seven-sided/);assert.equal(equipmentCatalog([p])[0].productId,p.id);
});
