/* BLOCK STRIKE Tahap 13: classic walk, spectator, flashlight, loadout UI,
   team changes, blood decals and persistent presentation settings. */
const Phase13=(()=>{
 'use strict';
 let spectating=false,observed=null,spectatorView=null,spectatorKey='',queuedTeam=null,deadThisRound=false;
 let specMode='first',autoDirector=true,directorClock=0,orbitYaw=0,orbitPitch=.33,freeYaw=0,freePitch=0,mapHeight=44;
 const freePos=new THREE.Vector3(),mapCenter=new THREE.Vector3(),specKeys={forward:false,back:false,left:false,right:false,up:false,down:false};
 let specGesture=null,specAnalog=null,specViewToken=0;

 let flashlight=null,flashTarget=null,lightEnabled=false,hand='right',returningToGame=false;
 const bloodDecals=[],bloodBursts=[],bulletDecals=[];
 function moveSpeed(k,options){return BSP.maxSpeed(k,options)}
 function isSpectating(){return spectating}
 function visibleOverlay(){return ['weaponOverlay','teamOverlay','settingsScreen'].some(id=>!$(id).classList.contains('hidden'))}
 function blocked(){return !running||spectating||visibleOverlay()||over}
 // The converted shield rigs are authored opposite to the ordinary firearms.
 // CS 1.6 keeps shield equipment right-handed even with cl_righthand 0.
 function applyHand(model){if(model){const shield=model.userData?.viewAsset?.startsWith('shield_');model.scale.x=(shield||hand==='left'?-1:1)*Math.abs(model.scale.x||1)}}
 function setHand(next){hand=next==='left'?'left':'right';$('weaponHand').value=hand;applyHand(vm);applyHand(spectatorView);try{localStorage.setItem('bs13-weapon-hand',hand)}catch(e){}}
 function bindLight(camera){if(!camera)return;
  const light=new THREE.SpotLight(0xfff1cb,2.4,58,Math.PI/7,.45,1.15);
  light.visible=false;light.castShadow=false;light.position.set(0,-.07,.15);
  const target=new THREE.Object3D();target.position.set(0,-.08,-14);camera.add(light,target);light.target=target;
  flashlight=light;flashTarget=target;
 }
 function toggleFlashlight(){if(blocked())return false;lightEnabled=!lightEnabled;
  if(flashlight)flashlight.visible=lightEnabled;
  $('flashBtn').classList.toggle('active',lightEnabled);say(lightEnabled?'FLASHLIGHT ON':'FLASHLIGHT OFF');return true}
 function renderWeaponSelector(){const host=$('weaponItems');host.replaceChildren();
  const shield=Phase14C.hasShield(inventory),cats=shield?[[ 'PISTOL + SHIELD',['shield']],['KNIFE',inventory.filter(k=>k==='knife')]]:[['PRIMARY',inventory.filter(k=>W[k]?.slot==='primary')],['SECONDARY',inventory.filter(k=>W[k]?.slot==='pistol')],['KNIFE',inventory.filter(k=>k==='knife')]];
  for(const [label,weapons] of cats){if(!weapons.length)continue;
   const title=document.createElement('b');title.textContent=label;host.appendChild(title);
   for(const k of weapons){const button=document.createElement('button');button.className='weapon-choice';button.type='button';button.dataset.weapon=k;
    const img=document.createElement('img');img.src=CS16VGUI.icon(k)||'assets/ui/icons/'+k+'.png';img.alt='';img.onerror=()=>{img.hidden=true};button.append(img);
    const text=document.createElement('span');text.textContent=k==='shield'?W[Phase14C.pistol(inventory)||'usp'].n+' + SHIELD':W[k].n;button.append(text);
    if(k===cur())button.classList.add('active');button.addEventListener('click',()=>{const i=inventory.indexOf(k);if(i>=0)setW(i);closeWeaponSelector()});host.appendChild(button)
   }
  }
  const g=document.createElement('b');g.textContent='GRENADES';host.append(g);
  for(const type of ['he','flash','smoke']){const b=document.createElement('button');b.className='weapon-choice';b.disabled=!grenades[type];b.textContent=`${type.toUpperCase()} · ${grenades[type]}`;b.onclick=()=>{selectedGrenade=type;Phase9.updateHud();closeWeaponSelector()};host.append(b)}
 }
 function closeWeaponSelector(){$('weaponOverlay').classList.add('hidden')}
 function openWeaponSelector(){if(!running||spectating)return;Phase10.closeRadio();renderWeaponSelector();$('weaponOverlay').classList.remove('hidden')}
 function closeTeamMenu(){$('teamOverlay').classList.add('hidden')}
 function openTeamMenu(){if(!running)return;Phase10.closeRadio();$('teamOverlay').classList.remove('hidden');$('teamQueued').textContent=queuedTeam?'Queued: '+queuedTeam:''}
 function queueTeam(team){if(team!=='CT'&&team!=='T')return false;queuedTeam=team===playerTeam?null:team;closeTeamMenu();say(queuedTeam?`SWITCH TO ${queuedTeam} NEXT ROUND`:'TEAM SWITCH CANCELLED');return true}
 // The reference GoldSrc UI supplies playerprev/playernext, mode and Auto Director controls.
 // Actual Three.js cameras are local single-player equivalents, not network observers.
 function clearSpecWeapon(){
  specViewToken++;spectatorKey='';
  if(spectatorView){
   const mixer=spectatorView.userData.animation.mixer;
   mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot());
   const skeletons=new Set();spectatorView.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton)});
   skeletons.forEach(s=>s.dispose());
   viewScene?.remove(spectatorView);spectatorView=null;
  }
 }
 function resetSpecView(){if(observed?.g)observed.g.visible=true;observed=null;clearSpecWeapon()}
 function clearSpecAnalog(){
  const id=specAnalog?.id;specAnalog=null;
  const stick=$('spectatorMove');
  if(id!=null&&stick.hasPointerCapture?.(id))try{stick.releasePointerCapture(id)}catch(_){};
  stick.firstElementChild.style.transform='';
 }
 function resetSpecMovement(){
  for(const key of Object.keys(specKeys))specKeys[key]=false;
  const id=specGesture?.id;specGesture=null;const pad=$('pad');if(id!=null&&pad.hasPointerCapture?.(id))try{pad.releasePointerCapture(id)}catch(_){};clearSpecAnalog();
 }
 function resetMatch(){spectating=false;deadThisRound=false;queuedTeam=null;resetSpecView();resetSpecMovement();specMode='first';autoDirector=true;directorClock=0;mapHeight=44;
  $('specMode').value='first';$('spectatorHud').classList.add('hidden');$('spectatorTop').classList.add('hidden');$('spectatorMove').classList.add('hidden');document.body.classList.remove('spectating');
  lightEnabled=false;if(flashlight)flashlight.visible=false;$('flashBtn').classList.remove('active');clearBlood()}
 function beforeRound(){const changed=!!queuedTeam&&queuedTeam!==playerTeam;
  if(changed){playerTeam=queuedTeam;playerClass=(playerTeam==='CT'?'gign':'arctic');Phase10.resetMatch();money=window.PhaseMenu15?.rules.startMoney??800}
  if(deadThisRound||changed){armor=0;helmet=false;defuseKit=false;nightVision=false;grenades={he:0,flash:0,smoke:0};
   inventory=[playerTeam==='CT'?'usp':'glock18','knife'];wi=0;
   resetPlayerAmmo();
   setW(0);Phase9.resetMatch()}
  queuedTeam=null;spectating=false;deadThisRound=false;resetSpecView();resetSpecMovement();directorClock=0;
  $('spectatorHud').classList.add('hidden');$('spectatorTop').classList.add('hidden');$('spectatorMove').classList.add('hidden');document.body.classList.remove('spectating');
  if(vm)vm.visible=true;
  if(flashlight)flashlight.visible=lightEnabled;
  clearBlood();if(typeof Phase10!=='undefined')Phase10.preview();
 }
 function aliveBots(){return Spectator15E.teammates(bots,playerTeam)}
 function syncObservedVisual(){
  if(!observed)return;
  observed.g.visible=specMode!=='first';clearSpecWeapon();
  if(specMode==='first')loadSpectatorWeapon(observed);
 }
 function watchBot(next){
  if(next===observed)return next;
  if(observed?.g)observed.g.visible=true;
  observed=next;clearSpecWeapon();
  if(next)syncObservedVisual();
  return next;
 }
 function pickBot(direction=1,manual=false){
  const next=Spectator15E.nextBot(bots,playerTeam,observed,direction);
  watchBot(next);
  if(manual){autoDirector=false;directorClock=0}
  updateSpecHud();return next;
 }
 function spectatorAsset(bot){
  if(BombMode.isPlanting?.(bot))return 'c4';
  const grenade=bot.grenadeVisual?.id;
  if(grenade&&['hegrenade','flashbang','smokegrenade'].includes(grenade))
   return bot.hasBotShield&&bot.shieldReady?'shield_'+grenade:grenade;
  const id=bot.weaponId||'knife';
  return bot.hasBotShield&&bot.shieldReady&&(SHIELD_NATIVE_PISTOLS.has(id)||id==='knife')?'shield_'+id:id;
 }
 function spectatorWeaponKey(bot){return spectatorAsset(bot)+'@'+(bot.botId||bot.name)}
 function spectatorUnsilenced(bot,asset){return (asset==='usp'||asset==='m4a1')&&!bot.silenced}
 function spectatorIdle(state,raised,unsilenced=false){
  return weaponSequence(state,raised?['shield_idle','idle1','idle']:unsilenced?['idle_unsil','idle','idle1','idle3']:['idle','idle1','idle3'])||state.clipNames[0];
 }
 // Use the firing bot's actual magazine, dual-hand and silencer state. The
 // ordinary spectator 'shoot1' fallback lost native fire variants entirely.
 function spectatorFireClip(state,bot,asset,unsilenced){
  if(asset==='knife'||asset==='shield_knife'){
   const stab=bot.lastShot?.sound==='knife_stab.wav';
   return weaponSequence(state,stab?['stab','hit','stab_miss']:['midslash1','midslash2','slash','slash1']);
  }
  if(asset==='elite'){
   const side=bot.dualVisualSide?'left':'right';
   const clips=weaponSequenceNames(state,n=>new RegExp('^shoot_'+side+'[1-5]$').test(n));
   state.fireCycle=(state.fireCycle||0)+1;
   return bot.ammo===0?weaponSequence(state,['shoot_'+side+'last']):clips[(state.fireCycle-1)%clips.length];
  }
  if(asset==='glock18'&&state.actions.shoot3)
   return weaponSequence(state,[bot.ammo===0?'shoot_empty':'shoot3']);
  const suffix=unsilenced?'_unsil':'';
  if(bot.ammo===0){const last=weaponSequence(state,['shootlast'+suffix,'shoot_empty']);if(last)return last}
  const shots=weaponSequenceNames(state,n=>/^shoot(?:__?\d+|\d+)?(?:_unsil)?$/.test(n)&&n.endsWith('_unsil')===unsilenced);
  state.fireCycle=(state.fireCycle||0)+1;
  return shots.length?shots[(state.fireCycle-1)%shots.length]:weaponSequence(state,['shoot1'+suffix,'shoot'+suffix,'shoot1','shoot']);
 }
 function spectatorReloadClip(state,unsilenced){
  return weaponSequence(state,unsilenced?['reload_unsil','reload','start_reload']:['reload','start_reload']);
 }
 function loadSpectatorWeapon(bot){
  if(!bot||specMode!=='first')return;
  const asset=spectatorAsset(bot);
  spectatorKey=spectatorWeaponKey(bot);
  const token=++specViewToken;
  ensureWeaponAsset(asset).then(gltf=>{
   if(token!==specViewToken||!spectating||specMode!=='first'||observed!==bot||!viewScene)return;
   if(spectatorAsset(bot)!==asset){spectatorKey='';return}
   const model=cloneViewmodel(gltf,asset);const mixer=new THREE.AnimationMixer(model);
   const actions={};
   for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
   const state={mixer,actions,clipNames:Object.keys(actions),fireCycle:0,queue:[]};
   const raised=asset.startsWith('shield_')&&!!bot.shieldRaised;
   const unsilenced=spectatorUnsilenced(bot,asset);
   const idle=spectatorIdle(state,raised,unsilenced);
   const weapon=new THREE.Group();weapon.userData.viewAsset=asset;weapon.add(model);applyHand(weapon);
   Object.assign(weapon.userData,{shieldRaised:raised,silenced:!!bot.silenced,animation:state,
    lastShot:bot.lastShot?.at,lastReload:bot.lastReload,lastSilencer:bot.lastSilencerToggle?.at});
   mixer.addEventListener('finished',e=>{
    if(e.action!==state.activeAction||spectatorView!==weapon)return;
    const next=state.queue?.shift();
    if(next&&playWeaponClip(state,next,false))return;
    playWeaponClip(state,spectatorIdle(state,weapon.userData.shieldRaised,spectatorUnsilenced(bot,asset)),true);
   });
   if(playWeaponClip(state,idle,true)){
    state.activeAction.stopFading();mixer.update(0);
   }
   // Bot grenade visuals exist only during the short, authored throw window.
   // Do not show a static grenade while the bot performs a throw animation.
   if(bot.grenadeVisual?.pending&&['hegrenade','flashbang','smokegrenade'].includes(bot.grenadeVisual.id)){
    if(playWeaponClip(state,weaponSequence(state,['throw','pullpin']),false)){
     const duration=state.activeAction.getClip().duration;
     state.activeAction.setEffectiveTimeScale(duration/.325);
    }
   }
   spectatorView=weapon;viewScene.add(weapon);
  }).catch(()=>{});
 }
 function updateSpectatorWeapon(bot,dt){
  if(!spectatorView||!bot)return;
  const data=spectatorView.userData,state=data.animation,asset=data.viewAsset;
  const raised=asset.startsWith('shield_')&&!!bot.shieldRaised;
  const fired=data.lastShot!==bot.lastShot?.at,reloaded=data.lastReload!==bot.lastReload;
  const toggled=data.lastSilencer!==bot.lastSilencerToggle?.at;
  data.lastShot=bot.lastShot?.at;data.lastReload=bot.lastReload;data.lastSilencer=bot.lastSilencerToggle?.at;
  const unsilenced=spectatorUnsilenced(bot,asset);
  const defusing=!!BombMode.isDefusing?.(bot);spectatorView.position.y=0;
  if(asset==='c4'){
   if(state.activeName!=='pressbutton'&&BombMode.isPlanting?.(bot)){playWeaponClip(state,'pressbutton',true);state.activeAction?.setDuration(3)}
  }else if(defusing){
   if(state.activeName!==spectatorIdle(state,raised,unsilenced))playWeaponClip(state,spectatorIdle(state,raised,unsilenced),true);
  }else if(raised!==data.shieldRaised){
   data.shieldRaised=raised;state.queue=[];
   if(!playWeaponClip(state,weaponSequence(state,[raised?'shield_up':'shield_down']),false))playWeaponClip(state,spectatorIdle(state,raised,unsilenced),true);
  }else if(toggled&&(asset==='usp'||asset==='m4a1')){
   data.silenced=!!bot.silenced;state.queue=[];
   const clip=weaponSequence(state,[bot.silenced?'add_silencer':'detach_silencer']);
   if(!playWeaponClip(state,clip,false))playWeaponClip(state,spectatorIdle(state,raised,unsilenced),true);
  }else if(!raised&&fired){
   state.queue=[];
   const clip=spectatorFireClip(state,bot,asset,unsilenced);
   if(clip)playWeaponClip(state,clip,false);
  }else if(!raised&&reloaded){
   state.queue=[];
   const clip=spectatorReloadClip(state,unsilenced);
   if(clip){
    if(clip==='start_reload'){
     const insert=weaponSequence(state,['insert']),after=weaponSequence(state,['after_reload']);
     if(insert)state.queue.push(insert);if(after)state.queue.push(after);
    }
    playWeaponClip(state,clip,false);
    // Spectator and bot must finish reloading on the same gameplay timer.
    if(bot.reloadLeft>0&&state.activeAction&&clip!=='start_reload'){
     const duration=state.activeAction.getClip().duration;
     state.activeAction.setEffectiveTimeScale(duration/Math.max(.1,bot.reloadLeft));
    }
   }
  }
  state.mixer.update(dt);
 }
 function setSpecMode(next){
  if(!Spectator15E.modeIds.includes(next))return false;
  const previous=specMode;specMode=next;resetSpecMovement();
  if(specMode==='chase'){orbitYaw=observed?.g.rotation.y||0;orbitPitch=.33}
  if(specMode==='free'&&previous!=='free'){
   freePos.copy(['map','chase-map'].includes(previous)&&observed?observed.g.position.clone().add(new THREE.Vector3(0,1.8,0)):cam.position);freeYaw=observed?.g.rotation.y??cam.rotation.y;freePitch=0;
  }
  if(specMode==='map'&&previous!=='map'){
   const ct=activeMapData?.spawn?.ct,t=activeMapData?.spawn?.t;
   mapCenter.set(ct&&t?(ct[0]+t[0])/2:0,0,ct&&t?(ct[2]+t[2])/2:0);
  }
  if(specMode==='first'||previous==='first')syncObservedVisual();
  $('specMode').value=next;updateSpecHud();return true;
 }
 function toggleDirector(next){autoDirector=typeof next==='boolean'?next:!autoDirector;directorClock=0;updateSpecHud();return autoDirector}
 function updateSpecHud(){
  if(!spectating)return;
  const list=aliveBots(),b=observed;
  const mode=Spectator15E.MODES.find(x=>x.id===specMode);$('specModeLabel').textContent=mode?.label.toUpperCase()||'SPECTATOR';
  $('specName').textContent=b?.name||(list.length?'SELECT TEAMMATE':'NO TEAMMATES ALIVE');
  $('specInfo').textContent=b?`${b.team} · HP ${Math.ceil(b.hp)} · ${W[b.weaponId]?.n||'KNIFE'}`:'Waiting for next round';
  $('specAuto').textContent=autoDirector?'AUTO ON':'AUTO OFF';$('specAuto').classList.toggle('active',autoDirector);
  $('specAuto').setAttribute('aria-pressed',String(autoDirector));
  $('specPrev').disabled=$('specNext').disabled=!list.length;
  $('spectatorMove').classList.toggle('hidden',!isT||!['free','map'].includes(specMode));
  $('specHelp').textContent=specMode==='free'?'Drag to look · WASD / arrows to move · Space up · Shift down':specMode==='map'?'Drag / WASD to pan · Mouse wheel to zoom':'◀ ▶ teammate · C mode · P director';
  const ct=bots.filter(x=>!x.dead&&x.team==='CT').length+(playerTeam==='CT'&&P.hp>0?1:0);
  const t=bots.filter(x=>!x.dead&&x.team==='T').length+(playerTeam==='T'&&P.hp>0?1:0);
  $('specScores').textContent=`CT ${ct} ALIVE · T ${t} ALIVE`;
  $('specTime').textContent=`ROUND ${round} · ${Math.max(0,Math.ceil(roundTime))}s`;
 }
 function onDeath(){if(spectating)return;
  deadThisRound=true;spectating=true;aiming=false;zoomIdx=0;syncAim();directorClock=0;
  if(vm)vm.visible=false;if(flashlight)flashlight.visible=false;
  document.body.classList.add('spectating');$('spectatorHud').classList.remove('hidden');$('spectatorTop').classList.remove('hidden');
  setSpecMode('first');pickBot(0);say('ELIMINATED · SPECTATOR MODE');
 }
 function botAim(b,position){
  let yaw=b.g.rotation.y,pitch=0;
  if(b.visibleEnemy?.pos){const p=b.visibleEnemy.pos,dx=p.x-position.x,dz=p.z-position.z;
   yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(p.y+1.1-position.y,Math.hypot(dx,dz));}
  return {yaw,pitch:Spectator15E.clamp(pitch,-1.3,1.3)};
 }
 function chaseCam(target,yaw,pitch,distance){
  // Raycast from subject to desired viewpoint so walls don't obscure the observed bot.
  const offset=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);
  const desired=target.clone().add(offset),dir=desired.clone().sub(target),length=dir.length();
  let actual=length;
  if(length>.01&&obsM.length){ray.set(target,dir.normalize());ray.near=.12;ray.far=length;
   const hit=ray.intersectObjects(obsM,true).find(x=>x.distance>.15);
   if(hit)actual=Math.max(.24,hit.distance-.16);
   ray.near=0;
  }
  cam.position.copy(target).addScaledVector(dir.normalize(),actual);cam.lookAt(target);
 }
 function moveFree(dt){
  const forward=Number(specKeys.forward)-Number(specKeys.back)-(specAnalog?.y||0);
  const side=Number(specKeys.right)-Number(specKeys.left)+(specAnalog?.x||0);
  const up=(specKeys.up?1:0)-(specKeys.down?1:0),length=Math.max(1,Math.hypot(forward,side,up));
  const speed=(specMode==='map'?18:10)*Math.min(dt,.05)/length;
  const dx=(-Math.sin(freeYaw)*forward+Math.cos(freeYaw)*side)*speed,dz=(-Math.cos(freeYaw)*forward-Math.sin(freeYaw)*side)*speed;
  if(specMode==='map'){mapCenter.x+=dx;mapCenter.z+=dz}
  else {freePos.x+=dx;freePos.z+=dz;freePos.y=Spectator15E.clamp(freePos.y+up*speed,1,100)}
 }
 function updateSpectator(dt){if(!spectating)return;
  if(!Spectator15E.alive(observed,playerTeam)){pickBot(1)}
  const b=observed;
  if(!b&&!['free','map'].includes(specMode))setSpecMode('free');
  directorClock+=Math.max(0,dt);
  if(b&&autoDirector&&directorClock>=3.5){directorClock=0;const candidate=Spectator15E.director(bots,playerTeam,b,performance.now());
   if(candidate!==b)watchBot(candidate)}
  const subject=observed;
  const base=subject?(subject.visualMount||subject.g).getWorldPosition(new THREE.Vector3()):null;
  const eye=base?.clone().add(new THREE.Vector3(0,subject.crouching?1.14:1.57,0));
  if(specMode==='first'){
   subject.g.visible=false;updateSpectatorWeapon(subject,dt);
   cam.position.copy(eye);const aim=BombMode.isDefusing?.(subject)?BombMode.defuseLook(cam.position,subject.g.rotation.y):botAim(subject,cam.position);cam.rotation.set(aim.pitch,aim.yaw,0,'YXZ');
   const key=spectatorWeaponKey(subject);
   if(spectatorKey!==key){clearSpecWeapon();loadSpectatorWeapon(subject)}
  }else if(specMode==='locked'){
   chaseCam(eye,subject.g.rotation.y,.32,3.6);
  }else if(specMode==='chase'){
   chaseCam(eye,orbitYaw,orbitPitch,4.5);
  }else if(specMode==='free'){
   moveFree(dt);cam.position.copy(freePos);cam.rotation.set(freePitch,freeYaw,0,'YXZ');
  }else if(specMode==='map'){
   moveFree(dt);cam.position.set(mapCenter.x,mapHeight,mapCenter.z);cam.rotation.set(-Math.PI/2,0,0,'YXZ');
  }else if(specMode==='chase-map'){
   cam.position.set(base.x,base.y+34,base.z);cam.rotation.set(-Math.PI/2,subject.g.rotation.y,0,'YXZ');
  }
  if(cam.fov!==baseFov){cam.fov=baseFov;cam.updateProjectionMatrix()}
  if(window.bspSky)window.bspSky.position.copy(cam.position);
  // HUD state changes are inexpensive; batch with the game frame rather than forcing layout on pointermove.
  hudSpecClock+=dt;if(hudSpecClock>.15){hudSpecClock=0;updateSpecHud()}
 }
 let hudSpecClock=0;
 function shouldRenderSpecWeapon(){return spectating&&specMode==='first'&&!!spectatorView}
 function checkRoundEnd(){if(!running||roundWait>0||round<1)return;
  const aliveCT=bots.some(b=>!b.dead&&b.team==='CT')||(playerTeam==='CT'&&P.hp>0);
  const aliveT=bots.some(b=>!b.dead&&b.team==='T')||(playerTeam==='T'&&P.hp>0);
  if(!aliveCT||!aliveT){const winner=aliveCT?'CT':aliveT?'T':null;
   if(winner)Phase10.roundEnd(winner);roundWait=3;
  }
 }
 function openSettings(){if(!running||spectating)return;
  returningToGame=true;running=false;resetInputs();$('settingsScreen').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock()}
 function closeSettings(){if(!returningToGame)return;returningToGame=false;
  if(!over){running=true;t0=performance.now();resetInputs()}}
 const bloodTexCache=new Map();function bloodTexture(id){if(!bloodTexCache.has(id)){const tex=new THREE.TextureLoader().load('assets/phase10/fx/'+id+'.png');bloodTexCache.set(id,tex)}return bloodTexCache.get(id)}
 let bulletTexture=null;
 function bulletMarkTexture(){
  if(bulletTexture)return bulletTexture;
  const size=32,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const dx=(x+0.5-size/2)/(size/2),dy=(y+0.5-size/2)/(size/2),d=Math.hypot(dx,dy),i=(y*size+x)*4;
   const edge=.72+.08*Math.sin(Math.atan2(dy,dx)*7);const alpha=Math.max(0,Math.min(1,(edge-d)*7));
   data[i]=data[i+1]=data[i+2]=d<.31?22:64;data[i+3]=Math.round(alpha*(d<.31?230:140));
  }
  bulletTexture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);bulletTexture.magFilter=bulletTexture.minFilter=THREE.LinearFilter;bulletTexture.needsUpdate=true;return bulletTexture;
 }
 function removeDecal(d){d.parent?.remove(d);d.geometry.dispose();d.material.dispose()}
 // Clip the hit triangle in decal-local XY against the original decal square.
 // Fallback only: an interior supported patch still spans coplanar triangles.
 function clippedDecalGeometry(hit,normal,u,v,size){
  const obj=hit.object,attr=obj.geometry?.getAttribute('position'),half=size*.5;
  if(!attr||!hit.face||half<=0)return null;
  let poly=[hit.face.a,hit.face.b,hit.face.c].map(i=>{
   const p=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(obj.matrixWorld).sub(hit.point);
   return [p.dot(u),p.dot(v)];
  });
  const clip=(axis,sign)=>{
   const out=[];for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=half-sign*a[axis],db=half-sign*b[axis];
    if(da>=0)out.push(a);
    if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
   }poly=out;
  };
  for(const axis of [0,1])for(const sign of [-1,1])clip(axis,sign);
  if(poly.length<3)return null;
  const area=poly.reduce((a,p,i)=>{const n=poly[(i+1)%poly.length];return a+p[0]*n[1]-p[1]*n[0]},0)*.5;
  if(Math.abs(area)<size*size*.005)return null;
  if(area<0)poly.reverse();
  const positions=[],uv=[];
  for(let i=1;i<poly.length-1;i++)for(const p of [poly[0],poly[i],poly[i+1]]){
    positions.push(p[0],p[1],0);uv.push(p[0]/size+.5,p[1]/size+.5);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return geo;
 }
 // Shrink to a supported patch instead of extending a plane across a corner,
 // opening or masked surface. Raycast only a single hit mesh, not the entire map.
 function surfaceDecal(hit,direction,size,map,list,cap,opacity){
  const obj=hit?.object;if(!obj?.isMesh||!hit.face||!obj.parent||obj.userData.bot||Array.isArray(obj.material)||obj.material.transparent||obj.material.alphaTest>0)return false;
  obj.updateWorldMatrix(true,false);
  const normal=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(obj.matrixWorld)).normalize();
  if(normal.dot(direction)>0)normal.negate();if(normal.dot(direction)>-.08)return false;
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal),u=new THREE.Vector3(1,0,0).applyQuaternion(q),v=new THREE.Vector3(0,1,0).applyQuaternion(q);
  const test=new THREE.Raycaster(),back=normal.clone().negate();test.far=.06;
  const originalSize=size;let accepted=false;
  for(let attempt=0;attempt<3;attempt++,size*=.5){
   const half=size*.5;
   accepted=[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1],[0,0]].every(([x,y])=>{
    const sample=hit.point.clone().addScaledVector(u,x*half).addScaledVector(v,y*half);
    test.set(sample.clone().addScaledVector(normal,.03),back);
    const found=test.intersectObject(obj,false)[0];return !!found&&found.point.distanceTo(sample)<.008;
   });if(accepted)break;
  }
  const geometry=accepted?new THREE.PlaneGeometry(size,size):clippedDecalGeometry(hit,normal,u,v,originalSize);
  if(!geometry)return false;
  const decal=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,opacity}));
  decal.position.copy(hit.point).addScaledVector(normal,.003);decal.quaternion.copy(q);decal.renderOrder=1;S.add(decal);obj.attach(decal);list.push(decal);
  while(list.length>cap)removeDecal(list.shift());return true;
 }
 // Budget costly support checks across a frame; marks are cosmetic only.
 let wallMarkAttempts=0;
 function wallHit(hit,direction,origin=null){
  if(!S||!hit||!direction||wallMarkAttempts>=12)return false;
  const col=window.bspCol;
  if(origin&&col?.pointClip&&BSP.pointLineBlocked(col,origin,hit.point.clone().addScaledVector(direction,-.01)))return false;
  wallMarkAttempts++;
  return surfaceDecal(hit,direction,.115,bulletMarkTexture(),bulletDecals,48,.85);
 }
 function bloodHit(bot,hit,head=false,hasSprite=false,origin=null){if(!S||!hit)return;
  const pos=hit.clone(),toward=origin?pos.clone().sub(origin).normalize():null;
  const img=head?'blood_v1_bigblood1':'blood_v1_bigblood2';
  for(let n=0;n<(hasSprite?0:head?5:3);n++){
   const tex=bloodTexture(n%2?'blood_v1_blood1':'blood_v1_blood3');
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.92,color:0xffffff}));
   sprite.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*.4,(Math.random()-.5)*.5,(Math.random()-.5)*.4));
   const scale=.2+Math.random()*.28;sprite.scale.set(scale,scale,1);S.add(sprite);
   bloodBursts.push({obj:sprite,age:0,life:.28+Math.random()*.35});
  }
  if(toward?.lengthSq()>0){
   const rayBlood=new THREE.Raycaster(pos.clone().addScaledVector(toward,.03),toward,.01,3.5);
   const surface=rayBlood.intersectObjects(obsM,false)[0],col=window.bspCol;
   if(surface&&!(col?.pointClip&&BSP.pointLineBlocked(col,pos,surface.point.clone().addScaledVector(toward,-.025))))surfaceDecal(surface,toward,head?1.2:.8,bloodTexture(img),bloodDecals,20,.92);
  }
  while(bloodBursts.length>26){const o=bloodBursts.shift();o.obj.parent?.remove(o.obj);o.obj.material.dispose()}
 }
 function updateBlood(dt){wallMarkAttempts=0;for(let i=bloodBursts.length-1;i>=0;i--){const b=bloodBursts[i];b.age+=dt;b.obj.material.opacity=Math.max(0,.92*(1-b.age/b.life));if(b.age>=b.life){b.obj.parent?.remove(b.obj);b.obj.material.dispose();bloodBursts.splice(i,1)}}}
 function clearBlood(){wallMarkAttempts=0;for(const d of [...bloodDecals,...bulletDecals])removeDecal(d);bloodDecals.length=bulletDecals.length=0;
  for(const p of bloodBursts){p.obj.parent?.remove(p.obj);p.obj.material.dispose()}bloodBursts.length=0}
 function setup(){try{hand=localStorage.getItem('bs13-weapon-hand')==='left'?'left':'right'}catch(e){}$('weaponHand').value=hand;
  try{const settings=JSON.parse(localStorage.getItem('bs13-preferences')||'null');if(settings){
    if(['0','1','2'].includes(String(settings.q)))$('q').value=String(settings.q);
    if(Number.isFinite(Number(settings.sens))&&Number(settings.sens)>=.002&&Number(settings.sens)<=.009)$('sn').value=String(settings.sens);
    if(Number.isFinite(settings.volume)){$('volume').value=String(Math.max(0,Math.min(1,settings.volume)));masterVolume=+$('volume').value;}
  }}catch(e){}
  const persist=()=>{try{localStorage.setItem('bs13-preferences',JSON.stringify({q:$('q').value,sens:$('sn').value,volume:+$('volume').value}))}catch(e){}};
  for(const [id,event] of [['q','change'],['sn','change'],['volume','input']])$(id).addEventListener(event,persist);

  $('weaponHand').addEventListener('change',e=>setHand(e.target.value));
  $('flashBtn').addEventListener('click',e=>{e.stopPropagation();toggleFlashlight()});
  $('dropBtn').addEventListener('click',e=>{e.stopPropagation();Phase9.dropPlayerWeapon()});
  $('teamBtn').addEventListener('click',e=>{e.stopPropagation();openTeamMenu()});
  $('settingsGameBtn').addEventListener('click',e=>{e.stopPropagation();openSettings()});
  $('weaponBtn')?.addEventListener('click',e=>{e.stopPropagation();openWeaponSelector()});
  $('weaponClose').onclick=closeWeaponSelector;$('teamClose').onclick=closeTeamMenu;
  for(const b of document.querySelectorAll('[data-switch-team]'))b.addEventListener('click',()=>queueTeam(b.dataset.switchTeam));
  $('specNext').addEventListener('click',()=>pickBot(1,true));$('specPrev').addEventListener('click',()=>pickBot(-1,true));
  $('specMode').addEventListener('change',e=>setSpecMode(e.target.value));
  $('specAuto').addEventListener('click',()=>toggleDirector());
  // Drag the world to orbit, look freely or pan the overview, including on Safari touch.
  const pad=$('pad');
  pad.addEventListener('pointerdown',e=>{
   if(!spectating)return;
   e.preventDefault();e.stopImmediatePropagation();
   if(e.pointerType==='mouse'&&e.button===2){setSpecMode(Spectator15E.nextMode(specMode));return}
   if(!['free','chase','map'].includes(specMode)){
    if(e.pointerType==='mouse'&&e.button===0)pickBot(1,true);
    return;
   }
   if(specGesture)return;
   specGesture={id:e.pointerId,x:e.clientX,y:e.clientY};
   try{pad.setPointerCapture(e.pointerId)}catch(_){};
  },true);
  addEventListener('pointermove',e=>{
   if(!spectating||!specGesture||e.pointerId!==specGesture.id)return;
   e.preventDefault();e.stopImmediatePropagation();
   const dx=Spectator15E.clamp(e.clientX-specGesture.x,-90,90),dy=Spectator15E.clamp(e.clientY-specGesture.y,-90,90);
   specGesture.x=e.clientX;specGesture.y=e.clientY;
   if(specMode==='chase'){orbitYaw-=dx*SENS;orbitPitch=Spectator15E.clamp(orbitPitch+dy*SENS,.08,1.3)}
   if(specMode==='free'){freeYaw-=dx*SENS;freePitch=Spectator15E.clamp(freePitch-dy*SENS,-1.42,1.42)}
   if(specMode==='map'){mapCenter.x-=dx*mapHeight*.012;mapCenter.z-=dy*mapHeight*.012}
  },true);
  const endSpecGesture=e=>{if(!spectating||!specGesture||specGesture.id!==e.pointerId)return;
   e.stopImmediatePropagation();specGesture=null};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,endSpecGesture,true);
  pad.addEventListener('wheel',e=>{if(!spectating||specMode!=='map')return;
   e.preventDefault();e.stopPropagation();mapHeight=Spectator15E.clamp(mapHeight+(e.deltaY>0?4:-4),18,110)
  },{capture:true,passive:false});
  const stick=$('spectatorMove');
  function moveStick(e){
   if(e.pointerId!==specAnalog?.id)return;
   if(e.type==='pointermove'&&e.pointerType!=='touch'&&e.buttons===0){clearSpecAnalog();return}
   const {left,top,width,height}=stick.getBoundingClientRect();
   let x=e.clientX-left-width/2,y=e.clientY-top-height/2;
   const radius=width*.32,length=Math.max(radius,Math.hypot(x,y));
   x/=length;y/=length;
   specAnalog.x=x;specAnalog.y=y;
   stick.firstElementChild.style.transform='translate('+x*radius+'px,'+y*radius+'px)';
  }
  stick.addEventListener('pointerdown',e=>{
   if(!spectating||e.button!==0)return;
   if(specAnalog)return;
   e.preventDefault();
   specAnalog={id:e.pointerId,x:0,y:0};
   try{stick.setPointerCapture(e.pointerId)}catch(_){};moveStick(e);
  });
  addEventListener('pointermove',moveStick,true);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{
   if(e.pointerId===specAnalog?.id)clearSpecAnalog();
  });

  for(const el of [$('weaponOverlay'),$('teamOverlay'),$('spectatorHud'),$('spectatorMove')])for(const event of ['pointerdown','pointermove','pointerup','wheel'])el.addEventListener(event,e=>e.stopPropagation());
  $('settingsScreen').querySelector('[data-close]').addEventListener('click',closeSettings);
  addEventListener('keydown',e=>{
   if(e.code==='KeyF'&&running&&!e.repeat)toggleFlashlight();
   if(e.code==='KeyQ'&&running&&!e.repeat)Phase9.dropPlayerWeapon();
   if(e.code==='KeyM'&&running&&!e.repeat)openTeamMenu();
   if(spectating){
    const movement={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',KeyD:'right',Space:'up',ShiftLeft:'down',ShiftRight:'down'};
    if(movement[e.code]){specKeys[movement[e.code]]=true;e.preventDefault()}
    if(!e.repeat){
     if(e.code==='ArrowRight')pickBot(1,true);
     if(e.code==='ArrowLeft')pickBot(-1,true);
     if(e.code==='KeyC')setSpecMode(Spectator15E.nextMode(specMode));
     if(e.code==='KeyP')toggleDirector();
     if(/^Digit[1-6]$/.test(e.code))setSpecMode(Spectator15E.modeIds[+e.code[5]-1]);
    }
    if(['ArrowRight','ArrowLeft','KeyC','KeyP'].includes(e.code)||/^Digit[1-6]$/.test(e.code))e.preventDefault();
   }
   if(e.code==='Escape'){closeWeaponSelector();closeTeamMenu()}
  });
  addEventListener('keyup',e=>{
   if(!spectating)return;
   const movement={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',KeyD:'right',Space:'up',ShiftLeft:'down',ShiftRight:'down'};
   if(movement[e.code])specKeys[movement[e.code]]=false;
  });
  for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{if(e.pointerId===specAnalog?.id)clearSpecAnalog();if(e.pointerId===specGesture?.id)specGesture=null},true);
  for(const type of ['touchend','touchcancel'])addEventListener(type,e=>{if(e.touches.length===0&&spectating)resetSpecMovement()},{capture:true,passive:true});
  document.addEventListener('blockstrike:reset-controls',resetSpecMovement);
  addEventListener('blur',resetSpecMovement);addEventListener('pagehide',resetSpecMovement);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetSpecMovement()});
 }
 setup();
 return {moveSpeed,isSpectating,isFirstPerson:()=>spectating&&specMode==='first',visibleOverlay,applyHand,setHand,bindLight,toggleFlashlight,
  resetMatch,beforeRound,onDeath,getObserved:()=>observed,getViewmodel:()=>shouldRenderSpecWeapon()?spectatorView:null,updateSpectator,shouldRenderSpecWeapon,setSpecMode,toggleDirector,pickBot,checkRoundEnd,openSettings,closeSettings,
  openWeaponSelector,closeWeaponSelector,openTeamMenu,queueTeam,dropPlayerWeapon:()=>Phase9.dropPlayerWeapon(),bloodHit,wallHit,updateBlood,clearBlood,
  getDebugState:()=>({spectating,observed:observed?.botId||null,specMode,autoDirector,queuedTeam,lightEnabled,hand,bulletDecals:bulletDecals.length,bloodDecals:bloodDecals.length,bloodBursts:bloodBursts.length})};
})();
