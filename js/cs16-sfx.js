/* Optional GoldSrc-style effects imported from user-supplied CS16.Weba ZIPs.
   Audio-only enhancement, never required for game boot or a successful transaction. */
const CS16SFX=(()=>{
 'use strict';
 const supported=new Set([
  'player/pl_step1.wav','player/pl_step2.wav','player/pl_step3.wav','player/pl_step4.wav',
  'player/pl_tile1.wav','player/pl_tile2.wav','player/pl_tile3.wav','player/pl_tile4.wav',
  'player/pl_metal1.wav','player/pl_metal2.wav','player/pl_dirt1.wav','player/pl_dirt2.wav',
  'player/pl_jump1.wav','player/pl_jump2.wav','player/pl_fallpain1.wav',
  'player/pl_pain2.wav','player/pl_pain4.wav','player/bhit_flesh-1.wav',
  'player/bhit_flesh-2.wav','player/bhit_helmet-1.wav','player/bhit_kevlar-1.wav',
  'player/headshot1.wav','player/die1.wav','player/die2.wav',
  'items/kevlar.wav','items/tr_kevlar.wav','items/equip_nvg.wav',
  'items/nvg_on.wav','items/nvg_off.wav'
 ]);
 const extra=new Set(["events/enemy_died.wav", "events/friend_died.wav", "events/task_complete.wav", "events/tutor_msg.wav", "hostage/hos1.wav", "hostage/hos2.wav", "hostage/hos3.wav", "hostage/hos4.wav", "hostage/hos5.wav", "misc/cow.wav", "misc/killChicken.wav", "misc/plane_drone.wav", "misc/sheep.wav", "misc/talk.wav", "plats/vehicle1.wav", "plats/vehicle2.wav", "plats/vehicle3.wav", "plats/vehicle4.wav", "plats/vehicle6.wav", "plats/vehicle7.wav", "plats/vehicle_brake1.wav", "plats/vehicle_ignition.wav", "plats/vehicle_start1.wav", "player/bhit_flesh-3.wav", "player/breathe1.wav", "player/breathe2.wav", "player/death6.wav", "player/die3.wav", "player/headshot2.wav", "player/headshot3.wav", "player/pl_die1.wav", "player/pl_dirt3.wav", "player/pl_dirt4.wav", "player/pl_duct1.wav", "player/pl_duct2.wav", "player/pl_duct3.wav", "player/pl_duct4.wav", "player/pl_fallpain2.wav", "player/pl_fallpain3.wav", "player/pl_grate1.wav", "player/pl_grate2.wav", "player/pl_grate3.wav", "player/pl_grate4.wav", "player/pl_ladder1.wav", "player/pl_ladder2.wav", "player/pl_ladder3.wav", "player/pl_ladder4.wav", "player/pl_metal3.wav", "player/pl_metal4.wav", "player/pl_pain5.wav", "player/pl_pain6.wav", "player/pl_pain7.wav", "player/pl_shell1.wav", "player/pl_shot1.wav", "player/pl_slosh1.wav", "player/pl_slosh2.wav", "player/pl_slosh3.wav", "player/pl_slosh4.wav", "player/pl_snow1.wav", "player/pl_snow2.wav", "player/pl_snow3.wav", "player/pl_snow4.wav", "player/pl_snow5.wav", "player/pl_snow6.wav", "player/pl_swim1.wav", "player/pl_swim2.wav", "player/pl_swim3.wav", "player/pl_swim4.wav", "player/pl_tile5.wav", "player/pl_wade1.wav", "player/pl_wade2.wav", "player/pl_wade3.wav", "player/pl_wade4.wav", "player/sprayer.wav", "radio/blow.wav", "radio/bombdef.wav", "radio/bombpl.wav", "radio/circleback.wav", "radio/clear.wav", "radio/com_followcom.wav", "radio/com_getinpos.wav", "radio/com_go.wav", "radio/com_reportin.wav", "radio/ct_affirm.wav", "radio/ct_backup.wav", "radio/ct_coverme.wav", "radio/ct_enemys.wav", "radio/ct_fireinhole.wav", "radio/ct_imhit.wav", "radio/ct_inpos.wav", "radio/ct_point.wav", "radio/ct_reportingin.wav", "radio/ctwin.wav", "radio/elim.wav", "radio/enemydown.wav", "radio/fallback.wav", "radio/fireassis.wav", "radio/flankthem.wav", "radio/followme.wav", "radio/getout.wav", "radio/go.wav", "radio/hitassist.wav", "radio/hosdown.wav", "radio/letsgo.wav", "radio/locknload.wav", "radio/matedown.wav", "radio/meetme.wav", "radio/moveout.wav", "radio/negative.wav", "radio/position.wav", "radio/regroup.wav", "radio/rescued.wav", "radio/roger.wav", "radio/rounddraw.wav", "radio/sticktog.wav", "radio/stormfront.wav", "radio/takepoint.wav", "radio/terwin.wav", "radio/vip.wav"]);
 let ctx=null,accum=0,seq=0,unlocked=false,epoch=0;
 const active=new Set(),stepVariants=new Map();
 const cache=AssetMemory.audioCache(4,12);
 function audio(){if(!ctx){const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)return null;try{ctx=new AudioCtor()}catch(_){return null}}return ctx}
 function unlock(){const a=audio();if(a&&(a.state==='suspended'||a.state==='interrupted'))a.resume().catch(()=>{});unlocked=true}
 // Called during input gestures; do not create a WebAudio context on every frame.
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
 document.addEventListener('keydown',unlock,{capture:true,passive:true});
 function load(file){if(!supported.has(file)&&!extra.has(file))return Promise.resolve(null);
  return cache.load(file,()=>fetch(extra.has(file)?'assets/cs16-extra-sounds/'+file:'assets/cs16-sfx/sound/'+file)
   .then(r=>{if(!r.ok)throw Error('CS16 audio HTTP '+r.status);return r.arrayBuffer()})
   .then(bytes=>audio()?.decodeAudioData(bytes)||null))}
 function play(file,gain=0.33,pan=0,quiet=false,slot=null,voiceKey=null){if((!supported.has(file)&&!extra.has(file))||!unlocked||document.hidden)return false;
  const a=audio();if(!a)return false;
  const token=epoch;
  const custom=slot?(CharacterImport.audio(slot,'player',file.split('/').pop().replace(/\.wav$/i,''))||(voiceKey&&CharacterImport.audio(slot,'player',voiceKey))):null;
  const sourceTask=custom?cache.load(custom,()=>custom.arrayBuffer().then(bytes=>a.decodeAudioData(bytes))).then(b=>b||load(file)):load(file);
  sourceTask.then(buffer=>{if(!buffer||!ctx||ctx.state!=='running'||token!==epoch||document.hidden)return;
   // Reserve room for player effects: positional bot footsteps are optional voices.
   if(active.size>=(quiet?6:10))return;
   const setting=document.getElementById('volume'),volume=setting?Math.max(0,Math.min(1,Number(setting.value)||0)):0.8;
   if(volume<=0)return;const source=ctx.createBufferSource(),v=ctx.createGain();v.gain.value=Math.min(1,gain*volume);
   source.buffer=buffer;source.connect(v);const stereo=pan?ctx.createStereoPanner?.():null;if(stereo){stereo.pan.value=Math.max(-1,Math.min(1,pan));v.connect(stereo);stereo.connect(ctx.destination)}else v.connect(ctx.destination);
   active.add(source);source.onended=()=>{active.delete(source);source.disconnect();v.disconnect();stereo?.disconnect()};source.start();
  });return true}
 function step(dt,move,onGround,silent,crouching,surface='generic'){
  if(!onGround||move<0.1||silent){accum=0;return false}
  accum+=Math.min(Math.max(0,dt),0.08)*Math.min(move,1)*(crouching?0.65:1);
  const delay=crouching?0.57:0.38;if(accum<delay)return false;accum-=delay;
  return footstep(typeof surface==='function'?surface():surface,crouching?.12:.2);
 }
 function surfaceForTag(tag){return ({D:'dirt',M:'metal',V:'duct',G:'grate',T:'tile',S:'slosh',N:'snow'})[tag]||'generic';}
 function footstep(surface='generic',gain=.2,pan=0,quiet=false){
  const base=({ladder:'pl_ladder',water:'pl_swim',wade:'pl_wade',dirt:'pl_dirt',metal:'pl_metal',tile:'pl_tile',duct:'pl_duct',grate:'pl_grate',slosh:'pl_slosh',snow:'pl_snow'})[surface]||'pl_step';
  const idx=stepVariants.get(base)||0;stepVariants.set(base,idx+1);return play('player/'+base+(idx%4+1)+'.wav',gain,pan,quiet);
 }
 function reset(){for(const key of [...cache.keys()])if(typeof key!=='string')cache.delete(key);accum=0;stepVariants.clear();epoch++;for(const source of active){try{source.stop()}catch(e){}}active.clear()}
 function movementSurface(medium,level,floor){return medium==='ladder'?'ladder':medium==='water'?'water':level>0?'wade':typeof floor==='function'?floor():floor||'generic';}
 function jump(){return play('player/pl_jump'+(++seq%2+1)+'.wav',0.18)}
 function hurt({armorUsed=0,hpDamage=0},health,hitgroup){
  if(hpDamage<=0)return false;
  if(health<=0)return play('player/die'+(++seq%3+1)+'.wav',0.33,0,false,playerAvatar?.userData?.characterVoice,'death');
  if(hitgroup==='head')return play('player/headshot'+(++seq%3+1)+'.wav',0.3,0,false,playerAvatar?.userData?.characterVoice,'pain');
  if(armorUsed>0)return play('player/bhit_kevlar-1.wav',0.23,0,false,playerAvatar?.userData?.characterVoice,'pain');
  return play('player/bhit_flesh-'+(++seq%3+1)+'.wav',0.26,0,false,playerAvatar?.userData?.characterVoice,'pain')
 }
 function characterVoice(slot,kind,gain=.2,pan=0){const key=kind==='death'?'die1':'pl_pain2';if(!CharacterImport.audio(slot,'player',key)&&!CharacterImport.audio(slot,'player',kind))return false;return play('player/'+key+'.wav',gain,pan,true,slot,kind)}
 function purchase(id){if(id==='nightvision')return play('items/equip_nvg.wav',0.3);
  if(id==='kevlar'||id==='helmet')return play('items/kevlar.wav',0.32);return false}
 function nightVision(on){return play('items/nvg_'+(on?'on':'off')+'.wav',0.23)}
 return Object.freeze({step,footstep,surfaceForTag,movementSurface,reset,jump,hurt,characterVoice,purchase,nightVision,play,has:file=>supported.has(file)||extra.has(file)});
})();
window.CS16SFX=CS16SFX;
