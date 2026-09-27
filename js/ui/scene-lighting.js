import * as THREE from 'three';

// One source for visible sky, reflections and shadow direction. Values are an
// art-directed preview, not a solar/site illumination calculation.
export const SUN_DIRECTION = Object.freeze([-35, 48, 28]);
export function lightingProfile({night=false,rain=false,studio=false}={}) {
  if (studio) return {key:2.2,ambient:.72,fill:.22,exposure:.94,sky:'#c6d6e0',horizon:'#e7e7df',ground:'#6c665b',sun:'#fff4df'};
  if (night) return {key:.18,ambient:.36,fill:.16,exposure:1.05,sky:'#081628',horizon:'#233444',ground:'#161e1c',sun:'#b7d0ed'};
  if (rain) return {key:.65,ambient:.92,fill:.15,exposure:1,sky:'#788896',horizon:'#c2c8c5',ground:'#525b4a',sun:'#e6edf0'};
  return {key:2.35,ambient:.72,fill:.22,exposure:.98,sky:'#92b4ce',horizon:'#dce5e6',ground:'#647053',sun:'#fff3dc'};
}

export function createLightingEnvironment(renderer, options={}) {
  const p=lightingProfile(options),width=256,height=128;
  // Float radiance keeps reflections soft without baking a bright room into
  // every outdoor object. The gradient has no invented property imagery.
  const data=new Float32Array(width*height*4),top=new THREE.Color(p.sky),horizon=new THREE.Color(p.horizon),ground=new THREE.Color(p.ground),color=new THREE.Color();
  for(let y=0;y<height;y++){
    const latitude=1-y/(height-1);
    if(latitude>=.5)color.copy(horizon).lerp(top,Math.pow((latitude-.5)*2,.65));
    else color.copy(horizon).lerp(ground,Math.min(1,(.5-latitude)*5));
    for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i]=color.r*.7;data[i+1]=color.g*.7;data[i+2]=color.b*.7;data[i+3]=1;}
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.LinearSRGBColorSpace;texture.needsUpdate=true;
  const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(texture);
  generator.dispose();texture.dispose();return target;
}
