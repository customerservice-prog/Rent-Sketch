import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {visualCoverage,FRIENDLY_SOURCE_VISUALS}=require('../server/src/visualCoverage');

test('shared visual mappings remain native',()=>{
 const c=visualCoverage({active:true,visual_model_id:'chiavari-gold',name:'Gold Chiavari Chair'},'friendly');
 assert.equal(c.level,'shared');assert.equal(c.native,true);assert.equal(c.renderable,true);
});

test('exact Friendly reviewed source profiles count as native without a visual_model_id',()=>{
 for(const tenant of ['friendly','friendly-nyc','friendly-sc']){
  const c=visualCoverage({active:true,external_id:'fpr:hot-dog-roller-grill',name:'Hot Dog Roller Grill'},tenant);
  assert.equal(c.level,'source');assert.equal(c.native,true);assert.equal(c.renderable,true);
 }

 for(const slug of ['chess-set','audio-guest-book','greenery-and-floral-wall-8x8','tidal-wave-inflatable-water-slide']){
  assert.equal(FRIENDLY_SOURCE_VISUALS.has(slug),true);
  const c=visualCoverage({active:true,external_id:'fpr:'+slug,name:slug},'friendly');
  assert.equal(c.level,'source');assert.equal(c.native,true);assert.equal(c.renderable,true);
 }
});

test('conflicted source rows are not promoted to native visuals',()=>{
 for(const slug of ['stage-ramp','keg-coolertub','sugar-and-creamer-set','hexagon-wedding-arch','glass-water-pitcher-64-oz','round-gold-metal-display-dish']){
  assert.equal(FRIENDLY_SOURCE_VISUALS.has(slug),false);
 }
});

test('known drawable families report illustrative coverage and unknown physical rentals keep the measured fallback',()=>{
 assert.equal(visualCoverage({active:true,name:'Inflatable Basketball Game',category:'inflatable'},'friendly').level,'illustrative');
 assert.equal(visualCoverage({active:true,name:'Dinner Plate',category:'tabletop'},'friendly').level,'illustrative');
 const generic=visualCoverage({active:true,name:'Mystery Rental Rack',category:'other'},'friendly');
 assert.equal(generic.level,'generic');assert.equal(generic.renderable,true);assert.equal(generic.native,false);
});

test('runtime-inferred Friendly furniture is counted as native and known equipment is not mislabeled generic',()=>{
 for(const name of ['Cross-Back Farmhouse Chair','Sweetheart Table (60in Half-Round)']){
  const result=visualCoverage({active:true,name,category:'wedding'},'friendly');
  assert.equal(result.level,'inferred');assert.equal(result.native,true);assert.equal(result.renderable,true);
 }
 for(const name of ['170K BTU Tent Heater','White Aisle Runner (100ft)']){
  const result=visualCoverage({active:true,name,category:'other'},'friendly');
  assert.equal(result.level,'illustrative');assert.equal(result.native,false);assert.equal(result.renderable,true);
 }
});

test('configuration-only rows are not counted as customer-placeable visuals',()=>{
 const c=visualCoverage({active:true,name:'Snow Cone Syrup - Cherry',category:'concession'},'friendly');
 assert.equal(c.level,'configuration');assert.equal(c.renderable,false);
});
