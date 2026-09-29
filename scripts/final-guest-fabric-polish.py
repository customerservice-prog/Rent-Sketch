from pathlib import Path
import hashlib,re,json
p=Path('js/ui/scene-guests.js');s=p.read_text();assert hashlib.sha256(s.encode()).hexdigest()=='1fe685af6b390f57088257e0aa35ad6247802f1083660f99dead9e17cfa6bd33'
s=s.replace("part('detail',...shoulder,jacket?.183:.17,.183,.17,cloth);",'// Overlapping closed sleeves avoid toy-like shoulder balls.')
s=s.replace('shoulder=[side*.54,top-.16,0]','shoulder=[side*.50,top-.22,0]')
s=s.replace('lathe([[.72,-.54]','lathe([[0,-.55],[.72,-.54]').replace('[.72,.54]],16)','[.72,.54],[0,.55]],16)');p.write_text(s)
p=Path('js/ui/linen-fabric3d.js');s=p.read_text();assert hashlib.sha256(s.encode()).hexdigest()=='7054f78e8ce2d55f4b256709e73fa26bf173a1ede5b9cd37746c22a7551d6023'
s=s.replace("metalness:finish==='sequin'?.50:0","metalness:finish==='sequin'?.28:0").replace("finish==='sequin'?'#999'","finish==='sequin'?'#b8b8b8'").replace('shade=155+(row*31+col*17)%95','shade=202+(row*31+col*17)%53').replace("bump.repeat.set(finish==='sequin'?5:6,finish==='sequin'?7:6)","bump.repeat.set(finish==='sequin'?1:6,finish==='sequin'?1:6)")
old='const t=j/rows,a=i/segments*Math.PI*2;let x,z,nx,nz,physical,edgeU=0;'
new="""const t=j/rows;let a=i/segments*Math.PI*2;
  if(round&&p.stretch&&spec.tableSizeIn===60){const theta=Math.atan2(p.d*.39+.04,p.w*.30+.04),angles=[theta,Math.PI-theta,Math.PI+theta,2*Math.PI-theta,2*Math.PI+theta],q=Math.min(3,Math.floor(i/(segments/4))),u=(i-q*segments/4)/(segments/4);a=angles[q]+(angles[q+1]-angles[q])*u;}
  let x,z,nx,nz,physical,edgeU=0;"""
assert old in s;s=s.replace(old,new)
s=s.replace('vertices.push(x,y,z);uv.push(i/segments,t);',"vertices.push(x,y,z);uv.push(i/segments*(spec.material==='sequin'?(round?Math.PI*p.w:2*(p.w+p.d)):1),t*(spec.material==='sequin'?Math.max(.01,physical):1));")
needle=' return g;\n}'
extra=" if(spec.material==='sequin')for(const child of g.children){if(child.name!=='Linen tabletop')continue;const uv=child.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*p.w,uv.getY(i)*p.d);uv.needsUpdate=true;}\n"
assert needle in s;s=s.replace(needle,extra+needle);p.write_text(s)
p=Path('docs/phase4-linens-20260929.md');s=p.read_text().replace('40 website image references','39 website image references').replace('36 supported','35 supported');s+='\nThe final canonical public image reference fetch returned 39 images. There are 35 production-model previews, 3 reference-only items, and 1 multi-item bundle. These are not blanket visual approvals.\n';p.write_text(s)
Path('docs/guest-model-assets.md').write_text('''# Guest model graphical sources and limits

The sculpted head/scalp subset in `js/data/guest-anatomy.js` derives from MakeHuman core graphical asset `makehuman/data/3dobjs/base.obj`, pinned at `a8bc2d54ff0ac92e78ff71431b1023eda42bf482` in `makehumancommunity/makehuman`. Core graphical assets are CC0 1.0; the copied license is `docs/licenses/makehuman-cc0.md`. The MakeHuman application source is not copied or distributed.

`python scripts/build-guest-anatomy.py /path/to/base.obj` reproduces the local head/scalp data. Only the head subset ships. Body, helper and rig parts from the source asset are excluded. The body, garments, shoes, individual fingers, articulations and instanced animation implementation are RentSketch procedural geometry. There is no third-party runtime model request and no customer-image processing.

Guests remain decorative preview objects. They never become inventory, quote or checkout lines. Eleven shared instanced batches are used regardless of crowd count. Existing motion toggle, reduced-motion preference and visibility handling remain. Tests check finite animated transforms, seating, unchanged rental data, instance allocation and 24/40-person batches. These are more anatomically detailed planning characters, not photorealistic scanned people or motion-captured actors.
''')
for file in ['designer/index.html','catalog-preview/index.html']:
 p=Path(file);s=p.read_text();m=re.search(r'(<script type="importmap">)(.*?)(</script>)',s,re.S);assert m;mapping=json.loads(m.group(2))
 for module in ['scene-guests','linen-fabric3d','equipment3d','catalog-phase4','catalog-furniture3d','tabletop3d','tabletop-reference3d']:mapping['imports']['../js/ui/'+module+'.js']='../js/ui/'+module+'.js?v=20260929-guests-phase4-final'
 for module in ['guest-anatomy','linens','linen-spec','tabletop','tabletop-reference']:mapping['imports']['../js/data/'+module+'.js']='../js/data/'+module+'.js?v=20260929-guests-phase4-final'
 s=s[:m.start(2)]+json.dumps(mapping,separators=(',',':'))+s[m.end(2):];s=s.replace('catalog-phase4.js?v=20260929-phase4-1','catalog-phase4.js?v=20260929-guests-phase4-final');p.write_text(s)
print('Final anatomy and physical-fabric corrections applied; booking code unchanged')
