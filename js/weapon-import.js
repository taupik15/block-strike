/* BLOCK STRIKE AR11.10.20 WEAPON.1: cosmetic-only model/sound/icon replacement.
 * No new weapon IDs, prices, combat data, or network upload. IndexedDB is local.
 * ZIP extraction reuses the map importer; native GoldSrc MDL v10 parsing reuses MDL.2.
 */
const WeaponImport=(()=>{'use strict';
 const root='assets/weapon-skins/m1887-silver/';
 const BUILTIN=Object.freeze({id:'m3',name:'M1887 Silver',view:root+'v_m3.mdl',held:root+'p_m3.mdl',world:root+'w_m3.mdl',preview:root+'preview.jpg',
  sounds:Object.freeze({'m3-1.wav':root+'m3-1.wav','m3_insertshell.wav':root+'m3_insert.wav','m3_pump.wav':root+'m3_start.wav','m3_draw.wav':root+'m3_draw.wav'})});
 const IDS=['usp','glock18','p228','deagle','elite','fiveseven','mac10','tmp','mp5','ump45','p90','galil','ak47','famas','m4a1','aug','sg552','scout','awp','g3sg1','sg550','m3','xm1014','m249','knife','shield_usp','shield_glock18','shield_p228','shield_deagle','shield_fiveseven','shield_knife','hegrenade','flashbang','smokegrenade','c4'];
 const imageUrls=new Map();let match=null,matchMode=null,matchPack=null,revision=0;
 const MODE_KEY='bs.weaponSource';let mode='mod';try{if(localStorage.getItem(MODE_KEY)==='stock')mode='stock'}catch(_){}
 function setMode(value){if(value!=='stock'&&value!=='mod')return mode;mode=value;try{localStorage.setItem(MODE_KEY,mode)}catch(_){}return mode}
 function resolve(id,map,source,pack){if(source==='stock')return null;const custom=map.get(id);return custom?.kind==='stock'?null:custom||(id==='m3'&&pack===ModPacks.DEFAULT?BUILTIN:null)}
 async function beginMatch(){await library.settled();const before=IDS.map(id=>active(id)),first=!match;match=new Map(library.rows);matchMode=mode;matchPack=library.selected;const changed=IDS.filter((id,i)=>first||before[i]!==active(id));if(changed.length){revision++;for(const id of changed)document.dispatchEvent(new CustomEvent('blockstrike:weapon-skin-change',{detail:{id}}))}}

 const allowed=new Set(IDS);
 const basename=p=>String(p||'').replaceAll('\\','/').split('/').at(-1).toLowerCase();
 const ext=p=>basename(p).split('.').at(-1);
 const library=ModPacks.create({database:'block-strike-weapon-skins',selectionKey:'bs.weaponPack',slots:IDS,defaultName:'Default Weapon Mods',onChange:()=>{for(const url of imageUrls.values())URL.revokeObjectURL(url);imageUrls.clear();document.dispatchEvent(new CustomEvent('blockstrike:weapon-library-change'))}});
 const ready=library.ready;
 function active(id){return resolve(id,match||library.rows,match?matchMode:mode,match?matchPack:library.selected)}
 function installed(id){return resolve(id,library.rows,'mod',library.selected)}
 function status(id){const skin=installed(id);return skin?(skin===BUILTIN?'Included: ':'Imported: ')+skin.name:'Original CS 1.6 model';}
 function fileOf(skin,role){return skin===BUILTIN?skin[role]:skin?.files?.find(f=>f.role===role)||null;}
 async function bufferOf(source){if(!source)return null;
  if(typeof source==='string'){
   const response=await fetch(source);if(!response.ok)throw Error('Asset download failed: '+response.status+' '+source);
   return response.arrayBuffer();
  }
  return source.blob.arrayBuffer();
 }
 // Models with nonstandard labels (like KeenHide M1887) retain their authored
 // keyframes; only the animation names are normalized for the existing action FSM.
 function mapSequences(gltf,id){
  const clips=gltf.animations||[];if(!clips.length)return;
  if(id==='m3'&&clips.some(c=>/^KeenHide-RiasGremory$/i.test(c.name))&&clips.length>=7){
   ['idle','shoot1','shoot2','insert','after_reload','start_reload','draw'].forEach((name,i)=>{clips[i].name=name});return;
  }
  const used=new Set();
  for(const clip of clips){
   const raw=clip.name.toLowerCase().replace(/[_\s-]+/g,'_');let dest='';
   if(/^fire\d*$/.test(raw))dest='shoot'+(raw.match(/\d+$/)?.[0]||'1');
   else if(/^start_?reload/.test(raw))dest='start_reload';
   else if(/^after_?reload/.test(raw))dest='after_reload';
   else if(/^reload_?insert|insert_?shell|^insert$/.test(raw))dest='insert';
   else if(/^draw|deploy/.test(raw))dest='draw';
   else if(/^idle/.test(raw))dest='idle';
   else if(/^shoot/.test(raw))dest=raw;
   if(dest&&!used.has(dest))clip.name=dest;
   used.add(clip.name);
  }
 }
 async function decodeModel(source,id,THREE){
  const bytes=await bufferOf(source);if(!bytes)return null;
  if((typeof source==='string'?ext(source):ext(source.name))==='glb'){
   const blob=new Blob([bytes],{type:'model/gltf-binary'}),url=URL.createObjectURL(blob);
   try{return await new Promise((resolve,reject)=>new THREE.GLTFLoader().load(url,resolve,undefined,reject))}
   finally{URL.revokeObjectURL(url)}
  }
  const parsed=GoldSrcMDL10.parse(bytes,id);const gltf=GoldSrcMDL10.build(parsed,THREE);
  mapSequences(gltf,id);return gltf;
 }
 async function modelFor(id,THREE,role='view'){
  await ready;const skin=active(id),source=fileOf(skin,role);
  if(!source)return null;
  try{return await decodeModel(source,id,THREE)}
  catch(e){console.warn('Weapon skin model fallback',id,role,e);return null}
 }
 function audioRoute(id,name){if(!active(id))return name;return 'skin:'+id+':'+revision+':'+name;}
 // Categorized game sounds need the corresponding cosmetic slot even when
 // triggered by world objects rather than the equipped first-person viewmodel.
 function routeGlobalSound(name,viewAsset=''){
  if(typeof name!=='string'||name.startsWith('skin:'))return name;
  if(/^c4_/i.test(name))return audioRoute('c4',name);
  if(/^hegrenade/i.test(name))return audioRoute('hegrenade',name);
  if(/^flashbang/i.test(name))return audioRoute('flashbang',name);
  if(/^sg_explode|^smokegrenade/i.test(name))return audioRoute('smokegrenade',name);
  if(/^knife_/i.test(name))return audioRoute(viewAsset==='shield_knife'?'shield_knife':'knife',name);
  return name;
 }
 function soundFile(skin,original){
  if(skin===BUILTIN)return skin.sounds[original]||null;
  const entries=skin?.files?.filter(x=>x.role==='sound')||[];
  if(!entries.length)return null;
  const lower=basename(original),exact=entries.find(x=>basename(x.name)===lower);
  if(exact)return exact;
  const keywords= /(?:fire|shot|shoot|\-1\.wav$)/.test(lower)?['fire','shot','shoot','-1.wav']:
   /(?:insert|clipin)/.test(lower)?['insert','clipin','shell']:
   /(?:pump|bolt|start)/.test(lower)?['pump','start','bolt']:
   /(?:draw|deploy)/.test(lower)?['draw','deploy']:
   /(?:reload)/.test(lower)?['reload']:[];
  return entries.find(x=>keywords.some(k=>basename(x.name).includes(k)))||(keywords[0]==='fire'?entries[0]:null);
 }
 async function soundData(key){await ready;
  const m=/^skin:([a-z\d_]+):(\d+):(.+\.wav)$/i.exec(key);if(!m||Number(m[2])!==revision)return null;
  const skin=active(m[1]),source=soundFile(skin,m[3]);return bufferOf(source);
 }
 function imageUrl(id,library=false){const skin=library?installed(id):active(id);if(!skin)return '';
  if(skin===BUILTIN)return skin.preview;
  const entry=fileOf(skin,'preview');if(!entry)return '';
  if(!imageUrls.has(entry.blob))imageUrls.set(entry.blob,URL.createObjectURL(entry.blob));
  return imageUrls.get(entry.blob);
 }
 async function loadFiles(chosen){
  if(!Array.isArray(chosen)||!chosen.length)throw Error('Choose a ZIP or model/audio files');
  if(chosen.length>24)throw Error('Choose at most 24 files');
  if(chosen.some(f=>ext(f.name)==='rar'||ext(f.name)==='7z'))throw Error('RAR/7z cannot be opened by this browser importer. Convert it to ZIP first.');
  if(chosen.length===1&&ext(chosen[0].name)==='zip'){
   const zip=MapImporter.openZip(chosen[0]);let entries=[];
   try{
    entries=await zip.list();if(entries.length>64)throw Error('Weapon ZIP has too many entries (64 maximum)');
    const allowedEntries=entries.filter(e=>/\.(mdl|glb|wav|png|jpg|jpeg)$/i.test(e.path));
    if(allowedEntries.some(e=>e.issue))throw Error(allowedEntries.find(e=>e.issue).issue);
    const out=[];let total=0;
    for(const e of allowedEntries){if(e.bytes>8*1024*1024||total+e.bytes>24*1024*1024)throw Error('Weapon archive exceeds 24 MiB limit');
     const buffer=await zip.read(e);total+=buffer.byteLength;out.push({name:e.path,buffer});}
    return out;
   }finally{zip.close()}
  }
  if(chosen.some(f=>ext(f.name)==='zip'))throw Error('Import one ZIP at a time, or select loose weapon files');
  let total=0;const files=[];
  for(const f of chosen){if(!/\.(mdl|glb|wav|png|jpg|jpeg)$/i.test(f.name))continue;
   total+=f.size;if(f.size>8*1024*1024||total>24*1024*1024)throw Error('Weapon files exceed 24 MiB limit');
   files.push({name:f.name,buffer:await f.arrayBuffer()});}
  return files;
 }
 function classify(name){const s=basename(name);
  if(/^p_.*\.(?:mdl|glb)$/.test(s))return 'held';
  if(/^w_.*\.(?:mdl|glb)$/.test(s))return 'world';
  if(/^v_.*\.(?:mdl|glb)$/.test(s)||/\.glb$/.test(s))return 'view';
  if(/\.wav$/.test(s))return 'sound';
  if(/\.(png|jpe?g)$/.test(s))return 'preview';
  return null;
 }
 function wavValid(bytes){const v=new DataView(bytes);return v.byteLength>=12&&String.fromCharCode(...new Uint8Array(bytes,0,4))==='RIFF'&&String.fromCharCode(...new Uint8Array(bytes,8,4))==='WAVE'}
 function install(id,files,label){return library.exclusive(async pack=>{
  if(!allowed.has(id))throw Error('Unsupported target weapon slot');
  const loaded=await loadFiles(files),result=[];const roles=new Set();
  for(const {name,buffer} of loaded){const role=classify(name);if(!role||buffer.byteLength<12)continue;
   if(role==='view'||role==='held'||role==='world'){
    if(roles.has(role))continue;
    if(ext(name)==='mdl')GoldSrcMDL10.parse(buffer,name);
    else{const v=new DataView(buffer);if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2)throw Error('Invalid GLB model: '+basename(name))}
    roles.add(role);
   }else if(role==='sound'){if(!wavValid(buffer))throw Error('Unsupported WAV: '+basename(name));}
   else if(role==='preview'){if(roles.has('preview'))continue;roles.add('preview');}
   result.push({role,name:basename(name),blob:new Blob([buffer],{type:role==='sound'?'audio/wav':role==='preview'?(ext(name)==='png'?'image/png':'image/jpeg'):'application/octet-stream'})});
  }
  if(!result.length)throw Error('No usable v_/p_/w_.mdl, GLB, WAV or image files found');
  const prior=library.rows.get(id),hasModel=result.some(f=>['view','held','world'].includes(f.role));
  const inherited=!hasModel&&prior?.kind==='custom'?(prior.files||[]).filter(f=>!result.some(n=>n.role===f.role&&(n.role!=='sound'||basename(n.name)===basename(f.name)))):[];
  const skin={id,kind:'custom',name:String(label||(!hasModel&&prior?.name)||files[0].name||'Custom weapon').slice(0,70),files:[...inherited,...result]};
  await library.save(pack,[skin]);return skin;
 })}
 function reset(id,stock=false){return library.exclusive(async pack=>{if(!allowed.has(id))throw Error('Unknown weapon slot');if(stock)await library.save(pack,[{id,kind:'stock',name:'Original CS 1.6'}]);else await library.save(pack,[],[id])})}
 return Object.freeze({IDS,ready,library,active,installed,status,setMode,beginMatch,get mode(){return mode},get revision(){return revision},modelFor,audioRoute,routeGlobalSound,soundData,imageUrl,install,reset,BUILTIN});
})();
