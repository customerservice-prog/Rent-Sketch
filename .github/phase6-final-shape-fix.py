from pathlib import Path

def replace(path,old,new):
 p=Path(path);s=p.read_text();assert s.count(old)==1,(path,s.count(old),old[:100]);p.write_text(s.replace(old,new))

p='js/ui/phase6-equipment3d.js'
replace(p,"for(let i=0;i<8;i++){const q=mesh(new THREE.TorusGeometry(.29,.025,7,8,Math.PI/4+.01),material(colors[i],{emissive:colors[i],emissiveIntensity:.16}),0,.833,0);q.rotation.z=i*Math.PI/4;q.scale.y=.5;}","// Rotate in ring-local space before anisotropic normalization. Scaling each\n  // already-positioned arc instead left disconnected pieces around the tablet.\n  for(let i=0;i<8;i++){const geo=new THREE.TorusGeometry(.29,.025,7,8,Math.PI/4+.01);geo.rotateZ(i*Math.PI/4);geo.scale(1,.5,1);mesh(geo,material(colors[i],{emissive:colors[i],emissiveIntensity:.16}),0,.833,0);}")
replace(p,"features={...features,ringLight:true,tablet:true,hours:ref.hours", "features={...features,ringLight:true,continuousRing:true,tablet:true,hours:ref.hours")
s=Path(p).read_text();start=s.index("  // Two boards are one equipment set;");end=s.index(" }else if(ref.type==='tumbling-timbers')",start)
s=s[:start]+'''  // Two boards are one equipment set. This is a compact hardware arrangement,
  // not a regulation play zone. The hole and support belong to the high end.
  const surface=z=>.09+.80*(.46-z)/.92;
  for(const x of [-.247,.247]){
   const board=new THREE.Group();body.add(board);board.position.x=x;const t=shapes(board);
   const slope=geo=>{const v=geo.attributes.position;for(let i=0;i<v.count;i++)v.setY(i,v.getY(i)+surface(v.getZ(i)));v.needsUpdate=true;geo.computeVertexNormals();return geo;};
   const shape=new THREE.Shape();shape.moveTo(-.22,-.46);shape.lineTo(.22,-.46);shape.lineTo(.22,.46);shape.lineTo(-.22,.46);shape.closePath();
   const hole=new THREE.Path();hole.absarc(0,.29,.052,0,Math.PI*2,true);shape.holes.push(hole);
   const top=new THREE.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:false,curveSegments:20});top.rotateX(-Math.PI/2);t.mesh(slope(top),wood);
   for(const a of [-.198,.198]){const rail=new THREE.BoxGeometry(.025,.07,.92);rail.translate(a,-.035,0);t.mesh(slope(rail),darkWood);}
   for(const z of [-.43,.43])t.box(.42,.07,.025,darkWood,0,surface(z)-.035,z,.003);
   for(const a of [-.185,.185])for(const z of [-.38,.38]){const height=surface(z)-.025;t.box(.033,height,.045,darkWood,a,.0125+height/2,z,.003);}
  }
  features={...features,physicalCount:2,holes:2,holeAtHighEnd:true,groundedSupports:true,playingDistanceVerified:false};
'''+s[end:];Path(p).write_text(s)

p='tests/phase6-core-mesh.cjs'
replace(p,"if(ref.type==='connect-four'){",'''if(ref.type==='photobooth'){
   // Test rays hit the colored light ring at every sector/seam, not the white
   // backing plate. This fails for the previous separated rotated ellipses.
   const palette=new Set(['ec3f48','e99536','cbdf44','40ca66','42bfc5','586fda','8a48c8','d9479f']);const segments=[];
   g.traverse(o=>{if(o.isMesh&&palette.has(o.material?.color?.getHexString()))segments.push(o);});check(segments.length===8,'eight ring sectors');
   for(let i=0;i<72;i++){const a=i*Math.PI*2/72,origin=new THREE.Vector3(.29*Math.cos(a)*g.scale.x,(.833+.145*Math.sin(a))*g.scale.y,2*g.scale.z);const hits=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1)).intersectObjects(segments,false);check(hits.length>0,'continuous colored booth ring at angle '+i);}
  }
  if(ref.type==='cornhole'){
   const down=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x*g.scale.x,2*g.scale.y,z*g.scale.z),new THREE.Vector3(0,-1,0)).intersectObject(g,true);
   for(const x of [-.247,.247]){
    check(down(x,-.29).length===0,'cornhole opening passes through high rear');
    const rear=down(x,-.10),front=down(x,.30);check(rear.length>0&&front.length>0,'sloped board has physical surface');check(rear[0].point.y>front[0].point.y,'hole end is raised not inverted');
    for(const dx of [-.185,.185]){const hits=new THREE.Raycaster(new THREE.Vector3((x+dx)*g.scale.x,-.1,-.38*g.scale.z),new THREE.Vector3(0,1,0)).intersectObject(g,true);check(hits.length>0&&hits[0].point.y<.03*g.scale.y,'raised board has grounded rear supports');}
   }
  }
  if(ref.type==='connect-four'){''')
for name in ['catalog-preview/index.html','designer/index.html','dashboard/app.js','dashboard/index.html','js/data/phase6-reference.js']:
 p=Path(name);p.write_text(p.read_text().replace('20260929-phase6-core2','20260929-phase6-core3').replace('2026.09.29.core2','2026.09.29.core3'))
print('Applied connected photobooth ring and correctly supported high-hole boards.')
