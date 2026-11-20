/* GoldSrc sprite pack: optional same-origin bundled pack or device-local override. */
const GoldSrcSprites=(()=>{
 const files=new Map(),banks=new Map(),canvases=new Map(),icons=new Map(),pool=[],live=[];
 const combat=/^(fexplo|eexplo|muzzleflash[1-4]|fast_wallpuff1|pistol_smoke1|rifle_smoke1|xspark1|dead_blood|wsplash3|rain|snow)$/;
 let mappings=new Map(),weaponMaps=new Map(),pixels=0,scopeMask="",gearState="";let restore=Promise.resolve(),source="none";
 const PACK_URL="assets/goldsrc/sprites.zip?v=16.3-db6e06de",CACHE_KEY="sprite-bundle-16.3-db6e06de",LOCAL_KEY="sprite-pack-v1",MAX_ZIP=25*1024*1024;
 const base=name=>name.replaceAll('\\','/').toLowerCase().split('/').at(-1);
 const file=name=>files.get(base(name));
 function bank(name){
  if(!combat.test(name)&&!(/^(640hud\d+|sniper_scope|ch_sniper2?|radar640|ic4|iplayerc4|defuser|radio)$/.test(name)))return null;
  if(banks.has(name))return banks.get(name);
  const input=file(name+'.spr');if(!input)return null;
  try{
   const result=LocalMapMedia.decodeSprite(input.buffer);
   if(pixels+result.pixels>4*1024*1024){result.frames.forEach(f=>f.map.dispose());banks.set(name,null);return null}
   pixels+=result.pixels;banks.set(name,result);return result;
  }catch(e){console.warn('Local sprite skipped',name,e.message);banks.set(name,null);return null}
 }
 function mappingsOf(input){
  const result=new Map();
  if(input)for(const line of new TextDecoder().decode(input.buffer).split(/\r?\n/)){
   const m=/^\s*(\w+)\s+640\s+(\w+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(line);
   if(m)result.set(m[1],[m[2],...m.slice(3).map(Number)]);
  }
  return result;
 }
 function art(region){
  if(!region)return null;
  const key=region.join(':');if(canvases.has(key))return canvases.get(key);
  const [name,x=0,y=0]=region,b=bank(name),f=b?.frames[0];
  if(!f)return null;
  const w=region[3]??f.w,h=region[4]??f.h;
  if(!w||!h||x+w>f.w||y+h>f.h)return null;
  const rgb=f.map.image.data,rgba=new Uint8ClampedArray(w*h*4);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
   const src=((j+y)*f.w+i+x)*4,dst=(j*w+i)*4;
   const alpha=b.mode===1?Math.max(rgb[src],rgb[src+1],rgb[src+2]):rgb[src+3];
   for(let c=0;c<3;c++)rgba[dst+c]=b.mode===1&&alpha?rgb[src+c]*255/alpha:rgb[src+c];
   rgba[dst+3]=alpha;
  }
  const c=document.createElement('canvas');c.width=w;c.height=h;
  c.getContext('2d').putImageData(new ImageData(rgba,w,h),0,0);canvases.set(key,c);return c;
 }
 function weapon(id,key){
  if(!files.size)return null;
  const names={mp5:'mp5navy',glock:'glock18'},name=names[id]||id;
  if(!weaponMaps.has(name))weaponMaps.set(name,mappingsOf(file('weapon_'+name+'.txt')));
  return weaponMaps.get(name).get(key);
 }
 function url(region){
  if(!region)return '';
  const key=region.join(':');if(!icons.has(key))icons.set(key,art(region)?.toDataURL()||'');return icons.get(key);
 }
 function icon(id,region){
  const el=document.getElementById(id),image=url(region);
  if(!el)return;
  el.classList.toggle('has-sprite',!!image);
  const value=image?'url('+image+')':'';
  if(el.style.getPropertyValue('--goldsrc-icon')!==value)el.style.setProperty('--goldsrc-icon',value);
 }
 function hud(id,helmet,clad){
  const shield=helmet?'suithelmet_':'suit_';
  icon('hp',mappings.get('cross'));icon('armor',mappings.get(shield+(clad?'full':'empty')));
  icon('roundclock',mappings.get('stopwatch'));icon('economy',mappings.get('dollar'));icon('ammo',id==='knife'?null:weapon(id,'ammo'));
 }
 function equipment(grenades){
  const gear=document.getElementById('gear'),state=JSON.stringify(grenades);
  if(!gear||state===gearState)return;
  gearState=state;
  gear.replaceChildren();
  for(const [key,id,label] of [['he','hegrenade','HE'],['flash','flashbang','FLASH'],['smoke','smokegrenade','SMOKE']]){
   if(gear.childNodes.length)gear.append(' · ');
   const src=url(weapon(id,'weapon'));
   if(src){const img=document.createElement('img');img.src=src;img.alt=label;img.className='goldsrc-slot';gear.append(img,String(grenades[key]))}
   else gear.append(label+' '+grenades[key]);
  }
 }
 function scope(id){
  const scope=document.getElementById('scopeOverlay');
  icon('scopeOverlay',weapon(id,'zoom')||['sniper_scope']);
  if(!scope)return;
  scope.classList.toggle('has-arc',!!scopeMask);
  scope.style.setProperty('--goldsrc-arc',scopeMask?'url('+scopeMask+')':'');
 }
 function buildScopeMask(){
  const names=['scope_arc_nw','scope_arc_ne','scope_arc_sw','scope_arc'];
  if(!names.every(name=>file(name+'.tga')))return '';
  const c=document.createElement('canvas');c.width=c.height=512;
  const ctx=c.getContext('2d');
  try{
   names.forEach((name,i)=>{
    const texture=LocalMapMedia.decodeTga(file(name+'.tga').buffer),src=texture.image;
    texture.dispose();
    if(src.width!==256||src.height!==256)throw Error('Unexpected scope arc size');
    ctx.putImageData(new ImageData(new Uint8ClampedArray(src.data),256,256),i%2*256,Math.floor(i/2)*256);
   });
   return c.toDataURL();
  }catch(_){return ''}
 }
 function weatherTexture(name){
  const f=art([name]);if(!f)return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=Math.max(f.width,f.height);
  canvas.getContext('2d').drawImage(f,(canvas.width-f.width)/2,(canvas.height-f.height)/2);
  return new THREE.CanvasTexture(canvas);
 }
 function updateBomb(phase,kit,carrying,team='T'){
  icon('bombStatus',phase==='planted'||phase==='dropped'&&team==='T'||carrying?mappings.get('c4'):null);
  icon('kitStatus',kit?mappings.get('defuser')||['defuser']:null);
 }
 function killIcon(id,head){
  const key={mp5:'mp5navy',hegrenade:'grenade'},region=mappings.get(head?'d_headshot':'d_'+(key[id]||id));
  return url(region);
 }
 function radar(ctx){const sprite=art(mappings.get('radar'));if(!sprite)return false;ctx.save();ctx.globalAlpha=.62;ctx.drawImage(sprite,0,0,96,96);ctx.restore();return true}
 function radioTexture(){return bank('radio')?.frames[0]||null}
 function radarBomb(ctx,x,y,carrier=false){const sprite=art(carrier?['iplayerc4']:mappings.get('smallc4')||['ic4']);if(!sprite)return false;ctx.drawImage(sprite,x-6,y-6,12,12);return true}
 function chip(el,id,selected){
  const src=url(weapon(id,selected?'weapon_s':'weapon'));
  if(!src)return;
  const img=document.createElement('img');img.src=src;img.alt='';img.className='goldsrc-slot';el.prepend(img);
 }
 function recycle(e){e.mesh.parent?.remove(e.mesh);e.mesh.material.map=null;pool.push(e.mesh)}
 function play(parent,name,pos,{scale=1,fps=30,life,delay=0,opacity=1}={}){
  if(!parent||!Number.isFinite(fps)||fps<=0||!Number.isFinite(scale)||scale<=0||!Number.isFinite(delay)||delay<0||(life!=null&&(!Number.isFinite(life)||life<=0)))return false;
  const source=bank(name);if(!source)return false;
  if(live.length>=44)recycle(live.shift());
  const mesh=pool.pop()||new THREE.Sprite(new THREE.SpriteMaterial({depthWrite:false,transparent:true}));
  mesh.material.blending=source.mode===1?THREE.AdditiveBlending:THREE.NormalBlending;
  const alpha=source.mode===3?.25:0;
  if(mesh.material.alphaTest!==alpha){mesh.material.alphaTest=alpha;mesh.material.needsUpdate=true}
  mesh.material.opacity=Number.isFinite(opacity)?Math.max(0,Math.min(1,opacity)):1;
  mesh.material.rotation=0;mesh.material.needsUpdate=true;
  mesh.position.copy(pos);mesh.visible=delay===0;
  LocalMapMedia.applyFrame(mesh,source.frames[0],scale);
  parent.add(mesh);live.push({name,mesh,source,age:-delay,frameAge:0,index:0,scale,fps,life,duration:life??source.frames.reduce((sum,f)=>sum+(f.grouped?f.duration:1/fps),0)});
  return true;
 }
 function update(dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  for(let i=live.length-1;i>=0;i--){
   const e=live[i],before=e.age;e.age+=dt;
   if(e.age>=e.duration){recycle(e);live.splice(i,1);continue}
   if(e.age<0)continue;
   e.mesh.visible=true;
   e.frameAge+=e.age-Math.max(0,before);
   const frames=e.source.frames,duration=f=>f.grouped?f.duration:1/e.fps;
   while(e.index<frames.length-1&&e.frameAge>=duration(frames[e.index])){
    e.frameAge-=duration(frames[e.index++]);
    LocalMapMedia.applyFrame(e.mesh,frames[e.index],e.scale);
   }
  }
 }
 function clear(){while(live.length)recycle(live.pop())}
 async function install(archive){
  if(!archive||!Number.isFinite(archive.size)||archive.size<=0||archive.size>MAX_ZIP)throw Error('Invalid sprite ZIP size (25 MiB limit).');
  const reader=MapImporter.openZip(archive),pending=new Map();
  try{
   const entries=await reader.list();let bytes=0;
   for(const e of entries){
    const name=base(e.path);
    if(e.issue||!(/^[a-z0-9_]+\.spr$|^(hud|observer|weapon_[a-z0-9_]+)\.txt$|^scope_arc(?:_n[ew]|_sw)?\.tga$/.test(name)))continue;
    if(e.bytes>2*1024*1024||pending.has(name))continue;
    bytes+=e.bytes;if(bytes>16*1024*1024)throw Error('SPR archive exceeds 16 MiB unpacked.');
    pending.set(name,{path:name,buffer:await reader.read(e)});
   }
   if(![...pending.keys()].some(n=>n.endsWith('.spr')))throw Error('No compatible SPR filenames found.');
  }finally{reader.close()}
  clear();for(const b of banks.values())b?.frames.forEach(f=>f.map.dispose());
  files.clear();banks.clear();canvases.clear();icons.clear();weaponMaps.clear();pixels=0;gearState='';
  for(const [k,v] of pending)files.set(k,v);
  mappings=mappingsOf(file('hud.txt'));scopeMask=buildScopeMask();
  // Observer crosshairs are only used by the spectator layer. A missing crosshairs.spr retains its built-in reticle.
  const observer=mappingsOf(file('observer.txt'));
  if(observer.has('crosshair'))mappings.set('observer_crosshair',observer.get('crosshair'));
  if(typeof running!=='undefined'&&typeof P!=='undefined'){hud(cur(),helmet,armor);scope(cur());if(typeof grenades!=='undefined')equipment(grenades)}
  return [...files.keys()].filter(n=>n.endsWith('.spr')).length;
 }
 // Keep the local override and bundled cache separate. A bad or unavailable pack
 // must not prevent starting a match. The bundled ZIP is fetched only once per tab.
 const input=document.getElementById('goldsrcSpriteFile'),status=document.getElementById('goldsrcSpriteStatus');
 const forget=document.getElementById('goldsrcSpriteRemove');
 function message(text){if(status)status.textContent=text}
 function bounded(p,ms=4000){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Local storage timeout.')),ms)})]).finally(()=>clearTimeout(timer))}
 async function get(key){try{return await bounded(LocalAssetCache.get(key))}catch(_){return null}}
 async function fetchBundle(){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(PACK_URL,{signal:controller.signal,credentials:'same-origin'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const length=Number(response.headers.get('content-length'));
   if(length>MAX_ZIP)throw Error('Bundled sprite ZIP exceeds size limit.');
   // Read in bounded chunks so a missing or incorrect content-length cannot
   // turn an unexpected response into an unbounded allocation.
   if(!response.body?.getReader){const blob=await response.blob();if(blob.size>MAX_ZIP)throw Error('Bundled sprite ZIP exceeds size limit.');return blob}
   const reader=response.body.getReader(),chunks=[];let total=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_ZIP){await reader.cancel();throw Error('Bundled sprite ZIP exceeds size limit.')}chunks.push(value)}}finally{reader.releaseLock()}
   return new Blob(chunks,{type:'application/zip'});
  }finally{clearTimeout(timer)}
 }
 async function activate(archive,kind){const count=await install(archive);source=kind;return count}
 async function builtIn(){
  const cached=await get(CACHE_KEY);
  if(cached){try{const count=await activate(cached,'bundled-cache');message(count+' built-in sprites ready (offline cache).');return true}catch(_){void bounded(LocalAssetCache.remove(CACHE_KEY)).catch(()=>{})}}
  try{
   const archive=await fetchBundle(),count=await activate(archive,'bundled');
   message(count+' built-in sprites ready. No manual import needed.');
   // Storage failure does not deactivate the working pack.
   try{await bounded(LocalAssetCache.put(CACHE_KEY,archive))}catch(_){}
   return true;
  }catch(e){message('Built-in pack unavailable; '+(source==='none'?'using baseline effects.':'current pack remains active.')+' Optional local ZIP can be selected.');return false}
 }
 function locked(work){
  if(input)input.disabled=true;if(forget)forget.disabled=true;
  restore=Promise.resolve().then(work).catch(e=>message('Sprite pack: '+e.message)).finally(()=>{if(input)input.disabled=false;if(forget)forget.disabled=false});
  return restore;
 }
 if(input&&status){
  locked(async()=>{
   message('Loading GoldSrc sprites…');
   const saved=await get(LOCAL_KEY);
   if(saved){try{const count=await activate(saved,'local');message(count+' saved local sprites ready (override).');return}catch(_){/* Try bundled fallback without deleting saved data. */}}
   await builtIn();
  });
  input.addEventListener('change',()=>{
   const archive=input.files[0];if(!archive||input.disabled)return;
   if(archive.size>MAX_ZIP){message('Sprite ZIP exceeds the 25 MiB local pack limit.');input.value='';return;}
   input.value='';message('Reading local sprites…');
   locked(async()=>{
    const count=await activate(archive,'local');
    try{await bounded(LocalAssetCache.put(LOCAL_KEY,archive));message(count+' local sprites saved (override). Start a new match for map effects.')}
    catch(_){message(count+' local sprites active for this tab only (storage unavailable).')}
   });
  });
  forget?.addEventListener('click',()=>{
   if(input.disabled)return;
   locked(async()=>{
    await bounded(LocalAssetCache.remove(LOCAL_KEY));
    const ok=await builtIn();if(!ok){resetPack();source='none';message('Local override removed. Using baseline effects; bundled pack unavailable.')}
   });
  });
 }
 function resetPack(){
  clear();for(const b of banks.values())b?.frames.forEach(f=>f.map.dispose());
  files.clear();banks.clear();canvases.clear();icons.clear();weaponMaps.clear();mappings.clear();pixels=0;gearState='';scopeMask='';
  if(typeof running!=='undefined'&&typeof P!=='undefined'){hud(cur(),helmet,armor);scope(cur());if(typeof grenades!=='undefined')equipment(grenades)}
 }
 return {ready:()=>restore,file,weatherTexture,play,update,clear,hud,equipment,scope,radar,radioTexture,radarBomb,updateBomb,killIcon,chip,install,debug:()=>({source,files:files.size,pixels,live:live.map(e=>({name:e.name,frames:e.source.frames.length,index:e.index,visible:e.mesh.visible})),pooled:pool.length})};
})();
