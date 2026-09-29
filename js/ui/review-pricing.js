let rates=null,request=0,controller=null,zip='',host=null;
export function reviewDeliveryZip(){return zip;}
export function restoreReviewDeliveryZip(value){
 controller?.abort();request++;rates=null;host=null;
 zip=typeof value==='string'&&/^\d{0,5}$/.test(value.trim())?value.trim():'';
}
const money=n=>n==null?'Needs Friendly confirmation':'$'+Number(n).toFixed(2);
function currentLines(){return window.FriendlyBridge?.computeLineItems?.()||[];}
export function currentReviewPricing(){return rates?{...rates,status:rates.complete?'exact':'incomplete'}:{status:'unavailable',lineItems:[]};}
function render(){
 if(!host?.isConnected)return;
 const value=rates||{};
 const lines=Array.isArray(value.lineItems)?value.lineItems:[];
 const lineHtml=lines.length?'<div class="review-live-lines">'+lines.map(line=>{
   const availability=line.availableForDate===false?'<small style="display:block;color:#a23b2d">Not enough available for this date</small>':line.exactMatch===false?'<small style="display:block;color:#8a5d12">Could not match this item to Friendly live inventory</small>':'';
   return '<div><span>'+String(line.qty)+' × '+String(line.label).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+availability+'</span><strong>'+money(line.amount)+'</strong></div>';
 }).join('')+'</div>':'';
 host.querySelector('.review-cost-lines').innerHTML=lineHtml+
   '<div><span>Rental subtotal</span><strong>'+money(value.rentalSubtotal)+'</strong></div>'+
   '<div><span>Delivery'+(value.zip?' · '+value.zip:'')+'</span><strong>'+money(value.deliveryFee)+'</strong></div>'+
   '<div><span>Sales tax'+(value.taxRate==null?'':' ('+value.taxRate+'%)')+'</span><strong>'+money(value.taxAmount)+'</strong></div>'+
   '<div class="review-grand-total"><span>'+(value.complete?'Exact total':'Total')+'</span><strong>'+money(value.total)+'</strong></div>';
 const note=host.querySelector('.review-cost-note');
 if(value.complete){
   note.textContent='Exact quote from Friendly Party Rental live pricing for the selected rentals, event date, delivery ZIP, delivery charge and sales tax. Availability was checked for the selected date.';
 }else if(!value.eventDate){
   note.textContent='Choose the event date above before an exact quote can be calculated.';
 }else if(!value.zip){
   note.textContent='Enter the delivery ZIP to calculate the exact Friendly delivery charge and tax.';
 }else{
   note.textContent='This is not being presented as an exact quote because one or more items, availability, delivery, or tax still needs Friendly confirmation.';
 }
}
async function calculate(){
 const input=host.querySelector('input'),value=input.value.trim(),status=host.querySelector('.review-pricing-status');
 if(value&&!/^\d{5}$/.test(value)){status.textContent='Enter a five-digit delivery ZIP code.';input.focus();return;}
 zip=value;const token=++request;controller?.abort();controller=new AbortController();rates=null;render();
 const date=document.getElementById('customerDate')?.value||'';
 status.textContent='Checking Friendly live prices, availability, delivery and tax…';
 const button=host.querySelector('button');button.disabled=true;
 const activeController=controller,timer=setTimeout(()=>activeController.abort(),12000);
 try{
  const slug=window.ACTIVE_TENANT?.slug||window.RENTSKETCH_TENANT_SLUG,api=window.RENTSKETCH_API_URL;
  if(!api||!slug)throw new Error('unavailable');
  const response=await fetch(api+'/api/tenants/'+encodeURIComponent(slug)+'/review-pricing',{
    method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
    body:JSON.stringify({zip,eventDate:date,lines:currentLines()})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'unavailable');if(token!==request)return;
  rates=result;render();
  status.textContent=result.complete?'Exact Friendly quote loaded from live checkout data.':'Friendly live pricing checked. Complete the missing information shown below.';
 }catch(error){
  if(token!==request)return;rates=null;render();
  status.textContent='Friendly live pricing could not be verified. No total will be guessed. Please retry or send the plan for manual confirmation.';
 }finally{clearTimeout(timer);if(token===request)button.disabled=false;}
}
export function mountReviewPricing(container){
 controller?.abort();request++;host=container;rates=null;
 host.innerHTML='<section class="review-costs"><h3>Exact Friendly quote</h3><p>RentSketch re-checks every rental against Friendly Party Rental’s live inventory and prices. Enter the delivery ZIP; the event date above is used for availability.</p><form class="review-location"><label>Delivery ZIP<input name="deliveryZip" autocomplete="postal-code" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" aria-label="Event delivery ZIP"></label><button type="submit" class="btn-secondary">Check exact total</button></form><p class="review-pricing-status" role="status"></p><div class="review-cost-lines" aria-live="polite"></div><p class="review-cost-note"></p></section>';
 const input=host.querySelector('input');input.value=zip;
 host.querySelector('form').addEventListener('submit',e=>{e.preventDefault();calculate();});
 input.addEventListener('input',()=>{controller?.abort();request++;rates=null;zip=input.value.trim();host.querySelector('button').disabled=false;render();host.querySelector('.review-pricing-status').textContent='Select Check exact total to refresh Friendly pricing.';window.dispatchEvent(new CustomEvent('rentsketch:requestSave'));});
 document.getElementById('customerDate')?.addEventListener('change',()=>{rates=null;render();});
 render();calculate();
}
