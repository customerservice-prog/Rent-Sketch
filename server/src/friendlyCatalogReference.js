// Read-through public pricing. Never writes either catalog. Friendly owns prices;
// RentSketch owns visual mapping. No stale stored price may escape on failure.
const SOURCE='https://www.friendlypartyrental.com/api/rentsketch/catalog';
const price=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
function joinReferences(products,items,checkedAt){
 const bySlug=new Map();
 for(const item of items){const key=String(item.slug||'');if(!key)continue;const rows=bySlug.get(key)||[];rows.push(item);bySlug.set(key,rows);}
 return products.map(product=>{
  const source=String(product.external_id||''),matches=source.startsWith('fpr:')?bySlug.get(source.slice(4))||[]:[],item=matches.length===1?matches[0]:null;
  const colors=item&&Array.isArray(item.colorOptions)?[...new Set(item.colorOptions.filter(c=>typeof c==='string'&&c.trim()&&c.length<=80).map(c=>c.trim()))]:[];
  const currentPrice=item?price(item.cost):null;
  return {...product,name:item?.name||product.name,price_per_day:currentPrice,price_type:'per_rental',metadata:{...(product.metadata||{}),colors,referenceColorsVerified:!!item&&Array.isArray(item.colorOptions),referenceStatus:item?'matched':matches.length?'ambiguous':'missing',referenceItemId:item?String(item.id):null,referenceCheckedAt:checkedAt,priceSource:'Friendly Party Rental live catalog',priceVerified:currentPrice!==null,priceCheckedAt:checkedAt}};
 });
}
function unavailable(products){return products.map(p=>({...p,price_per_day:null,metadata:{...(p.metadata||{}),colors:[],referenceColorsVerified:false,referenceStatus:'unavailable',priceSource:'Friendly Party Rental live catalog',priceVerified:false,priceCheckedAt:null}}));}
function createReferenceReader(fetcher=fetch,now=Date.now){
 let inflight=null;
 async function load(){
  if(inflight)return inflight;
  inflight=(async()=>{try{
   const r=await fetcher(SOURCE,{redirect:'error',cache:'no-store',headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error('Price source unavailable');const body=await r.json();if(!Array.isArray(body.items)||!body.items.length)throw Error('Price catalog is invalid');
   return {items:body.items.map(i=>({id:i.id,slug:i.slug,name:i.name,cost:i.cost,colorOptions:i.colorOptions})),checkedAt:body.checkedAt||new Date(now()).toISOString()};
  }catch(_){return null;}finally{inflight=null;}})();return inflight;
 }
 return async(slug,products)=>{if(slug!=='friendly')return products;const result=await load();return result?joinReferences(products,result.items,result.checkedAt):unavailable(products);};
}
module.exports={SOURCE,joinReferences,unavailable,createReferenceReader,enrichFriendlyReferences:createReferenceReader()};
