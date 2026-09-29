from pathlib import Path
import json,re
changed=[]
def edit(path,old,new):
 p=Path(path);s=p.read_text();assert s.count(old)==1,(path,old[:80],s.count(old));p.write_text(s.replace(old,new));changed.append(path)
def prepend(path,line):
 p=Path(path);s=p.read_text();assert line not in s;p.write_text(line+'\n'+s);changed.append(path)
edit('js/data/phase6b-reference.js','return {...r,dimensions:r.dimensions?',"return {...r,category:r.kind==='tabletop'?'tabletop':(['movie-speaker','audio-phone'].includes(r.type)?'audio':['laptop','movie-screen'].includes(r.type)?'photo':r.type==='patio-heater'?'climate':r.type==='oversize-cards'?'games':['bus-bin','freezer','handwash','portable-restroom'].includes(r.type)?'service':'accessories'),dimensions:r.dimensions?")
prepend('js/data/equipment.js',"import {phase6bReference} from './phase6b-reference.js';\nimport {phase6bDimensions} from './phase6b-dimensions.js';")
edit('js/data/equipment.js','export function equipmentType(product){',"export function equipmentType(product){\n  const b=phase6bReference(product);if(b?.kind==='equipment')return b.type;")
edit('js/data/equipment.js','    const type=equipmentType(p);',"    const phase6b=phase6bReference(p);if(phase6b?.kind==='tabletop'||phase6b?.placement==='tabletop')return [];\n    const type=equipmentType(p);")
edit('js/data/equipment.js',"model=phase6?.kind==='equipment'?profile(phase6.type,p.name,phase6.category,...phase6.dimensions):byType(type||'generic')", "model=phase6b?.kind==='equipment'?profile(phase6b.type,p.name,phase6b.category,...phase6b.dimensions):phase6?.kind==='equipment'?profile(phase6.type,p.name,phase6.category,...phase6.dimensions):byType(type||'generic')")
edit('js/data/equipment.js','reference:phase6||phase5Reference(p)','reference:phase6b||phase6||phase5Reference(p)')
edit('js/data/equipment.js',"heightConfirmed:!!height,visualFidelity:type?'illustrative':'footprint'", "heightConfirmed:!!height,...(phase6b?.kind==='equipment'?phase6bDimensions(p):{}),visualFidelity:type?'illustrative':'footprint'")
prepend('js/data/accessories.js',"import {phase6bReference} from './phase6b-reference.js';\nimport {phase6bDimensions} from './phase6b-dimensions.js';")
edit('js/data/accessories.js','function profileFor(product){',"function profileFor(product){\n  const b=phase6bReference(product);if(b?.kind==='equipment'){const [w,d,h]=b.dimensions;return {type:b.type,category:b.category.replace(/^./,c=>c.toUpperCase()),w,d,h};}")
edit('js/data/accessories.js',"      sourceCategory:product.category||'other',", "      sourceCategory:product.category||'other',\n      reference:phase6bReference(product)||phase6Reference(product),\n      ...(phase6bReference(product)?.kind==='equipment'?phase6bDimensions(product):{}),")
prepend('js/ui/equipment-motion3d.js',"import {createPhase6bModel} from './phase6b-models3d.js';")
edit('js/ui/equipment-motion3d.js',' const phase6=createPhase6Equipment(p,item);'," const b=createPhase6bModel(p,item);if(b){b.rotation.y=-(Number(item.rotationDeg)||0)*Math.PI/180;return b;}\n const phase6=createPhase6Equipment(p,item);")
prepend('js/ui/accessory3d.js',"import {createPhase6bModel} from './phase6b-models3d.js';")
edit('js/ui/accessory3d.js','  const phase6=createPhase6Equipment(product,{...item,rotationDeg:0});',"  const b=createPhase6bModel(product,{...item,rotationDeg:0});if(b){b.userData.kind='accessory';return b;}\n  const phase6=createPhase6Equipment(product,{...item,rotationDeg:0});")
prepend('js/data/tabletop.js',"import {phase6bReference} from './phase6b-reference.js';")
edit('js/data/tabletop.js','reference:tabletopReference(p)','reference:phase6bReference(p)||tabletopReference(p)')
prepend('js/ui/tabletop3d.js',"import {createPhase6bModel} from './phase6b-models3d.js';")
edit('js/ui/tabletop3d.js','const reference=makeTabletopReference(p,pos.color);','const reference=createPhase6bModel(p)||makeTabletopReference(p,pos.color);')
prepend('js/ui/tabletop-symbols.js',"import {phase6bSymbol} from './phase6b-symbols.js';")
edit('js/ui/tabletop-symbols.js',"export function tabletopSymbol(p,color='White'){", "export function tabletopSymbol(p,color='White'){\n const phase6b=phase6bSymbol(p);if(phase6b)return phase6b;")
edit('catalog-preview/index.html',"import {phase6Reference,isPhase6Configuration} from '../js/data/phase6-reference.js';", "import {phase6Reference,isPhase6Configuration} from '../js/data/phase6-reference.js';\nimport {phase6bReference} from '../js/data/phase6b-reference.js';")
edit('catalog-preview/index.html',' if(isPhase6Configuration(p)){', " if(phase6bReference(p)){\n  const ref=phase6bReference(p);\n  if(ref.kind==='reference-only'){visual.textContent=ref.note;status.textContent='Reference conflict — no verified model';}\n  else{try{const {mountCatalogPhase6b}=await import('../js/ui/catalog-phase6b.js');const viewer=mountCatalogPhase6b(visual,p,showFallback);if(!viewer)throw new Error('Model unavailable');status.textContent='Live RentSketch geometry · Drag to rotate · '+viewer.note;}catch(error){showFallback();}}\n }else if(isPhase6Configuration(p)){")
edit('dashboard/app.js','var phase6AuditReference=null,phase6AuditConfiguration=null;', 'var phase6AuditReference=null,phase6AuditConfiguration=null,phase6bAuditReference=null;')
edit('dashboard/app.js',' function catalogAuditPhase(product){', ' function catalogAuditPhase(product){\n   if(phase6bAuditReference?.(product))return 6;')
edit('dashboard/app.js',"   const phase6=phase6AuditReference?.(product);", "   const b=phase6bAuditReference?.(product);if(b)return {kind:'review',label:b.kind==='reference-only'?'Photo/spec conflict':'Photo-referenced model',detail:b.note};\n   const phase6=phase6AuditReference?.(product);")
edit('dashboard/app.js',"     const phase6=await import('../js/data/phase6-reference.js?v=20260929-phase6-core3');", "     const b=await import('../js/data/phase6b-reference.js?v=20260929-phase6b-1');phase6bAuditReference=b.phase6bReference;\n     const phase6=await import('../js/data/phase6-reference.js?v=20260929-phase6-core3');")
# Give every affected module one normalized import-map identity, including new
# dependencies used through Table Studio or nested customer renderers.
modules=['data/phase6b-reference.js','data/phase6b-dimensions.js','data/equipment.js','data/accessories.js','data/tabletop.js','ui/phase6b-models3d.js','ui/phase6b-serviceware3d.js','ui/phase6b-event-equipment3d.js','ui/catalog-phase6b.js','ui/phase6b-symbols.js','ui/equipment-motion3d.js','ui/accessory3d.js','ui/tabletop3d.js','ui/tabletop-symbols.js']
for name in ['designer/index.html','catalog-preview/index.html']:
 p=Path(name);s=p.read_text();m=re.search(r'(<script type="importmap">)(.*?)(</script>)',s,re.S);assert m
 mapping=json.loads(m.group(2))
 for module in modules:mapping['imports']['../js/'+module]='../js/'+module+'?v=20260929-phase6b-1'
 s=s[:m.start(2)]+json.dumps(mapping,separators=(',',':'))+s[m.end(2):];p.write_text(s);changed.append(name)
p=Path('dashboard/index.html');s=p.read_text();s,n=re.subn(r'app\.js\?v=[^"\s]+','app.js?v=20260929-phase6b-1',s);assert n==1;p.write_text(s);changed.append(str(p))
print('Integrated',len(set(changed)),'files; booking, prices and seating untouched')
