import {phase5Reference} from './phase5-reference.js';
// RentSketch dance-floor and stage renderer primitives. Prices are tenant data
// and are hydrated from the live catalog after tenant startup.

export const DANCE_SECTION = { id: 'dance-3x3', name: '3x3 Dance Floor Section', pricePerDay: null, ft: 3 };

// Customer-facing size presets. Section counts are calculated automatically
// so customers never need to think in terms of individual sections themselves.
export const DANCE_FLOOR_SIZES = [
  { id: '12x12', ft: 12 },
  { id: '15x15', ft: 15 },
  { id: '18x18', ft: 18 },
  { id: '21x21', ft: 21 },
  { id: '24x24', ft: 24 },
];

export function sectionsForSize(sizeFt) {
  const perSide = Math.ceil(sizeFt / DANCE_SECTION.ft);
  return perSide * perSide;
}

export function priceForSize(sizeFt) {
  return DANCE_SECTION.pricePerDay == null ? null : sectionsForSize(sizeFt) * DANCE_SECTION.pricePerDay;
}

export const STAGE_SECTION = { id: 'stage-section', name: 'Stage Section', pricePerDay: null };
export const STAGE_RAMP = { id: 'stage-ramp', name: 'Stage Ramp', pricePerDay: null };
export const STAGE_STAIR = { id: 'stage-stair', name: 'Stage Stair', pricePerDay: null };
export const STAGE_SKIRT = { id: 'stage-skirt', name: 'Stage Skirt', pricePerDay: null };

function price(p){if(!p||p.price_per_day==null||p.price_per_day==='')return null;const n=Number(p.price_per_day);return Number.isFinite(n)?n:null;}
function reset(){[DANCE_SECTION,STAGE_SECTION,STAGE_RAMP,STAGE_STAIR,STAGE_SKIRT].forEach(x=>{x.pricePerDay=null;delete x.productId;delete x.photoUrl;delete x.dimensionsConfirmed;delete x.externalId;delete x.reference;});}
export function applyTenantDance(detail){
  reset();
  const tenant=detail?.tenant||(typeof window!=='undefined'?window.ACTIVE_TENANT:null)||{};
  if(tenant.slug==='generic')return;
  const live=(detail?.products||[]).filter(p=>p&&p.active!==false&&String(p.category||'').toLowerCase()==='dance_floor');
  const unique=predicate=>{const rows=live.filter(predicate);return rows.length===1?rows[0]:null;};
  const assign=(target,product)=>{if(!product)return;target.productId=product.id;target.externalId=product.external_id||null;target.name=product.name||target.name;target.photoUrl=product.photo_url||product.image_url||null;target.pricePerDay=tenant.showPrices===false?null:price(product);target.reference=phase5Reference(product);};
  const floor=unique(p=>p.visual_model_id==='dance-floor'&&(/3\s*[x×]\s*3/i.test(p.name||'')||(Number(p.width_ft)===3&&Number(p.length_ft)===3)));
  assign(DANCE_SECTION,floor);if(floor)DANCE_SECTION.dimensionsConfirmed=true;
  assign(STAGE_SECTION,unique(p=>p.visual_model_id==='stage-section'));
  assign(STAGE_RAMP,unique(p=>p.external_id==='fpr:stage-ramp'||/stage\s*ramp/i.test(p.name||'')));
  assign(STAGE_STAIR,unique(p=>p.external_id==='fpr:stage-stair'||/stage\s*stair/i.test(p.name||'')));
  assign(STAGE_SKIRT,unique(p=>p.external_id==='fpr:8ft-x-31in-stage-skirt'||/stage\s*skirt/i.test(p.name||'')));
}
if(typeof window!=='undefined')window.addEventListener('rentsketch:catalogReady',e=>applyTenantDance(e.detail||{}));
