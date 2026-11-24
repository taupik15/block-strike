/* AR.11.10.9-MDL: GoldSrc IDST v10 viewmodel loader. No additional dependencies.
 * Studio data stays in native GoldSrc coordinates (X forward, Y left, Z up);
 * one group transform maps it to Three camera coordinates. 100% local files.
 * p_/w_ models are outside this viewmodel-only integration.
 */
(function(global){'use strict';
 const VERSION='AR.11.10.9-MDL.2';
 // ROOT CAUSE (AR.11.10.9-MDL.2): the game ships three.js r128, where a SkinnedMesh is only
// skinned on the GPU when material.skinning===true (the flag was removed in r129). The MDL.1
// loader never set it, so every mesh was drawn at its raw bind-pose position (CPU skinning via
// SkinnedMesh.boneTransform was correct, the GPU path was not). That produced the giant
// forearms, detached hands and mis-placed weapons seen on the iPhone. The old
// globalOffset [0,0,-0.30] only hid the symptom (and shrank the weapon); it is removed.
// Studio data stays in native GoldSrc units; one root transform maps it to camera space.
const PROFILE=Object.freeze({viewmodelFov:73.74,globalScale:.02,globalOffset:[0,0,0]});
const SKINNING_FLAG=parseInt(global.THREE&&global.THREE.REVISION||'0',10)<129;
const report={};
 const i32=(v,o)=>v.getInt32(o,true),u16=(v,o)=>v.getUint16(o,true),i16=(v,o)=>v.getInt16(o,true),f32=(v,o)=>v.getFloat32(o,true);
 function checked(view,at,count=1){if(!Number.isSafeInteger(at)||at<0||at+count>view.byteLength)throw Error('MDL offset out of range '+at+'+'+count);return at;}
 function text(v,off,n){checked(v,off,n);let s='';for(let k=0;k<n;k++){const b=v.getUint8(off+k);if(!b)break;s+=String.fromCharCode(b)}return s;}
 function parse(bytes,name='unknown'){
  const buf=bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const v=new DataView(buf);checked(v,0,244);
  if(text(v,0,4)!=='IDST'||i32(v,4)!==10)throw Error('Only GoldSrc IDST v10 is supported');
  if(i32(v,72)>buf.byteLength||i32(v,72)<244)throw Error('Malformed MDL byte length');
  function table(countAt,offsetAt,stride,limit){const n=i32(v,countAt),at=i32(v,offsetAt);if(n<0||n>limit)throw Error('Malformed MDL table count');checked(v,at,n*stride);return {n,at};}
  const bt=table(140,144,112,128),st=table(164,168,176,512),tt=table(180,184,80,512),pt=table(204,208,76,128);
  const bones=[];for(let j=0;j<bt.n;j++){const o=bt.at+j*112;const parent=i32(v,o+32);if(parent>=bt.n||parent>=j)throw Error('Bone hierarchy invalid');bones.push({name:text(v,o,32),parent,position:[f32(v,o+64),f32(v,o+68),f32(v,o+72)],rotation:[f32(v,o+76),f32(v,o+80),f32(v,o+84)],scale:[f32(v,o+88),f32(v,o+92),f32(v,o+96),f32(v,o+100),f32(v,o+104),f32(v,o+108)]});}
  const sequences=[];
  for(let j=0;j<st.n;j++){
   const o=st.at+j*176,nFrames=i32(v,o+56),fps=f32(v,o+32),group=i32(v,o+156),animindex=i32(v,o+124);
   if(nFrames<1||nFrames>4096||fps<=0||fps>1000)throw Error('Invalid animation frames/fps');
   if(group!==0)throw Error('External MDL sequence group not supported: '+group);
   checked(v,animindex,bt.n*12);
   const eventCount=i32(v,o+48),eventIndex=i32(v,o+52),events=[];
   if(eventCount>0&&eventCount<1024){checked(v,eventIndex,eventCount*76);for(let e=0;e<eventCount;e++){const p=eventIndex+e*76;events.push({frame:i32(v,p),event:i32(v,p+4),options:text(v,p+12,64)})}}
   sequences.push({name:text(v,o,32),fps,frames:nFrames,loop:!!(i32(v,o+36)&1),animindex,flags:i32(v,o+36),events});
  }
  const textures=[];
  for(let j=0;j<tt.n;j++){
   const o=tt.at+j*80,w=i32(v,o+68),h=i32(v,o+72),at=i32(v,o+76);
   if(w<1||h<1||w*h>4000000)throw Error('Invalid texture size');checked(v,at,w*h+768);
   textures.push({name:text(v,o,64),flags:i32(v,o+64),width:w,height:h,offset:at});
  }
  const skinRef=i32(v,192),skinFamilies=i32(v,196),skinIndex=i32(v,200),skin=[];
  if(skinRef>0&&skinRef<512&&skinFamilies>0&&skinFamilies<512){checked(v,skinIndex,skinRef*skinFamilies*2);for(let i=0;i<skinRef;i++)skin.push(u16(v,skinIndex+i*2))}
  const attachments=[];const at=table(212,216,88,64);
  for(let j=0;j<at.n;j++){const o=at.at+j*88,bone=i32(v,o+36);
   if(bone<0||bone>=bones.length)throw Error('Invalid attachment bone');
   attachments.push({bone,position:[f32(v,o+40),f32(v,o+44),f32(v,o+48)]});
  }
  const bodyparts=[],meshes=[];let vertexTotal=0,triangleTotal=0;
  for(let p=0;p<pt.n;p++){
   const off=pt.at+p*76,modelCount=i32(v,off+64),modelAt=i32(v,off+72);
   if(modelCount<0||modelCount>128)throw Error('Invalid model count');checked(v,modelAt,modelCount*112);
   const part={name:text(v,off,64),models:modelCount};bodyparts.push(part);
   // Default bodygroup/model only: this is the game's active v_ model.
   if(!modelCount)continue;
   const mo=modelAt,meshCount=i32(v,mo+72),meshAt=i32(v,mo+76),nVert=i32(v,mo+80),info=i32(v,mo+84),pos=i32(v,mo+88),nNorm=i32(v,mo+92),normInfo=i32(v,mo+96),normPos=i32(v,mo+100);
   if(meshCount<0||meshCount>512||nVert<0||nVert>65535||nNorm<0||nNorm>65535)throw Error('Invalid model geometry');
   checked(v,meshAt,meshCount*20);checked(v,info,nVert);checked(v,pos,nVert*12);checked(v,normInfo,nNorm);checked(v,normPos,nNorm*12);
   for(let m=0;m<meshCount;m++){
    const me=meshAt+m*20,triIndex=i32(v,me+4),skinSlot=i32(v,me+8),tris=[];
    let at=triIndex,commandCount=0;
    for(;;){checked(v,at,2);const count=i16(v,at);at+=2;if(!count)break;
     const n=Math.abs(count);if(n<3||n>10000||++commandCount>20000)throw Error('Invalid triangle command');
     checked(v,at,n*8);const verts=[];
     for(let i=0;i<n;i++){const vi=i16(v,at),ni=i16(v,at+2),s=i16(v,at+4),t=i16(v,at+6);at+=8;
      if(vi<0||vi>=nVert||ni<0||ni>=nNorm)throw Error('Invalid tricmd vertex');verts.push({vi,ni,s,t});}
     for(let k=2;k<n;k++){
      let a,b,c;
      if(count>0){a=verts[k-2];b=verts[k-1];c=verts[k];if(k&1){const tmp=a;a=b;b=tmp}}
      else{a=verts[0];b=verts[k-1];c=verts[k]}
      tris.push(a,b,c);
     }
    }
    const texId=skin[skinSlot]??skinSlot;if(!textures[texId])throw Error('Invalid mesh texture index');
    meshes.push({part:part.name,model:text(v,mo,64),texture:texId,modelOffset:mo,info,pos,normInfo,normPos,triangles:tris});vertexTotal+=tris.length;triangleTotal+=tris.length/3;
   }
  }
  return {name,buffer:buf,view:v,bones,sequences,textures,bodyparts,meshes,attachments,vertexTotal,triangleTotal};
 }
 // GoldSrc AngleQuaternion follows its XYZ channels with a ZYX Euler composition.
 function angleQuat(angles,THREE){const [x,y,z]=angles;return new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'ZYX'));}
 function channelValue(parsed,anim,channel,frame){
  const v=parsed.view,relative=u16(v,anim+channel*2);
  if(!relative)return 0;
  let at=anim+relative,remaining=frame;
  for(let guard=0;guard<10000;guard++){
   checked(v,at,2);const valid=v.getUint8(at),total=v.getUint8(at+1);
   if(total===0||valid>total)throw Error('Corrupt MDL animation RLE');
   checked(v,at+2,valid*2);
   if(remaining<total)return valid?i16(v,at+2+Math.min(remaining,valid-1)*2):0;
   remaining-=total;at+=2+valid*2;
  }
  throw Error('Animation RLE overflow');
 }
 function texture(parsed,t,THREE){
  const w=t.width,h=t.height,at=t.offset,data=new Uint8Array(w*h*4),v=parsed.view;
  const mask=!!(t.flags&0x40);
  for(let j=0;j<w*h;j++){
   const palette=v.getUint8(at+j),p=at+w*h+palette*3;
   data[j*4]=v.getUint8(p);data[j*4+1]=v.getUint8(p+1);data[j*4+2]=v.getUint8(p+2);data[j*4+3]=mask&&palette===255?0:255;
  }
  const tex=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);
  tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.flipY=true;
  if('colorSpace' in tex&&THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;
  else if(THREE.sRGBEncoding)tex.encoding=THREE.sRGBEncoding;
  tex.needsUpdate=true;
  const additive=!!(t.flags&0x20),flat=!!(t.flags&0x1),chrome=!!(t.flags&0x2),fullbright=!!(t.flags&0x4);
  const params={map:tex,side:THREE.DoubleSide,alphaTest:mask?.5:0,transparent:mask||additive,depthWrite:!additive,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending};
  // three r128 requires skinning:true for GPU skinning of SkinnedMesh (ignored/removed from r129).
  if(((THREE.REVISION|0)<129)||SKINNING_FLAG)params.skinning=true;
  const material=new (fullbright||additive?THREE.MeshBasicMaterial:THREE.MeshLambertMaterial)(params);
  if(flat&&THREE.FlatShading)material.shading=THREE.FlatShading;
  material.userData.goldSrcFlags=t.flags;material.userData.chromeApproximation=chrome;
  return material;
 }
 function build(parsed,THREE,options={}){
  const character=!!options.character;
  const root=new THREE.Group();root.name=character?'CS16ClassicArmature':'GoldSrc_'+parsed.name;root.userData.nativeMdl=true;
  const matrix=new THREE.Matrix4().set(0,-1,0,0,0,0,1,0,-1,0,0,0,0,0,0,1);
  root.quaternion.setFromRotationMatrix(matrix);root.scale.setScalar(character?.028:PROFILE.globalScale);root.position.set(...PROFILE.globalOffset);
  const bones=parsed.bones.map((def,i)=>{const b=new THREE.Bone();b.name=character?THREE.PropertyBinding.sanitizeNodeName(def.name):'mdl_b'+i;b.userData.srcName=def.name;b.position.set(...def.position);b.quaternion.copy(angleQuat(def.rotation,THREE));return b});
  for(let i=0;i<bones.length;i++){const p=parsed.bones[i].parent;if(p<0)root.add(bones[i]);else bones[p].add(bones[i])}
  root.updateMatrixWorld(true);
  const vertexWork=new THREE.Vector3(),normalWork=new THREE.Vector3();
  const rootInverse=root.matrixWorld.clone().invert();
  parsed.attachments.forEach((a,i)=>{
   const anchor=new THREE.Object3D();anchor.name='mdl_attach_'+i;
   anchor.position.set(...a.position);bones[a.bone].add(anchor);
  });
  const materials=parsed.textures.map(t=>texture(parsed,t,THREE));
  const skeleton=new THREE.Skeleton(bones);
  for(const data of parsed.meshes){
   const vertices=[],uvs=[],nrm=[],indices=[],weights=[];const t=parsed.textures[data.texture];const v=parsed.view;
   for(const tvert of data.triangles){
    const bone=v.getUint8(data.info+tvert.vi),normBone=v.getUint8(data.normInfo+tvert.ni);
    if(bone>=bones.length||normBone>=bones.length)throw Error('Vertex bone out of range');
    const idx=data.pos+tvert.vi*12;
    vertexWork.set(f32(v,idx),f32(v,idx+4),f32(v,idx+8)).applyMatrix4(bones[bone].matrixWorld);
    // Vertex bind coordinates are stored in world-relative native MDL space.
    // Remove the root's view transform to match skinned mesh-local binding.
    vertexWork.applyMatrix4(rootInverse);
    vertices.push(vertexWork.x,vertexWork.y,vertexWork.z);
    const ni=data.normPos+tvert.ni*12;
    normalWork.set(f32(v,ni),f32(v,ni+4),f32(v,ni+8)).transformDirection(bones[normBone].matrixWorld);
    normalWork.transformDirection(rootInverse);nrm.push(normalWork.x,normalWork.y,normalWork.z);
    uvs.push(t.flags&0x2?Math.max(0,Math.min(1,(normalWork.x+1)/2)):tvert.s/t.width,t.flags&0x2?Math.max(0,Math.min(1,(normalWork.y+1)/2)):1-tvert.t/t.height);
    indices.push(bone,0,0,0);weights.push(1,0,0,0);
   }
   // STUDIO_NF_FLATSHADE: use one shared face normal per triangle at bind pose.
   if(t.flags&0x1){
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
    for(let i=0;i<vertices.length;i+=9){
     a.set(vertices[i],vertices[i+1],vertices[i+2]);b.set(vertices[i+3],vertices[i+4],vertices[i+5]);c.set(vertices[i+6],vertices[i+7],vertices[i+8]);
     ab.subVectors(b,a);ac.subVectors(c,a);ab.cross(ac).normalize();
     for(let k=0;k<3;k++){nrm[i+3*k]=ab.x;nrm[i+3*k+1]=ab.y;nrm[i+3*k+2]=ab.z}
    }
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
   const mesh=new THREE.SkinnedMesh(geo,materials[data.texture]);mesh.name='mdl_mesh_'+root.children.length;mesh.userData.mdlPart=data.part;mesh.userData.texName=String(t&&t.name||'');mesh.frustumCulled=false;root.add(mesh);
   root.updateMatrixWorld(true);mesh.bind(skeleton,mesh.matrixWorld);
  }
  const clips=[],clipCounts=new Map();
  for(const seq of parsed.sequences){
   if(options.preview&&seq.name!=='idle1')continue;
   const times=[],positionTracks=bones.map(()=>[]),rotationTracks=bones.map(()=>[]);
   for(let frame=0;frame<seq.frames;frame++){
    times.push(frame/seq.fps);
    for(let b=0;b<bones.length;b++){
     const def=parsed.bones[b],anim=seq.animindex+b*12;
     const p=def.position.map((val,j)=>val+def.scale[j]*channelValue(parsed,anim,j,frame));
     const r=def.rotation.map((val,j)=>val+def.scale[j+3]*channelValue(parsed,anim,j+3,frame));
     const q=angleQuat(r,THREE);positionTracks[b].push(...p);rotationTracks[b].push(q.x,q.y,q.z,q.w);
    }
   }
   const tracks=[];for(let b=0;b<bones.length;b++){
    tracks.push(new THREE.VectorKeyframeTrack(bones[b].name+'.position',times,positionTracks[b]));
    tracks.push(new THREE.QuaternionKeyframeTrack(bones[b].name+'.quaternion',times,rotationTracks[b]));
   }
   const duration=Math.max(1/seq.fps,(seq.frames-1)/seq.fps);
   const count=(clipCounts.get(seq.name)||0)+1;clipCounts.set(seq.name,count);
   clips.push(new THREE.AnimationClip(count===1?seq.name:seq.name+'__'+count,duration,tracks));
  }
  return {scene:root,animations:clips,nativeMdl:true,report:{name:parsed.name,bones:bones.length,meshes:parsed.meshes.length,vertices:parsed.vertexTotal,triangles:parsed.triangleTotal,textures:parsed.textures.length,attachments:parsed.attachments.length,sequences:parsed.sequences.map(s=>({label:s.name,fps:s.fps,frames:s.frames,events:s.events.length}))}};
 }
 const nativeNames=new Set(['ak47','aug','awp','c4','deagle','elite','famas','fiveseven','flashbang','g3sg1','galil','glock18','hegrenade','knife','knife_r','m249','m3','m4a1','mac10','mp5','p228','p90','scout','sg550','sg552','shield_r','smokegrenade','tmp','ump45','usp','xm1014']);
 function sourceName(asset){
  // v_knife_r.mdl has no shield mesh. v_shield_r.mdl bakes in a Five-SeveN,
  // so it cannot depict a selected USP/Glock/P228/Deagle correctly. The shipped
  // pistol-specific/knife shield GLBs already contain both items and all three
  // authored shield poses. Keep native MDL.2 for every other supported weapon.
  if(/^shield_(knife|usp|glock18|p228|deagle|fiveseven)$/.test(asset))return null;
  if(asset.startsWith('shield_'))return null;
  return nativeNames.has(asset)?asset:null;
 }

 // Handedness the original GoldSrc files were authored for (verified by rendering the raw, unmirrored
 // models in a real WebGL harness against the CS 1.6 PC reference): ordinary weapons/grenades/C4 are
 // authored for the LEFT hand and the engine mirrors them for right-handed players; v_knife(_r) and
 // v_shield_r are authored for the RIGHT hand and are not mirrored for right-handed players.
 const knifeFlip=!!(global.location&&new URLSearchParams(global.location.search).has('mdlKnifeFlip'));
 function authoredHand(asset){const id=sourceName(asset);if(id==='knife_r'||id==='shield_r')return 'right';if(id==='knife')return knifeFlip?'left':'right';return 'left';}
 // true when the viewmodel group must be mirrored (scale.x=-1) for the player's hand setting.
 function mirrorFor(asset,hand){if(asset&&asset.startsWith('shield_'))return false;return authoredHand(asset)!==(hand==='left'?'left':'right');}
 async function load(asset,THREE){const id=sourceName(asset);if(!id)throw Error('No matching v_*.mdl for '+asset);
  const url='assets/models/goldsrc-v/v_'+id+'.mdl';let response;
  try{response=await fetch(url);if(!response.ok)throw Error('HTTP '+response.status);const parsed=parse(await response.arrayBuffer(),id),gltf=build(parsed,THREE);report[asset]={status:'native',asset:url,source:id,...gltf.report,drawCalls:gltf.report.meshes,animationMap:{idle:parsed.sequences.find(s=>s.name.startsWith('idle'))?.name||null,shoot:parsed.sequences.find(s=>s.name.startsWith('shoot'))?.name||null,reload:parsed.sequences.find(s=>s.name.startsWith('reload'))?.name||null,draw:parsed.sequences.find(s=>s.name==='draw')?.name||null}};return gltf;
  }catch(e){report[asset]={status:'fallback',asset:url,reason:String(e.message||e)};throw e;}}
 function fallback(asset,reason){report[asset]={status:'fallback',reason:String(reason||'No matching MDL'),source:sourceName(asset)};}
 function summary(){return JSON.parse(JSON.stringify(report))}
 global.GoldSrcMDL10=Object.freeze({parse,build,load,sourceName,authoredHand,mirrorFor,profile:PROFILE,summary,fallback,VERSION});
 if(global.location&&new URLSearchParams(global.location.search).has('mdlDebug')){
  global.BlockStrikeMDLReport=()=>summary();
  console.info('[MDL] Live loader report: BlockStrikeMDLReport()');
 }
})(window);
