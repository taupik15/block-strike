/* AR11.10.22I.4 — imported character first-person arms, generic for any imported mod.
 * The imported character's arm triangles are anchored to the LIVE stock viewmodel hand bones
 * every frame, so the arms follow the weapon's own animation without per-model constants.
 * Stock hand meshes (bodypart "rhand"/"lhand"/"hands") are hidden only while the imported arms
 * are built and anchored; otherwise the stock arms stay visible and the reason is kept in status.
 * Bot combat presentation below is unchanged from AR11.10.22I.3.1. */
(function (global) {
 'use strict';
 const VERSION='AR11.10.22I.4-CHARACTER-ARMS';
 const stats={armsBuilt:0,armsTriangles:0,stockHandMeshesHidden:0,anchorFrames:0,weaponAxes:0,autoJumps:0,autoCrouches:0,errors:0};
 const status={state:'idle',reason:'',anchor:''};
 let armRoot=null,armGroup=null,armMixer=null,armSource=null,armClip=null,armCurrentAction=null,armLastTime=0;
 const hiddenStockHands=[];
 const vForward=new THREE.Vector3(1,0,0),vDesired=new THREE.Vector3(),qParent=new THREE.Quaternion(),qBaseWorld=new THREE.Quaternion(),qDelta=new THREE.Quaternion(),qWorld=new THREE.Quaternion(),qInverse=new THREE.Quaternion();
 const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3();
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const boneName=b=>String(b?.name||'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
 const attributeValue=(a,i,k)=>k===0?a.getX(i):k===1?a.getY(i):k===2?a.getZ(i):a.getW(i);
 // Arm bones are the shoulder chain: anything whose ancestry (or itself) is a clavicle/upper arm.
 // Derived from the skeleton hierarchy, so any mod's naming variant works (Clavicle_Sub, knuckle, wrist...).
 const SHOULDER_RE=/Clavicle|UpperArm|Shoulder|bicep/i, TORSO_RE=/Spine|Neck|Head|Pelvis|Thigh|Calf|Foot|Toe|Butt|Hip/i;
 function armFlags(bones){
  return bones.map(b=>{
   if(TORSO_RE.test(boneName(b)))return false;
   for(let c=b;c;c=c.parent)if(SHOULDER_RE.test(boneName(c)))return true;
   return false;
  });
 }
 function armGeometry(source){
  const g=source.geometry,p=g?.getAttribute('position'),si=g?.getAttribute('skinIndex'),sw=g?.getAttribute('skinWeight');
  if(!p||!si||!sw||p.count<3)return null;
  const flags=armFlags(source.skeleton?.bones||[]),index=g.index,count=index?index.count:p.count,keep=[];
  const armWeight=i=>{let s=0;for(let k=0;k<4;k++){const w=attributeValue(sw,i,k);if(w>.02&&flags[attributeValue(si,i,k)|0])s+=w}return s};
  for(let i=0;i+2<count;i+=3){
   const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
   const wa=armWeight(a),wb=armWeight(b),wc=armWeight(c);
   // Majority rule keeps forearm/hand surfaces and the shoulder transition, not the torso.
   if((wa>.5)+(wb>.5)+(wc>.5)>=2||wa+wb+wc>=2.15)keep.push(a,b,c);
  }
  if(keep.length<3)return null;
  const out=new THREE.BufferGeometry();
  for(const name of ['position','normal','uv','uv2','skinIndex','skinWeight','color']){
   const src=g.getAttribute(name);if(!src)continue;
   const C=src.array.constructor,arr=new C(keep.length*src.itemSize);
   for(let i=0;i<keep.length;i++)for(let k=0;k<src.itemSize;k++)arr[i*src.itemSize+k]=attributeValue(src,keep[i],k);
   out.setAttribute(name,new THREE.BufferAttribute(arr,src.itemSize,src.normalized));
  }
  out.computeBoundingSphere();
  stats.armsTriangles+=keep.length/3;
  return out;
 }
 function disposeArms(){
  if(armMixer){try{armMixer.stopAllAction()}catch(_){}armMixer=null}
  if(armGroup){armGroup.parent?.remove(armGroup);armGroup.traverse(o=>{if(o.userData?.blockStrikePBArmGeometry)o.geometry?.dispose();if(o.isSkinnedMesh&&o.skeleton){try{o.skeleton.dispose()}catch(_){}}});armGroup=null}
  armRoot=null;armSource=null;armClip=null;armCurrentAction=null;armLastTime=0;
 }
 function activePlayerModel(){
  const id=playerAvatar?.userData?.characterVoice?.id;
  if(!id)return null;
  const model=(playerTeam==='CT'?CTC:TC)?.[id];
  return model?.scene&&Array.isArray(model.animations)?{id,model}:null;
 }
 function buildPBArms(source){
  if(!viewScene||!source?.scene)return false;
  const root=THREE.SkeletonUtils.clone(source.scene);root.name='BLOCKSTRIKE_IMPORTED_VIEW_ARMS';
  const targets=[];root.traverse(o=>{if(o.isMesh)o.visible=false;if(o.isSkinnedMesh&&o.geometry)targets.push(o)});
  const generated=[];
  for(const o of targets){
   const geometry=armGeometry(o);if(!geometry)continue;
   const m=new THREE.SkinnedMesh(geometry,o.material);
   m.name='PB_VIEW_ARM_'+generated.length;m.userData.blockStrikePBArmGeometry=true;
   m.frustumCulled=false;m.castShadow=false;m.receiveShadow=false;m.renderOrder=3;
   m.bind(o.skeleton,o.bindMatrix);m.bindMode=o.bindMode||'attached';generated.push(m);
  }
  if(!generated.length){
   root.traverse(o=>{if(o.isSkinnedMesh){try{o.skeleton?.dispose()}catch(_){}}});
   status.state='no-arm-geometry';status.reason='model import tidak punya segitiga lengan (cek nama tulang Clavicle/UpperArm)';return false;
  }
  generated.forEach(m=>root.add(m));
  // The clone keeps the MDL orientation and character scale; placement is done per frame by armGroup.
  root.position.set(0,0,0);root.visible=true;root.userData.blockStrikePBViewArms=true;
  const group=new THREE.Group();group.name='BLOCKSTRIKE_PB_ARM_ANCHOR';group.add(root);
  viewScene.add(group);
  armGroup=group;armRoot=root;armSource=source;armMixer=new THREE.AnimationMixer(root);
  stats.armsBuilt+=1;return true;
 }
 const familyFor=id=>{
  if(id==='knife')return 'knife';if(id==='elite')return 'onehanded';
  if(id==='m3'||id==='xm1014')return 'shotgun';if(id==='m249')return 'm249';
  if(id==='ak47')return 'ak47';if(id==='mp5')return 'mp5';
  if(['m4a1','famas','galil','aug','sg552'].includes(id))return 'carbine';
  if(['usp','glock18','p228','deagle','fiveseven'].includes(id))return 'onehanded';
  return 'rifle';
 };
 function chooseArmClip(){
  const model=activePlayerModel();if(!model||!armRoot||!armMixer)return;
  const state=vm?.userData?.weaponAnimation,id=cur(),prefix=Phase9?.crouching?'crouch_':'ref_',family=familyFor(id);
  const kind=state?.currentKind||'idle';let verb=kind==='fire'?'shoot':kind==='reload'?'reload':'aim';
  const names=[prefix+verb+'_'+family,'ref_'+verb+'_'+family,prefix+'aim_rifle','ref_aim_rifle'];
  const clips=model.model.animations||[];let clip=clips.find(c=>names.includes(c.name));
  if(!clip&&verb!=='aim')clip=clips.find(c=>[prefix+'aim_'+family,'ref_aim_'+family,'ref_aim_rifle'].includes(c.name));
  if(!clip){status.clip='none';return;}
  const oneShot=verb==='shoot'||verb==='reload';
  const key=clip.name+':'+(oneShot?'once':'loop');if(key===armClip)return;
  const action=armMixer.clipAction(clip);action.reset();
  if(oneShot){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}
  else{action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false;}
  action.setEffectiveWeight(1);action.play();
  if(armCurrentAction&&armCurrentAction!==action)armCurrentAction.fadeOut(.08);
  action.fadeIn(.08);armCurrentAction=action;armClip=key;status.clip=clip.name;
 }
 // Right/left hand bones by name. Covers "Bone_Righthand", "Right Hand", "Bip01 R Hand" (galil, famas, shield),
 // and sanitized imported names "Bip01_R_Hand".
 const R_HAND_RE=/(^|\s)R(ight)?\s?Hand$|Righthand$/i, L_HAND_RE=/(^|\s)L(eft)?\s?Hand$|Lefthand$/i;
 const HAND_PART_RE=/^(r|l)?hands?$/i;
 let stockCache={vm:null,anchors:null};
 // Stock viewmodel hand anchors. Prefer the real hand bone (it moves with the weapon's own animation);
 // fall back to the bind-pose centre of the hand mesh if the bone is not named in a known way.
 function stockHandAnchors(vmObj){
  if(!vmObj)return null;
  if(stockCache.vm===vmObj&&stockCache.anchors)return stockCache.anchors;
  const handMeshes=[];vmObj.traverse(o=>{if(o.isSkinnedMesh&&HAND_PART_RE.test(String(o.userData?.mdlPart||'')))handMeshes.push(o)});
  if(!handMeshes.length)return null;
  const out={R:null,L:null,source:''};
  for(const m of handMeshes)for(const b of m.skeleton?.bones||[]){
   const n=String(b.userData?.mdlName||b.name||'');
   if(!out.R&&R_HAND_RE.test(n))out.R=b;
   if(!out.L&&L_HAND_RE.test(n))out.L=b;
  }
  if(out.R||out.L){out.source='bone'}
  if(!out.R||!out.L){
   for(const m of handMeshes){
    const part=String(m.userData.mdlPart||'').toLowerCase();
    const side=part.startsWith('r')&&!part.startsWith('l')?'R':part.startsWith('l')?'L':null;
    if(!side||out[side])continue;
    if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();
    const c=new THREE.Vector3();m.geometry.boundingBox.getCenter(c);m.updateWorldMatrix(true,false);c.applyMatrix4(m.matrixWorld);
    out[side]=c;out.source=out.source?out.source+'+bbox':'bbox';
   }
  }
  if(!out.R&&!out.L)return null;
  stockCache={vm:vmObj,anchors:out};
  return out;
 }
 function pbHandAnchors(root){
  let R=null,L=null;
  root.traverse(o=>{if(!o.isBone)return;const n=boneName(o);if(!R&&/(^|\s)R\s?Hand$/i.test(n))R=o;if(!L&&/(^|\s)L\s?Hand$/i.test(n))L=o;});
  return {R,L};
 }
 const pointOf=(a,scene)=>{
  const p=a.isObject3D?a.getWorldPosition(new THREE.Vector3()):a.clone();
  return scene.worldToLocal(p);
 };
 // Per-frame placement: the imported arm group is a similarity (uniform scale + rotation + translation)
 // that maps the imported right hand onto the stock right hand, and orients the hand-to-hand line
 // onto the stock hand-to-hand line. Scale is the viewmodel scale (GoldSrc profile.globalScale), so the
 // imported arms are sized exactly like the stock viewmodel arms. No per-model constants are used.
 function placeArms(vmObj){
  if(!armRoot||!armGroup||!viewScene){status.reason='arm root missing';return false;}
  const stock=stockHandAnchors(vmObj);
  if(!stock?.R){status.state='no-stock-hand';status.reason='viewmodel tidak punya tulang/mesh tangan';return false;}
  const pb=pbHandAnchors(armRoot);
  if(!pb.R){status.state='no-pb-hand';status.reason='model import tidak punya tulang "R Hand"';return false;}
  viewScene.updateMatrixWorld(true);
  armGroup.position.set(0,0,0);armGroup.quaternion.identity();armGroup.scale.setScalar(1);armGroup.updateMatrixWorld(true);
  const scale=(GoldSrcMDL10.profile?.globalScale||.02)/Math.max(1e-6,armRoot.scale.x||.028);
  const Rp=pointOf(pb.R,viewScene),Rs=pointOf(stock.R,viewScene);
  const q=new THREE.Quaternion();
  if(pb.L&&stock.L){
   const dp=pointOf(pb.L,viewScene).sub(Rp),ds=pointOf(stock.L,viewScene).sub(Rs);
   if(dp.lengthSq()>1e-10&&ds.lengthSq()>1e-10)q.setFromUnitVectors(dp.normalize(),ds.normalize());
  }
  const pos=Rs.clone().sub(Rp.clone().applyQuaternion(q).multiplyScalar(scale));
  armGroup.position.copy(pos);armGroup.quaternion.copy(q);armGroup.scale.setScalar(scale);armGroup.updateMatrixWorld(true);
  stats.anchorFrames++;status.state='anchored';status.reason='';status.anchor=stock.source+(pb.L&&stock.L?'+2hand':'+1hand');
  return true;
 }
 function hideStockHands(vmObj){
  if(!vmObj)return 0;
  vmObj.traverse(o=>{
   if(!o.isSkinnedMesh||!HAND_PART_RE.test(String(o.userData?.mdlPart||''))||!o.visible)return;
   hiddenStockHands.push(o);o.visible=false;stats.stockHandMeshesHidden++;
  });
  return hiddenStockHands.length;
 }
 function restoreStockHands(){
  for(const m of hiddenStockHands.splice(0))m.visible=true;
 }
 function updatePBArms(){
  const now=performance.now(),dt=armLastTime?clamp((now-armLastTime)/1000,0,.08):0;armLastTime=now;
  if(!viewScene||!running||Phase13?.isSpectating?.()){if(armGroup)armGroup.visible=false;restoreStockHands();return false;}
  const active=activePlayerModel();
  if(!active){disposeArms();restoreStockHands();status.state='no-model';status.reason='karakter import belum aktif';return false;}
  if(armSource!==active.model||!armRoot){
   disposeArms();
   try{if(!buildPBArms(active.model)){restoreStockHands();return false}}
   catch(e){stats.errors++;status.state='build-error';status.reason=String(e?.message||e);restoreStockHands();return false}
  }
  chooseArmClip();
  armMixer?.update(dt);
  let ok=false;
  try{ok=placeArms(vm)}catch(e){stats.errors++;status.state='place-error';status.reason=String(e?.message||e);ok=false}
  armGroup.visible=ok;
  if(ok)hideStockHands(vm);else restoreStockHands();
  return ok;
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
 if(typeof renderActiveViewmodel==='function'){
  const originalRender=renderActiveViewmodel;
  renderActiveViewmodel=function(){
   try{alignBotWeapons();updatePBArms()}
   catch(e){stats.errors++;status.state='error';status.reason=String(e?.message||e);if(stats.errors<4)console.warn('[22I.4] character arms:',e)}
   return originalRender.apply(this,arguments);
  };
 }
 global.BlockStrikeCharacterCombat22I3={version:VERSION,stats,status,refresh:()=>{disposeArms();restoreStockHands();stockCache={vm:null,anchors:null}},dispose:()=>{disposeArms();restoreStockHands();stockCache={vm:null,anchors:null}}};
 global.BlockStrikeCharacterArms=global.BlockStrikeCharacterCombat22I3;
})(window);
