// Original playable core (will be gradually moved into modules)\n
const $=id=>document.getElementById(id), rnd=Math.random, isT=('ontouchstart' in window)||navigator.maxTouchPoints>0;
if(!isT)document.body.classList.add('pc');
const W={
 usp:{n:'USP',dmg:34,rate:.17,mag:12,res:100,rl:2.2,rec:.012,auto:false,sp:.006,len:.34,col:0x41464c,price:500,slot:'pistol',sound:'usp1.wav'},
 glock18:{n:'GLOCK 18',dmg:25,rate:.15,mag:20,res:120,rl:2.2,rec:.014,auto:false,sp:.009,len:.34,col:0x33383d,price:400,slot:'pistol',sound:'glock18-1.wav'},
 p228:{n:'P228',dmg:32,rate:.17,mag:13,res:52,rl:2.2,rec:.014,auto:false,sp:.008,len:.34,col:0x5b6065,price:600,slot:'pistol',sound:'p228-1.wav'},
 deagle:{n:'DESERT EAGLE',dmg:54,rate:.24,mag:7,res:35,rl:2.2,rec:.028,auto:false,sp:.014,len:.38,col:0x77716a,price:650,slot:'pistol',sound:'deagle-1.wav'},
 elite:{n:'DUAL ELITES',dmg:25,rate:.13,mag:30,res:120,rl:3.8,rec:.018,auto:false,sp:.014,len:.38,col:0x8a7656,price:800,slot:'pistol',sound:'elite_fire.wav',team:'T'},
 fiveseven:{n:'FIVE-SEVEN',dmg:27,rate:.15,mag:20,res:100,rl:2.2,rec:.012,auto:false,sp:.007,len:.36,col:0x6d747b,price:750,slot:'pistol',sound:'fiveseven-1.wav',team:'CT'},
 mac10:{n:'MAC-10',dmg:29,rate:.075,mag:30,res:100,rl:2.6,rec:.02,auto:true,sp:.03,len:.48,col:0x34383a,price:1400,slot:'primary',sound:'mac10-1.wav',team:'T'},
 tmp:{n:'TMP',dmg:20,rate:.07,mag:30,res:120,rl:2.1,rec:.012,auto:true,sp:.018,len:.5,col:0x41484d,price:1250,slot:'primary',sound:'tmp-1.wav',team:'CT'},
 mp5:{n:'MP5 NAVY',dmg:26,rate:.075,mag:30,res:120,rl:2.1,rec:.012,auto:true,sp:.014,len:.55,col:0x3a4248,price:1500,slot:'primary',sound:'mp5-1.wav'},
 ump45:{n:'UMP-45',dmg:30,rate:.09,mag:25,res:100,rl:2.3,rec:.016,auto:true,sp:.016,len:.58,col:0x454b4f,price:1700,slot:'primary',sound:'ump45-1.wav'},
 p90:{n:'P90',dmg:21,rate:.067,mag:50,res:100,rl:3.0,rec:.013,auto:true,sp:.018,len:.62,col:0x48515a,price:2350,slot:'primary',sound:'p90-1.wav'},
 galil:{n:'GALIL',dmg:30,rate:.10,mag:35,res:90,rl:2.45,rec:.014,auto:true,sp:.012,len:.78,col:0x4b5140,price:2000,slot:'primary',sound:'galil-1.wav',team:'T'},
 ak47:{n:'AK-47',dmg:36,rate:.10,mag:30,res:90,rl:2.45,rec:.018,auto:true,sp:.014,len:.82,col:0x4b4839,price:2500,slot:'primary',sound:'ak47-1.wav',team:'T'},
 famas:{n:'FAMAS',dmg:30,rate:.09,mag:25,res:90,rl:3.3,rec:.014,auto:true,sp:.012,len:.78,col:0x42483f,price:2250,slot:'primary',sound:'famas-1.wav',team:'CT'},
 m4a1:{n:'M4A1',dmg:33,rate:.09,mag:30,res:90,rl:2.35,rec:.012,auto:true,sp:.009,len:.84,col:0x3c463c,price:3100,slot:'primary',sound:'m4a1-1.wav',team:'CT'},
 aug:{n:'AUG',dmg:32,rate:.09,mag:30,res:90,rl:3.3,rec:.012,auto:true,sp:.009,len:.88,col:0x4d5547,price:3500,slot:'primary',sound:'aug-1.wav',team:'CT'},
 sg552:{n:'SG-552',dmg:33,rate:.09,mag:30,res:90,rl:2.8,rec:.014,auto:true,sp:.011,len:.86,col:0x494e40,price:3500,slot:'primary',sound:'sg552-1.wav',team:'T'},
 scout:{n:'SCOUT',dmg:75,rate:.9,mag:10,res:90,rl:2.0,rec:.045,auto:false,sp:.001,len:1.0,col:0x655d4d,price:2750,slot:'primary',sound:'scout_fire-1.wav'},
 awp:{n:'AWP',dmg:115,rate:1.45,mag:10,res:30,rl:2.5,rec:.06,auto:false,sp:0,len:1.12,col:0x58604d,price:4750,slot:'primary',sound:'awp1.wav'},
 g3sg1:{n:'G3SG1',dmg:80,rate:.25,mag:20,res:90,rl:3.5,rec:.035,auto:true,sp:.012,len:1.0,col:0x4b4c43,price:5000,slot:'primary',sound:'g3sg1-1.wav',team:'T'},
 sg550:{n:'SG-550',dmg:70,rate:.25,mag:30,res:90,rl:3.5,rec:.032,auto:true,sp:.01,len:1.0,col:0x4a5047,price:4200,slot:'primary',sound:'sg550-1.wav',team:'CT'},
 m3:{n:'M3',dmg:24,rate:.9,mag:8,res:32,rl:2.3,rec:.06,auto:false,sp:.075,len:.8,col:0x5b5144,price:1700,slot:'primary',sound:'m3-1.wav'},
 xm1014:{n:'XM1014',dmg:20,rate:.25,mag:7,res:32,rl:2.8,rec:.05,auto:true,sp:.07,len:.82,col:0x514b40,price:3000,slot:'primary',sound:'xm1014-1.wav'},
 m249:{n:'M249',dmg:32,rate:.08,mag:100,res:200,rl:4.8,rec:.022,auto:true,sp:.02,len:1.0,col:0x4c5045,price:5750,slot:'primary',sound:'m249-1.wav'},
 knife:{n:'KNIFE',dmg:60,rate:.5,mag:0,res:0,rl:0,rec:0,auto:false,sp:0,len:.4,col:0xcccccc,price:0,slot:'melee',sound:'knife_slash1.wav'}
};
for(const [id,spec] of Object.entries(Combat12.TABLE))if(W[id]){W[id].dmg=spec.damage;const t=Combat12.timing[id];if(t){W[id].rate=t.rate;W[id].rl=t.reload}}
W.shield={n:'TACTICAL SHIELD',dmg:0,rate:.2,mag:0,res:0,rl:2.1,rec:.013,auto:false,sp:.008,len:.65,col:0x56646e,price:2200,slot:'primary',sound:'usp1.wav',team:'CT'};
let inventory=['usp','knife'],wi=0,playerTeam='CT',money=800,armor=0,helmet=false,defuseKit=false,nightVision=false,grenades={he:0,flash:0,smoke:0},selectedGrenade='he',buyTime=15,roundTime=120;
const weaponModels={},weaponModelLoads={},weaponInstances={};let pendingWeaponSelection=0;
let viewScene,viewCamera;
const CTN=['gsg9','gign','sas','urban'], TN=['arctic','guerilla','leet','terror'], CTC={}, TC={};
let ctState=0, ctWait=null;
// AR.11.10.3: RAF-aligned FPS ceiling. No extra timer or background loop.
const FrameLimiter=(()=>{
 const KEY='bs.fpsCap',allowed=[30,45,60];
 const mobile=(()=>{try{return matchMedia('(pointer: coarse)').matches}catch(_){return false}})();
 const recommended=mobile?30:60;
 const normal=value=>allowed.includes(Number(value))?Number(value):recommended;
 let fps=recommended,due=0;
 try{const saved=localStorage.getItem(KEY);if(saved!==null)fps=normal(saved)}catch(_){}
 const reset=()=>{due=0};
 function allow(t){
  if(!Number.isFinite(t))return true;
  const interval=1000/fps;
  if(due&&t+.65<due)return false;
  // Anchor to the RAF clock, rather than setTimeout, to avoid timer throttling,
  // drift and the 45 Hz / 60 Hz panel cadence mismatch.
  if(due&&t-due<interval*2)due+=interval;
  else due=t+interval;
  return true;
 }
 function set(value){fps=normal(value);reset();try{localStorage.setItem(KEY,String(fps))}catch(_){}return fps}
 return Object.freeze({allow,reset,set,get fps(){return fps},get recommended(){return recommended},get mobile(){return mobile}});
})();
window.BlockStrikeFPS=FrameLimiter;

function storedQuality(){
 const fallback=FrameLimiter.mobile?0:1;
 try{const raw=localStorage.getItem('bs.graphicsQuality');if(raw!==null&&['0','1','2'].includes(raw))return Number(raw)}catch(_){}
 return fallback;
}
let Q=storedQuality(),SENS=.0045,R,S,cam,sun,vm,flash,running=false,over=false,t0=0,reloading=0,cool=0,kick=0,fh=false,fl=false,jmp=false,jx=0,jy=0,swapT=0,hudT=0,dmgA=0,hitT=0,msgT=0,roundWait=0,round=0,kills=0;
const K={w:0,a:0,s:0,d:0},obs=[],obsM=[],bots=[],tr=[],pt=[],A={};
const ammoPool={};let freezeLeft=0;
function playerAmmo(id,mag,res){A[id]=Economy45.state(ammoPool,id,mag,res);return A[id]}
function resetPlayerAmmo(){for(const key of Object.keys(ammoPool))delete ammoPool[key];for(const [id,w] of Object.entries(W))playerAmmo(id,w.mag);const pistol=playerTeam==='CT'?'usp':'glock18';Economy45.grant(ammoPool,pistol,W[pistol].mag*2)}
function takePlayerReserve(id){return Economy45.take(ammoPool,id,inventory.filter(k=>k!==id))}
const P={pos:new THREE.Vector3(0,0,26),vy:0,hp:100,yaw:0,pitch:0,on:true};
let selectedMapId='dust_block',activeMapData=null,aiming=false,baseFov=72;
const ray=new THREE.Raycaster(), V=(x,y,z)=>new THREE.Vector3(x,y,z);
const cur=()=>inventory[wi]||inventory[0]||'knife';
/* AUDIO */
let AC,NB,masterVolume=.8;
function snd(v,d,f,priority=0,pan=0){
 if(!AC||!NB||masterVolume<=0||v<=0||document.hidden||!reserveSoundVoice(priority))return;
 const s=AC.createBufferSource();s.buffer=NB;const g=AC.createGain(),fi=AC.createBiquadFilter();
 g.gain.setValueAtTime(Math.max(.001,v*masterVolume),AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
 fi.type='lowpass';fi.frequency.value=f;s.connect(fi);fi.connect(g);
 const stereo=pan?AC.createStereoPanner?.():null;if(stereo){stereo.pan.value=Math.max(-1,Math.min(1,pan));g.connect(stereo);stereo.connect(AC.destination)}else g.connect(AC.destination);
 activeVoices.add(s);voicePriority.set(s,priority);s.onended=()=>{activeVoices.delete(s);s.disconnect();fi.disconnect();g.disconnect();stereo?.disconnect()};s.start();
}
const originalAudio={},originalSoundLoading={};let originalSoundsRequested=false,reloadSfxToken=0;
const RELOAD_SOUNDS={
 usp:[['usp_clipout.wav',0],['usp_clipin.wav',520],['usp_sliderelease.wav',1120]],
 glock18:[['clipout1.wav',0],['clipin1.wav',500],['sliderelease1.wav',1080]],
 p228:[['p228_clipout.wav',0],['p228_clipin.wav',500],['p228_sliderelease.wav',1080]],
 deagle:[['de_clipout.wav',0],['de_clipin.wav',540],['de_deploy.wav',1120]],
 elite:[['elite_reloadstart.wav',0],['elite_leftclipin.wav',500],['elite_rightclipin.wav',920],['elite_sliderelease.wav',1320]],
 fiveseven:[['fiveseven_clipout.wav',0],['fiveseven_clipin.wav',520],['fiveseven_sliderelease.wav',1080]],
 mac10:[['mac10_clipout.wav',0],['mac10_clipin.wav',520],['mac10_boltpull.wav',1120]],
 tmp:[['clipout1.wav',0],['clipin1.wav',480],['slideback1.wav',1040]],
 mp5:[['mp5_clipout.wav',0],['mp5_clipin.wav',500],['mp5_slideback.wav',1080]],
 ump45:[['ump45_clipout.wav',0],['ump45_clipin.wav',500],['ump45_boltslap.wav',1080]],
 p90:[['p90_clipout.wav',0],['p90_clipin.wav',520],['p90_cliprelease.wav',1100]],
 galil:[['galil_clipout.wav',0],['galil_clipin.wav',520],['galil_boltpull.wav',1120]],
 ak47:[['ak47_clipout.wav',0],['ak47_clipin.wav',520],['ak47_boltpull.wav',1120]],
 famas:[['famas_clipout.wav',0],['famas_clipin.wav',520],['famas_boltslap.wav',1120]],
 m4a1:[['m4a1_clipout.wav',0],['m4a1_clipin.wav',520],['m4a1_boltpull.wav',1120]],
 aug:[['aug_clipout.wav',0],['aug_clipin.wav',520],['aug_boltslap.wav',1120]],
 sg552:[['sg552_clipout.wav',0],['sg552_clipin.wav',520],['sg552_boltpull.wav',1120]],
 scout:[['scout_clipout.wav',0],['scout_clipin.wav',520],['scout_bolt.wav',1120]],
 awp:[['awp_clipout.wav',0],['awp_clipin.wav',560],['boltpull1.wav',1180]],
 g3sg1:[['g3sg1_clipout.wav',0],['g3sg1_clipin.wav',520],['g3sg1_slide.wav',1120]],
 sg550:[['sg550_clipout.wav',0],['sg550_clipin.wav',520],['sg550_boltpull.wav',1120]],
 m3:[['m3_insertshell.wav',0],['m3_insertshell.wav',620],['m3_pump.wav',1260]],
 xm1014:[['m3_insertshell.wav',0],['m3_insertshell.wav',620],['m3_pump.wav',1260]],
 m249:[['m249_boxout.wav',0],['m249_boxin.wav',650],['m249_coverup.wav',1250],['m249_chain.wav',1650]]
};
const originalSoundQueue=[];let soundLoadsActive=0;
function pumpOriginalSounds(){
 while(AC&&soundLoadsActive<4&&originalSoundQueue.length){
  const name=originalSoundQueue.shift();soundLoadsActive++;
  Promise.resolve().then(async()=>{
   const local=await WeaponImport.soundData(name);if(local)return local;
   const file=name.startsWith('skin:')?name.split(':').slice(2).join(':'):name;
   const r=await fetch('assets/sounds/weapons/'+file);return r.ok?r.arrayBuffer():null;
  }).then(b=>b&&AC.decodeAudioData(b)).then(buf=>{if(buf)originalAudio[name]=buf}).catch(()=>{}).finally(()=>{delete originalSoundLoading[name];soundLoadsActive--;pumpOriginalSounds()});
 }
}
function requestOriginalSound(name,preload=false){
 if(!AC||originalAudio[name])return;
 if(originalSoundLoading[name]){if(!preload){const i=originalSoundQueue.indexOf(name);if(i>0){originalSoundQueue.splice(i,1);originalSoundQueue.unshift(name);}}return;}
 originalSoundLoading[name]=true;if(preload)originalSoundQueue.push(name);else originalSoundQueue.unshift(name);pumpOriginalSounds();
}
function loadOriginalSounds(){if(!AC||originalSoundsRequested)return;originalSoundsRequested=true;const reloadFiles=Object.values(RELOAD_SOUNDS).flat().map(x=>x[0]);const extras=['grenade_hit2.wav','grenade_hit3.wav','glock18-2.wav','famas-2.wav','famas-burst.wav','generic_reload.wav','knife_slash1.wav','knife_stab.wav','knife_hit1.wav','knife_hit2.wav','knife_hit3.wav','knife_hit4.wav','knife_hitwall1.wav','knife_slash2.wav','knife_deploy1.wav','headshot2.wav','pinpull.wav','sg_explode.wav','hegrenade-1.wav','hegrenade-2.wav','flashbang-1.wav','flashbang-2.wav','grenade_hit1.wav','dryfire_pistol.wav','dryfire_rifle.wav','usp_unsil-1.wav','m4a1_unsil-1.wav','usp_silencer_on.wav','usp_silencer_off.wav','m4a1_silencer_on.wav','m4a1_silencer_off.wav','ric_metal-1.wav','ric_conc-1.wav','c4_beep1.wav','c4_beep2.wav','c4_beep3.wav','c4_beep4.wav','c4_beep5.wav','c4_click.wav','c4_disarm.wav','c4_disarmed.wav','c4_plant.wav','c4_explode1.wav'];const cueFiles=Object.values(WeaponPresentation).flatMap(asset=>Object.values(asset.sound).flat().map(cue=>cue[1]));const files=[...new Set([...cueFiles,...Object.values(W).map(w=>w.sound).filter(Boolean),...reloadFiles,...extras])];files.forEach(name=>requestOriginalSound(name,true));
  for(const original of ['m3-1.wav','m3_insertshell.wav','m3_pump.wav','m3_draw.wav'])requestOriginalSound(WeaponImport.audioRoute('m3',original),true)}
const activeVoices=new Set(),voicePriority=new WeakMap();
function reserveSoundVoice(priority){
 while(activeVoices.size>=16){let old=null;for(const voice of activeVoices)if((voicePriority.get(voice)||0)<=priority&&(!old||(voicePriority.get(voice)||0)<(voicePriority.get(old)||0)))old=voice;
  if(!old)return false;activeVoices.delete(old);try{old.stop()}catch(e){}
 }return true;
}
function resetWeaponVoices(){for(const voice of activeVoices){try{voice.stop()}catch(e){}}activeVoices.clear()}
function playOriginalSound(name,v=.4,d=.16,f=1800,priority=0,pan=0){
 name=WeaponImport.routeGlobalSound(name,typeof vm!=='undefined'?vm?.userData?.viewAsset:'');
 if(!AC||masterVolume<=0||v<=0||document.hidden)return;
 const b=originalAudio[name];if(!b){requestOriginalSound(name);snd(v,d,f,priority,pan);return}
 if(!reserveSoundVoice(priority))return;
 const source=AC.createBufferSource(),gain=AC.createGain();source.buffer=b;gain.gain.value=Math.min(1,v*1.4)*masterVolume;source.connect(gain);const stereo=pan?AC.createStereoPanner?.():null;if(stereo){stereo.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(stereo);stereo.connect(AC.destination)}else gain.connect(AC.destination);activeVoices.add(source);voicePriority.set(source,priority);
 source.onended=()=>{activeVoices.delete(source);source.disconnect();gain.disconnect();stereo?.disconnect()};source.start();
}
// Fallback cues use the same gameplay clock as reload, never wall-clock timers.
let reloadCueState=null;
function playReloadSequence(k){const seq=RELOAD_SOUNDS[k]||[['generic_reload.wav',0]],token=++reloadSfxToken,scale=W[k].rl*.85/(seq[seq.length-1][1]||1000);reloadCueState={token,elapsed:0,index:0,cues:seq.map(([f,t])=>[t*scale,WeaponImport.audioRoute(k,f)])};updateReloadCues(0)}
function updateReloadCues(dt){const c=reloadCueState;if(!c)return;if(c.token!==reloadSfxToken||!reloading){reloadCueState=null;return}c.elapsed+=dt;while(c.index<c.cues.length&&c.cues[c.index][0]<=c.elapsed+1e-8){playOriginalSound(c.cues[c.index++][1],.26,.12,1000,1)}if(c.index===c.cues.length)reloadCueState=null}
/* TEXTURES */
function tex(c1,c2,rep){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle=c1;x.fillRect(0,0,64,64);x.fillStyle=c2;x.fillRect(0,0,64,3);x.fillRect(0,0,3,64);x.fillRect(61,0,3,64);x.fillRect(0,61,64,3);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.magFilter=THREE.NearestFilter;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep)}return t}
/* WORLD */
function B(x,z,w,h,d,col,y=0,crate){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial(crate?{color:col,map:CT}:{color:col}));
 m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;S.add(m);obsM.push(m);
 obs.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2,y1:y,y2:y+h});return m;
}
// Do not release matchLoading while a sibling loader can still mutate the scene.
async function waitForLoadTasks(tasks){
 const results=await Promise.allSettled(tasks),failed=results.find(r=>r.status==='rejected');
 if(failed)throw failed.reason;
 return results.map(r=>r.value);
}
// Limit simultaneous GLTF fetch, image decoding and parser work across startup loaders.
const matchModelQueue=[];let matchModelActive=0;
function loadMatchModel(url){return new Promise((resolve,reject)=>{matchModelQueue.push({url,resolve,reject});pumpMatchModels()})}
function pumpMatchModels(){
 while(matchModelActive<4&&matchModelQueue.length){
  const job=matchModelQueue.shift();matchModelActive++;
  Promise.resolve().then(()=>new Promise((ok,no)=>new THREE.GLTFLoader().load(job.url,ok,undefined,no))).then(job.resolve,job.reject).finally(()=>{matchModelActive--;pumpMatchModels()});
 }
}
let CT,builtMapId=null,worldReady=Promise.resolve();
function rebuildWorld(){
 // Detach transient objects with shared GLTF/sprite resources BEFORE the
 // generic world sweep, which owns only world geometry and textures.
 CS16SFX.reset?.();resetWeaponVoices();Phase10.resetVoices();Phase10.clearFX();Phase13.clearBlood();Phase9.resetRound();clearCombatFX();
 GoldSrcSprites.clear();const releasedTextures=LocalMapMedia.clear();
 if(playerAvatar){S.remove(playerAvatar);playerAvatar.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose()});playerAvatar=null}
 bots.forEach(disposeBot);bots.length=0;const geos=new Set(),mats=new Set(),textures=new Set();
 for(const o of S.children.slice()){if(o===cam)continue;o.shadow?.dispose();o.traverse(m=>{if(m.geometry)geos.add(m.geometry);for(const mat of [].concat(m.material||[])){mats.add(mat);for(const v of Object.values(mat))if(v?.isTexture)textures.add(v)}});S.remove(o)}
 geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());if(CT)textures.add(CT);textures.forEach(t=>{if(!releasedTextures?.has(t))t.dispose()});obs.length=0;obsM.length=0;R.renderLists?.dispose();build();
}
function build(){
 window.bspCol=null;window.bspSky=null;window.NavGraph?.clear();window.BSPDoors?.clear();window.BSPBreakables?.clear();LayoutNav.reset();worldReady=Promise.resolve();S.userData.rayMeshes=obsM;
 CT=tex('#ffffff','#b0b0b0');
 S.background=new THREE.Color(0x9fd0ff);S.fog=new THREE.Fog(0x9fd0ff,35,95);
 S.add(new THREE.HemisphereLight(0xffffff,0x998866,.65));
 sun=new THREE.DirectionalLight(0xffffff,.6);sun.position.set(25,50,15);
 sun.shadow.camera.left=sun.shadow.camera.bottom=-42;sun.shadow.camera.right=sun.shadow.camera.top=42;sun.shadow.camera.far=120;sun.shadow.mapSize.set(1024,1024);S.add(sun);
 if(activeMapData?.local){
  window.bspCol=activeMapData.local.col;builtMapId='local_bsp';
  LocalBSP.mount(activeMapData.local,S);
  S.fog.near=100;S.fog.far=150;
  return;
 }
 if(activeMapData&&activeMapData.id!=='dust_block'){
  const gc=activeMapData.groundColor||['#a0a0a0','#888'];
  const size=Math.max(50,(activeMapData.size||50)*2);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(size*2,size*2),new THREE.MeshLambertMaterial({map:tex(gc[0],gc[1],50)}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;S.add(floor);obsM.push(floor);
  const bspMap=activeMapData.render==='bsp';floor.visible=!bspMap;window.bspCol=null;
  (activeMapData.blocks||[]).forEach(b=>{const m=B(b.x,b.z,b.w,b.h,b.d,b.color||'#888',b.y||0,!!b.crate);if(bspMap)m.material.visible=false});
  if(bspMap){S.fog.near=90;S.fog.far=150}
  if(bspMap){
   obsM.length=0;const dir='assets/maps/bsp/'+activeMapData.id;
   worldReady=waitForLoadTasks([loadBspWorld(dir,S),BSP.loadCollision(dir).then(async c=>{
    window.bspCol=c;await BSPDoors.load(dir,S,c,8);
    if(activeMapData.id==='cs_kvartal')await NavGraph.load(dir+'/nav/nav_graph.json',{c:c.T.c,s:c.T.s,scale:c.T.k});
   })]);
  }
  builtMapId=activeMapData.id;
  return;
 }
 builtMapId='dust_block';
 const g=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshLambertMaterial({map:tex('#d9bb80','#cdac70',50)}));
 g.rotation.x=-Math.PI/2;g.receiveShadow=true;S.add(g);obsM.push(g);
 const wl=0x8a7a64,bd=0xb9b3a2,wd=0x9a6a35,bl=0x5b7c99;
 B(0,-30.5,62,6,1,wl);B(0,30.5,62,6,1,wl);B(-30.5,0,1,6,62,wl);B(30.5,0,1,6,62,wl);
 for(const s of[1,-1]){
  B(-20*s,-26*s,12,4,.8,bd);B(-26*s,-20*s,.8,4,12,bd);B(-14*s,-23.5*s,.8,4,5,bd);B(-14*s,-15.5*s,.8,4,3,bd);
  B(-23*s,-14*s,6,4,.8,bd);B(-16*s,-14*s,4,4,.8,bd);B(-21*s,-21*s,2,1.2,2,wd,0,1);
 }
 B(0,0,6,1.2,6,wd,0,1);B(0,0,3,1.1,3,bl,1.2,1);B(4.2,0,1.6,.6,2.5,bl,0,1);B(-4.2,0,1.6,.6,2.5,bl,0,1);
 B(-10,-4,.8,3,10,bd);B(10,4,.8,3,10,bd);
 const cr=[[8,-12],[12,-8],[-8,12],[-12,8],[0,-14],[0,14],[-18,2],[18,-2],[-6,-24],[6,24],[24,-10],[-24,10]];
 cr.forEach((p,i)=>{B(p[0],p[1],1.8,1.2,1.8,i%2?wd:bl,0,1);if(i%3==0)B(p[0],p[1],1.6,1,1.6,i%2?bl:wd,1.2,1)});
 [[-14,2],[14,-2],[0,-20],[0,20]].forEach(p=>B(p[0],p[1],1.2,4,1.2,wl));
}
function collide(p,r,crouch=p===P.pos&&Phase9.crouching){
 for(const o of obs){
  if(p.y>=o.y2-.35||p.y+(crouch?1.05:1.7)<=o.y1)continue;
  const cx=Math.max(o.x1,Math.min(p.x,o.x2)),cz=Math.max(o.z1,Math.min(p.z,o.z2)),dx=p.x-cx,dz=p.z-cz,d2=dx*dx+dz*dz;
  if(d2<r*r){
   if(d2>1e-6){const d=Math.sqrt(d2);p.x=cx+dx/d*r;p.z=cz+dz/d*r}
   else{const l=p.x-o.x1,rr=o.x2-p.x,f=p.z-o.z1,b=o.z2-p.z,m=Math.min(l,rr,f,b);if(m==l)p.x=o.x1-r;else if(m==rr)p.x=o.x2+r;else if(m==f)p.z=o.z1-r;else p.z=o.z2+r}
  }
 }
}
function ground(p,r){let g=0;for(const o of obs)if(p.x>o.x1-r*.7&&p.x<o.x2+r*.7&&p.z>o.z1-r*.7&&p.z<o.z2+r*.7&&o.y2<=p.y+.35&&o.y2>g)g=o.y2;return g}
/* VIEWMODEL */
// 15A: Use the original GoldSrc one-piece shield+gun viewmodel for the
// pistol actually owned. A separate pistol rig can overlap the shield during
// draw/reload and cause the reported bright plane on weapon changes.
const SHIELD_NATIVE_PISTOLS=new Set(['usp','glock18','p228','deagle','fiveseven']);
function weaponAssetName(k){
 if(k==='knife'&&Phase14C.hasShield(inventory))return 'shield_knife';
 if(k!=='shield')return k;
 const pistol=Phase9.shieldPistol();
 return 'shield_'+(SHIELD_NATIVE_PISTOLS.has(pistol)?pistol:'usp');
}
function ensureWeaponModel(k){return ensureWeaponAsset(weaponAssetName(k))}
function ensureWeaponAsset(asset){
 if(weaponModels[asset])return Promise.resolve(weaponModels[asset]);
 if(weaponModelLoads[asset])return weaponModelLoads[asset];
 // The PC GoldSrc v_*.mdl is authoritative. Existing GLB remains the safe
 // fallback for unsupported shield+grenade combinations or malformed models.
 weaponModelLoads[asset]=(async()=>{
  let result=null;
  // Emergency visual rollback for a device that cannot render native MDL:
  // append ?mdlLegacy=1 to the game URL. No setting/save data is changed.
  const legacyMDL=typeof location!=='undefined'&&new URLSearchParams(location.search).get('mdlLegacy')==='1';
  result=await WeaponImport.modelFor(asset,THREE);
  if(!result&&!legacyMDL&&typeof GoldSrcMDL10!=='undefined'&&GoldSrcMDL10.sourceName(asset)){
   try{result=await GoldSrcMDL10.load(asset,THREE)}
   catch(error){console.warn('Native GoldSrc viewmodel fallback:',asset,error)}
  }else if(!result&&typeof GoldSrcMDL10!=='undefined')GoldSrcMDL10.fallback(asset,legacyMDL?'User selected legacy GLB via mdlLegacy=1':'No matching combined native MDL');
  if(!result)result=await loadMatchModel('assets/models/weapons/'+asset+'.glb');
  weaponModels[asset]=result;return result;
 })().catch(err=>{console.warn('Weapon model failed to load:',asset,err);throw err}).finally(()=>{delete weaponModelLoads[asset]});
 return weaponModelLoads[asset];
}
async function preloadViewmodels(updateProgress=true){
 // Startup needs only the equipped loadout, knife and plant/throw props.
 // Purchased weapons, bots viewed in spectator and shield variants are lazy.
 const assets=['usp','glock18','knife','c4','hegrenade'];
 let done=0;
 await waitForLoadTasks(assets.map(async id=>{
  await ensureWeaponAsset(id);
  if(updateProgress)$('loadStatus').textContent='Memuat model senjata '+(++done)+' / '+assets.length+'…';
 }));
}
function weaponSequenceNames(state,predicate){return state.clipNames.filter(n=>predicate(n.replace(/__\d+$/,'').toLowerCase()));}
function weaponSequence(state,candidates){
 for(const candidate of candidates){const found=state.clipNames.find(n=>n.replace(/__\d+$/,'').toLowerCase()===candidate);if(found)return found}
 return null;
}
function playWeaponClip(state,name,loop=false){
 if(!state||!name||!state.actions[name])return false;
 const action=state.actions[name];
 const previous=state.activeAction;
 if(previous&&previous!==action)previous.stop();
 action.reset();action.enabled=true;action.setEffectiveTimeScale(1);action.setEffectiveWeight(1);
 action.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);action.clampWhenFinished=!loop;action.play();
 state.soundCues=state.presentation?.sound[name]||[];
 state.nextSoundCue=0;
 state.activeAction=action;state.activeName=name;state.looping=loop;return true;
}
function updateWeaponCues(state,dt){
 const action=state.activeAction;
 if(!action||!state.soundCues?.length)return;
 const progress=Math.min(1,(action.time+dt*action.getEffectiveTimeScale())/Math.max(.001,action.getClip().duration));
 while(state.nextSoundCue<state.soundCues.length&&state.soundCues[state.nextSoundCue][0]<=progress){
  const [,file]=state.soundCues[state.nextSoundCue++];
  playOriginalSound(WeaponImport.audioRoute(vm?.userData.viewAsset||cur(),vm?.userData.viewAsset==='m3'&&state.activeName==='draw'?'m3_draw.wav':file),.26,.08,1250,1);
 }
}
function playWeaponAnimation(kind, timing=0, outcome='miss'){
 const state=vm&&vm.userData.weaponAnimation;if(!state)return;
 const k=cur(),unsil=typeof Phase9!=='undefined'&&Phase9.unsilenced(k);
 const suffix=unsil?'_unsil':'';
 const prefer=base=>weaponSequence(state,[base+suffix,base]);
 const idle=prefer('idle')||weaponSequence(state,['idle1','idle3','shield_idle']);
 let chosen=null,queue=[];
 if(kind==='idle')chosen=((k==='shield'||vm?.userData.viewAsset==='shield_knife')&&Phase9.shieldRaised?weaponSequence(state,['shield_idle']):null)||idle;
 else if(kind==='draw')chosen=prefer('draw')||weaponSequence(state,['draw2','deploy'])||idle;
 else if(kind==='reload'){
  chosen=prefer('reload');
  if(!chosen){chosen=weaponSequence(state,['start_reload']);if(chosen){const insert=weaponSequence(state,['insert']);const after=weaponSequence(state,['after_reload']);if(insert)queue.push(insert);if(after)queue.push(after)}}
 }else if((kind==='attack'||kind==='stab')&&k==='knife'){
  // Stock knife slash1/slash2 are two-frame placeholders. Use the full
  // authored midslash motion; shield uses its own slash/hit animations.
  const usable=n=>state.actions[n].getClip().duration>.12;
  if(kind==='stab')chosen=weaponSequence(state,outcome==='body'?['stab','hit','stab_miss']:['stab_miss','stab','hit']);
  else {const choices=weaponSequenceNames(state,n=>['midslash1','midslash2','slash','slash1','slash2'].includes(n)).filter(usable);if(choices.length)chosen=choices[state.cycles.attack++%choices.length]}
  if(chosen&&!usable(chosen))chosen=null;
 }else if(kind==='fire'){
  const key=k==='shield'?Phase9.shieldPistol():k;
  if(key==='glock18'&&state.actions.shoot3&&state.actions.shoot_empty){
   // Native shoot/shoot2 each contain three muzzle events. shoot3 is the
   // genuine one-shot sequence; replay it once per actual projectile.
   chosen=A[key]?.mag===0?'shoot_empty':'shoot3';
  }else if(k==='elite'){
   const side=A[k].mag%2?'left':'right';
   const clips=weaponSequenceNames(state,n=>new RegExp('^shoot_'+side+'[1-5]$').test(n));
   chosen=A[k].mag<=1?weaponSequence(state,['shoot_'+side+'last']):clips[state.cycles.fire++%clips.length];
  }else{
   const last=prefer('shootlast')||weaponSequence(state,['shoot_empty']);
   const choices=weaponSequenceNames(state,n=>n.startsWith('shoot')&&!n.includes('empty')&&n!=='shootlast'&&n!=='shootlast_unsil'&&n.includes('_unsil')===!!unsil);
   if(A[key]?.mag===0&&last)chosen=last;
   else if(choices.length)chosen=choices[state.cycles.fire++%choices.length];
  }
 }
 if(!chosen)chosen=idle;
 state.queue=queue;state.currentKind=kind;
 if(k==='shield'&&!vm?.userData.nativeShield15a&&typeof Phase14B!=='undefined')Phase14B.play(vm,kind);
 if(!playWeaponClip(state,chosen,kind==='idle'))return;
 // Preserve the authored gun motion; a new accepted shot may interrupt it.
 // Only knife attacks fit the complete motion to the gameplay cooldown.
 if(timing>0&&kind!=='fire'&&state.activeAction&&chosen!==idle)state.activeAction.setEffectiveTimeScale(Math.max(1,state.activeAction.getClip().duration/timing));
 if(kind==='draw'&&k==='knife')playOriginalSound('knife_deploy1.wav',.26,.12,1800,1);
 if(kind==='idle')state.currentKind='idle';
 // Evaluate the selected fire pose before reading its muzzle/ejection bones.
 if(kind==='fire'){state.mixer.update(0);vm.updateMatrixWorld(true)}
}
function cloneViewmodel(gltf, asset){
 const model=THREE.SkeletonUtils.clone(gltf.scene);
 model.traverse(o=>{if(o.isMesh)o.frustumCulled=false});
 const [,x,y,z]=ViewmodelCalibration[asset];
 if(gltf.nativeMdl){model.userData.nativeMdl=true;}else model.position.set(x,y,z);
 return model;
}
function mkGun(k){
 const asset=weaponAssetName(k);
 // Cache shield variants separately; replacing a pistol must not resurrect
 // the viewmodel for the previously purchased pistol.
 if(weaponInstances[asset]){
  const existing=weaponInstances[asset];flash=existing.userData.flash;
  if(k==='shield')weaponInstances.shield=existing;
  return existing;
 }
 const gltf=weaponModels[asset];if(!gltf)return null;
 const g=new THREE.Group(),w=W[k],model=cloneViewmodel(gltf,asset);
 g.userData.viewAsset=asset;g.userData.nativeMdl=!!gltf.nativeMdl;
 if(asset.startsWith('shield_'))g.userData.nativeShield15a=asset;
 g.add(model);
 const mixer=new THREE.AnimationMixer(model),actions={};gltf.animations.forEach(clip=>{actions[clip.name]=mixer.clipAction(clip)});
 const state={mixer,actions,presentation:WeaponPresentation[asset],clipNames:gltf.animations.map(c=>c.name),activeAction:null,activeName:'',currentKind:'idle',queue:[],cycles:{fire:0,attack:0}};
 mixer.addEventListener('finished',event=>{
  if(event.action!==state.activeAction||vm!==g)return;
  if(state.queue.length){const next=state.queue.shift();playWeaponClip(state,next,false)}
  else if(state.currentKind!=='idle'){playWeaponAnimation('idle')}
 });
 g.userData.weaponAnimation=state;
 flash=gltf.nativeMdl?model.getObjectByName('mdl_attach_0'):null;
 if(!flash){flash=new THREE.Object3D();flash.position.set(0,.02,-Math.max(.55,w.len+.15));g.add(flash)}
 g.userData.flash=flash;weaponInstances[asset]=g;if(k==='shield')weaponInstances.shield=g;return g;
}
function refreshWeaponChips(){
 const box=$('chips');box.innerHTML='';const choices=Phase14C.allowedIndices(inventory,W);choices.forEach((i,slot)=>{const k=inventory[i],d=document.createElement('div');d.className='chip'+(i===wi?' on':'');d.dataset.index=String(i); d.textContent=(slot+1)+' '+(k==='shield'?W[Phase14C.pistol(inventory)||'usp'].n+' + SHIELD':(WeaponImport.active(k)?.name||W[k].n));d.addEventListener('pointerdown',e=>{e.stopPropagation();setW(i)});GoldSrcSprites.chip(d,k,i===wi);box.appendChild(d)});const c4=document.createElement('button');c4.id='c4Chip';c4.type='button';c4.className='chip c4-chip'+(BombMode.hasHumanC4?.()?'':' hidden');c4.setAttribute('aria-label','Equip C4');c4.textContent='C4';c4.addEventListener('pointerdown',e=>{e.stopPropagation();BombMode.selectC4?.()});GoldSrcSprites.chip(c4,'c4',false);if(!c4.querySelector('img')){const icon=document.createElement('img');icon.className='goldsrc-slot';icon.src='assets/ui/icons/c4.png';icon.alt='';c4.prepend(icon);}box.appendChild(c4);
}
function setW(i){
 if(BombMode.locked()||!inventory.length||!viewScene)return false;
 const selected=Phase14C.selectIndex(inventory,i,W),k=inventory[selected];
 if(!weaponModels[weaponAssetName(k)]){
  const token=++pendingWeaponSelection;
  ensureWeaponAsset(weaponAssetName(k)).then(()=>{
   if(token===pendingWeaponSelection&&inventory.includes(k)&&running)setW(inventory.indexOf(k));
  }).catch(error=>console.warn('Cannot equip weapon:',k,error));
  return false;
 }
 pendingWeaponSelection++;
 BombMode.deselect?.();Phase9.cancelGrenade();WeaponModes15C.cancel();pendingKnife=pendingAutoReload=null;reloadSfxToken++;
 fh=fl=secondaryHeld=mouseSecondaryHeld=false;fireAimPointer=fireAimLast=adsPointer=adsAimLast=null;
 firedLatch=false;aiming=false;zoomIdx=0;
 if(k!=='shield'&&!(k==='knife'&&Phase14C.hasShield(inventory)))Phase9.lowerShield();
 const prior=vm;
 if(prior)prior.userData.weaponAnimation.mixer.stopAllAction();
 wi=selected;reloading=0;shotgunReload=null;cool=0;swapT=.25;P.recoil=null;P.lastKnifeAt=null;P.resumeZoom=null;
 vm=mkGun(k);const state=vm.userData.weaponAnimation;
 state.mixer.stopAllAction();state.activeAction=null;
 Phase13.applyHand(vm);vm.position.set(0,0,0);vm.rotation.set(0,0,0);
 // Gameplay readiness is independent from authored draw clip length.
 swapT=Combat12.deployTime(k==='shield'?Phase9.shieldPistol():k);
 playWeaponAnimation(vm.userData.viewAsset.startsWith('shield_')&&Phase9.shieldRaised?'idle':'draw',swapT);
 state.mixer.update(0);vm.updateMatrixWorld(true);
 if(prior)viewScene.remove(prior);
 viewScene.add(vm);syncAim();refreshWeaponChips();hud();
 return true;
}
// Cosmetic imports are isolated from W/Combat12; only rendered models and sound cache are invalidated.
document.addEventListener('blockstrike:weapon-skin-change',event=>{
 const asset=event.detail?.id;if(!asset)return;
 delete weaponModels[asset];delete weaponModelLoads[asset];
 const instance=weaponInstances[asset];if(instance){if(instance!==vm)instance.userData.weaponAnimation?.mixer.stopAllAction();delete weaponInstances[asset]}
 for(const key of Object.keys(originalAudio))if(key.startsWith('skin:'+asset+':'))delete originalAudio[key];
 const selection=cur(),active=weaponAssetName(selection);
 if(running&&viewScene&&vm&&active===asset){
  const old=vm;old.userData.weaponAnimation?.mixer.stopAllAction();viewScene.remove(old);vm=null;
  ensureWeaponAsset(asset).then(()=>{if(running&&cur()===selection)setW(wi)}).catch(err=>{console.warn('Cannot apply imported viewmodel:',err);if(running&&cur()===selection){vm=old;viewScene.add(old)}});
 }
 refreshWeaponChips();hudAmmoMarkup=null;if(running)hud();
});
/* MODEL LOADING (CT) */
let loadedClassicCharacterMode=null;
function classicCharacterMode(){try{return localStorage.getItem('block-strike-classic-characters')!=='off'}catch(e){return true}}
function preloadCT(done){
 const original=classicCharacterMode();
 if(ctState===2&&loadedClassicCharacterMode===original){done();return}
 if(!THREE.GLTFLoader||!THREE.SkeletonUtils){ctState=2;done();return}
 if(ctState===2){ctState=0;Object.keys(CTC).forEach(k=>delete CTC[k]);Object.keys(TC).forEach(k=>delete TC[k])}
 (ctWait=ctWait||[]).push(done);
 if(ctState===1)return;
 ctState=1;loadedClassicCharacterMode=original;
 const jobs=[...CTN.map(n=>['ct',n]),...TN.map(n=>['t',n])];let left=jobs.length;
 const fin=()=>{if(--left===0){ctState=2;const w=ctWait;ctWait=null;w.forEach(f=>f())}};
 jobs.forEach(([d,n])=>{
  const fallback='assets/models/'+d+'/'+n+'.glb?v=3';
  const target=(d==='ct'?CTC:TC);
  const load=(url,retry)=>loadMatchModel(url).then(g=>{target[n]=g;fin()},()=>retry?load(fallback,false):fin());
  load(original?'assets/models/cs16-classic/'+d+'/'+n+'.glb?v=16.4.7-anim1':fallback,original);
 });
}
/* BOTS */
function mkBot(x,z,i=0,team='T'){
 const names=team==='T'?TN:CTN,models=team==='T'?TC:CTC,tn=names[(round+i)%names.length];
 if(models[tn])return mkModel(team,x,z,models[tn],tn);
 const g=new THREE.Group(),parts=[],b={g,parts,team,hp:100,cd:1+rnd(),t:rnd()*9,los:false,losT:rnd()*.25,strafe:rnd()<.5?-1:1,st:1,stuck:0,dead:0};
 const add=(w,h,d,px,py,pz,c,part,pivot)=>{const ge=new THREE.BoxGeometry(w,h,d);if(pivot)ge.translate(0,-h/2,0);const m=new THREE.Mesh(ge,new THREE.MeshLambertMaterial({color:c}));m.position.set(px,py,pz);m.castShadow=true;m.userData={part,bot:b};g.add(m);parts.push(m);return m};
 b.l=add(.3,.7,.3,-.17,.7,0,0x333b55,'leg',1);b.r=add(.3,.7,.3,.17,.7,0,0x333b55,'leg',1);
 add(.72,.8,.38,0,1.1,0,0xb8402e,'body');add(.46,.46,.46,0,1.78,0,0xf1c27d,'head');
 add(.2,.2,.55,.3,1.3,-.25,0xb8402e,'body');add(.2,.2,.3,-.3,1.3,-.1,0xb8402e,'body');add(.12,.16,.55,.3,1.3,-.6,0x222222,'body');
 g.position.set(x,0,z);b.name=tn||(team+' BOT');S.add(g);bots.push(b);return b;
}
function mkCT(x,z,n,team='CT'){
 const models=team==='CT'?CTC:TC;if(models[n])return mkModel(team,x,z,models[n],n);
 const root=new THREE.Group(),gl=models[n];
 const b={g:root,parts:[],team,hp:100,cd:1+rnd(),t:0,los:false,losT:rnd()*.25,strafe:rnd()<.5?-1:1,st:1,stuck:0,dead:0,mixer:null,acts:{},cur:''};
 if(gl){
  const body=THREE.SkeletonUtils.clone(gl.scene);root.add(body);
  b.mixer=new THREE.AnimationMixer(body);
  bindCharacterActions(b,gl.animations);
  setAnim(b,'idle1');
 }else{
  const m=new THREE.Mesh(new THREE.BoxGeometry(.6,1.8,.4),new THREE.MeshLambertMaterial({color:0x2a5fbf}));
  m.position.y=.9;m.castShadow=true;root.add(m);
 }
 root.position.set(x,0,z);S.add(root);bots.push(b);return b;
}
function attachCharacterGear(b,classId){
 b.gearMeshes=[];b.gearGroup=null;b.gearWanted=null;b.plantMeshes=[];b.plantVisual=false;
}
function mkModel(team,x,z,gl,classId=''){
 const root=new THREE.Group();
 const b={g:root,parts:[],team,hp:100,cd:1+rnd(),t:0,los:false,losT:rnd()*.25,strafe:rnd()<.5?-1:1,st:1,stuck:0,dead:0,mixer:null,acts:{},cur:''};
 const body=THREE.SkeletonUtils.clone(gl.scene);
 // The logical collision origin advances at a throttled AI rate. Keep rendered
 // soldier and hitboxes in a visual mount that interpolates between AI ticks.
 const visualMount=new THREE.Group();root.add(visualMount);visualMount.add(body);
 b.visualMount=visualMount;b.body=body;attachCharacterGear(b,classId);
 b.mixer=new THREE.AnimationMixer(body);
 bindCharacterActions(b,gl.animations);
 setAnim(b,'idle1');
 // Hit proxies are raycast-only; never write hidden boxes into the depth buffer.
 const pm=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
 const proxies=[
  ['chest',.58,.62,.48,0,1.18,0],['stomach',.47,.35,.42,0,.71,0],
  ['head',.3,.3,.3,0,1.62,0],
  ['leg',.21,.62,.3,-.16,.30,0],['leg',.21,.62,.3,.16,.30,0],
  ['arm',.19,.59,.35,-.385,1.14,0],['arm',.19,.59,.35,.385,1.14,0]
 ];
 if(typeof NativeHitboxes==='undefined'||!NativeHitboxes.attach(b,classId,THREE,pm))for(const [part,w,h,d,x,y,z] of proxies){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),pm);
  m.position.set(x,y,z);m.visible=false;m.userData={part,bot:b};visualMount.add(m);b.parts.push(m)}
 root.position.set(x,0,z);S.add(root);bots.push(b);return b;
}
// Separate the native gait's pelvis/legs from weapon-specific upper body.
// Derived clips share immutable keyframe tracks across clones; no GLB changes.
const characterMasks=new WeakMap();
function characterMask(clip,upper){
 let pair=characterMasks.get(clip);if(!pair){
  const lower=t=>/^(?:Bip01(?:[_. ]?Pelvis)?[.]|Bip01[_. ]?[LR][_. ]?(?:Thigh|Calf|Foot|Toe)|--[_. ]?[LR][_. ]?(?:Butt|Ankle|Knee))/i.test(t.name);
  pair=[false,true].map(up=>new THREE.AnimationClip(clip.name+(up?'@upper':'@lower'),clip.duration,clip.tracks.filter(t=>lower(t)!==up)));
  characterMasks.set(clip,pair);
 }return pair[upper?1:0];
}
function bindCharacterActions(b,clips){
 b.characterClips=new Map(clips.map(c=>[c.name,c]));b.nativeLayers=b.characterClips.has('ref_aim_knife');
 for(const clip of clips){let action;Object.defineProperty(b.acts,clip.name,{enumerable:true,configurable:true,get(){return action||(action=b.mixer.clipAction(clip))}})}
}
// Fading actions keep a mixer slot until explicitly stopped. Retire only
// after their fade interval, and cancel retirement if a pose is reused.
function retireCharacterAction(b,action,seconds){
 if(!action)return;
 action.fadeOut(seconds);(b.retiredActions||(b.retiredActions=new Map())).set(action,b.mixer.time+seconds);
}
function activateCharacterAction(b,action){b.retiredActions?.delete(action);}
function setCharacterGait(b,name){
 const clip=b.characterClips?.get(name),previous=b.gaitAction;
 if(!clip){retireCharacterAction(b,previous,.12);b.gaitAction=null;return;}
 const masked=characterMask(clip,false),action=previous?.getClip()===masked?previous:b.mixer.clipAction(masked);
 if(action!==previous){const phase=previous?previous.time/previous.getClip().duration:0;
  activateCharacterAction(b,action);action.reset().setLoop(THREE.LoopRepeat,Infinity).setEffectiveWeight(1).play();action.time=phase*clip.duration;
  if(previous){action.fadeIn(.12);retireCharacterAction(b,previous,.12)}else action.fadeIn(.12);
  b.gaitAction=action;
 }
 action.setEffectiveTimeScale(Math.max(.25,Math.min(1.35,(b.lastMoveSpeed||0)/(name==='crouchrun'?1.67:name==='walk'?2:5))));
}
function setAnim(b,name,once,preserve=false){
 if(!b.mixer||!b.acts[name])return;
 const layer=!!(b.nativeLayers&&b.characterGait&&/^(ref|crouch)_(aim|shoot|reload)/.test(name));
 if(b.cur===name&&!once&&b.poseLayered===layer){setCharacterGait(b,layer?b.characterGait:null);return b.poseAction;}
 const previous=b.poseAction||b.acts[b.cur],oldTime=previous?.time||0,oldScale=previous?.getEffectiveTimeScale?.()||1;
 const n=layer?b.mixer.clipAction(characterMask(b.characterClips.get(name),true)):b.acts[name];
 if(once){n.setLoop(THREE.LoopOnce,1);n.clampWhenFinished=true}else{n.setLoop(THREE.LoopRepeat,Infinity);n.clampWhenFinished=false;}
 const blend=once?.055:.12;
 activateCharacterAction(b,n);n.reset().setEffectiveTimeScale(preserve?oldScale:1).setEffectiveWeight(1).play();
 if(preserve)n.time=Math.min(oldTime,n.getClip().duration);
 if(previous&&previous!==n){n.fadeIn(blend);retireCharacterAction(b,previous,blend)}
 b.cur=name;b.poseAction=n;b.poseLayered=layer;b.poseOnce=!!once;setCharacterGait(b,layer?b.characterGait:null);return n;
}
// Cosmetic eye-to-eye aim; coordinate origin and stance both matter.
function botVisualAimPitch(b,target,targetCrouch,col){
 if(!target)return 0;
 const eye=crouch=>col?(28-(crouch?(Number.isInteger(col.crouchHead)?16:9):0))*col.T.k:crouch?.95:1.35;
 const p=b.g.position;
 return Math.atan2(target.y+eye(targetCrouch)-p.y-eye(!!b.crouching),Math.max(.1,Math.hypot(target.x-p.x,target.z-p.z)));
}
// Cosmetic pitch only: preserve the mixer output before each additive correction.
// The actual raycast and collision rig are unchanged.
function tickCharacterPose(b,dt){
 if(!b.mixer)return;
 if(b.pitchBone&&b.pitchBase)b.pitchBone.quaternion.copy(b.pitchBase);
 b.mixer.update(dt);
 if(b.retiredActions?.size)for(const [action,deadline] of b.retiredActions){
  if(action===b.poseAction||action===b.gaitAction)b.retiredActions.delete(action);
  else if(b.mixer.time+1e-7>=deadline){action.stop();b.retiredActions.delete(action)}
 }
 if(!b.nativeLayers||!b.body||!b.g)return;
 const bone=b.pitchBone||(b.pitchBone=b.body.getObjectByName('Bip01_Spine2'));
 if(!bone)return;
 const enabled=!b.dead&&!b.shieldRaised&&b.medium!=='ladder'&&b.medium!=='water'&&/^(ref|crouch)_(aim|shoot)_(?!grenade|c4|shieldgren)/.test(b.cur)&&(!b.objectivePose||b.defuseAnimActive);
 const wanted=enabled?Math.max(-.65,Math.min(.65,b.aimPitch||0)):0;
 b.visualPitch=enabled?wanted+((b.visualPitch||0)-wanted)*Math.exp(-14*Math.max(0,dt)):0;
 if(Math.abs(b.visualPitch-wanted)<.0001)b.visualPitch=wanted;
 if(!b.pitchBase)b.pitchBase=new THREE.Quaternion();b.pitchBase.copy(bone.quaternion);
 if(Math.abs(b.visualPitch)<.0001)return;
 // Convert the actor's horizontal right axis into the spine parent's frame.
 const scratch=b.aimScratch||(b.aimScratch={axis:new THREE.Vector3(),q:new THREE.Quaternion()});
 const axis=scratch.axis.set(1,0,0).applyQuaternion((b.visualMount||b.g).getWorldQuaternion(scratch.q));
 axis.applyQuaternion(bone.parent.getWorldQuaternion(scratch.q).invert()).normalize();
 bone.quaternion.premultiply(scratch.q.setFromAxisAngle(axis,b.visualPitch));
}
const SP=[[-10,-26],[0,-26],[10,-26],[-24,-5],[24,-5],[-18,-10],[18,-14],[8,-20],[-8,-20],[26,0],[-26,2],[12,-2]];
function startRound(){
 window.BSPBreakables?.reset();
 CS16SFX.reset?.();resetWeaponVoices();clearCombatFX();GoldSrcSprites.clear();WeaponModes15C.cancel();pendingKnife=pendingAutoReload=null;Phase13.beforeRound();Phase9.resetRound();if(cur()==='shield'&&vm)playWeaponAnimation('idle');Phase10.clearFX();Phase10.roundStart();aiming=false;zoomIdx=0;reloading=0;shotgunReload=null;roundWait=0;reloadSfxToken++;resetInputs();syncAim();
 GrenadeFX15B.init(S);round++;bots.forEach(disposeBot);bots.length=0;
 const match=Phase10.counts(playerTeam),enemyTeam=playerTeam==='CT'?'T':'CT',allyTeam=playerTeam;
 const spawnData=activeMapData?.spawn||{},ownSpawn=spawnData[playerTeam==='CT'?'ct':'t'],enemySpawn=spawnData[playerTeam==='CT'?'t':'ct'];
 const ownZ=ownSpawn?.[2]??(playerTeam==='CT'?24:-24),enemyZ=enemySpawn?.[2]??(playerTeam==='CT'?-24:24);
 // Every number 2..32 is valid: one human plus N-1 bots, with an odd
 // extra player slot assigned to the human's team.
 for(let i=0;i<match.enemies;i++){
  const x=(enemySpawn?.[0]||0)+((i%5)-2)*1.85,z=enemyZ+Math.floor(i/5)*(enemyTeam==='CT'?-1.8:1.8);
  const b=enemyTeam==='T'?mkBot(x,z,i,'T'):mkCT(x,z,CTN[(round+i)%CTN.length],'CT');
  b.name=(enemyTeam==='T'?TN[(round+i)%TN.length]:CTN[(round+i)%CTN.length]).toUpperCase();Phase10.registerBot(b,i);Phase10.prepareBotRound(b);
 }
 for(let i=0;i<match.allies;i++){
  const slot=i<2?i:i+1;
  const x=(ownSpawn?.[0]||0)+((slot%5)-2)*1.85,z=ownZ+Math.floor(slot/5)*(allyTeam==='CT'?-1.8:1.8);
  const b=allyTeam==='T'?(i===0&&TC[playerClass]?mkModel('T',x,z,TC[playerClass],playerClass):mkBot(x,z,i,'T'))
   :mkCT(x,z,i===0?playerClass:CTN[(round+i)%CTN.length],'CT');
  b.name=(i===0?playerClass:(allyTeam==='T'?TN[(round+i)%TN.length]:CTN[(round+i)%CTN.length])).toUpperCase();Phase10.registerBot(b,i);Phase10.prepareBotRound(b);
 }
 bots.forEach(b=>{if(window.bspCol){b.g.position.y=BSP.snapSpawn(bspCol,b.g.position.x,b.g.position.z);if(b.body)b.body.position.y=-.72;if(!b.nativeHitboxes)b.parts.forEach(p=>p.position.y-=.72)}});
 bots.forEach(b=>{
  b.g.rotation.y=b.team==='CT'?0:Math.PI;
  b.baseBodyY=b.body?.position.y??0;Phase11.initBotPose(b);
  b.mixer?.update(0);
 });
 const spawn=activeMapData?.spawn?.[playerTeam==='CT'?'ct':'t'];P.pos.set(spawn?.[0]??0,spawn?.[1]??0,spawn?.[2]??(playerTeam==='CT'?26:-26));
 if(window.bspCol)P.pos.y=BSP.snapSpawn(bspCol,P.pos.x,P.pos.z);P.yaw=playerTeam==='CT'?0:Math.PI;
 P.hp=100;P.nextBotFootstep=0;buyTime=window.PhaseMenu15?.rules.buyTime??15;roundTime=window.PhaseMenu15?.rules.roundSeconds??120;freezeLeft=window.PhaseMenu15?.rules.freezeTime??6;
 P.vy=0;P.vel=[0,0];P.viewMotion={};P.waterLevel=0;P.recoil=null;P.hitSlow=1;P.lastKnifeAt=null;P.resumeZoom=null;P.jumpHeld=false;P.ladderDetach=0;P.on=false;placeMapSpawns();primeSpawnCamera();staggerBotTicks();BombMode.roundStart();say('ROUND '+round+' · '+Phase10.config.players+' PLAYERS · '+Phase10.config.difficulty.toUpperCase());hud();
}

// Establish a valid camera even before the first gameplay tick (and after a round reset).
function primeSpawnCamera(){
 cam.position.set(P.pos.x,P.pos.y+(window.bspCol?.56:1.6),P.pos.z);
 cam.rotation.set(P.pitch,P.yaw,0,'YXZ');cam.updateMatrixWorld(true);
}
function botTickInterval(players){return players>24?.085:players>16?.06:.034;}
function staggerBotTicks(){
 const interval=botTickInterval(Phase10.config.players),count=Math.max(1,bots.length);
 bots.forEach((b,i)=>{b.aiAccum=-interval*i/count;});
}
let missingBoostReported=false;
function takeBotStep(b,dt,players){
 const interval=botTickInterval(players);b.aiAccum=(b.aiAccum||0)+dt;
 if(b.aiAccum+1e-9<interval)return 0;
 // Preserve phase remainder instead of synchronizing every bot to the same frame.
 const elapsed=Math.floor((b.aiAccum+1e-9)/interval)*interval;
 b.aiAccum=Math.max(0,b.aiAccum-elapsed);return Math.min(.16,elapsed);
}
function groundSoundSurface(position){
 if(!window.bspCol)return 'dirt';
 // Only sampled when a step is emitted, not each render/AI tick.
 ray.set(position.clone().add(V(0,.12,0)),V(0,-1,0));ray.far=1.25;
 const hit=ray.intersectObjects(obsM).find(h=>h.object.visible!==false);
 return CS16SFX.surfaceForTag(Combat12.materialType(hit?.object.userData?.textureName));
}
function los(b,tp){
 const col=window.bspCol,eye=col?28*col.T.k:1.5,duck=col?(Number.isInteger(col.crouchHead)?16*col.T.k:.18):.55;
 const targetCrouch=tp===P.pos?!!Phase9.crouching:!!bots.find(x=>x.g.position===tp)?.crouching;
 const o=V(b.g.position.x,b.g.position.y+eye-(b.crouching?duck:0),b.g.position.z),t=V(tp.x,tp.y+eye-(targetCrouch?duck:0),tp.z),d=t.clone().sub(o),L=d.length();
 ray.set(o,d.normalize());ray.far=L;return typeof BSPVisuals==='undefined'?ray.intersectObjects(obsM).length===0:!BSPVisuals.occluded(ray,obsM);
}
function tgtFor(b){
 const p=b.g.position;let best=null,bd=Infinity;
 if(b.team!==playerTeam){best={pos:P.pos,isP:true};bd=Math.hypot(P.pos.x-p.x,P.pos.z-p.z)}
 bots.forEach(x=>{if(x!==b&&!x.dead&&x.team!==b.team){const d=Math.hypot(x.g.position.x-p.x,x.g.position.z-p.z);if(d<bd){bd=d;best={pos:x.g.position,bot:x}}}});
 if(!best)return null;best.dist=bd;return best;
}
// Nearby living actors only; dead players and the moving actor are excluded.
function movementActors(self,p){
 const k=window.bspCol?.T.k||.02,near=q=>Math.abs(q.y-p.y)<(window.bspCol?110*k:4)&&Math.hypot(q.x-p.x,q.z-p.z)<(window.bspCol?160*k:5);
 const list=bots.filter(b=>b!==self&&!b.dead&&near(b.g.position)).map(b=>({pos:b.g.position.toArray(),crouch:!!b.crouching}));
 if(self!==P&&P.hp>0&&near(P.pos))list.push({pos:P.pos.toArray(),crouch:!!Phase9.crouching});
 return list;
}
function botUpdate(b,dt){
 const p=b.g.position;
 if(typeof syncBotGear==='function')syncBotGear(b);
 if(b.mixer)tickCharacterPose(b,dt);
 if(b.visualMount){
  const f=Math.min(1,Math.max(0,dt)*15);
  b.visualMount.position.x+=(0-b.visualMount.position.x)*f;
  b.visualMount.position.z+=(0-b.visualMount.position.z)*f;
  b.visualMount.rotation.y+=(0-b.visualMount.rotation.y)*f;
 }
 if(!b.dead)Phase11.updateBotPose(b,dt);
 if(b.dead){b.boostPlan=null;LayoutNav.cancelTraffic(b,performance.now()/1000);BotTactics15D.clearYield(b,performance.now()/1000);b.dead+=dt;const dying=b.deathClip||'death1';if(b.mixer){if(b.cur!==dying)setAnim(b,dying,true)}else b.g.rotation.x=Math.min(1.5,b.dead*5)*-1;
  if(b.dead>Math.max(2.5,b.acts?.[dying]?.getClip().duration||0)){disposeBot(b);bots.splice(bots.indexOf(b),1)}return}
 if(b.blinded>0){b.boostPlan=null;LayoutNav.cancelTraffic(b,performance.now()/1000);BotTactics15D.clearYield(b,performance.now()/1000);b.trafficIntent=null;b.aimPitch=0;b.characterGait=null;if(b.mixer)updateCharacterAnimation(b,false,false);b.vel=[0,0];b.blinded=Math.max(0,b.blinded-dt);b.visibleEnemy=null;b.seenId=null;b.noticeElapsed=0;b.los=false;b.cd=Math.max(b.cd,.3);return}
 // Scale bot thinking/movement frequency for 24-32 player matches; animation stays smooth.
 const step=takeBotStep(b,dt,Phase10.config.players);if(!step)return;
 if(roundWait||(typeof freezeLeft!=='undefined'&&freezeLeft>0))return;
 b.cd=Math.max(0,(b.cd||0)-step);b.combatRecoil=Combat12.recoverRecoil(b.combatRecoil,step,!!(b.burst&&b.visibleEnemy));
 if(b.reloadLeft>0)Combat12.advanceBotReload(b,W[b.weaponId],step);
 const objective=BombMode.botGoal(b),radio=Phase10.radioGoal(b);
 const alertFacing=Phase10.orientAwareness(b,objective?.urgent?objective:radio||objective,step);
 const tg=Phase10.seenEnemy(b,step),hasEnemy=!!tg;
 if(hasEnemy&&Combat12.interruptBotReload(b))b.animHoldUntil=0;
 
 b.aiming=hasEnemy&&tg.dist>12&&['awp','scout','g3sg1','sg550','aug','sg552'].includes(b.weaponId);
 const threat=Phase9.grenadeThreat?.(b);
 const tactical=radio?null:Phase10.tacticalGoal(b,objective,tg);
 const order=objective?.busy||objective?.urgent?objective:threat||radio||tactical||objective||Phase10.goal(b);
 if(b.guardStation)b.guardStation.active=order.stationId===b.guardStation.id;
 const flashTurn=order.mode==='avoid-flash';
 if(flashTurn){b.g.rotation.y=Math.atan2(order.look.x-p.x,order.look.z-p.z);b.visibleEnemy=null;b.seenId=null;b.noticeElapsed=0;}
 if(b.hasBotShield)updateBotShield(b,tg,order,step);
 if(!b.pendingBotThrow&&botChooseWeapon(b,tg,order))b.aiming=hasEnemy&&tg.dist>12&&['awp','scout','g3sg1','sg550','aug','sg552'].includes(b.weaponId);
 // Site defenders and advancing attackers must not abandon their site on
 // every sighting. Shoot while proceeding to the station; fight locally once there.
 const assigned=order===objective&&['defend','advance','guard-bomb','protect-defuser'].includes(order.mode);
 const follow=!!order.force||order===objective&&!hasEnemy||assigned||!!radio&&order===radio;
 const goal=hasEnemy&&!follow?tg.pos:order.pos;
 // A seen opponent above/below the bot is not a straight-line move target.
 // Keep shooting at the visible enemy, but use physically validated GRAPH
 // stairs/ramps rather than pressing into the wall below the ledge.
 const elevatedPursuit=!!activeMapData?.local&&hasEnemy&&!follow&&!!bspCol&&(LocalBSPNav.elevationPursuit(bspCol,p,tg.pos)||LocalBSPNav.windowDetour?.(bspCol,b,tg.pos)||performance.now()/1000<(b.windowPassageRetry||0));
 // Keep the objective priority; replenish in a quiet moment, not while planting or escaping.
 updateBotSilencer(b,order,hasEnemy);
 if(order.mode==='reload-cover'&&b.cd<=0&&!b.reloadLeft)startBotReload(b);
 if(!hasEnemy&&!order.busy&&!order.urgent&&!order.force&&(!b.lastSeen||performance.now()/1000-b.lastSeen.t>2.5)&&b.cd<=0&&!b.reloadLeft&&b.reserve>0&&b.ammo<Math.max(1,Math.floor(W[b.weaponId].mag*.4)))startBotReload(b);
 b.routeJump=false;b.routeJumpTarget=null;b.routeCrouch=false;b.routeLadder=false;
 const pathfinding=!!activeMapData?.local&&!order.hold&&!order.busy&&order.mode!=='avoid-grenade'&&(follow||!hasEnemy||elevatedPursuit);
 const flight=b.localRoute?.flight&&b.onGround===false?b.localRoute.flight:null;
 const allowRemote=pathfinding&&!hasEnemy&&!order.urgent&&!order.busy&&!order.hold&&!order.force&&!threat&&!radio;
 b.remoteDoorWaiting=false;
 if(!allowRemote&&b.remoteDoorRoute){b.remoteDoorRoute=null;if(!flight)b.localRoute=null;}
 const destination=flight?V(...flight.pos):pathfinding?BombMode.route(b,goal,elevatedPursuit?null:order.stationId??null,allowRemote):V(goal.x,goal.y,goal.z);
 b.los=hasEnemy;
 const target=destination,dx=target.x-p.x,dz=target.z-p.z,dist=Math.hypot(dx,dz)||1;
 // Route goals are standing-equivalent; crouched hull centers are 18 units lower.
 const goalDistanceSq=q=>{const offset=pathfinding&&b.crouching&&Number.isInteger(window.bspCol?.crouchHead)&&b.medium!=='ladder'&&b.medium!=='water'?18*bspCol.T.k:0;return (q.x-p.x)**2+(q.y-p.y-offset)**2+(q.z-p.z)**2;};
 const ux=dx/dist,uz=dz/dist,baseSpeed=BSP.maxSpeed(b.weaponId,{scale:window.bspCol?.T.k||.02,zoom:!!b.aiming,shield:!!b.shieldRaised});
 let mx=0,mz=0,sp=baseSpeed*Combat12.recoverTag(b,step);
 const aimYaw=hasEnemy?Math.atan2(p.x-tg.pos.x,p.z-tg.pos.z):b.g.rotation.y;
 const aimAligned=!alertFacing||Math.abs(Math.atan2(Math.sin(aimYaw-b.g.rotation.y),Math.cos(aimYaw-b.g.rotation.y)))<.75;
 const wasCrouching=!!b.crouching;
 if(flight)b.crouching=!!b.localRoute.flightCrouch;
 else if(!order?.hold){
  if(b.routeCrouch||order.stationCrouch&&goalDistanceSq(order.pos)<=order.radius**2)b.crouching=true;
  else if(pathfinding&&(!hasEnemy||elevatedPursuit)){b.crouchTarget=false;b.crouching=false}
  else Phase11.decideBotCrouch(b,hasEnemy,order,step);
 }
 if(window.bspCol&&Number.isInteger(bspCol.crouchHead)&&wasCrouching!==!!b.crouching){
  if(!BSP.changeStance(bspCol,p,wasCrouching,!!b.crouching,!!b.onGround,movementActors(b,p))){b.crouching=wasCrouching;b.crouchTarget=wasCrouching;}
 }
 if(!window.bspCol&&wasCrouching&&!b.crouching&&!LayoutNav.canExpand(p,movementActors(b,p))){b.crouching=true;b.crouchTarget=true;}
 b.aimPitch=botVisualAimPitch(b,tg?.pos,tg?.isP?!!Phase9.crouching:!!tg?.bot?.crouching,window.bspCol);
 if(b.crouching)sp/=3;
 b.st-=step;if(b.st<0){b.st=1+rnd()*2;b.strafe=rnd()<.5?-1:1}
 const ox=p.x,oy=p.y,oz=p.z,oldYaw=b.g.rotation.y;
 if((follow&&!order.hold&&!order.busy&&goalDistanceSq(order.pos)>order.radius*order.radius)||elevatedPursuit&&Math.hypot(dx,dz)>.12){mx=ux;mz=uz}
 let combatHold=false;
 if(hasEnemy&&!order?.busy&&!flashTurn&&order.mode!=='reload-cover'){
  const stationary=follow||elevatedPursuit||order?.hold||radio?.mode==='hold';
  if(!stationary){
   const combat=BotTactics15D.engage(b,target,order);mx=combat.x;mz=combat.z;
   if(b.weaponId!=='knife'&&!b.reloadLeft&&b.cd<.24&&tg.dist>(['awp','scout','g3sg1','sg550'].includes(b.weaponId)?12:5)&&tg.dist<(b.effectiveRange||42)&&!botFriendlyLane(b,tg.pos)){mx=0;mz=0;}
   if(b.team===playerTeam&&b.radioOrder?.mode==='cover'&&p.distanceTo(P.pos)>11){
    const home=P.pos.clone().sub(p).normalize();mx=home.x;mz=home.z;
   }
  }
  // A defender stops before an ordinary shot, not after it. A blocked friendly
  // lane must not cause the bot to camp behind an ally indefinitely.
  const defend=['defend','guard-bomb','protect-defuser'].includes(order.mode);
  if(aimAligned&&defend&&tg.dist<Math.min(16,b.effectiveRange||42)&&!order.force&&!order.urgent&&!botFriendlyLane(b,tg.pos)){mx=0;mz=0;}
  combatHold=b.weaponId!=='knife'&&!order.force&&!order.urgent&&Math.hypot(mx,mz)<.05;
  // Use actual velocity to settle aim for both mobile and station defenders.
  const settling=combatHold&&tg.dist>5&&(b.lastMoveSpeed||0)>15*(window.bspCol?.T.k||.02);
  if(!b.pendingBotThrow&&!b.shieldRaised&&aimAligned&&!settling&&order.mode!=='avoid-grenade'&&(order.mode!=='escape-bomb'||order.hold)&&b.cd<=0&&!b.reloadLeft&&tg.dist<(b.effectiveRange||42)){
   b.g.rotation.y=Math.atan2(p.x-tg.pos.x,p.z-tg.pos.z);
   if(!order.force&&Phase10.maybeBotGrenade(b,tg,step))b.cd=Math.max(b.cd,.8);else botShot(b,tg);
  }
 }else if(!order?.hold&&!follow&&goalDistanceSq(goal)>order.radius*order.radius){mx=ux;mz=uz}
 let obstacleHold=false;
 if(!hasEnemy&&tryBotCoveredEnemyShot(b,order)){mx=0;mz=0;combatHold=true;obstacleHold=true;}
 else if(!hasEnemy&&tryBotMemoryShot(b,order)){mx=0;mz=0;combatHold=true;}
 else if(!hasEnemy&&!b.remoteDoorRoute&&tryBotObstacleShot(b,order,goal,pathfinding)){mx=0;mz=0;combatHold=true;obstacleHold=true;}
 if(pathfinding&&Math.hypot(dx,dz)<.12){mx=0;mz=0;}
 // A marked GRAPH edge is only launched when actual momentum is adequate.
 if(flight&&!order.urgent&&!order.busy&&!order.hold){const threshold=b.localRoute.flightCrouch?Math.min(.12,6*bspCol.T.k):.12;mx=Math.hypot(dx,dz)>threshold?ux:0;mz=Math.hypot(dx,dz)>threshold?uz:0;}
 let calibratedJump=false;
 if(pathfinding&&b.routeJump&&b.onGround&&!combatHold&&!order.hold&&!order.busy&&Math.hypot(mx,mz)>.05&&b.localRoute?.graph){
  const command=LocalBSPNav.jumpCommand(b.localRoute.graph,b,sp,step,performance.now()/1000);
  if(command){mx=command.x;mz=command.z;calibratedJump=command.jump;}
 }
 // A cooperative boost is a temporary physical manoeuvre, not a GRAPH edge.
 const boostGraph=activeMapData?.local?.graph;
 const boostRequested=b.boostPlan||boostGraph&&allowRemote&&goal.y-p.y>=48*bspCol.T.k&&goal.y-p.y<=86*bspCol.T.k&&performance.now()/1000>=(b.boostRetry||0);
 let boost=null;
 if(boostRequested){
  // Older cached navigation modules may lack this optional manoeuvre. Never halt ordinary movement.
  if(typeof LocalBSPNav!=='undefined'&&typeof LocalBSPNav?.boostCommand==='function'){
   boost=LocalBSPNav.boostCommand(boostGraph,b,goal,order.stationId??null,performance.now()/1000,step,sp,movementActors(b,p),bots,!!boostGraph&&allowRemote&&!combatHold&&!b.remoteDoorRoute&&!flight&&!b.routeJump&&!b.routeLadder&&!(window.NAV_BOTS&&window.NavGraph?.graph()));
  }else{
   b.boostPlan=null;b.boostRetry=performance.now()/1000+2;
   if(!missingBoostReported){missingBoostReported=true;RuntimeHealth.fail('compatibility',Error('Navigation module missing boostCommand; normal movement continues. Update game files and reload.'));}
  }
 }
 if(boost){mx=boost.x;mz=boost.z;calibratedJump=boost.jump;b.routeJumpTarget=null;b.routeJump=false;}
 // An actual broken window may have a safe ballistic crossing even where
 // static GRAPH validation dropped the unflagged pane edge. Preserve ordinary
 // combat and routing except while performing this short physical manoeuvre.
 let windowCross=null;
 if(window.bspCol&&!boost&&!flight&&!b.routeJump&&!b.routeLadder&&!order?.urgent&&!order?.busy&&!order?.hold&&!combatHold){
  windowCross=LocalBSPNav.windowPassage?.(bspCol,b,goal,performance.now()/1000,step,sp)||null;
  if(windowCross&&b.crouching){
   // The real pane probe uses an upright 32-unit hull. Combat crouch must not
   // silently turn that verified standing jump into a different manoeuvre.
   if(BSP.changeStance(bspCol,p,true,false,!!b.onGround,movementActors(b,p))){b.crouching=false;b.crouchTarget=false;sp*=3;}
   else{b.windowPassage=null;b.windowPassageRetry=performance.now()/1000+.75;windowCross=null;}
  }
  if(windowCross){mx=windowCross.x;mz=windowCross.z;calibratedJump=windowCross.jump;b.routeJumpTarget=null;}
 }else{b.windowPassage=null;b.windowPassageStall=0;}
 const commandedMove=Math.hypot(mx,mz)>.05;b.trafficBlocked=false;
 b.trafficPriority=!!BombMode.isCarrier?.(b);
 const canYield=pathfinding&&!b.remoteDoorRoute&&!hasEnemy&&!order.urgent&&!order.busy&&!order.hold&&(!order.force||b.trafficPriority&&order.mode==='plant')&&!b.routeJump&&!b.localRoute?.flight&&!b.routeLadder&&!b.crouching&&b.onGround&&b.medium!=='water'&&b.medium!=='ladder'&&!(window.NAV_BOTS&&window.NavGraph?.graph());
 const yielding=windowCross?null:BotTactics15D.trafficYield(b,mx,mz,canYield&&!boost&&!obstacleHold,window.bspCol,bots,performance.now()/1000);
 if(yielding){mx=yielding.x;mz=yielding.z;}

 if(!commandedMove||b.routeJump||b.localRoute?.flight||order.urgent||order.busy)b.trafficPass=null;
 if(!boost&&!windowCross&&commandedMove&&!yielding&&!b.routeJump&&!b.localRoute?.flight){
  const space=BotTactics15D.separate(b,bots,pathfinding?.32:1);mx+=space.x;mz+=space.z;
  const steer=activeMapData?.local?BotTactics15D.obstacleSteer(b,mx,mz,step,sp,bspCol,bots,movementActors(b,p)):BotTactics15D.sidestep(b,mx,mz);
  mx=steer.x;mz=steer.z;
 }
 // Waiting for a physical touch door or following a moving ally is not a
 // failed GRAPH edge. Exclude jump, ladder, swim and urgent orders.
 let navigationWait=!!boost||!!windowCross||!!b.trafficYield||b.trafficConvoyWait||obstacleHold||!!b.remoteDoorWaiting;
 if(!boost&&!windowCross&&!yielding&&commandedMove&&pathfinding&&!hasEnemy&&!order.urgent&&!order.busy&&!order.hold&&!b.routeJump&&!b.localRoute?.flight&&!b.routeLadder&&b.medium!=='water'&&b.onGround&&window.bspCol){
  const k=bspCol.T.k,h=BSP.toHammer(bspCol.T,p.toArray()),d=Math.hypot(dx,dz);
  const end=BSP.toHammer(bspCol.T,[p.x+ux*Math.min(d,48*k),p.y,p.z+uz*Math.min(d,48*k)]);
  const hull=b.crouching&&Number.isInteger(bspCol.crouchHead)?{...bspCol,head:bspCol.crouchHead}:bspCol;
  if(d>.05&&BSPDoors.waitingForPassage(hull,h,end)){mx=0;mz=0;navigationWait=true;}
  else {const factor=BotTactics15D.queueSpeed(b,bots,mx,mz,sp,k);mx*=factor;mz*=factor;navigationWait=navigationWait||factor<.35;}
 }
 const moveLen=Math.hypot(mx,mz);if(moveLen>1){mx/=moveLen;mz/=moveLen}

 // A* follows orders and search memory; visible enemies are tracked directly.
 // Avoid repeated A* on dynamic targets; obstacle recovery clears cached routes.
 const needsMove=moveLen>.05;let actorContact=false;
 const wantsMove=!combatHold&&!order?.hold&&!order?.busy&&(follow||!hasEnemy||elevatedPursuit)&&goalDistanceSq(goal)>order.radius**2;
 const layoutTraffic=!window.bspCol?LayoutNav.trafficStep(b,destination,needsMove&&wantsMove&&!hasEnemy&&!order.urgent&&!order.busy&&!order.hold&&(!order.force||b.trafficPriority&&order.mode==='plant')&&!obstacleHold,bots,performance.now()/1000,movementActors(b,p)):null;
 if(layoutTraffic){
  navigationWait=true;
  if(layoutTraffic.point){const d=layoutTraffic.point.clone().sub(p);d.y=0;const len=d.length();if(len>0){const f=Math.min(sp*step,len)/len;actorContact=LayoutNav.moveActor(p,d.x*f,d.z*f,!!b.crouching,movementActors(b,p));}}
  b.vel=[(p.x-ox)/Math.max(step,.001),(p.z-oz)/Math.max(step,.001)];
  b.layoutNav=null;
 }else if(needsMove&&!window.bspCol&&!hasEnemy){
  const v=BSP.accelerate(b.vel,[mx*sp,mz*sp],step,true),speed=Math.hypot(...v);b.vel=v;
  const actors=movementActors(b,p),move=(x,z)=>{const hit=LayoutNav.moveActor(p,x,z,!!b.crouching,actors);actorContact=hit||actorContact;return hit;};
  if(!LayoutNav.step(b,destination,speed,step,move,actors))move(v[0]*step,v[1]*step);
  if(step>0)b.vel=[(p.x-ox)/step,(p.z-oz)/step];
 }else if(needsMove&&window.NAV_BOTS&&window.bspCol&&window.NavGraph&&NavGraph.graph()&&!hasEnemy){NavGraph.botStep(b,destination,sp,step)}
 else if(window.bspCol){const verticalDrive=order?.hold||order?.busy||combatHold?0:Math.max(-1,Math.min(1,(destination.y-p.y)/(25*bspCol.T.k)));const st={pos:p.toArray(),vy:b.vy||0,on:!!b.onGround,vel:b.vel,jumpHeld:b.jumpHeld,ladderDetach:b.ladderDetach,climb:verticalDrive,swimVertical:verticalDrive,assistBrokenGlass:!combatHold&&!order.hold};BSP.moveActor(bspCol,bspCol.T,st,[mx*sp,mz*sp],step,calibratedJump&&b.onGround&&(commandedMove||!!boost)&&!combatHold&&!order.hold&&!order.busy,!!b.crouching,movementActors(b,p));actorContact=st.actorContact;if(st.jumped&&b.routeJumpTarget&&b.localRoute){b.localRoute.flight=b.routeJumpTarget;b.localRoute.flightCrouch=!!b.crouching;}p.fromArray(st.pos);b.vy=st.vy;b.onGround=st.on;b.medium=st.medium;b.waterLevel=st.waterLevel;b.vel=st.vel;b.jumpHeld=st.jumpHeld;b.ladderDetach=st.ladderDetach;if(st.landed>580){damageBot(b,BSP.fallDamage(st.landed),'generic',null,false,null,'',0,'fall');if(b.dead)return;}}
 else{const v=BSP.accelerate(b.vel,[mx*sp,mz*sp],step,true);actorContact=LayoutNav.moveActor(p,v[0]*step,v[1]*step,!!b.crouching,movementActors(b,p));if(step>0)b.vel=[(p.x-ox)/step,(p.z-oz)/step];}
 const moved=Math.hypot(p.x-ox,p.z-oz);b.lastMoveSpeed=moved/Math.max(step,.001);
 // Unlike the old window wait flag, record ACTUAL physical displacement.
 // A blocked 32-player choke must not restart the same window animation for
 // the rest of the round; back off and let the GRAPH choose a detour.
 LocalBSPNav.windowProgress?.(b,!!windowCross,moved,sp,step,performance.now()/1000);
 // Vertical ladder/water movement is real progress; do not blacklist a climbing edge.
 const progress=boost||b.medium==='ladder'||b.medium==='water'||b.localRoute?.flight?Math.hypot(moved,p.y-oy):moved;
 // Traffic blocks are temporary, not evidence that a GRAPH edge is invalid.
 actorContact=actorContact||b.trafficBlocked;
 b.trafficWait=actorContact&&progress<sp*step*.18?Math.min(2,(b.trafficWait||0)+step):Math.max(0,(b.trafficWait||0)-step);
 BotTactics15D.recover(b,!navigationWait&&!actorContact&&(commandedMove||wantsMove),progress,sp,step,pathfinding);
 const mediumStep=b.medium==='ladder'||b.medium==='water',stepSpeed=progress/Math.max(step,.001),stepRatio=Math.min(1,stepSpeed/(250*(window.bspCol?.T.k||.02)));
 if(stepRatio>.1&&(b.onGround!==false||mediumStep)&&(b.nextFootstep||0)<=performance.now()/1000){Phase10.soundEvent(b.team,p,'step',b.crouching?.12:Math.min(.75,stepSpeed/5*.65));
  if(typeof CS16SFX!=='undefined'&&CS16SFX.footstep&&cam?.position&&p.distanceToSquared(cam.position)<18**2){const audio=botShotAudio(p);const surface=CS16SFX.movementSurface(b.medium,b.waterLevel,()=>groundSoundSurface(p));CS16SFX.footstep(surface,audio.volume*(b.crouching?.16:.45),audio.pan,true);}b.nextFootstep=performance.now()/1000+(b.crouching?.57:.42)/Math.max(.25,stepRatio);}

 if(BombMode.isDefusing?.(b))BombMode.faceBomb?.(b);
 else if(!flashTurn&&hasEnemy&&aimAligned&&order.mode!=='avoid-grenade'&&(order.mode!=='escape-bomb'||order.hold))b.g.rotation.y=Math.atan2(p.x-tg.pos.x,p.z-tg.pos.z);
 else if(!flashTurn&&needsMove&&(!alertFacing||['escape-bomb','avoid-grenade'].includes(order.mode)))b.g.rotation.y=Math.atan2(-ux,-uz);
 if(b.visualMount){
  // The GoldSrc crouched hull lowers its center; cancel that shift in the
  // visual mount, while native crouch animation and hit proxies lower normally.
  b.visualMount.position.y=window.bspCol&&Number.isInteger(bspCol.crouchHead)&&b.crouching?18*bspCol.T.k:0;
  // Preserve the preceding world pose and gently interpolate visual motion.
  const dx=p.x-ox,dz=p.z-oz,y=b.g.rotation.y;
  b.visualMount.position.x=Math.max(-.6,Math.min(.6,b.visualMount.position.x-Math.cos(y)*dx+Math.sin(y)*dz));
  b.visualMount.position.z=Math.max(-.6,Math.min(.6,b.visualMount.position.z-Math.sin(y)*dx-Math.cos(y)*dz));
  let turn=oldYaw-y;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
  b.visualMount.rotation.y=Math.max(-.5,Math.min(.5,b.visualMount.rotation.y+turn));
 }
 b.t+=moved*5;if(b.l){b.l.rotation.x=Math.sin(b.t)*.7;b.r.rotation.x=-Math.sin(b.t)*.7}
 if(b.mixer)updateCharacterAnimation(b,progress>Math.max(.001,sp*step*.18),hasEnemy);

}

// Audio distance and direction follow the listener, never the bot's target.
function botShotAudio(position){
 const listener=cam?.position||P.pos,dx=position.x-listener.x,dy=position.y-listener.y,dz=position.z-listener.z;
 const distance=Math.hypot(dx,dy,dz),forward=cam?.getWorldDirection?.(V())||V(0,0,-1);
 const horizontal=Math.hypot(dx,dz),f=Math.hypot(forward.x,forward.z);
 const pan=horizontal>1e-5&&f>1e-5?Math.max(-1,Math.min(1,(-forward.z*dx+forward.x*dz)/(horizontal*f))):0;
 // No artificial minimum volume for distant battles. Nearby shots remain audible.
 return {volume:.23/(1+distance*.12),pan};
}
// Reuse existing directional attenuation for world cues.
function playWorldSound(name,position,volume=.35,d=.16,f=1800,priority=0){
 if(!position)return;const audio=botShotAudio(position);playOriginalSound(name,volume*audio.volume/.23,d,f,priority,audio.pan);
}
// Conservative fire corridor: do not fire through a teammate, including the human.
function botFriendlyLane(b,target){
 const p=b.g.position,dx=target.x-p.x,dz=target.z-p.z,l2=dx*dx+dz*dz;if(l2<.0001)return false;
 const blocks=q=>{const t=((q.x-p.x)*dx+(q.z-p.z)*dz)/l2;if(t<=0||t>=1)return false;
  return Math.abs(q.y-(p.y+(target.y-p.y)*t))<.85&&Math.hypot(q.x-p.x-t*dx,q.z-p.z-t*dz)<.34;};
 return (b.team===playerTeam&&P.hp>0&&blocks(P.pos))||bots.some(a=>a!==b&&!a.dead&&a.team===b.team&&blocks(a.g.position));
}
// Legacy logical hit proxies for the human and fallback rigs. Native actors use the same animated bodies as player shots.
const BOT_HITBOXES=[['chest',.58,.62,.48,0,1.18],['stomach',.47,.35,.42,0,.71],['head',.3,.3,.3,0,1.62],['leg',.21,.62,.3,-.16,.30],['leg',.21,.62,.3,.16,.30],['arm',.19,.59,.35,-.385,1.14],['arm',.19,.59,.35,.385,1.14]];
function botBoxOffset(part,crouch){
 const local=!!window.bspCol,shift=local&&Number.isInteger(window.bspCol.crouchHead)&&crouch?18*window.bspCol.T.k:0;
 return (local?-.72:0)+shift-(crouch?(part==='head'?.37:.23):0);
}
// Human collision origin is the center of the BSP hull, but the feet in
// the procedural map. Fit the logical damage volumes to the current stance.
// These are not studio bones: the first-person player has no world rig.
function humanHitShape(crouch,col=window.bspCol){
 const scale=col?.T.k||.02,centered=!!col,small=!!col&&Number.isInteger(col.crouchHead)&&crouch;
 const hull=col?(small?36:72)*scale:null;
 const height=col?(crouch?(small?36:56):72)*scale:(crouch?1.05:1.7);
 const bottom=centered?-hull/2:0,unit=col?scale:1.7/72,width=32*unit;
 const legTop=crouch?.32:.40,stomachTop=crouch?.53:.58,headBase=.82;
 const band=(part,w,d,x,lo,hi)=>[part,w*width,(hi-lo)*height,d*width,x*width,bottom+(lo+hi)*height/2,0];
 const boxes=[band('leg',.35,.45,-.19,0,legTop),band('leg',.35,.45,.19,0,legTop),band('stomach',.58,.56,0,legTop,stomachTop),band('chest',.70,.62,0,stomachTop,headBase),band('head',.42,.44,0,headBase,1),band('arm',.18,.45,-.44,stomachTop,headBase),band('arm',.18,.45,.44,stomachTop,headBase)];
 // The raised shield reaches the head, not merely the center of the chest.
 // Keep its original width/thickness and lower-leg exposure; only front
 // bullet traces may intersect this volume.
 const sh=Math.min(52*unit,height),shield=['shield',26.7*unit,sh,8*unit,0,bottom+height*.62,-width*.47];
 return {boxes,shield,chestY:boxes[3][5]};
}
function botTraceBullet(shooter,origin,dir,range,layers=0,travelled=0,ignored=new Set(),bodyBudget=Combat12.penetrationLayers(shooter.weaponId)){
 ray.set(origin,dir);ray.far=range;
 const wall=ray.intersectObjects(obsM)[0];let limit=wall?.distance??range,hit=null;
 const trace=new THREE.Ray(),box=new THREE.Box3(),point=V();
 const test=(pos,yaw,crouch,team,bot,isP)=>{
  if(ignored.has(isP?P:bot))return;
  const dx=pos.x-origin.x,dz=pos.z-origin.z;
  if(dx*dx+dz*dz>(limit+2)**2)return;
  const center=pos.clone().add(V(0,1+botBoxOffset('chest',crouch),0));
  trace.set(origin,dir);if(trace.distanceSqToPoint(center)>(bot?.nativeHitboxes?2.5:1.55)**2)return;
  if(bot?.nativeHitboxes){
   // Use the rendered skeleton pose, including visual interpolation, just as
   // player shots do. A miss must not fall through to the obsolete boxes.
   bot.g.updateMatrixWorld(true);ray.set(origin,dir);ray.far=limit;
   const nativeHit=ray.intersectObjects(bot.shieldRaised&&bot.shieldPart?[...bot.parts,bot.shieldPart]:bot.parts)[0];
   if(nativeHit&&nativeHit.distance<limit){limit=nativeHit.distance;hit={team,bot,isP:false,part:nativeHit.object.userData.part,distance:limit,point:nativeHit.point};}
   return;
  }
  const a=Math.cos(yaw||0),b=Math.sin(yaw||0);
  const local=origin.clone().sub(pos);trace.origin.set(a*local.x-b*local.z,local.y,b*local.x+a*local.z);
  trace.direction.set(a*dir.x-b*dir.z,dir.y,b*dir.x+a*dir.z);
  const human=isP?humanHitShape(crouch):null;
  const shield=human&&Phase9.shieldRaised&&typeof cur==='function'&&(cur()==='shield'||Phase9.shieldActiveWeapon?.())&&trace.direction.z>0&&trace.origin.z<human.shield[6];
  const volumes=human?(shield?[...human.boxes,human.shield]:human.boxes):BOT_HITBOXES;
  for(const [part,w,h,d,x,y,z=0] of volumes){
   const cy=human?y:y+botBoxOffset(part,crouch);
   box.min.set(x-w/2,cy-h/2,z-d/2);box.max.set(x+w/2,cy+h/2,z+d/2);
   if(!trace.intersectBox(box,point))continue;
   const distance=point.distanceTo(trace.origin);if(distance>=limit)continue;
   limit=distance;hit={team,bot,isP,part,distance,point:origin.clone().addScaledVector(dir,distance)};
  }
 };
 if(P.hp>0)test(P.pos,P.yaw,!!Phase9.crouching,playerTeam,null,true);
 for(const b of bots)if(b!==shooter&&!b.dead)test(b.g.position,b.g.rotation.y,!!b.crouching,b.team,b,false);
 if(hit&&window.bspCol?.pointClip&&BSP.pointLineBlocked(window.bspCol,origin,hit.point))hit=null;
 if(hit){
  const chain=[hit],pass=hit.part!=='shield'&&hit.team!==shooter.team&&Combat12.bodyPass(shooter.weaponId,bodyBudget);
  if(pass&&range-hit.distance>.2){
   const step=Math.min(.12,range-hit.distance-.01),nextOrigin=hit.point.clone().addScaledVector(dir,step);
   const nextIgnored=new Set(ignored);nextIgnored.add(hit.isP?P:hit.bot);
   const next=botTraceBullet(shooter,nextOrigin,dir,(range-hit.distance-step)*pass.remainingFactor,layers,travelled+hit.distance+step,nextIgnored,bodyBudget-1);
   for(const other of next.hits||[]){chain.push({...other,distance:other.distance+hit.distance+step,damageFactor:(other.damageFactor??1)*pass.damageFactor});}
  }
  return {hit,hits:chain,end:hit.point,wallContact:null};
 }
 if(!hit&&wall&&layers>0&&window.bspCol?.pointClip){
  const pass=Combat12.verifiedWallPass({col:window.bspCol,collision:BSP,hit:wall,origin,dir,range,weaponId:shooter.weaponId,entryDistance:travelled+wall.distance,obstacles:obsM,THREE});
  if(pass){const next=botTraceBullet(shooter,pass.exit,dir,pass.remaining,layers-1,travelled+pass.travel,ignored,bodyBudget);
   if(next.hit){const hits=(next.hits||[next.hit]).map(h=>({...h,distance:h.distance+pass.travel,damageFactor:(h.damageFactor??1)*pass.damageFactor}));return {...next,hit:hits[0],hits,wallContact:wall};}
  }
 }
 return {hit,hits:[],end:wall?.point||origin.clone().addScaledVector(dir,range),wallContact:wall||null};
}
function botSilenced(b){return (b.weaponId==='usp'||b.weaponId==='m4a1')&&b.silenced===true;}
function updateBotSilencer(b,order,hasEnemy){
 if(b.dead||b.hasBotShield||!['usp','m4a1'].includes(b.weaponId))return false;
 if(hasEnemy||order.busy||order.urgent||order.force||b.pendingBotThrow||b.reloadLeft||b.cd>0||(b.lastSeen&&performance.now()/1000-b.lastSeen.t<3))return false;
 // A persistent preference, not a response to momentary tactical orders.
 // Alternating hold/advance/guard orders used to repeatedly attach/detach.
 const want=b.personality==='defensive';
 if(want===botSilenced(b))return false;
 b.silenced=want;b.cd=b.weaponId==='usp'?2.5:3;b.burst=0;
 b.lastSilencerToggle={at:performance.now(),attached:want};
 const audio=botShotAudio(b.g.position);playOriginalSound(b.weaponId+'_silencer_'+(want?'on':'off')+'.wav',audio.volume,.15,1400,0,audio.pan);return true;
}
// Keep both carried magazines and the existing shared caliber pool when switching.
function botSwitchCarried(b,next){
 if(!next||!W[next.id]||next.id===b.weaponId||(b.hasBotShield&&(W[next.id].slot==='primary'||next.id==='elite')))return false;
 const oldId=b.weaponId,oldSlot=W[oldId]?.slot;
 const stored={id:oldId,mag:b.ammo,res:b.reserve||0,silenced:botSilenced(b)};
 if(b.ammoPool)stored.res=undefined;
 const save=b.ammoPool?Object.assign(Economy45.state(b.ammoPool,oldId,stored.mag),{id:oldId,silenced:stored.silenced}):stored;
 if(oldSlot==='primary')b.emptyPrimary=save;
 else if(oldSlot==='pistol')b.pistolState=save;
 const mag=next.mag||0,res=next.res||0,silenced=!!next.silenced;
 delete b.reserve;equipBot(b,b.teamIndex,next.id);b.ammo=mag;
 if(b.ammoPool)Economy45.bindBot(b,next.id,b.ammoPool);else b.reserve=res;
 if(next.id==='usp'||next.id==='m4a1')b.silenced=silenced;
 if(W[next.id].slot==='primary')b.emptyPrimary=null;
 b.reloadLeft=0;b.reloadStage=null;b.cd=Combat12.deployTime(next.id);b.burst=0;b.nextWeaponChoice=(typeof performance!=='undefined'?performance.now()/1000:0)+1.4;
 return true;
}
// Shield carriers use their pistol, alternate protected approach and fire,
// and never attack/reload in the raised state. Timers are simulation-time.
function updateBotShield(b,enemy,order,dt){
 if(!b.hasBotShield)return false;
 b.shieldWait=Math.max(0,(b.shieldWait||0)-dt);
 const ready=b.shieldReady&&W[b.weaponId]?.slot==='pistol'&&b.weaponId!=='elite';
 const threat=ready&&enemy&&enemy.dist>3&&enemy.dist<20&&!order?.busy&&!order?.urgent&&!order?.force&&!b.pendingBotThrow&&!b.reloadLeft&&b.ammo>0;
 let desired=!!b.shieldRaised;
 if(!threat)desired=false;
 else if(b.shieldWait<=0&&b.cd<=0)desired=!desired;
 if(desired===!!b.shieldRaised)return false;
 b.shieldRaised=desired;b.shieldWait=desired?1.0:1.35;b.cd=Math.max(b.cd||0,.4);b.animHoldUntil=0;
 return true;
}
function botChooseWeapon(b,enemy,order){
 if(!b.botId||b.dead||b.reloadLeft||b.cd>0||order?.busy||order?.urgent||order?.force||performance.now()/1000<(b.nextWeaponChoice||0))return false;
 const slot=W[b.weaponId]?.slot,primary=b.emptyPrimary,pistol=b.pistolState;
 const available=s=>s&&W[s.id]&&(s.mag>0||s.res>0),loaded=s=>available(s)&&s.mag>0;
 const sniper=['awp','scout','g3sg1','sg550'].includes(b.weaponId);
 if(slot==='primary'&&loaded(pistol)&&((enemy&&b.ammo===0)||(enemy&&sniper&&enemy.dist<3.5)))return botSwitchCarried(b,pistol);
 if(slot==='pistol'&&available(primary)&&(!enemy||enemy.dist>8||b.ammo===0&&!b.reserve))return botSwitchCarried(b,primary);
 if(slot==='melee'&&(available(primary)||available(pistol)))return botSwitchCarried(b,available(primary)?primary:pistol);
 return false;
}
function botFirePlan(id,distance,zoom=false){
 const w=W[id],cadence=Combat12.fireInterval(id,zoom);
 if(!w.auto)return {size:1,pause:Math.max(cadence,.85)};
 if(['g3sg1','sg550','xm1014'].includes(id))return {size:1,pause:Math.max(cadence,distance>12?.48:.32)};
 const smg=['mac10','tmp','mp5','ump45','p90'].includes(id);
 const size=distance<5?(smg?8:6):distance<12?(smg?4:3):distance<22?2:1;
 return {size,pause:Math.max(cadence,distance>22?.48:distance>12?.32:.23)};
}
// Native third-person sequence families. Never use pistol fire as knife attack.
function botAnimationFamily(id){
 if(id==='knife')return 'knife';if(id==='elite')return 'dualpistols';
 if(id==='m3'||id==='xm1014')return 'shotgun';if(id==='m249')return 'm249';
 if(id==='ak47')return 'ak47';if(id==='mp5')return 'mp5';
 if(id==='c4')return 'c4';if(['hegrenade','flashbang','smokegrenade'].includes(id))return 'grenade';
 if(W[id]?.slot==='pistol')return 'onehanded';
 if(['m4a1','famas','galil','aug','sg552'].includes(id))return 'carbine';
 return 'rifle';
}
function botAnimationClip(b,verb,id=b.weaponId){
 const prefix=b.crouching?'crouch_':'ref_',family=botAnimationFamily(id),shielded=!!b.shieldRaised;
 const shieldFamily=family==='knife'?'shieldknife':family==='grenade'?'shieldgren':'shieldgun';
 const action=verb==='shoot'&&family==='dualpistols'&&b.dualVisualSide?'shoot2':verb;
 const names=[];
 if(shielded){if(verb==='aim'&&family!=='knife'&&family!=='grenade')names.push(prefix+'aim_shielded');names.push(prefix+action+'_'+shieldFamily)}
 if(b.shieldReady&&family==='onehanded'&&!shielded)names.push(prefix+action+'_shieldgun');
 names.push(prefix+action+'_'+family,prefix+verb+'_'+family);
 // Low-poly fallback and weapon families lacking a dedicated reload clip.
 if(['knife','grenade','c4'].includes(family)&&verb==='shoot')return names.find(n=>b.acts?.[n])||null;
 if(verb!=='aim')names.push(prefix+verb+'_'+(W[id]?.slot==='pistol'?'onehanded':'rifle'));
 else names.push(b.crouching?'crouch_idle':'idle1');
 return names.find(n=>b.acts?.[n])||null;
}
function playBotAction(b,verb,id=b.weaponId,duration=null){
 if(!b.mixer)return false;
 const clip=botAnimationClip(b,verb,id);if(!clip)return false;
 const action=setAnim(b,clip,true)||b.acts[clip],length=action?.getClip?.().duration||.22;
 const hold=Math.max(.05,duration??length);action?.setEffectiveTimeScale?.(length/hold);
 b.animHoldUntil=performance.now()/1000+hold;return true;
}
function updateCharacterAnimation(b,moving,hasEnemy){
 const t=performance.now()/1000,planting=!!BombMode.isPlanting?.(b),defusing=!!BombMode.isDefusing?.(b);
 // Gameplay reload advances at the bot's AI tick, but its animation plays at
 // render rate. In crowded matches the latter can finish first: hold the
 // authored reload pose until ammunition is actually committed.
 if(b.reloadLeft>0&&/^(ref|crouch)_reload_/.test(b.cur||''))b.animHoldUntil=Math.max(b.animHoldUntil||0,t+Math.min(.25,b.reloadLeft));
 const gait=moving&&b.medium!=='water'&&b.medium!=='ladder'&&b.onGround!==false?(b.crouching?'crouchrun':b.lastMoveSpeed<2?'walk':'run'):null;
 b.characterGait=planting||defusing?null:gait;
 b.objectivePose=planting||defusing;
 if(planting){if(!b.plantAnimActive){b.plantAnimActive=playBotAction(b,'shoot','c4',3);}if(b.plantAnimActive)return;}
 if(defusing){b.defuseAnimActive=true;setAnim(b,botAnimationClip(b,'aim')||(b.crouching?'crouch_idle':'idle1'));return;}
 if(b.plantAnimActive||b.defuseAnimActive){b.plantAnimActive=false;b.defuseAnimActive=false;b.animHoldUntil=0;}
 if((b.animHoldUntil||0)>t){
  // Keep the action phase when gait starts/stops mid-shot or mid-reload.
  const layer=!!(b.nativeLayers&&gait&&/^(ref|crouch)_(aim|shoot|reload)/.test(b.cur));
  if(b.poseAction&&layer!==b.poseLayered)setAnim(b,b.cur,b.poseOnce,true);
  else if(b.poseLayered)setCharacterGait(b,gait);
  return;
 }
 let clip;
 if(b.medium==='water')clip=moving?'swim':'treadwater';
 else if(b.medium==='ladder'){clip=b.acts?.walk?'walk':'run';b.characterGait=null;}
 else if(b.onGround===false&&Math.abs(b.vy||0)>.1)clip='jump';
 else if(moving&&!b.nativeLayers)clip=gait||'run';
 if(clip&&!b.acts?.[clip])clip=null;
 if(!clip)clip=botAnimationClip(b,'aim')||(b.crouching?'crouch_idle':'idle1');
 setAnim(b,clip);
 if(['run','walk','crouchrun'].includes(b.cur)){
  const speed=b.medium==='ladder'?b.vy||0:b.lastMoveSpeed||0;
  const rate=b.medium==='ladder'?(Math.abs(speed)<.02?0:Math.sign(speed)*Math.min(1.35,Math.abs(speed)/2)):Math.max(.25,Math.min(1.35,speed/(b.crouching?1.67:b.cur==='walk'?2:5)));
  b.poseAction?.setEffectiveTimeScale?.(rate);
 }
}
function startBotReload(b){if(b.shieldRaised)return false;const w=W[b.weaponId];if(!Combat12.beginBotReload(b,w))return false;
 b.lastReload=performance.now();b.burst=0;
 playBotAction(b,'reload',b.weaponId,b.reloadStage?(.55+(w.mag-b.ammo)* (b.weaponId==='m3'?.45:.30)):w.rl);return true;
}
// One conservative attempt at a confirmed last-seen position, never a live hidden target.
// No probing on easy/normal, during objective work, or without a proven static wall exit.
function tryBotMemoryShot(b,order){
 const col=window.bspCol,m=b.lastSeen,now=performance.now()/1000;
 if(!['hard','expert'].includes(Phase10.config?.difficulty)||!col?.pointClip||!m?.confirmed||!m.pos||now-m.t<0||now-m.t>.8||b.memoryShotAt===m.t||now<(b.memoryProbeAt||0))return false;
 if(b.dead||b.blinded>0||b.visibleEnemy||b.cd>0||b.reloadLeft||b.pendingBotThrow||b.shieldRaised||!(b.ammo>0)||!Combat12.penetrationLayers(b.weaponId)||order?.busy||order?.urgent||order?.force||['avoid-flash','avoid-grenade','escape-bomb','reload-cover','take-cover','retreat','regroup'].includes(order?.mode))return false;
 const p=b.g.position,k=col.T.k,dist=p.distanceTo(m.pos);
 if(dist>600*k||dist<64*k||(b.lastMoveSpeed||0)>15*k||b.onGround===false)return false;
 const yaw=Math.atan2(p.x-m.pos.x,p.z-m.pos.z),delta=Math.atan2(Math.sin(yaw-b.g.rotation.y),Math.cos(yaw-b.g.rotation.y));
 if(Math.abs(delta)>.65)return false;
 b.memoryProbeAt=now+.2;
 if(botFriendlyLane(b,m.pos)||Phase9.blocksSight(p,m.pos,{startCrouch:!!b.crouching,endCrouch:m.crouching}))return false;
 const eye=(28-(b.crouching?(Number.isInteger(col.crouchHead)?16:9):0))*k;
 const origin=p.clone().add(V(0,eye,0)),target=m.pos.clone().add(V(0,m.isP?humanHitShape(m.crouching,col).chestY:1.18+botBoxOffset('chest',m.crouching),0));
 const dir=target.clone().sub(origin),length=dir.length();if(length<=0)return false;dir.normalize();
 const range=Combat12.shotRange(b.weaponId,W[b.weaponId].slot,k);ray.set(origin,dir);ray.far=length;
 const wall=ray.intersectObjects(obsM)[0];if(!wall)return false;
 const pass=Combat12.verifiedWallPass({col,collision:BSP,hit:wall,origin,dir,range,weaponId:b.weaponId,entryDistance:wall.distance,obstacles:obsM,THREE});
 if(!pass||pass.travel>=length||length-pass.travel>pass.remaining||BSP.pointLineBlocked(col,pass.exit,target))return false;
 // No extra wall or moving brush between the proven exit and the remembered point.
 ray.set(pass.exit,dir);ray.far=length-pass.travel;if(ray.intersectObjects(obsM).length)return false;
 const contact=botTraceBullet(b,origin,dir,range,1).hit;if(contact?.team===b.team)return false;
 b.memoryShotAt=m.t;b.g.rotation.y=yaw;
 b.aimPitch=botVisualAimPitch(b,m.pos,m.crouching,col);
 botShot(b,{pos:m.pos.clone(),dist,memoryAim:target});return true;
}
// Deliberate obstacle attacks are quiet-navigation work only. Use the ordinary
// weapon loop (ammo, spread, recoil, cadence), or a close-range knife stab.
// Fire at an actual breakable between bot and an opponent when sightline
// is otherwise physically open. This is distinct from navigation/path repair.
function tryBotCoveredEnemyShot(b,order){
 const col=window.bspCol,probe=b.obstructedEnemy,now=performance.now()/1000;
 if(!col?.local||!probe||now-probe.t>.65||now-(b.obstacleSeenSince??now)<(b.skill?.reaction??.5)||b.dead||b.blinded>0||b.shieldRaised||b.pendingBotThrow||b.reloadLeft||b.cd>0||order?.busy||order?.urgent||order?.force||order?.hold||b.weaponId==='knife'&&!b.onGround||!W[b.weaponId]||!['pistol','primary'].includes(W[b.weaponId].slot)||!b.ammo||!b.onGround)return false;
 const enemy=probe.isP?P.hp>0&&!over?P.pos:null:probe.bot&&!probe.bot.dead?probe.bot.g.position:null;
 if(!enemy||enemy.distanceToSquared(probe.pos)>(col.T.k*32)**2||botFriendlyLane(b,enemy))return false;
 const fresh=BSPBreakables.combatTarget(col,b,{pos:enemy,isP:probe.isP,id:probe.id,crouching:probe.isP?!!Phase9.crouching:!!probe.bot.crouching,remembered:b.lastSeen?.id===probe.id&&b.lastSeen.confirmed&&now-b.lastSeen.t<2},ray,obsM);
 if(!fresh||fresh.item!==probe.item||!BSPBreakables.active(fresh.item)||botFriendlyLane(b,fresh.point))return false;
 const origin=b.g.position.clone().add(V(0,(28-(b.crouching?Number.isInteger(col.crouchHead)?16:9:0))*col.T.k,0));
 const delta=fresh.point.clone().sub(origin),dist=delta.length();if(dist<.01||dist>Combat12.shotRange(b.weaponId,W[b.weaponId].slot,col.T.k))return false;
 const contact=botTraceBullet(b,origin,delta.normalize(),dist+col.T.k,0);
 if(contact.hit||contact.wallContact?.object?.userData?.breakable!==fresh.item)return false;
 b.g.rotation.y=Math.atan2(b.g.position.x-fresh.point.x,b.g.position.z-fresh.point.z);
 b.aimPitch=Math.atan2(fresh.point.y-origin.y,Math.max(.1,Math.hypot(delta.x,delta.z)));
 botShot(b,{pos:fresh.point,dist,memoryAim:fresh.point,obstacle:fresh.item});
 return true;
}
function tryBotObstacleShot(b,order,goal,pathfinding){
 const col=window.bspCol,now=performance.now()/1000,knife=b.weaponId==='knife';
 if(!pathfinding||!col||b.dead||b.blinded>0||b.visibleEnemy||b.pendingBotThrow||b.shieldRaised||order.busy||order.urgent||order.force||order.hold||['avoid-flash','avoid-grenade','escape-bomb','reload-cover','take-cover','retreat','regroup'].includes(order.mode)||!W[b.weaponId]||(!knife&&(!['primary','pistol'].includes(W[b.weaponId].slot)||!(b.ammo>0)))||b.reloadLeft)return false;
 if(now>=(b.obstacleProbeAt||0)||b.obstacleProbePos?.distanceToSquared(b.g.position)>(8*col.T.k)**2||b.obstacleProbeGoal?.distanceToSquared(goal)>(8*col.T.k)**2||b.obstacleProbeGraph!==b.localRoute?.graph||b.obstacleProbeRevision!==b.localRoute?.geometryRevision){
  b.obstacleProbeAt=now+.25;b.obstacleProbePos=b.g.position.clone();b.obstacleProbeGoal=goal.clone();b.obstacleProbeGraph=b.localRoute?.graph;b.obstacleProbeRevision=b.localRoute?.geometryRevision;
  b.obstacleTarget=BSPBreakables.passageTarget(col,b,goal,ray);
 }
 const target=b.obstacleTarget;
 if(!target||!BSPBreakables.active(target.item)||b.localRoute?.direct||b.localRoute?.points?.length||b.localRoute?.flight||b.localRoute?.stationId!=null||b.routeJump||b.routeLadder||!b.onGround||b.crouching||b.medium==='water'||b.medium==='ladder')return false;
 const origin=b.g.position.clone().add(V(0,28*col.T.k,0)),delta=target.point.clone().sub(origin),dist=delta.length();
 if(dist<=.001||dist>(knife?32:160)*col.T.k+1e-6||botFriendlyLane(b,target.point))return false;
 const contact=botTraceBullet(b,origin,delta.normalize(),knife?32*col.T.k+1e-6:dist+.03,0);
 if(contact.hit||contact.wallContact?.object?.userData?.breakable!==target.item)return false;
 if(knife&&col.pointClip){const wall=contact.wallContact,before=wall.point.clone().addScaledVector(delta,-Math.min(col.T.k*.25,wall.distance*.5));if(BSP.pointLineBlocked(col,origin,before))return false;}
 b.g.rotation.y=Math.atan2(b.g.position.x-target.point.x,b.g.position.z-target.point.z);
 b.aimPitch=Math.atan2(target.point.y-origin.y,Math.max(.1,Math.hypot(delta.x,delta.z)));
 if(b.cd<=0&&(b.lastMoveSpeed||0)<=15*col.T.k)botShot(b,{pos:target.point,dist,memoryAim:target.point,obstacle:target.item});
 return true;
}
function botShot(b,tg){
 if(!b.weaponId||b.dead||!tg||b.cd>0||b.shieldRaised)return;
 if(!tg.memoryAim){
  const actual=tg.isP?P.pos:tg.bot?.g.position;
  if(!actual||actual.distanceToSquared(tg.pos)>4||!los(b,actual)||Phase9.blocksSight(b.g.position,actual,{startCrouch:!!b.crouching,endCrouch:!!(tg.isP?Phase9.crouching:tg.bot?.crouching)})){b.visibleEnemy=null;b.seenId=null;b.noticeElapsed=0;return}
  tg={...tg,pos:actual,dist:b.g.position.distanceTo(actual)};
 }
 if(b.botId&&botFriendlyLane(b,tg.pos)){b.cd=.12;return;}
 const w=W[b.weaponId];if(b.reloadLeft>0)return;
 if(b.weaponId==='knife'){
  const col=window.bspCol,range=32*(col?.T.k||.02);if(tg.dist>range+(tg.obstacle?1e-6:0))return;
  // An intentional obstacle stab is never treated as an actor attack. Recheck
  // current contact and point hull, even if the navigation probe was cached.
  if(tg.obstacle){
   if(!col||!BSPBreakables.active(tg.obstacle)||!tg.memoryAim||b.crouching||!b.onGround||b.medium==='water'||b.medium==='ladder')return;
   const origin=b.g.position.clone().add(V(0,28*col.T.k,0)),delta=tg.memoryAim.clone().sub(origin),dist=delta.length();
   if(dist<=.001||dist>range+1e-6)return;
   const dir=delta.normalize(),contact=botTraceBullet(b,origin,dir,range+1e-6,0),wall=contact.wallContact;
   if(contact.hit||wall?.object?.userData?.breakable!==tg.obstacle||wall.distance>range+1e-6)return;
   const before=wall.point.clone().addScaledVector(dir,-Math.min(col.T.k*.25,wall.distance*.5));
   if(col.pointClip&&BSP.pointLineBlocked(col,origin,before))return;
   const raw=Combat12.baseDamage('knife',{knifeStab:true});
   b.cd=1.1;playBotAction(b,'shoot','knife',b.cd);
   const audio=botShotAudio(b.g.position);playOriginalSound('knife_hitwall1.wav',audio.volume,.15,1400,0,audio.pan);
   BSPBreakables.hit(wall.object,raw,wall.point);
   b.lastShot={sound:'knife_hitwall1.wav',damage:raw,at:performance.now(),cooldown:b.cd};return;
  }
  b.cd=1.1;playBotAction(b,'shoot','knife',b.cd);const audio=botShotAudio(b.g.position);playOriginalSound('knife_stab.wav',audio.volume,.15,1400,0,audio.pan);
  const backstab=Combat12.knifeBackstab(tg.pos.x-b.g.position.x,tg.pos.z-b.g.position.z,tg.isP?P.yaw:tg.bot?.g.rotation.y);
  const raw=Combat12.baseDamage('knife',{knifeStab:true,backstab});
  if(tg.isP)hurt(raw,b.g.position,'melee',b,'chest','knife',tg.dist);else damageBot(tg.bot,raw,'chest',null,false,b,'knife',tg.dist,'melee');
  b.lastShot={sound:'knife_stab.wav',damage:raw,at:performance.now(),cooldown:b.cd};return;
 }
 if(b.ammo<=0){if(!(b.reserve>0)){
  if(w.slot==='primary'){const pistol=b.pistolState||{id:b.team==='CT'?'usp':'glock18',mag:0,res:0};botSwitchCarried(b,pistol)}
  else if(b.botId){const primary=b.emptyPrimary;if(primary&&(primary.mag>0||primary.res>0))botSwitchCarried(b,primary);else botSwitchCarried(b,{id:'knife',mag:0,res:0})}
  else b.cd=1;return}startBotReload(b);
  return}

 b.ammo--;b.burst=(b.burst||0)+1;
 const plan=botFirePlan(b.weaponId,tg.dist,!!b.aiming),cadence=Combat12.fireInterval(b.weaponId,!!b.aiming);
 b.cd=b.burst<plan.size?cadence:Math.max(cadence,plan.pause+rnd()*(w.auto?.12:.45));if(b.burst>=plan.size)b.burst=0;
 const col=window.bspCol,local=!!col,eye=local?(28-(b.crouching?(Number.isInteger(col.crouchHead)?16:9):0))*col.T.k:(b.crouching?.95:1.35),o=V(b.g.position.x,b.g.position.y+eye,b.g.position.z);
 const scale=window.bspCol?.T.k||.02,moving=(b.lastMoveSpeed||0)>15*scale,silenced=botSilenced(b);
 const spread=Combat12.shotSpread(b.weaponId,{speed:b.lastMoveSpeed||0,onGround:b.onGround!==false,crouch:!!b.crouching,zoom:!!b.aiming,silenced,shots:b.combatRecoil?.shots||0,scale});
 const crouched=tg.isP?!!Phase9.crouching:!!tg.bot?.crouching;
 let target=tg.memoryAim?.clone()||tg.pos.clone().add(V(0,tg.isP?humanHitShape(crouched).chestY:1.18+botBoxOffset('chest',crouched),0));
 if(!tg.memoryAim&&!tg.isP&&tg.bot?.nativeHitboxes){
  const chest=tg.bot.parts.find(p=>p.userData.studioHitgroup===2&&/Spine2$/i.test(p.parent?.name||''))||tg.bot.parts.find(p=>p.userData.part==='chest');
  if(chest){tg.bot.g.updateMatrixWorld(true);target=chest.getWorldPosition(V());}
 }
 const forward=target.sub(o).normalize(),right=V(-forward.z,0,forward.x).normalize(),up=right.clone().cross(forward).normalize();
 const skill=Math.max(.08,Math.min(.95,b.accuracy??.45)),aimError=(1-skill)*.105*(moving?1.35:1);
 const recoil=b.combatRecoil||{},control=Math.max(.18,1-skill);
 const aim=forward.clone().addScaledVector(right,(recoil.yaw||0)*control+(rnd()+rnd()-1)*aimError).addScaledVector(up,(recoil.pitch||0)*control+(rnd()+rnd()-1)*aimError).normalize();
 const pellets=Combat12.TABLE[b.weaponId]?.pellets||1,maxRange=Combat12.shotRange(b.weaponId,w.slot,scale);
 const raw=Combat12.baseDamage(b.weaponId,{silenced}),volley=new Map();
 for(let n=0;n<pellets;n++){
  const [sx,sy]=Combat12.spreadOffset(b.weaponId,spread,rnd);
  const dir=aim.clone().addScaledVector(right,sx).addScaledVector(up,sy).normalize();
  if(tg.obstacle&&!BSPBreakables.active(tg.obstacle))break;
  const {hit,hits,end,wallContact}=botTraceBullet(b,o,dir,maxRange,tg.obstacle?0:Combat12.penetrationLayers(b.weaponId));
  // An obstacle volley must never damage unrelated brushes or actors.
  if(tg.obstacle&&(hit||wallContact?.object?.userData?.breakable!==tg.obstacle)){if(n===0)tracer(o,end,b.team==='CT'?0x66aaff:0xffcc55);continue;}
  const glassBroken=wallContact&&BSPBreakables.hit(wallContact.object,Combat12.rangeDamage(b.weaponId,raw,wallContact.distance,{silenced,scale}),wallContact.point);
  if(wallContact&&typeof Phase13!=='undefined')Phase13.wallHit?.(wallContact,dir,o);
  if(n===0)tracer(o,end,b.team==='CT'?0x66aaff:0xffcc55);
  let impacts=hits||[];
  // Breaking a shootable glass brush does not consume the whole AWP shot.
  // Start a fresh trace only if that brush was actually destroyed.
  if(glassBroken&&Combat12.penetrationLayers(b.weaponId)>0){
   const advance=scale*.5,remaining=maxRange-wallContact.distance-advance;
   if(remaining>0){
    const behind=botTraceBullet(b,wallContact.point.clone().addScaledVector(dir,advance),dir,remaining,Combat12.penetrationLayers(b.weaponId)-1);
    impacts=[...impacts,...(behind.hits||[]).map(h=>({...h,distance:h.distance+wallContact.distance+advance,damageFactor:(h.damageFactor??1)*.8}))];
   }
  }
  for(const impact of impacts){
   if(impact.team===b.team)break;
   if(impact.part==='shield'){if(impact.isP)Phase9.shieldImpact();else playOriginalSound('ric_metal-1.wav',.17);break;}
   const hitRaw=raw*(impact.damageFactor??1);
   if(pellets>1){const victim=impact.isP?P:impact.bot;if(!volley.has(victim))volley.set(victim,[]);volley.get(victim).push({raw:hitRaw,part:impact.part,distance:impact.distance,point:impact.point});}
   else if(impact.isP)hurt(hitRaw,b.g.position,'bullet',b,impact.part,b.weaponId,impact.distance);
   else damageBot(impact.bot,hitRaw,impact.part,impact.point,false,b,b.weaponId,impact.distance,'bullet',null,o);
  }
 }
 for(const [victim,hits] of volley){const first=hits[0];if(victim===P)hurt(raw,b.g.position,'bullet',b,first.part,b.weaponId,first.distance,hits);else damageBot(victim,raw,first.part,first.point,false,b,b.weaponId,first.distance,'bullet',hits,o);}
 b.combatRecoil=Combat12.fireRecoil(b.combatRecoil,b.weaponId,{moving:(b.lastMoveSpeed||0)>1*scale,crouch:!!b.crouching,air:b.onGround===false,random:rnd()});
 const sound=b.weaponId==='usp'?(silenced?'usp1.wav':'usp_unsil-1.wav'):b.weaponId==='m4a1'?(silenced?'m4a1-1.wav':'m4a1_unsil-1.wav'):w.sound;
 const audio=botShotAudio(b.g.position); playOriginalSound(WeaponImport.audioRoute(b.weaponId,sound),audio.volume*(silenced?.65:1),.15,1400,0,audio.pan);
 if(b.weaponId==='elite')b.dualVisualSide=!b.dualVisualSide;
 playBotAction(b,'shoot',b.weaponId,Math.min(b.cd,.30));
 Phase10.soundEvent(b.team,b.g.position,'shot',silenced?.7:1.6);Phase10.muzzleBot(b);b.lastShot={sound,damage:raw,at:performance.now(),cooldown:b.cd};
}
function hurt(d,source=null,kind='bullet',killer=null,hitgroup='chest',weaponId='',distance=0,pelletHits=null){
 if(over||P.hp<=0)return;
 // All bullet callers already resolved the nearest shield/body intersection.
 const options={weaponId,raw:d,hitgroup,range:distance,armor,helmet,kind,silenced:!!killer&&botSilenced(killer),scale:window.bspCol?.T.k||.02};
 const result=pelletHits?Combat12.resolveVolley(pelletHits,options):Combat12.resolve(options);hitgroup=result.hitgroup;
 armor=Math.max(0,armor-result.armorUsed);if(armor===0)helmet=false;P.hp-=result.appliedHpDamage;Combat12.tag(P,result.rawDamage,kind,{weaponId,hitgroup,crouch:!!Phase9.crouching,scale:window.bspCol?.T.k||.02,source,position:P.pos});if(kind==='fall'&&P.hp>0)CS16SFX.play('player/pl_fallpain1.wav',.28);else CS16SFX.hurt({...result,hpDamage:result.appliedHpDamage},P.hp,hitgroup);dmgA=.7;hud();
 if(P.hp<=0){P.hp=0;Phase10.onPlayerDeath(killer);killFeed({name:"YOU",team:playerTeam},hitgroup==='head',killer,weaponId||kind,false);Phase13.onDeath();resetInputs();reloadSfxToken++;if(document.pointerLockElement)document.exitPointerLock();}
}
/* FX */
function removeTracer(t){t.l.parent?.remove(t.l);t.l.geometry.dispose();t.l.material.dispose()}
function removeParticle(p){p.m.parent?.remove(p.m);p.m.material.dispose()}
function clearCombatFX(){for(const t of tr)removeTracer(t);for(const p of pt)removeParticle(p);tr.length=pt.length=0}
function tracer(a,b,col){if(tr.length>=96)removeTracer(tr.shift());const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.9}));S.add(l);tr.push({l,t:.07})}
const PG=new THREE.BoxGeometry(.12,.12,.12);
function burst(p,col,n){for(let i=0;i<n;i++){if(pt.length>=128)removeParticle(pt.shift());const m=new THREE.Mesh(PG,new THREE.MeshBasicMaterial({color:col}));m.position.copy(p);S.add(m);pt.push({m,v:V((rnd()-.5)*4,rnd()*3,(rnd()-.5)*4),t:.5})}}
// Consume cosmetic break events once, using the existing bounded particle pool
// and audio voice budget. No gameplay RNG, collision or raycast registration.
function updateBreakableFX(){
 for(const {pos,profile,scale} of BSPBreakables.takeEffects()){
  const distance=pos.distanceTo(cam?.position||P.pos);if(distance>1200*scale)continue;
  const audio=botShotAudio(pos);snd(audio.volume*.85,profile.duration,profile.frequency,0,audio.pan);
  if(distance>700*scale)continue;
  const k=scale/.02;
  for(let i=0;i<profile.count;i++){
   if(pt.length>=128)break;
   const a=i*2.39996323,m=new THREE.Mesh(PG,new THREE.MeshBasicMaterial({color:profile.color}));
   m.position.copy(pos);m.scale.set(...profile.size.map(v=>v*k));m.rotation.set(a*.7,a,a*.3);S.add(m);
   pt.push({m,v:V(Math.cos(a)*2.2*k,(1.2+(i%3)*.65)*k,Math.sin(a)*2.2*k),t:.48+(i%3)*.08,gravity:12*k,spin:3+i%4});
  }
 }
}
function say(t){$('msg').textContent=t;$('msg').style.opacity=1;msgT=1.8}
/* SHOOT */
let pendingKnife=null,pendingAutoReload=null;
function scheduleAutoReload(k,delay=.25){pendingAutoReload={k,display:cur(),round,delay}}
function updateAutoReload(dt){const a=pendingAutoReload;if(!a)return;
 if(a.round!==round||cur()!==a.display||P.hp<=0||roundWait>0||reloading||A[a.k]?.mag!==0){pendingAutoReload=null;return}
 a.delay-=dt;
 // Reload cannot begin with the shield raised. Keep the request until the
 // player lowers it, instead of silently discarding the only auto-reload.
 if(a.display==='shield'&&Phase9.shieldRaised)return;
 if(a.delay<=1e-8&&swapT<=0&&!WeaponModes15C.active()&&!inputBlocked()){pendingAutoReload=null;reload()}
}
function knifeTrace(stab){
 const origin=cam.position,dir=cam.getWorldDirection(V()),col=window.bspCol,scale=col?.T.k||.02,reach=(stab?32:48)*scale;
 const meshes=targets(false),blocked=(a,b)=>!!(col?.pointClip&&BSP.pointLineBlocked(col,a,b));
 ray.set(origin,dir);ray.far=reach;
 const direct=ray.intersectObjects(meshes)[0];
 if(direct)return direct.object.userData.bot&&blocked(origin,direct.point)?null:direct;
 // Conservative sampled melee hull, only when the central trace misses.
 // Both the offset origin and the contact must be reachable from the eye.
 const right=V(-dir.z,0,dir.x).normalize(),up=right.clone().cross(dir).normalize();let best=null;
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
  const start=origin.clone().addScaledVector(right,x*8*scale).addScaledVector(up,y*8*scale);
  if(blocked(origin,start))continue;
  ray.set(start,dir);ray.far=reach;const hit=ray.intersectObjects(meshes)[0];
  if(!hit?.object.userData.bot||hit.point.distanceTo(origin)>reach||blocked(start,hit.point)||blocked(origin,hit.point))continue;
  // A visible world brush along the actual eye-to-contact segment also blocks.
  const toward=hit.point.clone().sub(origin);ray.set(origin,toward.clone().normalize());ray.far=toward.length();
  const blocker=ray.intersectObjects(meshes)[0];if(blocker&&blocker.object!==hit.object&&blocker.object.userData.bot!==hit.object.userData.bot)continue;
  if(!best||hit.point.distanceToSquared(origin)<best.point.distanceToSquared(origin))best=hit;
 }
 return best;
}
function updateKnife(dt){
 const a=pendingKnife;if(!a)return;
 if(a.round!==round||cur()!=='knife'||P.hp<=0||roundWait>0||BombMode.locked()||Phase13.isSpectating()){pendingKnife=null;return}
 a.left-=dt;if(a.left>1e-8)return;pendingKnife=null;
 const h=knifeTrace(a.stab),bot=h?.object.userData.bot;
 if(bot){
  playOriginalSound(a.stab?'knife_stab.wav':`knife_hit${1+Math.floor(rnd()*4)}.wav`,.38,.12,3000,1);
  {const direction=cam.getWorldDirection(V());damageBot(bot,Combat12.baseDamage('knife',{knifeStab:a.stab,backstab:Combat12.knifeBackstab(direction.x,direction.z,bot.g.rotation.y),firstSlash:a.firstSlash}),'chest',h.point,true,null,'knife',0,'melee')}
 }else if(h){
  const col=window.bspCol,delta=h.point.clone().sub(cam.position),dist=delta.length();
  const before=h.point.clone().addScaledVector(delta,-Math.min((col?.T.k||.02)*.25,dist*.5)/Math.max(dist,1e-6));
  if(h.object.userData.breakable&&!(col?.pointClip&&BSP.pointLineBlocked(col,cam.position,before)))
   BSPBreakables.hit(h.object,Combat12.baseDamage('knife',{knifeStab:a.stab,firstSlash:a.firstSlash}),h.point);
  playOriginalSound('knife_hitwall1.wav',.38,.12,3000,1);
 }
 else playOriginalSound(rnd()<.5?'knife_slash1.wav':'knife_slash2.wav',.38,.12,3000,1);
}
function shoot(knifeAction='slash',burstContinuation=false){
 if(BombMode.selected?.())return false;
 const display=cur(),k=display==='shield'?Phase9.shieldPistol():display,w=W[k],st=A[k];if(inputBlocked()||(typeof freezeLeft!=='undefined'&&freezeLeft>0)||BombMode.locked()||roundWait||Phase9.handlingGrenade()||!w||(!burstContinuation&&cool>0)||swapT>0||((display==='shield'||display==='knife'&&vm?.userData.viewAsset==='shield_knife')&&Phase9.shieldRaised)||(!burstContinuation&&WeaponModes15C.active()))return false;
 if(reloading){
  if(!shotgunReload||st.mag===0)return false;
  shotgunReload=null;reloading=0;
 }
 if(!burstContinuation)cool=Combat12.fireInterval(k,aiming);
 if(k==='knife'){
  const stab=knifeAction==='stab';kick=1.5;
  const hit=knifeTrace(stab),outcome=hit?.object.userData.bot?'body':hit?'wall':'miss';
  const now=performance.now()/1000,firstSlash=P.lastKnifeAt==null||now-P.lastKnifeAt>.8;P.lastKnifeAt=now;
  cool=stab?(hit?1.1:1):vm?.userData.viewAsset==='shield_knife'?1:hit?.4:.35;
  playWeaponAnimation(stab?'stab':'attack',cool,outcome);
  // Contact marker measured against the authored hand motion. Stab-hit
  // extends later than stab-miss; shield has its own identical hit/slash rig.
  const shieldKnife=vm?.userData.viewAsset==='shield_knife';
  pendingKnife={stab,firstSlash,left:stab?(outcome==='body'&&!shieldKnife ? .32 : .22):.10,round};return true;
 }
 if(st.mag<=0){WeaponModes15C.cancel();playOriginalSound(k==='usp'||k==='glock18'||k==='p228'||k==='deagle'||k==='elite'||k==='fiveseven'?'dryfire_pistol.wav':'dryfire_rifle.wav',.22,.08,2200,1);reload();return true}
 const burstMode=display!=='shield'&&Phase9.burstOn(k);
 if(!burstContinuation&&burstMode){
  cool=WeaponModes15C.config[k].cycle;WeaponModes15C.start(k,st.mag);
 }
 st.mag--;playWeaponAnimation('fire',burstMode?WeaponModes15C.config[k].interval:cool);kick=Math.min(kick+1,3);
 const scale=window.bspCol?.T.k||.02,speed=Math.hypot(...(P.vel||[0,0])),silenced=display!=='shield'&&(k==='usp'||k==='m4a1')&&!Phase9.unsilenced(k);
 Phase10.soundEvent(playerTeam,P.pos,'shot',silenced?.7:1.6);
 const sp=Combat12.shotSpread(k,{speed,onGround:!!P.on,crouch:Phase9.crouching,zoom:aiming,silenced,shots:P.recoil?.shots||0,scale});
 const forward=cam.getWorldDirection(V()),right=V(-forward.z,0,forward.x).normalize(),up=right.clone().cross(forward).normalize();
 const spreadRay=()=>{const [sx,sy]=Combat12.spreadOffset(k,sp,rnd);return forward.clone().addScaledVector(right,sx).addScaledVector(up,sy).normalize();};
 const dir=spreadRay();P.recoil=Combat12.fireRecoil(P.recoil,k,{moving:speed>1*scale,crouch:Phase9.crouching,air:!P.on,random:rnd()});
 const maxRange=Combat12.shotRange(k,w.slot,scale);
 ray.set(cam.position,dir);ray.far=maxRange;
 const allTargets=targets(),h=ray.intersectObjects(allTargets)[0],end=h?h.point:cam.position.clone().addScaledVector(dir,Math.min(80,maxRange));
 Phase10.muzzlePlayer(k,display);
 tracer(cam.position.clone().add(cam.getWorldDirection(V()).multiplyScalar(.6)),end,0xfff0a0);
 // One sound per actual projectile, including partial bursts. A baked
 // three-shot recording would keep firing after a cancelled/short burst.
  playOriginalSound(WeaponImport.audioRoute(display==='shield'&&WeaponImport.active(weaponAssetName('shield'))?weaponAssetName('shield'):k,Phase9.firingSound(k,{burst:false,shield:display==='shield'})),.5,k==='awp'?.25:.15,k==='usp'||k==='glock18'?2500:1800,1);
 // Solid contacts and shield always stop the shot unless a conservative
 // verified world exit exists. Breakable glass may be destroyed mid-shot,
 // and each character is damaged at most once even with overlapping hitboxes.
 function tracePenetratingRound(shotDir){
  const col=window.bspCol,scale=col?.T.k||.02,alreadyHit=new Set();
  let point=cam.position.clone(),remaining=maxRange,power=1,budget=Combat12.penetrationLayers(k);
  const damage=Combat12.baseDamage(k,{silenced,burst:k==='famas'&&burstMode});
  for(let iteration=0;iteration<9&&remaining>.01&&power>.06;iteration++){
   // Hit proxies are intentionally invisible in the scene, but Three.js r128
   // can still raycast them. Only reject invisible *world* props, not bots.
   const available=allTargets.filter(o=>(o.userData?.bot||o.visible!==false)&&!o.userData?.breakable?.entry?.destroyed&&!alreadyHit.has(o.userData?.bot));
   ray.set(point,shotDir);ray.far=remaining;
   const impact=ray.intersectObjects(available)[0];if(!impact)break;
   const travelled=cam.position.distanceTo(impact.point);
   if(impact.object.userData.bot){
    if(col?.pointClip&&BSP.pointLineBlocked(col,point,impact.point.clone().addScaledVector(shotDir,-Math.min(scale*.25,impact.distance*.5))))break;
    const victim=impact.object.userData.bot;
    if(impact.object.userData.part==='shield'){playOriginalSound('ric_metal-1.wav',.17);break;}
    damageBot(victim,damage*power,impact.object.userData.part,impact.point,true,null,k,travelled);
    alreadyHit.add(victim);
    const pass=Combat12.bodyPass(k,budget);if(!pass)break;
    budget--;power*=pass.damageFactor;
    const advance=Math.min(scale*.5,Math.max(.005,remaining-impact.distance-.001));
    point=impact.point.clone().addScaledVector(shotDir,advance);
    remaining=(remaining-impact.distance-advance)*pass.remainingFactor;
    continue;
   }
   Phase13.wallHit?.(impact,shotDir,point);
   const destroyed=BSPBreakables.hit(impact.object,Combat12.rangeDamage(k,damage*power,travelled,{silenced,scale}),impact.point);
   if(destroyed){
    // This is now visually and physically absent from the ray list. Only
    // penetrating weapons continue, with the remaining energy reduced.
    if(budget<=0)break;
    budget--;power*=.8;
    const advance=Math.min(scale*.5,Math.max(.005,remaining-impact.distance-.001));
    point=impact.point.clone().addScaledVector(shotDir,advance);remaining-=impact.distance+advance;
    continue;
   }
   if(!impact.object.userData?.worldSurface||budget<=0)break;
   if(!GoldSrcSprites.play(S,'fast_wallpuff1',impact.point.clone().addScaledVector(shotDir,-.04),{scale:.008,fps:45}))burst(impact.point,0xe0c090,3);
   const material=Combat12.materialType(impact.object.userData.textureName);const metal=['M','V','G'].includes(material);
   playWorldSound('ric_'+(metal?'metal':'conc')+'-1.wav',impact.point,.10,.08,1300);
   const pass=Combat12.verifiedWallPass({col,collision:BSP,hit:impact,origin:point,dir:shotDir,range:remaining,weaponId:k,entryDistance:travelled,obstacles:obsM,THREE});
   if(!pass)break;
   power*=pass.damageFactor;budget--;
   point=pass.exit;remaining=pass.remaining;
  }
 }
 // Shotguns continue to use per-pellet rays; one bullet uses the shared impact chain.
 const pellets=Combat12.TABLE[k]?.pellets||1,volley=new Map();
 if(pellets===1)tracePenetratingRound(dir);
 else for(let n=0;n<pellets;n++){
  const shotDir=n===0?dir:spreadRay();
  ray.set(cam.position,shotDir);ray.far=maxRange;
  const hit=n===0?h:ray.intersectObjects(allTargets)[0];
  if(hit){if(hit.object.userData.bot){const col=window.bspCol;if(col?.pointClip&&BSP.pointLineBlocked(col,cam.position,hit.point))continue;
   const victim=hit.object.userData.bot,raw=Combat12.baseDamage(k,{silenced,burst:k==='famas'&&burstMode});
   if(hit.object.userData.part==='shield'){playOriginalSound('ric_metal-1.wav',.17);continue;}
   if(pellets>1){if(!volley.has(victim))volley.set(victim,[]);volley.get(victim).push({raw,part:hit.object.userData.part,point:hit.point,distance:hit.distance});}
   else damageBot(victim,raw,hit.object.userData.part,hit.point,true,null,k,hit.distance);}
   else {
    Phase13.wallHit?.(hit,shotDir,cam.position);
    if(BSPBreakables.hit(hit.object,Combat12.rangeDamage(k,Combat12.baseDamage(k,{silenced,burst:k==='famas'&&burstMode}),hit.distance,{silenced,scale}),hit.point)){
     // Subsequent pellets must not hit the removed brush from the shot snapshot.
     for(let i=allTargets.length-1;i>=0;i--)if(allTargets[i].userData.breakable?.entry.destroyed)allTargets.splice(i,1);
     continue;
    }
    if(n!==0)continue; // one puff/ricochet sound per shot; all pellet contacts may leave marks
    if(!GoldSrcSprites.play(S,'fast_wallpuff1',hit.point.clone().addScaledVector(shotDir,-.04),{scale:.008,fps:45}))burst(hit.point,0xe0c090,3);
    const material=Combat12.materialType(hit.object.userData.textureName);const metal=['M','V','G'].includes(material)||(builtMapId==='dust_block'&&!!hit.object.material.map);playWorldSound('ric_'+(metal?'metal':'conc')+'-1.wav',hit.point,.10,.08,1300);
    // Each layer must have a visible world entry and verified point-hull exit.
    // Never pass bodies, dynamic brushes or missing/unsupported collision.
    const col=window.bspCol;let layerHit=hit,remaining=maxRange,origin=cam.position;
    let raw=Combat12.baseDamage(k,{silenced,burst:k==='famas'&&burstMode});
    for(let layer=0;col?.pointClip&&layer<Combat12.penetrationLayers(k);layer++){
     const pass=Combat12.verifiedWallPass({col,collision:BSP,hit:layerHit,origin,dir:shotDir,range:remaining,weaponId:k,entryDistance:cam.position.distanceTo(layerHit.point),obstacles:obsM,THREE});if(!pass)break;
     const {exit}=pass;remaining=pass.remaining;raw*=pass.damageFactor;origin=exit;ray.set(exit,shotDir);ray.far=remaining;
     const next=ray.intersectObjects(allTargets)[0];if(!next)break;
     if(next.object.userData.bot){if(!BSP.pointLineBlocked(col,exit,next.point))damageBot(next.object.userData.bot,raw,next.object.userData.part,next.point,true,null,k,cam.position.distanceTo(next.point));break;}
     layerHit=next;
    }
   }}
 }
 for(const [victim,hits] of volley){const first=hits[0];damageBot(victim,first.raw,first.part,first.point,true,null,k,first.distance,'bullet',hits);}
 if(aiming&&(k==='awp'||k==='scout')){P.resumeZoom={weapon:k,index:zoomIdx};aiming=false;zoomIdx=0;syncAim();Phase9.updateHud();}
 if(st.mag<=0&&!WeaponModes15C.active())scheduleAutoReload(k);
 hud();return true;
}
const targets=(includeShield=true)=>{const a=obsM.slice();bots.forEach(b=>{if(!b.dead){if(b.nativeHitboxes)b.g.updateMatrixWorld(true);a.push(...b.parts);if(includeShield&&b.shieldRaised&&b.shieldPart)a.push(b.shieldPart)}});return a};
function damageBot(b,d,part,pt,byPlayer=true,attacker=null,weaponId='',distance=0,kind='bullet',pelletHits=null,shotOrigin=null){
 if(!b||b.dead)return;
 const team=byPlayer?playerTeam:attacker?.team, friendly=team===b.team&&attacker!==b;
 if(friendly){Phase10.friendlyHit?.(b,byPlayer?P.pos:attacker?.g?.position,team);if(!window.GAME_FRIENDLY_FIRE)return;}
 const source=byPlayer?P.pos:attacker?.g?.position;
 if(kind==='bullet'&&part==='shield'&&b.shieldRaised){playOriginalSound('ric_metal-1.wav',.17);return;}
 if(kind==='bullet'&&b.shieldRaised&&!b.shieldPart&&source){const dx=source.x-b.g.position.x,dz=source.z-b.g.position.z,d=Math.hypot(dx,dz);if(d>0&&(dx*(-Math.sin(b.g.rotation.y))+dz*(-Math.cos(b.g.rotation.y)))/d>.48){playOriginalSound('ric_metal-1.wav',.17);return}}
 const options={weaponId,raw:d,hitgroup:part,range:distance,
  armor:b.armor||0,helmet:!!b.helmet,kind,
  silenced:(weaponId==='usp'||weaponId==='m4a1')&&(attacker?botSilenced(attacker):cur()!=='shield'&&!Phase9.unsilenced(weaponId)),scale:window.bspCol?.T.k||.02};
 const result=pelletHits?Combat12.resolveVolley(pelletHits,options):Combat12.resolve(options);part=result.hitgroup;const head=part==='head';
 b.armor=Math.max(0,(b.armor||0)-result.armorUsed);if(b.armor===0)b.helmet=false;b.hp-=result.appliedHpDamage;Combat12.tag(b,result.rawDamage,kind,{weaponId,hitgroup:part,crouch:!!b.crouching,scale:window.bspCol?.T.k||.02,source,position:b.g.position});
 if(result.appliedHpDamage>0||result.armorUsed>0){
  const source=kind==='explosion'?pt:byPlayer?P.pos:attacker?.g?.position;
  if(source&&(byPlayer||attacker))Phase10.noticeDamage(b,source,byPlayer?playerTeam:attacker.team);
 }
 if(byPlayer){hitT=.15;$('cross').classList.add('hit')}
 if(pt){const sprite=GoldSrcSprites.play(S,'dead_blood',pt,{scale:head?.023:.017,fps:24});if(!sprite)burst(pt,0x8d1215,Math.min(4,head?4:3));Phase13.bloodHit(b,pt,head,sprite,kind==='explosion'?null:shotOrigin||(byPlayer?cam.position:null))}
 if(byPlayer&&head)playOriginalSound('headshot2.wav',.42,.1,1600);else if(kind!=='melee')snd(.2,.08,600);
 if(b.hp>0&&result.appliedHpDamage>0&&b.mixer&&!b.reloadLeft&&!b.plantVisual&&(b.animHoldUntil||0)<performance.now()/1000){const flinch=head?'head_flinch':'gut_flinch';if(b.acts?.[flinch]){setAnim(b,flinch,true);b.animHoldUntil=performance.now()/1000+.10;}}
 if(b.hp<=0&&!b.dead){
  const death=b.crouching?'crouch_die':head?'head':part==='stomach'?'gutshot':'death'+(1+(Math.floor((b.t||0)*10)%3));b.deathClip=b.acts?.[death]?death:'death1';
  b.dead=.001;Phase9.dropBotWeapon(b);if(typeof clearHeldVisual==='function')clearHeldVisual(b);Phase10.onBotDeath(b,attacker);
  if(byPlayer&&friendly){money=Math.max(0,money-3300);kills--;}
  if(byPlayer&&!friendly){kills++;money=Math.min(16000,money+300);say(head?'HEADSHOT!':'KILL');CS16SFX.play('events/enemy_died.wav',.11);Phase10.celebratePlayerKill?.()}
  killFeed(b,head,attacker,weaponId||kind,byPlayer);
  const enemyTeam=playerTeam==='CT'?'T':'CT';if(!BombMode.active()&&b.team===enemyTeam&&bots.filter(x=>x.team===enemyTeam).every(x=>x.dead)){Phase10.roundEnd(playerTeam);roundWait=3}
  hud();
 }
}
function reload(){if(BombMode.selected?.()||inputBlocked()||swapT>0||Phase9.handlingGrenade()||WeaponModes15C.active()||vm?.userData.weaponAnimation?.currentKind==='silencer')return;const k=cur()==='shield'?Phase9.shieldPistol():cur(),st=A[k],w=W[k];if(BombMode.locked()||k==='knife'||reloading||st.mag>=w.mag||st.res<=0)return;
 if(cur()==='shield'&&Phase9.shieldRaised){say('LOWER SHIELD TO RELOAD');return;}
 // Retract scope before starting reload. Do not restore it when reload completes.
 if(aiming&&Combat12.scoped.has(k)){aiming=false;zoomIdx=0;syncAim();
  if(cam){cam.fov=baseFov;cam.updateProjectionMatrix()}}
 P.resumeZoom=null;pendingAutoReload=reloadCueState=null;reloadSfxToken++;reloading=w.rl;if(k==='m3'||k==='xm1014'){shotgunReload={};shotgunPhase('start')}else{playWeaponAnimation('reload');const state=vm?.userData.weaponAnimation;if(state?.activeAction)state.activeAction.setEffectiveTimeScale(state.activeAction.getClip().duration/w.rl);if(!state?.soundCues?.length)playReloadSequence(k)}hud()}

/* KILL FEED & SCOREBOARD */
function killFeed(victim,head,attacker=null,weaponId=cur(),byPlayer=true){
 const box=$('killfeed');if(!box)return;const d=document.createElement('div');d.className='kf-row';
 const team=byPlayer?playerTeam:attacker?.team;
 const key=weaponId==='shield'?Phase9.shieldPistol():weaponId;
 const name=W[key]?.n||({he:'HE GRENADE',explosion:'EXPLOSION',fall:'FALL'}[key])||String(key||'WORLD').toUpperCase();
 const cell=(cls,value)=>{const el=document.createElement('span');el.className=cls;el.textContent=value;d.appendChild(el);return el};
 cell('kf-k '+(team==='CT'?'ct':team==='T'?'t':''),byPlayer?'YOU':attacker?.name|| (attacker?attacker.team+' BOT':'WORLD'));
 const hs=head?cell('kf-hs','HS'):null,label=cell('kf-w',name);
 const glyph=GoldSrcSprites.killIcon(key,head);
 if(glyph){const img=document.createElement('img');img.src=glyph;img.alt=name;img.className='goldsrc-kill';label.replaceChildren(img);hs?.remove()}
 cell('kf-v '+(victim.team==='CT'?'ct':'t'),victim.name||victim.team+' BOT');
 box.prepend(d);while(box.children.length>4)box.lastChild.remove();setTimeout(()=>d.remove(),5000);
}
let sbOpen=false,crossSpread=4;
function renderScoreboard(){Phase10.renderBoard()}

function setScoreboard(on){sbOpen=on;$('scoreboard').classList.toggle('hidden',!on);$('scoreboard').setAttribute('aria-hidden',String(!on));if(on)renderScoreboard()}
addEventListener('keydown',e=>{if(e.code==='Tab'&&running&&!inputBlocked()&&!e.target?.closest?.('input,select,textarea,button,[contenteditable]')){e.preventDefault();setScoreboard(true)}});
addEventListener('keyup',e=>{if(e.code==='Tab')setScoreboard(false)});
addEventListener('blur',()=>setScoreboard(false));
/* HUD */
let hudAmmoMarkup=null;
function hud(){
 const k=cur()==='shield'?Phase9.shieldPistol():cur(),st=A[k],enemyTeam=playerTeam==='CT'?'T':'CT',alive=bots.filter(b=>!b.dead&&b.team===enemyTeam).length;
 $('top').textContent='RONDE '+round+'  |  CT '+(bots.filter(b=>b.team==='CT'&&!b.dead).length+(playerTeam==='CT'&&P.hp>0?1:0))+'  |  T '+(bots.filter(b=>b.team==='T'&&!b.dead).length+(playerTeam==='T'&&P.hp>0?1:0))+'  |  KILL '+kills;
 $('hpt').textContent=Math.ceil(P.hp);$('hpf').style.width=P.hp+'%';$('hpf').style.background=P.hp>50?'#4f4':P.hp>25?'#fc3':'#f44';
 const ammoMarkup=BombMode.selected?.()?'<small>C4</small>':(k==='knife'?'':reloading?'<b class="rl">RELOAD</b>':'<b>'+st.mag+'</b><i>/'+st.res+'</i>')+'<small>'+(WeaponImport.active(k)?.name||W[k].n)+'</small>';
 if(hudAmmoMarkup!==ammoMarkup){$('ammo').innerHTML=ammoMarkup;hudAmmoMarkup=ammoMarkup;}
 if(sbOpen)renderScoreboard();
 $('economy').textContent='$'+money;$('roundclock').textContent=freezeLeft>0?'FREEZE '+Math.ceil(freezeLeft):BombMode.planted()?'BOMB LIVE':buyTime>0?'BUY '+Math.ceil(buyTime):Math.ceil(roundTime)+'s';$('armor').textContent='ARMOR '+Math.ceil(armor)+(helmet?' · HELMET':'');Phase9.updateHud();BombMode.hud();GoldSrcSprites.hud(BombMode.selected?.()?'c4':k,helmet,armor>0);GoldSrcSprites.equipment(grenades);
}
function radar(){
 const c=$('radar').getContext('2d');c.clearRect(0,0,96,96);c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.arc(48,48,47,0,7);c.fill();GoldSrcSprites.radar(c);c.fillStyle='#4f4';c.beginPath();c.moveTo(48,41);c.lineTo(44,52);c.lineTo(52,52);c.fill();
 const spectating=Phase13.isSpectating(),origin=spectating?cam.position:P.pos;
 const yaw=spectating?cam.rotation.y:P.yaw,s=Math.sin(yaw),co=Math.cos(yaw);
 bots.forEach(b=>{if(b.dead||b.team!==playerTeam||spectating&&b===Phase13.getObserved())return;const dx=b.g.position.x-origin.x,dz=b.g.position.z-origin.z,f=-dx*s-dz*co,r=dx*co-dz*s,k=48/32;
  const x=48+r*k,y=48-f*k;if(Math.hypot(x-48,y-48)<46){c.fillStyle=Phase10.radioBlink?.(b)?'#ffb34d':'#5af';c.beginPath();c.arc(x,y,3,0,7);c.fill()}});
 for(const [p,label] of BombMode.radar()){
  const dx=p.x-origin.x,dz=p.z-origin.z;
  let x=(dx*co-dz*s)*1.5,y=(dx*s+dz*co)*1.5;
  const fit=Math.max(1,Math.hypot(x,y)/36);x/=fit;y/=fit;
  c.font='bold 10px Arial';c.textAlign='center';const bomb=label==='C4'||label==='C4 carrier';c.fillStyle=bomb?'#ffb34d':'#ffda87';
  if(!bomb||!GoldSrcSprites.radarBomb(c,48+x,48+y,label==='C4 carrier'))c.fillText(bomb?'C4':label,48+x,51+y);
 }
}
/* OPTICAL SIGHTS */
const ZOOM_LEVELS={aug:[55],sg552:[55],scout:[40,15],awp:[40,10],g3sg1:[40,15],sg550:[40,15]};
let zoomIdx=0;
function scopeLevels(k){return ZOOM_LEVELS[k]?ZOOM_LEVELS[k].length:0}
function scopeZoom(k){const z=ZOOM_LEVELS[k];return z?2*Math.atan(Math.tan(baseFov*Math.PI/360)*Math.tan(z[Math.min(zoomIdx,z.length-1)]*Math.PI/360))*180/Math.PI:0}
function toggleAim(force){
 P.resumeZoom=null;
 if(inputBlocked()||!scopeLevels(cur())){aiming=false;zoomIdx=0;return}
 if(typeof force==='boolean'){aiming=force;zoomIdx=0;return}
 if(!aiming){aiming=true;zoomIdx=0}
 else if(zoomIdx<scopeLevels(cur())-1)zoomIdx++;
 else{aiming=false;zoomIdx=0}
 Phase9.updateHud()
}
function zoomStep(dir){
 if(!aiming){return}
 if(dir>0&&zoomIdx<scopeLevels(cur())-1)zoomIdx++;
 else if(dir<0&&zoomIdx>0)zoomIdx--;
 else if(dir<0){aiming=false;zoomIdx=0}
 Phase9.updateHud()
}
addEventListener('wheel',e=>{
 if(!running||!$('buyMenu').classList.contains('hidden')||!inventory.length||Phase13.isSpectating())return;
 const dir=e.deltaY>0?1:-1;
 if(aiming&&scopeLevels(cur())){e.preventDefault();zoomStep(-dir);syncAim();return}
 setW(Phase14C.cycleIndex(inventory,wi,dir,W));
},{passive:false});
// Secondary button is bound below with pointer capture. Knife supports sustained stab.

addEventListener('keydown',e=>{if(e.code==='KeyV'&&!e.repeat)Phase9.secondaryAction()});
// Same held-input policy for touchscreen and desktop, gated by shoot().
function updateHeldAttack(){
 // Repeat melee and automatic weapons only; semi-auto guns require a fresh trigger.
 // Each actual attack still passes the weapon's cooldown, ammo, animation and shield checks.
 if(BombMode.selected?.()){BombMode.holdFire?.(!!(fh||fl));return;}
 if(secondaryHeld&&cur()==='knife'&&!Phase9.shieldActiveWeapon?.())shoot('stab');
 else if(fh||fl){
  const id=cur()==='shield'?Phase9.shieldPistol():cur();
  if(cur()!=='shield'&&Phase9.burstOn(id)){if(!firedLatch)firedLatch=shoot('slash')===true}
  else if(Attack14F.repeatable(id,W[id]))shoot('slash');
  else if(!firedLatch)firedLatch=shoot('slash')===true
 }
 if(!(fh||fl))firedLatch=false;
}
/* UPDATE */
function moveLayoutActor(st,wish,dt,jump,crouch=false){
 const edge=jump&&!st.jumpHeld;st.jumpHeld=!!jump;st.jumped=false;st.landed=0;st.medium='air';st.waterLevel=0;
 const count=Math.max(1,Math.ceil(dt/.025)),step=dt/count;
 for(let i=0;i<count;i++){
  if(i===0&&edge&&st.on&&!crouch){st.vy=BSP.JUMP*.02;st.on=false;st.jumped=true;}
  const v=BSP.accelerate(st.vel,wish,step,st.on),x=st.pos.x,z=st.pos.z;
  const actors=movementActors(st,st.pos);
  LayoutNav.moveActor(st.pos,v[0]*step,v[1]*step,crouch,actors);
  if(step>0)st.vel=[(st.pos.x-x)/step,(st.pos.z-z)/step];
  const g=ground(st.pos,.4),prev=st.vy||0;st.vy=prev-BSP.GRAV*.02*step;
  let nextY=st.pos.y+(prev+st.vy)*.5*step;
  if(nextY>st.pos.y){const head=crouch?1.05:1.7;for(const o of obs){
   if(st.pos.x>o.x1-.4&&st.pos.x<o.x2+.4&&st.pos.z>o.z1-.4&&st.pos.z<o.z2+.4&&o.y1>=st.pos.y+head&&o.y1<nextY+head){nextY=o.y1-head;st.vy=0;}
  }}
  const limitedY=LayoutNav.verticalLimit(st.pos,nextY,crouch,actors);
  const falling=st.vy<=0,impact=falling?-st.vy/.02:0;
  const bodyFloor=falling&&nextY<st.pos.y&&limitedY>nextY;
  if(limitedY!==nextY)st.vy=0;
  st.pos.y=limitedY;
  if(st.pos.y<=g||bodyFloor){if(!st.on)st.landed=Math.max(st.landed,impact);st.pos.y=Math.max(g,st.pos.y);st.vy=0;st.on=true;}else st.on=false;
 }
 return st;
}
function update(dt){
 Phase13.updateBlood(dt); // reset decal work budget before player and bot shots
 const frozen=freezeLeft>0;
 const clocks=Economy45.tickRound(freezeLeft,buyTime,roundTime,dt,BombMode.planted(),roundWait>0);freezeLeft=clocks.freeze;buyTime=clocks.buy;roundTime=clocks.time;
 // Freeze gate locks movement/attacks, not the physical gesture. Keep a held joystick alive.
 if(frozen&&!freezeLeft)say('GO GO GO');
 if(buyTime<=0&&!$('buyMenu').classList.contains('hidden'))closeBuyMenu();
 BSPBreakables.refresh();
 updateBreakableFX();
 if(window.bspCol)BSPDoors.update(dt,P.hp>0?BSP.toHammer(bspCol.T,P.pos.toArray()):null,bots.filter(b=>!b.dead).map(b=>BSP.toHammer(bspCol.T,b.g.position.toArray())));
 if(!Phase13.isSpectating()){
 RuntimeHealth.stage('player');
 if(![P.pos.x,P.pos.y,P.pos.z,P.pitch,P.yaw,jx,jy].every(Number.isFinite))throw Error('Non-finite player state');
 const analog=BSP.analog(jx,jy);let mx=(K.d-K.a)+analog[0],mz=(K.w-K.s)-analog[1];const n=Math.hypot(mx,mz);if(n>1){mx/=n;mz/=n}
 const defuseLocked=!!BombMode.humanDefusing?.();
 if(!defuseLocked)Phase9.updateCrouch(dt);const scale=window.bspCol?.T.k||.02;
 const sp=BSP.maxSpeed((BombMode.selected?.()||BombMode.locked()&&BombMode.state().action==='plant')?'c4':Phase9.handlingGrenade()?'he':cur(),{scale,zoom:aiming,shield:(Phase9.shieldActiveWeapon?.()||cur()==='shield')&&Phase9.shieldRaised,crouch:Phase9.crouching,walk:isWalking()})*Combat12.recoverTag(P,dt),s=Math.sin(P.yaw),c=Math.cos(P.yaw);
 const movementLocked=frozen||defuseLocked||!$('buyMenu').classList.contains('hidden');
 const wish=movementLocked?[0,0]:[(-s*mz+c*mx)*sp,(-c*mz-s*mx)*sp],oldX=P.pos.x,oldY=P.pos.y,oldZ=P.pos.z;
 if(window.bspCol){const st={pos:P.pos.toArray(),vy:P.vy,on:P.on,vel:P.vel,jumpHeld:P.jumpHeld,ladderDetach:P.ladderDetach,climb:movementLocked?0:mz,lookVertical:Math.sin(P.pitch),assistBrokenGlass:true};BSP.moveActor(bspCol,bspCol.T,st,wish,dt,!movementLocked&&jmp&&!Phase9.crouching,Phase9.crouching,movementActors(P,P.pos));P.pos.fromArray(st.pos);Object.assign(P,{vy:st.vy,on:st.on,vel:st.vel,jumpHeld:st.jumpHeld,ladderDetach:st.ladderDetach,jumped:st.jumped,landed:st.landed,medium:st.medium,waterLevel:st.waterLevel});}
 else moveLayoutActor(P,wish,dt,!movementLocked&&jmp,Phase9.crouching);
 if(P.jumped)CS16SFX.jump();if(P.landed>580){hurt(BSP.fallDamage(P.landed),null,'fall');if(P.hp<=0)return;}
 P.pitch=Math.max(-1.45,Math.min(1.45,P.pitch));
 const travel=Math.hypot(P.pos.x-oldX,P.pos.z-oldZ),actualSpeed=travel/Math.max(dt,.001),l=P.on?Math.min(1,actualSpeed/(250*scale)):0;
 const inMedium=P.medium==='ladder'||P.medium==='water',stepMove=inMedium?Math.min(1,Math.hypot(travel,P.pos.y-oldY)/Math.max(dt,.001)/(250*scale)):l;
 CS16SFX.step(dt,stepMove,P.on||inMedium,isWalking()&&!inMedium,Phase9.crouching,()=>CS16SFX.movementSurface(P.medium,P.waterLevel,()=>groundSoundSurface(P.pos)));
 if(l>.35&&P.on&&!isWalking()&&!Phase9.crouching&&performance.now()/1000>=(P.nextBotFootstep||0)){Phase10.soundEvent(playerTeam,P.pos,'step',.65);P.nextBotFootstep=performance.now()/1000+.42/Math.max(.35,l);}
 const motion=BSP.viewMotion(P.viewMotion||(P.viewMotion={}),travel,l,dt,P.on,(P.vel?.[0]*c-P.vel?.[1]*s||0)/(250*scale));
 cam.position.set(P.pos.x,P.pos.y+(window.bspCol?.56:1.6)-Phase9.crouchBlend*(window.bspCol?(Number.isInteger(bspCol.crouchHead)?16*scale:.25):.63)+motion.camera,P.pos.z);if(window.bspSky)window.bspSky.position.set(cam.position.x,cam.position.y,cam.position.z);P.recoil=Combat12.recoverRecoil(P.recoil,dt,!!(fh||fl));cam.rotation.set(P.pitch+(P.recoil?.pitch||0),P.yaw+(P.recoil?.yaw||0),0,'YXZ');
 const targetFov=aiming&&scopeZoom(cur())?scopeZoom(cur()):baseFov;if(Math.abs(cam.fov-targetFov)>.1){cam.fov+=(targetFov-cam.fov)*Math.min(1,dt*12);cam.updateProjectionMatrix()}
 syncAim();
 cool-=dt;swapT-=dt;kick=Math.max(0,kick-dt*8);
 if(P.resumeZoom&&cool<=0){const z=P.resumeZoom;P.resumeZoom=null;if(cur()===z.weapon&&!reloading){aiming=true;zoomIdx=z.index;syncAim();Phase9.updateHud()}}
 const hadBurst=WeaponModes15C.active(),effectiveWeapon=cur()==='shield'?Phase9.shieldPistol():cur();
 WeaponModes15C.tick(dt,effectiveWeapon,!inputBlocked()&&!reloading&&swapT<=0&&A[effectiveWeapon]?.mag>0,()=>shoot('slash',true)===true);
 if(hadBurst&&!WeaponModes15C.active()){
  if(A[effectiveWeapon]?.mag===0)scheduleAutoReload(effectiveWeapon,.26);
 }
 {const id=cur()==='shield'?Phase9.shieldPistol():cur(),spread=Combat12.shotSpread(id,{speed:actualSpeed,onGround:P.on,crouch:Phase9.crouching,zoom:aiming,silenced:cur()!=='shield'&&(id==='usp'||id==='m4a1')&&!Phase9.unsilenced(id),shots:P.recoil?.shots||0,scale});const target=(aiming&&scopeZoom(cur()))?0:Math.min(45,Math.max(4,spread*240));crossSpread+=(target-crossSpread)*Math.min(1,dt*10);document.documentElement.style.setProperty('--spread',crossSpread.toFixed(1)+'px')}
 updateReloadCues(dt);updateReload(dt);updateAutoReload(dt);
 updateHeldAttack();
 updateKnife(dt);
 if(vm&&vm.userData.weaponAnimation){const state=vm.userData.weaponAnimation;updateWeaponCues(state,dt);state.mixer.update(dt);if(cur()==='shield'&&typeof Phase14B!=='undefined')Phase14B.update(vm,dt)}
 vm.position.set(motion.x,motion.y,0);
 vm.rotation.set(0,0,0);
 }
 RuntimeHealth.stage('effects');GoldSrcSprites.update(dt);Phase9.update(dt);Phase10.updateFX(dt);
 if(!frozen){RuntimeHealth.stage('bots');for(const b of bots.slice()){RuntimeHealth.stage('bot '+(b.botId||b.team));botUpdate(b,dt);}}
 RuntimeHealth.stage('objective');if(!frozen)BombMode.update(dt);Phase13.updateSpectator(dt);BombMode.updateProgressHud?.();
 for(let i=tr.length-1;i>=0;i--){const t=tr[i];t.t-=dt;if(t.t<=0){removeTracer(t);tr.splice(i,1)}}
 for(let i=pt.length-1;i>=0;i--){const p=pt[i];p.t-=dt;p.v.y-=(p.gravity??12)*dt;p.m.position.addScaledVector(p.v,dt);if(p.spin){p.m.rotation.x+=p.spin*dt;p.m.rotation.z+=p.spin*.6*dt;}if(p.t<=0){removeParticle(p);pt.splice(i,1)}}
 if(!BombMode.active())Phase13.checkRoundEnd();
 if(roundWait>0){roundWait-=dt;if(roundWait<=0){
  $('buyMenu').classList.add('hidden');startRound();
 }}
 if(!BombMode.active()&&roundTime<=0&&roundWait<=0){Phase10.roundEnd('CT',null,true,'TIME EXPIRED');roundWait=2}
 if(dmgA>0){dmgA-=dt;$('dmg').style.opacity=Math.max(0,dmgA)}
 if(hitT>0){hitT-=dt;if(hitT<=0)$('cross').classList.remove('hit')}
 if(msgT>0){msgT-=dt;if(msgT<=0)$('msg').style.opacity=0}
 RuntimeHealth.stage('HUD timer');hudT-=dt;if(hudT<=0){hudT=.15;RuntimeHealth.stage('radar');radar();RuntimeHealth.stage('HUD');hud()}
}
let firedLatch=false;
// Tahap 13: Shift walk (CS 1.6), no sprint speed bonus.
let walkHeld=false,mobileWalk=false,fireAimPointer=null,fireAimLast=null,secondaryHeld=false,adsPointer=null,adsAimLast=null,mouseSecondaryHeld=false;
function isWalking(){
 return walkHeld||mobileWalk;
}

// Exactly one viewmodel is rendered per frame. Death, async model loads,
// scope/weapon changes and C4/throw cancellation can leave stale visible groups.
function renderActiveViewmodel(){
 const subject=Phase13.isSpectating()?Phase13.getViewmodel():
  Phase9.handlingGrenade()?Phase9.getViewmodel():BombMode.getViewmodel()||vm;
 if(!subject?.visible||subject.parent!==viewScene)return;
 const hidden=[];
 for(const child of viewScene.children){if(child!==subject&&child.userData.viewAsset&&child.visible){hidden.push(child);child.visible=false}}
 try{
  const fov=(subject.userData.nativeMdl||subject.children[0]?.userData.nativeMdl)?GoldSrcMDL10.profile.viewmodelFov:(ViewmodelCalibration[subject.userData.viewAsset]?.[0]||65);
  if(viewCamera.fov!==fov){viewCamera.fov=fov;viewCamera.updateProjectionMatrix()}
  viewCamera.position.y=shieldViewCameraY(subject);
  if(typeof Phase14B!=='undefined')Phase14B.present(subject,subject===vm?Phase9.shieldRaised:!!subject.userData.shieldRaised,viewCamera.aspect);
  R.autoClear=false;R.clearDepth();R.render(viewScene,viewCamera);return true;
 }finally{for(const child of hidden)child.visible=true;R.autoClear=true}
}
function loop(t){
 requestAnimationFrame(loop);
 if(document.hidden||inputSuspended){t0=t;if(typeof FrameLimiter!=='undefined')FrameLimiter.reset();RuntimeHealth.lifecycleWait?.(document.hidden?'hidden':'input suspended');return}
 if(!running||matchLoading||!R){t0=t;if(typeof FrameLimiter!=='undefined')FrameLimiter.reset();RuntimeHealth.idle();return;}
 if(RuntimeHealth.blocked()){if(typeof FrameLimiter!=='undefined')FrameLimiter.reset();return;}
 if(typeof FrameLimiter!=='undefined'&&!FrameLimiter.allow(t))return;
 const elapsed=t0>0?Math.max(0,t-t0):0;t0=t;
 RuntimeHealth.lifecycleWait?.(null);
 // Foreground jank is not a page suspension. Drop excess elapsed time instead
 // of invalidating active touch/keyboard ownership or running huge catch-up steps.
 const dt=Math.min(.05,elapsed/1000);
 RuntimeHealth.begin(t,elapsed);
 let updateOK=true;
 try{RuntimeHealth.stage('update');update(dt)}catch(error){updateOK=false;RuntimeHealth.fail('simulation',error)}
 if(updateOK&&!RuntimeHealth.contextLost()){try{RuntimeHealth.stage('map media');LocalMapMedia.update(activeMapData?.local,dt)}catch(error){updateOK=false;RuntimeHealth.fail('media',error)}}
 RuntimeHealth.updated();
 // A simulation exception must not suppress the world render. Keep the last
 // valid frame visible and surface the failing subsystem, not a silent black HUD.
 if(!RuntimeHealth.contextLost()){
  try{
   RuntimeHealth.stage('world render');if(window.bspSky)window.bspSky.position.copy(cam.position);
   const restoreBombShake=GrenadeFX15B.cameraShake(cam);
   try{R.autoClear=true;R.render(S,cam)}finally{restoreBombShake()}
   RuntimeHealth.countDraws();
   RuntimeHealth.stage('viewmodel render');if(renderActiveViewmodel())RuntimeHealth.countDraws();
   RuntimeHealth.rendered();
  }catch(error){RuntimeHealth.fail('render',error)}
  finally{R.autoClear=true;}
 }
 RuntimeHealth.end(t,updateOK);
}
/* SETUP */
function applyQ(){
 const mobile=matchMedia('(pointer: coarse)').matches;
 const ratio=Math.min(devicePixelRatio||1,[1,1.5,2][Q],mobile?1.5:2);RuntimeHealth.configureResolution(ratio,mobile);resizeGameViewport();
 const shadows=Q===2,changed=R.shadowMap.enabled!==shadows;R.shadowMap.enabled=shadows;sun.castShadow=shadows;if(changed)S.traverse(o=>{for(const mat of [].concat(o.material||[]))mat.needsUpdate=true});
}
function resizeGameViewport(){
 const canvas=$('c'),w=Math.max(1,canvas.clientWidth||innerWidth),h=Math.max(1,canvas.clientHeight||innerHeight);
 if(!R||!cam||!viewCamera)return;
 if(cam.aspect!==w/h||viewCamera.aspect!==w/h){cam.aspect=viewCamera.aspect=w/h;cam.updateProjectionMatrix();viewCamera.updateProjectionMatrix();}
 const size=R.getSize(new THREE.Vector2());if(size.x!==w||size.y!==h)R.setSize(w,h,false);
}
function init(){
 R=new THREE.WebGLRenderer({canvas:$('c'),antialias:Q>0,powerPreference:'high-performance'});R.outputEncoding=THREE.sRGBEncoding;
 RuntimeHealth.bindCanvas($('c'));
 S=new THREE.Scene();cam=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,150);S.add(cam);Phase13.bindLight(cam);
 viewScene=new THREE.Scene();viewCamera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.01,10);
 viewScene.add(new THREE.HemisphereLight(0xffffff,0x887766,1.3));const vl=new THREE.DirectionalLight(0xffffff,.7);vl.position.set(-1,2,3);viewScene.add(vl);
 build();applyQ();
 addEventListener('resize',resizeGameViewport);
 window.visualViewport?.addEventListener('resize',resizeGameViewport);
 document.addEventListener('fullscreenchange',resizeGameViewport);
 document.addEventListener('webkitfullscreenchange',resizeGameViewport);
 refreshWeaponChips();
}
function newGame(){
 over=false;dmgA=hitT=0;$('dmg').style.opacity=0;$('cross').classList.remove('hit');$('killfeed').replaceChildren();setScoreboard(false);aiming=false;zoomIdx=0;cam.fov=baseFov;cam.updateProjectionMatrix();kills=0;round=0;Phase10.resetMatch();money=window.PhaseMenu15?.rules.startMoney||800;armor=0;helmet=false;defuseKit=false;nightVision=false;Phase9.resetMatch();document.body.classList.remove('night-vision');grenades={he:0,flash:0,smoke:0};P.pos.set(0,0,26);P.vy=0;P.hp=100;P.yaw=0;P.pitch=0;Phase13.resetMatch();
 resetPlayerAmmo();
 inventory=[playerTeam==='CT'?'usp':'glock18','knife'];wi=0;setW(0);startRound();
}
$('q').value=String(Q);
$('q').onchange=e=>{Q=+e.target.value;try{localStorage.setItem('bs.graphicsQuality',String(Q))}catch(_){}if(R)applyQ()};
$('sn').onchange=e=>SENS=+e.target.value;
// Imported BSPs must preserve the GoldSrc X/Y/Z axes and the camera's screen-right.
// Check the actual loaded API rather than trusting a release label or a zSign field.
function verifyLocalOrientation(data){
 const T=data?.col?.T,k=T?.k;
 const fail=()=>{throw Error('BSP orientation mismatch: reload the matching map modules (X,Z,-Y). Imported maps are safe.')};
 if(!(k>0)||T.zSign!==-1||data.col.orientationId!=='goldsrc-x-z-neg-y')fail();
 const close=(a,b)=>Array.isArray(a)&&a.length===3&&a.every((n,i)=>Number.isFinite(n)&&Math.abs(n-b[i])<1e-7);
 const basis=[[1,0,0],[0,1,0],[0,0,1]],expected=[[k,0,0],[0,0,-k],[0,k,0]];
 for(let i=0;i<3;i++)if(!close(BSP.toGame(T,basis[i]),expected[i])||!close(BSP.toHammer(T,expected[i]),basis[i]))fail();
 for(const team of ['CT','T']){
  const poses=data.col.spawnYaw?.[team],spawns=data.col.spawnTeams?.[team];
  const entities=data.files.filter(e=>e.classname===(team==='CT'?'info_player_start':'info_player_deathmatch')&&e.origin&&e.origin.trim().split(/\s+/).length===3&&e.origin.trim().split(/\s+/).map(Number).every(Number.isFinite));
  if(!poses?.length||poses.length!==spawns?.length||entities.length!==poses.length)fail();
  for(let i=0;i<poses.length;i++){
   const a=(Number(entities[i].angles?.trim().split(/\s+/)[1]??entities[i].angle)||0)*Math.PI/180,y=poses[i];
   if(!close([-Math.sin(y),0,-Math.cos(y)],[Math.cos(a),0,-Math.sin(a)]))fail();
  }
 }
}
async function beginMatch(){
 if(matchLoading)return;matchLoading=true;running=false;
 try{
  RuntimeHealth.reset();RuntimeHealth.stage?.('startup controls');
  $('loadBack').classList.add('hidden');$('loadingScreen').classList.remove('hidden');$('loadStatus').textContent='Memuat peta, model dan suara…';
  resetInputs();LocalMapMedia.pauseAmbient?.();
  Q=+$('q').value;SENS=+$('sn').value;
  RuntimeHealth.stage?.('startup audio');
  if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();NB=AC.createBuffer(1,AC.sampleRate*.3,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=rnd()*2-1}catch(e){}}
  // Safari may reject audio resume; audio permission must not strand map loading.
  if(AC?.state==='suspended'||AC?.state==='interrupted')try{AC.resume()?.catch?.(()=>{})}catch(_){}
  loadOriginalSounds();
  RuntimeHealth.stage?.('startup sprites');await GoldSrcSprites.ready();
  // Prefetch only the five equipped/throw props while BSP and GRAPH are read.
  // Handle rejection immediately in case map compilation fails first.
  const viewmodelWarmup=preloadViewmodels(false);
  viewmodelWarmup.catch(()=>{});
  RuntimeHealth.stage?.('startup map');if(selectedMapId.startsWith('builtin:')||selectedMapId.startsWith('saved:')){
   $('loadStatus').textContent='Memeriksa navigasi peta…';
   const isBundled=selectedMapId.startsWith('builtin:');
   const localMapData=await MapImporter.compile(isBundled?await BundledMaps.load(selectedMapId):await MapLibrary.load(selectedMapId));
   verifyLocalOrientation(localMapData);
   activeMapData={id:'local_bsp',name:localMapData.name,local:localMapData,spawn:localMapData.spawn};
   // Refresh stale warnings from maps imported before automatic GRAPH support.
   if(!isBundled)MapLibrary.updateReport(selectedMapId,{missing:localMapData.missing,warnings:localMapData.warnings,nav:localMapData.navSource,overview:localMapData.overviewPath||null,globalWads:localMapData.globalWads,navRevision:16}).catch(()=>{});

  }else{
   const r=await fetch('assets/maps/'+selectedMapId+'.json');if(!r.ok)throw new Error('Map tidak ditemukan');activeMapData=await r.json();
  }
  RuntimeHealth.stage?.('startup models');await waitForLoadTasks([new Promise(ok=>preloadCT(ok)),viewmodelWarmup,GrenadeFX15B.preload(),...BOT_POOLS.CT.concat(BOT_POOLS.T).map(loadHeld),loadHeld('shield').catch(()=>null)]);
  if(activeMapData.local?.mode==='bomb'){
   await ensureWeaponModel('c4');
   await waitForLoadTasks([Phase9.loadWorldModel('c4'),Phase9.loadWorldModel('backpack'),Phase9.loadWorldModel('thighpack'),loadCharacterEquipment('bomb-carrier'),loadCharacterEquipment('defuse-kit'),loadHeld('c4').catch(()=>null)]);
   ['c4_click','c4_plant','c4_beep1','c4_beep2','c4_beep3','c4_beep4','c4_beep5','c4_disarm','c4_disarmed','c4_explode1'].forEach(name=>requestOriginalSound(name+'.wav'));
  }
  RuntimeHealth.stage?.('startup world');BombMode.prepare(activeMapData.local);
  if(!R)init();else{rebuildWorld();applyQ()}await worldReady;
  if(!window.bspCol)LayoutNav.prepare();
  RuntimeHealth.stage?.('startup round');newGame();createPlayerClass();$('loadStatus').textContent='Menyiapkan render pertama…';
  // Give loading UI a paint opportunity; draw the world before exposing the gameplay HUD.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(RuntimeHealth.contextLost())throw Error('WebGL context lost during map startup');
  RuntimeHealth.stage?.('startup first render');R.autoClear=true;try{R.render(S,cam);renderActiveViewmodel()}finally{R.autoClear=true}
  if(RuntimeHealth.contextLost())throw Error('WebGL context lost during first render');
  $('teamScreen').classList.add('hidden');$('matchConfigScreen').classList.add('hidden');$('classScreen').classList.add('hidden');$('menu').classList.add('hidden');$('loadingScreen').classList.add('hidden');document.body.classList.add('playing');running=true;t0=performance.now();
 }catch(e){running=false;document.body.classList.remove?.('playing');$('loadingScreen').classList.remove('hidden');$('loadStatus').textContent='Gagal memuat: '+String(e?.message||e);$('loadBack').classList.remove('hidden');RuntimeHealth.fail('startup',e)}
 finally{matchLoading=false}
}
let matchLoading=false;
$('go').onclick=()=>{$('menu').classList.add('hidden');selectedMapId='dust_block';$('matchConfigScreen').classList.remove('hidden')};
$('backMap').onclick=()=>{$('mapScreen').classList.add('hidden');$('menu').classList.remove('hidden')};
$('continueMap').onclick=()=>{$('mapScreen').classList.add('hidden');$('matchConfigScreen').classList.remove('hidden')};
$('backMatchConfig').onclick=()=>{$('matchConfigScreen').classList.add('hidden');$('menu').classList.remove('hidden')};
$('continueMatchConfig').onclick=()=>{$('matchConfigScreen').classList.add('hidden');$('teamScreen').classList.remove('hidden')};
$('backMenu').onclick=()=>{$('teamScreen').classList.add('hidden');$('matchConfigScreen').classList.remove('hidden')};
document.querySelectorAll('[data-map]').forEach(b=>b.addEventListener('click',()=>{selectedMapId=b.dataset.map;document.querySelectorAll('[data-map]').forEach(x=>{x.classList.toggle('selected',x===b);x.querySelector('i').textContent=x===b?'SELECTED':'SELECT MAP'});}));
document.querySelectorAll('[data-team]').forEach(b=>b.addEventListener('click',()=>{playerTeam=b.dataset.team;showClasses()}));
function worldLim(){return activeMapData&&activeMapData.id!=='dust_block'?Math.max(4,(activeMapData.size||30)-1):29.4}
function inBuyZone(){if(window.bspCol&&bspCol.buyzones&&bspCol.buyzones.length)return BSP.inBuyzone(bspCol,[P.pos.x,P.pos.y,P.pos.z],playerTeam);
 if(activeMapData&&activeMapData.id!=='dust_block'&&activeMapData.spawn){const sp=activeMapData.spawn[playerTeam==='CT'?'ct':'t'];if(sp){return Math.hypot(P.pos.x-sp[0],P.pos.z-sp[2])<16}}
 return playerTeam==='CT'?P.pos.z>19&&Math.abs(P.pos.x)<22:P.pos.z< -19&&Math.abs(P.pos.x)<22}
function throwGrenade(){return Phase9.throwGrenade()}
$('grenadeBtn').addEventListener('click',e=>{if(e.detail===0)throwGrenade()});
/* INPUT */
// Bind one owned pointer per control. A different finger must never release a held attack.
const hold=(id,on,off)=>{
 const el=$(id);let owner=null,ownerType=null,epoch=0;
 const finish=ev=>{
  if(owner!==ev.pointerId)return;
  const old=owner;owner=null;ownerType=null;epoch++;off?.(ev);
  if(el.hasPointerCapture?.(old))try{el.releasePointerCapture(old)}catch(_){}
 };
 el.addEventListener('pointerdown',ev=>{
  if(inputBlocked()||owner!==null||ev.button!==0)return;
  ev.preventDefault();ev.stopPropagation();owner=ev.pointerId;ownerType=ev.pointerType;epoch++;
  try{el.setPointerCapture(owner)}catch(_){}
  on(ev)
 });
 for(const kind of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(kind,finish);
 for(const kind of ['pointerup','pointercancel'])addEventListener(kind,finish,true);
 // If WebKit loses a final PointerEvent, cancel only the orphaned touch owner.
 for(const type of ['touchend','touchcancel'])addEventListener(type,e=>{if(e.touches.length||owner===null||ownerType!=='touch')return;const id=owner,token=epoch;setTimeout(()=>{if(owner===id&&epoch===token)finish({type:'pointercancel',pointerId:id})},80)},{capture:true,passive:true});
 document.addEventListener('blockstrike:reset-controls',()=>{
  const old=owner;owner=null;ownerType=null;epoch++;
  if(old!==null&&el.hasPointerCapture?.(old))try{el.releasePointerCapture(old)}catch(_){}
 });
 return ()=>owner;
};
hold('bombUse',()=>BombMode.holdUse?.(true)??BombMode.hold(true),()=>BombMode.holdUse?.(false)??BombMode.hold(false));
hold('grenadeBtn',()=>Phase9.throwGrenade(true),e=>{if(e.type==='pointerup')Phase9.commitGrenade();else Phase9.cancelGrenade()});
const fireOwner=hold('fire',()=>{if(!fh&&!fl){firedLatch=shoot('slash')===true}fh=true},()=>{fh=false;if(!fl)firedLatch=false;fireAimPointer=null;fireAimLast=null});
// Holding the bullet icon both fires and steers the camera, as in mobile FPS.
// Pointer capture in hold() lets the same finger drag outside the circle.
const fireBtn=$('fire');
fireBtn.addEventListener('pointerdown',e=>{if(inputBlocked()||e.pointerType==='mouse'||e.pointerId!==fireOwner())return;
 fireAimPointer=e.pointerId;fireAimLast={x:e.clientX,y:e.clientY};
});
addEventListener('pointermove',e=>{if(e.pointerId!==fireAimPointer||!fireAimLast||inputBlocked())return;
 e.preventDefault();const dx=e.clientX-fireAimLast.x,dy=e.clientY-fireAimLast.y;
 // Avoid sudden camera jumps on lost/late pointer events.
 P.yaw-=Math.max(-80,Math.min(80,dx))*SENS;
 P.pitch=Math.max(-1.45,Math.min(1.45,P.pitch-Math.max(-80,Math.min(80,dy))*SENS));
 fireAimLast={x:e.clientX,y:e.clientY};
},true);
for(const evt of ['pointerup','pointercancel','lostpointercapture'])fireBtn.addEventListener(evt,e=>{
 if(e.pointerId===fireAimPointer){fireAimPointer=null;fireAimLast=null;fh=false}
});
// Mobile alternate-fire: knife stab repeats while pressed, others toggle once.
const adsBtn=$('ads');
hold('ads',e=>{
 if(cur()==='knife'&&!Phase9.shieldActiveWeapon?.()){
  secondaryHeld=true;adsPointer=e.pointerId;adsAimLast={x:e.clientX,y:e.clientY};shoot('stab');
 }else Phase9.secondaryAction();
},e=>{if(e.pointerId===adsPointer){secondaryHeld=false;adsPointer=null;adsAimLast=null}});
addEventListener('pointermove',e=>{
 if(e.pointerId!==adsPointer||!adsAimLast||inputBlocked())return;
 e.preventDefault();
 P.yaw-=Math.max(-80,Math.min(80,e.clientX-adsAimLast.x))*SENS;
 P.pitch=Math.max(-1.45,Math.min(1.45,P.pitch-Math.max(-80,Math.min(80,e.clientY-adsAimLast.y))*SENS));
 adsAimLast={x:e.clientX,y:e.clientY};
},true);

$('walkBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();
 if(inputBlocked())return;mobileWalk=!mobileWalk;$('walkBtn').classList.toggle('active',mobileWalk);
});
hold('jump' ,()=>jmp=true,()=>jmp=false);hold('rel',reload);hold('swap',()=>setW(Phase14C.cycleIndex(inventory,wi,1,W))); 
const pad=$('pad'),jb=$('jb'),jk=$('jk');let jid=null,jo,lid=null,lp;
function releasePadPointer(id){
 if(id===jid){jid=null;jo=null;jx=jy=0;jb.style.display=jk.style.display='none'}
 if(id===lid){lid=null;lp=null}
 if(pad.hasPointerCapture?.(id))try{pad.releasePointerCapture(id)}catch(_){}
}
function resetPadPointers(){for(const id of [jid,lid])if(id!==null)releasePadPointer(id);jx=jy=0;jb.style.display=jk.style.display='none'}
pad.addEventListener('pointerdown',e=>{
 if(inputBlocked())return;
 if(e.pointerType==='mouse'){
  if(e.button===2){if(cur()==='knife'&&!Phase9.shieldActiveWeapon?.()){secondaryHeld=mouseSecondaryHeld=true;shoot('stab')}else Phase9.secondaryAction();return}
  if(e.button!==0)return;
  if(!fl&&!fh)firedLatch=shoot('slash')===true;fl=true;if(!document.pointerLockElement)requestLock();return
 }
 if(e.button!==0)return;
 // Each side owns its own finger; an extra finger on the left is not aim.
 const left=e.clientX<innerWidth*.42;
 if((left?jid:lid)!==null)return; // Ownership is independent of capture success.
 e.preventDefault();
 if(left){jid=e.pointerId;jo={x:e.clientX,y:e.clientY};jx=jy=0;jb.style.display=jk.style.display='block';jb.style.left=jo.x-55+'px';jb.style.top=jo.y-55+'px';jk.style.left=jo.x-25+'px';jk.style.top=jo.y-25+'px'}
 else{lid=e.pointerId;lp={x:e.clientX,y:e.clientY}}
 try{pad.setPointerCapture(e.pointerId)}catch(_){} // window release fallback below
});
addEventListener('pointermove',e=>{
 if(e.pointerId!==jid&&e.pointerId!==lid)return;
 if(inputBlocked()){releasePadPointer(e.pointerId);return}
 if(e.pointerType!=='touch'&&e.buttons===0){releasePadPointer(e.pointerId);return}
 e.preventDefault();
 if(e.pointerId===jid&&jo){let dx=e.clientX-jo.x,dy=e.clientY-jo.y;const l=Math.hypot(dx,dy),m=55;if(l>m){dx*=m/l;dy*=m/l}jx=dx/m;jy=dy/m;jk.style.left=jo.x+dx-25+'px';jk.style.top=jo.y+dy-25+'px'}
 else if(e.pointerId===lid&&lp){P.yaw-=Math.max(-80,Math.min(80,e.clientX-lp.x))*SENS;P.pitch=Math.max(-1.45,Math.min(1.45,P.pitch-Math.max(-80,Math.min(80,e.clientY-lp.y))*SENS));lp={x:e.clientX,y:e.clientY}}
},true);
const up=e=>{if(e.pointerType==='mouse'){if(e.type==='pointercancel'||e.button===0)fl=false;if(e.type==='pointercancel'||e.button===2){mouseSecondaryHeld=false;secondaryHeld=false}}if(e.pointerId===jid||e.pointerId===lid)releasePadPointer(e.pointerId)};
for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,up);
// Capture-phase window release works even when an overlay stops propagation.
for(const type of ['pointerup','pointercancel'])addEventListener(type,up,true);
// WebKit can end the touch sequence without delivering a final PointerEvent.
for(const type of ['touchend','touchcancel'])addEventListener(type,e=>{if(e.touches.length===0)resetPadPointers()},{capture:true,passive:true});
addEventListener('pagehide',resetPadPointers);
document.addEventListener('mousemove',e=>{if(document.pointerLockElement&&!inputBlocked()){P.yaw-=e.movementX*SENS*.5;P.pitch-=e.movementY*SENS*.5}});
const kmap={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',ArrowUp:'w',ArrowLeft:'a',ArrowDown:'s',ArrowRight:'d'};
addEventListener('keydown',e=>{if(e.code==='Escape'){if(Phase13.visibleOverlay()||Phase13.isSpectating())return;if(!$('buyMenu').classList.contains('hidden'))closeBuyMenu();else if(running){pauseToMenu();$('resumeBtn').classList.toggle('hidden',over||RuntimeHealth.halted())}return}if(inputBlocked())return;if(kmap[e.code])K[kmap[e.code]]=1;if(e.code==='Space')jmp=true;if(e.code==='ShiftLeft'||e.code==='ShiftRight')walkHeld=true;if(e.code==='KeyR')reload();if(e.code==='KeyB')openBuyMenu();if(e.code==='KeyG'&&!e.repeat)Phase9.throwGrenade(true);if(e.code==='KeyH'&&!e.repeat)Phase9.cycleGrenade();if(e.code==='KeyN')Phase9.toggleNightVision();if(e.code==='KeyE'&&!e.repeat){if(!(BombMode.holdUse?.(true)??BombMode.hold(true)))Phase9.useNearby()}
if(e.code==='KeyJ'&&!e.repeat)Phase9.dropPlayerWeapon();if(e.code==='Digit5'&&!e.repeat&&BombMode.hasHumanC4?.()){BombMode.selectC4();return;}if(e.code==='ControlLeft'||e.code==='ControlRight')Phase9.setCrouchInput(true);if(e.code==='KeyO'){openBuyMenu();renderBuyTab('equipment')}if(/^Digit[1-5]$/.test(e.code)){const target=Phase14C.keyIndex(inventory,+e.code[5],W);if(target>=0)setW(target)}});
addEventListener('keyup',e=>{if(e.code==='KeyG')Phase9.commitGrenade();if(e.code==='KeyE'){if(BombMode.holdUse)BombMode.holdUse(false);else BombMode.hold(false)};if(kmap[e.code])K[kmap[e.code]]=0;if(e.code==='Space')jmp=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')walkHeld=false;if(e.code==='ControlLeft'||e.code==='ControlRight')Phase9.setCrouchInput(false)});
Phase14E.install(document);
function suspendGameplayInput(){
 if(inputSuspended)return;inputSuspended=true;
 resetInputs();P.jumpHeld=false;Phase10.closeRadio();setScoreboard(false);
 resetWeaponVoices();CS16SFX.reset?.();LocalMapMedia.pauseAmbient?.();Phase10.resetVoices?.();
}
let inputSuspended=false;
function resumeGameplayInput(time=performance.now(),force=false){
 if(document.hidden)return false;
 // Focus/pageshow/visibilitychange can arrive in any order on iOS. A second
 // resume must not cancel pointers acquired after the first resume.
 const wasSuspended=inputSuspended;
 if(!wasSuspended&&!force)return false;
 if(wasSuspended){resetInputs();P.jumpHeld=false;inputSuspended=false;}
 t0=time;if(typeof FrameLimiter!=='undefined')FrameLimiter.reset();
 if(R&&cam&&viewCamera)resizeGameViewport();
 return true;
}
for(const type of ['blur','pagehide'])addEventListener(type,suspendGameplayInput);
addEventListener('focus',()=>resumeGameplayInput());
addEventListener('pageshow',e=>resumeGameplayInput(performance.now(),!!e.persisted));
addEventListener('orientationchange',()=>{
 // Rotation only changes viewport geometry. Do not cancel a new touch when
 // WebKit sends this event after focus and after the player's first gesture.
 if(!document.hidden&&R&&cam&&viewCamera)resizeGameViewport();
});
document.addEventListener('freeze',suspendGameplayInput);
document.addEventListener('resume',()=>resumeGameplayInput());
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendGameplayInput();else resumeGameplayInput()});
// Capture before any control claims the new pointer. No preventDefault or delayed reset:
// the first fresh tap must work, including a tap on fire or a scrollable menu.
function recoverBeforeInput(e){
 if(document.hidden)return;
 const time=performance.now();
 if(inputSuspended)resumeGameplayInput(time,true);
 if(e.isTrusted!==false&&AC&&(AC.state==='suspended'||AC.state==='interrupted'))AC.resume().catch(()=>{});
}
for(const type of ['pointerdown','keydown','touchstart'])addEventListener(type,recoverBeforeInput,{capture:true,passive:true});
// Per-control touchcancel handlers release only the cancelled pointer. A
// global reset here can eat an unrelated fresh finger on iOS app resume.
requestAnimationFrame(loop);
