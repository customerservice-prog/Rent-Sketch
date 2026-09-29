from pathlib import Path
p=Path('tests/phase6b-mesh.cjs');s=p.read_text();key='  rows.push({slug,name:p.name';assert s.count(key)==1
new="""  if(ref.type==='sheet-pan'||ref.type==='bus-bin')for(const [x,z] of [[.42,0],[0,.42],[.40,.30],[-.40,-.30]]){
   const hits=new THREE.Raycaster(new THREE.Vector3(expected.widthFt*x,expected.heightFt*2,expected.depthFt*z),new THREE.Vector3(0,-1,0)).intersectObject(g,true);check(hits.length>0,slug+' continuous floor-to-wall surface without open edge gaps');
  }
  if(ref.type==='audio-phone'){
   const darkBounds=new THREE.Box3();g.traverse(o=>{if(o.isMesh&&o.material.color?.getHex()===0x24282b)darkBounds.union(new THREE.Box3().setFromObject(o));});
   const center=darkBounds.getCenter(new THREE.Vector3()),span=darkBounds.getSize(new THREE.Vector3());
   for(const offset of [-.25,0,.25]){
    const ray=new THREE.Raycaster(new THREE.Vector3(center.x+span.x*.19,expected.heightFt*2,center.z+span.z*offset),new THREE.Vector3(0,-1,0)),hits=ray.intersectObject(g,true),dial=hits.find(h=>h.object.material.color?.getHex()===0x24282b),housing=hits.find(h=>h.object.material.color?.getHex()===0xeeeae0&&(!dial||h.point.y<dial.point.y));
    check(!!dial&&!!housing,slug+' dial and underlying housing both exist');check(dial.point.y-housing.point.y<expected.heightFt*.08,slug+' dial stays attached to sloped housing across its face');
   }
  }
  if(ref.verticalFace){check(size.z<=.31,slug+' thin panel is not stretched across its support footprint');check(expected.depthFt>=1.5,slug+' uncertain support footprint remains separate');}
  if(ref.type==='sequin-wall'){
   let textureProof=false;g.traverse(o=>{if(o.isMesh&&o.material.map&&o.material.bumpMap){const uv=o.geometry.getAttribute('uv');let max=0;for(let i=0;i<uv.count;i++)max=Math.max(max,uv.getX(i),uv.getY(i));textureProof=max>=12&&o.material.bumpScale<=.002;}});check(textureProof,slug+' fine sequin scale instead of oversized checker texture');
  }
"""
p.write_text(s.replace(key,new+key))
p=Path('tests/phase6b.test.mjs');s=p.read_text();s+="""

test('the named hexagon is not approved against a seven-sided source photograph',()=>{
 const p=product('hexagon-wedding-arch'),r=phase6bReference(p);assert.equal(r.kind,'reference-only');assert.equal(r.placement,'equipment');assert.match(r.note,/seven-sided/);assert.equal(equipmentCatalog([p])[0].productId,p.id);
});
""";p.write_text(s)
