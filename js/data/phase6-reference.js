// Exact Friendly source identities. These are appearance profiles, not measured
// installation envelopes, safety clearances, bundle expansions, or approvals.
export const PHASE6_VERSION='2026.09.29.core3';
const fixed={};
function add(slug,type,category,dimensions,note,extras={}){
 fixed[slug]={kind:'equipment',type,category,dimensions,note,...extras};
}
add('large-connect-four','connect-four','games',[4,1.5,4],'Wood frame with seven columns and six rows of open holes, red/blue counters. One rental game; not a blue plastic wall.',{columns:7,rows:6});
add('cornhole','cornhole','games',[4.2,4,.9],'Two plain wood boards with real openings. Shown together for inventory reference, not at regulation playing distance. One rental set.',{physicalCount:2});
add('5ft-tumbling-timbers','tumbling-timbers','games',[1.5,1.5,5],'Alternating layers of three wood blocks. The 5ft title is not a verified starting stack height.',{blocksPerLayer:3});
add('chess-set','chess','games',[2,2,.5],'Green/ivory 8-by-8 board, distinct black and ivory pieces. Scale and fine piece carving remain illustrative.',{squares:64,pieces:32});
add('ladderball','ladderball','games',[5,3,3.5],'Two dark ladder frames with blue, red and white rungs. Compact equipment display, not a measured play zone.',{physicalCount:2});
add('pong-game','bucket-pong','games',[5,4,1.5],'Red and blue oversized buckets in triangular groups, not a beer-pong table. Exact included quantities require confirmation.',{illustrativeArrangement:true});
add('cotton-candy-machinefloss-maker','cotton-candy','concessions',[2.4,2.4,1.8],'Pink tabletop base, broad open stainless bowl and central spinner. No wheeled stand, sugar or serving cones implied.');
add('popcorn-machine','popcorn','concessions',[2,2,3],'Red canopy, clear enclosure, suspended steel kettle, lower serving flap and rubber feet. No wheeled cart or popcorn supplies implied.');
add('snow-cone-machine','snow-cone','concessions',[2,2,2.5],'Blue upper drive housing, metal hopper and clear lower bin with aluminum corner framing. No dome or wheeled cart.');
add('chocolate-fountain','chocolate-fountain','concessions',[1.8,1.8,3],'Stainless tiers on a vented metal base. Food and serving supplies are not included by the model.');
add('hot-dog-roller-grill','roller-grill','concessions',[2,1.6,1.4],'Parallel metal rollers, front controls and clear sneeze guard. A planning appliance model, not a food-capacity or electrical rating.');
add('hot-dog-bun-warmer','bun-warmer','concessions',[2,1.7,1.1],'Stainless drawer cabinet with front handle, thermostat and indicator. No hot dog rollers are included.');
add('nacho-cheese-warmer','cheese-warmer','concessions',[1.2,1.2,1.6],'Square stainless base, round lid and dispensing pump. No cheese or serving products are selected automatically.');
add('pretzel-display-warmer','pretzel-warmer','concessions',[1.7,1.7,2.7],'Clear upright cabinet with metal base, corner posts and internal hanging rack. No pretzels included by this preview.');
add('foam-party-machine','foam-machine','effects',[3,3,4],'Yellow cylindrical cannon on a dark tripod, carry handle, hose and cord. Decorative motion does not validate setup or spray clearance.');
add('podium-and-microphone','podium','audio',[2,2,4],'Black lectern with tapered column, sloped reading shelf and slim gooseneck microphone.');
add('550w-bluetooth-speaker','speaker','audio',[2,1.3,3.4],'Black portable speaker, telescoping handle, front grille and colored woofer ring. Sound output is not simulated.');
add('32-gallon-trash-can','trash-can','service',[1.8,1.8,3],'Open dark round can with thick rim, handles and vertical ribs; no lid added.');
add('120-quart-hard-ice-chest-cooler','cooler','service',[3.5,1.8,2],'Blue rectangular cooler with light lid and dark end handles. Contents and exact physical measurements are not verified.');
add('crowd-control-stanchion','stanchion','accessories',[1.2,1.2,3.2],'One black retractable-belt post and round weighted base. Not two gold posts and a velvet rope.',{physicalCount:1});
add('red-carpet','red-carpet','accessories',[3,10,.05],'Red fabric runner only. Stanchions, posts and venue decorations are not included.');
for(const [hours,attended] of [[3,true],[4,true],[6,true],[8,true],[4,false],[6,false],[8,false]]){
 add(`photobooth-${hours}-hour-${attended?'with':'no'}-attendant`,'photobooth','photo',[3,3,6],
  'White upright tablet booth with circular multicolor light, tablet opening and broad base. The booking keeps this exact duration/service SKU; no extra attendant, print or prop charge is generated.',{hours,attended});
}
// Do not choose an appearance from a conflicting title or a marketing bundle.
fixed['keg-coolertub']={kind:'reference-only',type:'keg-cooler',note:'Photo/name conflict: the image shows a tapped black dispensing cooler, while the title says Keg Cooler/Tub. Equipment and tap inclusion need confirmation.'};
fixed['sugar-and-creamer-set']={kind:'reference-only',type:'serving-set',note:'The canonical website photo was unavailable during reference capture. No replacement picture or physical model is invented.'};
export const PHASE6_SLUGS=Object.freeze(Object.keys(fixed));
export function phase6Reference(product={}){
 const externalId=product.external_id||product.externalId||product.asset?.source?.externalId;
 if(typeof externalId!=='string'||!externalId.startsWith('fpr:'))return null;
 const slug=externalId.slice(4),value=fixed[slug];
 return value?{...value,dimensions:value.dimensions?[...value.dimensions]:undefined,slug,externalId,referenceUrl:'https://www.friendlypartyrental.com/api/item-image/'+slug,version:PHASE6_VERSION,fidelity:'photo-referenced-planning',approved:false}:null;
}
// Applies only to source-identified consumables/service upgrades. Existing saved
// quote identities are never deleted or converted to different rental products.
export function isPhase6Configuration(product={}){
 const id=product.external_id||product.externalId;
 if(typeof id!=='string'||!id.startsWith('fpr:'))return false;
 const slug=id.slice(4);
 return /^(cotton-candy-floss-sugar-|snow-cone-syrup-)/.test(slug)||
 ['55-oz-popcorn-kernel','sterno-fuel-cans-pack-of-2','20-lb-propane-tank','100-lb-propane-tank','photobooth-extra-hour-attended','photobooth-4x6-print-upgrade','photobooth-custom-backdrop-upgrade'].includes(slug);
}
