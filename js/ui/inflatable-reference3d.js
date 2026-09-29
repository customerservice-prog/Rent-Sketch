import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { inflatableZones } from '../data/inflatables.js';

// Shape corrections referenced to Friendly's catalog photos captured 2026-09-29.
// Physical dimensions still come from the placement. Photos do not certify size,
// installation clearance, artwork hidden from view, or manufacturer specifications.
const REFERENCES=new Set(['rainbow-castle','crayon','pink-princess','patriotic','wedding-white','firetruck','pirate','tidal-wave','fire-marble','purple-tropical','lava-wave']);
const PALETTES={
  'rainbow-castle':['#1545a0','#f2c52e','#ed6b20','#31a448'],
  crayon:['#173e94','#f4cd22','#d52b4c','#149ace'],
  'pink-princess':['#713695','#ed80b7','#169bc0','#f1bf28'],
  patriotic:['#1b4085','#f5f3ed','#c9232f','#ffffff'],
  'wedding-white':['#faf8f1','#fffdf6','#eeeae2','#ffffff'],
  firetruck:['#cc262b','#e83b32','#273945','#eeeee5'],
  pirate:['#db7033','#f1a737','#284cab','#773e27'],
  'tidal-wave':['#12518b','#238bd0','#d5e8eb','#092f68'],
  'fire-marble':['#616b77','#e7351f','#f2ae2b','#c42316'],
  'purple-tropical':['#6537a0','#eba824','#59cced','#154990'],
  'lava-wave':['#9b3022','#e4451d','#f2b921','#c67a28'],
};
function material(color){return new THREE.MeshPhysicalMaterial({color,roughness:.38,clearcoat:.3,clearcoatRoughness:.4});}
function netMaterial(width,height){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const ctx=canvas.getContext('2d');ctx.strokeStyle='#333b43';ctx.lineWidth=2;ctx.strokeRect(0,0,32,32);
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(width*2.5,height*2.5);
  return new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.15,side:THREE.DoubleSide,roughness:1,depthWrite:false});
}
function archPoints(cx,bottom,rx,rise,z){
  const pts=[[cx-rx,bottom,z],[cx-rx,bottom+rise*.38,z]];
  for(let i=0;i<=24;i++){const a=Math.PI-i/24*Math.PI;pts.push([cx+Math.cos(a)*rx,bottom+rise*.38+Math.sin(a)*rise*.62,z]);}
  pts.push([cx+rx,bottom,z]);return pts;
}
export function createPhotoReferencedInflatable(item,p){
  if(!REFERENCES.has(p.variant))return null;
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  root.name=p.name;root.userData.kind='inflatable';root.userData.itemId=item.id;
  root.userData.visualReference='friendly-catalog-photo-2026-09-29';root.userData.visualApproval='pending';
  const w=p.widthFt,d=p.depthFt,h=p.heightFt,zones=inflatableZones(p),v=p.variant;
  const palette=PALETTES[v],m=palette.map(material),dark=material('#25313b'),white=material('#fbf8ed');
  const water=new THREE.MeshPhysicalMaterial({color:'#59bcd3',roughness:.14,transparent:true,opacity:.8,clearcoat:1,side:THREE.DoubleSide});
  const put=(mesh,x,y,z,name)=>{mesh.position.set(x,y,z);if(name)mesh.name=name;body.add(mesh);return mesh;};
  const pad=(x,y,z,a,b,c,mat=m[0],r=.5,name='Inflated vinyl')=>put(new THREE.Mesh(new RoundedBoxGeometry(Math.max(.025,a),Math.max(.025,b),Math.max(.025,c),3,Math.min(r,a*.45,b*.45,c*.45)),mat),x,y,z,name);
  function pipe(pts,r,mat=m[0],name='Inflated seam'){
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(a=>new THREE.Vector3(...a))),Math.max(24,pts.length*2),r,10,false),mat);mesh.name=name;body.add(mesh);return mesh;
  }
  function post(x,z,bottom,top,r,mat,cap=true,tipMat=mat){
    put(new THREE.Mesh(new THREE.CylinderGeometry(r*.92,r,top-bottom,20),mat),x,(bottom+top)/2,z,'Inflatable corner column');
    if(cap){const tipH=Math.max(.6,h-top);put(new THREE.Mesh(new THREE.ConeGeometry(r*1.08,tipH,20),tipMat),x,top+tipH/2,z,'Corner cap');}
  }
  function roof(b,top){
    const a=b.w*.50,c=b.d*.50,rise=Math.min(1.4,h*.10),base=top-.28;
    const vertices=[-a,base,-c,a,base,-c,0,base+rise,-c,-a,base,c,a,base,c,0,base+rise,c];
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex([0,3,2,3,5,2,2,5,1,5,4,1,0,2,1,3,4,5,0,1,4,0,4,3]);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,v==='rainbow-castle'?m[2]:m[1]);mesh.position.set(b.x,0,b.z);mesh.name='Fitted gable canopy';body.add(mesh);
    pipe([[-a+b.x,base,b.z+c],[b.x,base+rise,b.z+c],[a+b.x,base,b.z+c]],.18,v==='crayon'?m[2]:m[0],'Front roof edge');
  }
  function enclosure(b,combo=false){
    const front=b.z+b.d/2,back=b.z-b.d/2,top=combo?h*.78:h*.80,isWhite=v==='wedding-white';
    const radius=isWhite?w*.070:w*.050;
    pad(b.x,.62,b.z,b.w+radius*1.6,1.15,b.d+radius*1.5,m[0],.5,'Bounce base');
    pad(b.x,b.floor-.19,b.z,b.w,.55,b.d,isWhite?m[0]:m[1],.23,'Bounce floor');
    for(let z=back+.4;z<front;z+=.72)pad(b.x,b.floor+.015,z,b.w-.4,.18,.60,isWhite?m[0]:(v==='rainbow-castle'?m[Math.round(z*2)%2===0?0:2]:m[1]),.075,'Floor welded rib');
    const colors=v==='crayon'?[m[2],m[3],m[2],m[3]]:v==='pink-princess'?[m[2],m[2],m[2],m[2]]:v==='patriotic'?[m[0],m[0],m[0],m[0]]:v==='rainbow-castle'?[m[3],m[0],m[3],m[2]]:[m[0],m[0],m[0],m[0]];
    [[b.x-b.w/2,back],[b.x+b.w/2,back],[b.x-b.w/2,front],[b.x+b.w/2,front]].forEach(([x,z],i)=>{
      post(x,z,.8,combo?top:top+(.04*h),radius,colors[i],!combo,isWhite?m[0]:v==='patriotic'?white:v==='pink-princess'?m[0]:v==='crayon'?colors[i]:m[(i+1)%4]);
      if(!combo)pad(x,top-.02,z,radius*2.13,.25,radius*2.13,v==='patriotic'?m[2]:v==='pink-princess'?m[1]:colors[i],.11,'Cap collar');
      if(v==='crayon')for(const yy of [top-.55,top-.85,1.3,1.65])put(new THREE.Mesh(new THREE.CylinderGeometry(radius*1.012,radius*1.012,.095,20),dark),x,yy,z,'Crayon band');
    });
    function wall(side){
      const horizontal=side==='front'||side==='back',len=horizontal?b.w:b.d,x=horizontal?b.x:(side==='left'?b.x-b.w/2:b.x+b.w/2),z=horizontal?(side==='front'?front:back):b.z;
      const lower=isWhite?1.7:2.6,upper=top-(combo?1.5:1.7),windowBottom=lower,windowH=upper-windowBottom;
      if(isWhite){
        if(side==='front'){pad(x,top-.25,z,len,.95,.95,m[0],.43,'White entrance lintel');return;}
        const levels=5,dy=(top-1.4)/levels;
        for(let k=0;k<levels;k++)pad(x,1.4+dy*(k+.5),z,horizontal?len:radius*1.55,dy+.035,horizontal?radius*1.55:len,m[0],dy*.46,'White pillow wall');return;
      }
      // Match the photographed vinyl-to-mesh proportions. In particular the
      // crayon unit has small inset windows, not full-height net fences.
      const mat=v==='crayon'?m[1]:v==='pink-princess'?m[1]:combo?m[0]:v==='patriotic'?m[2]:m[1];
      const low=v==='crayon'?h*.37:v==='pink-princess'?h*.25:combo?2.6:h*.22;
      const high=v==='crayon'?h*.61:combo?upper:h*.66;
      const opening=len*(v==='crayon'?.64:.73),netH=high-low;
      const panel=new THREE.Shape();panel.moveTo(-len/2,1.25);panel.lineTo(len/2,1.25);panel.lineTo(len/2,top);panel.lineTo(-len/2,top);panel.closePath();
      const aperture=new THREE.Path();aperture.moveTo(-opening/2,low);aperture.lineTo(opening/2,low);aperture.lineTo(opening/2,high);aperture.lineTo(-opening/2,high);aperture.closePath();panel.holes.push(aperture);
      if(side==='front'){
        const door=new THREE.Path(),r=Math.min(1.35,low*.36),spring=1.25+r*.55;
        door.moveTo(-r,1.26);door.lineTo(r,1.26);door.lineTo(r,spring);door.absarc(0,spring,r,0,Math.PI,false);door.lineTo(-r,1.26);door.closePath();panel.holes.push(door);
      }
      const material=mat.clone();material.side=THREE.DoubleSide;
      const sheet=new THREE.Mesh(new THREE.ShapeGeometry(panel),material);if(!horizontal)sheet.rotation.y=Math.PI/2;put(sheet,x,0,z,'Solid vinyl with inset window');
      const net=new THREE.Mesh(new THREE.PlaneGeometry(opening,netH),netMaterial(opening,netH));if(!horizontal)net.rotation.y=Math.PI/2;put(net,x,(low+high)/2,z,'Inset safety mesh');
      pad(x,top-.12,z,horizontal?len:.52,.54,horizontal?.52:len,mat,.23,'Upper inflated wall beam');
      pad(x,1.50,z,horizontal?len:.6,.54,horizontal?.6:len,mat,.22,'Lower inflated wall beam');
    }
    for(const side of ['back','left','right',...(combo?[]:['front'])])wall(side);
    if(!isWhite&&!combo)roof(b,top);
    if(combo){
      // Truck/ship enclosures do not get unrelated castle cones or pyramid roofs.
      pad(b.x,top-.55,b.z,b.w,.65,b.d,m[0],.28,'Combo flat canopy');
      for(const x of [b.x-b.w/2,b.x+b.w/2])pad(x,top-.15,b.z,.65,.65,b.d,m[0],.28,'Combo roof edge');
      const sideX=b.x-b.w/2-.5,entryZ=b.z;
      const g=pipe(archPoints(0,1.1,1.35,3.5,0),.42,v==='pirate'?m[2]:m[0],'Side entry arch');g.rotation.y=-Math.PI/2;g.position.set(sideX,0,entryZ);
      pad(sideX-.35,.60,entryZ,1.8,.45,3.25,v==='pirate'?m[2]:m[0],.3,'Side entry step');
    }else{
      const stepD=Math.max(1.3,d/2-front-.20),stepZ=front+stepD/2-.12;
      pad(0,.48,stepZ,w*(isWhite?.63:.28),.8,stepD,m[0],.34,'Entry step');
      if(!isWhite){
        const radius=w*.103,entryMat=v==='crayon'?m[2]:v==='patriotic'?m[2]:v==='pink-princess'?m[1]:m[3];
        for(const z of [front+.12,Math.min(d/2-.35,front+stepD*.66)])pipe(archPoints(0,1.05,radius,3.35,z),.29,entryMat,'Entry tunnel');
        if(v==='patriotic')pipe(archPoints(0,1.05,radius*.83,2.94,Math.min(d/2-.32,front+stepD*.66)+.015),.10,white,'White entry trim');
      }
    }
  }
  function trajectory(s,t,x){const u=Math.max(0,Math.min(1,t)),ease=(1-Math.cos(Math.PI*Math.min(1,u/.82)))/2;return [x,s.y0+(s.y1-s.y0)*ease,s.z0+(s.z1-s.z0)*u];}
  function ramp(s,x,width,mat,raise=0,name='Slide bed'){
    const shape=new THREE.Shape();shape.moveTo(-s.z0,.55);
    for(let i=0;i<=40;i++){const a=trajectory(s,i/40,x);shape.lineTo(-a[2],a[1]+raise);}
    shape.lineTo(-s.z1,.55);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035});geo.rotateY(Math.PI/2);
    return put(new THREE.Mesh(geo,mat),x-width/2,0,0,name);
  }
  function palm(x,z,bottom,top,leafMat){
    const trunk=material(v==='lava-wave'?'#988468':'#6a462d'),height=top-bottom;
    put(new THREE.Mesh(new THREE.CylinderGeometry(.26,.34,height,14),trunk),x,(bottom+top)/2,z,'Palm trunk');
    for(let y=bottom+.25;y<top;y+=.55)put(new THREE.Mesh(new THREE.TorusGeometry(.31,.045,6,14),white),x,y,z,'Palm trunk band').rotation.x=Math.PI/2;
    for(let i=0;i<7;i++){
      const angle=i*Math.PI*2/7,pts=[];for(let j=0;j<=10;j++){const t=j/10;pts.push([x+Math.sin(angle)*1.48*t,top+.35*Math.sin(Math.PI*t)-.40*t,z+Math.cos(angle)*1.48*t]);}
      pipe(pts,.16,leafMat,'Palm frond');
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),leafMat);leaf.scale.set(.30,.095,1.0);leaf.rotation.set(.26,angle,0);put(leaf,x+Math.sin(angle)*.72,top-.12,z+Math.cos(angle)*.72,'Palm leaf');
    }
  }
  function pool(x,start,end,width,baseMat,topMat){
    const depth=end-start,half=width/2,radius=Math.min(half*.92,depth*.46);
    const contour=new THREE.Shape();contour.moveTo(-half,0);contour.lineTo(half,0);contour.lineTo(half,depth-radius);
    contour.absellipse(0,depth-radius,half,radius,0,Math.PI,false);contour.lineTo(-half,0);contour.closePath();
    const geo=new THREE.ExtrudeGeometry(contour,{depth:.95,bevelEnabled:true,bevelSegments:3,bevelSize:.16,bevelThickness:.16});geo.rotateX(Math.PI/2);
    put(new THREE.Mesh(geo,baseMat),x,1.08,start,'Rounded splash pool base');
    const surface=new THREE.Mesh(new THREE.ShapeGeometry(contour),water);surface.rotation.x=Math.PI/2;surface.scale.set(.84,.89,1);put(surface,x,1.22,start+depth*.055,'Splash water');
    const points=[[x-half+.46,1.60,start+.08],[x-half+.46,1.60,end-radius]];
    for(let i=0;i<=32;i++){const angle=Math.PI-i*Math.PI/32;points.push([x+(half-.46)*Math.cos(angle),1.60,end-radius+radius*.91*Math.sin(angle)]);}
    points.push([x+half-.46,1.60,start+.08]);
    pipe(points,.49,baseMat,'Rounded splash pool wall');
    pipe(points.map(a=>[a[0],2.23,a[2]]),.42,topMat,'Splash pool rim');
    pipe(points.map(a=>[a[0],1.05,a[2]]),.34,baseMat,'Splash pool lower seam');
  }
  function slide(s){
    const purple=v==='purple-tropical',tidal=v==='tidal-wave',fire=v==='fire-marble',lava=v==='lava-wave',combo=!!p.combo;
    const trim=purple?m[1]:tidal?m[1]:fire?m[2]:lava?m[2]:m[0],wave=purple?m[2]:tidal?m[2]:trim,surface=purple?m[3]:tidal?m[0]:fire?m[1]:lava?m[0]:p.style==='pirate'?m[2]:m[1];
    const laneW=s.laneWidth||s.width/s.lanes-.55,centers=s.laneCenters||Array.from({length:s.lanes},(_,i)=>s.x+(i+.5)*s.width/s.lanes-s.width/2);
    const edgeLeft=Math.min(...centers)-laneW/2,edgeRight=Math.max(...centers)+laneW/2;
    const baseStart=p.combo?-d*.46:s.z0-1.2,baseEnd=s.z1+.30;
    pad(0,.52,(baseStart+baseEnd)/2,w*.90,1,baseEnd-baseStart,m[0],.40,'Slide foundation');
    for(const x of centers){
      ramp(s,x,laneW,surface,0,'Slide chute');
      for(const side of [-1,1]){
        const railX=x+side*(laneW/2+.21);ramp(s,railX,.63,trim,1.58,'Inflated slide guard');
        const pts=[];for(let i=0;i<=40;i++){const a=trajectory(s,i/40,railX);a[1]+=1.53;pts.push(a);}pipe(pts,.41,wave,'Raised wave rail');
      }
      const end=Math.min(d/2-.30,s.z1+d*.20);
      pool(x,s.z1-.12,end,purple?w*.44:combo?laneW+.65:w*.46,m[0],purple?trim:wave);
    }
    const climb=s.climb;
    if(climb){
      ramp(s,climb.x,climb.width,dark,0,'Dedicated climbing lane');
      for(let i=0;i<17;i++){
        const a=trajectory(s,.02+i*.043,climb.x);pad(a[0],a[1]+.14,a[2],climb.width*.82,.20,.27,white,.075,'Climbing step');
      }
      for(const side of [-1,1]){
        const pts=[];for(let i=0;i<=30;i++){const a=trajectory(s,i/30,climb.x+side*(climb.width/2+.13));a[1]+=.80;pts.push(a);}pipe(pts,.19,trim,'Climbing handrail');
      }
    }
    // Horizontal welded chambers give the outer sides the inflated volume seen
    // in the reference photos, instead of a thin triangular board.
    const outerLeft=Math.min(edgeLeft,climb?climb.x-climb.width/2:edgeLeft)-.46,outerRight=edgeRight+.46;
    for(const xx of [outerLeft,outerRight]){
      ramp(s,xx,.72,m[0],1.18,'Outer inflatable sidewall');
      for(let yy=1.1;yy<s.y0;yy+=.58){
        let cutoff=s.z0;for(let j=0;j<=40;j++){const a=trajectory(s,j/40,xx);if(a[1]+1.0>=yy)cutoff=a[2];}
        if(cutoff>s.z0+.3)pad(xx,yy,(s.z0+cutoff)/2,.96,.54,cutoff-s.z0+.05,m[0],.23,'Welded side chamber');
      }
    }
    const towerLeft=outerLeft+.15,towerRight=outerRight-.15,rearZ=s.z0+.15,capY=Math.min(h-1.08,s.y0+3.75);
    for(const xx of [towerLeft,towerRight])post(xx,rearZ,s.y0-.5,capY,.61,m[0],false);
    const bridgeMat=purple?m[0]:lava?m[1]:fire?m[1]:m[2];
    pipe([[towerLeft,capY,rearZ],[(towerLeft+towerRight)/2,capY+.2,rearZ],[towerRight,capY,rearZ]],.56,bridgeMat,'Top bridge');
    const net=new THREE.Mesh(new THREE.PlaneGeometry(towerRight-towerLeft,capY-s.y0-.20),netMaterial(towerRight-towerLeft,capY-s.y0-.20));put(net,(towerLeft+towerRight)/2,(capY+s.y0)/2,s.z0-.20,'Top safety mesh');
    if(tidal){
      for(let i=0;i<5;i++){const ball=new THREE.Mesh(new THREE.SphereGeometry(.67,18,12),white);ball.scale.y=.9;put(ball,towerLeft+(towerRight-towerLeft)*i/4,capY+.12,rearZ+.05,'White wave crest');}
    }
    if(fire){
      const pts=[];for(let i=0;i<=18;i++){const a=Math.PI-i/18*Math.PI;pts.push([(towerLeft+towerRight)/2+Math.cos(a)*(towerRight-towerLeft)*.34,capY+.2+Math.sin(a)*.55,rearZ]);}pipe(pts,.24,m[1],'Red crest arch');
    }
    if(purple||lava){
      const crossZ=s.z0+(s.z1-s.z0)*.65,crossY=trajectory(s,.65,0)[1]+3.4,leaf=material(purple?'#279b3e':'#e59825');
      for(const xx of [towerLeft,towerRight])palm(xx,crossZ,crossY-1.5,crossY+.50,leaf);
      pipe([[towerLeft,crossY,crossZ],[(towerLeft+towerRight)/2,crossY+.22,crossZ],[towerRight,crossY,crossZ]],.30,bridgeMat,'Mid-slide tropical bridge');
      if(purple)for(const xx of [towerLeft,towerRight])palm(xx,rearZ,capY-.65,Math.min(h-.65,capY+.20),leaf);
      if(lava)pad((towerLeft+towerRight)/2,capY+.12,rearZ,towerRight-towerLeft+.3,.82,.7,m[1],.38,'Lava crest');
    }
    if(combo){
      // The combination slide is joined to its bounce enclosure. No extra
      // castle roof or decorative columns are placed across the slide path.
      const z=d*.32;
      if(v==='firetruck'){
        pad(0,2.30,z,w*.56,3.15,d*.12,m[0],.4,'Fire engine cab');
        pad(0,3.05,z+d*.061,w*.40,1.1,.12,dark,.08,'Cab windshield');
        pad(0,1.55,z+d*.064,w*.38,.38,.14,white,.05,'Front bumper');
        for(const side of [-1,1])for(const zz of [-d*.26,d*.29]){
          const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,.20,20),dark);wheel.rotation.z=Math.PI/2;put(wheel,side*w*.455,.94,zz,'Truck wheel');
        }
        const x=-w*.455;for(const off of [0,.65])pipe([[x,3.3+off,-d*.16],[x,2.1+off,d*.23]],.075,white,'Truck ladder rail');
        for(let i=0;i<10;i++){const zz=-d*.16+i*d*.039,yy=3.3-i*.12;pad(x,yy+.32,zz,.11,.7,.09,white,.035,'Truck ladder rung');}
      }else{
        const mastX=w*.34,mastZ=-d*.33;
        post(mastX,mastZ,1,h-.5,.18,m[3],false);
        pad(mastX-w*.14,h-1.70,mastZ,w*.27,1.75,.08,dark,.015,'Pirate flag');
        for(const xx of [-w*.35,w*.35])put(new THREE.Mesh(new THREE.TorusGeometry(.63,.16,9,24),m[1]),xx,3.9,-d*.41,'Ship life ring');
        pipe([[-w*.42,1.0,d*.12],[-w*.42,1.6,d*.39],[0,2.4,d*.45],[w*.42,1.6,d*.39],[w*.42,1.0,d*.12]],.43,m[1],'Raised ship bow');
      }
    }
  }
  if(zones.bounce)enclosure(zones.bounce,!!p.combo);
  if(zones.slide)slide(zones.slide);
  // Keep the same origin and activity coordinates as the shared planning model.
  // Bounds are regression-tested; never repair an overhang by secretly resizing
  // or recentering the model independently of the saved footprint and people.
  body.rotation.y=-(item.rotationDeg||0)*Math.PI/180;
  root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.itemId=item.id;}});
  root.userData.profile=p;root.userData.zones=zones;
  root.userData.update=time=>{water.opacity=.78+Math.sin(Math.max(0,Number(time)||0)*1.7)*.025;};
  return root;
}
