// Runtime visual-coverage classifier used by API/dashboard reporting.
// This does not invent product appearance or mutate catalog rows.
// Shared mappings come from products.visual_model_id; Friendly source-specific
// profiles are exact reviewed source slugs already implemented by the designer.

const FRIENDLY_SOURCE_VISUALS = new Set([
  // Phase 5
  '20-inch-fan','4375-watt-generator','30a-power-distribution-spider-box',
  'stage-section','stage-stair','8ft-x-31in-stage-skirt','dance-floor-3x3-section',
  'bistro-lighting-20x20','custom-lighting-300ft','battery-operated-crystal-chandelier',
  'wireless-led-uplight','uplighting-package-12-lights',
  'tent-lighting-20x20','tent-lighting-20x30','tent-lighting-20x40','tent-lighting-30x30',
  'tent-lighting-30x45','tent-lighting-30x60','tent-lighting-40x40','tent-lighting-40x60',
  'tent-lighting-40x80','tent-lighting-40x100',

  // Phase 6 core
  'large-connect-four','cornhole','5ft-tumbling-timbers','chess-set','ladderball','pong-game',
  'cotton-candy-machinefloss-maker','popcorn-machine','snow-cone-machine','chocolate-fountain',
  'hot-dog-roller-grill','hot-dog-bun-warmer','nacho-cheese-warmer','pretzel-display-warmer',
  'foam-party-machine','podium-and-microphone','550w-bluetooth-speaker','32-gallon-trash-can',
  '120-quart-hard-ice-chest-cooler','crowd-control-stanchion','red-carpet',
  'photobooth-3-hour-with-attendant','photobooth-4-hour-with-attendant',
  'photobooth-6-hour-with-attendant','photobooth-8-hour-with-attendant',
  'photobooth-4-hour-no-attendant','photobooth-6-hour-no-attendant',
  'photobooth-8-hour-no-attendant',

  // Phase 6 service/decor — conflict/reference-only rows are intentionally omitted.
  '8-quart-full-size-chafer','roll-top-8-qt-chafer','4-qt-round-chafer','65-qt-round-top-chafer',
  '11-qt-round-soup-chafer','10-gallon-insulated-beverage-dispenser',
  '25-gallon-insulated-beverage-dispenser','coffee-urn-percolator','60-oz-beverage-pitcher',
  'wine-champagne-bucket','large-family-style-serving-bowl','85-inch-rim-soup-bowl',
  '45-oz-champagne-flute','tall-highball-glass','serving-tongs','piecake-server','sheet-pan',
  'salt-and-pepper-shaker-set','gold-5-arm-candelabra','gold-pedestal-cake-stand-14in',
  'tiered-cake-display-3-level-gold','gold-card-box','bus-bin','freezer-chest','audio-guest-book',
  'giant-uno-cards','movie-night-laptop-rental','extra-movie-night-speaker',
  '25-foot-movie-screen-with-projector','propane-heater','handwashing-station',
  'standard-portable-restroom','madison-arbor','round-wedding-arch-7ft',
  'gold-mirror-welcome-sign','gold-welcome-sign-easel','greenery-and-floral-wall-8x8',
  'sequin-backdrop-panel-8x8','water-barrel-cover','leg-drape',

  // Photo-referenced tabletop identities
  'glass-beaded-charger-plate','gold-beaded-charger-plate','6-inch-bread-and-butter-plate',
  '7-inch-salad-plate','10-inch-cake-plate','10-58-dinner-plate','725-oz-martini-glass',
  '10-12-oz-water-goblet','85-oz-wine-glass','glass-coffee-mug','pilsner-beer-glass',
  '5-oz-footed-rocks-glass','glass-carafe','dinner-fork','salad-fork','cake-fork',
  'dinner-knife','teaspoon','tablespoon-soup-spoon','serving-spoon','matching-napkins',
  '9ft-table-runner',

  // Dedicated Friendly inflatable profiles
  'rainbow-castle-bounce-house','crayon-bounce-house','pink-inflatable-bounce-house',
  'patriotic-red-white-and-blue-bounce-house','wedding-white-bounce-house',
  'fire-truck-water-slide-bounce-house','pirate-ship-slide-combo-bounce-house',
  'tidal-wave-inflatable-water-slide','fire-red-marble-inflatable-water-slide',
  '18ft-purple-tropical-marble-double-bay-waterslide','22ft-tropical-lava-wave-marble-waterslide'
]);

const CONFIGURATION_NAMES = /\b(?:package|bundle|upgrade|extra\s*hour|attendant\s*only|delivery|setup|labor|supplies|syrup|floss\s*sugar|kernel|fuel\s*cans?|propane\s*tank|linen\s*clips?)\b/i;
const TABLETOP_NAMES = /charger|plate|napkin|runner|fork|knife|spoon|pitcher|carafe|goblet|wine\s*glass|champagne\s*flute|martini|pilsner|rocks\s*glass|highball|coffee\s*mug|soup\s*bowl|centerpiece|lantern|candelabra|table\s*number|cake\s*stand|cake\s*display|chafer|beverage\s*dispenser|coffee\s*urn|percolator|chocolate\s*fountain|shaker|creamer|serving\s*bowl|sheet\s*pan|card\s*box|champagne\s*bucket/i;
const INFLATABLE_NAMES = /\bbounce\s*house\b|\bwater\s*slide\b|\bwaterslide\b|\bobstacle\s*course\b|\binflatable\s+(?:slide|game|combo)\b/i;

function friendlySlug(product){
  const id=String(product?.external_id||product?.externalId||'');
  return id.startsWith('fpr:')?id.slice(4):null;
}

function visualCoverage(product,tenantSlug){
  if(!product||product.active===false)return {level:'none',renderable:false,native:false,label:'Unavailable'};
  if(String(product.visual_model_id||'').trim()){
    return {level:'shared',renderable:true,native:true,label:'Shared native visual'};
  }
  const slug=friendlySlug(product);
  if((tenantSlug==='friendly'||tenantSlug==='friendly-nyc')&&slug&&FRIENDLY_SOURCE_VISUALS.has(slug)){
    return {level:'source',renderable:true,native:true,label:'Photo-referenced native visual'};
  }
  const name=String(product.name||'');
  if(CONFIGURATION_NAMES.test(name)){
    return {level:'configuration',renderable:false,native:false,label:'Configuration / add-on'};
  }
  if(INFERRED_FURNITURE_NAMES.test(name)){
    return {level:'inferred',renderable:true,native:true,label:'Inferred shared visual'};
  }
  if(ILLUSTRATIVE_EQUIPMENT_NAMES.test(name)){
    return {level:'illustrative',renderable:true,native:false,label:'Dedicated illustrative equipment visual'};
  }
  if(INFLATABLE_NAMES.test(name)){
    return {level:'illustrative',renderable:true,native:false,label:'Illustrative inflatable visual'};
  }
  if(TABLETOP_NAMES.test(name)||String(product.category||'').toLowerCase()==='tabletop'){
    return {level:'illustrative',renderable:true,native:false,label:'Illustrative tabletop visual'};
  }
  return {level:'generic',renderable:true,native:false,label:'Measured generic fallback'};
}

function enrichVisualCoverage(products,tenantSlug){
  return (products||[]).map(product=>({...product,visual_coverage:visualCoverage(product,tenantSlug)}));
}

module.exports={FRIENDLY_SOURCE_VISUALS,visualCoverage,enrichVisualCoverage};
