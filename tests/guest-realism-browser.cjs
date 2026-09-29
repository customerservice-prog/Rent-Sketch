// Isolated production-renderer QA. No customer, order, payment or email writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-guest-realism');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const bytes=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}}).listen(8131,'127.0.0.1');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const reports=[],errors=[];
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:8131/tests/guest-realism-harness.html');await page.waitForFunction(()=>window.ready===true);
  for(const mode of ['wide','close','side']){const state=await page.evaluate(mode=>window.renderPose(.033,mode),mode);assert.ok(state.triangles>30000&&state.triangles<180000,'bounded detailed guest geometry');assert.ok(state.calls<=12,'instancing preserves the guest draw-call budget');await page.screenshot({path:out+'/'+mode+'-'+width+'.png'});reports.push({width,mode,...state});}
  const animated=await page.evaluate(()=>{for(let i=0;i<60;i++)window.renderPose(1/30,'wide');return window.renderPose(0,'wide');});await page.screenshot({path:out+'/motion-'+width+'.png'});reports.push({width,mode:'after-two-seconds',...animated});await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({reports,errors,sourceCommit:process.env.GITHUB_SHA,checkedAt:new Date().toISOString()},null,2));console.log('PASS actual guest meshes at desktop/mobile sizes with animated frames and bounded draw calls.');await browser.close();server.close();
})().catch(e=>{console.error(e);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/failure.txt',String(e.stack||e));process.exit(1);});
