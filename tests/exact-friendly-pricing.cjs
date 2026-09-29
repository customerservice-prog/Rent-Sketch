const assert=require('node:assert/strict');
const {reviewPricing}=require('../server/src/reviewPricing');

function response(body,status=200){
  return {ok:status>=200&&status<300,json:async()=>body};
}
function makeFetch(routes){
  return async function(url){
    const u=new URL(url);
    const hit=routes[u.pathname+(u.search||'')] ?? routes[u.pathname];
    if(!hit) throw new Error('Unexpected URL '+u.pathname+u.search);
    return response(hit.body,hit.status||200);
  };
}
(async()=>{
  const tenant={slug:'friendly',show_prices:true};
  const eventDate='2099-06-20';
  const fetcher=makeFetch({
    ['/api/items?date='+eventDate]:{body:{items:[
      {id:'db-chair-1',name:'White Plastic Folding Chair',cost:2.5,available:100},
      {id:'db-table-1',name:"5' Round Table",cost:15,available:10},
    ]}},
    '/api/tax-rate':{body:{rate:{rate:8,isActive:true}}},
    '/api/delivery-fee?zip=13116':{body:{fee:40,distance:6}},
    '/api/pricing-tiers':{body:{tiers:[{id:'one',label:'1 Day',minDays:1,maxDays:1,percent:0}]}}
  });
  const exact=await reviewPricing(tenant,{
    zip:'13116',eventDate,
    lines:[
      {label:'White Plastic Folding Chair',qty:20,productId:'legacy-plastic-white',category:'chair'},
      {label:"5' Round Table",qty:2,productId:'db-table-1',category:'table'},
    ]
  },fetcher);
  assert.equal(exact.complete,true);
  assert.equal(exact.lineItems[0].matchedBy,'exact_name');
  assert.equal(exact.lineItems[1].matchedBy,'id');
  assert.equal(exact.lineItems[0].unitPrice,2.5);
  assert.equal(exact.lineItems[1].unitPrice,15);
  assert.equal(exact.rentalSubtotal,80);
  assert.equal(exact.deliveryFee,40);
  assert.equal(exact.taxAmount,9.6);
  assert.equal(exact.total,129.6);

  const ambiguousFetcher=makeFetch({
    ['/api/items?date='+eventDate]:{body:{items:[
      {id:'a',name:'Cocktail Table',cost:12,available:10},
      {id:'b',name:'Cocktail Table',cost:14,available:10},
    ]}},
    '/api/tax-rate':{body:{rate:{rate:8,isActive:true}}},
    '/api/delivery-fee?zip=13116':{body:{fee:40,distance:6}},
    '/api/pricing-tiers':{body:{tiers:[{id:'one',label:'1 Day',minDays:1,maxDays:1,percent:0}]}}
  });
  const ambiguous=await reviewPricing(tenant,{zip:'13116',eventDate,lines:[{label:'Cocktail Table',qty:1,productId:'legacy-cocktail'}]},ambiguousFetcher);
  assert.equal(ambiguous.complete,false);
  assert.equal(ambiguous.lineItems[0].exactMatch,false);
  assert.equal(ambiguous.lineItems[0].unitPrice,null);
  assert.equal(ambiguous.total,null);

  const shortageFetcher=makeFetch({
    ['/api/items?date='+eventDate]:{body:{items:[{id:'db-chair-1',name:'White Plastic Folding Chair',cost:2.5,available:5}]}},
    '/api/tax-rate':{body:{rate:{rate:8,isActive:true}}},
    '/api/delivery-fee?zip=13116':{body:{fee:40,distance:6}},
    '/api/pricing-tiers':{body:{tiers:[{id:'one',label:'1 Day',minDays:1,maxDays:1,percent:0}]}}
  });
  const shortage=await reviewPricing(tenant,{zip:'13116',eventDate,lines:[{label:'White Plastic Folding Chair',qty:20,productId:'db-chair-1'}]},shortageFetcher);
  assert.equal(shortage.complete,false);
  assert.equal(shortage.lineItems[0].availableForDate,false);
  assert.equal(shortage.total,null);

  console.log('PASS exact Friendly pricing: live IDs/names, availability, delivery, tax, and fail-closed behavior verified.');
})().catch(err=>{console.error(err);process.exitCode=1;});
