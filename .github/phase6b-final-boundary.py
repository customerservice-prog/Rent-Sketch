from pathlib import Path
p=Path('js/data/equipment.js');s=p.read_text();a="phase6(b?.kind==='equipment'||b?.placement==='equipment')";b="(phase6b?.kind==='equipment'||phase6b?.placement==='equipment')";assert s.count(a)==2;p.write_text(s.replace(a,b))
p=Path('js/ui/phase6b-event-equipment3d.js');s=p.read_text();a='g.setIndex(ix);g.computeVertexNormals();mesh(g,white);';b='for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];g.setIndex(ix);g.computeVertexNormals();mesh(g,white);';assert s.count(a)==1;p.write_text(s.replace(a,b))
