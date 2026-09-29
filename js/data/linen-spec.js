// Physical cloth sizes are inches; table dimensions are feet. Never treat
// imported 72 x 120 linen fields as a 72-foot table or infer fit from a photo.
const positive=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
const roundFits=['round-5ft','cocktail'];
const rectFits=['banquet-6ft','banquet-8ft'];
export function linenSpec(product={}){
 const name=String(product.name||''),id=String(product.id||''),source=String(product.external_id||product.externalId||''),text=(name+' '+id).toLowerCase(),meta=product.metadata||{};
 if(/package|aisle|clip|chair.*cover/.test(text))return null;
 const material=/sequin/.test(text)?'sequin':/satin/.test(text)?'satin':/spandex/.test(text)?'spandex':'polyester';
 // This SKU's 60 inches describes the fitted TABLE, not a loose 60-inch cloth.
 if(source==='fpr:white-table-linen-round-60')return {kind:'stretch',shape:'round',material:'spandex',tableSizeIn:60,fitsTableIds:['round-5ft'],referenceBased:true};
 if(/cocktail.*(?:cover|linen|cloth)|linen-cocktail-cover/.test(text))return {kind:'stretch',shape:'round',material:'spandex',tableSizeIn:30,fitsTableIds:['cocktail']};
 if(/spandex/.test(text)){
  const length=/8\s*(?:ft|foot|feet)|spandex-8ft/.test(text)?8:/6\s*(?:ft|foot|feet)|spandex-6ft/.test(text)?6:null;
  if(length)return {kind:'stretch',shape:'rect',material:'spandex',tableLengthFt:length,fitsTableIds:[length===8?'banquet-8ft':'banquet-6ft']};
 }
 if(/napkin/.test(text))return {kind:'napkin',material,fitsTableIds:[...roundFits,...rectFits]};
 if(/runner/.test(text))return {kind:'runner',material:/satin/.test(text)?'satin':material,clothLengthIn:positive(meta.cloth_length_in)||(/9\s*(?:ft|foot|feet)|runner-9ft/.test(text)?108:null),fitsTableIds:[...roundFits,...rectFits]};
 const round=name.match(/(?:^|\D)(60|90|108|120|132)\s*(?:inches|inch|in|["″])?\s*round/i)||name.match(/round\s*(60|90|108|120|132)/i)||id.match(/round-(60|90|108|120|132)(?:$|-)/i);
 const diameter=positive(meta.round_size_in)||positive(product.roundSizeIn)||(round?Number(round[1]):null);
 if(diameter)return {kind:'drape',shape:'round',material,roundSizeIn:diameter,fitsTableIds:roundFits};
 const rect=name.match(/\b(54|72|90)\s*[x×]\s*(120|132|156)\b/i)||id.match(/(54|72|90)x(120|132|156)/);
 const width=positive(meta.cloth_width_in)||positive(product.clothWidthIn)||(rect?Number(rect[1]):null),length=positive(meta.cloth_length_in)||positive(product.clothLengthIn)||(rect?Number(rect[2]):null);
 if(width&&length)return {kind:'drape',shape:'rect',material,clothWidthIn:Math.min(width,length),clothLengthIn:Math.max(width,length),fitsTableIds:rectFits};
 return null;
}
export function productColors(product={}){
 const meta=product.metadata||{},listed=Array.isArray(meta.colors)?meta.colors:Array.isArray(product.colorOptions)?product.colorOptions:null;
 if(listed?.length)return {colors:[...new Set(listed.filter(x=>typeof x==='string'&&x.trim()&&x.length<80).map(x=>x.trim()))],colorsVerified:meta.referenceColorsVerified!==false};
 const text=String(product.name||'');const named=['Rose Gold','Black','White','Silver','Gold','Ivory'].find(c=>new RegExp('\\b'+c+'\\b','i').test(text));
 return {colors:named?[named]:['White'],colorsVerified:!!named,colorNote:named?'Named product color; screen shade is approximate.':'Preview color only — confirm available colors with Friendly.'};
}
export function linenDrapeProfile(item,table,linen){
 const spec=linen?.spec||linenSpec(linen||{id:item.linenId}),w=table.w,d=table.d,height=table.height;
 if(!spec)return {...table,clothSpec:null};
 const physical=spec.kind==='stretch'?height:spec.roundSizeIn!=null?Math.max(0,(spec.roundSizeIn/12-w)/2):height;
 const side=spec.clothWidthIn?Math.max(0,(spec.clothWidthIn/12-Math.min(w,d))/2):physical;
 const end=spec.clothLengthIn&&spec.kind==='drape'?Math.max(0,(spec.clothLengthIn/12-Math.max(w,d))/2):physical;
 return {...table,clothSpec:spec,drop:Math.min(height-.025,physical),physicalDrop:physical,sideDrop:Math.min(height-.025,side),endDrop:Math.min(height-.025,end),physicalSideDrop:side,physicalEndDrop:end,poolingFt:Math.max(0,physical-height),stretch:spec.kind==='stretch'};
}
export function linenCoverageLabel(linen,table={}){
 const spec=linen?.spec||linenSpec(linen),w=Number(table.diameterFt||table.widthFt),d=Number(table.diameterFt||table.depthFt),h=table.silhouette==='cocktail-pedestal'||String(table.visualModelId||table.id||table.tableId).startsWith('cocktail')?3.5:2.5;
 if(!spec||!w||!d)return 'Coverage depends on the selected table dimensions.';
 if(spec.kind==='stretch')return 'Fitted stretch cover with separate foot pockets — not a loose floor-length cloth.';
 if(spec.kind==='runner')return 'Decorative runner; it does not replace the tablecloth.';
 if(spec.kind==='napkin')return 'One selected napkin; use tabletop options for one per guest.';
 if(spec.roundSizeIn){const drop=Math.max(0,(spec.roundSizeIn-w*12)/2);return `${spec.roundSizeIn}-inch cloth · ${Number(drop.toFixed(1))}-inch nominal drop${drop>h*12?` · ${Number((drop-h*12).toFixed(1))} inches of extra fabric at floor`:''}. Based on the table model; folds and screen colors are approximate.`;}
 const side=(spec.clothWidthIn-Math.min(w,d)*12)/2,end=(spec.clothLengthIn-Math.max(w,d)*12)/2;
 return `${spec.clothWidthIn} × ${spec.clothLengthIn} inches · ${Number(Math.max(0,side).toFixed(1))}-inch side / ${Number(Math.max(0,end).toFixed(1))}-inch end drop. Based on the table model, not a measured installation.`;
}
