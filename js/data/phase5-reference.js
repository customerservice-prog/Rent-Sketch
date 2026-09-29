// Appearance references are keyed by source identity, never a similar name or price.
// No reference in this file certifies dimensions, rigging, electrical load or access.
export const PHASE5_VERSION='2026.09.29.1';
const fixed={
 '20-inch-fan':{kind:'equipment',type:'fan',note:'Three metal blades, wire cage, black pedestal and round base. Physical footprint remains unverified.'},
 '4375-watt-generator':{kind:'equipment',type:'generator',note:'Open black tubular frame, red fuel tank, exposed engine, wheels and outlet/control panel. Outdoor operating clearance and power capacity are not validated by this preview.'},
 '30a-power-distribution-spider-box':{kind:'equipment',type:'power-distribution',note:'Yellow protective housing with black switches and four visible receptacles. This is a distribution box, not a generator; connection and load compatibility need confirmation.'},
 'stage-section':{kind:'equipment',type:'stage',note:'Dark gray deck, black folding frame and braced legs. Stage dimensions and load rating are not supplied by the listing.'},
 'stage-stair':{kind:'equipment',type:'stage-stair',note:'Two gray treads with black side handrails, following the website photo. Height and compatibility must be confirmed.'},
 '8ft-x-31in-stage-skirt':{kind:'equipment',type:'stage-skirt',nominalWidthFt:8,nominalHeightFt:31/12,note:'Black pleated fabric. The 8 ft width and 31 in drop are nominal title dimensions; the supporting stage is not included.'},
 'stage-ramp':{kind:'reference-only',type:'stage-ramp',note:'Reference conflict: the Stage Ramp photo appears to show a flat platform. No verified ramp geometry, rise, slope or access suitability is available.'},
 'dance-floor-3x3-section':{kind:'floor',type:'wood-panel',panelFt:3,note:'3 × 3 ft rental sections, warm wood-look panel face and silver outer edging. Ground preparation, subfloor and transition requirements are not verified by this illustration.'},
 'bistro-lighting-20x20':{kind:'lighting',type:'bistro',visual:'bistro-cross-runs',widthFt:20,lengthFt:20,note:'Round warm bulbs on black hanging sockets and cord. Route and brightness are illustrative, not an electrical or rigging plan.'},
 'custom-lighting-300ft':{kind:'lighting',type:'rope',visual:'perimeter-eave',runLengthFt:300,note:'The website photo shows LED rope on a reel. The installed preview illustrates a route, not a guaranteed use of all 300 ft or a validated installation.'},
 'battery-operated-crystal-chandelier':{kind:'lighting',type:'chandelier',visual:'chandelier',arms:5,note:'Five candle arms, clear beads, teardrop pendants and light-colored scrollwork. Hanging position and support must be confirmed.'},
 'wireless-led-uplight':{kind:'lighting',type:'uplight',visual:'uplight-single',fixtureCount:1,note:'One black wireless fixture with six visible LED lenses. Preview light color and intensity are illustrative.'},
 'uplighting-package-12-lights':{kind:'lighting',type:'uplight',visual:'uplight-ring',fixtureCount:12,note:'Twelve black six-lens fixtures are shown, but the rental selection is one package. Preview illumination is not a measured lighting result.'},
};
const tentSizes=['20x20','20x30','20x40','30x30','30x45','30x60','40x40','40x60','40x80','40x100'];
for(const size of tentSizes){const [widthFt,lengthFt]=size.split('x').map(Number);fixed['tent-lighting-'+size]={kind:'lighting',type:'c7',visual:'perimeter-eave',widthFt,lengthFt,note:'Small tapered white bulbs and white cord, following the website photo. Cord route, spacing and brightness remain illustrative.'};}
export const PHASE5_SLUGS=Object.freeze(Object.keys(fixed));
export function phase5Reference(product={}){
 const id=product.external_id||product.externalId||product.asset?.source?.externalId;
 if(typeof id!=='string'||!id.startsWith('fpr:'))return null;
 const slug=id.slice(4),reference=fixed[slug];
 return reference?{...reference,slug,externalId:id,referenceUrl:'https://www.friendlypartyrental.com/api/item-image/'+slug,version:PHASE5_VERSION,reviewedAt:'2026-09-29',fidelity:'photo-referenced-planning',approved:false}:null;
}
export function isPhase5Product(product){return !!phase5Reference(product);}
