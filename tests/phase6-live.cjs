// Production GET-only checks. Isolated carts are discarded; no orders/payments/emails.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const SITE='https://www.friendlypartyrental.com',RS='https://rentsketch.com',API='https://rentsketch-api-production.up.railway.app',OUT='qa-phase6-live';
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const release=process.env.RELEASE_SHA;assert.match(release||'',/^[a-f0-9]{40}$/);
 const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});assert.equal(r.ok,true,url);return r.json();};
 const load=async file=>import('data:text/javascript;base64,'+fs.readFileSync(file).toString('base64'));
 const {PHASE6_SLUGS,phase6Reference}=await load('js/data/phase6-reference.js');
 const {buildBookingHandoff,friendlyBookingUrl}=await load('js/core/bookingHandoff.js');
 const products=(await get(API+'/api/tenants/friendly/products')).products;
 const d=new Date();d.setUTCDate(d.getUTCDate()+28);const date=d.toISOString().slice(0,10);
 const website=(await get(SITE+'/api/items?date='+date+'T12%3A00%3A00')).items;
 const identities=PHASE6_SLUGS.map(slug=>{
  const matches=products.filter(p=>p.external_id==='fpr:'+slug&&p.active!==false);assert.equal(matches.length,1,slug);const p=matches[0],web=website.filter(w=>w.slug===slug);assert.equal(web.length,1,slug);
  const qty=slug==='32-gallon-trash-can'?2:1;
  const handoff=buildBookingHandoff({tenant:'friendly',products,lines:[{productId:p.id,label:p.name,qty,category:p.category}],eventDate:date,designId:'00000000-0000-4000-8000-000000000066'});
  assert.equal(handoff.items[0].slug,slug);assert.equal(handoff.items[0].quantity,qty);assert.equal(handoff.items[0].price,undefined);
  return{slug,productId:p.id,websiteItemId:web[0].id,quantity:qty,referenceOnly:phase6Reference(p).kind==='reference-only'};
 });
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[],blocked=[],views=[];
 const guard=context=>context.route('**/*',route=>{const r=route.request();if(!['GET','HEAD'].includes(r.method())){blocked.push({method:r.method(),path:new URL(r.url()).pathname});return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"skipped":true}'});}return route.continue();});
 const context=await browser.newContext({viewport:{width:1000,height:760},serviceWorkers:'block'});await guard(context);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 for(const width of [1000,390])for(const row of identities){
  await page.setViewportSize({width,height:760});await page.goto(RS+'/catalog-preview/?tenant=friendly&productId='+row.productId,{waitUntil:'domcontentloaded'});
  if(row.referenceOnly){await page.waitForFunction(()=>document.getElementById('status').textContent==='Reference conflict — no verified model');assert.equal(await page.locator('canvas').count(),0);}
  else{await page.waitForFunction(()=>document.getElementById('visual').dataset.renderReady==='1',null,{timeout:30000});assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.locator('#visual').getAttribute('data-product-id'),row.productId);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,row.slug);
  if(['cotton-candy-machinefloss-maker','cornhole','photobooth-6-hour-no-attendant','keg-coolertub'].includes(row.slug))await page.screenshot({path:OUT+'/'+row.slug+'-'+width+'.png'});
  views.push({slug:row.slug,width,liveModel:!row.referenceOnly,noOverflow:true});
 }
 const config=products.find(p=>p.external_id==='fpr:cotton-candy-floss-sugar-pink');assert.ok(config);
 await page.goto(RS+'/catalog-preview/?tenant=friendly&productId='+config.id,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('status').textContent==='Configuration item — no standalone model');assert.equal(await page.locator('canvas').count(),0);
 await context.close();
 const preferred=['cornhole','large-connect-four','popcorn-machine','cotton-candy-machinefloss-maker','32-gallon-trash-can','120-quart-hard-ice-chest-cooler','photobooth-6-hour-no-attendant','red-carpet'];
 const chosen=preferred.map(slug=>identities.find(r=>r.slug===slug)).filter(r=>{const w=website.find(w=>w.id===r.websiteItemId);return w.displayToCustomer===true&&String(w.status).toLowerCase()==='available'&&Number(w.available??w.quantity)>=r.quantity&&w.cost!=null&&Number.isFinite(Number(w.cost))&&!(w.colorOptions||[]).length;});
 assert.ok(chosen.length>=4,'Need at least four currently bookable Phase 6 items for cart verification; reconcile availability instead of weakening this check.');
 const payload=buildBookingHandoff({tenant:'friendly',products,lines:chosen.map(r=>({productId:r.productId,label:r.slug,qty:r.quantity,category:'rental'})),eventDate:date,designId:'00000000-0000-4000-8000-000000000066',source:'phase6_qa_no_purchase',surfaceType:'grass',deliveryZip:'13116'});
 const carts=[];
 for(const width of [1440,390]){
  const c=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});await guard(c);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.goto(friendlyBookingUrl(payload),{waitUntil:'domcontentloaded'});await p.waitForURL(u=>u.pathname.startsWith('/checkout'),{timeout:45000});await p.locator('label').filter({hasText:'Event starts'}).locator('select').waitFor({timeout:30000});
  const state=await p.evaluate(()=>({cart:JSON.parse(localStorage.getItem('fpr_cart')||'[]'),booking:JSON.parse(localStorage.getItem('fpr_rentsketch_booking')||'null'),overflow:document.documentElement.scrollWidth>innerWidth+1}));assert.equal(state.cart.length,chosen.length);assert.equal(state.booking.designId,payload.designId);assert.equal(state.overflow,false);
  for(const row of chosen){const item=state.cart.find(i=>i.id===row.websiteItemId);assert.ok(item,row.slug);assert.equal(item.quantity,row.quantity);assert.equal(item.price,Number(website.find(w=>w.id===row.websiteItemId).cost));}
  await p.locator('label').filter({hasText:'Event starts'}).locator('select').selectOption('12:00');await p.locator('label').filter({hasText:'Event ends'}).locator('select').selectOption('17:00');await p.getByRole('button',{name:/Continue to Delivery/}).click();await p.waitForURL(u=>u.pathname==='/checkout/delivery');await p.screenshot({path:OUT+'/cart-delivery-'+width+'.png',fullPage:true});await p.reload({waitUntil:'domcontentloaded'});assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('fpr_cart')||'[]').length),chosen.length);
  carts.push({width,items:chosen.map(r=>({slug:r.slug,quantity:r.quantity})),currentWebsitePrices:true,path:'/checkout/delivery',persisted:true});await c.close();
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(OUT+'/report.json',JSON.stringify({release,identities,views,configurationNotAMachine:true,carts,notInCartSmokeTest:preferred.filter(s=>!chosen.some(r=>r.slug===s)),errors,blockedNonReadRequests:blocked,realOrdersCreated:0,realPaymentsSubmitted:0,checkedAt:new Date().toISOString()},null,2));console.log('PASS '+identities.length+' identities, '+views.length+' live previews, and '+chosen.length+' live source items through cart into delivery on desktop/mobile.');await browser.close();
})().catch(e=>{fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(OUT+'/failure.txt',String(e.stack||e));console.error(e);process.exit(1);});
