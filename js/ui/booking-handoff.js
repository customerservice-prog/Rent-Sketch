import {buildBookingHandoff,friendlyBookingUrl} from '../core/bookingHandoff.js?v=20260929-book-now-1';
let products=[],busy=false;
const params=new URLSearchParams(location.search),section=document.getElementById('friendlyBooking'),button=document.getElementById('btnBookRentals'),status=document.getElementById('bookingStatus');
const tenant=()=>window.ACTIVE_TENANT?.slug||window.RENTSKETCH_TENANT_SLUG;
function show(){
 if(section)section.hidden=tenant()!=='friendly';
 if(button&&tenant()==='friendly')button.textContent='Book Now — Finish Checkout';
 if(section&&tenant()==='friendly'){
  const p=section.querySelector('p:not(#bookingStatus)');if(p)p.textContent='Send these exact rentals and colors to your Friendly cart. Finish delivery details and payment on the website. This starts a new checkout; it does not change an existing order.';
 }
}
window.addEventListener('rentsketch:catalogReady',e=>{products=e.detail?.products||[];show();});
window.addEventListener('rentsketch:tenantReady',show);show();
button?.addEventListener('click',async()=>{
 if(busy||tenant()!=='friendly')return;
 busy=true;button.disabled=true;if(status)status.textContent='Saving your plan and checking the item transfer…';
 try{
  if(!products.length){
   const response=await fetch(window.RENTSKETCH_API_URL+'/api/tenants/friendly/products',{signal:AbortSignal.timeout(10000),cache:'no-store'});
   if(!response.ok)throw new Error('Could not check your rentals. Please retry.');products=(await response.json()).products||[];
  }
  const bridge=window.FriendlyBridge;
  const build=()=>buildBookingHandoff({tenant:tenant(),lines:bridge?.computeLineItems?.(),products,eventDate:document.getElementById('customerDate')?.value,source:params.get('source')||'designer',surfaceType:bridge?.getScene?.()?.surfaceType,deliveryZip:bridge?.currentReviewPricing?.()?.zip||''});
  const payload=build(),before=JSON.stringify(payload);
  if(!payload.eventDate){document.getElementById('customerDate')?.focus();throw new Error('Choose your event date before booking.');}
  const autosave=window.RentSketchAutosave;if(!autosave?.flush)throw new Error('Your design is still starting. Please try again in a moment.');
  const savedId=await autosave.flush();
  if(typeof savedId!=='string'||!/^[a-z0-9-]{8,100}$/i.test(savedId))throw new Error('Your plan could not be saved yet. Please retry; your cart has not changed.');
  if(JSON.stringify(build())!==before)throw new Error('Your selections changed while saving. Click Book Now again to transfer the updated plan.');
  payload.designId=savedId;const url=friendlyBookingUrl(payload),parent=params.get('parentOrigin');
  if(window.parent!==window&&['https://www.friendlypartyrental.com','https://friendlypartyrental.com'].includes(parent)){
   window.parent.postMessage({type:'rentsketch.bookingRequested',tenant:'friendly',booking:payload},parent);
   if(status){status.replaceChildren(document.createTextNode('Opening your Friendly checkout. '));const link=document.createElement('a');link.href=url;link.target='_top';link.textContent='Continue to Friendly checkout';status.appendChild(link);}
  }else window.location.assign(url);
 }catch(error){if(status)status.textContent=error.name==='AbortError'||error.name==='TimeoutError'?'The catalog check timed out. Please retry.':error.message||'Could not prepare your rentals. Please retry.';}
 finally{busy=false;button.disabled=false;}
});
