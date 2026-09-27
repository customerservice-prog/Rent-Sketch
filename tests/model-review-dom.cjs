const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),root=path.resolve(__dirname,'..');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
function visuals(){let handler;vm.runInNewContext(fs.readFileSync(path.join(root,'server/src/routes/visualLibrary.js'),'utf8'),{module:{exports:{}},require:()=>({Router:()=>({get:(_path,callback)=>handler=callback})})});let result;handler({query:{}},{json:value=>result=value});return result;}
test('admin inspection uses fixed public preview, escapes catalog values, and clears on session loss',async()=>{
  const dom=new JSDOM('<div id="app"></div>',{url:'https://rentsketch.com/dashboard/?tenantView=1#/products',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  const product={id:'post',name:'PRIVATE <img src=x onerror=alert(1)> Post',category:'other',visual_model_id:'stanchion',photo_url:'javascript:alert(1)',width_ft:null,length_ft:null,active:true};
  let identity='session-a',rejectUpdate=false;const calls=[];
  w.alert=()=>{};w.RentSketchDashboardSession={identity:()=>identity,ready:async()=>{},clear:async()=>{},json:async(url,options={})=>{calls.push([url,options]);if(url==='/api/auth/me')return{user:{id:'staff',displayName:'QA',isPlatformAdmin:false},tenants:[{slug:'friendly',name:'QA Rentals',role:'admin'}]};if(url==='/api/tenants/friendly/products')return{products:[product]};if(url==='/api/visual-library')return visuals();if(options.method==='PATCH'){if(rejectUpdate)throw new Error('update rejected');return {product};}throw new Error(url);}};
  w.eval(fs.readFileSync(path.join(root,'dashboard/app.js'),'utf8'));await flush();
  const button=w.document.querySelector('[data-review-visual]');assert.ok(button);assert.equal(button.hidden,false);button.click();
  let dialog=w.document.querySelector('dialog');assert.ok(dialog);assert.equal(dialog.querySelector('iframe').src,'https://rentsketch.com/designer/model-review.html?visual=stanchion');assert.equal(dialog.querySelectorAll('img').length,0,'script photo URL is not inserted');assert.match(dialog.textContent,/width not supplied/);assert.match(dialog.textContent,/<img src=x/);assert.equal(dialog.querySelectorAll('[onerror]').length,0);
  dialog.querySelector('[data-close-review]').click();assert.equal(w.document.querySelector('dialog'),null);assert.equal(w.document.activeElement,button);
  const select=w.document.querySelector('.visual-select');rejectUpdate=true;select.value='fan';select.dispatchEvent(new w.Event('change'));await flush();assert.equal(select.value,'stanchion','rejected mapping restores saved visual');
  button.click();assert.ok(w.document.querySelector('dialog'));identity='';w.dispatchEvent(new w.CustomEvent('rentsketch:dashboardSessionChanged',{detail:{reason:'signed-out'}}));await flush();assert.equal(w.document.querySelector('iframe'),null);assert.doesNotMatch(w.document.body.textContent,/PRIVATE/);assert.ok(w.document.querySelector('#loginForm'));dom.window.close();
});
