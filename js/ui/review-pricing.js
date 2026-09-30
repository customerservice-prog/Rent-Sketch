let rates=null,request=0,controller=null,bindings=null,zip='',host=null,timer=null,acceptedKey='',acceptedAt=0;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n==null||!Number.isFinite(Number(n))?'Pending':'$'+Number(n).toFixed(2);
const currentLines=()=>window.FriendlyBridge?.computeLineItems?.()||[];
const currentDate=()=>document.getElementById('customerDate')?.value||'';
const details=()=>({zip,eventDate:currentDate(),lines:currentLines().map(({productId,qty,selectedColor,category,label})=>({productId,qty,selectedColor,category,label}))});
const key=()=>JSON.stringify(details());
export function reviewDeliveryZip(){return zip;}
function invalidate(){controller?.abort();request++;rates=null;acceptedKey='';acceptedAt=0;clearTimeout(timer);if(host?.isConnected){const button=host.querySelector('button');if(button)button.disabled=false;render();}}
export function restoreReviewDeliveryZip(value){invalidate();bindings?.abort();host=null;zip=typeof value==='string'&&/^\d{0,5}$/.test(value.trim())?value.trim():'';}
export function currentReviewPricing(){
 const valid=rates&&acceptedKey===key()&&Date.now()-acceptedAt<60000;
 return valid?{...rates,status:rates.complete?'exact':'incomplete'}:{status:'unavailable',complete:false,total:null,lineItems:[],zip,eventDate:currentDate()};
}
function render(){
 if(!host?.isConnected)return;
 const value=currentReviewPricing(),lines=value.lineItems||[];
 const row=(label,amount,klass='')=>'<div'+(klass?' class="'+klass+'"':'')+'><span>'+esc(label)+'</span><strong>'+money(amount)+'</strong></div>';
 let html=lines.length?'<div class="review-live-lines">'+lines.map(line=>'<div><span>'+esc(line.qty)+' × '+esc(line.label)+(line.unitPrice!=null?'<span class="review-unit-price">'+money(line.unitPrice)+' each</span>':'')+(line.error?'<small>'+esc(line.error)+'</small>':line.availableForDate===false?'<small>Quantity unavailable for these dates</small>':'')+'</span><strong>'+money(line.amount)+'</strong></div>').join('')+'</div>':'';
 html+=row('Rental subtotal',value.baseRentalSubtotal);
 if(value.durationFee)html+=row(value.durationTier?.label||'Rental duration',value.durationFee);
 html+=row('Delivery'+(value.zip?' · '+value.zip:''),value.deliveryFee);
 for(const [label,amount] of [['Damage waiver',value.damageWaiverFee],['Table & chair setup',value.furnitureServices?.setupFee],['Table & chair takedown',value.furnitureServices?.takedownFee],['Special services',value.specialRequestTotal],['Last-minute booking',value.lastMinuteFee],['Exact delivery',value.exactDeliveryFee],['Exact pickup',value.exactPickupFee]])if(amount)html+=row(label,amount);
 html+=row('Sales tax'+(value.taxRate==null?'':' ('+value.taxRate+'%)'),value.taxAmount)+row(value.complete?'Friendly quote total':'Quote total',value.total,'review-grand-total');
 if(value.complete&&value.depositAmount!=null)html+=row('Deposit at checkout',value.depositAmount);
 host.querySelector('.review-cost-lines').innerHTML=html;
 const needs=[...(value.missing||[]),...(value.issues||[])];
 host.querySelector('.review-cost-note').textContent=needs.length?needs.join(' '):value.complete?'Calculated by Friendly Party Rental using its current catalog and standard delivery settings. Changing the duration, services or discount in checkout recalculates the total.':!currentDate()?'Choose the event date to check availability and total.':!/^\d{5}$/.test(zip)?'Enter the delivery ZIP to include delivery and tax.':'Waiting for Friendly to verify this quote.';
}
function schedule(){invalidate();timer=setTimeout(()=>calculate(),350);}
export async function refreshReviewPricing(){return calculate();}
async function calculate(){
 if(!host?.isConnected)return null;
 const target=host,input=target.querySelector('[name="deliveryZip"]'),status=target.querySelector('.review-pricing-status');
 zip=input.value.trim();invalidate();
 if(zip&&!/^\d{5}$/.test(zip)){status.textContent='Enter a five-digit delivery ZIP.';return null;}
 const sent=details(),sentKey=JSON.stringify(sent),token=++request;
 if(!sent.lines.length){status.textContent='Add rentals before checking the quote.';return null;}
 controller=new AbortController();const localController=controller,timeout=setTimeout(()=>localController.abort(),25000);
 const button=target.querySelector('button');button.disabled=true;status.textContent='Checking Friendly’s current item prices, availability, delivery and tax…';
 try{
  const slug=window.ACTIVE_TENANT?.slug||window.RENTSKETCH_TENANT_SLUG,api=window.RENTSKETCH_API_URL;
  if(!api||!slug)throw Error('Friendly pricing connection is unavailable.');
  const response=await fetch(api+'/api/tenants/'+encodeURIComponent(slug)+'/review-pricing',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},signal:localController.signal,body:JSON.stringify(sent)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Friendly could not verify the quote.');
  if(token!==request||host!==target||sentKey!==key())return null;
  rates=result;acceptedKey=sentKey;acceptedAt=Date.now();render();
  status.textContent=result.complete?'Current Friendly quote verified.':'Current item prices loaded. Complete the details below for the total.';
  window.dispatchEvent(new CustomEvent('rentsketch:quoteVerified',{detail:result}));return currentReviewPricing();
 }catch(error){
  if(token!==request)return null;rates=null;render();status.textContent=(error.name==='AbortError'?'The pricing check timed out.':error.message)+' No total has been guessed. Please retry.';return null;
 }finally{clearTimeout(timeout);if(token===request)button.disabled=false;}
}
export function mountReviewPricing(container){
 invalidate();bindings?.abort();bindings=new AbortController();host=container;const options={signal:bindings.signal};
 host.innerHTML='<section class="review-costs"><h3>Your Friendly quote</h3><p>These prices come from Friendly Party Rental—not a separate RentSketch price list. Add your event date and delivery ZIP to see the current standard-delivery quote.</p><form class="review-location review-location-parity"><label>Event date<input type="date" name="quoteEventDate" aria-label="Quote event date"></label><label>Delivery ZIP<input name="deliveryZip" autocomplete="postal-code" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" aria-label="Event delivery ZIP"></label><button type="submit" class="btn-secondary">Refresh quote</button></form><p class="review-pricing-status" role="status"></p><div class="review-cost-lines" aria-live="polite"></div><p class="review-cost-note"></p></section>';
 const date=host.querySelector('[name="quoteEventDate"]'),input=host.querySelector('[name="deliveryZip"]');date.value=currentDate();input.value=zip;
 host.querySelector('form').addEventListener('submit',e=>{e.preventDefault();calculate();},options);
 date.addEventListener('change',()=>{const customer=document.getElementById('customerDate');if(customer&&customer.value!==date.value){customer.value=date.value;customer.dispatchEvent(new Event('change',{bubbles:true}));}schedule();},options);
 input.addEventListener('input',()=>{zip=input.value.trim();schedule();window.dispatchEvent(new CustomEvent('rentsketch:requestSave'));},options);
 document.getElementById('customerDate')?.addEventListener('change',()=>{date.value=currentDate();schedule();},options);
 window.addEventListener('rentsketch:requestSave',()=>{if(rates&&acceptedKey!==key())schedule();},options);
 window.addEventListener('focus',()=>{if(host?.isConnected&&document.getElementById('step-review')?.classList.contains('active'))calculate();},options);
 render();calculate();
}
// Expose a refresh for print/send without installing duplicate module instances.
window.RentSketchQuotePricing={refresh:refreshReviewPricing,current:currentReviewPricing};
