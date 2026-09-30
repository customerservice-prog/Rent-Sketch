// Friendly alone calculates the quote. This adapter supplies selection identity,
// not prices or rates. products must be loaded by the authenticated tenant route.
const URL='https://www.friendlypartyrental.com/api/rentsketch/quote';
const inputError=message=>Object.assign(new Error(message),{status:400});
function selectionsForQuote(lines,products){
 if(!Array.isArray(lines)||!lines.length||lines.length>200)throw inputError('Add rentals to the plan before checking the quote.');
 const selections=new Map(),unmatched=[];
 for(const line of lines){
  if(['tax','delivery','quote_fee'].includes(line?.category))continue;
  if(!line||!Number.isInteger(line.qty)||line.qty<1||line.qty>1000)throw inputError('Check the quantity for '+(line?.label||'this rental')+'.');
  const matches=products.filter(p=>p.id===line.productId&&p.active!==false),p=matches.length===1?matches[0]:null;
  const external=String(p?.external_id||''),slug=external.startsWith('fpr:')?external.slice(4):'';
  if(!p||!/^[-a-z0-9]{1,180}$/.test(slug)){
   unmatched.push({label:String(line.label||'Rental item').slice(0,240),qty:line.qty,productId:line.productId||null,category:line.category||'rental',selectedColor:line.selectedColor||null,unitPrice:null,amount:null,exactMatch:false,error:'This item needs a verified Friendly product link.'});continue;
  }
  const selectedColor=typeof line.selectedColor==='string'?line.selectedColor.trim():'';
  if(selectedColor.length>80)throw inputError('Check the selected color.');
  const key=JSON.stringify([slug,selectedColor]),old=selections.get(key);
  if(old){if(old.productId!==p.id)throw inputError('Two RentSketch records map to the same Friendly rental. Please contact the office.');old.quantity+=line.qty;}
  else selections.set(key,{slug,quantity:line.qty,selectedColor,productId:p.id,category:line.category||p.category||'rental'});
 }
 const items=[...selections.values()];if(items.length>75||items.some(i=>i.quantity>1000))throw inputError('This quantity needs an office quote.');
 return {items,unmatched};
}
async function reviewPricing(tenant,input={},fetcher=fetch,products=[]){
 if(tenant.slug!=='friendly'||tenant.show_prices===false)return {available:false,complete:false,lineItems:[],total:null};
 const {items,unmatched}=selectionsForQuote(input.lines,products);
 if(!items.length)return {available:true,complete:false,canBook:false,lineItems:unmatched,total:null,rentalSubtotal:null,knownSubtotal:0,missing:[],issues:unmatched.map(l=>l.label+': '+l.error),eventDate:input.eventDate||null,zip:input.zip||null};
 const payload={items:items.map(({slug,quantity,selectedColor})=>({slug,quantity,...(selectedColor?{selectedColor}:{})})),eventDate:input.eventDate||'',zip:input.zip||'',deliveryType:input.deliveryType||'delivery'};
 for(const key of ['durationTierId','damageWaiver','furnitureServices','specialRequests','exactDeliveryRequested','exactDeliveryTime','pickupType','exactPickupTime','couponCode'])if(input[key]!==undefined)payload[key]=input[key];
 const response=await fetcher(URL,{method:'POST',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok)throw Object.assign(new Error(result.error||'Friendly could not verify the quote.'),{status:response.status===400?400:503});
 if(result.source!=='Friendly Party Rental quote engine'||!Array.isArray(result.lineItems)||result.lineItems.length!==items.length)throw new Error('Friendly quote response could not be verified.');
 const lines=result.lineItems.map(line=>{
  const source=items.find(i=>i.slug===line.slug&&(i.selectedColor||'')===(line.selectedColor||''));
  if(!source||line.qty!==source.quantity)throw new Error('Friendly quote selection changed unexpectedly.');
  return {...line,productId:source.productId,category:source.category,label:(line.selectedColor?line.selectedColor+' ':'')+line.label};
 });
 if(result.complete&&(!Number.isFinite(result.total)||result.total<0))throw new Error('Friendly did not supply a verified total.');
 return {...result,available:true,lineItems:lines.concat(unmatched),complete:result.complete&&!unmatched.length,canBook:result.canBook&&!unmatched.length,total:unmatched.length?null:result.total,rentalSubtotal:unmatched.length?null:result.rentalSubtotal,baseRentalSubtotal:unmatched.length?null:result.baseRentalSubtotal,issues:[...(result.issues||[]),...unmatched.map(l=>l.label+': '+l.error)]};
}
module.exports={selectionsForQuote,reviewPricing};
