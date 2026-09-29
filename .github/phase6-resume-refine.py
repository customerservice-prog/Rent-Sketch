from pathlib import Path
import json

def replace(path, old, new):
    p=Path(path); text=p.read_text()
    assert text.count(old)==1,(path,old[:90],text.count(old))
    p.write_text(text.replace(old,new))

p='js/ui/phase6-equipment3d.js'
replace(p,"const ref=phase6Reference(product);if(!ref||ref.kind!=='equipment')return null;","const ref=phase6Reference(product);if(!ref)return null;")
replace(p,"const quarter=Math.abs((Number(item.rotationDeg)||0)%180-90)<1e-7;", "const quarter=Math.abs(Math.abs((Number(item.rotationDeg)||0)%180)-90)<1e-7;\n const defaults=ref.dimensions||[2,2,2];")
for i in range(3):
    replace(p,f'ref.dimensions[{i}]',f'defaults[{i}]')
replace(p,"const s=shapes(body),{mesh,box,cyl,rod,curve,lathe}=s;",'''// A contradictory/missing reference may retain a saved rental selection,
 // but it must not quietly fall through to a convincing, wrong generic model.
 if(ref.kind==='reference-only'){
  const geometry=new THREE.EdgesGeometry(new THREE.BoxGeometry(.98,.98,.98));
  const outline=new THREE.LineSegments(geometry,new THREE.LineDashedMaterial({color:'#a17737',dashSize:.06,gapSize:.035}));
  outline.position.y=.49;outline.computeLineDistances();body.add(outline);
  root.name='Unverified footprint — '+(product.name||ref.type);
  root.userData={kind:'equipment',itemId:item.id,reference:ref,referenceOnly:true,dimensionsVerified:false,
   features:{type:'unverified-footprint',physicalModel:false},
   asset:{...equipmentAssetDescriptor(product,'generic'),fidelity:'footprint',source:{kind:'unverified-reference',externalId:ref.externalId,referenceUrl:ref.referenceUrl,notes:ref.note}}};
  root.traverse(o=>{o.userData.itemId=item.id;});attachEquipmentOperation(root,'generic',item);return root;
 }
 const s=shapes(body),{mesh,box,cyl,rod,curve,lathe}=s;''')
replace(p,"lathe([[.20,0],[.25,.035],[.39,.13],[.46,.42],[.48,.50],[.47,.53],[.45,.50],[.43,.42],[.36,.14],[.24,.06],[.20,.05]],steel,0,.4,0,40);horizontalRing(.473,.008,steel,0,.91,0);", "// Reference bowl has near-vertical sides and a rolled lip, not a salad-bowl cone.\n  lathe([[.13,.03],[.37,.03],[.438,.055],[.465,.105],[.468,.485],[.481,.493],[.481,.510],[.455,.507],[.450,.48],[.448,.12],[.426,.086],[.365,.067],[.13,.067],[.13,.03]],steel,0,.4,0,48);horizontalRing(.473,.009,steel,0,.903,0);")
replace(p,"openSteelBowl:true,pinkTabletopBase:true,noCart:true", "openSteelBowl:true,wallProfile:'near-cylindrical',pinkTabletopBase:true,noCart:true")
replace(p,"box(.61,.023,.045,black,0,.29,.49,.008);knobs([.29],.12,.465);", "box(.84,.012,.022,steel,0,.167,.484,.003);for(const x of [-.38,.38])for(const y of [.23,.74])disc(.008,.006,steel,x,y,.481);knobs([.29],.12,.465);")
replace(p,"for(const x of [-.42,.42]){box(.018,.49,.79,glass,x,.57,0,.005);rod([x,.33,-.35],[x,.87,-.23],.009,steel);}\n  const cover=box(.86,.012,.84,glass,0,.851,0,.005);cover.rotation.x=-.13;",'''// Curved clear guard follows the reference instead of a tilted solid slab.
  const profile=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI/2;profile.push({y:.38+.50*Math.cos(a),z:-.38+.82*Math.sin(a)});}
  const vertices=[],indices=[];for(const v of profile)vertices.push(-.42,v.y,v.z,.42,v.y,v.z);
  for(let i=0;i<profile.length-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  const guard=new THREE.BufferGeometry();guard.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));guard.setIndex(indices);guard.computeVertexNormals();mesh(guard,glass);
  for(const x of [-.42,.42]){curve(profile.map(v=>[x,v.y,v.z]),.006,steel);rod([x,.33,-.38],[x,.88,-.38],.008,steel);}''')
replace(p,"rollers:7,sneezeGuard:true,foodIncluded:false", "rollers:7,sneezeGuard:true,curvedGuard:true,foodIncluded:false")

p='tests/phase6-core.test.mjs'
replace(p,"const products=JSON.parse(fs.readFileSync(new URL('../qa-phase6/catalog.json',import.meta.url))).products;",'''// Synthetic prices and IDs here are test fixtures only; production still reads
// Friendly's live catalog. Live IDs/photos are separately checked in browser QA.
const product=slug=>({id:'test-'+slug,external_id:'fpr:'+slug,name:slug.replaceAll('-',' '),category:'other',active:true,price_per_day:'37.25'});
const products=PHASE6_SLUGS.map(product).concat(['cotton-candy-floss-sugar-pink','snow-cone-syrup-cherry','55-oz-popcorn-kernel','sterno-fuel-cans-pack-of-2','20-lb-propane-tank','100-lb-propane-tank','photobooth-extra-hour-attended','photobooth-4x6-print-upgrade','photobooth-custom-backdrop-upgrade'].map(product));''')

p='tests/phase6-core-mesh.cjs'
replace(p,"if(ref.kind==='reference-only'){check(result===null,'reference conflict not guessed');continue;}",'''if(ref.kind==='reference-only'){
   check(result===null,'reference conflict not guessed in audit');
   const saved={id:'conflict',x:7,y:9,widthFt:3,depthFt:2,heightFt:2,rotationDeg:0},before=JSON.stringify(saved),outline=factory.createPhase6Equipment(p,saved);
   check(outline?.userData.referenceOnly===true,'designer shows outline, never an unrelated modeled machine');
   let physicalMeshes=0;outline.traverse(o=>{if(o.isMesh)physicalMeshes++;});check(physicalMeshes===0,'conflict has no fabricated solid model');
   check(outline.userData.operation.supported===false,'unverified equipment does not animate');check(JSON.stringify(saved)===before,'conflicting rental keeps saved identity and placement');continue;
  }''')
replace(p,"for(const angle of [0,90,180,270])", "for(const angle of [-270,-90,0,90,180,270,450])")
replace(p,"check(factory.createPhase6Equipment({name:'Popcorn Machine',externalId:'other:popcorn-machine'}, {})===null,'similar foreign source not mapped');",'''for(const slug of ['cotton-candy-machinefloss-maker','hot-dog-roller-grill']){
  const p=products.find(p=>p.external_id==='fpr:'+slug),model=factory.createPhase6Equipment(p);
  check(slug.startsWith('cotton')?model.userData.features.wallProfile==='near-cylindrical':model.userData.features.curvedGuard===true,'reviewed photo-specific shape retained');
 }
 check(factory.createPhase6Equipment({name:'Popcorn Machine',externalId:'other:popcorn-machine'}, {})===null,'similar foreign source not mapped');''')

for name in ['catalog-preview/index.html','designer/index.html','dashboard/app.js','dashboard/index.html','js/data/phase6-reference.js']:
 p=Path(name);s=p.read_text().replace('20260929-phase6-core1','20260929-phase6-core2').replace('2026.09.29.core1','2026.09.29.core2');p.write_text(s)
print('Reviewed Phase 6 refinements applied; no booking or seating source modified.')
replace('tests/phase6-core-browser.cjs',"chromium.launch({headless:true,args:","chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:")
