"""Extract only a clothed-scene guest's head/scalp from MakeHuman CC0 mesh.
Run with: python scripts/build-guest-anatomy.py /path/to/base.obj
No MakeHuman application source is used or distributed.
"""
from pathlib import Path
import sys, json, math
p = Path(sys.argv[1]); vertices=[]; faces=[]; group=''
for line in p.read_text().splitlines():
    if line.startswith('v '): vertices.append(tuple(map(float,line.split()[1:4])))
    elif line.startswith('g '): group=line[2:]
    elif line.startswith('f ') and group=='body': faces.append([int(x.split('/')[0])-1 for x in line.split()[1:]])
# Lower cut is inside the shirt collar. This deliberately excludes the body,
# clothes helpers, genitals and rig helpers from the shipped graphical asset.
head=[f for f in faces if all(vertices[i][1]>5.68 and abs(vertices[i][0])<1.18 for i in f)]
used=sorted(set(i for f in head for i in f)); mapping={v:i for i,v in enumerate(used)}
positions=[]
for i in used:
    x,y,z=vertices[i]; positions.extend([round(x*.32,5),round((y-7.24)*.32,5),round((z-.60)*.32,5)])
indices=[]
for face in head:
    for i in range(1,len(face)-1): indices.extend([mapping[face[0]],mapping[face[i]],mapping[face[i+1]]])
# Extract scalp using the real skull silhouette, not a helmet-sized sphere.
scalp=[]
for face in head:
    x,y,z=[sum(vertices[i][j] for i in face)/len(face) for j in range(3)]
    front=max(0,min(1,(z-.15)/1.1)); threshold=6.65+front*1.09
    # Small temporal recession; retain ear coverage behind the temples.
    threshold+=.12*max(0,1-abs(x)/.6)*front
    if y>threshold:
        for i in range(1,len(face)-1): scalp.extend([mapping[face[0]],mapping[face[i]],mapping[face[i+1]]])
out=Path('js/data/guest-anatomy.js')
out.write_text('// Graphical head/scalp derived from MakeHuman hm08 (CC0).\n// See docs/guest-model-assets.md. Coordinates are feet; no network or biometric data.\nexport const GUEST_ANATOMY='+json.dumps({'positions':positions,'indices':indices,'scalp':scalp},separators=(',',':'))+';\n')
print(len(used),'head vertices;',len(indices)//3,'triangles;',len(scalp)//3,'scalp triangles;',out.stat().st_size,'bytes')
