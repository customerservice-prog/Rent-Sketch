// Isolated render verification. This never submits customer data or bookings.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-seating'),base='a55f64fb2ce883fad078eb128194e38470176349';
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.glb':'model/gltf-binary'};
(async()=>{
 fs.mkdirSync(out,{recursive:true});const cache=new Map();
 const server=http.createServer((req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),baseline=pathname.startsWith('/baseline/');if(baseline)pathname=pathname.slice(9);const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('Invalid path');const rel=path.relative(root,file).split(path.sep).join('/');let bytes;
  if(baseline&&rel.startsWith('js/')){if(!cache.has(rel))cache.set(rel,cp.execFileSync('git',['show',base+':'+rel],{cwd:root,maxBuffer:16000000}));bytes=cache.get(rel);}else bytes=fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch(e){res.writeHead(404);res.end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[],reports=[];
 try{
  for(const baseline of [true,false])for(const width of baseline?[1440]:[1440,390]){
   const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,serviceWorkers:'block'});
   await context.route('**/*',r=>{const q=r.request();return q.method()==='GET'&&q.url().startsWith(origin)?r.continue():r.abort();});
   const p=await context.newPage();p.on('pageerror',e=>{errors.push({baseline,width,error:String(e)});console.error('BROWSER ERROR',baseline,width,e);fs.writeFileSync(path.join(out,'browser-errors.json'),JSON.stringify(errors));});
   await p.goto(origin+(baseline?'/baseline':'')+'/tests/seating-alignment-harness.html',{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>window.ready===true,null,{timeout:45000});
   for(const angle of baseline?[90]:[0,90,180,270]){
    const report=await p.evaluate(a=>window.runCase(a),angle);
    assert.equal(report.unchanged,true);assert.equal(report.rentalCount,5);assert.equal(report.seatCount,32);assert.equal(report.overflow,false);assert.ok(report.seated>=16&&report.seated<=32);
    if(baseline)assert.ok(report.guestsOffChair>0,'Original production must reproduce the visible misalignment');
    else {assert.equal(report.guestsOffChair,0);assert.ok(report.maxSeatDistance<.001);}
    reports.push({baseline,width,angle,...report});
    if(angle===90){await p.screenshot({path:path.join(out,(baseline?'before':'after')+'-'+width+'.png')});await p.evaluate(()=>{window.view.inside();window.view.captureImage();});await p.screenshot({path:path.join(out,(baseline?'before':'after')+'-inside-'+width+'.png')});}
   }
   if(!baseline){for(const chair of ['resin-white','chiavari-gold','crossback-natural']){const report=await p.evaluate(c=>window.runCase(90,c),chair);assert.equal(report.guestsOffChair,0);assert.equal(report.unchanged,true);reports.push({baseline,width,angle:90,chair,...report});}
    await p.evaluate(()=>{window.runCase(90);window.view.setScene({guests:true,motion:true,styling:true,night:false,weather:'clear'});});await p.waitForTimeout(1100);const moving=await p.evaluate(()=>window.alignReport());assert.equal(moving.guestsOffChair,0);reports.push({baseline,width,mode:'motion',...moving});
   }
   await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({base,checkedAt:new Date().toISOString(),reports,errors,realOrdersCreated:0,realPaymentsSubmitted:0},null,2));console.log('PASS '+reports.length+' actual scene rotation/style/motion comparisons; baseline mismatch reproduced and corrected.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'browser-failure.txt'),String(e.stack||e));console.error(e);process.exit(1);});
