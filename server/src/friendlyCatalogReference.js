// Read-only enrichment. No product price, name, stock, image or dimension is
// written or replaced. Exact fpr: source slugs join to public website records.
const SOURCE='https://www.friendlypartyrental.com/api/items';
function joinReferences(products,items,checkedAt){
 const bySlug=new Map();
 for(const item of items){const key=String(item.slug||'');if(!key)continue;const rows=bySlug.get(key)||[];rows.push(item);bySlug.set(key,rows);}
 return products.map(product=>{
  if(!String(product.external_id||'').startsWith('fpr:'))return product;
  const matches=bySlug.get(product.external_id.slice(4))||[],item=matches.length===1?matches[0]:null;
  const colors=item&&Array.isArray(item.colorOptions)?[...new Set(item.colorOptions.filter(c=>typeof c==='string'&&c.trim()&&c.length<=80).map(c=>c.trim()))]:[];
  return {...product,metadata:{...(product.metadata||{}),colors,referenceColorsVerified:!!item&&Array.isArray(item.colorOptions),referenceStatus:item?'matched':matches.length?'ambiguous':'missing',referenceItemId:item?String(item.id):null,referenceCheckedAt:checkedAt}};
 });
}
function unavailable(products){return products.map(p=>String(p.external_id||'').startsWith('fpr:')?{...p,metadata:{...(p.metadata||{}),colors:[],referenceColorsVerified:false,referenceStatus:'unavailable'}}:p);}
function createReferenceReader(fetcher=fetch,now=Date.now){
 let cache=null,until=0,inflight=null;
 async function load(){
  if(now()<until)return cache;
  if(inflight)return inflight;
  inflight=(async()=>{try{
   const r=await fetcher(SOURCE,{redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(4000)});
   if(!r.ok)throw Error('Reference source unavailable');const body=await r.json();if(!Array.isArray(body.items))throw Error('Reference catalog is invalid');
   // Retain only public identity and color fields in the short-lived cache.
   cache={items:body.items.map(i=>({id:i.id,slug:i.slug,colorOptions:i.colorOptions})),checkedAt:new Date(now()).toISOString()};until=now()+60000;
  }catch(_){cache=null;until=now()+10000;}finally{inflight=null;}return cache;})();return inflight;
 }
 return async(slug,products)=>{if(slug!=='friendly')return products;const result=await load();return result?joinReferences(products,result.items,result.checkedAt):unavailable(products);};
}
module.exports={joinReferences,createReferenceReader,enrichFriendlyReferences:createReferenceReader()};
