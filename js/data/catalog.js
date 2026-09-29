import { inferVisualModel, catalogProductCategory } from './visualResolver.js';

// Imported products replace old seed rows. Distinct tent products may share a
// physical model, but must keep their own name, price and quote identity.
export function liveCatalog(category, renderer, products, showPrices, requestedProductId) {
  const models=new Map(renderer.map(item=>[item.id,item])), groups=new Map();
  for(const product of products) {
    if(!product || product.active===false || catalogProductCategory(product)!==category)continue;
    // Conservative inference uses supported physical types only. Existing explicit
    // mappings remain authoritative, including an unsupported one.
    const key=product.visual_model_id || inferVisualModel(product);
    if(!models.has(key))continue;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push({...product,visual_model_id:key});
  }
  const selected=[];
  for(const [key,group] of groups){
    const imported=group.filter(p=>p.external_id!==key);
    const requested=group.find(p=>p.id===requestedProductId);
    {
      // Stable ordering keeps saved model IDs attached to the standard product.
      const standard=String(models.get(key).name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      const options=(imported.length?imported:group).slice().sort((a,b)=>{
        const score=p=>standard&&String(p.name||'').toLowerCase().replace(/[^a-z0-9]/g,'').startsWith(standard)?0:1;
        return score(a)-score(b)||String(a.external_id||a.id).localeCompare(String(b.external_id||b.id));
      });
      if(requested&&!options.some(p=>p.id===requested.id))options[0]=requested;
      options.forEach((p,i)=>selected.push({...p,catalogId:i?key+'--'+p.id:key}));
    }
  }
  return selected.map(product=>{
    const raw=product.price_per_day,price=raw==null || raw==='' ? null : Number(raw);
    const model=models.get(product.visual_model_id),metadata=product.metadata&&typeof product.metadata==='object'?product.metadata:{};
    const width=Number(product.width_ft||metadata.widthFt||metadata.width_ft),length=Number(product.length_ft||metadata.lengthFt||metadata.length_ft),height=Number(product.height_ft||metadata.heightFt||metadata.height_ft);
    const hasWidth=Number.isFinite(width)&&width>0,hasLength=Number.isFinite(length)&&length>0,hasHeight=Number.isFinite(height)&&height>0;
    const hydrated={...model,id:product.catalogId,visualModelId:product.visual_model_id,productId:product.id,externalId:product.external_id || null,photoUrl:/^(https?:\/\/|\/(?!\/))/i.test(product.photo_url||product.image_url||'')?(product.photo_url||product.image_url):null,name:product.name || model.name,pricePerDay:showPrices && price!=null && Number.isFinite(price) && price>=0 ? price : null};
    if(category==='table'&&hasWidth&&hasLength){
      if(hydrated.shape==='round'&&Math.abs(width-length)<.15){hydrated.diameterFt=width;hydrated.widthFt=width;hydrated.depthFt=length;}
      else {hydrated.widthFt=width;hydrated.depthFt=length;}
      hydrated.dimensionsConfirmed=true;hydrated.dimensionProvenance='live-tenant-catalog';hydrated.dimensionsNote='Dimensions supplied by the live rental catalog.';
    }
    if(category==='chair'){
      if(hasWidth)hydrated.seatWidthFt=width;
      if(hasLength)hydrated.seatDepthFt=length;
      if(hasHeight)hydrated.backHeightFt=height;
      hydrated.dimensionsConfirmed=!!(hasWidth&&hasLength);
      hydrated.dimensionProvenance=hydrated.dimensionsConfirmed?'live-tenant-catalog':(hydrated.dimensionProvenance||'illustrative-profile');
      if(!hydrated.dimensionsConfirmed)hydrated.dimensionsNote=hydrated.dimensionsNote||'Chair footprint dimensions are still illustrative until measured catalog dimensions are supplied.';
    }
    return hydrated;
  });
}
