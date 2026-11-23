/* Tahap 8: shared weapon presentation, bot loadouts and input lifecycle. */
const heldModels={},heldLoads={},equipmentLoads={};
const BOT_POOLS={CT:['m4a1','aug','mp5','usp','awp','famas','p90'],T:['ak47','galil','mac10','glock18','scout','elite','mp5']};
function loadHeld(id){
 if(heldModels[id])return Promise.resolve(heldModels[id]);
 return heldLoads[id]||(heldLoads[id]=(async()=>{
  const custom=await WeaponImport.modelFor(id,THREE,'held');
  return custom||await loadMatchModel('assets/models/held/'+id+'.glb');
 })().then(g=>{heldModels[id]=g;return g}).catch(e=>{delete heldLoads[id];throw e}));
}
document.addEventListener('blockstrike:weapon-skin-change',event=>{const id=event.detail?.id;if(id){delete heldModels[id];delete heldLoads[id]}});
// Attach rigid GoldSrc bone-local geometry, not the source scene/root.
function botBone(body,name){return name&&(body?.getObjectByName(name)||body?.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)))}
function attachHeldMeshes(b,g,accept=()=>true){
 const meshes=[];
 g.scene.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes?.position||!accept(o))return;
  const bone=botBone(b.body,o.userData.attachBone);if(!bone)return;
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  const size=o.geometry.boundingBox.getSize(new THREE.Vector3());
  const extent=Math.max(size.x,size.y,size.z)*.025;
  if(!Number.isFinite(extent)||extent<.005||extent>1.5)return;
  const mesh=o.clone();mesh.frustumCulled=!mesh.isSkinnedMesh;mesh.castShadow=true;
  // Held and dropped p_/w_ assets use the same Hammer scale. The character
  // rig is authored at .028; compensate once, about the grip's local origin.
  const rig=b.body.getObjectByName('CS16ClassicArmature')||b.body.getObjectByName('Armature');
  const scale=Math.abs(rig?.scale.x||.028);mesh.scale.multiplyScalar(.025/scale);
  bone.add(mesh);meshes.push(mesh);
 });return meshes;
}
function clearHeldVisual(b){
 b.weaponLoadToken=(b.weaponLoadToken||0)+1;
 for(const mesh of b.weaponModel||[])mesh.parent?.remove(mesh);
 b.weaponModel=[];b.shieldReady=false;b.shieldRaised=false;
}
function equipBot(b,i,preferredId=null){
 if(!b)return;
 const id=preferredId||BOT_POOLS[b.team][i%BOT_POOLS[b.team].length],w=W[id];if(!w)return;
 clearHeldVisual(b);const token=b.weaponLoadToken;
 Object.assign(b,{weaponId:id,damage:w.dmg,fireRate:w.rate,
  effectiveRange:(w.slot==='pistol'?32:Math.max(38,70-w.sp*800))*(b.skill?.range||1),
  accuracy:Math.min(.72,Math.max(.10,Math.max(.35,.62-w.sp*5)*(b.skill?.aim||1))),sound:w.sound,ammo:w.mag,reserve:w.res,burst:0,silenced:false,combatRecoil:null,reloadStage:null,reloadLeft:0});
 loadHeld(id).then(g=>{
  if(!b.g.parent||b.dead||!b.body||b.weaponLoadToken!==token)return;
  if(g.nativeMdl){const model=THREE.SkeletonUtils.clone(g.scene);b.g.add(model);b.weaponModel=[model]}
  else b.weaponModel=attachHeldMeshes(b,g);
  if(b.hasBotShield&&w.slot==='pistol'&&id!=='elite'&&heldModels.shield&&b.nativeHitboxes){
   const shield=attachHeldMeshes(b,heldModels.shield,o=>o.userData.attachBone==='Bip01 L Hand');
   b.weaponModel.push(...shield);b.shieldReady=shield.length>0;
  }
  for(const m of b.weaponModel)m.visible=!b.heldOverride;
 }).catch(e=>console.warn('Held model failed',id,e));
}
function loadCharacterEquipment(id){
 return equipmentLoads[id]||(equipmentLoads[id]=loadMatchModel('assets/models/equipment/'+id+'.glb?v=16.4G').then(g=>g.scene).catch(e=>{delete equipmentLoads[id];console.warn('Character equipment unavailable',id,e);return null}));
}
function syncBotGear(b){
 if(!b.body)return;
 const planting=!b.dead&&!!BombMode.isPlanting?.(b),wanted=!b.dead&&(b.team==='T'&&BombMode.isCarrier?.(b)&&!planting?'bomb-carrier':b.team==='CT'&&b.defuseKit?'defuse-kit':null);
 if(b.gearWanted!==wanted){
  b.gearWanted=wanted;const token=b.gearToken=(b.gearToken||0)+1;
  for(const m of b.gearMeshes||[])m.parent?.remove(m);b.gearMeshes=[];
  if(wanted)loadCharacterEquipment(wanted).then(source=>{
   if(!source||b.dead||!b.g.parent||b.gearToken!==token)return;
   source.traverse(o=>{if(!o.isMesh)return;const bone=botBone(b.body,o.userData.attachBone);if(!bone)return;
    // Bodygroup geometry uses exactly the same local coordinates as the
    // existing player skeleton. No weapon scale correction or extra offsets.
    const m=o.clone();m.castShadow=true;m.frustumCulled=!m.isSkinnedMesh;bone.add(m);b.gearMeshes.push(m);
   });
  });
 }
 const throwing=!b.dead&&b.grenadeVisual&&(b.grenadeVisual.pending||b.grenadeVisual.until>performance.now()/1000)?b.grenadeVisual.id:null;
 const defusing=!b.dead&&!!BombMode.isDefusing?.(b);
 const override=defusing?null:planting?'c4':throwing;
 if(b.heldOverride!==override||b.plantVisual!==planting||b.defuseVisual!==defusing){
  b.plantVisual=planting;b.defuseVisual=defusing;b.heldOverride=override;const token=b.plantVisualToken=(b.plantVisualToken||0)+1;
  for(const m of b.plantMeshes||[])m.parent?.remove(m);b.plantMeshes=[];
  for(const m of b.weaponModel||[])m.visible=!override;
  if(override)loadHeld(override).then(g=>{
   if(!b.g.parent||b.dead||b.plantVisualToken!==token)return;
   b.plantMeshes=attachHeldMeshes(b,g);
   if(b.plantMeshes.length)for(const m of b.weaponModel||[])m.visible=false;
  }).catch(e=>console.warn('Held action model unavailable',e));
 }
}
function disposeBot(b){
 if(b.disposed)return;b.disposed=true;
 clearHeldVisual(b);b.gearToken=(b.gearToken||0)+1;b.plantVisualToken=(b.plantVisualToken||0)+1;
 // Cached GLTF assets share geometry, materials and textures across bots.
 for(const mesh of [...(b.gearMeshes||[]),...(b.plantMeshes||[])])mesh.parent?.remove(mesh);
 if(b.mixer){b.mixer.stopAllAction();b.mixer.uncacheRoot(b.body||b.mixer.getRoot());}
 b.retiredActions?.clear();
 // Native models share geometry/material; only hit proxies are owned by the bot.
 // Procedural fallback models own all their meshes, including the CT body.
 const geos=new Set(),mats=new Set(),skeletons=new Set();
 const owned=m=>{if(m.geometry)geos.add(m.geometry);for(const mat of [].concat(m.material||[]))mats.add(mat)};
 if(b.body||b.mixer){b.parts.forEach(owned);if(b.shieldPart)owned(b.shieldPart);}else b.g.traverse(owned);
 b.g.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton)});
 geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());
 b.weaponModel=[];b.gearMeshes=[];b.plantMeshes=[];S.remove(b.g);
}
function resetInputs(){
 BombMode.resetInput();Phase9.cancelGrenade();pendingKnife=null;fh=fl=jmp=firedLatch=secondaryHeld=mouseSecondaryHeld=false;walkHeld=mobileWalk=false;fireAimPointer=fireAimLast=adsPointer=adsAimLast=null;$('walkBtn')?.classList.remove('active');jx=jy=0;Object.keys(K).forEach(k=>K[k]=0);
 resetPadPointers();document.dispatchEvent(new Event('blockstrike:reset-controls'));if(typeof Phase9!=='undefined')Phase9.releaseControls();
}
function requestLock(){try{const p=$('pad').requestPointerLock?.();p?.catch?.(()=>{})}catch(e){}}
function inputBlocked(){return document.hidden||!running||RuntimeHealth.blocked()||!$('buyMenu').classList.contains('hidden')||!$('menu').classList.contains('hidden')||!$('weaponImportScreen').classList.contains('hidden')||(typeof Phase13!=='undefined'&&(Phase13.isSpectating()||Phase13.visibleOverlay()))}
function syncAim(){
 GoldSrcSprites.scope(cur());
 const sniper=aiming&&['awp','scout','g3sg1','sg550'].includes(cur());
 $('scopeOverlay').classList.toggle('hidden',!sniper);$('scopeOverlay').classList.toggle('active',sniper);
 const overlay=$('scopeOverlay');if(overlay.getAttribute('aria-hidden')!==String(!sniper))overlay.setAttribute('aria-hidden',String(!sniper));
 $('cross').classList.toggle('hidden',sniper);
 document.body.classList.toggle('has-scope',!!scopeLevels(cur()));if(vm)vm.visible=!sniper;
 if(!aiming&&cam&&cam.fov!==baseFov){cam.fov=baseFov;cam.updateProjectionMatrix()}
}
let shotgunReload=null;
function clipDuration(name,fallback){const a=vm?.userData.weaponAnimation?.actions[name];return a?a.getClip().duration:fallback}
function shotgunPhase(phase){
 const names={start:'start_reload',insert:'insert',end:'after_reload'};
 const state=vm?.userData.weaponAnimation;
 let name=names[phase];if(phase==='insert'&&!state?.actions[name])name='reload';
 const key=cur()==='shield'?Phase9.shieldPistol():cur();
 // Same start/insert timing as bot reload; retain the authored pump/end clip.
 const duration=phase==='start'?.55:phase==='insert'?(key==='m3'?.45:.30):clipDuration(name,.3);
 shotgunReload.phase=phase;shotgunReload.time=Math.max(.1,duration);
 if(state){state.queue=[];state.currentKind='idle';if(playWeaponClip(state,name,false))state.activeAction.setEffectiveTimeScale(state.activeAction.getClip().duration/shotgunReload.time)}
 if(phase==='insert'&&!state?.soundCues?.length)playOriginalSound(WeaponImport.audioRoute(key,'m3_insertshell.wav'),.25);
}
function updateReload(dt){
 if(shotgunReload){
  shotgunReload.time-=Math.max(0,Number.isFinite(dt)?dt:0);
  while(shotgunReload.time<=1e-8){const remainder=Math.min(0,shotgunReload.time),key=cur()==='shield'?Phase9.shieldPistol():cur(),st=A[key];
   if(shotgunReload.phase==='insert'&&st.res>0&&st.mag<W[key].mag){st.mag++;st.res--;hud()}
   if(shotgunReload.phase==='end'){shotgunReload=null;reloading=0;playWeaponAnimation('idle');hud();return}
   shotgunPhase(st.mag<W[key].mag&&st.res>0?'insert':'end');shotgunReload.time+=remainder;
  }
  reloading=.1;return;
 }
 if(reloading>0){reloading-=dt;if(reloading<=0){reloading=0;const key=cur()==='shield'?Phase9.shieldPistol():cur(),st=A[key],n=Math.max(0,Math.min(W[key].mag-st.mag,st.res));st.mag+=n;st.res-=n;hud()}}
}
function pauseToMenu(){LocalMapMedia.pauseAmbient?.();WeaponModes15C.cancel();Phase10.closeRadio();Phase10.resetVoices();resetWeaponVoices();CS16SFX.reset?.();running=false;reloadSfxToken++;resetInputs();aiming=false;syncAim();$('buyMenu').classList.add('hidden');$('menu').classList.remove('hidden');document.body.classList.remove('playing');if(document.pointerLockElement)document.exitPointerLock()}
let hadPointerLock=false;
document.addEventListener('pointerlockchange',()=>{
 if(document.pointerLockElement){hadPointerLock=true;return;}
 if(hadPointerLock){hadPointerLock=false;resetInputs();}
});

function disposeFallback(g){if(g&&!g.userData.weaponAnimation)g.traverse(o=>{o.geometry?.dispose();[].concat(o.material||[]).forEach(m=>m.dispose())})}

function placeMapSpawns(){
 if(activeMapData?.id==='es_kvartal'){LayoutNav.snap(P.pos);bots.forEach(b=>LayoutNav.snap(b.g.position));return}
 if(!window.bspCol)return;
 const graph=window.NavGraph?.graph();
 const list=team=>{
  if(bspCol.spawnTeams)return bspCol.spawnTeams[team].map(h=>V(...BSP.toGame(bspCol.T,h)));
  if(graph){const sp=graph.spawns.filter(s=>s.team===team).map(s=>V(...s.pos));if(sp.length)return sp}
  const anchor=activeMapData?.spawn?.[team==='CT'?'ct':'t']||[0,0,0];
  return bspCol.spawns.map(h=>V(...BSP.toGame(bspCol.T,h))).sort((a,b)=>Math.hypot(a.x-anchor[0],a.z-anchor[2])-Math.hypot(b.x-anchor[0],b.z-anchor[2]));
 };
 const ct=list('CT'),t=list('T'),counts={CT:playerTeam==='CT'?1:0,T:playerTeam==='T'?1:0},used={CT:[],T:[]};
 const own=playerTeam==='CT'?ct:t;
 if(own.length){P.pos.copy(own[0]);P.yaw=bspCol.spawnYaw?.[playerTeam]?.[0]??P.yaw;used[playerTeam].push(P.pos.clone())}
 // GoldSrc BSP maps may provide fewer native spawn entities than the requested
 // 2..32 players. Stagger surplus slots with headroom and separation checks,
 // rather than blindly stacking several bots at exactly the same coordinate.
 function spawnFor(team){
  const base=team==='CT'?ct:t;if(!base.length)return null;
  const index=counts[team]++,seen=used[team],point=base[index%base.length];
  if(index<base.length&&!seen.some(v=>v.distanceTo(point)<1.1)){
   seen.push(point.clone());return point.clone()
  }
  for(let attempt=0;attempt<35;attempt++){
   const j=index*7+attempt,rad=1.35+(Math.floor(j/8)%6)*.75,angle=j*2.39996323;
   const candidate=point.clone().add(V(Math.cos(angle)*rad,0,Math.sin(angle)*rad));
   candidate.y=BSP.snapSpawn(bspCol,candidate.x,candidate.z);
   if(Math.abs(candidate.y-point.y)>2.5)continue;
   if(!BSP.canStand(bspCol,candidate))continue;
   if(seen.some(v=>Math.hypot(v.x-candidate.x,v.z-candidate.z)<1.1&&Math.abs(v.y-candidate.y)<1.5))continue;
   seen.push(candidate.clone());return candidate;
  }
  console.warn('Tahap10: no distinct BSP spawn near',team,index);
  seen.push(point.clone());return point.clone();
 }
 bots.forEach(b=>{const index=counts[b.team],pos=spawnFor(b.team);if(pos)b.g.position.copy(pos);const angles=bspCol.spawnYaw?.[b.team];if(angles?.length)b.g.rotation.y=angles[index%angles.length];b.nav=null});
}
