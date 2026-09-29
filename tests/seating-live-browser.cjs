// The test shell supplies only pinned Three.js test dependencies and observers.
// RentSketch runtime modules and assets are fetched from the live production site.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'qa-live-seating'),origin='https://rentsketch.com';
const release=process.env.RELEASE_SHA;
(async()=>{
 assert.match(release||'',/^[a-f0-9]{40}$/);fs.mkdirSync(out,{recursive:true});
 const response=await fetch(origin+'/designer/?tenant=friendly&verify='+release,{signal:AbortSignal.timeout(20000)});assert.equal(response.ok,true);
 const html=await response.text(),matched=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);assert.ok(matched,'Live designer must carry the tested import map');
 const liveImports=JSON.parse(matched[1]).imports;
 let harness=fs.readFileSync('tests/seating-alignment-harness.html','utf8');const localMap=harness.match(/<script type="importmap">([\s\S]*?)<\/script>/);assert.ok(localMap);
 const imports={...liveImports,...JSON.parse(localMap[1]).imports};harness=harness.replace(localMap[0],'<script type="importmap">'+JSON.stringify({imports})+'</script>');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[],reports=[],blocked=[];
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,serviceWorkers:'block'});
   await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(!['GET','HEAD'].includes(req.method())){blocked.push({method:req.method(),path:url.pathname});return route.fulfill({status:200,contentType:'application/json',body:'{"skipped":true}'});}
    if(url.origin===origin&&url.pathname==='/tests/seating-alignment-harness.html')return route.fulfill({status:200,contentType:'text/html',body:harness});
    if(url.origin===origin&&url.pathname.startsWith('/tests/node_modules/three/')){
     const folder=path.join(root,'tests/node_modules/three'),file=path.resolve(root,'.'+url.pathname);assert.ok(file.startsWith(folder+path.sep));return route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(file)});
    }
    return route.continue();
   });
   const p=await context.newPage();p.on('pageerror',e=>{errors.push({width,error:String(e)});console.error(e);});
   await p.goto(origin+'/tests/seating-alignment-harness.html?release='+release,{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>window.ready===true,null,{timeout:60000});
   for(const angle of [90,270]){
    const report=await p.evaluate(a=>window.runCase(a),angle);assert.equal(report.guestsOffChair,0);assert.ok(report.maxSeatDistance<.001);assert.equal(report.seatCount,32);assert.equal(report.rentalCount,5);assert.equal(report.unchanged,true);assert.equal(report.overflow,false);
    const props=await p.evaluate(async()=>{const THREE=await import('/tests/node_modules/three/build/three.module.js');const rim=window.scene.getObjectByName('Table styling · rim');let min=1;for(let i=0;i<rim.count;i++){const m=new THREE.Matrix4();rim.getMatrixAt(i,m);m.premultiply(rim.matrixWorld);min=Math.min(min,Math.abs(new THREE.Vector3(0,0,1).transformDirection(m).y));}return{count:rim.count,minVerticalNormal:min};});
    assert.ok(props.count>0);assert.ok(props.minVerticalNormal>.9999);reports.push({width,angle,...report,props});
    if(angle===90)await p.screenshot({path:path.join(out,'live-corrected-'+width+'.png')});
   }
   await p.evaluate(()=>{window.runCase(90,'resin-white');window.view.setScene({guests:true,motion:true,styling:true,night:false,weather:'clear'});});await p.waitForTimeout(1100);const motion=await p.evaluate(()=>window.alignReport());assert.equal(motion.guestsOffChair,0);assert.equal(motion.seatCount,32);reports.push({width,mode:'resin-motion',...motion});
   await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({release,liveDesignerStatus:response.status,reports,errors,blockedNonReadRequests:blocked,realOrdersCreated:0,realPaymentsSubmitted:0,checkedAt:new Date().toISOString()},null,2));console.log('PASS '+reports.length+' live runtime seating/rotation/motion checks, level tabletop props and unchanged 32-seat/5-table layout.');
 }finally{await browser.close();}
})().catch(e=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure.txt'),String(e.stack||e));console.error(e);process.exit(1);});
