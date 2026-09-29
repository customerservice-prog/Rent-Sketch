// Photo-referenced appearances, never inventory, safety envelopes or approvals.
// dimensions = illustrative width/depth/height in feet unless a note identifies
// a nominal catalog size. Volume labels do NOT establish physical dimensions.
export const PHASE6B_VERSION='2026.09.29.service2';
const rows={};
function add(slug,type,kind,dimensions,note,extra={}){rows[slug]={type,kind,dimensions,note,...extra};}
const table=(slug,type,d,note,extra)=>add(slug,type,'tabletop',d,note,extra);
const equipment=(slug,type,d,note,extra)=>add(slug,type,'equipment',d,note,extra);
table('8-quart-full-size-chafer','chafer-rect',[1.9,1.15,1.05],'Rectangular stainless pan, sloped removable lid, lifting loop, four raised legs and two burner holders. Food and fuel are not included by this model.',{burnerHolders:2});
table('roll-top-8-qt-chafer','chafer-roll',[1.9,1.15,1.1],'Rectangular pan with half-open curved roll-top cover, pedestal feet and two burner holders. No food or fuel is selected.',{burnerHolders:2});
table('4-qt-round-chafer','chafer-round-gold',[1.2,1.2,1.05],'Round steel dish, domed lid and gold-tone lid handle with curved supports. Capacity is a catalog label, not measured diameter.');
table('65-qt-round-top-chafer','chafer-round',[1.4,1.4,1.2],'Round steel dish, silver handle and domed roll-top lid on broad metal legs. Not the rectangular chafer.');
table('11-qt-round-soup-chafer','chafer-soup',[1.35,1.35,1.7],'Deep cylindrical soup vessel and upright hinged circular lid with broad steel legs. No soup or fuel selected.');
table('10-gallon-insulated-beverage-dispenser','insulated-dispenser',[1.55,1.6,2.3],'Black rectangular insulated carrier with top handles, latches and recessed lower spigot. Not a clear glass beverage jar.',{capacityLabel:'10 gallon'});
table('25-gallon-insulated-beverage-dispenser','insulated-dispenser',[1.15,1.25,1.6],'Black rectangular insulated carrier with top handles, latches and recessed spigot. The source slug means 2.5 gallons, not 25 gallons.',{capacityLabel:'2.5 gallon'});
table('coffee-urn-percolator','coffee-urn',[1.05,1.05,1.75],'Brushed metal urn, black handles and base, lid knob, front gauge and dispensing tap. No cups, coffee, heat or operating capacity implied.');
table('60-oz-beverage-pitcher','ribbed-pitcher',[.6,.45,.8],'Clear ribbed pitcher with open mouth, pouring spout and loop handle. Nominal volume does not certify dimensions.');
table('wine-champagne-bucket','wine-bucket',[.8,.8,.85],'Open tapered steel bucket with rolled lip and two loose ring handles. No stand, ice or beverages selected.');
table('large-family-style-serving-bowl','serving-bowl',[1.15,1.15,.5],'Open black plastic round serving bowl, following the website reference. Food and utensils are not included.');
table('85-inch-rim-soup-bowl','rim-bowl',[8.5/12,8.5/12,.15],'White shallow soup bowl with broad flat rim. 8.5-inch diameter is nominal from the product title, not a measured record.',{nominalDiameterIn:8.5});
table('45-oz-champagne-flute','flute',[.18,.18,.65],'Clear narrow bowl, long stem and round foot; not a tumbler. 4.5 oz is the listed volume, not height.');
table('tall-highball-glass','highball',[.22,.22,.58],'Straight-sided open clear tumbler with thick transparent base. No stem.');
table('serving-tongs','serving-tongs',[.22,.95,.10],'Connected pair of polished spring tongs with broad spoon-like gripping ends. One rental utensil.');
table('piecake-server','cake-server',[.22,.90,.035],'Gold-tone tapered triangular cake blade and textured narrow handle. No knife is added.');
table('sheet-pan','sheet-pan',[1.5,1,.055],'Shallow rectangular silver pan with rolled lip and recessed flat center. Not a deep serving bowl.');
table('salt-and-pepper-shaker-set','metal-shakers',[.40,.20,.35],'Two cylindrical metal shakers with textured sides and perforated caps. One rented set, not glass jars.',{physicalCount:2});
table('gold-5-arm-candelabra','candelabra',[.95,.75,1.8],'Five-arm gold candelabra with curved branches and turned stem. Empty candle cups are shown; candles are not added automatically.',{cups:5});
table('gold-pedestal-cake-stand-14in','cake-plateau',[14/12,14/12,.37],'Low round gold cake plateau with patterned side band and short feet, not a tall thin pedestal. Nominal top diameter is 14 inches.',{nominalDiameterIn:14});
table('tiered-cake-display-3-level-gold','tiered-stand',[1,1,1.35],'One three-level gold stand with stepped tray sizes and top ring. The two examples in the photo are not two automatically rented stands.',{physicalCount:1,trays:3});
table('gold-card-box','card-box',[1.15,.8,.95],'Clear glass-paneled box with gold edge frame, hinged roof-like lid and card slot. Cards and decorations are not included.');
equipment('bus-bin','bus-bin',[1.75,1.3,.7],'Open black tapered utility tub with a rolled rim and molded grip details. Not a trash can.');
equipment('freezer-chest','freezer',[3.5,2.1,2.8],'White rectangular chest freezer with top lid seam, handle, lower vent and small feet. No food, electrical rating or capacity is inferred.');
equipment('audio-guest-book','audio-phone',[.9,.85,.65],'White telephone-style recorder with curved handset, rotary-style dial and coiled cord. Flowers, signage and a supporting table are not selected.');
equipment('giant-uno-cards','oversize-cards',[2,1.5,.05],'Oversized colored playing-card examples, not furniture. Card count, deck contents and play-space dimensions are not inferred from the marketing photo.');
equipment('movie-night-laptop-rental','laptop',[1.25,.85,.9],'Open dark laptop with keyboard, touchpad and plain screen. No streaming account, film, projector or internet service is added.');
equipment('extra-movie-night-speaker','movie-speaker',[1.8,1.6,4.8],'One dark PA cabinet on a tripod, based on the website image. It remains an extra speaker selection, not another movie package.');
equipment('25-foot-movie-screen-with-projector','movie-screen',[25,9,17],'Inflatable black screen surround with white projection face. Projector, support table, blower and powered speaker are previewed as components of this one source SKU, as listed in the website description. No extra billable lines or laptop are generated. The compact display is not a measured throw-distance or anchoring plan.',{bundleVisual:true,nominalSizeLabel:'25 foot; measurement axis not specified'});
equipment('propane-heater','patio-heater',[2.5,2.5,7.2],'Brown lower cylinder and column, metal burner cage and broad silver reflector. No flame, fuel tank, clearance or indoor-use approval is implied.');
equipment('handwashing-station','handwash',[1.6,1.9,4.5],'Tall gray molded handwashing unit with recessed basin, back panel, soap fixture and bottom foot pump. Water and consumables are not inferred.');
equipment('standard-portable-restroom','portable-restroom',[4,4,7.6],'Blue single-cabin portable toilet with light arched roof, ribbed walls and closed door. Interior equipment and installation dimensions are unverified.');
equipment('hexagon-wedding-arch','hex-arch',[7,2,7.5],'Bare wood six-sided arch with two timber feet. Floral arrangements, bulbs, crates and candles in the marketing photograph are not added.');
equipment('madison-arbor','arbor',[4.7,2.4,7.5],'White arched arbor with four posts, lattice/slatted side sections, decorative brackets and finials. No flowers included by this model.');
equipment('round-wedding-arch-7ft','round-arch',[7,2,7.4],'Gold circular frame and splayed support feet. The 7ft title is nominal; floral decor, sign, drape and candles in the image are not assumed included.',{nominalDiameterFt:7});
equipment('gold-mirror-welcome-sign','mirror-sign',[2.5,.3,4.5],'Arched gold frame with ornamental crest and reflective-look panel. No invented customer names, sign text, floral decor or separate easel.');
equipment('gold-welcome-sign-easel','gold-easel',[2.2,2,5.3],'Slim gold three-leg easel with sign supports. Printed board and flowers are not selected with the easel.');
equipment('greenery-and-floral-wall-8x8','greenery-wall',[8,1.5,8],'Dense green foliage face. The 8x8 label describes the upright face, not an 8ft-deep footprint. Flowers, neon sign, plinth and candles pictured around it are not assumed included. Support depth requires confirmation.',{verticalFace:true,nominalFaceFt:[8,8],visualDepthFt:.30});
equipment('sequin-backdrop-panel-8x8','sequin-wall',[8,1.5,8],'Gold sequin curtain with vertical pleats. The 8x8 label describes the upright face. No flower arrangements, lights or separately billable stand is added; mounting/support hardware needs confirmation.',{verticalFace:true,nominalFaceFt:[8,8],visualDepthFt:.16});
equipment('water-barrel-cover','barrel-cover',[2,2,3],'White cloth sleeve with gathered top and overlap seam. Barrel, water, ballast capacity and anchoring hardware are not included by drawing the cover.',{coverOnly:true});
equipment('leg-drape','leg-drape',[1.5,.8,7],'White drape gathered with a mid-height tie. This is fabric only, shown upright to illustrate its use. Tent and support pole are not additional rentals.',{coverOnly:true});
rows['glass-water-pitcher-64-oz']={kind:'reference-only',placement:'tabletop',type:'pitcher-conflict',dimensions:[.6,.6,.8],note:'Reference conflict: the title and description say glass, but the canonical photo shows a reflective metal pitcher. Material and appearance require confirmation; no physical substitute is invented.'};
rows['round-gold-metal-display-dish']={kind:'reference-only',placement:'tabletop',type:'dish-conflict',dimensions:[1,1,.1],note:'Reference conflict: this single-dish title uses the same two tiered-stand photo as the three-level display product. Correct shape and included quantity need confirmation.'};
rows['hexagon-wedding-arch']={kind:'reference-only',placement:'equipment',type:'arch-conflict',dimensions:[7,2,7.5],note:'Reference conflict: the item is named Hexagon Wedding Arch, but its canonical photograph appears to show a peaked seven-sided frame. Confirm the actual frame shape before using it as a visual reference; no guessed hexagon or heptagon is substituted.'};
export const PHASE6B_SLUGS=Object.freeze(Object.keys(rows));
export function phase6bReference(product={}){
 const id=product.external_id||product.externalId||product.asset?.source?.externalId;
 if(typeof id!=='string'||!id.startsWith('fpr:'))return null;
 const slug=id.slice(4),r=rows[slug];if(!r)return null;
 return {...r,category:r.kind==='tabletop'?'tabletop':(['movie-speaker','audio-phone'].includes(r.type)?'audio':['laptop','movie-screen'].includes(r.type)?'photo':r.type==='patio-heater'?'climate':r.type==='oversize-cards'?'games':['bus-bin','freezer','handwash','portable-restroom'].includes(r.type)?'service':'accessories'),dimensions:r.dimensions?[...r.dimensions]:undefined,slug,externalId:id,version:PHASE6B_VERSION,referenceUrl:'https://www.friendlypartyrental.com/api/item-image/'+slug,fidelity:'photo-referenced-planning',approved:false};
}
