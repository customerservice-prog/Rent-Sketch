import * as THREE from 'three';

// Local, deterministic surface detail. These are illustrative materials, never
// a claim that a generated texture is a photograph of the customer's rental.
// Cache pixel data, not GPU textures: disposing one scene must not invalidate
// another open Table Studio or product preview.
const pixels = new Map();
const TAU = Math.PI * 2;
const byte = value => Math.max(0, Math.min(255, Math.round(value)));
const hash = (x, y) => {
  let n = Math.imul(x + 31, 374761393) ^ Math.imul(y + 71, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
};
function surfaceData(kind, size = 256) {
  const key = `${kind}:${size}`;
  if (pixels.has(key)) return pixels.get(key);
  const color = new Uint8Array(size * size * 4), relief = new Uint8Array(color.length), roughness = new Uint8Array(color.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, noise = hash(x, y) - .5;
    let tone = 255, height = .5, rough = .92;
    if (kind === 'wood') {
      // Grain meanders at several frequencies. Narrow pores interrupt long
      // fibers; no large dark knot is stamped onto every chair leg.
      const warp = .007 * Math.sin(TAU * u) + .003 * Math.sin(TAU * (u * 3 + v)) + .0015 * Math.sin(TAU * u * 7);
      const rings = v + warp;
      const broad = Math.sin(TAU * (rings * 9 + .13 * Math.sin(TAU * u * 2)));
      const fiber = Math.pow(.5 + .5 * Math.sin(TAU * (rings * 61 + .15 * Math.sin(TAU * u * 4))), 9);
      const pore = hash(Math.floor(x / 9), y) > .94 ? fiber : 0;
      tone = 242 + broad * 2.5 - fiber * 8 - pore * 7 + noise * 3;
      height = .55 - fiber * .10 - pore * .07 + noise * .02;
      rough = .91 + fiber * .045 + noise * .025;
    } else if (kind === 'linen') {
      const warp = Math.sin(TAU * u * 48), weft = Math.sin(TAU * v * 48);
      height = .5 + warp * weft * .13 + noise * .035;
      rough = .92 + warp * weft * .045;
      tone = 252 + noise * 3;
    } else if (kind === 'vinyl') {
      height = .5 + noise * .09 + Math.sin(TAU * u * 32) * Math.sin(TAU * v * 32) * .018;
      rough = .88 + noise * .07;
    } else if (kind === 'marble') {
      const warp = .11 * Math.sin(TAU * u) + .07 * Math.sin(TAU * (u * 2 + v)) + .04 * Math.sin(TAU * (u * 4 - v * 2));
      const vein = Math.pow(.5 + .5 * Math.sin(TAU * (v * 5 + warp)), 10);
      tone = 253 - vein * 44 + noise * 2;
      height = .5 + noise * .06;
      rough = .88 + vein * .05;
    } else if (kind === 'water') {
      const ripple = Math.sin(TAU * (v * 5 + .12 * Math.sin(TAU * u * 3))) * .20 + Math.sin(TAU * (v * 11 - u * 2)) * .075;
      height = .5 + ripple;
      rough = .74 + ripple * .12;
    }
    const i = (y * size + x) * 4;
    for (const [data, value] of [[color, tone], [relief, height * 255], [roughness, rough * 255]]) {
      data[i] = data[i + 1] = data[i + 2] = byte(value); data[i + 3] = 255;
    }
  }
  const data = { color, relief, roughness, size }; pixels.set(key, data); return data;
}
function texture(data, size, color = false) {
  const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.magFilter = THREE.LinearFilter; result.minFilter = THREE.LinearMipmapLinearFilter;
  result.generateMipmaps = true; result.anisotropy = 4; result.needsUpdate = true;
  return result;
}
export function createSurfaceMaps(kind) {
  const data = surfaceData(kind);
  return { map: texture(data.color, data.size, true), bumpMap: texture(data.relief, data.size), roughnessMap: texture(data.roughness, data.size) };
}
function describe(material, kind, tileFeet) {
  material.userData.surface = { kind, tileFeet, generated: true, physicalUV: true };
  return material;
}
export function woodMaterial(color = '#b58a5f', extra = {}) {
  const material = new THREE.MeshStandardMaterial({ color, ...createSurfaceMaps('wood'), roughness: .67, metalness: 0, bumpScale: .00065, envMapIntensity: .7, ...extra });
  return describe(material, 'wood', 2);
}
export function linenMaterial(color = '#ffffff') {
  const maps = createSurfaceMaps('linen');
  const material = new THREE.MeshPhysicalMaterial({ color, ...maps, roughness: .91, metalness: 0, bumpScale: .0012, sheen: .32, sheenRoughness: .9, sheenColor: '#e4ded5', side: THREE.DoubleSide, envMapIntensity: .65 });
  material.name = 'Linen fabric';
  return describe(material, 'linen', .4);
}
export function vinylMaterial(color, { marble = false, tent = false } = {}) {
  const maps = createSurfaceMaps(marble ? 'marble' : 'vinyl');
  // Albedo stays clean; small coated-fabric relief belongs in bump/roughness.
  if (!marble) { maps.map.dispose(); delete maps.map; }
  const material = new THREE.MeshPhysicalMaterial({ color, ...maps, roughness: tent ? .84 : .46, metalness: 0, bumpScale: tent ? .001 : .0022, clearcoat: tent ? 0 : .15, clearcoatRoughness: .45, sheen: tent ? .06 : 0, sheenRoughness: 1, specularIntensity: tent ? .25 : .55, envMapIntensity: tent ? .35 : .75, side: tent ? THREE.DoubleSide : THREE.FrontSide });
  return describe(material, marble ? 'marble' : 'vinyl', marble ? 3 : .6);
}
export function waterMaterial() {
  const maps = createSurfaceMaps('water'); maps.map.dispose(); delete maps.map;
  const material = new THREE.MeshPhysicalMaterial({ color: '#74c4cb', ...maps, bumpScale: .026, roughness: .22, metalness: 0, transparent: true, opacity: .62, clearcoat: .55, clearcoatRoughness: .17, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: .7 });
  return describe(material, 'water', 1.6);
}

// Geometry-local projection keeps detail the same size on a 4ft and an 8ft
// tabletop. Its longest tangent axis supplies grain direction on rails/legs.
// Explicit UVs (canopies, drapes and flow surfaces) are left untouched.
export function physicalSurfaceUV(geometry, material) {
  const surface = material?.userData?.surface;
  if (!surface || geometry.userData.physicalUV || !geometry.attributes.normal) return geometry;
  geometry.computeBoundingBox();
  const size = new THREE.Vector3(); geometry.boundingBox.getSize(size);
  const dimensions = [size.x, size.y, size.z], p = geometry.attributes.position, n = geometry.attributes.normal;
  const values = new Float32Array(p.count * 2), tile = surface.tileFeet;
  for (let i = 0; i < p.count; i++) {
    const point = [p.getX(i), p.getY(i), p.getZ(i)], normal = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
    const dominant = normal.indexOf(Math.max(...normal)), tangents = [0, 1, 2].filter(axis => axis !== dominant);
    if (surface.kind === 'wood' && dimensions[tangents[0]] < dimensions[tangents[1]]) tangents.reverse();
    values[i * 2] = point[tangents[0]] / tile;
    values[i * 2 + 1] = point[tangents[1]] / tile;
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(values, 2)); geometry.userData.physicalUV = true;
  return geometry;
}
