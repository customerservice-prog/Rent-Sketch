// Server-authoritative Friendly pricing. Never trusts RentSketch display prices.
const ORIGIN='https://www.friendlypartyrental.com';
function amount(value){if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
async function read(path,fetcher){
 const response=await fetcher(ORIGIN+path,{signal:AbortSignal.timeout(8000),redirect:'error',headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('Pricing source unavailable');
 return response.json();
}
function sanitizeLines(lines){
 if(!Array.isArray(lines))return[];
 return lines.slice(0,200).map(line=>({
   label:String(line?.label||'Rental item').trim().slice(0,240),
   qty:Math.max(0,Math.min(10000,Number(line?.qty)||0)),
   productId:line?.productId==null?null:String(line.productId).slice(0,160),
   category:line?.category==null?null:String(line.category).slice(0,60),
   selectedColor:line?.selectedColor==null?null:String(line.selectedColor).trim().slice(0,80),
 })).filter(line=>line.qty>0);
}
async function reviewPricing(tenant,{zip='',eventDate='',lines=[]}={},fetcher=fetch){
 if(tenant.slug!=='friendly'||tenant.show_prices===false)return {available:false,complete:false,lineItems:[],taxRate:null,deliveryFee:null,total:null};
 zip=String(zip||'').trim(); eventDate=String(eventDate||'').trim();
 if(zip&&!/^\d{5}$/.test(zip))throw Object.assign(new Error('Enter a five-digit delivery ZIP code.'),{status:400});
 if(eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))throw Object.assign(new Error('Choose a valid event date.'),{status:400});
 const clean=sanitizeLines(lines);
 const itemPath='/api/items'+(eventDate?'?date='+encodeURIComponent(eventDate):'');
 const [itemsResult,taxResult,deliveryResult,tiersResult]=await Promise.allSettled([
   read(itemPath,fetcher),
   read('/api/tax-rate',fetcher),
   zip?read('/api/delivery-fee?zip='+encodeURIComponent(zip),fetcher):Promise.resolve(null),
   read('/api/pricing-tiers',fetcher),
 ]);
 if(itemsResult.status!=='fulfilled')throw new Error('Friendly live item pricing is unavailable');
 const friendlyItems=Array.isArray(itemsResult.value?.items)?itemsResult.value.items:[];
 const byId=new Map(friendlyItems.map(item=>[String(item.id),item]));
 const norm=value=>String(value||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const byName=new Map();
 for(const item of friendlyItems){
   for(const raw of [item.name,item.specialDisplayName]){
     const key=norm(raw);if(!key)continue;
     const list=byName.get(key)||[];list.push(item);byName.set(key,list);
   }
 }
 function uniqueNameMatch(line){
   const candidates=[];
   const add=raw=>{const key=norm(raw);if(key)candidates.push(key);};
   add(line.label);
   if(line.selectedColor){
     const label=String(line.label||'');
     const color=String(line.selectedColor);
     if(label.toLowerCase().startsWith(color.toLowerCase()+' '))add(label.slice(color.length+1));
   }
   for(const key of [...new Set(candidates)]){
     const matches=[...new Map((byName.get(key)||[]).map(item=>[String(item.id),item])).values()];
     if(matches.length===1)return matches[0];
   }
   return null;
 }
 const priced=clean.map(line=>{
   let item=line.productId?byId.get(String(line.productId)):null,matchedBy=item?'id':null;
   if(!item){item=uniqueNameMatch(line);if(item)matchedBy='exact_name';}
   const unit=item?amount(item.cost):null;
   const available=item&&item.available!=null?Number(item.available):null;
   return {
     label:item?.name||line.label,
     qty:line.qty,
     productId:line.productId,
     category:line.category,
     unitPrice:unit,
     amount:unit==null?null:Math.round(unit*line.qty*100)/100,
     available:Number.isFinite(available)?available:null,
     exactMatch:!!item,
     matchedBy,
     availableForDate:Number.isFinite(available)?available>=line.qty:null,
   };
 });
 const rentalComplete=priced.every(line=>line.exactMatch&&line.amount!=null&&line.availableForDate!==false);
 const baseRentalCents=priced.reduce((sum,line)=>sum+(line.amount==null?0:Math.round(line.amount*100)),0);
 const tiers=tiersResult.status==='fulfilled'&&Array.isArray(tiersResult.value?.tiers)?tiersResult.value.tiers:[];
 const oneDayTier=tiers.find(t=>Number(t.minDays)===1)||tiers[0]||null;
 const durationPct=oneDayTier?Number(oneDayTier.percent)||0:0;
 const durationFeeCents=Math.round(baseRentalCents*durationPct/100);
 const rentalCents=baseRentalCents+durationFeeCents;
 const taxRate=taxResult.status==='fulfilled'&&taxResult.value?.rate?.isActive!==false?amount(taxResult.value?.rate?.rate):null;
 const deliveryFee=deliveryResult.status==='fulfilled'?amount(deliveryResult.value?.fee):null;
 const deliveryCents=deliveryFee==null?null:Math.round(deliveryFee*100);
 const taxCents=rentalComplete&&deliveryCents!=null&&taxRate!=null&&taxRate<=100?Math.round((rentalCents+deliveryCents)*taxRate/100):null;
 const hoursUntilEvent=eventDate?(new Date(eventDate+'T12:00:00-04:00').getTime()-Date.now())/3600000:null;
 const lastMinuteNeedsCheckout=hoursUntilEvent!=null&&hoursUntilEvent<72;
 const complete=!!eventDate&&!!zip&&rentalComplete&&deliveryCents!=null&&taxCents!=null&&!lastMinuteNeedsCheckout;
 return {
   available:true,
   complete,
   source:'Friendly Party Rental live checkout data',
   eventDate:eventDate||null,
   zip:zip||null,
   lineItems:priced,
   baseRentalSubtotal:rentalComplete?baseRentalCents/100:null,
   durationTier:oneDayTier?{id:oneDayTier.id,label:oneDayTier.label,minDays:oneDayTier.minDays,percent:durationPct}:null,
   durationFee:rentalComplete?durationFeeCents/100:null,
   rentalSubtotal:rentalComplete?rentalCents/100:null,
   knownSubtotal:rentalCents/100,
   deliveryFee,
   distanceMiles:deliveryResult.status==='fulfilled'?amount(deliveryResult.value?.distance):null,
   taxRate:taxRate!=null&&taxRate<=100?taxRate:null,
   taxDelivery:true,
   taxAmount:taxCents==null?null:taxCents/100,
   total:complete?(rentalCents+deliveryCents+taxCents)/100:null,
   lastMinuteNeedsCheckout,
   pricingBasis:'One-day standard delivery, no optional add-ons',
   checkedAt:new Date().toISOString(),
 };
}
module.exports={reviewPricing};
