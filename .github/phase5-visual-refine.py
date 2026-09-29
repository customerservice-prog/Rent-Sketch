from pathlib import Path
import json,re
paths=['js/ui/catalog-phase5.js','js/ui/catalog-furniture3d.js','js/ui/lighting-reference3d.js','js/ui/phase5-floor3d.js','js/ui/phase5-equipment3d.js','catalog-preview/index.html','designer/index.html','tests/phase5-harness.html']
def replace(path,a,b):
 p=Path(path);s=p.read_text();assert s.count(a)==1,(path,a,s.count(a));p.write_text(s.replace(a,b))
replace(paths[0],"createRopeReel,createChandelier}","createRopeReel,createChandelier,createUplight}")
p=Path(paths[0]);s=p.read_text();start=s.index("  else if(['c7','bistro'].includes(reference.type)&&!installed){");end=s.index("  }else if(reference.type==='chandelier'",start)
s=s[:start]+'''  else if(['c7','bistro'].includes(reference.type)&&!installed){
   model=createStringFixture(reference.type);const s=shapes(model),cord=material(reference.type==='c7'?'#dfdfd3':'#23242a');
   s.curve([[-.15,0,0],[0,-.005,0],[.15,.02,0]],.009,cord);mergeStatic(model);
   model.userData={fixtureType:reference.type,hardwareDetail:true,singleBulbDetail:true};
  }else if(reference.type==='uplight'&&!installed){
   const count=reference.fixtureCount||1;model=new THREE.Group();
   for(let i=0;i<count;i++){const fixture=createUplight();if(count>1)fixture.position.set((i%4-1.5)*.80,0,(Math.floor(i/4)-1)*.82);model.add(fixture);}mergeStatic(model);
   model.userData={fixtureCount:count,lensesPerFixture:6,hardwareDetail:true};
'''+s[end:]
s=s.replace(" return {model,reference,note:reference.note+", " if(reference.kind==='lighting'&&['c7','bistro','chandelier'].includes(reference.type))model.userData.previewBackground='#35443e';\n return {model,reference,note:reference.note+")
s=s.replace("' Hardware/fixture preview; mounting and venue are not included.'","(model.userData.singleBulbDetail?' One bulb close-up; the installed example shows the tentative lighting route.':' Hardware/fixture preview; mounting and venue are not included.')")
p.write_text(s)
replace(paths[1],"scene.background=new THREE.Color('#f5f6f5')","scene.background=new THREE.Color(suppliedModel?.userData.previewBackground||'#f5f6f5')")
replace(paths[1],"let distance=2;for(const x", "let distance=suppliedModel?.userData.hardwareDetail ? .05 : 2;for(const x")
replace(paths[1],"controls.minDistance=Math.max(1,distance*.45)","controls.minDistance=Math.max(suppliedModel?.userData.hardwareDetail ? .025 : 1,distance*.45)")
replace(paths[2],"led:material('#b9b2ff',{emissive:'#6452ff'","led:material('#6553b2',{emissive:'#4420c5'")
replace(paths[2],"s.box(.56,.56,.54,m.dark,0,.32,0,.04,'Black fixture');","s.box(.56,.64,.54,m.dark,0,.37,0,.04,'Black fixture');\n for(const x of [-.267,.267])s.box(.046,.064,.54,m.dark,x,.718,0,.013,'Lens guard');for(const z of [-.246,.246])s.box(.56,.064,.046,m.dark,0,.718,z,.013,'Lens guard');")
replace(paths[2],"s.box(.035,.57,.24,m.dark,x,.29,0,.011)","s.box(.035,.65,.24,m.dark,x,.33,0,.011)")
replace(paths[2],"x,.607,z,18);s.cyl(.061,.021,m.led,x,.617,z,18)","x,.696,z,18);s.cyl(.061,.009,m.led,x,.707,z,18)")
replace(paths[2],"for(const y of [.08,.92])s.cyl(.49,.035,m.dark,0,y,0,48);s.cyl(.30,.82,m.dark,0,.50,0,32);", "for(const y of [.08,.92]){const rim=s.mesh(new THREE.TorusGeometry(.455,.035,6,48),m.dark,0,y,0);rim.rotation.x=Math.PI/2;s.cyl(.115,.036,m.dark,0,y,0,24);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;s.rod([Math.sin(a)*.07,y,Math.cos(a)*.07],[Math.sin(a)*.46,y,Math.cos(a)*.46],.025,m.dark);}}s.cyl(.30,.82,m.dark,0,.50,0,32);")
replace(paths[2],"if(isBistro){const q=s.mesh(new THREE.SphereGeometry(.081,12,10),m.warm,0,-.177,0,'Round bistro bulb');q.scale.y=1.18;}","if(isBistro){const glass=material('#eed9b7',{transparent:true,opacity:.48,roughness:.14,depthWrite:false});const q=s.mesh(new THREE.SphereGeometry(.081,16,12),glass,0,-.177,0,'Round bistro bulb');q.scale.y=1.18;s.curve([[-.022,-.115,0],[-.026,-.18,0],[0,-.227,0],[.026,-.18,0],[.022,-.115,0]],.004,m.warm);}else for(let i=0;i<8;i++){const a=i/8*Math.PI*2;s.rod([Math.sin(a)*.028,-.083,Math.cos(a)*.028],[Math.sin(a)*.028,-.025,Math.cos(a)*.028],.003,m.white);}")
replace(paths[2]," else{s.lathe([[0,0],[.014,.025],[.032,.074],[.028,.103],[.022,.119]]", " if(!isBistro){s.lathe([[0,0],[.014,.025],[.032,.074],[.028,.103],[.022,.119]]")
replace(paths[3],"face=material(texture?'#ffffff':'#a96038'","face=material(texture?'#b39482':'#7b3b20'")
replace(paths[3],"c.fillStyle='#a6643e'","c.fillStyle='#854527'")
replace(paths[3],"rgba(220,170,112,.15)","rgba(216,169,124,.20)")
replace(paths[4],"const ring=cyl(.077,.028,black,x,y,.237,20);ring.rotation.x=Math.PI/2;", "const ring=cyl(.064,.028,black,x,y,.237,20);ring.scale.set(1.2,1,.70);ring.rotation.x=Math.PI/2;")
replace(paths[5],"reference.kind==='lighting'&&['c7','bistro','rope'].includes(reference.type)","reference.kind==='lighting'")
replace(paths[7],"model=result.model;scene.add(model);", "model=result.model;scene.background.set(model.userData.previewBackground||'#e6ebe7');scene.add(model);")
for name in [paths[5],paths[6]]:
 p=Path(name);s=p.read_text().replace('20260929-phase5-1','20260929-phase5-2');m=re.search(r'(<script type="importmap">)(.*?)(</script>)',s,re.S);mapping=json.loads(m.group(2));mapping['imports']['../js/ui/catalog-furniture3d.js']='../js/ui/catalog-furniture3d.js?v=20260929-phase5-2';s=s[:m.start(2)]+json.dumps(mapping,separators=(',',':'))+s[m.end(2):];p.write_text(s)
print('Applied reviewed visual corrections to',len(paths),'files')
