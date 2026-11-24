/* AR11.10.22I.4 — imported character arms anchored to the live viewmodel hand bones, plus bot held-weapon axis and mobility.
 * Safe by design: if anything needed is missing (hand bones, arm geometry, allowed weapon) the stock CS hands stay visible. */
(function (global) {
 'use strict';
 const VERSION='AR11.10.22I.4-PB-ARMS-ANCHORED';
 const stats={armsBuilt:0,armsTriangles:0,stockArmGroupsHidden:0,weaponAxes:0,autoJumps:0,autoCrouches:0,errors:0,armsActive:false,armsReason:'init'};
 const UNIT=.02; // GoldSrc unit -> viewmodel metres (same scale as the stock viewmodel group)
 const PB_WEAPONS=new Set(['ak47','aug','awp','deagle','famas','g3sg1','galil','glock18','m249','m3','m4a1','mac10','mp5','p228','p90','scout','sg552','tmp','usp','xm1014']);
 const STOCK_ARM_TEXTURE=/^(view[ _-]?glove|view[ _-]?skin|view[ _-]?finger)(\.\w+)?$/i;
 const vForward=new THREE.Vector3(1,0,0),vDesired=new THREE.Vector3(),qParent=new THREE.Quaternion(),qBaseWorld=new THREE.Quaternion(),qDelta=new THREE.Quaternion(),qWorld=new THREE.Quaternion(),qInverse=new THREE.Quaternion();
 const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3(),tmpC=new THREE.Vector3(),qCal=new THREE.Quaternion(),eCal=new THREE.Euler();
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const attributeValue=(a,i,k)=>k===0?a.getX(i):k===1?a.getY(i):k===2?a.getZ(i):a.getW(i);
 // ---- generic bone-name helpers (GoldSrc Biped, Blender-style, Mixamo-ish names) ----
 const norm=s=>String(s||'').replace(/[_\-.:]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim().toLowerCase();
 function sideOf(name){
  const k=' '+norm(name)+' ';
  if(/ r /.test(k)||/right/.test(k))return 'R';
  if(/ l /.test(k)||/left/.test(k))return 'L';
  return null;
 }
 const ARM_WORD=/(clavicle|shoulder|upper ?arm|fore ?arm|elbow|wrist|hand|palm|finger|thumb|\barm\b)/;
 const NOT_ARM=/(handle|thigh|calf|foot|toe|hip|leg|head|neck|spine|breast)/;
 const isArmName=n=>{const k=norm(n);return ARM_WORD.test(k)&&!NOT_ARM.test(k)};
 const pbHandName=n=>/(^| )(hand|palm)$/.test(norm(n));
 // ---- user switches / calibration ----
 const params=(()=>{try{return new URLSearchParams(global.location?.search||'')}catch(_){return new URLSearchParams('')}})();
 const enabled=()=>{
  if(global.BS_PB_ARMS===false||params.get('pbarms')==='0')return false;
  try{if(global.localStorage?.getItem('bsPbArms')==='0')return false}catch(_){}
  return true;
 };
 const DEFAULT_CAL=Object.freeze({x:0,y:0,z:0,yaw:0,pitch:0,roll:0,scale:100});
 const calibrations=new Map();
 function calFor(id){
  if(calibrations.has(id))return calibrations.get(id);
  let cal={...DEFAULT_CAL};
  try{const raw=global.localStorage?.getItem('bsArmCal:'+id);if(raw)cal={...cal,...JSON.parse(raw)}}catch(_){}
  calibrations.set(id,cal);return cal;
 }
 function saveCal(id){try{global.localStorage?.setItem('bsArmCal:'+id,JSON.stringify(calFor(id)))}catch(_){}}
 // ---- arm geometry: only triangles skinned to the arm bones of ONE side ----
 function armGeometry(source,side){
  const g=source.geometry,p=g?.getAttribute('position'),si=g?.getAttribute('skinIndex'),sw=g?.getAttribute('skinWeight');
  if(!p||!si||!sw||p.count<3)return null;
  const bones=source.skeleton?.bones||[],mine=bones.map(b=>isArmName(b.name)&&sideOf(b.name)===side),index=g.index,indices=[];
  const vertexArm=i=>{let score=0;for(let k=0;k<4;k++){const w=attributeValue(sw,i,k);if(w>.02&&mine[attributeValue(si,i,k)|0])score+=w;}return score};
  const count=index?index.count:p.count;
  for(let i=0;i+2<count;i+=3){
   const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
   const wa=vertexArm(a),wb=vertexArm(b),wc=vertexArm(c);
   if((wa>.5)+(wb>.5)+(wc>.5)>=2||wa+wb+wc>=2.15)indices.push(a,b,c);
  }
  if(indices.length<3)return null;
  const out=new THREE.BufferGeometry();
  for(const name of ['position','normal','uv','uv2','skinIndex','skinWeight','color']){
   const src=g.getAttribute(name);if(!src)continue;
   const C=src.array.constructor,arr=new C(indices.length*src.itemSize);
   for(let i=0;i<indices.length;i++)for(let k=0;k<src.itemSize;k++)arr[i*src.itemSize+k]=attributeValue(src,indices[i],k);
   out.setAttribute(name,new THREE.BufferAttribute(arr,src.itemSize,src.normalized));
  }
  out.computeBoundingSphere();
  stats.armsTriangles+=indices.length/3;
  return out;
 }
 // ---- one arm rig per side (left / right) ----
 const rigs={R:null,L:null};let rigSource=null,rigId='',clipKeys={R:'',L:''},actions={R:null,L:null},lastTime=0;
 function disposeRig(rig){
  if(!rig)return;
  try{rig.mixer.stopAllAction()}catch(_){}
  rig.root.parent?.remove(rig.root);const skeletons=new Set();
  rig.root.traverse(o=>{if(o.userData?.blockStrikePBArmGeometry)o.geometry?.dispose();if(o.isSkinnedMesh&&o.skeleton)skeletons.add(o.skeleton)});
  skeletons.forEach(s=>{try{s.dispose()}catch(_){}});
 }
 function disposeArms(){
  disposeRig(rigs.R);disposeRig(rigs.L);rigs.R=rigs.L=null;rigSource=null;rigId='';clipKeys={R:'',L:''};actions={R:null,L:null};lastTime=0;
 }
 function buildRig(source,side){
  const root=THREE.SkeletonUtils.clone(source.scene);root.name='BLOCKSTRIKE_IMPORTED_VIEW_ARM_'+side;
  const skinned=[];root.traverse(o=>{if(o.isMesh)o.visible=false;if(o.isSkinnedMesh&&o.geometry)skinned.push(o)});
  let built=0;
  for(const o of skinned){
   const geometry=armGeometry(o,side);if(!geometry)continue;
   const m=new THREE.SkinnedMesh(geometry,o.material);
   m.name='PB_VIEW_ARM_'+side+'_'+built;m.userData.blockStrikePBArmGeometry=true;
   m.frustumCulled=false;m.castShadow=false;m.receiveShadow=false;m.renderOrder=3;
   m.bind(o.skeleton,o.bindMatrix);m.bindMode=o.bindMode||'attached';root.add(m);built++;
  }
  let hand=null;
  root.traverse(o=>{if(!hand&&o.isBone&&sideOf(o.name)===side&&pbHandName(o.name))hand=o});
  if(!built||!hand){root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton?.dispose()});return null}
  root.visible=false;root.userData.blockStrikePBViewArms=true;
  return {root,hand,mixer:new THREE.AnimationMixer(root),baseQuat:root.quaternion.clone()};
 }
 // ---- stock viewmodel hands (hidden only while the PB arms are really shown) ----
 let stockVm=null;const stockRecords=[];
 function restoreStockHands(){
  for(const r of stockRecords)if(r.mesh)r.mesh.visible=r.visible;
  stockRecords.length=0;stockVm=null;
 }
 function hideStockHands(model){
  if(stockVm!==model){restoreStockHands();stockVm=model}
  if(stockRecords.length)return stockRecords.length;
  model.traverse(mesh=>{
   if(mesh.isMesh&&STOCK_ARM_TEXTURE.test(String(mesh.userData?.texName||'').trim())){stockRecords.push({mesh,visible:mesh.visible});mesh.visible=false}
  });
  stats.stockArmGroupsHidden+=stockRecords.length;return stockRecords.length;
 }
 // ---- anchors: the live viewmodel hand bones ----
 function findVmHands(model){
  if(model.userData.blockStrikeHands!==undefined)return model.userData.blockStrikeHands;
  const out={left:null,right:null};
  model.traverse(o=>{
   if(!o.isBone)return;const n=o.userData?.srcName;if(!n)return;const k=norm(n);
   if(/handle|hand \d/.test(k))return;
   if(/right ?hand|(^| )r hand$/.test(k))out.right=out.right||o;
   else if(/left ?hand|(^| )l hand$/.test(k))out.left=out.left||o;
  });
  return model.userData.blockStrikeHands=(out.left&&out.right)?out:null;
 }
 function activePlayerModel(){
  const id=playerAvatar?.userData?.characterVoice?.id;
  if(!id)return null;
  const model=(playerTeam==='CT'?CTC:TC)?.[id];
  return model?.scene&&Array.isArray(model.animations)?{id,model}:null;
 }
 const familyFor=id=>{
  if(id==='knife')return 'knife';if(id==='elite')return 'onehanded';
  if(id==='m3'||id==='xm1014')return 'shotgun';if(id==='m249')return 'm249';
  if(id==='ak47')return 'ak47';if(id==='mp5')return 'mp5';
  if(['m4a1','famas','galil','aug','sg552'].includes(id))return 'carbine';
  if(['usp','glock18','p228','deagle','fiveseven'].includes(id))return 'onehanded';
  return 'rifle';
 };
 function chooseClip(side,model){
  const rig=rigs[side];if(!rig)return;
  const state=vm?.userData?.weaponAnimation,id=cur(),prefix=Phase9?.crouching?'crouch_':'ref_',family=familyFor(id);
  const kind=state?.currentKind||'idle';let verb=kind==='fire'?'shoot':kind==='reload'?'reload':'aim';
  const names=[prefix+verb+'_'+family,'ref_'+verb+'_'+family,prefix+'aim_'+family,'ref_aim_'+family,prefix+'aim_rifle','ref_aim_rifle'];
  const clips=model.animations||[];let clip=null;
  for(const n of names){clip=clips.find(c=>c.name===n);if(clip)break}
  if(!clip)return;
  const oneShot=verb==='shoot'||verb==='reload',key=clip.name+':'+(oneShot?'once':'loop');
  if(key===clipKeys[side])return;
  const action=rig.mixer.clipAction(clip);action.reset();
  if(oneShot){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true}else{action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false}
  action.setEffectiveWeight(1);action.play();
  if(actions[side]&&actions[side]!==action)actions[side].fadeOut(.08);
  action.fadeIn(.08);actions[side]=action;clipKeys[side]=key;
 }
 function setReason(r){stats.armsReason=r;stats.armsActive=false}
 function hideAllArms(reason){
  if(rigs.R)rigs.R.root.visible=false;if(rigs.L)rigs.L.root.visible=false;
  restoreStockHands();setReason(reason);return false;
 }
 function updatePBArms(){
  if(!enabled())return hideAllArms('disabled by switch');
  if(!viewScene||!running||Phase13?.isSpectating?.())return hideAllArms('spectating or not running');
  if(!vm||vm.parent!==viewScene||!vm.visible||!vm.userData?.nativeMdl)return hideAllArms('no native viewmodel');
  if(Phase9?.handlingGrenade?.()||BombMode?.getViewmodel?.()||Phase9?.shieldRaised)return hideAllArms('grenade/bomb/shield view');
  const asset=vm.userData?.viewAsset||'';
  if(!PB_WEAPONS.has(asset))return hideAllArms('weapon not supported: '+asset);
  if(typeof WeaponImport!=='undefined'&&WeaponImport.active?.(asset))return hideAllArms('imported weapon pack');
  const active=activePlayerModel();
  if(!active){if(rigs.R||rigs.L)disposeArms();return hideAllArms('no imported character')}
  const hands=findVmHands(vm);
  if(!hands)return hideAllArms('viewmodel has no hand bones: '+asset);
  if(rigSource!==active.model){
   disposeArms();rigSource=active.model;rigId=active.id;
   try{rigs.R=buildRig(active.model,'R');rigs.L=buildRig(active.model,'L');if(rigs.R&&rigs.L){stats.armsBuilt+=1;for(const s of ['R','L']){viewScene.add(rigs[s].root);rigs[s].root.updateMatrixWorld(true)}}}
   catch(e){stats.errors++;console.warn('[22I.4] PB arm build:',e)}
  }
  if(!rigs.R||!rigs.L)return hideAllArms('character has no usable arm bones');
  const cal=calFor(rigId),t=performance.now(),delta=lastTime?clamp((t-lastTime)/1000,0,.08):0;lastTime=t;
  vm.updateMatrixWorld(true);
  const flipped=vm.matrixWorld.determinant()<0;
  // The mirrored (right-handed) viewmodel swaps which named bone is the player's right hand.
  const anchors={R:flipped?hands.left:hands.right,L:flipped?hands.right:hands.left};
  eCal.set(cal.pitch*Math.PI/180,cal.yaw*Math.PI/180,cal.roll*Math.PI/180,'YXZ');qCal.setFromEuler(eCal);
  const k=UNIT*(cal.scale/100);
  for(const side of ['R','L']){
   const rig=rigs[side];chooseClip(side,active.model);rig.mixer.update(delta);
   rig.root.quaternion.copy(qCal).multiply(rig.baseQuat);rig.root.scale.setScalar(k);
   rig.root.position.set(0,0,0);rig.root.updateMatrixWorld(true);
   rig.hand.getWorldPosition(tmpA);anchors[side].getWorldPosition(tmpB);
   rig.root.position.copy(tmpB).sub(tmpA).add(tmpC.set(cal.x/100,cal.y/100,cal.z/100));
   rig.root.updateMatrixWorld(true);rig.root.visible=true;
  }
  if(!hideStockHands(vm)){return hideAllArms('no stock hand meshes recognised')}
  stats.armsActive=true;stats.armsReason='active: '+asset+' on '+rigId;return true;
 }

 function markHeldMeshes(meshes){
  for(const mesh of meshes||[]){
   if(!mesh?.userData?.attachBone||!mesh.quaternion)continue;
   const bone=String(mesh.userData.attachBone);
   if(!/Hand/i.test(bone))continue;
   mesh.userData.blockStrikeAimBaseQuaternion=mesh.quaternion.clone();
   mesh.matrixAutoUpdate=true;mesh.updateMatrix();
  }
  return meshes;
 }
 function alignBotWeapons(){
  if(!Array.isArray(bots))return;
  for(const b of bots){
   if(!b||b.dead||!b.g||!b.weaponModel?.length||b.shieldRaised||!['primary','pistol'].includes(W[b.weaponId]?.slot))continue;
   const yaw=b.g.rotation.y+(b.visualMount?.rotation.y||0),pitch=clamp(Number(b.aimPitch)||0,-.65,.65);
   const cp=Math.cos(pitch);vDesired.set(-Math.sin(yaw)*cp,Math.sin(pitch),-Math.cos(yaw)*cp).normalize();
   for(const mesh of b.weaponModel){
    const bone=mesh?.userData?.attachBone;
    if(!bone||!mesh.parent||!mesh.userData.blockStrikeAimBaseQuaternion)continue;
    if(b.weaponId!=='elite'&&!/Bip01[_ ]R[_ ]Hand/i.test(bone))continue;
    if(b.weaponId==='elite'&&!/Bip01[_ ][LR][_ ]Hand/i.test(bone))continue;
    mesh.parent.updateWorldMatrix(true,false);mesh.parent.getWorldQuaternion(qParent);
    qBaseWorld.multiplyQuaternions(qParent,mesh.userData.blockStrikeAimBaseQuaternion);
    tmpA.copy(vForward).applyQuaternion(qBaseWorld).normalize();
    qDelta.setFromUnitVectors(tmpA,vDesired);
    qWorld.multiplyQuaternions(qDelta,qBaseWorld);
    qInverse.copy(qParent).invert();mesh.quaternion.multiplyQuaternions(qInverse,qWorld);mesh.updateMatrix();stats.weaponAxes++;
   }
  }
 }
 // Rigid held assets use local +X as their muzzle direction. Correct only the
 // cosmetic mesh orientation; bot yaw, recoil, rays and hitboxes are untouched.
 if(typeof attachHeldMeshes==='function'){
  const originalAttach=attachHeldMeshes;
  attachHeldMeshes=function(...args){return markHeldMeshes(originalAttach.apply(this,args))};
 }
 // Auto-hop only on the real live-bot movement call: a low forward obstacle
 // must be hit while a 40-unit ray is clear. GRAPH jump edges remain authoritative.
 let activeBot=null;
 if(typeof botUpdate==='function'){
  const originalBotUpdate=botUpdate;
  botUpdate=function(b,dt){activeBot=b;try{return originalBotUpdate.call(this,b,dt)}finally{activeBot=null}};
 }
 if(global.BSP?.moveActor&&global.BSP.pointLineBlocked){
  const originalMoveActor=global.BSP.moveActor;
  global.BSP.moveActor=function(col,T,st,wish,dt,jump,crouching,actors){
   const b=activeBot;let auto=false,now=performance.now()/1000;
   if(b&&st&&Object.prototype.hasOwnProperty.call(st,'assistBrokenGlass')&&Object.prototype.hasOwnProperty.call(st,'climb')&&!jump&&!crouching&&st.on&&b.onGround!==false&&
      b.medium!=='water'&&b.medium!=='ladder'&&!b.routeJump&&!b.localRoute?.flight&&!b.routeLadder&&
      now>=(b.bs22AutoJumpUntil||0)&&Math.hypot(wish?.[0]||0,wish?.[1]||0)>.04&&col?.pointClip){
    const k=T.k,dir=tmpB.set(wish[0],0,wish[1]).normalize(),pos=new THREE.Vector3().fromArray(st.pos);
    const lowStart=pos.clone().add(new THREE.Vector3(0,-28*k,0)),lowEnd=lowStart.clone().addScaledVector(dir,26*k);
    const highStart=pos.clone().add(new THREE.Vector3(0,8*k,0)),highEnd=highStart.clone().addScaledVector(dir,26*k);
    try{const lowBlocked=global.BSP.pointLineBlocked(col,lowStart,lowEnd),highBlocked=global.BSP.pointLineBlocked(col,highStart,highEnd);auto=!!(lowBlocked&&!highBlocked)}catch(_){auto=false;}
    if(auto)st.jumpHeld=false;
   }
   const result=originalMoveActor.call(this,col,T,st,wish,dt,!!jump||auto,crouching,actors);
   if(auto&&result?.jumped){b.bs22AutoJumpUntil=now+1.15;stats.autoJumps++;}
   return result;
  };
 }
 // Phase11 already supplies native PB crouch clips, lower collision hulls and
 // ceiling checks. Add a spaced combat crouch roll so bots use those clips more visibly.
 if(typeof Phase11!=='undefined'&&Phase11?.decideBotCrouch){
  const originalDecide=Phase11.decideBotCrouch;
  Phase11.decideBotCrouch=function(b,hasEnemy,order,dt){
   const result=originalDecide.call(this,b,hasEnemy,order,dt);
   const now=performance.now()/1000;
   if(b&&hasEnemy&&!b.dead&&b.onGround!==false&&b.medium!=='water'&&b.medium!=='ladder'&&!b.routeJump&&!b.routeLadder&&now>=(b.bs22CombatCrouchAt||0)){
    b.bs22CombatCrouchAt=now+1.35;
    const difficulty=Phase10.config?.difficulty,probability=difficulty==='expert'?.42:difficulty==='hard'?.34:difficulty==='normal'?.24:.10;
    if(Math.random()<probability){b.crouchTarget=true;b.crouching=true;stats.autoCrouches++;}
   }
   return result;
  };
 }
 // ---- optional calibration panel: open the game with ?armcal=1 ----
 function mountCalibrationPanel(){
  if(params.get('armcal')!=='1'||document.getElementById('bsArmCal'))return;
  const box=document.createElement('div');box.id='bsArmCal';
  box.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;background:rgba(0,0,0,.72);color:#fff;font:11px/1.3 sans-serif;padding:6px 8px;border-radius:6px;max-width:46vw;max-height:55vh;overflow:auto;touch-action:pan-y';
  const rows=[['x','X cm',-30,30,.5],['y','Y cm',-30,30,.5],['z','Z cm',-30,30,.5],['yaw','Yaw °',-90,90,1],['pitch','Pitch °',-90,90,1],['roll','Roll °',-90,90,1],['scale','Skala %',50,150,1]];
  const title=document.createElement('div');title.style.fontWeight='700';title.textContent='Kalibrasi lengan PB';box.appendChild(title);
  const status=document.createElement('div');status.style.cssText='opacity:.8;margin:2px 0';box.appendChild(status);
  const sliders={};
  for(const [key,label,min,max,step] of rows){
   const line=document.createElement('label');line.style.cssText='display:flex;align-items:center;gap:4px;margin:1px 0';
   const name=document.createElement('span');name.style.width='46px';name.textContent=label;
   const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.style.cssText='flex:1;min-width:90px';
   const value=document.createElement('span');value.style.width='34px';value.style.textAlign='right';
   input.addEventListener('input',()=>{const cal=calFor(rigId||'default');cal[key]=Number(input.value);value.textContent=input.value;saveCal(rigId||'default')});
   sliders[key]={input,value};line.append(name,input,value);box.appendChild(line);
  }
  const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-top:4px';
  const reset=document.createElement('button'),toggle=document.createElement('button');reset.textContent='Reset';toggle.textContent='PB arm ON/OFF';
  for(const b of [reset,toggle])b.style.cssText='font-size:11px;padding:3px 6px';
  reset.onclick=()=>{calibrations.set(rigId||'default',{...DEFAULT_CAL});saveCal(rigId||'default')};
  toggle.onclick=()=>{try{global.localStorage.setItem('bsPbArms',enabled()?'0':'1')}catch(_){}};
  row.append(reset,toggle);box.appendChild(row);document.body.appendChild(box);
  setInterval(()=>{
   const cal=calFor(rigId||'default');status.textContent=(stats.armsActive?'AKTIF · ':'MATI · ')+stats.armsReason+(rigId?' · '+rigId:'');
   for(const key in sliders){if(document.activeElement!==sliders[key].input){sliders[key].input.value=cal[key];sliders[key].value.textContent=String(cal[key])}}
  },400);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountCalibrationPanel);else mountCalibrationPanel();
 if(typeof renderActiveViewmodel==='function'){
  const originalRender=renderActiveViewmodel;
  renderActiveViewmodel=function(){
   try{alignBotWeapons();updatePBArms()}
   catch(e){stats.errors++;try{hideAllArms('error: '+(e&&e.message||e))}catch(_){};if(stats.errors<4)console.warn('[22I.4] character presentation:',e);if(stats.errors>=6)global.BS_PB_ARMS=false}
   return originalRender.apply(this,arguments);
  };
 }
 global.BlockStrikeCharacterCombat22I3={version:VERSION,stats,status:()=>({active:stats.armsActive,reason:stats.armsReason,character:rigId}),refresh:()=>{disposeArms();restoreStockHands()},dispose:()=>{disposeArms();restoreStockHands()}};
})(window);
