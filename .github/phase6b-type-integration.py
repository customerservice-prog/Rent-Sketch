from pathlib import Path
p=Path('js/data/tabletop.js');s=p.read_text();old='export function tabletopType(product){';assert s.count(old)==1
new="""export function tabletopType(product){
 if(product.active===false)return null;
 const b=phase6bReference(product);
 if(b&&(b.kind==='tabletop'||b.placement==='tabletop')){
  const t=b.type;
  return t.startsWith('chafer-')?'chafer':['insulated-dispenser','coffee-urn'].includes(t)?'dispenser':['ribbed-pitcher','pitcher-conflict'].includes(t)?'pitcher':['flute','highball'].includes(t)?'glass':t==='rim-bowl'?'bowl':['serving-tongs','cake-server'].includes(t)?'utensil':t==='metal-shakers'?'condiment':t==='candelabra'?'candle':['cake-plateau','tiered-stand','dish-conflict'].includes(t)?'stand':'serving';
 }
"""
p.write_text(s.replace(old,new))
# Make empty fuel holders visibly hollow; selecting a chafer does not buy fuel.
p=Path('js/ui/phase6b-serviceware3d.js');s=p.read_text();old="cyl(.09,.07,steel,x,y,0,28);torus(.09,.009,steel,x,y+.04,0,true);";new="lathe([[.09,0],[.09,.04],[.078,.04],[.078,.01],[0,.01],[0,0]],steel,x,y,0,28);torus(.09,.007,steel,x,y+.04,0,true);";assert s.count(old)==1;p.write_text(s.replace(old,new))
