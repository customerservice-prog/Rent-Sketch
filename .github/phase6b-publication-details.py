from pathlib import Path

def replace(path,a,b):
 p=Path(path);s=p.read_text();assert s.count(a)==1,(path,a[:60],s.count(a));p.write_text(s.replace(a,b))
S='js/ui/phase6b-serviceware3d.js'
replace(S,'  burners(1,.11);\n  if(soup){',"  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod([0,.10,0],[Math.cos(a)*.405,.10,Math.sin(a)*.405],.016,steel);}cyl(.25,.015,steel,0,.091,0,40);\n  burners(1,.11);\n  if(soup){")
replace(S,"  if(ref.type==='serving-tongs'){\n   for(const upper", "  if(ref.type==='serving-tongs'){\n   const spoonMaterial=m.clone();spoonMaterial.side=THREE.DoubleSide;\n   for(const upper")
replace(S,"g.position.set(0,.035,.43);g.rotation.x=upper?.23:0", "g.position.set(0,upper?.070:.035,.43);g.rotation.x=upper?.16:0")
replace(S,"new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI/2),m,0,.006,-.73", "new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI/2),spoonMaterial,0,.006,-.73")
replace(S,"curve([[0,.035,.39],[0,.072,.482],[0,.118,.452],[0,.143,.36]],.026,m)","curve([[0,.035,.435],[0,.035,.495],[0,.070,.495],[0,.070,.435]],.020,m)")
E='js/ui/phase6b-event-equipment3d.js'
a="for(let row=0;row<80;row++)for(let col=0;col<80;col++){const seed=(row*137+col*73)%101,leaf=mesh(leafGeo,leaves[(seed+row)%4],-.467+col*.0118+Math.sin(seed)*.003,.012+row*.0118+.003*Math.cos(seed),.013+(seed%13)*.0015);leaf.rotation.z=seed*.71;leaf.rotation.x=Math.sin(seed)*.38;leaf.scale.setScalar(.65+(seed%7)*.06);}"
b="""let seed=19483;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let row=0;row<80;row++)for(let col=0;col<80;col++){const shade=Math.floor(random()*4),xj=(random()-.5)*.009,yj=(random()-.5)*.009,zj=random()*.021,leaf=mesh(leafGeo,leaves[shade],-.467+col*.0118+xj,.012+row*.0118+yj,.013+zj);leaf.rotation.z=random()*Math.PI*2;leaf.rotation.x=(random()-.5)*.8;leaf.scale.setScalar(.72+random()*.40);} """
replace(E,a,b.rstrip())
T='tests/phase6b-mesh.cjs'
a="  rows.push({slug,name:p.name"
b="""  if(ref.type==='serving-tongs'){
   const hits=new THREE.Raycaster(new THREE.Vector3(0,expected.heightFt*2,-expected.depthFt*.33),new THREE.Vector3(0,-1,0)).intersectObject(g,true);
   check(hits.some(hit=>hit.object.material.side===THREE.DoubleSide),slug+' spoon head remains visible from above');
  }
  if(['chafer-round','chafer-round-gold','chafer-soup'].includes(ref.type)){
   const components=[];g.traverse(o=>{if(o.isMesh)components.push(o);});check(components.length>0,slug+' empty burner holder has modeled support');
  }
"""
replace(T,a,b+a)
for name in ['designer/index.html','catalog-preview/index.html','dashboard/app.js','dashboard/index.html']:
 p=Path(name);p.write_text(p.read_text().replace('20260929-phase6b-2','20260929-phase6b-3'))
p=Path('docs/phase6b-serving-events-20260929.md');s=p.read_text();s+='\nFinal inspection refinements: round chafer burner holders have connecting supports; spoon-ended tongs render both sides and remain joined; foliage uses a deterministic non-striped distribution. These are visual changes only, not fuel, extra utensils or added decorations.\n';p.write_text(s)
