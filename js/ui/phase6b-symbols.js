import {phase6bReference} from '../data/phase6b-reference.js';
export function phase6bSymbol(product){
 const r=phase6bReference(product);if(!r)return null;
 const [w,d]=r.dimensions||[1,1],stroke='#748b87',gold='#ba9957',silver='#bbc8c9',dark='#323936';
 const rect=(a,b,fill,rad=.04)=>`<rect x="${-a/2}" y="${-b/2}" width="${a}" height="${b}" rx="${rad}" fill="${fill}" stroke="${stroke}" stroke-width=".014"/>`;
 const ring=(radius,fill)=>`<circle r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width=".014"/><circle r="${radius*.83}" fill="none" stroke="${stroke}" stroke-width=".01"/>`;
 if(r.kind==='reference-only')return `<g fill="none" stroke="#a67c3b" stroke-width=".02" stroke-dasharray=".06 .035"><rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}"/><path d="M${-w/3} ${-d/3}L${w/3} ${d/3}M${w/3} ${-d/3}L${-w/3} ${d/3}"/></g>`;
 if(r.kind!=='tabletop')return null;
 if(r.type==='insulated-dispenser')return rect(w,d,dark)+`<rect x="-.065" y="${d/2-.04}" width=".13" height=".13" rx=".02" fill="${silver}"/>`;
 if(r.type==='chafer-rect'||r.type==='chafer-roll')return rect(w,d,silver)+rect(w*.83,d*.77,r.type==='chafer-roll'?'#899799':'#dce1dd')+'<path d="M-.1 0h.2" stroke="#6b797b" stroke-width=".03"/>';
 if(['chafer-round','chafer-round-gold','chafer-soup','coffee-urn','wine-bucket'].includes(r.type))return ring(w/2,silver)+(r.type==='coffee-urn'?'<circle r=".07" fill="#303939"/>':'');
 if(r.type==='serving-bowl')return ring(w/2,dark);if(r.type==='rim-bowl')return ring(w/2,'#f7f5ef');
 if(r.type==='highball'||r.type==='flute')return ring(w/2,'#d1e6e855');
 if(r.type==='ribbed-pitcher')return ring(d/2,'#d1e6e855')+'<path d="M.20 -.10Q.48 0 .20 .10" fill="none" stroke="#93aaa8" stroke-width=".025"/>';
 if(r.type==='sheet-pan')return rect(w,d,silver)+rect(w*.92,d*.87,'#e0e5e4',.025);
 if(r.type==='card-box')return rect(w,d,'#d1e6e844')+`<path d="M${-w/2} 0h${w}" stroke="${gold}" stroke-width=".02"/>`;
 if(r.type==='metal-shakers')return `<g fill="${silver}" stroke="${stroke}" stroke-width=".014"><circle cx="-.12" r=".09"/><circle cx=".12" r=".09"/></g>`;
 if(r.type==='cake-server')return `<g fill="${gold}" stroke="${stroke}" stroke-width=".012"><path d="M-.09 .02Q-.13 -.22 0 -.44Q.13 -.22 .09 .02Z"/><rect x="-.025" y="0" width=".05" height=".43" rx=".018"/></g>`;
 if(r.type==='serving-tongs')return `<g fill="none" stroke="${silver}" stroke-width=".04"><path d="M-.06 -.28L-.025 .4Q0 .49 .025 .4L.06 -.28"/><ellipse cx="-.06" cy="-.31" rx=".06" ry=".13"/><ellipse cx=".06" cy="-.31" rx=".06" ry=".13"/></g>`;
 if(r.type==='candelabra')return `<g stroke="${gold}" fill="${gold}" stroke-width=".025"><path d="M-.4 0h.8M-.27 -.2L0 0l.27 -.2"/>${[[0,0],[-.4,0],[.4,0],[-.27,-.2],[.27,-.2]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".045"/>`).join('')}</g>`;
 if(r.type==='cake-plateau'||r.type==='tiered-stand')return ring(w/2,gold)+(r.type==='tiered-stand'?ring(w*.32,'none')+ring(w*.20,'none'):'');
 return null;
}
