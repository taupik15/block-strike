/* BLOCK STRIKE Tahap 9: real grenade physics/effects, crouch, weapon pickup,
 * shield, suppressors, night vision and adjustable touch controls.
 * Loaded after game-core and game-systems8 and before classic-ui.
 */
const Phase9=(()=>{
 'use strict';
 const silenced={usp:true,m4a1:true};
 const dropped=[],kitDrops=[],projectiles=[],smokeClouds=[],worldLoads={};
 let kitScan=0,weaponScan=0;
 const SIGHT_RADIUS=Grenade14D.TYPES.smoke.radius;
 const STORAGE='block-strike-tahap9-controls-v1';
 const controls=['fire','ads','jump','rel','swap','buybtn','grenadeBtn','grenadeTypeBtn','crouchBtn','walkBtn','pickupBtn','nvgBtn','radioBtn','scoreBtn','dropBtn','flashBtn','teamBtn','settingsGameBtn','chips'];
 const icons={
  fire:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  ads:'<path d="M3 6h18M3 12h13M3 18h8"/><circle cx="18" cy="17" r="3"/><path d="m20 19 2 2"/>',
  jump:'<circle cx="14" cy="4" r="2" fill="currentColor"/><path d="m7 10 4-3 4 3 4-1M11 7l-1 6 5 2-1 3m-4-5-4 3M6 21h13"/>',
  rel:'<path d="M20 11a8 8 0 1 0-2 7"/><path d="m20 4 0 7-7 0"/>',
  swap:'<path d="M4 7h16l-4-4m4 4-4 4M20 17H4l4-4m-4 4 4 4"/>',
  buybtn:'<path d="M2 4h3l3 11h11l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  grenadeBtn:'<rect x="7" y="7" width="10" height="14" rx="3"/><path d="M10 7V3h5l4 4M8 12h8m-8 4h8"/>',
  grenadeTypeBtn:'<circle cx="10" cy="10" r="5"/><circle cx="17" cy="16" r="4"/><path d="M7 3h6M18 10h3"/>',
  walkBtn:'<circle cx="15" cy="4" r="2"/><path d="m12 9 4 2-2 4 4 3M12 9 7 12l-4 4m8-4 1 6M3 20h17"/>',
  crouchBtn:'<circle cx="16" cy="5" r="2"/><path d="m12 9 4 2-2 4-5-2-4 3m8-2 5 5h4M3 20h9"/>',
  pickupBtn:'<path d="M5 16V9a2 2 0 0 1 4 0v3-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v5-3a2 2 0 0 1 4 0v5c0 5-3 8-8 8H9c-2 0-4-1-6-5z"/>',
  nvgBtn:'<path d="M3 10h7v9H3zm11 0h7v9h-7zM10 13h4M5 10V7l3-2m11 5V7l-3-2"/>',
  radioBtn:'<path d="M5 16v-4a7 7 0 0 1 14 0v4M7 20h10M8 11h8M12 4V1"/>',
  scoreBtn:'<path d="M4 19V10M10 19V6M16 19V12M21 19V3"/>',
  dropBtn:'<path d="M4 7h16M10 4h4M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  flashBtn:'<path d="M8 3h8v6l-2 3v8H10v-8L8 9zM8 6h8M5 10 2 8m17 2 3-2"/>',
  teamBtn:'<path d="m4 7 4-4v3h11M20 17l-4 4v-3H5M4 17h10M20 7H10"/>',
  settingsGameBtn:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  pauseBtn:'<path d="M7 4v16M17 4v16"/>'
 };
 let crouchRequested=false,mobileCrouch=false,crouching=false,crouchBlend=0;
 let nightVisionActive=false,shieldRaised=false,activeFlash=0,flashStart=0;
 let pickupCandidate=null,dismissedDrop=null,editor=false,crouchMode='toggle',selectedControl='fire',dragging=null,config={};
 const flashLayers=[];
 let grenadeView=null,grenadeViewToken=0,pendingThrow=null,famasBurst=false,glockBurst=false;
 const thrownNames={he:'hegrenade',flash:'flashbang',smoke:'smokegrenade'};
 const gspec=Grenade14D.TYPES;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function sound(name,vol=.35,position=null){if(position&&typeof playWorldSound==='function')playWorldSound(name,position,vol,.2,1350);else playOriginalSound(name,vol,.2,1350)}
 function blocked(){return inputBlocked()||over}
 function unsilenced(k){return Object.prototype.hasOwnProperty.call(silenced,k)&&!silenced[k]}
 function firingSound(k,{burst=true,shield=false}={}){if(k==='usp')return !shield&&silenced.usp?'usp1.wav':'usp_unsil-1.wav';if(k==='m4a1')return silenced.m4a1?'m4a1-1.wav':'m4a1_unsil-1.wav';if(k==='glock18'&&burst&&glockBurst)return 'glock18-2.wav';if(k==='famas'&&burst&&famasBurst)return 'famas-2.wav';return W[k].sound}
 function shieldActiveWeapon(){return cur()==='shield'||cur()==='knife'&&inventory.includes('shield')}
 function shieldPistol(){return Phase14C.pistol(inventory)}
 function lowerShield(){
  if(!shieldRaised)return false;
  shieldRaised=false;
  if(vm?.userData.viewAsset?.startsWith('shield_')&&vm?.userData.weaponAnimation){const a=vm.userData.weaponAnimation;a.currentKind='shield';playWeaponClip(a,'shield_down',false)}
  if(typeof Phase14B!=='undefined')Phase14B.setRaised(vm,false);
  updateHud();return true;
 }
 function secondaryAction(){
  if(blocked()||(typeof freezeLeft!=='undefined'&&freezeLeft>0)||roundWait||BombMode.locked()||pendingThrow||WeaponModes15C.active()||reloading>0||swapT>0)return false;
  const k=cur();
  // A right click with a knife is the slower, stronger stab attack.
  if(BombMode.selected?.())return false;
  if(k==='knife'&&!shieldActiveWeapon()){shoot('stab');return true}
  if(k==='famas'){famasBurst=!famasBurst;WeaponModes15C.cancel();say(famasBurst?'FAMAS: BURST FIRE':'FAMAS: FULL AUTO');updateHud();return true}
  if(k==='glock18'){glockBurst=!glockBurst;WeaponModes15C.cancel();say(glockBurst?'GLOCK: BURST FIRE':'GLOCK: SEMI AUTO');updateHud();return true}
  if(shieldActiveWeapon()){
   shieldRaised=!shieldRaised;
   const a=vm?.userData.weaponAnimation;
   if(a){a.currentKind='shield';if(playWeaponClip(a,shieldRaised?'shield_up':'shield_down',false))swapT=Math.max(swapT,Math.min(1,a.activeAction?.getClip().duration||.4));}
   if(typeof Phase14B!=='undefined')Phase14B.setRaised(vm,shieldRaised);
   sound('grenade_hit1.wav',.14);updateHud();return true;
  }
  if(k==='usp'||k==='m4a1'){
   if(secondaryAction.lock&&performance.now()<secondaryAction.lock)return false;
   const attach=!silenced[k],a=vm?.userData.weaponAnimation;
   silenced[k]=attach;
   const name=attach?'add_silencer':'detach_silencer';
   if(a){a.currentKind='silencer';a.queue=[];playWeaponClip(a,name,false)}
   const duration=a?.actions?.[name]?.getClip()?.duration||1;
   secondaryAction.lock=performance.now()+duration*1000;
   cool=Math.max(cool,duration);
   if(!a?.soundCues?.length)sound(k+'_silencer_'+(attach?'on':'off')+'.wav',.35);
   say(attach?'SILENCER ON':'SILENCER OFF');updateHud();return true;
  }
  if(scopeLevels(k)){toggleAim();syncAim();return true}
  return false;
 }
 function toggleNightVision(){
  if(blocked())return false;
  if(!nightVision){say('BUY NIGHT VISION FIRST');return false}
  nightVisionActive=!nightVisionActive;
  document.body.classList.toggle('night-vision',nightVisionActive);
  CS16SFX.nightVision(nightVisionActive);say(nightVisionActive?'NIGHT VISION ON':'NIGHT VISION OFF');updateHud();return true;
 }
 function updateHud(){
  if(!pendingThrow&&grenades[selectedGrenade]<=0){const owned=['he','flash','smoke'].find(x=>grenades[x]>0);if(owned)selectedGrenade=owned}
  const action=$('ads'),k=cur(),supported=scopeLevels(k)>0||k==='usp'||k==='m4a1'||k==='shield'||k==='knife'||k==='famas'||k==='glock18';
  document.body.classList.toggle('has-action',supported);
  if(action){const on=shieldActiveWeapon()?shieldRaised:k==='usp'||k==='m4a1'?silenced[k]:k==='famas'?famasBurst:k==='glock18'?glockBurst:aiming;action.classList.toggle('active',!!on);
    const label=k==='usp'||k==='m4a1'?'PEREDAM':shieldActiveWeapon()?'TAMENG':k==='knife'?'TAHAN STAB':k==='famas'||k==='glock18'?'FIRE MODE':'BIDIK';action.setAttribute('aria-label',label)}
  const nv=$('nvgBtn');if(nv){nv.classList.toggle('active',nightVisionActive);nv.classList.toggle('unavailable',!nightVision);nv.title=nightVision?'Night vision (N)':'Beli night vision dahulu'}
  const cr=$('crouchBtn');if(cr)cr.classList.toggle('active',crouching);
  const gd=$('grenadeTypeBtn');if(gd){gd.dataset.grenade=selectedGrenade;gd.title='Pilih '+selectedGrenade.toUpperCase()+' (tap untuk ganti)'}
  const mode=$('modeStatus');if(mode){let bits=[];if(nightVisionActive)bits.push('NVG ON');if(shieldActiveWeapon()){bits.push(shieldRaised?'SHIELD UP':'SHIELD DOWN');if(shieldRaised&&A[shieldPistol()]?.mag===0)bits.push('LOWER SHIELD TO RELOAD');}if(k==='usp'||k==='m4a1')bits.push(silenced[k]?'SILENCER ON':'SILENCER OFF');if(k==='famas')bits.push(famasBurst?'BURST':'AUTO');if(k==='glock18')bits.push(glockBurst?'BURST':'SEMI');if(aiming&&scopeLevels(k))bits.push('ZOOM '+(zoomIdx+1)+'/'+scopeLevels(k));if(crouching)bits.push('CROUCH');if(typeof isWalking==='function'&&isWalking())bits.push('WALK');mode.textContent=bits.join(' · ')}
 }
 function setCrouchInput(on){crouchRequested=!!on}
 function updateCrouch(dt=.016){
  const desired=crouchRequested||mobileCrouch;
  if(desired!==crouching){
   if(window.bspCol){if(BSP.changeStance(bspCol,P.pos,crouching,desired,P.on,movementActors(P,P.pos)))crouching=desired}
   else if(desired||LayoutNav.canExpand(P.pos,movementActors(P,P.pos))&&!obs.some(o=>{
    const cx=Math.max(o.x1,Math.min(P.pos.x,o.x2)),cz=Math.max(o.z1,Math.min(P.pos.z,o.z2));
    return Math.hypot(P.pos.x-cx,P.pos.z-cz)<.38&&P.pos.y+1.7>o.y1&&P.pos.y+1.05<o.y2;
   }))crouching=desired;
  }
  crouchBlend+=(Number(crouching)-crouchBlend)*(1-Math.exp(-18*Math.max(0,dt)));
 }
 function releaseControls(){crouchRequested=false;mobileCrouch=false}
 function blockShieldHit(source){
  if(!shieldActiveWeapon()||!shieldRaised||!source)return false;
  const dx=source.x-P.pos.x,dz=source.z-P.pos.z,dist=Math.hypot(dx,dz)||1;
  return (dx*(-Math.sin(P.yaw))+dz*(-Math.cos(P.yaw)))/dist>.48;
 }
 function shieldImpact(){if(S&&cam){const dir=cam.getWorldDirection(V());GoldSrcSprites.play(S,'xspark1',cam.position.clone().addScaledVector(dir,1.1),{scale:.015,fps:35})}sound('ric_metal-1.wav',.22);const m=$('modeStatus');if(m){m.classList.add('shield-impact');setTimeout(()=>m.classList.remove('shield-impact'),150)}}
 function orientGoldSrcWorld(model){
  // The Tahap-8 w_ GLBs contain raw GoldSrc coordinates without the root
  // transform used for v_ models. Convert model units and Z-up to Y-up here.
  const zup=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  const forward=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);
  model.quaternion.copy(forward.multiply(zup));model.scale.setScalar(.025);
 }
 function loadWorldModel(k){
  if(!worldLoads[k]){const task=(async()=>{
   const custom=await AssetMemory.build(()=>WeaponImport.modelFor(k,THREE,'world'));
   if(custom)return {scene:custom.scene,native:true};
   const source=(await loadMatchModel('assets/models/world/'+k+'.glb')).scene;
   return {scene:source,native:false};
  })().catch(e=>{if(worldLoads[k]===task)delete worldLoads[k];console.warn('Dropped model',k,e);return null});worldLoads[k]=task;}
  return worldLoads[k];
 }
 // Wait for in-flight loads without detaching or disposing their consumers.
 function settleWorldModels(){return Promise.allSettled(Object.values(worldLoads));}
 async function releaseWorldModels(){const pending=Object.values(worldLoads);for(const key of Object.keys(worldLoads))delete worldLoads[key];const models=await Promise.allSettled(pending);AssetMemory.releaseSources(models.filter(r=>r.status==='fulfilled').map(r=>r.value));}
 // Anchor to the local floor, not the nearest spawn's elevation (wrong on
 // Aztec bridges and other multi-level BSP maps). The player position in BSP
 // is hull-center, while an item uses physical floor height.
 // Legacy projectile ground query retained (grenade physics is outside F–H).
 function floorY(x,z,fallback){
  if(window.bspCol){const h=BSP.snapSpawn(bspCol,x,z);if(Number.isFinite(h)&&Math.abs(h-fallback)<4)return h}
  return Math.max(0,fallback);
 }
 function itemFloor(pos,crouch=false){
  if(window.bspCol){
   const col=bspCol,h=BSP.toHammer(col.T,pos.toArray());if(crouch&&Number.isInteger(col.crouchHead))h[2]+=18;
   const floor=LocalBSPNav.floorAt(col,h,300);
   const estimate=(floor?BSP.toGame(col.T,floor)[1]:pos.y+(crouch?18*col.T.k:0))-36*col.T.k;
   // On sloped surfaces the expanded hull is not an exact visual floor.
   // Refine with the closest supporting render triangle near the estimate.
   const probe=V(pos.x,estimate+.65,pos.z),down=new THREE.Raycaster(probe,V(0,-1,0),0,1.25);
   const hit=down.intersectObjects(obsM.filter(m=>m.visible!==false),true).find(h=>h.face&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.35);
   return hit?hit.point.y:estimate;
  }
  return ground(pos,.1);
 }
 function mountWorldItem(holder,id,floor,alive,fallback){
  loadWorldModel(id).then(source=>{
   if(!source||!alive())return;
   const gl=source.native?THREE.SkeletonUtils.clone(source.scene):source.scene.clone(true);
   if(!source.native)orientGoldSrcWorld(gl);gl.userData.ownedWorldClone=source.native;holder.add(gl);holder.updateWorldMatrix(true,true);
   const bounds=new THREE.Box3().setFromObject(gl);
   if(Number.isFinite(bounds.min.y))gl.position.y+=holder.position.y-bounds.min.y;
   fallback.visible=false;
  });
 }
 document.addEventListener('blockstrike:weapon-skin-change',event=>{delete worldLoads[event.detail?.id]});
 function makeDrop(k,pos,ammo,reserve,crouch=false,replacing=null){
  if(!W[k]||k==='knife'||(dropped.length>=40&&!(replacing?.alive&&dropped.includes(replacing))))return null;
  const holder=new THREE.Group();holder.position.copy(pos);
  const floor=itemFloor(pos,crouch);holder.position.y=floor+.015;
  holder.rotation.y=Math.random()*Math.PI*2;S.add(holder);
  const marker=new THREE.Mesh(new THREE.BoxGeometry(.22,.075,.40),new THREE.MeshStandardMaterial({color:0x666d65,metalness:.15,roughness:.7}));holder.add(marker);
  const drop={id:k,mesh:holder,marker,mag:ammo??W[k].mag,res:reserve??Math.floor(W[k].res*.5),alive:true,age:0};dropped.push(drop);
  mountWorldItem(holder,k,floor,()=>drop.alive,marker);return drop;
 }
 function dropBotWeapon(b){if(!b||!b.weaponId)return null;if(b.hasBotShield){b.hasBotShield=false;b.shieldRaised=false;const item=makeDrop('shield',b.g.position.clone(),0,0,b.crouching);if(item)return item;}const stored=b.emptyPrimary|| (b.weaponId==='knife'?b.pistolState:null);const id=stored?.id||b.weaponId;if(id==='knife')return null;return makeDrop(id,b.g.position.clone(),Math.max(0,stored?.mag??b.ammo??0),Math.max(0,stored?.res??b.reserve??0),b.crouching)}
 function dropDefuseKit(pos,crouch=false){
  if(!S||kitDrops.length>=32)return false;
  const mesh=new THREE.Group(),floor=itemFloor(pos,crouch);mesh.position.set(pos.x,floor+.015,pos.z);S.add(mesh);
  const marker=new THREE.Mesh(new THREE.BoxGeometry(.20,.055,.15),new THREE.MeshStandardMaterial({color:0x685d3f}));mesh.add(marker);
  const item={mesh,marker,alive:true};kitDrops.push(item);mountWorldItem(mesh,'thighpack',floor,()=>item.alive,marker);return true;
 }
 function releaseWorldClones(holder){for(const child of holder.children)if(child.userData.ownedWorldClone)AssetMemory.skeletons(child)}
 function removeKit(item){if(!item.alive)return;item.alive=false;releaseWorldClones(item.mesh);item.mesh.parent?.remove(item.mesh);kitDrops.splice(kitDrops.indexOf(item),1);item.marker.geometry.dispose();item.marker.material.dispose()}
 function scanKits(dt){
  if(!kitDrops.length||roundWait)return;
  kitScan-=dt;if(kitScan>0)return;kitScan=.18;
  const candidates=[];
  if(playerTeam==='CT'&&P.hp>0&&!defuseKit)candidates.push({pos:P.pos,crouch:crouching,player:true});
  for(const b of bots)if(b.team==='CT'&&!b.dead&&!b.defuseKit)candidates.push({pos:b.g.position,crouch:b.crouching,bot:b});
  for(const item of kitDrops.slice()){
   const at=item.mesh.position;
   const next=candidates.filter(a=>a.player?!defuseKit:!a.bot.defuseKit).filter(a=>Math.hypot(a.pos.x-at.x,a.pos.z-at.z)<1.05&&Math.abs(a.pos.y-at.y)<1.45).sort((a,b)=>a.pos.distanceToSquared(at)-b.pos.distanceToSquared(at)).find(a=>canSeeItem(a.pos,at,a.crouch,true));
   if(!next)continue;
   if(next.player){defuseKit=true;say('DEFUSE KIT PICKED UP');hud()}
   else {next.bot.defuseKit=true;Phase10.recordDefuseKit?.(next.bot)}
   removeKit(item);
  }
 }
 function canSeeItem(from,to,crouch=false,physicalFloor=false){
  const eye=from.clone(),target=to.clone();eye.y+=window.bspCol?.56:1.5;
  if(crouch)eye.y-=.18;
  if(physicalFloor)target.y+=.10;else if(window.bspCol)target.y-=36*bspCol.T.k-.12;
  return (physicalFloor?itemSightClear(eye,target):sightClear(eye,target));
 }
 function itemSightClear(a,b){return sightClear(a,b)&&(!window.bspCol?.pointClip||!BSP.pointLineBlocked(bspCol,a,b));}
 function dropPlayerWeapon(){
  if(blocked()||P.hp<=0||roundWait||BombMode.locked())return false;
  if(BombMode.selected?.())return BombMode.dropHuman();
  const k=cur();if(k==='knife'||!W[k]||!inventory.includes(k)){say('KNIFE CANNOT BE DROPPED');return false}
  const flight=tossItem(P.pos,P.yaw,crouching),front=flight.landing;
  const dropped=makeDrop(k,front,A[k]?.mag||0,0,false);
  if(dropped){dropped.flight=flight;dropped.mesh.position.copy(flight.points[0]);}
  if(!dropped)return false;
  dropped.res=takePlayerReserve(k);
  inventory=inventory.filter(id=>id!==k);if(k==='shield'){shieldRaised=false;if(typeof Phase14B!=='undefined'&&weaponInstances.shield)Phase14B.setRaised(weaponInstances.shield,false)}
  if(!inventory.length)inventory=['knife'];wi=0;setW(wi);say('DROPPED '+W[k].n);return true;
 }
 function dropForPurchase(k){const d=makeDrop(k,P.pos.clone(),A[k]?.mag||0,0,crouching);if(!d)return false;/* Preserve personal reserve on purchase, even when changing caliber. */return true}
 function dropPlayerOnDeath(){const k=inventory.find(id=>W[id].slot==='primary')||inventory.find(id=>W[id].slot==='pistol');if(k){const d=makeDrop(k,P.pos.clone(),A[k]?.mag||0,0,crouching);if(d)d.res=takePlayerReserve(k)}}
 function removeDrop(d){if(!d||!d.alive)return;d.alive=false;releaseWorldClones(d.mesh);S?.remove(d.mesh);dropped.splice(dropped.indexOf(d),1);d.marker.geometry.dispose();d.marker.material.dispose();if(pickupCandidate===d){pickupCandidate=null;$('pickupPrompt').classList.add('hidden')}}
 function nearestDrop(){
  let closest=null,best=2.4;
  for(const d of dropped){if(d.flight)continue;const dist=Math.hypot(P.pos.x-d.mesh.position.x,P.pos.z-d.mesh.position.z);if(dist<best&&Math.abs(P.pos.y-d.mesh.position.y)<2.6&&itemSightClear(cam.position,d.mesh.position.clone().add(new THREE.Vector3(0,.25,0)))){best=dist;closest=d}}
  return closest;
 }
 function syncPickup(){
  if(Phase13.isSpectating()){
   $('pickupPrompt').classList.add('hidden');pickupCandidate=null;return;
  }
  const visibleDrop=nearestDrop(),d=visibleDrop===dismissedDrop?null:visibleDrop;if(visibleDrop!==dismissedDrop)dismissedDrop=null;if(d!==pickupCandidate){pickupCandidate=d;
   const panel=$('pickupPrompt');panel.classList.toggle('hidden',!d);
   if(d)$('pickupName').textContent=W[d.id].n;
  }
  if(d){const rule=Phase14C.guardPickup(d.id,inventory,W,playerTeam);$('pickupDesc').textContent=rule||'E / AMBIL';$('pickupAccept').disabled=!!rule}
  const doorUse=P.hp>0&&!roundWait&&window.bspCol&&BSPDoors.useButton(bspCol,BSP.toHammer(bspCol.T,P.pos.toArray()),false);
  $('pickupBtn').classList.toggle('unavailable',!d&&!doorUse);
 }
 function useNearby(){
  if(blocked()||P.hp<=0||roundWait||BombMode.locked())return false;
  if(window.bspCol&&BSPDoors.useButton(bspCol,BSP.toHammer(bspCol.T,P.pos.toArray())))return true;
  return pickupNearest();
 }
 function pickupNearest(){
  if(blocked()||P.hp<=0||roundWait||BombMode.locked())return false;
  const d=nearestDrop();if(!d)return false;
  const rule=Phase14C.guardPickup(d.id,inventory,W,playerTeam);if(rule){say(rule);return false}
  const slot=W[d.id].slot,old=inventory.find(k=>W[k].slot===slot);
  if(old){const state=A[old];const swapDrop=makeDrop(old,P.pos.clone(),state?.mag,0,crouching,d);if(!swapDrop){say('TOO MANY DROPPED WEAPONS');return false}swapDrop.res=Economy45.spec(old)?.cal===Economy45.spec(d.id)?.cal?0:takePlayerReserve(old);inventory=inventory.filter(k=>k!==old)}
  inventory.splice(slot==='pistol'?0:Math.min(1,inventory.length),0,d.id);
  playerAmmo(d.id,d.mag);Economy45.grant(ammoPool,d.id,d.res||0);removeDrop(d);setW(inventory.indexOf(d.id));say('PICKED UP '+W[d.id].n);syncPickup();return true;
 }
 // Opportunistic scavenging, no extra path search and no economy bonus.
 function scanBotWeapons(dt){
  weaponScan-=dt;if(weaponScan>0)return;weaponScan=.25;
  if(!running||over||roundWait||(typeof freezeLeft!=='undefined'&&freezeLeft>0)||!dropped.length||BombMode.planted?.()||typeof botSwitchCarried!=='function')return;
  for(const b of bots){
   if(!b.botId||b.dead||b.hp<=0||!b.ammoPool||b.hasBotShield||b.emptyPrimary||W[b.weaponId]?.slot==='primary'||b.visibleEnemy||b.blinded>0||b.reloadLeft>0||b.cd>0||b.pendingBotThrow||BombMode.isCarrier?.(b)||BombMode.isDefusing?.(b)||BombMode.isPlanting?.(b))continue;
   const pos=b.g.position;
   const next=dropped.filter(d=>d.alive&&!d.flight&&W[d.id]?.slot==='primary'&&Economy45.spec(d.id)&&(d.mag>0||d.res>0||(b.ammoPool[Economy45.spec(d.id).cal]||0)>0)&&Math.hypot(pos.x-d.mesh.position.x,pos.z-d.mesh.position.z)<1.05&&Math.abs(pos.y-d.mesh.position.y)<1.45).sort((a,c)=>pos.distanceToSquared(a.mesh.position)-pos.distanceToSquared(c.mesh.position)).find(d=>canSeeItem(pos,d.mesh.position,b.crouching,true));
   if(!next||!botSwitchCarried(b,{id:next.id,mag:next.mag,res:next.res,silenced:false}))continue;
   Economy45.grant(b.ammoPool,next.id,next.res||0);removeDrop(next);
  }
 }
 function closePickup(){dismissedDrop=pickupCandidate;pickupCandidate=null;$('pickupPrompt').classList.add('hidden')}
 // A voluntary drop travels along a sampled ballistic arc; death/purchase drops stay local.
 // Stop at the first map contact and keep the final pickup origin on a valid hull.
 function tossItem(origin,yaw,crouch=false){
  const scale=window.bspCol?.T.k||.02,step=.025,points=[];
  const initial=origin.clone(),start=origin.clone();start.y+=window.bspCol?12*scale:(crouch?.75:1.15);
  let p=start.clone(),v=V(-Math.sin(yaw)*400*scale,115*scale,-Math.cos(yaw)*400*scale);
  points.push(p.clone());
  for(let i=0;i<32;i++){
   v.y-=800*scale*step;const next=p.clone().addScaledVector(v,step),hit=worldSegment(p,next);
   if(hit.hit){p.lerp(next,Math.max(0,(hit.frac??0)-.025));points.push(p.clone());break;}
   p=next;points.push(p.clone());
   if(!window.bspCol&&p.y<=ground(p,.1)+.035){p.y=ground(p,.1)+.035;break;}
  }
  let landing=initial;
  if(window.bspCol){
   const col=window.bspCol,T=col.T;
   // Walk backward along the actual arc until a standing pickup origin is safe.
   for(let i=points.length-1;i>=0;i--){const q=points[i],h=BSP.toHammer(T,q.toArray());h[2]+=36;
    const floor=LocalBSPNav.floorAt(col,h,300);if(!floor||BSP.traceAll(col,floor,floor).startsolid)continue;
    const candidate=V(...BSP.toGame(T,floor));
    if(Math.abs(candidate.y-q.y)>100*scale)continue;landing=candidate;points.length=i+1;break;}
   if(landing===initial){landing=initial.clone();if(crouch)landing.y+=18*scale;points.length=1;}
  }else{landing=p.clone();landing.y=ground(p,.1);}
  const end=landing.clone();end.y=itemFloor(landing,false)+.015;points.push(end);
  return {points,landing,age:0,step};
 }
 function advanceDropFlight(mesh,flight,dt){flight.age+=Math.max(0,dt);const index=flight.age/flight.step,last=flight.points.length-1;
  if(index>=last){mesh.position.copy(flight.points[last]);return false;}
  const i=Math.floor(index);mesh.position.copy(flight.points[i]).lerp(flight.points[i+1],index-i);return true;
 }
 function segmentSphere(start,end,center,radius){
  const ab=end.clone().sub(start),den=ab.lengthSq()||1;
  const t=clamp(center.clone().sub(start).dot(ab)/den,0,1);
  return start.clone().addScaledVector(ab,t).distanceTo(center)<radius;
 }
 function blocksSight(start,end,{startCrouch=false,endCrouch=false,exactStart=false,exactEnd=false,endItem=false}={}){
  if(!smokeClouds.length)return false;
  const col=window.bspCol,a=start.clone(),b=end.clone();
  if(!exactStart)a.y+=Grenade14D.smokeEyeOffset(col,startCrouch);
  if(endItem){if(col)b.y-=36*col.T.k-.12;}
  else if(!exactEnd)b.y+=Grenade14D.smokeEyeOffset(col,endCrouch);
  // A ray has to cross the dense core of an active smoke cloud; skimming a
  // fading edge does not incorrectly blind the AI.
  let transmission=1;
  for(const c of smokeClouds){
   const center=c.mesh.position.clone();center.y+=.92*Grenade14D.worldScale(c.scale);
   transmission*=1-Grenade14D.segmentSmokeOpacity(a,b,center,c.radius,c.age,c.duration,c.scale);
  }
  return transmission<.63;
 }
 function worldSegment(a,b){
  const diff=b.clone().sub(a),length=diff.length();if(length<1e-5)return {hit:false};
  const worldTargets=obsM.filter(m=>m.visible!==false);
  const rayc=new THREE.Raycaster(a,diff.multiplyScalar(1/length),0,length);
  const hits=rayc.intersectObjects(worldTargets,true);
  // Combine point BSP and rendered dynamic obstacles, taking the earliest contact.
  let result=window.bspCol&&typeof BSP!=='undefined'?BSP.tracePointSegment?.(bspCol,a,b):null;
  if(hits.length){
   const h=hits[0],normal=h.face?.normal?.clone().transformDirection(h.object.matrixWorld)||new THREE.Vector3(0,1,0),frac=h.distance/length;
   if(normal.dot(diff)>0)normal.negate();
   if(!result?.hit||frac<result.frac)result={hit:true,frac,normal};
  }
  if(!result&&window.bspCol&&!worldTargets.length&&typeof BSP!=='undefined')return BSP.traceSegment(bspCol,a,b);
  return result||{hit:false};
 }
 // Seven sampled rays approximate a finite grenade; blast/visibility stay point-sized.
 function grenadeSegment(a,b){
  let best=worldSegment(a,b);const radius=.09;
  for(const [x,y,z] of [[radius,0,0],[-radius,0,0],[0,radius,0],[0,-radius,0],[0,0,radius],[0,0,-radius]]){
   const offset=V(x,y,z),start=a.clone().add(offset),end=b.clone().add(offset),h=worldSegment(start,end);
   if(h.startsolid&&window.bspCol?.pointClip&&BSP.pointSolid(window.bspCol,end)===false)continue;
   if(h.hit&&(!best.hit||h.frac<best.frac))best=h;
  }
  return best;
 }
 function sightClear(a,b){const test=worldSegment(a,b);return !test.hit||test.frac>.95}
 function thrownModel(type,container){
  const names={he:'hegrenade',flash:'flashbang',smoke:'smokegrenade'};
  loadWorldModel(names[type]).then(source=>{if(!source||!container.userData.active)return;
   const clone=THREE.SkeletonUtils?.clone?THREE.SkeletonUtils.clone(source.scene):source.scene.clone(true);
   if(!source.native)orientGoldSrcWorld(clone);clone.userData.ownedWorldClone=!!THREE.SkeletonUtils?.clone;container.add(clone);
   const fallback=container.userData.fallback;if(fallback)fallback.visible=false;
  });
 }

 function playGrenadeClip(name){
  const g=grenadeView;if(!g)return .25;
  const clip=g.clips.find(c=>c.name.replace(/__\d+$/,'')===name)
   ||(name==='deploy'?g.clips.find(c=>c.name==='draw'):null);
  if(!clip)return .25;
  if(g.action)g.action.fadeOut(.035);
  const action=g.mixer.clipAction(clip);action.reset();action.setLoop(THREE.LoopOnce,1);
  action.clampWhenFinished=true;action.play();if(g.action)action.fadeIn(.035);g.action=action;
  return Math.max(.08,clip.duration);
 }
 // Keep visual release at the authored 40% marker used by the existing
 // gameplay timing. Do not move the projectile, fuse or ammo deadline.
 function syncGrenadeThrow(action,pending){
  if(!action||!pending||pending.duration<=0)return;
  const rate=action.getClip().duration*.4/pending.duration;
  action.setEffectiveTimeScale(rate);
  action.time=Math.min(action.getClip().duration,pending.age*rate);
 }
 // The three original, non-shield grenade GLBs move their grenade prop
 // meshes behind the view camera right after the authored 40% release frame.
 // Keep the hand meshes/return animation, but never draw a grenade that is
 // already represented by its live world projectile. Shield rigs differ.
 function hideReleasedGrenadeProp(){
  const view=grenadeView;
  if(!view||!['hegrenade','flashbang','smokegrenade'].includes(view.asset)||view.propHidden)return false;
  if(view.group.children[0]?.userData.nativeMdl){
   const props=[];view.group.traverse(o=>{if(o.isSkinnedMesh&&o.userData.mdlPart!=='rhand'&&o.userData.mdlPart!=='lhand')props.push(o)});
   if(!props.length)return false;props.forEach(o=>o.visible=false);view.propHidden=true;return true;
  }
  const meshes=[];
  view.group.traverse(o=>{if(o.isMesh&&/^GoldSrcViewmodel_[678]$/.test(o.name))meshes.push(o)});
  if(meshes.length!==3)return false;
  meshes.forEach(o=>{o.visible=false});view.propHidden=true;
  return true;
 }
 function showGrenadeView(type){
  const name=thrownNames[type];if(!name||!viewScene||!vm)return;
  const asset=Phase14C.hasShield(inventory)?'shield_'+name:name;
  clearGrenadeView();const token=++grenadeViewToken;
  // Keep the normal gun hidden only while grenade handling is active.
  vm.visible=false;
  ensureWeaponModel(asset).catch(e=>asset===name?Promise.reject(e):ensureWeaponModel(name)).then(g=>{
   if(token!==grenadeViewToken||!running)return;
   const resolved=weaponModels[asset]===g?asset:name;
   const model=cloneViewmodel(g,resolved);
   const group=new THREE.Group();group.userData.viewAsset=resolved;group.add(model);Phase13.applyHand(group);
   grenadeView={group,mixer:new THREE.AnimationMixer(model),clips:g.animations,asset:resolved,age:0,token,action:null,propHidden:false};
   const pending=pendingThrow;
   const stage=pending?.stage;
   const duration=playGrenadeClip(stage==='pin'?'pullpin':stage==='throw'||stage==='released'?'throw':'deploy');
   if(pending?.type===type&&stage==='loading'){
    pending.stage='deploy';pending.age=0;pending.duration=Math.min(.30,duration*.62);
   }else if(stage==='throw')syncGrenadeThrow(grenadeView.action,pending);
   else if(stage==='released'){
    const a=grenadeView.action;if(a)a.time=Math.min(a.getClip().duration,a.getClip().duration*.4+pending.age);
   }else if(grenadeView.action)grenadeView.action.time=Math.min(duration,pending?.age||0);
   grenadeView.mixer.update(0);
   if(stage==='released')hideReleasedGrenadeProp();
   viewScene.add(group);
  }).catch(e=>{
   console.warn('Grenade viewmodel unavailable',name,e);
   if(pendingThrow?.type===type&&pendingThrow.stage==='loading'){
    pendingThrow.stage='deploy';pendingThrow.age=0;pendingThrow.duration=.16;
   }
  });
 }
 function clearGrenadeView(){
  grenadeViewToken++;
  if(grenadeView){const {group,mixer}=grenadeView;viewScene?.remove(group);mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot());const skeletons=new Set();group.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton)});skeletons.forEach(s=>s.dispose());grenadeView=null}
  if(vm&&!aiming&&!(typeof Phase13!=='undefined'&&Phase13.isSpectating?.()))vm.visible=true;
 }
 function makeGrenadeProjectile(type,origin,velocity,owner='player'){
  const group=new THREE.Group();group.position.copy(origin);group.userData.active=true;
  const fallback=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.26,10),new THREE.MeshStandardMaterial({color:type==='he'?0x4e6847:type==='flash'?0xc3c7c2:0x738a79,roughness:.7}));
  group.userData.fallback=fallback;group.add(fallback);S.add(group);thrownModel(type,group);
  const cfg=gspec[type];const p={type,mesh:group,v:velocity,age:0,bounces:0,fuse:cfg.fuse,owner,team:owner==='player'?playerTeam:owner.team,settled:false,releaseTime:performance.now()};
  projectiles.push(p);Phase10.grenadeThrown?.(owner,p.team);return p;
 }
 function releaseGrenade(type){
  if(!running||!pendingThrow||pendingThrow.type!==type)return false;
  const direction=cam.getWorldDirection(new THREE.Vector3());
  // The grenade leaves in front of the camera rather than inside the player.
  const eye=cam.position.clone(),origin=eye.clone().addScaledVector(direction,.35);
  const wall=grenadeSegment(eye,origin);
  if(wall.hit)origin.lerp(eye,1-Math.max(0,wall.frac-.05));
  const velocity=Grenade14D.throwVelocity(direction,{playerVertical:P.vy});
  makeGrenadeProjectile(type,origin,new THREE.Vector3(velocity.x,velocity.y,velocity.z));
  grenades[type]--;selectedGrenade=type;pendingThrow.stage='released';pendingThrow.age=0;
  hideReleasedGrenadeProp();
  say(type.toUpperCase()+' THROWN');hud();return true;
 }
 function throwGrenade(hold=false){
  if(blocked()||(typeof freezeLeft!=='undefined'&&freezeLeft>0)||roundWait||BombMode.locked()||pendingThrow||reloading>0||WeaponModes15C.active())return false;
  const type=grenades[selectedGrenade]>0?selectedGrenade:['he','flash','smoke'].find(x=>grenades[x]>0);
  if(!type){say('NO GRENADES · BUY EQUIPMENT');return false}
  // A grenade replaces the shielded pistol view; lower the shield first so
  // shield collision/damage protection cannot persist while throwing.
  if(shieldRaised)lowerShield();
  BombMode.deselect?.();aiming=false;zoomIdx=0;syncAim();
  pendingThrow={type,age:0,stage:'loading',duration:.16,committed:!hold};
  showGrenadeView(type);return true;
 }
 function commitGrenade(){if(pendingThrow)pendingThrow.committed=true}
 function cancelGrenade(){
  if(!pendingThrow)return;
  pendingThrow=null;clearGrenadeView();updateHud();
 }
 function cycleGrenade(){
  if(blocked()||pendingThrow)return;
  const types=Object.keys(thrownNames).filter(type=>grenades[type]>0);
  if(!types.length){say('NO GRENADES · BUY EQUIPMENT');return}
  selectedGrenade=types[(types.indexOf(selectedGrenade)+1)%types.length];
  say('SELECT '+selectedGrenade.toUpperCase());updateHud();
 }
 function planBotGrenade(b,target,type='he'){
  if(!running||!b||b.dead||!target||!S||!Object.hasOwn(gspec,type))return false;
  const local=!!window.bspCol,eye=b.g.position.clone().add(new THREE.Vector3(0,local?(b.crouching?.38:.56):(b.crouching?.95:1.35),0));
  const aimPoint=target.clone();aimPoint.y+=local?-.55:.15;
  const delta=aimPoint.clone().sub(eye),ground=new THREE.Vector3(delta.x,0,delta.z);
  const dist=ground.length();if(dist<5||dist>22)return false;
  // Aim to reach the observed target shortly before the fixed fuse. Reject arcs
  // that strike a surface far from the intended landing; do not guess bounces.
  const time=gspec[type].fuse-.035,vel=ground.multiplyScalar(1/time);
  vel.y=(delta.y+.5*Grenade14D.GRAVITY*time*time)/time;
  if(vel.length()>22||vel.y<2||vel.y>14)return false;
  const riskRadius=(type==='flash'?30:type==='he'?7:0)*Grenade14D.worldScale(window.bspCol?.T.k);
  let previous=eye,landing=aimPoint;
  const steps=Math.ceil(time/.08);
  for(let i=1;i<=steps;i++){
   const t=time*i/steps,next=eye.clone().addScaledVector(vel,t);next.y-=.5*Grenade14D.GRAVITY*t*t;
   const hit=grenadeSegment(previous,next);
   if(hit.hit){landing=previous.clone().lerp(next,Math.max(0,hit.frac??0));if(t<time-.12||landing.distanceTo(aimPoint)>1.1||hit.normal?.y<.6)return false;break;}
   previous=next;
  }
  if(riskRadius){
   const unsafe=p=>p.distanceTo(landing)<riskRadius&&sightClear(p,landing);
   if(type==='he'&&unsafe(eye))return false;
   if(bots.some(a=>a!==b&&!a.dead&&a.team===b.team&&unsafe(a.g.position.clone().add(V(0,local?.56:1.35,0))))||b.team===playerTeam&&P.hp>0&&unsafe(cam.position))return false;
  }
  return {origin:eye,vel};
 }
 function throwBotGrenade(b,target,type='he'){
  if(b?.pendingBotThrow)return false;
  const plan=planBotGrenade(b,target,type);if(!plan)return false;
  // Native sequences contain no release event. Use the middle of the
  // authored 31-frame throw, and revalidate from the current eye at release.
  if(b.mixer){const id={he:'hegrenade',flash:'flashbang',smoke:'smokegrenade'}[type];
   if(playBotAction(b,'shoot',id,.65)){
    b.pendingBotThrow={type,target:target.clone(),left:.325};
    b.grenadeVisual={id,pending:true};return true;
   }
  }
  makeGrenadeProjectile(type,plan.origin,plan.vel,b);return true;
 }
 function updateBotThrows(dt){
  for(const b of bots){const pending=b.pendingBotThrow;if(!pending)continue;
   const cancelled=b.dead||b.blinded>0||!running||roundWait||BombMode.isPlanting?.(b)||BombMode.isDefusing?.(b);
   if(!cancelled){pending.left-=dt;if(pending.left>1e-6)continue;}
   b.pendingBotThrow=null;b.grenadeVisual=null;
   const plan=cancelled?null:planBotGrenade(b,pending.target,pending.type);
   if(plan)makeGrenadeProjectile(pending.type,plan.origin,plan.vel,b);
   else if(!b.dead&&!roundWait&&running){const key=pending.type+'Count';b[key]=(b[key]||0)+1;}
  }
 }
 function grenadeThreat(b){
  if(b.blinded>0||!projectiles.length){b.grenadeAvoid=null;b.flashAvoid=null;return null;}
  const p=b.g.position,col=window.bspCol,factor=Grenade14D.worldScale(col?.T.k),eye=p.clone().add(new THREE.Vector3(0,Grenade14D.smokeEyeOffset(col,!!b.crouching),0)),t=performance.now()/1000;
  let flash=b.flashAvoid;
  if(flash&&(!projectiles.includes(flash.projectile)||t>flash.until))flash=null;
  if(!flash){for(const g of projectiles){
   if(g.type!=='flash'||g.age<.2||g.fuse-g.age>.65)continue;
   const point=g.mesh.position,d=eye.distanceTo(point),bearing=point.clone().sub(eye).setY(0).normalize();
   const facing=V(-Math.sin(b.g.rotation.y),0,-Math.cos(b.g.rotation.y));
   if(d>Grenade14D.TYPES.flash.flashRadius*factor||!sightClear(eye,point)||d>3&&facing.dot(bearing)<0)continue;
   flash={projectile:g,point:point.clone(),until:t+Math.max(0,g.fuse-g.age)+.12};break;
  }}
  b.flashAvoid=flash;
  // HE escape remains higher priority than a flash turn when both are known.
  const flashOrder=()=>flash?{mode:'avoid-flash',pos:p.clone(),look:flash.point,radius:1,hold:true,force:true}:null;
  let known=b.grenadeAvoid;
  if(known&&(!projectiles.includes(known.projectile)||t>known.until))known=null;
  for(const g of projectiles){
   if(g.type!=='he'||g.age<.35||g.fuse-g.age>.95)continue;
   const point=g.mesh.position,d=p.distanceTo(point);
   if(d>gspec.he.blastRadius*factor||!sightClear(eye,point))continue;
   const bearing=point.clone().sub(p).setY(0).normalize(),facing=new THREE.Vector3(-Math.sin(b.g.rotation.y),0,-Math.cos(b.g.rotation.y));
   if(d>2.5&&facing.dot(bearing)<0)continue;
   known={projectile:g,point:point.clone(),until:t+Math.min(.95,g.fuse-g.age)};break;
  }
  b.grenadeAvoid=known;
  if(!known||p.distanceTo(known.point)>=gspec.he.blastRadius*factor)return flashOrder();
  // Retain the last visible position while turning away; no tracking through walls.
  const away=p.clone().sub(known.point).setY(0);if(away.lengthSq()<.01)away.set(1,0,0);away.normalize();
  for(const angle of [0,.65,-.65,1.2,-1.2]){
   const dir=away.clone().applyAxisAngle(new THREE.Vector3(0,1,0),angle),dest=p.clone().addScaledVector(dir,3);
   if(sightClear(eye,eye.clone().addScaledVector(dir,1.2)))return {mode:'avoid-grenade',pos:dest,radius:.3,force:true};
  }
  return flashOrder();
 }
 function removeProjectile(p){p.mesh.userData.active=false;releaseWorldClones(p.mesh);S.remove(p.mesh);const i=projectiles.indexOf(p);if(i>=0)projectiles.splice(i,1);
  p.mesh.userData.fallback.geometry.dispose();p.mesh.userData.fallback.material.dispose();}
 function effectHE(pos,owner='player',team=owner==='player'?playerTeam:owner.team){
  sound(rnd()<.5?'hegrenade-1.wav':'hegrenade-2.wav',.72,pos);
  GrenadeFX15B.init(S);GrenadeFX15B.burst('he',pos);
  const col=window.bspCol,scale=col?.T.k||.02,wet=!!(col&&typeof BSP!=='undefined'&&BSP.pointWater?.(col,pos));
  const source=pos.clone();source.y+=col?scale:.02;
  // ReGameDLL CS 1.6 default mp_hegrenade_penetration=0: HE radius
  // damage is distance-based and reaches through walls. The visibility-
  // weighted blast used for Condition Zero is not the vanilla CS default.
  const contact=(origin,crouch,waterLevel)=>{
   const center=origin.clone();if(!col)center.y+=crouch?.55:.8;
   const distance=center.distanceTo(pos);
   return {damage:Grenade14D.waterSeparates(wet,waterLevel)?0:Grenade14D.heDamage(distance,false,scale),center};
  };
  for(const b of bots){if(b.dead)continue;
   const {damage,center}=contact(b.g.position,!!b.crouching,b.waterLevel||0);
   if(damage>1&&b!==owner&&b.team===team&&!window.GAME_FRIENDLY_FIRE)Phase10.friendlyHit?.(b,pos,team);
   if(damage>1&&(b===owner||b.team!==team||window.GAME_FRIENDLY_FIRE))damageBot(b,damage,'chest',center,owner==='player',owner==='player'?null:owner,'hegrenade',0,'explosion');
  }
  if(P.hp>0&&(owner==='player'||team!==playerTeam||window.GAME_FRIENDLY_FIRE)){
   const {damage}=contact(P.pos,crouching,P.waterLevel||0);
   if(damage>1)hurt(damage,pos,'explosion',owner==='player'?null:owner,'chest','hegrenade');
  }
  // Resolve actor exposure before breaking cover.
  if(col?.local)BSPBreakables.blast(pos,source,col);
 }
 function effectFlash(pos,team){
  sound(rnd()<.5?'flashbang-1.wav':'flashbang-2.wav',.85,pos);GrenadeFX15B.init(S);GrenadeFX15B.burst('flash',pos);
  const col=window.bspCol,scale=col?.T.k||.02,wet=!!(col&&typeof BSP!=='undefined'&&BSP.pointWater?.(col,pos));
  const waterBlocked=level=>Grenade14D.waterSeparates(wet,level);
  for(const b of bots){if(b.dead||waterBlocked(b.waterLevel||0))continue;
   const eye=b.g.position.clone().add(new THREE.Vector3(0,col?(28-(b.crouching?(Number.isInteger(col.crouchHead)?16:9):0))*scale:(b.crouching?1.05:1.56),0));
   const facing=new THREE.Vector3(-Math.sin(b.g.rotation.y),0,-Math.cos(b.g.rotation.y));
   const to=pos.clone().sub(eye).normalize();
   const data=Grenade14D.flashExposure(eye.distanceTo(pos),facing.dot(to),!sightClear(pos,eye),scale);
   if(data.duration>.25){
    b.blinded=Math.max(b.blinded||0,data.hold+data.fade*.35);if(data.duration>1)Phase10.friendlyFlash?.(b,team);b.visibleEnemy=null;b.los=false;b.memory=null;b.cd=Math.max(b.cd,.4)}
  }
  if(waterBlocked(P.waterLevel||0))return;
  const eye=cam.position,dist=eye.distanceTo(pos);
  const facing=cam.getWorldDirection(new THREE.Vector3());
  const data=Grenade14D.flashExposure(dist,facing.dot(pos.clone().sub(eye).normalize()),!sightClear(pos,eye),scale);
  if(data.duration>0){flashLayers.push({data,age:0});updateFlash(0);}
 }
 function effectSmoke(pos){
  sound('sg_explode.wav',.58,pos);
  GrenadeFX15B.init(S);
  const cloud=GrenadeFX15B.smoke(pos,gspec.smoke.duration,window.bspCol?.T.k||.02);if(cloud)smokeClouds.push(cloud);

 }
 function explode(p){
  const type=p.type,point=p.mesh.position.clone();removeProjectile(p);
  if(type==='he')effectHE(point,p.owner||'player',p.team);else if(type==='flash')effectFlash(point,p.team);else effectSmoke(point);
 }
 function updateProjectile(p,dt){
  const steps=Math.max(1,Math.ceil(dt/.012)),nominal=dt/steps;
  for(let i=0;i<steps;i++){
   if(!projectiles.includes(p))break;
   const deadline=p.type==='smoke'?gspec.smoke.maxWait:p.fuse;
   const step=Math.min(nominal,Math.max(0,deadline-p.age));
   p.age=Math.min(deadline,p.age+step);
   const old=p.mesh.position.clone();p.v.y-=Grenade14D.GRAVITY*step;
   const next=old.clone().addScaledVector(p.v,step);
   const hit=grenadeSegment(old,next);
   let collision=hit.hit,normal=hit.normal||new THREE.Vector3(0,1,0);
   if(collision)p.mesh.position.copy(old.clone().lerp(next,Math.max(0,(hit.frac??0)-.008)));
   else p.mesh.position.copy(next);
   LocalMapMedia.splash(window.bspCol,old,p.mesh.position);
   // Floor and elevated crates use the engine's existing collision primitives.
   // Never repeatedly bounce a resting grenade or fall through Dust Block.
   const floor=activeMapData?.local?(collision&&normal.y>.6?p.mesh.position.y-.11:-Infinity):window.bspCol?floorY(p.mesh.position.x,p.mesh.position.z,0):ground(p.mesh.position,.1);
   if(p.mesh.position.y<floor+.11){p.mesh.position.y=floor+.11;normal=new THREE.Vector3(0,1,0);collision=true}
   if(collision){
    const velocity=Grenade14D.bounce(p.v,normal,normal.y>.6?'ground':'hard');
    const speed=p.v.length();p.v.set(velocity.x,velocity.y,velocity.z);
    if(speed>1.1){p.bounces++;if(p.bounces<=5)sound('grenade_hit'+(p.bounces%3+1)+'.wav',.09,p.mesh.position)}
   }
   if(p.mesh.position.y<=floor+.115){const drag=Math.pow(.991,step/.012);p.v.x*=drag;p.v.z*=drag;
    if(Math.hypot(p.v.x,p.v.z)<.28&&Math.abs(p.v.y)<.3)p.v.set(0,0,0);
   }
   // HE and flash have a fixed fuse; smoke starts to emit after coming to rest.
   if(p.age>=p.fuse&&(p.type!=='smoke'||p.v.length()<1.3||p.age>=gspec.smoke.maxWait)){
    explode(p);break;
   }
  }
  if(projectiles.includes(p)){
   p.mesh.rotation.x+=dt*Math.min(12,p.v.length()*.55);
   p.mesh.rotation.z+=dt*Math.min(8,p.v.length()*.42);
  }
 }
 function update(dt){
  if(pendingThrow&&(!running||P.hp<=0)){
   // Death during pin-pull cancels the throw without consuming ammunition.
   pendingThrow=null;clearGrenadeView();
  }
  if(pendingThrow){
   pendingThrow.age+=dt;
   if(pendingThrow.stage==='loading'&&pendingThrow.age>.9){
    // If an asset cannot load, gameplay remains functional without a viewmodel.
    pendingThrow.stage='deploy';pendingThrow.age=0;pendingThrow.duration=.18;
   }
   else if(pendingThrow.stage==='deploy'&&pendingThrow.age>=pendingThrow.duration){
    pendingThrow.stage='pin';pendingThrow.age=0;
    pendingThrow.duration=Grenade14D.clamp(playGrenadeClip('pullpin')*.65,.22,.37);
    sound('pinpull.wav',.35);
   }else if(pendingThrow.stage==='pin'&&pendingThrow.committed&&pendingThrow.age>=pendingThrow.duration){
    pendingThrow.stage='throw';pendingThrow.age=0;
    pendingThrow.duration=Grenade14D.clamp(playGrenadeClip('throw')*.40,.15,.32);
    syncGrenadeThrow(grenadeView?.action,pendingThrow);
   }else if(pendingThrow.stage==='throw'&&pendingThrow.age>=pendingThrow.duration){
    const action=grenadeView?.action;
    if(action){syncGrenadeThrow(action,{age:pendingThrow.duration,duration:pendingThrow.duration});action.setEffectiveTimeScale(1);}
    releaseGrenade(pendingThrow.type);
   }else if(pendingThrow.stage==='released'&&pendingThrow.age>.55){
    pendingThrow=null;clearGrenadeView();updateHud();
   }
  }
  if(grenadeView){grenadeView.mixer.update(dt);grenadeView.age+=dt}
  // syncAim() runs each frame and otherwise unhides the gun over the grenade.
  if(vm&&(pendingThrow||grenadeView))vm.visible=false;
  for(const p of projectiles.slice())updateProjectile(p,dt);
  updateBotThrows(dt);
  for(const c of smokeClouds.slice()){
   if(!GrenadeFX15B.updateSmoke(c,dt)){
    GrenadeFX15B.removeSmoke(c);smokeClouds.splice(smokeClouds.indexOf(c),1);
   }
  }
  GrenadeFX15B.update(dt);
  if(flashLayers.length)updateFlash(dt);

  for(const d of dropped)if(d.flight&&!advanceDropFlight(d.mesh,d.flight,dt))d.flight=null;
  scanKits(dt);scanBotWeapons(dt);syncPickup();
 }
 function clearItemDrops(){for(const d of dropped.slice())removeDrop(d);for(const d of kitDrops.slice())removeKit(d);kitScan=weaponScan=0;}
 function updateFlash(dt){
  activeFlash=flashStart=0;
  for(let i=flashLayers.length-1;i>=0;i--){
   const layer=flashLayers[i];layer.age+=dt;
   if(layer.age>=layer.data.duration){flashLayers.splice(i,1);continue;}
   activeFlash=Math.max(activeFlash,Grenade14D.flashOpacity(layer.age,layer.data));
   flashStart=Math.max(flashStart,layer.data.duration-layer.age);
  }
  $('flashEffect').style.opacity=String(activeFlash);
 }
 function resetRound(){
  pendingThrow=null;clearGrenadeView();clearItemDrops();
  for(const b of bots){b.pendingBotThrow=null;b.grenadeVisual=null;}
  for(const p of projectiles.slice())removeProjectile(p);
  for(const c of smokeClouds.slice())GrenadeFX15B.removeSmoke(c);
  smokeClouds.length=0;GrenadeFX15B.reset();shieldRaised=false;if(typeof Phase14B!=='undefined'&&weaponInstances.shield)Phase14B.setRaised(weaponInstances.shield,false);crouchRequested=mobileCrouch=crouching=false;crouchBlend=0;
  activeFlash=flashStart=0;flashLayers.length=0;$('flashEffect').style.opacity=0;closePickup();dismissedDrop=null;
 }
 function resetMatch(){resetRound();nightVisionActive=false;silenced.usp=true;silenced.m4a1=true;famasBurst=glockBurst=false;WeaponModes15C.cancel();document.body.classList.remove('night-vision')}
 function releaseLayoutDrag(){const old=dragging;dragging=null;if(old){const btn=$(old.id);if(btn?.hasPointerCapture?.(old.pointer))try{btn.releasePointerCapture(old.pointer)}catch(_){}}}
 function cancelEdit(){releaseLayoutDrag();editor=false;document.body.classList.remove('layout-edit');$('controlEditor').classList.add('hidden')}
 function saveControls(){try{localStorage.setItem(STORAGE,JSON.stringify(config))}catch(e){console.warn('Control layout not saved',e)}cancelEdit()}
 function clearStyle(btn){for(const v of ['left','top','right','bottom','transform','width','height','opacity','--chip-scale'])btn.style.removeProperty(v)}
 function normalizeLayout(raw){
  const out={};if(!raw||typeof raw!=='object')return out;
  for(const id of controls){const p=raw[id];if(!p||![p.x,p.y,p.size,p.opacity].every(Number.isFinite))continue;
   out[id]={x:clamp(p.x,0,100),y:clamp(p.y,0,100),size:clamp(p.size,38,90),opacity:clamp(p.opacity,.35,1)};}return out;
 }
 function applyControls(){
  config=normalizeLayout(config);
  for(const id of controls){const b=$(id);if(!b)continue;const p=config[id];clearStyle(b);
   if(p&&id==='chips'){b.style.left=`clamp(calc(var(--safe-l, 0px) + 20vw), ${p.x}%, calc(100% - var(--safe-r, 0px) - 20vw))`;b.style.top=`clamp(calc(var(--safe-t, 0px) + 22px), ${p.y}%, calc(100% - var(--safe-b, 0px) - 22px))`;b.style.right='auto';b.style.transform='translate(-50%,-50%)';b.style.opacity=p.opacity;b.style.setProperty('--chip-scale',String(p.size/52));continue;}
   if(p){const half=p.size/2;
    b.style.left=`clamp(calc(env(safe-area-inset-left, 0px) + ${half}px), ${p.x}%, calc(100% - env(safe-area-inset-right, 0px) - ${half}px))`;
    b.style.top=`clamp(calc(env(safe-area-inset-top, 0px) + ${half}px), ${p.y}%, calc(100% - env(safe-area-inset-bottom, 0px) - ${half}px))`;b.style.right='auto';b.style.bottom='auto';b.style.transform='translate(-50%,-50%)';
    b.style.setProperty('width',p.size+'px','important');b.style.setProperty('height',p.size+'px','important');b.style.opacity=p.opacity}
  }
 }
 function ensureLayout(){
  const rect=document.documentElement.getBoundingClientRect();
  for(const id of controls){const b=$(id);if(!b||config[id])continue;const r=b.getBoundingClientRect();
   config[id]={x:clamp(((r.left+r.width/2)/rect.width)*100,3,97),y:clamp(((r.top+r.height/2)/rect.height)*100,7,96),size:id==='chips'?52:Math.round(r.width)||52,opacity:.82}}
 }
 function presets(type){
  const layouts={
   classic:{fire:[92,71],ads:[84,52],jump:[93,92],rel:[84,71],swap:[93,37],buybtn:[76,92],grenadeBtn:[76,71],grenadeTypeBtn:[76,51],crouchBtn:[84,92],walkBtn:[23,65],pickupBtn:[76,31],nvgBtn:[18,8],radioBtn:[84,25],scoreBtn:[84,10],dropBtn:[24,8],flashBtn:[36,8],settingsGameBtn:[30,8],teamBtn:[43,8]},
   two:{fire:[90,70],ads:[78,76],jump:[88,91],rel:[78,55],swap:[93,47],buybtn:[65,92],grenadeBtn:[63,68],grenadeTypeBtn:[62,51],crouchBtn:[77,91],walkBtn:[24,24],pickupBtn:[64,35],nvgBtn:[51,92],radioBtn:[92,27],scoreBtn:[84,27],dropBtn:[36,9],flashBtn:[55,9],settingsGameBtn:[45,9],teamBtn:[7,91]},
   three:{fire:[88,24],ads:[77,69],jump:[89,90],rel:[90,69],swap:[91,47],buybtn:[70,91],grenadeBtn:[65,73],grenadeTypeBtn:[65,54],crouchBtn:[77,90],walkBtn:[20,68],pickupBtn:[64,33],nvgBtn:[53,91],radioBtn:[83,26],scoreBtn:[76,26],dropBtn:[36,9],flashBtn:[55,9],settingsGameBtn:[45,9],teamBtn:[7,91]},
   four:{fire:[13,24],ads:[77,65],jump:[90,85],rel:[90,66],swap:[90,47],buybtn:[68,92],grenadeBtn:[63,72],grenadeTypeBtn:[63,52],crouchBtn:[77,88],walkBtn:[18,55],pickupBtn:[64,33],nvgBtn:[53,91],radioBtn:[83,26],scoreBtn:[76,26],dropBtn:[36,9],flashBtn:[55,9],settingsGameBtn:[45,9],teamBtn:[7,91]}
  };
  const current=layouts[type];if(!current)return;
  for(const id of controls){if(!current[id])continue;config[id]={x:current[id][0],y:current[id][1],size:id==='fire'?64:(!['nvgBtn','scoreBtn','radioBtn','dropBtn','flashBtn','settingsGameBtn','teamBtn'].includes(id)?48:40),opacity:.7}}
  applyControls();
 }
 function openEditor(){
  editor=true;document.body.classList.add('layout-edit');$('controlEditor').classList.remove('hidden');
  ensureLayout();selectControl(selectedControl);applyControls();
 }
 function selectControl(id){
  selectedControl=id;$('layoutCurrent').textContent=id.replace('Btn','').toUpperCase();
  $('layoutSize').value=config[id]?.size||52;$('layoutOpacity').value=config[id]?.opacity||.82;
  controls.forEach(key=>$(key)?.classList.toggle('layout-selected',key===id));
 }
 function initControlEditor(){
  $('controlLayoutBtn').addEventListener('click',openEditor);
  $('layoutSave').addEventListener('click',saveControls);
  $('layoutCancel').addEventListener('click',()=>{try{config=JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(e){config={}}applyControls();cancelEdit()});
  $('layoutReset').addEventListener('click',()=>{config={};applyControls();ensureLayout();selectControl(selectedControl)});
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{presets(b.dataset.preset);selectControl(selectedControl)}));
  $('layoutSize').addEventListener('input',e=>{ensureLayout();config[selectedControl].size=+e.target.value;applyControls()});
  $('layoutOpacity').addEventListener('input',e=>{ensureLayout();config[selectedControl].opacity=+e.target.value;applyControls()});
  for(const id of controls){const b=$(id);if(!b)continue;
   b.addEventListener('pointerdown',e=>{
    if(!editor)return;e.preventDefault();e.stopImmediatePropagation();if(dragging)return;try{b.setPointerCapture(e.pointerId)}catch(_){}
    dragging={id,pointer:e.pointerId};selectControl(id);
   },true);
   b.addEventListener('pointermove',e=>{
    if(!editor||dragging?.id!==id||dragging.pointer!==e.pointerId)return;
    e.preventDefault();e.stopImmediatePropagation();const w=innerWidth,h=innerHeight;
    config[id].x=clamp(e.clientX/w*100,4,96);config[id].y=clamp(e.clientY/h*100,9,95);applyControls();
   },true);
   for(const kind of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(kind,e=>{if(!editor)return;e.preventDefault();e.stopImmediatePropagation();if(dragging?.id===id&&dragging.pointer===e.pointerId)dragging=null},true);
   b.addEventListener('click',e=>{if(editor){e.preventDefault();e.stopImmediatePropagation()}},true);
  }
 }
 function setupIcons(){
  const names={fire:'Tembak',ads:'Bidik / fungsi senjata',jump:'Lompat',rel:'Reload',swap:'Ganti senjata',buybtn:'Beli',grenadeBtn:'Lempar grenade',grenadeTypeBtn:'Pilih grenade',crouchBtn:'Jongkok',walkBtn:'Walk',pickupBtn:'Ambil senjata',nvgBtn:'Night vision',radioBtn:'Perintah radio',scoreBtn:'Scoreboard',dropBtn:'Drop weapon',flashBtn:'Flashlight',teamBtn:'Change team',settingsGameBtn:'Settings'};
  for(const id of controls){const b=$(id);if(!b||id==='chips')continue;b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[id]+'</svg>';
   b.setAttribute('role','button');b.setAttribute('tabindex','0');b.setAttribute('aria-label',names[id]);b.title=names[id];
  }
  const pb=$('pauseBtn');if(pb)pb.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'+icons.pauseBtn+'</svg>';
 }
 function setup(){
  setupIcons();initControlEditor();GrenadeFX15B.preload();
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(saved&&typeof saved==='object')config=saved}catch(e){config={}}
  applyControls();
  for(const kind of ['pointerup','pointercancel'])window.addEventListener?.(kind,e=>{if(dragging?.pointer===e.pointerId)releaseLayoutDrag()},true);
  document.addEventListener('blockstrike:reset-controls',releaseLayoutDrag);
  const crouchButton=$('crouchBtn');
  try{crouchMode=localStorage.getItem('block-strike-crouch-mode')==='hold'?'hold':'toggle'}catch(e){}
  $('crouchMode').value=crouchMode;
  $('crouchMode').addEventListener('change',e=>{crouchMode=e.target.value;mobileCrouch=false;try{localStorage.setItem('block-strike-crouch-mode',crouchMode)}catch(err){}});
  let crouchPointer=null,crouchEpoch=0;
  crouchButton.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(blocked()||crouchPointer!==null||e.button!==0)return;crouchPointer=e.pointerId;crouchEpoch++;try{crouchButton.setPointerCapture(e.pointerId)}catch(_){}mobileCrouch=crouchMode==='hold'?true:!mobileCrouch;updateCrouch();updateHud()});
  const finishCrouch=e=>{if(e.pointerId!==crouchPointer)return;crouchPointer=null;crouchEpoch++;if(crouchMode==='hold'){mobileCrouch=false;updateCrouch()}if(crouchButton.hasPointerCapture?.(e.pointerId))try{crouchButton.releasePointerCapture(e.pointerId)}catch(_){}};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])crouchButton.addEventListener(type,finishCrouch);
  for(const type of ['pointerup','pointercancel'])window.addEventListener?.(type,finishCrouch,true);
  for(const type of ['touchend','touchcancel'])window.addEventListener?.(type,e=>{if(e.touches.length||crouchPointer===null)return;const id=crouchPointer,epoch=crouchEpoch;setTimeout(()=>{if(crouchEpoch===epoch&&crouchPointer===id)finishCrouch({pointerId:id})},80)},{capture:true,passive:true});
  document.addEventListener('blockstrike:reset-controls',()=>{const old=crouchPointer;crouchPointer=null;crouchEpoch++;if(old!==null&&crouchButton.hasPointerCapture?.(old))try{crouchButton.releasePointerCapture(old)}catch(_){}});

  $('nvgBtn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleNightVision()});
  $('grenadeTypeBtn').addEventListener('click',cycleGrenade);
  $('pickupBtn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();useNearby()});
  $('pickupAccept').addEventListener('click',pickupNearest);$('pickupCancel').addEventListener('click',()=>closePickup());
  updateHud();
 }
 setup();
 return {get famasBurst(){return famasBurst},get glockBurst(){return glockBurst},burstOn:k=>k==='famas'?famasBurst:k==='glock18'?glockBurst:false,get crouching(){return crouching},get crouchBlend(){return crouchBlend},get shieldRaised(){return shieldRaised},
  loadWorldModel,settleWorldModels,releaseWorldModels,orientGoldSrcWorld,unsilenced,firingSound,shieldPistol,lowerShield,secondaryAction,toggleNightVision,updateHud,
  setCrouchInput,updateCrouch,releaseControls,blockShieldHit,shieldImpact,
  shieldActiveWeapon,tossItem,advanceDropFlight,dropBotWeapon,dropForPurchase,dropPlayerOnDeath,dropPlayerWeapon,dropDefuseKit,canSeeItem,itemFloor,clearItemDrops,pickupNearest,useNearby,blocksSight,throwGrenade,commitGrenade,cancelGrenade,cycleGrenade,handlingGrenade:()=>!!pendingThrow,getViewmodel:()=>grenadeView?.group||null,throwBotGrenade,grenadeThreat,resetRound,resetMatch,update,
  getDebugState:()=>({projectiles:projectiles.length,smoke:smokeClouds.length,pendingThrow:pendingThrow?.stage||null,
   grenadeTypes:projectiles.map(p=>p.type),grenadeBounces:projectiles.map(p=>p.bounces),smokeRadii:smokeClouds.map(c=>c.radius),
   flashStrength:activeFlash,flashTimer:flashStart,dropped:dropped.length,kitDrops:kitDrops.length,nightVisionActive,shieldRaised,crouching,fx:GrenadeFX15B.debug()})};
})();
