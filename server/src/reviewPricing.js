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
 })).filter(line=>line.qty>0);
}
async function reviewPricing(tenant,{zip='',eventDate='',lines=[]}={},fetcher=fetch){
 if(tenant.slug!=='friendly'||tenant.show_prices===false)return {available:false,complete:false,lineItems:[],taxRate:null,deliveryFee:null,total:null};
 zip=String(zip||'').trim(); eventDate=String(eventDate||'').trim();
 if(zip&&!/^\d{5}$/.test(zip))throw Object.assign(new Error('Enter a five-digit delivery ZIP code.'),{status:400});
 if(eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))throw Object.assign(new Error('Choose a valid event date.'),{status:400});
 const clean=sanitizeLines(lines);
 const itemPath='/api/items'+(eventDate?'?date='+encodeURIComponent(eventDate):'');
 const [itemsResult,taxResult,deliveryResult]=await Promise.allSettled([
   read(itemPath,fetcher),
   read('/api/tax-rate',fetcher),
   zip?read('/api/delivery-fee?zip='+encodeURIComponent(zip),fetcher):Promise.resolve(null),
 ]);
 if(itemsResult.status!=='fulfilled')throw new Error('Friendly live item pricing is unavailable');
 const friendlyItems=Array.isArray(itemsResult.value?.items)?itemsResult.value.items:[];
 const byId=new Map(friendlyItems.map(item=>[String(item.id),item]));
 const priced=clean.map(line=>{
   const item=line.productId?byId.get(String(line.productId)):null;
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
     availableForDate:Number.isFinite(available)?available>=line.qty:null,
   };
 });
 const rentalComplete=priced.every(line=>line.exactMatch&&line.amount!=null&&line.availableForDate!==false);
 const rentalCents=priced.reduce((sum,line)=>sum+(line.amount==null?0:Math.round(line.amount*100)),0);
 const taxRate=taxResult.status==='fulfilled'&&taxResult.value?.rate?.isActive!==false?amount(taxResult.value?.rate?.rate):null;
 const deliveryFee=deliveryResult.status==='fulfilled'?amount(deliveryResult.value?.fee):null;
 const deliveryCents=deliveryFee==null?null:Math.round(deliveryFee*100);
 const taxCents=rentalComplete&&deliveryCents!=null&&taxRate!=null&&taxRate<=100?Math.round((rentalCents+deliveryCents)*taxRate/100):null;
 const complete=!!eventDate&&!!zip&&rentalComplete&&deliveryCents!=null&&taxCents!=null;
 return {
   available:true,
   complete,
   source:'Friendly Party Rental live checkout data',
   eventDate:eventDate||null,
   zip:zip||null,
   lineItems:priced,
   rentalSubtotal:rentalComplete?rentalCents/100:null,
   knownSubtotal:rentalCents/100,
   deliveryFee,
   distanceMiles:deliveryResult.status==='fulfilled'?amount(deliveryResult.value?.distance):null,
   taxRate:taxRate!=null&&taxRate<=100?taxRate:null,
   taxDelivery:true,
   taxAmount:taxCents==null?null:taxCents/100,
   total:complete?(rentalCents+deliveryCents+taxCents)/100:null,
   checkedAt:new Date().toISOString(),
 };
}
module.exports={reviewPricing};
