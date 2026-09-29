import * as THREE from 'three';
// Continuous open vessel: an interior floor, tapered sides, rounded rim, and
// exterior bottom. Top remains genuinely open. No disconnected cap/rail pieces.
export function vesselGeometry(width,depth,bottom,top,{taper=.88,radius=.045,thickness=.018}={}){
 const v=[],uv=[],ix=[],steps=8,n=steps*4;
 const rings=[{w:width*taper,d:depth*taper,y:bottom+thickness,r:radius*.7},{w:width-thickness*2,d:depth-thickness*2,y:top,r:radius},{w:width,d:depth,y:top+.009,r:radius},{w:width*taper+thickness*2,d:depth*taper+thickness*2,y:bottom,r:radius*.7}];
 for(const ring of rings)for(let q=0;q<4;q++)for(let i=0;i<steps;i++){
  const a=(q+i/steps)*Math.PI/2,r=Math.min(ring.r,ring.w/4,ring.d/4),cx=(q===0||q===3?1:-1)*(ring.w/2-r),cz=(q<2?1:-1)*(ring.d/2-r),x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
  v.push(x,ring.y,z);uv.push(x/width+.5,z/depth+.5);
 }
 for(let ring=0;ring<3;ring++)for(let i=0;i<n;i++){const a=ring*n+i,b=ring*n+(i+1)%n,c=a+n,d=b+n;ix.push(a,b,c,b,d,c);}
 const inner=v.length/3;v.push(0,bottom+thickness,0);uv.push(.5,.5);
 const outer=v.length/3;v.push(0,bottom,0);uv.push(.5,.5);
 for(let i=0;i<n;i++){ix.push(inner,(i+1)%n,i);ix.push(outer,3*n+i,3*n+(i+1)%n);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
