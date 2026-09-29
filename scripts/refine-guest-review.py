from pathlib import Path
import hashlib
p=Path('js/ui/scene-guests.js');s=p.read_text()
assert hashlib.sha256(s.encode()).hexdigest()=='c9deb1de03ef927c765fcc2a12222c8a0120754af86f40a7a92d830098231004'
s=s.replace("const lip=y>6.48&&y<6.74&&Math.abs(x)<.34&&z>1.32;\n    const brow=y>7.46&&y<7.59&&Math.abs(x)>.13&&Math.abs(x)<.60&&z>1.13;\n    const shade=lip?[.72,.39,.35]:brow?[.30,.24,.20]:[1,.97,.94];c.push(...shade);", "const front=Math.max(0,Math.min(1,(z-1.34)/.18));\n    const lip=Math.exp(-Math.pow((y-6.60)/.075,2)-Math.pow(x/.29,4))*front;\n    const brow=Math.exp(-Math.pow((y-7.48)/.035,2)-Math.pow((Math.abs(x)-.37)/.20,4))*Math.max(0,Math.min(1,(z-1.18)/.15));\n    c.push(1-.14*lip-.30*brow,.98-.20*lip-.34*brow,.95-.18*lip-.33*brow);")
s=s.replace("function sleeveGeometry(){return lathe([[.71,-.5],[.80,-.44],[.88,-.20],[.94,.12],[.95,.34],[.76,.49]],14);}", "function sleeveGeometry(){return lathe([[.72,-.54],[.86,-.46],[.89,-.22],[.98,.08],[1,.34],[.91,.51],[.72,.54]],16);}\nfunction shoeGeometry(){return combine([[sphere(0,.01,.02,.155,.085,.29),'#ffffff'],[sphere(0,.075,-.05,.142,.105,.20),'#ffffff'],[new THREE.BoxGeometry(.27,.06,.43).translate(0,-.045,-.03),'#ffffff']]);}")
s=s.replace("detail:{n:7,g:new THREE.SphereGeometry(1,10,7)}", "detail:{n:16,g:new THREE.SphereGeometry(1,14,9)},shoe:{n:2,g:shoeGeometry(),m:{roughness:.65}}")
s=s.replace("part('garment',0,top-.07,.245,.19,.22,.026,jacket?'#eee8d9':skin);", "// Collars sit on the cloth surface, not above the shoulder.")
s=s.replace("side*.18,top-.04,.258,.20,.17,.04", "side*.125,top-.16,.24,.105,.14,.022")
s=s.replace("side*.16,top-.35,.315,.11,.45,.028", "side*.105,top-.39,.262,.065,.35,.022")
s=s.replace("for(let i=0;i<3;i++)part('garment',0,top-.37-i*.23,.32,.034,.035,.02,'#d6d5ca');", "for(let i=0;i<3;i++)part('detail',0,top-.36-i*.23,.274,.017,.017,.01,jacket?'#27394b':'#bbc1ba');")
s=s.replace("part('garment',0,hip+.025,.01,.81,.085,.44,'#433b33');", "part('garment',0,hip+.018,.01,.78,.055,.41,'#433b33');")
s=s.replace("limb('limb',[side*.25,hip-.02,0],knee,.205,.19,dress?cloth:pants);\n        limb(dress?'skin':'limb',knee,ankle,.135,.15,dress?skin:pants);\n        part('detail',side*.26,footY,footZ+.12,.18,.125,.35,dress?'#765343':'#34383a');", "limb('limb',[side*.25,hip-.02,0],knee,.205,.19,dress?cloth:pants);\n        limb(dress?'skin':'limb',knee,ankle,.156,.158,dress?skin:pants);\n        part(dress?'skin':'detail',...knee,.153,.13,.151,dress?skin:pants);\n        part('shoe',side*.26,.105+(!seated?Math.max(0,pose.gait*side)*.1:0),footZ+.10,1,1,1,dress?'#765343':'#34383a');")
s=s.replace("limb('limb',shoulder,elbow,jacket?.175:.16,.17,cloth);", "part('detail',...shoulder,jacket?.183:.17,.183,.17,cloth);\n        limb('limb',shoulder,elbow,jacket?.175:.16,.17,cloth);\n        part('skin',...elbow,.118,.105,.12,skin);")
s=s.replace('anatomical-guests-20260929','anatomical-guests-20260929-refined');p.write_text(s)
p=Path('scripts/build-guest-anatomy.py');s=p.read_text().replace('vertices[i][1]>5.68','vertices[i][1]>5.98').replace('if y>threshold:', 'if y>threshold and not (abs(x)>.72 and y<7.55):').replace('Small temporal recession; retain ear coverage behind the temples.', 'Small temporal recession; exclude ears from the scalp shell.');p.write_text(s)
p=Path('tests/guest-realism-browser.cjs');p.write_text(p.read_text().replace('state.calls<=12','state.calls<=13'))
p=Path('js/ui/linen-fabric3d.js');s=p.read_text()
s=s.replace("if(finish==='sequin'){material.roughnessMap=bump;", "if(finish==='sequin'){const colorMap=bump.clone();colorMap.colorSpace=THREE.SRGBColorSpace;colorMap.needsUpdate=true;material.map=colorMap;material.roughnessMap=bump;")
old="""   const waist=round?.57:.22,scale=1-waist*Math.pow(Math.sin(Math.PI*t),.85)-.16*t;
   x*=scale;z*=scale;const arch=round?Math.abs(Math.sin(2*a))*.58:Math.pow(Math.sin(Math.PI*edgeU),.7)*.65;
   y=p.height+.035-(p.height+.01-arch)*t;"""
new="""   // A fitted dining-table cover is not a cocktail hourglass. Its lower
   // corners follow the actual folding-leg positions in the shared table model.
   // Retain a vertical rim band so the fabric covers the protective table edge.
   const u=Math.max(0,(t-.07)/.93);let arch;
   if(round&&spec.tableSizeIn===60){
    const fx=p.w*.30+.04,fz=p.d*.39+.04,r=Math.min(fx/Math.max(.0001,Math.abs(nx)),fz/Math.max(.0001,Math.abs(nz)));
    const targetX=nx*r,targetZ=nz*r,edge=Math.abs(targetX)>=fx-.001?(targetZ/fz+1)/2:(targetX/fx+1)/2;
    x=x*1.015*(1-u)+targetX*u;z=z*1.015*(1-u)+targetZ*u;arch=Math.pow(Math.sin(Math.PI*edge),.7)*.55;
   }else if(round){
    const scale=1.025-.165*u-.42*Math.pow(Math.sin(Math.PI*u),.85);x*=scale;z*=scale;arch=Math.abs(Math.sin(2*a))*.58;
   }else{
    const footX=p.w>=p.d?.60:.78,footZ=p.w>=p.d?.78:.60;
    x*=1.015-(1.015-footX)*u;z*=1.015-(1.015-footZ)*u;arch=Math.pow(Math.sin(Math.PI*edgeU),.7)*.65;
   }
   y=p.height+.035-(p.height+.01-arch)*t;"""
assert old in s;s=s.replace(old,new);p.write_text(s)
p=Path('js/ui/catalog-phase4.js');s=p.read_text().replace('if(top){',"if(top&&top.type!=='runner'){");p.write_text(s)
# Only the guest-specific draw-call budget changes; the integration tests remain.
p=Path('tests/scene-environment.cjs');s=p.read_text().replace('guests.children.length<=10','guests.children.length<=11');p.write_text(s)
print('Applied reviewed guest and cloth corrections; no prices, inventory or checkout records changed')
