// Read-only browser QA; local fixture data and public website images only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-phase4');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(out+'/manifest.json')),catalog=JSON.parse(fs.readFileSync(out+'/catalog.json')),website=JSON.parse(fs.readFileSync(out+'/website.json'));
 const {joinReferences}=require('../server/src/friendlyCatalogReference');const enriched={products:joinReferences(catalog.products,website.items,new Date().toISOString())};
 const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');let data=fs.readFileSync(file);if(file.endsWith('catalog-preview/index.html'))data=Buffer.from(data.toString().replaceAll('https://cdn.jsdelivr.net/npm/three@0.160.0/','/tests/node_modules/three/'));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(data);}catch(_){res.writeHead(404).end();}}).listen(8126,'127.0.0.1');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:700,height:560}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8126/tests/phase4-harness.html');await page.waitForFunction(()=>window.ready===true,{timeout:20000});const rendered=[];
 fs.mkdirSync(out+'/rendered',{recursive:true});
 for(const row of manifest.items){const result=await page.evaluate(id=>window.renderProduct(id),row.productId);rendered.push({...row,...result});if(result.supported)await page.screenshot({path:out+'/rendered/'+row.slug+'.png'});}
 const views=[];fs.mkdirSync(out+'/browser',{recursive:true});
 await page.route('https://rentsketch-api-production.up.railway.app/api/tenants/friendly/products',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(enriched)}));
 for(const width of [900,320])for(const row of rendered.filter(r=>r.supported)){
  await page.setViewportSize({width,height:620});await page.goto('http://127.0.0.1:8126/catalog-preview/?tenant=friendly&productId='+encodeURIComponent(row.productId));await page.waitForFunction(()=>document.querySelector('#visual')?.dataset.renderReady==='1',{timeout:15000});
  const state=await page.evaluate(()=>({productId:document.querySelector('#visual').dataset.productId,overflow:document.documentElement.scrollWidth>innerWidth,status:document.querySelector('#status').textContent}));assert.equal(state.productId,row.productId);assert.equal(state.overflow,false);views.push({slug:row.slug,width,...state});
  if(['cocktail-table-cover-white','120in-round-sequin-tablecloth-rose-gold','725-oz-martini-glass','6-inch-bread-and-butter-plate'].includes(row.slug))await page.screenshot({path:out+'/browser/'+row.slug+'-'+width+'.png'});
 }
 await page.goto('http://127.0.0.1:8126/catalog-preview/?tenant=friendly&productId=unknown-product');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Preview unavailable');assert.equal(await page.locator('canvas').count(),0);
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({rendered,views,errors,sourceCommit:process.env.GITHUB_SHA,checkedAt:new Date().toISOString()},null,2));console.log('PASS Phase 4 browser: '+rendered.filter(r=>r.supported).length+' product renders, '+views.length+' desktop/mobile views; no runtime errors/overflow.');await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
