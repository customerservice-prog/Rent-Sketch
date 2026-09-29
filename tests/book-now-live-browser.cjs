// Public-page smoke tests only. No private source or real orders/payments.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const ORIGIN='https://www.friendlypartyrental.com',OUT='qa-book-now-live';
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const day=new Date();day.setUTCDate(day.getUTCDate()+28);const date=day.toISOString().slice(0,10);
 const res=await fetch(ORIGIN+'/api/items?date='+date+'T12%3A00%3A00',{signal:AbortSignal.timeout(20000)});assert.equal(res.ok,true);const catalog=(await res.json()).items;assert.ok(Array.isArray(catalog));
 const live=p=>p.displayToCustomer&&String(p.status).toLowerCase()==='available'&&Number(p.available??p.quantity)>=10&&Number.isFinite(Number(p.cost));
 const chair=catalog.find(p=>live(p)&&p.slug==='white-plastic-folding-chair')||catalog.find(p=>live(p)&&/chair/i.test(p.name)&&!(p.colorOptions||[]).length);assert.ok(chair);
 const linen=catalog.find(p=>live(p)&&/sequin/i.test(p.name)&&(p.colorOptions||[]).length>=2);assert.ok(linen);
 const other=catalog.find(p=>live(p)&&p.id!==chair.id&&p.id!==linen.id&&!p.colorOptions?.length&&!/package|tent/i.test(p.name));assert.ok(other);
 const handoff={version:1,tenant:'friendly',designId:'00000000-0000-4000-8000-000000000099',eventDate:date,source:'qa_no_purchase',surfaceType:'grass',deliveryZip:'13116',items:[{slug:chair.slug,quantity:2},{slug:linen.slug,quantity:2,selectedColor:linen.colorOptions[0]},{slug:linen.slug,quantity:1,selectedColor:linen.colorOptions[1]}]};
 const url=p=>ORIGIN+'/design-your-event/book?auto=1#layout='+encodeURIComponent(JSON.stringify(p));
 const browser=await chromium.launch({headless:true});const results=[],errors=[],blocked=[];
 const contextFor=async(width,seed)=>{
  const context=await browser.newContext({viewport:{width,height:860},serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());
   if(!['GET','HEAD'].includes(req.method())){blocked.push({method:req.method(),path:u.pathname});return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"skipped":true}'});}
   if(/google-analytics|googletagmanager|doubleclick|googleadservices|facebook\.com|facebook\.net/.test(u.hostname))return route.abort();
   return route.continue();
  });
  if(seed)await context.addInitScript(data=>{if(location.hostname.includes('friendlypartyrental.com')&&!sessionStorage.getItem('qa_seed_done')){localStorage.setItem('fpr_cart',JSON.stringify(data));sessionStorage.setItem('qa_seed_done','1');}},seed);
  const page=await context.newPage();page.on('pageerror',e=>errors.push({width,message:e.message}));return{context,page};
 };
 const start=page=>page.locator('label').filter({hasText:'Event starts'}).locator('select');
 const end=page=>page.locator('label').filter({hasText:'Event ends'}).locator('select');
 async function ready(page){await page.getByRole('heading',{name:'Your Event',exact:true}).waitFor({state:'visible',timeout:30000});await page.getByRole('button',{name:'Continue to Delivery →',exact:true}).waitFor({state:'visible'});await page.screenshot({path:OUT+'/ready-'+page.viewportSize().width+'.png',fullPage:true});await start(page).waitFor({state:'visible'});}
 for(const width of [1440,390]){
  const {context,page}=await contextFor(width);
  await page.goto(url(handoff),{waitUntil:'domcontentloaded'});await page.waitForURL(u=>u.pathname.startsWith('/checkout'),{timeout:45000});await ready(page);
  const state=await page.evaluate(()=>({items:JSON.parse(localStorage.getItem('fpr_cart')||'[]'),date:localStorage.getItem('fpr_event_date'),booking:JSON.parse(localStorage.getItem('fpr_rentsketch_booking')||'null'),overflow:document.documentElement.scrollWidth>innerWidth+1}));
  assert.equal(state.items.length,3);assert.equal(state.items.find(x=>x.id===chair.id).quantity,2);
  for(const [color,qty] of [[linen.colorOptions[0],2],[linen.colorOptions[1],1]]){const item=state.items.find(x=>x.id===linen.id&&x.selectedColor===color);assert.ok(item);assert.equal(item.quantity,qty);assert.equal(item.price,Number(linen.cost));}
  assert.equal(state.booking.designId,handoff.designId);assert.equal(state.booking.eventDate,date);assert.equal(state.overflow,false);
  await page.screenshot({path:OUT+'/checkout-'+width+'.png',fullPage:true});await page.reload({waitUntil:'domcontentloaded'});await ready(page);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fpr_cart')).length),3);
  await start(page).selectOption('12:00');await end(page).selectOption('16:00');await page.getByRole('button',{name:'Continue to Delivery →',exact:true}).click();await page.waitForURL(u=>u.pathname==='/checkout/delivery',{timeout:30000});await page.locator('h1').waitFor({state:'visible'});await page.screenshot({path:OUT+'/delivery-'+width+'.png',fullPage:true});
  results.push({scenario:'empty cart automatically reaches rendered checkout and continues to delivery',width,path:new URL(page.url()).pathname,items:state.items.map(i=>({id:i.id,quantity:i.quantity,color:i.selectedColor||null})),eventControlsRendered:true,persistedAfterReload:true,noOverflow:true});await context.close();
 }
 const seed=[{id:chair.id,name:chair.name,price:Number(chair.cost),quantity:8,maxQuantity:Number(chair.available??chair.quantity),eventDate:date,picture:'/api/item-image/'+chair.slug},{id:other.id,name:other.name,price:Number(other.cost),quantity:1,maxQuantity:Number(other.available??other.quantity),eventDate:date,picture:'/api/item-image/'+other.slug}];
 {
  const {context,page}=await contextFor(1280,seed);await page.goto(url(handoff),{waitUntil:'domcontentloaded'});const button=page.getByRole('button',{name:'Add These Rentals & Continue to Checkout'});await button.waitFor({state:'visible'});await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Add These Rentals & Continue to Checkout'&&!b.disabled),{timeout:40000});
  assert.equal(new URL(page.url()).pathname,'/design-your-event/book');await page.waitForFunction(()=>[...document.querySelectorAll('[data-rentsketch-checkout] img')].every(i=>i.complete&&i.naturalWidth>0),{timeout:15000});await page.screenshot({path:OUT+'/existing-cart-review.png',fullPage:true});await button.click();await page.waitForURL(u=>u.pathname.startsWith('/checkout'),{timeout:30000});await ready(page);
  const items=await page.evaluate(()=>JSON.parse(localStorage.getItem('fpr_cart')));assert.equal(items.find(i=>i.id===chair.id).quantity,2);assert.equal(items.find(i=>i.id===other.id).quantity,1);assert.equal(items.length,4);
  results.push({scenario:'existing cart explicitly reviewed, exact matching quantity, unrelated item kept',imagesLoaded:true,items:items.length,chairQuantity:2});await context.close();
 }
 {
  const {context,page}=await contextFor(390,seed);const bad={...handoff,items:[...handoff.items,{slug:'qa-this-item-does-not-exist',quantity:1}]};await page.goto(url(bad),{waitUntil:'domcontentloaded'});await page.getByText('Please confirm these selections',{exact:true}).waitFor({timeout:40000});assert.equal(await page.getByRole('button',{name:'Add These Rentals & Continue to Checkout'}).isDisabled(),true);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('fpr_cart'))),seed);await page.screenshot({path:OUT+'/unmatched-item-blocked.png',fullPage:true});results.push({scenario:'unmatched item blocks all cart changes',cartUnchanged:true});await context.close();
 }
 const files=[];for(const path of ['js/core/bookingHandoff.js','js/ui/booking-handoff.js','designer/index.html','customer-experience.css']){
  const response=await fetch('https://rentsketch.com/'+path+'?qa='+Date.now(),{signal:AbortSignal.timeout(15000)});assert.equal(response.ok,true);const data=Buffer.from(await response.arrayBuffer()),expected=fs.readFileSync(path);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),crypto.createHash('sha256').update(expected).digest('hex'),path+' deployed bytes');files.push({path,match:true});
 }
 assert.deepEqual(errors,[]);const report={results,files,errors,blockedNonReadRequests:blocked,realOrdersCreated:0,realPaymentsSubmitted:0,checkedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA};fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(error=>{console.error(error);fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(OUT+'/failure.txt',String(error.stack||error));process.exit(1);});
