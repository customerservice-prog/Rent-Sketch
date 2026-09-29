import { escapeHtml } from './equipment-controls.js';
import { inflatableSizeLabel } from '../data/inflatables.js';
export function inflatablePhoto(p,className='inflatable-photo'){
 return p.photoUrl?`<img class="${className}" src="${escapeHtml(p.photoUrl)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async">`:'';
}
export function inflatableCards(products,objects){
 return '<p class="equipment-note">Choose an inflatable, then tap a spot to place it. The photo shows the rental; the model helps plan your space.</p><div class="item-card-grid">'+products.map(p=>`<button type="button" class="item-card inflatable-card" data-role="inflatable-card" data-id="${escapeHtml(p.id)}">${inflatablePhoto(p)}<span class="item-card-name">${escapeHtml(p.name)}</span><span class="item-card-desc">${inflatableSizeLabel(p)}</span><span class="item-card-price">${p.pricePerDay==null?'Confirm pricing':'$'+p.pricePerDay.toFixed(2)+'/day'}</span>${objects.some(o=>o.inflatableId===p.id)?'<span class="item-card-count">In your layout</span>':''}</button>`).join('')+'</div>';
}
export function inflatableInspector(item,p){
 return `<button class="btn-tertiary inspector-close" data-role="inspector-close">Close</button>${inflatablePhoto(p)}<h3>${escapeHtml(p.name)}</h3><p class="equipment-note"><strong>Photo above = the real Friendly rental.</strong> The 3D model is still a planning representation until this product passes Catalog Accuracy review. ${inflatableSizeLabel(p)}. Select and drag to move.</p><div class="inflatable-actions"><button class="btn-secondary" data-role="insp-rotate" data-id="${escapeHtml(item.id)}">Rotate</button><button class="btn-secondary" data-role="insp-duplicate" data-id="${escapeHtml(item.id)}">Duplicate</button><button class="btn-danger" data-role="insp-delete" data-id="${escapeHtml(item.id)}">Delete</button></div>`;
}
export function inflatablePlanSvg(p,rotation=0){
 const [base,trim,accent]=p.colors,slide=p.style==='slide'||p.combo;
 // The 2D plan uses the real product photo when available, while the footprint
 // remains the measured/planning rectangle. This avoids presenting a generic
 // castle/slide icon as though it were the customer's exact Friendly rental.
 if(p.photoUrl){
   return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="inflatable-photo-clip"><rect x="3" y="3" width="94" height="94" rx="9"/></clipPath></defs><g transform="rotate(${rotation} 50 50)"><rect x="2" y="2" width="96" height="96" rx="10" fill="#fff" stroke="#2f7447" stroke-width="3"/><image href="${escapeHtml(p.photoUrl)}" x="5" y="5" width="90" height="90" preserveAspectRatio="xMidYMid meet" clip-path="url(#inflatable-photo-clip)"/><rect x="3" y="82" width="94" height="15" fill="rgba(19,49,29,.82)"/><text x="50" y="92" fill="white" font-size="7" font-weight="800" text-anchor="middle">REAL RENTAL PHOTO · FOOTPRINT VIEW</text></g></svg>`;
 }
 return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" ><g transform="rotate(${rotation} 50 50)"><rect x="3" y="3" width="94" height="94" rx="10" fill="${base}"/><rect x="12" y="12" width="76" height="76" rx="6" fill="${trim}"/>${p.combo?`<rect x="18" y="16" width="64" height="34" rx="5" fill="${accent}"/><path d="M37 53h26v29H37z" fill="${accent}"/><path d="m44 68 6 7 6-7" fill="none" stroke="white" stroke-width="3"/>`:slide?`<path d="M20 19h25v59H20zm35 0h25v59H55z" fill="${accent}"/><path d="m27 57 6 8 6-8m22 0 6 8 6-8" fill="none" stroke="white" stroke-width="3"/><rect x="16" y="78" width="68" height="13" rx="5" fill="#73d8e9"/>`:`<rect x="21" y="19" width="58" height="63" rx="3" fill="${accent}" opacity=".65"/><path d="M21 34h58M21 49h58M21 64h58" stroke="white" stroke-opacity=".35" stroke-width="2"/><rect x="39" y="83" width="22" height="14" rx="4" fill="${base}"/>`}</g></svg>`;
}
