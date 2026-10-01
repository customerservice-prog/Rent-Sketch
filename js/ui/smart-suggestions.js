(function(){
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('showcase')||params.get('focus'))return;
  const slug=window.RENTSKETCH_TENANT_SLUG||params.get('tenant')||'generic';
  if(!slug||slug==='generic')return;
  const base=window.RENTSKETCH_API_URL||'https://rentsketch-api-production.up.railway.app';

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function mount(data){
    if(!data?.enabled||document.getElementById('rsSmartSuggestions'))return;
    const rows=(data.pairs||[]).slice(0,3);
    if(!rows.length)return;
    const card=document.createElement('aside');
    card.id='rsSmartSuggestions';
    card.className='rs-smart-suggestions';
    card.setAttribute('aria-label','Popular rental combinations');
    card.innerHTML='<button type="button" class="rs-smart-close" aria-label="Dismiss suggestions">×</button>'+
      '<div class="rs-smart-kicker">POPULAR WITH SIMILAR LAYOUTS</div>'+
      '<strong>Customers often plan these together</strong>'+
      '<div class="rs-smart-list">'+rows.map(row=>'<div><span>'+esc(row.name)+'</span><em>'+Number(row.count||0)+' layouts</em></div>').join('')+'</div>'+
      '<p>Based on aggregate saved layouts from this rental company—not a guarantee of fit or availability.</p>';
    card.querySelector('.rs-smart-close').onclick=()=>card.remove();
    document.body.appendChild(card);
    if(!document.getElementById('rsSmartSuggestionsStyle')){
      const style=document.createElement('style');style.id='rsSmartSuggestionsStyle';style.textContent=`
      .rs-smart-suggestions{position:fixed;z-index:36;left:18px;bottom:18px;width:min(340px,calc(100vw - 36px));padding:16px 16px 14px;border:1px solid #c9d9ea;border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 18px 55px rgba(20,45,76,.16);backdrop-filter:blur(16px);font-family:Inter,system-ui,sans-serif}
      .rs-smart-close{position:absolute;right:9px;top:8px;border:0;background:transparent;color:#8090a3;font-size:20px;line-height:1;cursor:pointer}
      .rs-smart-kicker{color:#56769f;font-size:8px;letter-spacing:.13em;font-weight:900;margin-bottom:6px}
      .rs-smart-suggestions>strong{display:block;color:#18304d;font-size:13px;padding-right:22px}
      .rs-smart-list{display:grid;gap:6px;margin:11px 0}
      .rs-smart-list div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 9px;border:1px solid #e1e8f0;border-radius:9px;background:#f8fafc}
      .rs-smart-list span{font-size:9px;line-height:1.35;color:#415873;font-weight:750}
      .rs-smart-list em{font-style:normal;font-size:8px;color:#6f8298;white-space:nowrap}
      .rs-smart-suggestions p{margin:0;color:#8491a1;font-size:8px;line-height:1.45}
      @media(max-width:600px){.rs-smart-suggestions{left:10px;bottom:10px;width:calc(100vw - 20px);padding:13px}.rs-smart-list{max-height:110px;overflow:auto}}
      `;document.head.appendChild(style);
    }
  }
  async function load(){
    try{
      const response=await fetch(base+'/api/tenants/'+encodeURIComponent(slug)+'/design-suggestions',{headers:{Accept:'application/json'}});
      if(!response.ok)return;
      mount(await response.json());
    }catch(_){}
  }
  if(window.RENTSKETCH_CATALOG_READY)load();
  else window.addEventListener('rentsketch:catalogReady',load,{once:true});
})();