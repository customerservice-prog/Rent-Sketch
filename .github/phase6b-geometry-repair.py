from pathlib import Path
p=Path('js/ui/phase6b-models3d.js');s=p.read_text();assert s.count(' root.scale.set(w,h,d);\n')==1;s=s.replace(' root.scale.set(w,h,d);\n','')
a='  mergeStatic(body);';b="""  const materials=new Map();body.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const m=o.material,key=JSON.stringify([m.type,m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.opacity,m.transparent,m.depthWrite,m.side,m.map?.uuid,m.normalMap?.uuid,m.roughnessMap?.uuid]);if(materials.has(key)){o.material=materials.get(key);if(m!==o.material)m.dispose();}else materials.set(key,m);});
  body.traverse(o=>{if(o.isMesh&&!o.geometry.getAttribute('uv'))o.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(o.geometry.getAttribute('position').count*2),2));});
  mergeStatic(body);"""
assert s.count(a)==1;s=s.replace(a,b);s=s.replace(' root.userData={',' root.scale.set(w,h,d);\n root.userData={')
a="root.userData={kind:ref.kind==='tabletop'";b="root.userData={hardwareDetail:ref.kind==='tabletop',previewBackground:['ribbed-pitcher','flute','highball'].includes(ref.type)?'#50635b':undefined,kind:ref.kind==='tabletop'";assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
p=Path('tests/phase6b-mesh.cjs');s=p.read_text();a='new THREE.Vector3(0,expected.heightFt*.58,expected.depthFt*3)';b="new THREE.Vector3(ref.type==='gold-easel'?expected.widthFt*.12:0,expected.heightFt*.58,expected.depthFt*3)";assert s.count(a)==1;p.write_text(s.replace(a,b))
