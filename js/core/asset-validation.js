// A deliberately restricted GLB profile, checked before GLTFLoader can allocate
// resources or resolve links. No remote/data URIs, custom extensions or codecs.
export const ASSET_LIMITS=Object.freeze({bytes:8*1024*1024,jsonBytes:1024*1024,nodes:512,meshes:256,primitives:512,accessors:2048,vertices:400000,triangles:200000,materials:64,textures:16,imagePixels:4*1024*1024});
const fail=message=>{throw new Error('Model rejected: '+message);};
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
export function isPackagedAssetPath(value){return typeof value==='string'&&/^\/assets\/models\/[a-z0-9-]+\/\d{4}\.\d{2}\.\d{2}\.\d+\/(standard|compact)\.glb$/.test(value);}

export function inspectPackagedGlb(input,{maxBytes=ASSET_LIMITS.bytes,maxTriangles=ASSET_LIMITS.triangles}={}){
  if(!(input instanceof ArrayBuffer))fail('expected binary data');
  const limit=Math.min(ASSET_LIMITS.bytes,maxBytes);
  if(input.byteLength<28||input.byteLength>limit)fail('file size');
  const view=new DataView(input);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==input.byteLength)fail('GLB header');
  const jsonLength=view.getUint32(12,true);
  if(view.getUint32(16,true)!==0x4e4f534a||jsonLength>ASSET_LIMITS.jsonBytes||jsonLength%4||20+jsonLength+8>input.byteLength)fail('JSON chunk');
  let gltf;try{gltf=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(input,20,jsonLength)));}catch{fail('invalid JSON');}
  const binaryOffset=20+jsonLength,binaryLength=view.getUint32(binaryOffset,true);
  if(view.getUint32(binaryOffset+4,true)!==0x004e4942||binaryLength%4||binaryOffset+8+binaryLength!==input.byteLength)fail('embedded buffer chunk');
  if(gltf.asset?.version!=='2.0'||gltf.extensionsUsed?.length||gltf.extensionsRequired?.length)fail('unsupported GLTF version or extensions');
  // All URLs are prohibited, including extension/extras structures. An unknown
  // extension cannot activate a loader plugin or start a secondary request.
  const stack=[{value:gltf,depth:0}];let entries=0;
  while(stack.length){const {value,depth}=stack.pop();if(depth>48||++entries>180000)fail('JSON complexity');
    if(!value||typeof value!=='object')continue;
    for(const [key,child] of Object.entries(value)){
      if(key==='uri'||key==='extensions'||key==='__proto__'||key==='constructor'||key==='prototype')fail('external or unsupported resources');
      if(typeof child==='number'&&!Number.isFinite(child))fail('non-finite value');
      if(child&&typeof child==='object')stack.push({value:child,depth:depth+1});
    }
  }
  for(const [name,max] of [['nodes',512],['meshes',256],['accessors',2048],['bufferViews',2048],['materials',64],['textures',16],['images',16],['skins',16],['animations',16]]){
    if(gltf[name]!==undefined&&(!Array.isArray(gltf[name])||gltf[name].length>max))fail(name+' budget');
  }
  if(!Array.isArray(gltf.buffers)||gltf.buffers.length!==1||!integer(gltf.buffers[0].byteLength,1,binaryLength)||binaryLength-gltf.buffers[0].byteLength>3)fail('buffer size');
  const buffers=gltf.bufferViews||[],accessors=gltf.accessors||[],nodes=gltf.nodes||[];
  for(const buffer of buffers)if(buffer.buffer!==0||!integer(buffer.byteOffset||0,0,binaryLength)||!integer(buffer.byteLength,1,binaryLength)||(buffer.byteOffset||0)+buffer.byteLength>gltf.buffers[0].byteLength||(buffer.byteStride!==undefined&&!integer(buffer.byteStride,4,252)))fail('buffer view bounds');
  const widths={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
  let vertices=0;
  for(const accessor of accessors){
    const b=buffers[accessor.bufferView],width=widths[accessor.componentType],size=sizes[accessor.type];
    if(accessor.sparse||!b||!width||!size||!integer(accessor.count,1,ASSET_LIMITS.vertices)||!integer(accessor.byteOffset||0,0,b.byteLength))fail('accessor');
    const stride=b.byteStride||width*size,last=(accessor.byteOffset||0)+(accessor.count-1)*stride+width*size;
    if(last>b.byteLength||stride<width*size||(accessor.byteOffset||0)%width)fail('accessor bounds');
    if(accessor.type==='VEC3'&&(vertices+=accessor.count)>ASSET_LIMITS.vertices*4)fail('vertex budget');
  }
  let triangles=0,primitives=0;
  for(const mesh of gltf.meshes||[]){
    if(!Array.isArray(mesh.primitives)||!mesh.primitives.length)fail('mesh primitives');
    for(const primitive of mesh.primitives){
      if(++primitives>ASSET_LIMITS.primitives||(primitive.mode!==undefined&&primitive.mode!==4))fail('primitive budget or topology');
      const position=accessors[primitive.attributes?.POSITION],index=primitive.indices===undefined?null:accessors[primitive.indices];
      if(!position||position.type!=='VEC3'||position.componentType!==5126||position.count>ASSET_LIMITS.vertices||primitive.targets)fail('position or morph data');
      if(primitive.indices!==undefined&&(!index||index.type!=='SCALAR'||![5121,5123,5125].includes(index.componentType)))fail('indices');
      triangles+=(index?.count||position.count)/3;
      if(triangles>Math.min(maxTriangles,ASSET_LIMITS.triangles))fail('triangle budget');
    }
  }
  // Detect cycles and shared children before the loader recursively visits nodes.
  const parents=new Set(),active=new Set(),done=new Set();
  function visit(index,depth=0){
    if(!integer(index,0,nodes.length-1)||depth>48||active.has(index))fail('node graph');
    if(done.has(index))return;active.add(index);
    for(const child of nodes[index].children||[]){if(parents.has(child))fail('shared node');parents.add(child);visit(child,depth+1);}
    active.delete(index);done.add(index);
  }
  nodes.forEach((_node,index)=>visit(index));
  for(const image of gltf.images||[]){
    const b=buffers[image.bufferView];if(!b||!['image/png','image/jpeg'].includes(image.mimeType))fail('embedded image');
    const bytes=new Uint8Array(input,binaryOffset+8+(b.byteOffset||0),b.byteLength);
    const dimensions=imageDimensions(bytes,image.mimeType);
    if(!dimensions||dimensions[0]>2048||dimensions[1]>2048||dimensions[0]*dimensions[1]>ASSET_LIMITS.imagePixels)fail('image dimensions');
  }
  return {triangles,primitives,nodes:nodes.length,bytes:input.byteLength,gltf};
}

function imageDimensions(bytes,mime){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(mime==='image/png')return bytes.length>=24&&view.getUint32(0)===0x89504e47&&view.getUint32(12)===0x49484452?[view.getUint32(16),view.getUint32(20)]:null;
  if(bytes.length<4||view.getUint16(0)!==0xffd8)return null;
  let offset=2;
  while(offset+4<bytes.length){if(bytes[offset]!==255)return null;const marker=bytes[offset+1],length=view.getUint16(offset+2);if(length<2||offset+2+length>bytes.length)return null;if([0xc0,0xc1,0xc2].includes(marker))return length>=8?[view.getUint16(offset+7),view.getUint16(offset+5)]:null;offset+=2+length;}
  return null;
}
