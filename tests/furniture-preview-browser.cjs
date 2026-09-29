// Read-only catalog inputs, local app/renderer; blocks all production writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-furniture-browser');fs.mkdirSync(out,{recursive:true});
 const source=await fetch('https://rentsketch-api-production.up.railway.app/api/tenants/friendly/products',{signal:AbortSignal.timeout(15000)});assert.ok(source.ok);const catalog=await source.json();
 const rows=catalog.products.filter(p=>['table','chair'].includes(p.category)&&String(p.external_id).startsWith('fpr:'));assert.equal(rows.length,14,'All current Friendly furniture SKUs are covered');
 const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+decodeURIComponent(pathname)+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(file));}catch(e){res.writeHead(404).end();}}).listen(8125,'127.0.0.1');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext();
 const errors=[],blockedWrites=[];await context.route('**/api/**',async route=>{const req=route.request();if(!['GET','HEAD','OPTIONS'].includes(req.method())){blockedWrites.push(req.url());return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'Read-only QA'})});}if(req.url().endsWith('/api/tenants/friendly/products'))return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(catalog)});return route.continue();});
 await context.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',async route=>{const pathname=new URL(route.request().url()).pathname.replace('/npm/three@0.160.0/','');const file=path.join(root,'tests/node_modules/three',pathname);return route.fulfill({status:200,contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(file)});});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));const report=[];
 for(const viewport of [{width:580,height:420},{width:320,height:280}]){
   await page.setViewportSize(viewport);
   for(const p of rows){
     await page.goto('http://127.0.0.1:8125/catalog-preview/?tenant=friendly&productId='+encodeURIComponent(p.id));
     await page.waitForSelector('#visual[data-render-ready="1"]',{timeout:20000});
     const result=await page.evaluate(()=>({name:document.getElementById('name').textContent,productId:document.getElementById('visual').dataset.productId,canvasCount:document.querySelectorAll('#visual canvas').length,status:document.getElementById('status').textContent,width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
     assert.equal(result.name,p.name);assert.equal(result.productId,String(p.id));assert.equal(result.canvasCount,1);assert.match(result.status,/Live RentSketch 3D/);assert.ok(result.scrollWidth<=result.width+1,'No horizontal overflow: '+p.name);report.push({name:p.name,viewport,result});
     if(['round-5ft','resin-white','throne-queen-tiffany','cocktail'].includes(p.visual_model_id))await page.screenshot({path:out+'/'+p.external_id.slice(4)+'-'+viewport.width+'.png'});
   }
 }
 // A valid unmapped item must not silently render a default chair/tent as exact.
 await page.goto('http://127.0.0.1:8125/catalog-preview/?tenant=friendly&productId=missing-item');await page.waitForFunction(()=>document.getElementById('status').textContent==='Preview unavailable');assert.equal(await page.locator('canvas').count(),0);
 // Force a WebGL context loss; the screen must identify its static fallback.
 await page.goto('http://127.0.0.1:8125/catalog-preview/?tenant=friendly&productId='+rows[0].id);await page.waitForSelector('#visual[data-render-ready="1"]');await page.evaluate(()=>{document.querySelector('#visual canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true}));});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('not live 3D'));
 assert.deepEqual(errors,[],'No runtime errors');assert.deepEqual(blockedWrites,[],'Preview must not attempt to mutate production data');
 fs.writeFileSync(out+'/report.json',JSON.stringify({checkedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA,comparisons:report,errors,blockedWrites,unknownItem:'passed',contextLossFallback:'passed'},null,2));await browser.close();server.close();console.log('PASS real catalog audit 3D preview: '+report.length+' desktop/mobile product views, no runtime errors, no overflow, no production writes.');
})().catch(error=>{console.error(error);process.exit(1);});
