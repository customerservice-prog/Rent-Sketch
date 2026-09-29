import {LINENS,applyTenantLinens} from '../data/linens.js';
import {TABLES} from '../data/tables.js';
import {TABLETOP,tabletopCatalog} from '../data/tabletop.js';
import {makeTable} from './equipment3d.js';
import {makeTabletop} from './tabletop3d.js';
import {mountCatalogFurniture} from './catalog-furniture3d.js';
export function phase4Model(product,products,color){
 applyTenantLinens({tenant:{slug:'friendly',showPrices:false},products});
 TABLETOP.splice(0,TABLETOP.length,...tabletopCatalog(products,false));
 const linen=LINENS.find(l=>l.productId===product.id&&l.active!==false),top=TABLETOP.find(p=>p.productId===product.id);
 if(top){
  return {model:makeTabletop({id:'catalog-preview',shape:'rect',widthFt:6,depthFt:2.5,seatCount:0,tabletop:[{productId:top.id,qty:1,perSeat:false,color:color||top.colors?.[0]||'White'}]},0),colors:top.colors||[],colorsVerified:top.colorsVerified,note:top.reference?.referenceNote||'Photo-referenced planning model; dimensions are approximate.'};
 }
 if(!linen)return null;
 const tableId=linen.spec?.tableLengthFt===8||linen.clothLengthIn===156?'banquet-8ft':linen.fitsTableIds[0],table=TABLES.find(t=>t.id===tableId);if(!table)return null;
 const item={id:'catalog-preview',kind:'table',tableId,shape:table.shape,widthFt:table.diameterFt||table.widthFt,depthFt:table.diameterFt||table.depthFt,modelWidthFt:table.widthFt,modelDepthFt:table.depthFt,seatCount:0,hideChairs:true,linenId:linen.id,linenProductId:product.id,linenColor:color||linen.colors?.[0]||'White'};
 return {model:makeTable(item),colors:linen.colors||[],colorsVerified:linen.colorsVerified,note:'Supporting table is shown only to demonstrate linen coverage; not included with the linen.'};
}
export function mountCatalogPhase4(host,product,products,onFailure,color){
 const result=phase4Model(product,products,color);if(!result)return null;
 const viewer=mountCatalogFurniture(host,{id:product.id,productId:product.id,name:product.name},'tabletop',onFailure,result.model);return {...viewer,...result};
}
