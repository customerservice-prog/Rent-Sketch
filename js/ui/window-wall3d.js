import * as THREE from 'three';

// The current Friendly 20-foot window-wall reference shows two cathedral-style
// arched windows per physical panel. A renderer segment is usually half a panel.
// Shape follows that photograph; pane dimensions remain a planning illustration.
export function makeWindowWallSegment(lengthFt,heightFt,{panelWidthFt=20}={}){
  const length=Number(lengthFt),height=Number(heightFt),group=new THREE.Group();
  group.name='Cathedral window vinyl sidewall';
  if(!Number.isFinite(length)||!Number.isFinite(height)||length<=0||height<=0)return group;
  const vinyl=new THREE.MeshPhysicalMaterial({color:0xfffdf8,roughness:.78,side:THREE.DoubleSide});
  const clear=new THREE.MeshPhysicalMaterial({color:0xedf4f1,roughness:.14,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
  const trim=new THREE.MeshStandardMaterial({color:0xfffdf7,roughness:.75,side:THREE.DoubleSide});
  const sheet=new THREE.Shape();sheet.moveTo(-length/2,0);sheet.lineTo(length/2,0);sheet.lineTo(length/2,height);sheet.lineTo(-length/2,height);sheet.closePath();
  const physical=Number(panelWidthFt)>0?Number(panelWidthFt):20;
  const count=Math.max(1,Math.round(length/(physical/2)));
  const space=length/count,r=Math.min(space*.205,height*.26),bottom=height*.12,spring=height*.66;
  function arch(path,x,radius,b){path.moveTo(x-radius,b);path.lineTo(x+radius,b);path.lineTo(x+radius,spring);path.absarc(x,spring,radius,0,Math.PI,false);path.lineTo(x-radius,b);path.closePath();return path;}
  function line(points,radius=.026){
    const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1]),new THREE.Vector3(...points[i])));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(1,points.length*2),radius,6,false),trim);mesh.name='White window muntin';group.add(mesh);
  }
  for(let i=0;i<count;i++){
    const x=-length/2+space*(i+.5),hole=arch(new THREE.Path(),x,r,bottom);sheet.holes.push(hole);
    const pane=arch(new THREE.Shape(),x,r,bottom),glass=new THREE.Mesh(new THREE.ShapeGeometry(pane,24),clear);glass.position.z=.002;glass.name='Clear arched pane';group.add(glass);
    const border=[[x-r,bottom,.012],[x-r,spring,.012]];
    for(let j=0;j<=32;j++){const angle=Math.PI-j*Math.PI/32;border.push([x+Math.cos(angle)*r,spring+Math.sin(angle)*r,.012]);}
    border.push([x+r,bottom,.012],[x-r,bottom,.012]);line(border,.038);
    line([[x,bottom,.014],[x,spring,.014]]);
    line([[x-r,spring,.014],[x+r,spring,.014]]);
    const mid=(bottom+spring)/2;line([[x-r,mid,.014],[x+r,mid,.014]]);
    for(const angle of [Math.PI/3,Math.PI*2/3])line([[x,spring,.014],[x+Math.cos(angle)*r,spring+Math.sin(angle)*r,.014]]);
  }
  const mesh=new THREE.Mesh(new THREE.ShapeGeometry(sheet,24),vinyl);mesh.name='Opaque vinyl with arched cutouts';mesh.userData.windowCount=count;group.add(mesh);
  group.userData.windowCount=count;group.userData.panelWidthFt=physical;
  group.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true;o.userData.kind='sidewall';o.userData.buildStage='sidewalls';}});
  return group;
}
