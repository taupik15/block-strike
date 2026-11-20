/* Local GoldSrc v30 files are read in memory. No map or WAD bytes are uploaded. */
const LocalBSP=(()=>{
 const maxBytes=32*1024*1024;
 const decoder=new TextDecoder('latin1');
 const cstring=(d,o,n)=>decoder.decode(new Uint8Array(d.buffer,d.byteOffset+o,n)).split('\0')[0];
 const fail=message=>{throw new Error(message)};
 const integer=(d,o)=>d.getInt32(o,true),real=(d,o)=>d.getFloat32(o,true);
 const vec=(d,o)=>[real(d,o),real(d,o+4),real(d,o+8)];
 function slice(view,offset,length){
  if(offset<0||length<0||offset+length>view.byteLength)fail('BSP/WAD contains an invalid offset.');
  return new DataView(view.buffer,view.byteOffset+offset,length);
 }
 function entities(data){
  const list=[];
  if(data.byteLength>2*1024*1024)fail('BSP entity lump exceeds 2 MiB.');
  const text=cstring(data,0,data.byteLength);
  for(const match of text.matchAll(/\{([^{}]*)\}/g)){
   const e=Object.create(null);
   for(const pair of match[1].matchAll(/"([^"]*)"\s*"([^"]*)"/g))e[pair[1]]=pair[2];
   list.push(e);
  }
  return list;
 }
 function wadDirectory(buffers){
  const entries=new Map();
  for(const buffer of buffers){
   const view=new DataView(buffer);
   if(view.byteLength<12||cstring(view,0,4)!=='WAD3')fail('Texture file must be WAD3.');
   const count=integer(view,4),table=slice(view,integer(view,8),count*32);
   for(let i=0;i<count;i++){
    const offset=i*32;
    if(table.getUint8(offset+12)!==0x43||table.getUint8(offset+13)!==0)continue;
    entries.set(cstring(table,offset+16,16).toLowerCase(),slice(view,integer(table,offset),integer(table,offset+4)));
   }
  }
  return entries;
 }
 function textureInfo(view){
  if(view.byteLength<40)return null;
  const name=cstring(view,0,16),width=integer(view,16),height=integer(view,20);
  if(width<1||height<1||width>1024||height>1024)return null;
  return {name,width,height,view};
 }
 function decodeTexture(info,name){
  if(!info)return null;
  const {view,width,height}=info,size=width*height,offset=integer(view,24),mip=integer(view,36);
  const palette=mip+Math.max(1,(width>>3)*(height>>3))+2;
  if(offset<40||mip<40||palette+768>view.byteLength||offset+size>view.byteLength)return null;
  const bytes=new Uint8Array(view.buffer,view.byteOffset,view.byteLength);
  const rgba=new Uint8Array(size*4);
  for(let i=0;i<size;i++){
   const index=bytes[offset+i],p=palette+index*3;
   const q=i*4;rgba[q]=bytes[p];rgba[q+1]=bytes[p+1];rgba[q+2]=bytes[p+2];rgba[q+3]=name[0]==='{'&&index===255?0:255;
  }
  const texture=new THREE.DataTexture(rgba,width,height,THREE.RGBAFormat);
  texture.encoding=THREE.sRGBEncoding;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.NearestFilter;
  texture.minFilter=name[0]==='{'?THREE.NearestFilter:THREE.LinearFilter;
  texture.generateMipmaps=false;
  texture.needsUpdate=true;
  return texture;
 }
 function lumpsOf(buffer){
  if(buffer.byteLength<124||buffer.byteLength>maxBytes)fail('Choose a GoldSrc BSP up to 32 MiB.');
  const view=new DataView(buffer);
  if(integer(view,0)!==30)fail('This file is not a GoldSrc BSP v30.');
  return Array.from({length:15},(_,i)=>slice(view,integer(view,4+i*8),integer(view,8+i*8)));
 }
 function texturesOf(tex){
  const length=tex.byteLength>=4?integer(tex,0):0;
  if(length<0||length>4096||4+length*4>tex.byteLength)fail('Invalid BSP texture table.');
  return Array.from({length},(_,i)=>{
   const offset=integer(tex,4+i*4);
   return offset>=0?textureInfo(slice(tex,offset,tex.byteLength-offset)):null;
  });
 }
 const bombTargets=files=>files.filter(e=>['func_bomb_target','info_bomb_target'].includes(e.classname));
 function inspect(buffer){
  const lumps=lumpsOf(buffer),files=entities(lumps[0]);
  const world=files.find(e=>e.classname==='worldspawn')||{};
  if(!files.some(e=>e.classname==='info_player_start')||!files.some(e=>e.classname==='info_player_deathmatch'))fail('BSP needs CT and T spawn entities.');
  const targets=bombTargets(files).length;
  if(targets===1)fail('Bomb Defusal needs two bombsite entities.');
  if(!targets&&files.some(e=>/^(hostage_entity|monster_scientist|func_hostage_rescue|info_vip_start|func_vip_safetyzone|func_escapezone)$/.test(e.classname)))fail('Hostage, VIP and Escape objectives are unsupported.');
  const models=[...new Set(files.map(e=>['env_lightning','env_beam'].includes(e.classname)?e.texture:e.model).filter(p=>/\.(mdl|spr)$/i.test(p||'')))];
  const sounds=[...new Set(files.filter(e=>e.classname==='ambient_generic').map(e=>e.message).filter(p=>/\.(wav|mp3|ogg)$/i.test(p||'')))];
  const textures=texturesOf(lumps[2]).filter(Boolean);
  return {mode:targets?'bomb':'elimination',wad:(world.wad||'').split(';').map(p=>p.trim()).filter(Boolean),
   sky:/^[a-z0-9_-]+$/i.test(world.skyname||'')?world.skyname.toLowerCase():'',
   textures:textures.map(t=>t.name.toLowerCase()),
   externalTextures:textures.filter(t=>integer(t.view,24)<=0).map(t=>t.name.toLowerCase()),
   models,sounds};
 }
 // Resolve a unique, immediate, repeatable toggle relay chain. Flatten only
 // this stateless subset to the existing local activation geometry. No generic
 // entity interpreter: delayed, locked, one-shot, fan-out and cyclic chains stay static.
 function doorTargetResolver(e,files){
  const named=new Map();
  for(const f of files){if(f.targetname){if(!named.has(f.targetname))named.set(f.targetname,[]);named.get(f.targetname).push(f);}}
  if((named.get(e.targetname)||[]).some(f=>f!==e))return ()=>false;
  return source=>{
   let target=source.target;const seen=new Set();
   for(let depth=0;target&&depth<=8;depth++){
    if(target===e.targetname)return true;
    if(seen.has(target)||depth===8)return false;
    seen.add(target);const matches=named.get(target)||[];
    if(matches.length!==1)return false;
    const r=matches[0];
    if(r.classname!=='trigger_relay'||r.master||r.killtarget||r.model||Number(r.spawnflags||0)!==0||Number(r.delay||0)!==0||Number(r.triggerstate)!==2)return false;
    target=r.target;
   }
   return false;
  };
 }
 function doorTriggers(e,files,bounds,validateNode){
  if(!e.targetname||e.master||e.target||e.killtarget||Number(e.spawnflags||0)!==0||Number(e.delay||0)!==0)return [];
  const reaches=doorTargetResolver(e,files);
  return files.filter(t=>t.classname==='trigger_multiple'&&/^\*\d+$/.test(t.model||'')&&!t.targetname&&!t.master&&!t.killtarget&&Number(t.spawnflags||0)===0&&Number(t.delay||0)===0&&Number(t.wait??.2)>=0&&reaches(t)).map(t=>bounds(t)).filter(b=>{if(b.hull1<0)return false;validateNode(b.hull1);return true;});
 }
 function doorButtons(e,files,collision){
  if(e.classname!=='func_door'||!e.targetname||e.master||e.target||e.killtarget||Number(e.spawnflags||0)!==0||Number(e.delay||0)!==0||!(Number(e.wait??3)>0||Number(e.wait)===-1))return [];
  const reaches=doorTargetResolver(e,files);
  return files.filter(t=>t.classname==='func_button'&&!t.targetname&&!t.master&&!t.killtarget&&Number(t.spawnflags||0)===1&&Number(t.health||0)===0&&Number(t.delay||0)===0&&Number(t.wait??1)>=0&&reaches(t)).map(t=>collision.get(t)).filter(Boolean);
 }
 function rotatingDoor(e,entry){
  if(e.classname!=='func_door_rotating'||!entry||!e.origin||e.targetname||e.master||e.target||e.killtarget||Number(e.spawnflags||0)!==0||Number(e.delay||0)!==0)return null;
  const origin=e.origin.trim().split(/\s+/).map(Number),angles=(e.angles||'0 0 0').trim().split(/\s+/).map(Number);
  const distance=Number(e.distance??90),speed=Number(e.speed??100),wait=Number(e.wait??3);
  if(origin.length!==3||!origin.every(Number.isFinite)||angles.length!==3||angles.some(v=>v!==0)||Number(e.angle||0)!==0||!Number.isFinite(distance)||distance<=0||distance>90||!Number.isFinite(speed)||speed<=0||speed>360||!Number.isFinite(wait)||wait< -1||entry.hull1<0)return null;
  // Require hinge near the leaf bounds, reject ambiguous model origins.
  if(entry.mins.some((v,i)=>i<2&&(v>8||entry.maxs[i]<-8)))return null;
  if(Math.hypot(...[0,1].map(i=>Math.max(Math.abs(entry.mins[i]),Math.abs(entry.maxs[i]))))>256)return null;
  return {...entry,rotating:true,twoWay:true,distance,speed,wait,targetname:null,triggers:[]};
 }
 function breakableHealth(e){
  const hp=Number(e.health);return e.classname==='func_breakable'&&Number.isFinite(hp)&&hp>0&&hp<=100000&&Number(e.spawnflags||0)===0&&!e.targetname&&!e.target&&!e.master&&!e.killtarget&&Number(e.explodemagnitude||0)===0&&Number.isInteger(Number(e.material||0))&&Number(e.material||0)>=0&&Number(e.material||0)<=8&&Number(e.material||0)!==7&&Number(e.delay||0)===0?hp:0;
 }
 function parse(buffer,wadBuffers=[]){
  const lumps=lumpsOf(buffer);
  const [entity,planes,tex,verts,,nodes,texinfo,faces,lighting,clipnodes,leaves,,edges,surfedges,models]=lumps;
  const files=entities(entity),external=wadDirectory(wadBuffers);
  const model=i=>slice(models,i*64,64);
  const world=model(0),head=integer(world,40),crouchHead=integer(world,48);
  const T={c:1,s:0,k:.02};
  const planeBuffer=new Float32Array(planes.byteLength/20*4);
  for(let i=0;i<planeBuffer.length/4;i++){
   const values=vec(planes,i*20);values.push(real(planes,i*20+12));
   if(!values.every(Number.isFinite))fail('Invalid BSP plane.');
   planeBuffer.set(values,i*4);
  }
  const clip=BSP.loadClipData(planeBuffer.buffer,clipnodes.buffer.slice(clipnodes.byteOffset,clipnodes.byteOffset+clipnodes.byteLength));
  const visited=new Uint8Array(clip.pn.length);
  function validateNode(node,depth=0){
   if(node<0)return;
   if(depth>256||node>=visited.length||visited[node]===1||clip.pn[node]<0||clip.pn[node]>=planeBuffer.length/4)fail('Invalid BSP collision tree.');
   if(visited[node]===2)return;
   visited[node]=1;
   validateNode(clip.c0[node],depth+1);validateNode(clip.c1[node],depth+1);
   visited[node]=2;
  }
  if(head<0)fail('BSP has no standing collision hull.');
  validateNode(head);validateNode(crouchHead);
  const point=e=>{
   const parts=(e.origin||'').trim().split(/\s+/).map(Number);
   return parts.length===3&&parts.every(Number.isFinite)?parts:null;
  };
  const spawnTeams={
   CT:files.filter(e=>e.classname==='info_player_start').map(point).filter(Boolean),
   T:files.filter(e=>e.classname==='info_player_deathmatch').map(point).filter(Boolean)
  };
  if(!spawnTeams.CT.length||!spawnTeams.T.length)fail('BSP needs CT and T spawn entities.');
  function bounds(e){
   const origin=point(e)||[0,0,0];
   if(/^\*\d+$/.test(e.model||'')){
    const brush=model(Number(e.model.slice(1)));
    const mins=vec(brush,0),maxs=vec(brush,12);
    if(!mins.concat(maxs).every(Number.isFinite))fail('Invalid brush bounds.');
    return {origin,mins,maxs,hull1:integer(brush,40)};
   }
   return {origin,mins:[-96,-96,-48],maxs:[96,96,80]};
  }
  const targets=bombTargets(files);
  if(targets.length===1)fail('Bomb Defusal needs two bombsite entities.');
  const sites=targets.map(e=>{
   const hint=[e.targetname,e.target].filter(Boolean).map(s=>s.match(/(?:site|target|^|[_ -])([ab])(?:$|[_ -])/i)).find(Boolean);
   const zone=bounds(e);if(zone.hull1>=0)validateNode(zone.hull1);
   return {...zone,id:hint?.[1].toUpperCase(),triggerClip:zone.hull1>=0?clip:null};
  });
  for(const id of ['A','B']){
   if(!sites.length||sites.some(s=>s.id===id))continue;
   const candidate=sites.find(s=>!s.id)||sites.find(s=>sites.filter(other=>other.id===s.id).length>1);
   candidate.id=id;
  }
  sites.forEach(s=>{s.id||='B'});
  const solids=files.filter(e=>/^\*\d+$/.test(e.model||'')&&/^(func_(wall|breakable|door|door_rotating|illusionary|water|button))$/.test(e.classname));
  const brushCollision=new Map(solids.filter(e=>!['func_illusionary','func_water'].includes(e.classname)).map(e=>[e,bounds(e)]).filter(([,b])=>b.hull1>=0));
  const breakables=[...brushCollision.values()];
  breakables.forEach(b=>validateNode(b.hull1));
  // Hull 0 uses the BSP render nodes and leaf contents, not expanded player clipnodes.
  // Optional: maps with invalid point trees keep their existing non-penetrable behavior.
  let pointClip=null,pointHead=integer(world,36);
  if(nodes.byteLength%24===0&&leaves.byteLength%28===0&&pointHead>=0&&pointHead<nodes.byteLength/24){
   const count=nodes.byteLength/24,pn=new Int32Array(count),c0=new Int32Array(count),c1=new Int32Array(count);let valid=true;
   const child=n=>{if(n>=0){if(n>=count)valid=false;return n;}const i=-1-n;if(i>=leaves.byteLength/28){valid=false;return -2;}const content=integer(leaves,i*28);if(content>=0)valid=false;return content;};
   for(let i=0;i<count;i++){pn[i]=integer(nodes,i*24);if(pn[i]<0||pn[i]>=planeBuffer.length/4)valid=false;c0[i]=child(nodes.getInt16(i*24+4,true));c1[i]=child(nodes.getInt16(i*24+6,true));}
   if(valid){const state=new Uint8Array(count);function check(n,depth=0){if(n<0)return true;if(depth>256||state[n]===1)return false;if(state[n]===2)return true;state[n]=1;const ok=check(c0[n],depth+1)&&check(c1[n],depth+1);state[n]=2;return ok;}if(check(pointHead))pointClip={pf:planeBuffer,pn,c0,c1};}
  }
  const col={clip,T,pointClip,pointHead,head,standHead:head,crouchHead,spawnTeams,spawns:[...spawnTeams.CT,...spawnTeams.T],breakables,
   ladders:files.filter(e=>e.classname==='func_ladder').map(bounds),water:files.filter(e=>e.classname==='func_water').map(bounds),
   buyzones:files.filter(e=>e.classname==='func_buyzone').map(e=>({...bounds(e),team:e.team==='1'?'T':e.team==='2'?'CT':null})),local:true};
  const textures=texturesOf(tex);
  if(planes.byteLength%20||clipnodes.byteLength%8||models.byteLength%64||verts.byteLength%12||faces.byteLength%20||texinfo.byteLength%40)fail('Invalid BSP lump size.');
  const atlas=BSPVisuals.lightmaps(lighting);
  const batches=new Map(), doors=[],destructibles=[],warnings=[];

  let triangles=0;
  function addFaces(brush,origin,door=-1,opacity=1,worldSurface=false,destructible=-1){
   const first=integer(brush,56),count=integer(brush,60);
   if(first<0||count<0||(first+count)*20>faces.byteLength)fail('Invalid BSP surface range.');
   for(let f=first;f<first+count;f++){
    const face=f*20,n=faces.getInt16(face+8,true),edgeStart=integer(faces,face+4),j=faces.getInt16(face+10,true)*40;
    const index=integer(texinfo,j+32),info=textures[index],name=info?.name.toLowerCase()||'missing';
    if(n<3||name.startsWith('sky')||/^(clip|origin|aaatrigger|nodraw)$/.test(name))continue;
    triangles+=n-2;
    if(n>128||triangles>220000)fail('BSP geometry exceeds the browser import limit.');
    const u=vec(texinfo,j),v=vec(texinfo,j+16),ud=real(texinfo,j+12),vd=real(texinfo,j+28);
    const poly=[];
    for(let k=0;k<n;k++){
     const edge=integer(surfedges,(edgeStart+k)*4);
     poly.push(vec(verts,edges.getUint16(Math.abs(edge)*4+(edge<0?2:0),true)*12));
    }
    const uv=poly.map(p=>[p[0]*u[0]+p[1]*u[1]+p[2]*u[2]+ud,p[0]*v[0]+p[1]*v[1]+p[2]*v[2]+vd]);
    const light=integer(texinfo,j+36)&1?null:atlas.add(uv,integer(faces,face+16),[0,1,2,3].map(i=>faces.getUint8(face+12+i)));
    const key=[index,light?.page??-1,door,opacity,worldSurface?1:0,destructible].join(':');
    if(!batches.has(key))batches.set(key,{index,name,info,positions:[],uvs:[],uv2:[],page:light?.page,door,opacity,worldSurface,destructible});
    const {positions,uvs,uv2}=batches.get(key);
    for(let k=1;k<n-1;k++)for(const n of [0,k,k+1]){
     const p=poly[n],[s,t]=uv[n];
     positions.push((p[0]+origin[0])*T.k,(p[2]+origin[2])*T.k,(p[1]+origin[1])*T.k);
     uvs.push(s/(info?.width||64),t/(info?.height||64));
     if(light)uv2.push(...light.uv(s,t));
    }
   }
  }
  addFaces(world,[0,0,0],-1,1,true);
  for(const e of solids){
   const opacity=['1','2','4','5'].includes(e.rendermode)?Math.max(.04,Math.min(1,Number(e.renderamt)/255||1)):1;
   let door=-1;
   const triggers=e.classname==='func_door'?doorTriggers(e,files,bounds,validateNode):[];
   const buttons=doorButtons(e,files,brushCollision);
   if(e.classname==='func_door'&&(!e.targetname||triggers.length||buttons.length)){
    const d=bounds(e),angle=Number(e.angle)||0,radians=angle*Math.PI/180;
    const dir=angle===-1?[0,0,1]:angle===-2?[0,0,-1]:[Math.cos(radians),Math.sin(radians),0];
    d.movedir_h=dir;d.movedir_g=[dir[0],dir[2],dir[1]];
    d.distance=Math.max(1,dir.reduce((n,x,i)=>n+Math.abs(x)*(d.maxs[i]-d.mins[i]-2),0)-(Number(e.lip)||8));
    d.speed=Math.max(10,Math.min(700,Number(e.speed)||100));
    d.wait=e.wait!=null?Number(e.wait)||0:3;
    const entry=brushCollision.get(e);
    if(entry){door=doors.length;d.targetname=e.targetname||null;d.triggers=triggers;d.buttons=buttons;doors.push({d,entry,entity:e});const motion={dir:[...d.movedir_h],distance:d.distance};if(triggers.length||buttons.length)entry.triggerDoor={...motion,triggers,buttons,wait:d.wait};else entry.touchDoor=motion;}
   }
   if(e.classname==='func_door_rotating'){
    const entry=brushCollision.get(e),d=rotatingDoor(e,entry);
    if(d){door=doors.length;doors.push({d,entry,entity:e});entry.yaw=0;entry.rotatingDoor={distance:d.distance,twoWay:d.twoWay};}
   }
   let destructible=-1;const hp=breakableHealth(e);
   if(hp){const entry=brushCollision.get(e);if(entry&&!entry.destructible){entry.destructible=true;destructible=destructibles.length;destructibles.push({entry,hp,material:Number(e.material||0)});}}
   addFaces(model(Number(e.model.slice(1))),point(e)||[0,0,0],door,opacity,false,destructible);
  }
  if(files.some(e=>e.classname==='func_breakable')&&destructibles.length<files.filter(e=>e.classname==='func_breakable').length)warnings.push('Unsupported breakable entities remain static.');
  if(files.some(e=>e.classname==='func_door_rotating'&&!doors.some(v=>v.entity===e)))warnings.push('Unsupported rotating doors remain static.');
  if(files.some(e=>e.classname==='func_door'&&e.targetname&&!doors.some(v=>v.entity===e)))warnings.push('Unsupported triggered sliding doors remain static.');
  if(!triangles)fail('No renderable geometry found.');
  const missing=new Set();
  const meshes=[];
  let pixels=0;
  const textureCache=new Map(),lightmaps=atlas.finish();
  if(atlas.limited)warnings.push('Some surfaces exceed the static lightmap budget.');
  if(atlas.nonStatic)warnings.push('Animated BSP lightstyles are displayed as static lightmaps.');
  for(const {index,name,info,positions,uvs,uv2,page,door,opacity,worldSurface,destructible} of batches.values()){
   if(!textureCache.has(index)){
    const wad=external.get(name),embedded=info&&integer(info.view,24)>0;
    const candidate=embedded?info:wad?textureInfo(wad):null;
    pixels+=(candidate?.width||0)*(candidate?.height||0);
    if(pixels>12000000)fail('BSP texture budget exceeded.');
    textureCache.set(index,decodeTexture(candidate,name));
   }
   const map=textureCache.get(index);
   if(!map)missing.add(name);
   meshes.push({name,positions:new Float32Array(positions),uvs:new Float32Array(uvs),
    uv2:uv2.length?new Float32Array(uv2):null,map,lightmap:lightmaps[page],door,opacity,worldSurface,destructible});
  }
  return {col,sites,mode:sites.length?'bomb':'elimination',meshes,doors,destructibles,warnings,files,missing:[...missing],
   spawn:{ct:BSP.toGame(T,spawnTeams.CT[0]),t:BSP.toGame(T,spawnTeams.T[0])}};
 }
 function mount(data,scene){
  const groups=data.doors.map(({d,entry})=>{
   const group=new THREE.Group();scene.add(group);BSPDoors.addLocal(d,group,entry,data.col);return group;
  });
  BSPBreakables.mount(data,scene.userData.rayMeshes);
  data.waterMaps=new Set();
  for(const batch of data.meshes){
   const mesh=BSPVisuals.mesh(batch),water=/^[!*]/.test(batch.name);
   (groups[batch.door]||scene).add(mesh);
   if(water){if(batch.map)data.waterMaps.add(batch.map)}
   else scene.userData.rayMeshes.push(mesh);
   if(batch.destructible>=0)BSPBreakables.register(batch.destructible,mesh,!water);
  }
  if(data.sky)BSPVisuals.mountSky(data.sky,scene);
  LocalMapMedia.mount(data,scene);
 }
 async function read(file,wads=[]){
  if(file.size>maxBytes||wads.some(w=>w.size>maxBytes)||wads.reduce((n,w)=>n+w.size,0)>2*maxBytes)fail('BSP/WAD exceeds the import limit.');
  return parse(await file.arrayBuffer(),await Promise.all(wads.map(w=>w.arrayBuffer())));
 }
 function inSite(zone,h){
  if(!h.every((n,i)=>n>=zone.mins[i]+zone.origin[i]-(i===2?35:0)&&n<=zone.maxs[i]+zone.origin[i]+(i===2?35:0)))return false;
  // Test player-hull overlap with the actual trigger brush, not just its AABB.
  if(zone.triggerClip){const q=h.map((n,i)=>n-zone.origin[i]);return BSP.traceAll({clip:zone.triggerClip,head:zone.hull1},q,q).startsolid}
  return true;
 }
 return {read,mount,parse,inspect,inSite,doorTriggers,doorButtons,rotatingDoor,breakableHealth,validateWad:buffer=>wadDirectory([buffer]),wadNames:buffer=>wadDirectory([buffer]).keys()};
})();
