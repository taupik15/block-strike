/* Decoders for assets referenced by imported entities. Map files remain local. */
const LocalMapMedia=(()=>{
 const decoder=new TextDecoder(),ascii=(b,start,length)=>decoder.decode(new Uint8Array(b,start,length)).split('\0')[0];
 const sides=['ft','bk','up','dn','lf','rt'];
 const mime={png:'image/png',bmp:'image/bmp',jpg:'image/jpeg',jpeg:'image/jpeg'};
 let ambient=[],mountedSprites=null;
 const path=p=>p.replaceAll('\\','/').toLowerCase(),base=p=>path(p).split('/').at(-1);
 const ext=p=>base(p).split('.').at(-1);
 const strip=p=>base(p).replace(/\.[^.]+$/,'');
 const size=(w,h,max=2048)=>{
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>max||h>max)throw Error('Texture dimensions exceed the map limit.');
 };
 function rgba(pixels,width,height){
  const t=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat);
  t.encoding=THREE.sRGBEncoding;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
 }
 function paletteTexture(d,w,h,at,palette,count,format){
  size(w,h,1024);
  if(count<1||count>256||palette+count*3>d.byteLength||at+w*h>d.byteLength||at<0||palette<0)throw Error('Truncated indexed texture.');
  const out=new Uint8Array(w*h*4),bytes=new Uint8Array(d.buffer);
  for(let i=0;i<w*h;i++){
   const pixel=bytes[at+i], color=format===2?count-1:Math.min(count-1,pixel),p=palette+color*3,k=i*4;
   out[k]=bytes[p];out[k+1]=bytes[p+1];out[k+2]=bytes[p+2];
   out[k+3]=format===2?pixel:format===3&&pixel===255?0:255;
  }
  return rgba(out,w,h);
 }
 function tga(b){
  const d=new DataView(b),w=d.getUint16(12,true),h=d.getUint16(14,true),depth=d.getUint8(16),type=d.getUint8(2);
  size(w,h);
  if(d.getUint8(1)!==0||![2,10].includes(type)||![24,32].includes(depth))throw Error('Unsupported TGA color format.');
  let at=18+d.getUint8(0),i=0;
  const pixels=new Uint8Array(w*h*4),bits=d.getUint8(17),stride=depth/8;
  while(i<w*h){
   const packet=type===2?0:d.getUint8(at++);
   const count=(packet&127)+1,repeat=!!(packet&128);
   if(i+count>w*h)throw Error('Invalid TGA packet.');
   for(let j=0;j<count;j++,i++){
    const x=bits&16?w-1-i%w:i%w,y=bits&32?Math.floor(i/w):h-1-Math.floor(i/w);
    const offset=at+(repeat?0:j*stride),k=(y*w+x)*4;
    pixels[k]=d.getUint8(offset+2);pixels[k+1]=d.getUint8(offset+1);pixels[k+2]=d.getUint8(offset);
    pixels[k+3]=stride===4?d.getUint8(offset+3):255;
   }
   at+=(repeat?1:count)*stride;
  }
  return rgba(pixels,w,h);
 }
 function imageSize(b,type){
  const d=new DataView(b);
  if(type==='png'){
   if(d.getUint32(0)!==0x89504e47||d.getUint32(4)!==0x0d0a1a0a||d.getUint32(12)!==0x49484452)throw Error('Invalid PNG header.');
   return [d.getUint32(16),d.getUint32(20)];
  }
  if(type==='bmp'){
   if(d.getUint16(0)!==0x424d)throw Error('Invalid BMP header.');
   return d.getUint32(14,true)===12?[d.getUint16(18,true),d.getUint16(20,true)]:[d.getInt32(18,true),Math.abs(d.getInt32(22,true))];
  }
  if(d.getUint16(0)!==0xffd8)throw Error('Invalid JPEG header.');
  for(let p=2;p+8<d.byteLength;){
   if(d.getUint8(p++)!==255)break;
   while(d.getUint8(p)===255)p++;
   const marker=d.getUint8(p++),n=d.getUint16(p);
   if([0xc0,0xc1,0xc2,0xc3].includes(marker))return [d.getUint16(p+5),d.getUint16(p+3)];
   if(n<2||marker===0xda)break;
   p+=n;
  }
  throw Error('Unsupported JPEG header.');
 }
 async function image(file){
  const type=ext(file.path),b=file.buffer;
  if(type==='tga')return tga(b);
  if(!mime[type])throw Error('Unsupported map image type.');
  size(...imageSize(b,type));
  const url=URL.createObjectURL(new Blob([b],{type:mime[type]}));
  try{
   const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Image decode failed.'));img.src=url});
   const t=new THREE.Texture(img);t.encoding=THREE.sRGBEncoding;t.flipY=false;
   t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;
  }finally{URL.revokeObjectURL(url)}
 }
 function sprite(b){
  const d=new DataView(b),i=o=>d.getInt32(o,true);
  if(i(0)!==0x50534449||i(4)!==2)throw Error('Expected GoldSrc SPR v2.');
  const mode=i(12),count=i(28),colors=d.getUint16(40,true);
  if(mode<0||mode>3||count<1||count>64||colors<1||colors>256)throw Error('Unsupported SPR header.');
  const orientation=i(8),frames=[];
  let offset=42+colors*3,total=0;
  function frame(duration,grouped=false){
   const x=i(offset),y=i(offset+4),w=i(offset+8),h=i(offset+12);offset+=16;
   size(w,h,1024);
   total+=w*h;
   if(total>1048576||frames.length>=96)throw Error('SPR animation exceeds the sprite budget.');
   if(offset+w*h>d.byteLength)throw Error('Truncated SPR frame.');
   frames.push({w,h,x,y,duration,grouped,offset});offset+=w*h;
  }
  for(let n=0;n<count;n++){
   const type=i(offset);offset+=4;
   if(type===0){frame(.1);continue}
   const length=i(offset);offset+=4;
   if(type!==1||length<1||length>64)throw Error('Unsupported SPR group.');
   const intervals=Array.from({length},(_,j)=>d.getFloat32(offset+j*4,true));
   offset+=length*4;
   intervals.forEach((time,j)=>{
    const duration=time-(intervals[j-1]||0);
    if(!Number.isFinite(duration)||duration<=0)throw Error('Invalid SPR group interval.');
    frame(duration,true);
   });
  }
  for(const f of frames){
   f.map=paletteTexture(d,f.w,f.h,f.offset,42,colors,mode);f.map.flipY=true;
  }
  return {frames,mode,orientation,pixels:total};
 }
 function spriteMaterial(bank,opacity=1,additive=false){
  const mode=bank?.mode,add=additive||mode===1;
  return new THREE.SpriteMaterial({map:bank?.frames?.[0]?.map,opacity,
   transparent:add||mode===2||opacity<1,alphaTest:mode===3?.5:0,
   depthWrite:mode===3&&opacity===1&&!add,blending:add?THREE.AdditiveBlending:THREE.NormalBlending});
 }
 function applyFrame(mesh,f,scale){
  mesh.material.map=f.map;mesh.scale.set(f.w*scale,f.h*scale,1);
  mesh.center.set(-f.x/f.w,1-f.y/f.h);
 }
 function spriteOverview(buffer){const {frames}=sprite(buffer);frames.slice(1).forEach(f=>f.map.dispose());return frames[0]?.map}
 function model(b,textureBytes){
  const d=new DataView(b),t=new DataView(d.getInt32(180,true)>0?b:textureBytes||b);
  const i=o=>d.getInt32(o,true),v=o=>d.getFloat32(o,true),j=o=>t.getInt32(o,true);
  if(i(0)!==0x54534449||i(4)!==10||j(0)!==0x54534449||j(4)!==10)throw Error('Expected GoldSrc MDL v10.');
  const boneCount=i(140),boneAt=i(144),bodyCount=i(204),bodyAt=i(208),textureCount=j(180);
  if(boneCount<1||boneCount>128||bodyCount<1||bodyCount>40||textureCount<1||textureCount>64)throw Error('Model exceeds static prop limits or lacks its T.mdl companion.');
  const transforms=[],textures=[],meshes=[];
  for(let k=0;k<boneCount;k++){
   const o=boneAt+k*112,parent=i(o+32);
   if(parent>=k||parent< -1)throw Error('Invalid model skeleton.');
   const p=new THREE.Vector3(v(o+64),v(o+68),v(o+72));
   const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(v(o+76),v(o+80),v(o+84),'ZYX'));
   const m=new THREE.Matrix4().compose(p,q,new THREE.Vector3(1,1,1));
   if(parent>=0)m.premultiply(transforms[parent]);
   transforms.push(m);
  }
  let texels=0,triangles=0;
  function getTexture(index){
   if(index<0||index>=textureCount)throw Error('Invalid model skin.');
   if(textures[index])return textures[index];
   const o=j(184)+index*80,w=j(o+68),h=j(o+72),pixels=j(o+76),alpha=!!(j(o+64)&64);
   texels+=w*h;
   if(texels>2000000)throw Error('Model exceeds texture budget.');
   return textures[index]={w,h,alpha,map:paletteTexture(t,w,h,pixels,pixels+w*h,256,alpha?3:0)};
  }
  for(let body=0;body<bodyCount;body++){
   const o=bodyAt+body*76;
   if(i(o+64)<1)continue;
   const m=i(o+72),count=i(m+72),vertices=i(m+80),at=i(m+88),bones=i(m+84);
   if(count<0||count>128||vertices<0||vertices>25000)throw Error('Model mesh exceeds limits.');
   const points=Array.from({length:vertices},(_,k)=>{
    const p=new THREE.Vector3(v(at+k*12),v(at+k*12+4),v(at+k*12+8));
    const transform=transforms[d.getUint8(bones+k)];
    if(!transform)throw Error('Invalid model bone index.');
    return p.applyMatrix4(transform);
   });
   for(let k=0;k<count;k++){
    const mesh=i(m+76)+k*20,skin=i(mesh+8);
    if(skin<0||skin>=j(192))throw Error('Invalid skin index.');
    const {w,h,alpha,map}=getTexture(t.getUint16(j(200)+skin*2,true));
    let cursor=i(mesh+4);
    const positions=[],uvs=[];
    while(true){
     const command=d.getInt16(cursor,true);cursor+=2;
     if(command===0)break;
     const n=Math.abs(command);
     if(n<3||n>4096||(triangles+=n-2)>44000)throw Error('Model triangles exceed limits.');
     const offset=cursor;
     const push=k=>{
      const a=offset+k*8,point=points[d.getUint16(a,true)];
      if(!point)throw Error('Invalid model vertex index.');
      positions.push(point.x*.02,point.z*.02,-point.y*.02);
      uvs.push(d.getInt16(a+4,true)/w,d.getInt16(a+6,true)/h);
     };
     for(let step=2;step<n;step++){
      if(command<0){push(0);push(step-1)}
      else if(step%2){push(step-1);push(step-2)}
      else{push(step-2);push(step-1)}
      push(step);
     }
     cursor+=n*8;
    }
    if(positions.length)meshes.push({name:alpha?'{mdl':'mdl',map,positions:new Float32Array(positions),uvs:new Float32Array(uvs)});
   }
  }
  if(!meshes.length)throw Error('No static prop geometry.');
  return meshes;
 }
 function reuse(name){
  const file=base(name), WID=/^w_([a-z0-9_]+)\.mdl$/.exec(file)?.[1];
  if(WID&&(Object.hasOwn(W,WID)||['c4','hegrenade','flashbang','smokegrenade'].includes(WID)))return 'world:'+WID;
  const fx=/^(muzzleflash[1-4])\.spr$/.exec(file)?.[1];
  if(fx)return 'assets/cs16-sprites/'+fx+'.png';
  return '';
 }
 function find(files,name){
  const key=path(name);
  return files.find(f=>path(f.path)===key||path(f.path).endsWith('/'+key))||files.find(f=>base(f.path)===base(name));
 }
 async function compile(data,info,files,issues){
  const sprites=new Map(),models=new Map(),sounds=new Map(),png=new Map();
  data.media={sprites,models,sounds};data.sky=null;
  let imagePixels=0,modelBytes=0,spritePixels=0,ambientBytes=0;
  const safe=async(name,fn)=>{
   try{return await fn()}catch(err){issues.push(base(name)+': '+err.message);return null}
  };
  async function limitedImage(file){
   const [w,h]=ext(file.path)==='tga'?[new DataView(file.buffer).getUint16(12,true),new DataView(file.buffer).getUint16(14,true)]:imageSize(file.buffer,ext(file.path));
   size(w,h);imagePixels+=w*h;
   if(imagePixels>8*1024*1024)throw Error('Map image budget exceeded.');
   return image(file);
  }
  for(const name of data.missing){
   const file=find(files,name+'.png');if(!file)continue;
   const map=await safe(name,()=>limitedImage(file));if(!map)continue;
   map.wrapS=map.wrapT=THREE.RepeatWrapping;
   png.set(name,map);
  }
  for(const batch of data.meshes)if(!batch.map&&png.has(batch.name))batch.map=png.get(batch.name);
  data.missing=data.missing.filter(name=>!png.has(name));
  if(info.sky){
   const sky={};
   for(const side of sides){
    const file=files.find(f=>strip(f.path)===info.sky+side&&(['tga',...Object.keys(mime)].includes(ext(f.path))));
    if(file){
     const map=await safe(file.path,()=>limitedImage(file));
     if(map){map.flipY=true;map.needsUpdate=true;sky[side]=map}
    }
   }
   if(sides.every(side=>sky[side]))data.sky=sky;
   else{
    Object.values(sky).forEach(t=>t.dispose());
    issues.push('Missing skybox faces for '+info.sky+'.');
   }
  }
  for(const name of info.models.slice(0,32)){
   const file=find(files,name)||(ext(name)==='spr'?GoldSrcSprites.file(base(name)):null),backup=reuse(name);
   if(!file&&!backup)continue;
   if(ext(name)==='spr'){
    const data=file?await safe(name,()=>{if(file.buffer.byteLength>3*1024*1024)throw Error('SPR file budget exceeded.');const decoded=sprite(file.buffer);
     spritePixels+=decoded.pixels;
     if(spritePixels>4*1024*1024){decoded.frames.forEach(f=>f.map.dispose());throw Error('Map sprite texture budget exceeded.');}
     return decoded}):{reuse:backup};
    if(data)sprites.set(path(name),data);
   }else{
    if(file)modelBytes+=file.buffer.byteLength;
    const partner=file&&find(files,strip(file.path)+'t.mdl');
    const data=file?await safe(name,()=>{if(modelBytes>8*1024*1024)throw Error('Map prop budget exceeded.');return model(file.buffer,partner?.buffer)}):{reuse:backup};
    if(data)models.set(path(name),data);
   }
  }
  if(info.models.length>32)issues.push('Some props or sprites exceed the per-map asset count.');
  for(const name of info.sounds.slice(0,12)){
   const file=find(files,name);
   // Audio uses HTMLAudioElement, not a fully decoded Web Audio buffer.
   // Allow Aztec's 2.4 MB rain loop, while bounding total local audio.
   if(file&&file.buffer.byteLength<=4*1024*1024&&ambientBytes+file.buffer.byteLength<=12*1024*1024){sounds.set(path(name),file);ambientBytes+=file.buffer.byteLength;}
   else if(file)issues.push('Ambient clip exceeds playback budget: '+base(name));
  }
  const overview=files.filter(f=>ext(f.path)==='txt'&&strip(f.path)===data.name.toLowerCase()&&f.buffer.byteLength<=64*1024)
   .find(f=>/\bIMAGE\s+"?([^"\s]+)/i.test(decoder.decode(f.buffer)));
  if(overview){
   const metadata=decoder.decode(overview.buffer);
   const name=/\bIMAGE\s+"?([^"\s]+)/i.exec(metadata)?.[1],file=name&&find(files,name);
   if(file){
    const preview=await safe(file.path,async()=>ext(file.path)==='spr'?spriteOverview(file.buffer):limitedImage(file));
    if(preview){data.overviewPath=file.path;preview.dispose()}
   }
  }
 }
 function position(origin,T){
  const p=(origin||'').trim().split(/\s+/).map(Number);
  return p.length===3&&p.every(Number.isFinite)?V(...BSP.toGame(T,p)):null;
 }
 function splash(col,from,to){
  if(!col?.water?.length||to.y>=from.y||!GoldSrcSprites.file('wsplash3.spr'))return;
  for(const brush of col.water){
   const surface=(brush.origin[2]+brush.maxs[2])*col.T.k;
   if(from.y<=surface||to.y>surface)continue;
   const point=from.clone().lerp(to,(from.y-surface)/(from.y-to.y));
   const h=BSP.toHammer(col.T,point.toArray());
   if([0,1].every(i=>h[i]>=brush.origin[i]+brush.mins[i]&&h[i]<=brush.origin[i]+brush.maxs[i])){
    GoldSrcSprites.play(S,'wsplash3',point,{scale:.012,fps:20});return;
   }
  }
 }
 function weather(data,scene){
  const kind=data.files.find(e=>e.classname==='env_rain'||e.classname==='env_snow')?.classname;
  if(!kind)return;
  const rain=kind==='env_rain',map=GoldSrcSprites.weatherTexture(rain?'rain':'snow');
  const n=rain?120:76,lines=rain&&!map,stride=lines?6:3,particles=new Float32Array(n*stride);
  for(let i=0;i<particles.length;i+=stride){
   particles[i]=Math.random()*20-10;particles[i+1]=Math.random()*12-4;particles[i+2]=Math.random()*20-10;
  }
  const geometry=new THREE.BufferGeometry(),attribute=new THREE.BufferAttribute(particles,3);
  attribute.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('position',attribute);
  const options={color:rain?0xbad0dd:0xf5f8ff,transparent:true,opacity:rain?.28:.62,depthWrite:false};
  const mesh=lines?new THREE.LineSegments(geometry,new THREE.LineBasicMaterial(options)):
   new THREE.Points(geometry,new THREE.PointsMaterial({...options,map,size:map?(rain?.31:.19):.032,alphaTest:map?.025:0}));
  mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
  data.weather={mesh,particles,attribute,rain,lines,stride,nextCheck:0,ray:new THREE.Raycaster()};
 }
 function updateWeather(w,dt){
  if(!w||!cam||!running)return;
  const {mesh,particles,attribute,rain,lines,stride}=w;
  w.nextCheck-=dt;
  if(w.nextCheck<=0){
   w.nextCheck=.25;
   w.ray.set(cam.position,V(0,1,0));w.ray.far=32;
   mesh.visible=w.ray.intersectObjects(obsM,false).length===0;
  }
  if(!mesh.visible)return;
  mesh.position.copy(cam.position);
  for(let i=0;i<particles.length;i+=stride){
   particles[i+1]-=dt*(rain?12:1.5);
   if(particles[i+1]<-4)particles[i+1]+=12;
   if(lines){particles[i+3]=particles[i]+.055;particles[i+4]=particles[i+1]-.29;particles[i+5]=particles[i+2]+.035}
  }
  attribute.needsUpdate=true;
 }
 function mountBeams(data,scene){
  const anchors=new Map(data.files.filter(e=>e.targetname&&e.origin).map(e=>[e.targetname,e.origin]));
  const beams=data.files.filter(e=>['env_lightning','env_beam'].includes(e.classname)).slice(0,12);
  return beams.flatMap(e=>{
   if(e.targetname&&!(Number(e.spawnflags)&1))return [];
   const from=position(anchors.get(e.LightningStart),data.col.T),to=position(anchors.get(e.LightningEnd),data.col.T);
   const sprite=data.media?.sprites.get(path(e.texture||''));
   if(!from||!to||!sprite?.frames?.length||from.distanceToSquared(to)<.0001)return [];
   const life=Math.min(30,Math.max(0,Number(e.life)||0)),interval=Math.min(90,Math.max(.08,Number(e.StrikeTime)||0));
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(
    Math.min(5,Math.max(.02,(Number(e.BoltWidth)||10)*.02)),from.distanceTo(to)),
   new THREE.MeshBasicMaterial({map:sprite.frames[0].map,side:THREE.DoubleSide,transparent:true,depthWrite:false,
    blending:THREE.AdditiveBlending,opacity:e.renderamt==null?1:Math.min(1,Math.max(0,Number(e.renderamt)/255||0))}));
   mesh.position.copy(from).lerp(to,.5);mesh.visible=life===0;scene.add(mesh);
   return [{mesh,axis:to.sub(from).normalize(),frames:sprite.frames,life,interval,time:life?-1:0,
    frame:Math.max(0,Number(e.framestart)|0),fps:Math.max(1,Math.min(60,Number(e.framerate)||10))}];
  });
 }
 const beamBasis=new THREE.Matrix4(),beamSide=new THREE.Vector3(),beamNormal=new THREE.Vector3();
 function updateBeams(data,dt){
  if(!cam)return;
  for(const b of data.beams||[]){
   b.time+=dt;
   const time=b.life&&b.time>=0?b.time%(b.life+b.interval):b.time;
   b.mesh.visible=!b.life||time>=0&&time<b.life;
   if(!b.mesh.visible)continue;
   b.mesh.material.map=b.frames[(b.frame+Math.floor(Math.max(0,time)*b.fps))%b.frames.length].map;
   beamSide.copy(cam.position).sub(b.mesh.position).cross(b.axis);
   if(beamSide.lengthSq()<1e-8)continue;
   beamSide.normalize();beamNormal.crossVectors(beamSide,b.axis);
   b.mesh.quaternion.setFromRotationMatrix(beamBasis.makeBasis(beamSide,b.axis,beamNormal));
  }
 }
 function mount(data,scene){
  data.animatedSprites=[];mountedSprites=data.media?.sprites;weather(data,scene);data.beams=mountBeams(data,scene);
  const fog=data.files.find(e=>e.classname==='env_fog');
  if(fog){
   const density=Number(fog.density),color=(fog.rendercolor||'').trim().split(/\s+/).map(Number);
   if(density>0&&density<=1&&color.length===3&&color.every(x=>Number.isFinite(x)&&x>=0&&x<=255))
    scene.fog=new THREE.FogExp2(new THREE.Color(...color.map(x=>x/255)),Math.min(.6,density/.02));
  }
  if(!data.media)return;
  const meshCache=new Map();
  for(const e of data.files.slice(0,4000)){
   const p=position(e.origin,data.col.T);if(!p)continue;
   const key=path(e.model||''),model=data.media.models.get(key),sprite=data.media.sprites.get(key);
   if(model){
    const group=new THREE.Group();group.position.copy(p);group.rotation.y=(Number(e.angles?.split(/\s+/)[1])||Number(e.angle)||0)*Math.PI/180;scene.add(group);
    if(model.reuse){
     Phase9.loadWorldModel(model.reuse.slice(6)).then(source=>{
      if(!source||!group.parent||activeMapData?.local!==data)return;
      const item=source.clone(true);Phase9.orientGoldSrcWorld(item);
      item.traverse(mesh=>{if(mesh.isMesh){mesh.geometry=mesh.geometry.clone();mesh.material=mesh.material.clone();if(mesh.material.map)mesh.material.map=mesh.material.map.clone()}});
      group.add(item);
     });
    }else{
     if(!meshCache.has(key))meshCache.set(key,model.map(BSPVisuals.mesh));
     for(const mesh of meshCache.get(key))group.add(mesh.clone());
    }
   }
   if(sprite&&!(e.classname==='env_sprite'&&e.targetname&&!(Number(e.spawnflags)&1))){
    const first=sprite.frames?.[0];
    const renderMode=Number(e.rendermode)||0;
    const amount=Number(e.renderamt);
    const opacity=renderMode&&Number.isFinite(amount)?Math.min(1,Math.max(0,amount/255)):1;
    const material=spriteMaterial(sprite,opacity,renderMode===5);
    if(!first){material.map=new THREE.TextureLoader().load(sprite.reuse);material.transparent=true}
    const mesh=new THREE.Sprite(material);mesh.position.copy(p);
    const scale=(Number(e.scale)||1)*.02;
    if(first)applyFrame(mesh,first,scale);else mesh.scale.set(30*scale,30*scale,1);
    scene.add(mesh);
    const fps=Math.max(1,Math.min(60,Number(e.framerate)||10));
    if(sprite.frames?.length>1)data.animatedSprites.push({mesh,frames:sprite.frames,index:0,time:0,scale,fps});
   }
   if(e.classname==='ambient_generic'&&!(Number(e.spawnflags)&16)&&ambient.length<12){
    const file=data.media.sounds.get(path(e.message||''));
    if(!file)continue;
    const mime={wav:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg'}[ext(file.path)];
    const url=URL.createObjectURL(new Blob([file.buffer],{type:mime}));
    const audio=new Audio(url);audio.loop=!(Number(e.spawnflags)&32);audio.preload='none';
    ambient.push({audio,url,p,volume:Math.min(1,(Number(e.health)||10)/10),started:false,retryAt:0});
   }
  }
 }
 function update(data,dt){
  if(!data)return;
  updateWeather(data.weather,dt);updateBeams(data,dt);
  for(const map of data.waterMaps||[])map.offset.x=(map.offset.x+dt*.017)%1;
  for(const a of data.animatedSprites||[]){
   a.time+=dt;
   const previous=a.index;
   let duration=f=>f.grouped?f.duration:1/a.fps;
   while(a.time>=duration(a.frames[a.index])){
    a.time-=duration(a.frames[a.index]);a.index=(a.index+1)%a.frames.length;
   }
   if(a.index!==previous)applyFrame(a.mesh,a.frames[a.index],a.scale);
  }
  for(const a of ambient){
   if(!running){a.audio.pause();if(a.audio.loop)a.started=false;continue}
   const range=a.p.distanceTo(cam.position);
   a.audio.volume=Math.min(1,masterVolume*a.volume/(1+range*.23));
   if(!a.started&&range<45&&performance.now()>=a.retryAt){
    a.started=true;a.audio.play().catch(()=>{a.started=false;a.retryAt=performance.now()+3000;});
   }
  }
 }
 function pauseAmbient(){for(const a of ambient){a.audio.pause();if(a.audio.loop)a.started=false;}}
 function clear(){
  const released=new Set();
  for(const bank of mountedSprites?.values()||[])for(const frame of bank.frames||[])released.add(frame.map);
  for(const map of released)map.dispose();mountedSprites=null;
  for(const {audio,url} of ambient){audio.pause();audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url)}
  ambient=[];return released;
 }
 // GoldSrc overview BMP/SPR uses exact bright-green chroma key. Do not key world textures.
 function chromaKeyOverview(pixels){for(let i=0;i<pixels.length;i+=4)if(pixels[i]===0&&pixels[i+1]===255&&pixels[i+2]===0)pixels[i+3]=0;return pixels}
 async function preview(file){
  const frames=ext(file.path)==='spr'?sprite(file.buffer).frames:null;
  const texture=frames?frames[0]?.map:await image(file);
  frames?.slice(1).forEach(f=>f.map.dispose());
  if(!texture)return null;
  const src=texture.image;texture.dispose();
  const canvas=document.createElement('canvas');canvas.width=src.width;canvas.height=src.height;
  const ctx=canvas.getContext('2d');
  if(src.data)ctx.putImageData(new ImageData(new Uint8ClampedArray(src.data),src.width,src.height),0,0);
  else ctx.drawImage(src,0,0);
  const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
  chromaKeyOverview(frame.data);ctx.putImageData(frame,0,0);
  return canvas;
 }
 return {compile,mount,update,clear,pauseAmbient,splash,reuse,preview,chromaKeyOverview,decodeSprite:sprite,decodeTga:tga,spriteMaterial,applyFrame};
})();
