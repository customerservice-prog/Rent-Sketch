// Source identifiers, not fuzzy display names, select Friendly photo profiles.
// Dimensions parsed from product names are nominal, never measured/certified.
const sourceOf=p=>String(p.externalId||p.external_id||'');
export function tabletopReference(p={}){
 const source=sourceOf(p),slug=source.startsWith('fpr:')?source.slice(4):'',name=String(p.name||'');
 const known={
  'glass-beaded-charger-plate':{family:'charger',finish:'clear',beads:'clear',diameterIn:13},
  'gold-beaded-charger-plate':{family:'charger',finish:'clear',beads:'gold',diameterIn:13},
  '6-inch-bread-and-butter-plate':{family:'plate',shape:'square',diameterIn:6,nominalSize:true},
  '7-inch-salad-plate':{family:'plate',shape:'round',diameterIn:7,nominalSize:true},
  '10-inch-cake-plate':{family:'plate',shape:'round',diameterIn:10,nominalSize:true},
  '10-58-dinner-plate':{family:'plate',shape:'round',diameterIn:10.625,nominalSize:true},
  '725-oz-martini-glass':{family:'glass',glassShape:'martini',heightFt:.54},
  '10-12-oz-water-goblet':{family:'glass',glassShape:'goblet',heightFt:.50},
  '85-oz-wine-glass':{family:'glass',glassShape:'wine',heightFt:.60},
  'glass-coffee-mug':{family:'glass',glassShape:'mug',heightFt:.32},
  'pilsner-beer-glass':{family:'glass',glassShape:'pilsner',heightFt:.64},
  // The listed photo depicts a tall straight tumbler, despite the product name.
  '5-oz-footed-rocks-glass':{family:'glass',glassShape:'tumbler',heightFt:.46,referenceNote:'Website photo and footed-rocks name disagree; shape follows the photo, dimensions require confirmation.'},
  'glass-carafe':{family:'glass',glassShape:'carafe',heightFt:.79},
  'dinner-fork':{family:'fork',lengthFt:.67},'salad-fork':{family:'fork',lengthFt:.59},'cake-fork':{family:'fork',lengthFt:.51},
  'dinner-knife':{family:'knife',lengthFt:.76},'teaspoon':{family:'spoon',lengthFt:.52},'tablespoon-soup-spoon':{family:'spoon',lengthFt:.65},'serving-spoon':{family:'spoon',lengthFt:.91},
  'matching-napkins':{family:'napkin'},'9ft-table-runner':{family:'runner',lengthFt:9,material:'satin'},
 };
 if(!known[slug])return null;
 return {...known[slug],referenceSlug:slug,photoReferenced:true,dimensionsConfirmed:false,name};
}
