from pathlib import Path
import json,re

def replace(path,a,b):
 p=Path(path);s=p.read_text();assert s.count(a)==1,(path,a[:80],s.count(a));p.write_text(s.replace(a,b))
def block(path,start,end,new):
 p=Path(path);s=p.read_text();assert s.count(start)==1 and s.count(end)==1,(path,start);a=s.index(start);b=s.index(end,a);p.write_text(s[:a]+new+s[b:])
S='js/ui/phase6b-serviceware3d.js';E='js/ui/phase6b-event-equipment3d.js';R='js/data/phase6b-reference.js'
for name in [S,E]:
 p=Path(name);s=p.read_text();p.write_text("import {vesselGeometry} from './phase6b-vessels3d.js';\n"+s)
replace(S,"material('#b8c2c7',{metalness:.78,roughness:.24})","material('#d5dadb',{metalness:.52,roughness:.3})")
replace(S,"material('#b38c36',{metalness:.75,roughness:.27})","material('#d1ae61',{metalness:.53,roughness:.3})")
replace(S,"opacity:.33,roughness:.08,metalness:.04","opacity:.14,roughness:.08,metalness:.02")
block(S,' function pan(width,depth,bottom,top,m=steel){',' function loopHandle(',""" function pan(width,depth,bottom,top,m=steel){mesh(vesselGeometry(width,depth,bottom,top,{taper:.90,radius:.043,thickness:.012}),m);}
""")
replace(S,"return lathe([[0,.008],[r*.5,.008],[r*.82,.055],[r,h],[r-.024,h+.008],[r*.78,.08],[r*.47,.036],[0,.036]],m,0,y,0,48);","return lathe([[0,.008],[r*.45,.008],[r*.60,h*.10],[r*.78,h*.34],[r*.92,h*.70],[r,h],[r-.024,h+.008],[r*.87,h*.70],[r*.72,h*.36],[r*.52,h*.16],[0,.036]],m,0,y,0,48);")
block(S,"  const soup=ref.type==='chafer-soup'","  f={...f,pan:soup?'deep-soup'", """  const soup=ref.type==='chafer-soup',bodyY=soup?.28:.37;
  for(let i=0;i<3;i++){
   const a=i*Math.PI*2/3,cos=Math.cos(a),sin=Math.sin(a),tangent=new THREE.Vector3(-sin,0,cos),positions=[],indices=[];
   const stations=[[.43,bodyY+.12],[.37,.20],[.43,.026],[.51,.025]];
   for(const [r,y] of stations)for(const [side,thick] of [[-1,-1],[1,-1],[-1,1],[1,1]]){positions.push(cos*(r+thick*.011)+tangent.x*side*.052,y,sin*(r+thick*.011)+tangent.z*side*.052);}
   for(let j=0;j<stations.length-1;j++){const k=j*4;for(const [p,q] of [[0,1],[1,3],[3,2],[2,0]])indices.push(k+p,k+q,k+p+4,k+q,k+q+4,k+p+4);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,steel);
  }
  burners(1,.11);
  if(soup){
   lathe([[0,.015],[.39,.015],[.425,.037],[.44,.43],[.448,.455],[.418,.46],[.406,.07],[0,.058]],steel,0,bodyY,0,56);
   torus(.444,.014,steel,0,bodyY+.451,0,true);
   const lid=new THREE.Group();root.add(lid);lid.position.set(0,bodyY+.43,-.435);const ls=shapes(lid);
   ls.mesh(new THREE.CircleGeometry(.422,48),glass,0,.38,0);const rim=new THREE.Mesh(new THREE.TorusGeometry(.429,.015,8,56),steel);rim.position.y=.38;lid.add(rim);
   ls.curve([[-.085,.36,.025],[-.075,.41,.08],[.075,.41,.08],[.085,.36,.025]],.013,steel);ls.rod([-.13,0,0],[.13,0,0],.025,steel);
   for(const x of [-.53,.53])curve([[x*.8,.57,-.09],[x,.57,-.09],[x,.57,.09],[x*.8,.57,.09]],.018,steel);
  }else{
   lathe([[0,0],[.405,0],[.46,.04],[.47,.18],[.47,.21],[.445,.21],[.425,.05],[0,.035]],steel,0,bodyY,0,56);
   const m=ref.type==='chafer-round-gold'?gold:steel;
   const dome=mesh(new THREE.SphereGeometry(.448,40,26,0,Math.PI*2,0,Math.PI/2),steel,0,bodyY+.212,0);dome.scale.y=.94;
   torus(.47,.014,steel,0,bodyY+.20,0,true);curve([[-.16,bodyY+.34,.415],[-.13,bodyY+.35,.467],[.13,bodyY+.35,.467],[.16,bodyY+.34,.415]],.016,m);for(const x of [-.456,.456])disk(.028,.026,m,x,bodyY+.22,0);
  }
""")
block(S,"  box(.92,.46,.87,black,0,.62,0,.06);","  f={...f,insulated:true", """  // One molded front with an open lower tap recess, not stacked boxes.
  const face=new THREE.Shape();face.moveTo(-.43,.025);face.lineTo(-.16,.025);face.lineTo(-.16,.345);face.quadraticCurveTo(-.16,.47,0,.47);face.quadraticCurveTo(.16,.47,.16,.345);face.lineTo(.16,.025);face.lineTo(.43,.025);face.lineTo(.43,.875);face.lineTo(-.43,.875);face.closePath();
  const geom=new THREE.ExtrudeGeometry(face,{depth:.20,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:3,curveSegments:16});mesh(geom,black,0,0,.235);box(.86,.86,.66,black,0,.455,-.095,.019);
  box(.94,.054,.91,black,0,.924,0,.018);
  for(const x of [-.29,.29]){curve([[x-.10,.946,-.08],[x-.10,1.017,-.08],[x,1.037,-.08],[x+.10,1.017,-.08],[x+.10,.946,-.08]],.026,black);box(.078,.088,.041,steel,x,.882,.476,.01);box(.054,.06,.047,black,x,.883,.506,.005);}
  for(const x of [-.385,.385])box(.022,.73,.017,material('#343738'),x,.467,.474,.006);
  box(.10,.08,.06,black,0,.239,.27,.008);rod([0,.215,.278],[0,.215,.363],.022,black);rod([0,.215,.363],[0,.158,.363],.022,black);box(.06,.05,.018,steel,0,.287,.32,.005);box(.22,.051,.012,material('#3b3e3d'),0,.763,.464,.006);
""")
block(S,"   for(const sign of [-1,1]){const g=new THREE.Group();","   f={...f,joinedSpring:true", """   for(const upper of [false,true]){
    const g=new THREE.Group();root.add(g);g.position.set(0,.035,.43);g.rotation.x=upper?.23:0;const q=shapes(g);
    q.box(.068,.015,.59,m,0,0,-.29,.009);const head=q.mesh(new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI/2),m,0,.006,-.73);head.scale.set(.118,.014,.172);head.rotation.z=Math.PI;
   }
   curve([[0,.035,.39],[0,.072,.482],[0,.118,.452],[0,.143,.36]],.026,m);
""".replace("   f={...f,joinedSpring:true", "")) if False else None
# Exact block includes the original return marker on the same line.
block(S,"   for(const sign of [-1,1]){const g=new THREE.Group();","  }else{\n   box(.073", """   for(const upper of [false,true]){
    const g=new THREE.Group();root.add(g);g.position.set(0,.035,.43);g.rotation.x=upper?.23:0;const q=shapes(g);
    q.box(.068,.015,.59,m,0,0,-.29,.009);const head=q.mesh(new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI/2),m,0,.006,-.73);head.scale.set(.118,.014,.172);head.rotation.z=Math.PI;
   }
   curve([[0,.035,.39],[0,.072,.482],[0,.118,.452],[0,.143,.36]],.026,m);f={...f,joinedSpring:true,physicalCount:1};
""")
replace(S,"  const cups=[[0,.98,0]];","  rod([0,.77,0],[0,.96,0],.03,gold);for(const y of [.26,.33,.60,.83]){const bead=sphere(.059,gold,0,y,0);bead.scale.y=.85;}\n  const cups=[[0,.98,0]];")
replace(S,"cups.push([side*r,y,z]);}","cups.push([side*r,y,z]);sphere(.042,gold,side*r,y-.16,z);}")
# The ring/plane material is transparent, not frosted white plastic.
replace(E,"material('#b4c1c5',{metalness:.7,roughness:.3})","material('#d5dadb',{metalness:.52,roughness:.3})")
replace(E,"material('#b3924c',{metalness:.7,roughness:.32})","material('#d1ae61',{metalness:.53,roughness:.3})")
block(E,' function openBin(w,d,h,y,m){',' function speaker('," function openBin(w,d,h,y,m){mesh(vesselGeometry(w,d,y,y+h,{taper:.9,radius:.075,thickness:.028}),m);}\n")
block(E,"  const base=box(.76,.20,.67,white","  const points=[];for(let i=0;i<=125;i++){", """  box(.79,.095,.71,white,0,.071,0,.034);
  const v=[-.38,.09,-.335,.38,.09,-.335,.38,.09,.335,-.38,.09,.335,-.38,.405,-.335,.38,.405,-.335,.38,.184,.335,-.38,.184,.335],ix=[0,3,1,1,3,2,0,1,4,1,5,4,1,2,5,2,6,5,2,3,6,3,7,6,3,0,7,0,4,7,4,5,7,5,6,7];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();mesh(g,white);
  const face=new THREE.Group();root.add(face);face.position.set(0,.2945-.06*.33,.06);face.rotation.x=Math.atan(.33);const fs=shapes(face);
  fs.cyl(.21,.016,dark,0,.014,0,48);for(let i=0;i<10;i++){const a=i*Math.PI*2/10+.25;fs.cyl(.029,.008,white,Math.cos(a)*.151,.026,Math.sin(a)*.151,20);fs.cyl(.013,.004,dark,Math.cos(a)*.151,.031,Math.sin(a)*.151,12);}fs.cyl(.065,.012,steel,0,.033,0,28);
  for(const x of [-.29,.29])box(.065,.064,.088,white,x,.42,-.20,.016);
  curve([[-.395,.445,-.20],[-.37,.53,-.20],[0,.59,-.20],[.37,.53,-.20],[.395,.445,-.20]],.066,white);
  for(const x of [-.395,.395]){const q=sphere(.108,white,x,.445,-.20);q.scale.set(1,.48,1);torus(.089,.007,gray,x,.397,-.20,true);}
""")
replace(E,".37-u*.26,-.2+u*.46", ".445-u*.31,-.2+u*.46")
replace(E,"lathe([[.10,0],[.46,.025],[.47,.042],[.45,.048],[.13,.038]],steel,0,.913,0,64)","lathe([[0,.061],[.10,.056],[.46,.025],[.47,.042],[.45,.048],[.12,.074],[0,.078]],steel,0,.913,0,64)")
block(E,"  const casing=material('#999e9b'","  box(.73,.34,.10,casing", """  const casing=material('#89918e',{roughness:.82}),inside=material('#697872',{roughness:.85});
  box(.74,.63,.53,casing,0,.33,-.10,.025);for(const x of [-.25,.25])box(.24,.62,.20,casing,x,.327,.27,.024);box(.23,.23,.17,casing,0,.527,.27,.009);box(.19,.015,.12,dark,0,.038,.26,.012);box(.055,.018,.045,steel,0,.052,.287,.005);
  // Sink is sunk INTO the top opening rather than resting as a bowl above it.
  mesh(vesselGeometry(.51,.46,.518,.705,{taper:.54,radius:.037,thickness:.014}),inside,0,0,.055);
  for(const x of [-.322,.322])box(.13,.13,.66,casing,x,.66,.005,.01);box(.52,.085,.07,casing,0,.68,.301,.007);box(.53,.084,.13,casing,0,.68,-.254,.008);
""")
replace(E,"material('#a8b4b0',{metalness:.84,roughness:.2})","material('#d8d5c8',{metalness:.28,roughness:.21})")
block(E,"  const leaves=[material('#375f2c')"," }else if(ref.type==='sequin-wall'", """  const leaves=[material('#375d2c',{side:THREE.DoubleSide}),material('#476f31',{side:THREE.DoubleSide}),material('#687c34',{side:THREE.DoubleSide}),material('#244626',{side:THREE.DoubleSide})];
  const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,-.012,0,-.006,-.006,.001,-.007,.004,.001,0,.014,0,.007,.004,.001,.006,-.006,.001,0,0,.003],3));leafGeo.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);leafGeo.computeVertexNormals();
  for(let row=0;row<80;row++)for(let col=0;col<80;col++){const seed=(row*137+col*73)%101,leaf=mesh(leafGeo,leaves[(seed+row)%4],-.467+col*.0118+Math.sin(seed)*.003,.012+row*.0118+.003*Math.cos(seed),.013+(seed%13)*.0015);leaf.rotation.z=seed*.71;leaf.rotation.x=Math.sin(seed)*.38;leaf.scale.setScalar(.65+(seed%7)*.06);}
  f={...f,foliageLeaves:6400,nominalFaceFt:[8,8],supportFootprintVerified:false,neonSignIncluded:false,flowersOutsidePanelIncluded:false};
""")
replace(E,"  }geo.computeVertexNormals();mesh(geo,m);","  }if(sequin){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*12,uv.getY(i)*12);m.bumpScale=.001;m.roughness=.35;m.metalness=.16;m.color.set('#d4ab5b');}geo.computeVertexNormals();mesh(geo,m);")
# Curtain thickness is not the unknown space occupied by its support feet.
replace(R,"{verticalFace:true,nominalFaceFt:[8,8]});\nequipment('sequin-backdrop", "{verticalFace:true,nominalFaceFt:[8,8],visualDepthFt:.30});\nequipment('sequin-backdrop")
replace(R,"{verticalFace:true,nominalFaceFt:[8,8]});\nequipment('water-barrel", "{verticalFace:true,nominalFaceFt:[8,8],visualDepthFt:.16});\nequipment('water-barrel")
replace(R,"export const PHASE6B_SLUGS=", "rows['hexagon-wedding-arch']={kind:'reference-only',placement:'equipment',type:'arch-conflict',dimensions:[7,2,7.5],note:'Reference conflict: the item is named Hexagon Wedding Arch, but its canonical photograph appears to show a peaked seven-sided frame. Confirm the actual frame shape before using it as a visual reference; no guessed hexagon or heptagon is substituted.'};\nexport const PHASE6B_SLUGS=")
replace(R,"'2026.09.29.service1'","'2026.09.29.service2'")
M='js/ui/phase6b-models3d.js'
replace(M,'  body.scale.set(1/size.x,1/size.y,1/size.z);body.position.set(-center.x/size.x,-bounds.min.y/size.y,-center.z/size.z);', '  const depthRatio=ref.verticalFace?Math.min(1,(ref.visualDepthFt||.2)/d):1;body.scale.set(1/size.x,1/size.y,depthRatio/size.z);body.position.set(-center.x/size.x,-bounds.min.y/size.y,-center.z*depthRatio/size.z);')
for name in ['js/data/equipment.js','js/data/accessories.js']:
 p=Path(name);s=p.read_text();s=s.replace("b?.kind==='equipment'","(b?.kind==='equipment'||b?.placement==='equipment')").replace("phase6b?.kind==='equipment'","(phase6b?.kind==='equipment'||phase6b?.placement==='equipment')").replace("phase6bReference(product)?.kind==='equipment'","(phase6bReference(product)?.kind==='equipment'||phase6bReference(product)?.placement==='equipment')");p.write_text(s)
for name in ['tests/phase6b.test.mjs','tests/phase6b-mesh.cjs']:
 p=Path(name);s=p.read_text().replace("r.kind==='equipment'","(r.kind==='equipment'||r.placement==='equipment')").replace("ref.kind==='equipment'","(ref.kind==='equipment'||ref.placement==='equipment')");p.write_text(s)
replace('tests/phase6b-mesh.cjs','Math.abs(size.z-expected.depthFt)<.001',"Math.abs(size.z-(ref.verticalFace?Math.min(expected.depthFt,ref.visualDepthFt):expected.depthFt))<.001")
for name in ['designer/index.html','catalog-preview/index.html']:
 p=Path(name);s=p.read_text().replace('20260929-phase6b-1','20260929-phase6b-2');m=re.search(r'(<script type="importmap">)(.*?)(</script>)',s,re.S);mapping=json.loads(m.group(2));mapping['imports']['../js/ui/phase6b-vessels3d.js']='../js/ui/phase6b-vessels3d.js?v=20260929-phase6b-2';s=s[:m.start(2)]+json.dumps(mapping,separators=(',',':'))+s[m.end(2):];p.write_text(s)
for name in ['dashboard/app.js','dashboard/index.html']:
 p=Path(name);p.write_text(p.read_text().replace('20260929-phase6b-1','20260929-phase6b-2'))
print('Applied corrections from real photo/model comparison; retained references instead of inventing an arch')
