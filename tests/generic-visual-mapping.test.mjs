import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentCatalog,equipmentType} from '../js/data/equipment.js';

test('explicit generic-box mapping gives any physical tenant product a measured planning object',()=>{
  const source=[
    {id:'custom-table',category:'table',name:'Custom Farm Table',visual_model_id:'generic-box',width_ft:8,length_ft:3,price_per_day:85,active:true},
    {id:'custom-tent',category:'tent',name:'Custom Structure',visual_model_id:'generic-box',width_ft:30,length_ft:50,price_per_day:1500,active:true},
    {id:'custom-prop',category:'other',name:'Champagne Wall',visual_model_id:'generic-box',width_ft:6,length_ft:2,price_per_day:125,active:true},
  ];
  for(const p of source)assert.equal(equipmentType(p),'generic');
  const rows=equipmentCatalog(source,true,new Set());
  assert.equal(rows.length,3);
  for(const row of rows){
    assert.equal(row.type,'generic');
    assert.equal(row.visualFidelity,'illustrative');
    assert.equal(row.dimensionsConfirmed,true);
    assert.ok(row.widthFt>0&&row.depthFt>0);
    assert.ok(row.productId);
  }
  assert.equal(rows.find(x=>x.productId==='custom-table').widthFt,8);
  assert.equal(rows.find(x=>x.productId==='custom-tent').depthFt,50);
});

test('unmapped physical products with measured dimensions remain visible as generic equipment',()=>{
  const row=equipmentCatalog([{id:'odd-item',category:'other',name:'Custom Rental Prop',width_ft:5,length_ft:2,active:true}],false,new Set())[0];
  assert.ok(row);
  assert.equal(row.type,'generic');
  assert.equal(row.dimensionsConfirmed,true);
});
