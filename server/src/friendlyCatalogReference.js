// Read-only enrichment. No product price, name, stock, image or dimension is
// written or replaced. Exact fpr: source slugs join to the tenant's public website records.
const SOURCES={
 friendly:'https://www.friendlypartyrental.com/api/items',
 'friendly-nyc':'https://friendlypartyrentalnyc.com/api/items',
 'friendly-sc':'https://friendlypartyrentalsc.com/api/items'
};
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
 const caches=new Map(),until=new Map(),inflight=new Map();
 async function load(slug){
  const source=SOURCES[slug];if(!source)return null;
  if(now()<(until.get(slug)||0))return caches.get(slug)||null;
  if(inflight.get(slug))return inflight.get(slug);
  const promise=(async()=>{try{
   const r=await fetcher(source,{redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(4000)});
   if(!r.ok)throw Error('Reference source unavailable');const body=await r.json();if(!Array.isArray(body.items))throw Error('Reference catalog is invalid');
   const value={items:body.items.map(i=>({id:i.id,slug:i.slug,colorOptions:i.colorOptions})),checkedAt:new Date(now()).toISOString()};
   caches.set(slug,value);until.set(slug,now()+60000);return value;
  }catch(_){caches.delete(slug);until.set(slug,now()+10000);return null;}finally{inflight.delete(slug);}})();
  inflight.set(slug,promise);return promise;
 }
 return async(slug,products)=>{if(!SOURCES[slug])return products;const result=await load(slug);return result?joinReferences(products,result.items,result.checkedAt):unavailable(products);};
}
module.exports={SOURCES,joinReferences,createReferenceReader,enrichFriendlyReferences:createReferenceReader()};
