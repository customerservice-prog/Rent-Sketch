// Selection-only transfer: no prices, private access tokens or contact data in URLs.
// Friendly's ordinary cart/checkout remains authoritative for availability and payment.
export function bookingDay(value=''){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';
 const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:'';
}
export function buildBookingHandoff({tenant,lines,products,designId=null,eventDate='',source='designer',surfaceType='notSure',deliveryZip=''}){
 if(!['friendly','friendly-nyc','friendly-sc'].includes(tenant))throw new Error('Open this designer from Friendly Party Rental to book its rentals.');
 if(!Array.isArray(lines)||!lines.length)throw new Error('Add rentals to your layout first.');
 const catalog=Array.isArray(products)?products:[],items=new Map();
 for(const line of lines){
  if(['delivery','tax'].includes(line?.category))continue;
  const matches=catalog.filter(p=>p.id===line?.productId&&p.active!==false),product=matches.length===1?matches[0]:null;
  const external=String(product?.external_id||''),slug=external.startsWith('fpr:')?external.slice(4):'';
  if(!product||!/^[-a-z0-9]{1,180}$/.test(slug))throw new Error((line?.label||'An item')+' needs staff confirmation. Send your plan for a quote; no item will be left out.');
  if(!Number.isInteger(line.qty)||line.qty<1||line.qty>1000)throw new Error('Please check the quantity for '+line.label+'.');
  const selectedColor=typeof line.selectedColor==='string'?line.selectedColor.trim():undefined;
  if(selectedColor&&selectedColor.length>80)throw new Error('Please check the color for '+line.label+'.');
  const key=JSON.stringify([slug,selectedColor||'']),item=items.get(key)||{slug,quantity:0,...(selectedColor?{selectedColor}:{})};
  item.quantity+=line.qty;if(item.quantity>1000)throw new Error('Please request a quote for quantities above 1,000.');items.set(key,item);
 }
 if(!items.size||items.size>75)throw new Error('Please request a quote for this layout.');
 const zip=typeof deliveryZip==='string'&&/^\d{5}$/.test(deliveryZip)?deliveryZip:'';
 return {version:1,tenant,designId:typeof designId==='string'?designId:null,eventDate:bookingDay(eventDate),source:/^[a-z0-9_-]{1,100}$/i.test(source)?source:'designer',surfaceType:['grass','concrete','asphalt','deck','notSure'].includes(surfaceType)?surfaceType:'notSure',...(zip?{deliveryZip:zip}:{}),items:[...items.values()]};
}
export function friendlyBookingUrl(payload){
 const origin=payload?.tenant==='friendly-nyc'?'https://friendlypartyrentalnyc.com':payload?.tenant==='friendly-sc'?'https://friendlypartyrentalsc.com':'https://www.friendlypartyrental.com';
 return origin+'/design-your-event/book?auto=1#layout='+encodeURIComponent(JSON.stringify(payload));
}
