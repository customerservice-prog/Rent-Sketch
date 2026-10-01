import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadSyncHelpers(){
  const source=fs.readFileSync(new URL('../server/src/friendlyCatalogSync.js',import.meta.url),'utf8');
  const mod={exports:{}};
  const context={
    module:mod,exports:mod.exports,
    require:id=>{if(id==='./db')return{query:async()=>({rows:[]})};throw new Error('Unexpected dependency '+id);},
    console,process:{env:{}},URL,AbortController,setTimeout,clearTimeout,
    fetch:async()=>{throw new Error('network disabled in unit test');},
    RegExp,Set,Map,Number,String,Object,Array,Math,JSON,Promise,Error
  };
  vm.runInNewContext(source,context,{filename:'friendlyCatalogSync.js'});
  return mod.exports._test;
}

const {visualModel,nycBaseCategory,nycProduct}=loadSyncHelpers();

test('Friendly sync maps supported animated equipment while excluding non-placeable add-ons',()=>{
  const cases=[
    ['Foam Party Machine','other','foam-machine'],
    ['Bubble Machine','other','bubble-machine'],
    ['Fog Machine','other','fog-machine'],
    ['Confetti Cannon Machine','other','confetti-machine'],
    ['20 Inch Event Fan','other','fan'],
    ['Patio Heater','other','heater'],
    ['4375 Watt Generator','generator','generator'],
    ['Power Distribution Box','generator','power-distribution'],
    ['550W Bluetooth Speaker','other','speaker'],
    ['Podium & Microphone','other','podium'],
    ['Karaoke System','other','karaoke'],
    ['Projection Screen','other','screen'],
    ['Stanchion','other','stanchion'],
    ['Red Carpet','other','red-carpet'],
    ['32 Gallon Trash Can','other','trash-can'],
    ['Popcorn Machine','concession','popcorn'],
    ['Cotton Candy Machine','concession','cotton-candy'],
    ['Snow Cone Machine','concession','snow-cone'],
    ['Chocolate Fountain','concession','chocolate-fountain'],
    ['Cornhole Game','game','cornhole'],
    ['Giant Connect Four','game','connect-four'],
    ['Tumbling Timbers 5ft','game','tumbling-timbers'],
    ['Photobooth (6-Hour) No Attendant','photobooth','photobooth'],
    ['Photobooth Extra Hour (Attended)','photobooth',null],
    ['Cotton Candy Floss Sugar - Grape','concession',null],
    ['Popcorn Kernel Supplies','concession',null],
    ['Foam Party Package','package',null]
  ];
  for(const [name,category,expected] of cases)assert.equal(visualModel({name,category}),expected,name);
});

test('every equipment id emitted by Friendly sync exists in the public visual library',()=>{
  const visualSource=fs.readFileSync(new URL('../server/src/routes/visualLibrary.js',import.meta.url),'utf8');
  const library=new Set([...visualSource.matchAll(/\{ id: '([^']+)', category: 'equipment'/g)].map(m=>m[1]));
  const products=[
    ['Foam Party Machine','other'],['Bubble Machine','other'],['Fog Machine','other'],['Confetti Machine','other'],
    ['20 Inch Fan','other'],['Patio Heater','other'],['Generator','generator'],['Power Distribution Box','generator'],
    ['Bluetooth Speaker','other'],['Podium','other'],['Karaoke System','other'],['Projection Screen','other'],
    ['Stanchion','other'],['Red Carpet','other'],['Trash Can','other'],['Popcorn Machine','concession'],
    ['Cotton Candy Machine','concession'],['Snow Cone Machine','concession'],['Chocolate Fountain','concession'],
    ['Cornhole','game'],['Connect Four','game'],['Tumbling Timbers','game'],['Photobooth','photobooth']
  ];
  for(const [name,category] of products){
    const id=visualModel({name,category});
    assert.ok(id&&library.has(id),name+' -> '+id+' must be in visual library');
  }
});


test('NYC sync preserves NYC price and uses NYC image proxy without changing the Syracuse external-id convention',()=>{
 const item={slug:'20x20-pole-tent',name:'20x20 Pole Tent',cost:425,category:{slug:'tent-rentals'}};
 const p=nycProduct(item);
 assert.equal(p.externalId,'fpr:20x20-pole-tent');
 assert.equal(p.price,425);
 assert.equal(p.category,'tent');
 assert.equal(p.visualModelId,'pole-20x20');
 assert.equal(p.photoUrl,'https://friendlypartyrentalnyc.com/api/item-image/20x20-pole-tent');
});
test('NYC category mapping supports inflatables, linens, concessions and packages',()=>{
 assert.equal(nycBaseCategory({name:'Tidal Wave Water Slide',category:{slug:'bounce-house-rentals'}}),'inflatable');
 assert.equal(nycBaseCategory({name:'120 Round Tablecloth',category:{slug:'linen-rentals'}}),'linen');
 assert.equal(nycBaseCategory({name:'Popcorn Machine',category:{slug:'concession-machine-rentals'}}),'concession');
 assert.equal(nycBaseCategory({name:'Graduation Package',category:{slug:'party-rental-packages'}}),'package');
});
test('Syracuse sync is pinned to slug friendly and NYC sync is pinned to friendly-nyc',()=>{
 const source=fs.readFileSync(new URL('../server/src/friendlyCatalogSync.js',import.meta.url),'utf8');
 assert.match(source,/WHERE slug='friendly' LIMIT 1/);
 assert.match(source,/WHERE slug='friendly-nyc' LIMIT 1/);
 assert.match(source,/const NYC_BASE='https:\/\/friendlypartyrentalnyc\.com'/);
 assert.match(source,/NYC_BASE\+'\\/api\\/items'/);
});
