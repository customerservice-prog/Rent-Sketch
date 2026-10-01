import test from 'node:test';
import assert from 'node:assert/strict';
import {inflatableCatalog,inflatableZones,inflatableItem,resolvedInflatableDefinition} from '../js/data/inflatables.js';

test('Friendly inflatable basketball gets a dedicated two-lane planning profile',()=>{
 const product=inflatableCatalog([{
   id:'basketball-game',
   active:true,
   external_id:'fpr:inflatable-basketball-game',
   name:'Inflatable Basketball Game',
   category:'inflatable',
   price_per_day:100,
   width_ft:null,
   length_ft:null
 }],true)[0];
 assert.ok(product);
 assert.equal(product.style,'basketball');
 assert.equal(product.variant,'basketball-shootout');
 assert.equal(product.lanes,2);
 assert.equal(product.dimensionsConfirmed,false);
 assert.deepEqual(inflatableZones(product),{});
 const item=inflatableItem(product,'saved');
 const resolved=resolvedInflatableDefinition(item,product);
 assert.equal(resolved.style,'basketball');
 assert.equal(resolved.variant,'basketball-shootout');
 assert.equal(resolved.widthFt,12);
 assert.equal(resolved.depthFt,14);
 assert.equal(resolved.heightFt,10);
});
