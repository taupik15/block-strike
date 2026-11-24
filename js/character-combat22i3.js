/* AR11.10.22I.3 — imported character hands, held-weapon axis calibration and bot mobility. */
(function (global) {
 'use strict';
 const VERSION='AR11.10.22I.3.1-CHARACTER-AI-HANDS';
 const stats={armsBuilt:0,armsTriangles:0,stockArmGroupsHidden:0,weaponAxes:0,autoJumps:0,autoCrouches:0,errors:0};
 let armRoot=null,armMixer=null,armSource=null,armClip=null,armCurrentAction=null,armLastTime=0;
 const vForward=new THREE.Vector3(1,0,0),vDesired=new THREE.Vector3(),qParent=new THREE.Quaternion(),qBaseWorld=new THREE.Quaternion(),qDelta=new THREE.Quaternion(),qWorld=new THREE.Quaternion(),qInverse=new THREE.Quaternion();
 const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3();
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const boneName=b=>String(b?.name||'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
 const armBone=b=>/^(?:Bip01 [LR] (?:Clavicle|UpperArm|Forearm|Hand|Finger|Thumb)|[LR] UpperArm Sub|Bip01 [LR] Clavicle Sub|-- [LR] (?:wrist|Shoulder inside))/i.test(boneName(b));
 const attributeValue=(a,i,k)=>k===0?a.getX(i):k===1?a.getY(i):k===2?a.getZ(i):a.getW(i);
 function armGeometry(source){
  const g=source.geometry,p=g?.getAttribute('position'),si=g?.getAttribute('skinIndex'),sw=g?.getAttribute('skinWeight');
  if(!p||!si||!sw||p.count<3)return null;
  const bones=source.skeleton?.bones||[],arm=bones.map(armBone),index=g.index,indices=[];
  const vertexArm=i=>{let score=0;for(let k=0;k<4;k++){const w=attributeValue(sw,i,k);if(w>.02&&arm[attributeValue(si,i,k)|0])score+=w;}return score};
  const count=index?index.count:p.count;
  for(let i=0;i+2<count;i+=3){
   const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
   const wa=vertexArm(a),wb=vertexArm(b),wc=vertexArm(c);
   // The imported PB MDLs use rigid single-bone vertex weights. A 2-of-3
   // majority keeps arm surfaces and shoulder transitions, not the torso.
   if((wa>.5)+(wb>.5)+(wc>.5)>=2 || wa+wb+wc>=2.15)indices.push(a,b,c);
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
 function disposeArms(){
  if(armMixer){try{armMixer.stopAllAction()}catch(_){}armMixer=null}
  if(armRoot){armRoot.parent?.remove(armRoot);const skeletons=new Set();armRoot.traverse(o=>{if(o.userData?.blockStrikePBArmGeometry)o.geometry?.dispose();if(o.isSkinnedMesh&&o.skeleton)skeletons.add(o.skeleton)});skeletons.forEach(s=>{try{s.dispose()}catch(_){}});armRoot=null}
  armSource=null;armClip=null;armCurrentAction=null;armLastTime=0;
 }
 // Three r128 GLTFLoader creates one SkinnedMesh per glTF primitive.
 // The shipped GoldSrc viewmodels were inspected from their GLB primitive order:
 // hand meshes are a leading block; later primitives are the gun/shield itself.
 const stockArmMeshCount={
  ak47:6,aug:6,awp:6,c4:6,deagle:6,elite:6,famas:3,fiveseven:6,flashbang:6,g3sg1:6,
  galil:3,glock18:6,hegrenade:6,knife:3,knife_r:1,m249:6,m3:6,m4a1:6,mac10:6,mp5:6,
  p228:6,p90:6,scout:6,sg550:6,sg552:6,smokegrenade:6,tmp:6,ump45:6,usp:6,xm1014:6,
  shield_deagle:6,shield_fiveseven:5,shield_flashbang:6,shield_glock18:7,shield_hegrenade:6,
  shield_knife:4,shield_p228:6,shield_r:5,shield_smokegrenade:6,shield_usp:6
 };
 let stockArmViewmodel=null;const stockArmVisibilityRecords=[];
 function restoreStockViewmodelArms(){
  for(const record of stockArmVisibilityRecords)if(record.mesh)record.mesh.visible=record.visible;
  stockArmVisibilityRecords.length=0;stockArmViewmodel=null;
 }
 function syncStockViewmodelArms(hide){
  if(stockArmViewmodel!==vm){restoreStockViewmodelArms();stockArmViewmodel=vm||null;}
  if(!hide){restoreStockViewmodelArms();return 0;}
  if(!vm||vm.userData?.nativeMdl)return 0;
  const asset=vm.userData?.viewAsset||'',count=stockArmMeshCount[asset]||0;
  if(!count)return 0;
  // Imported weapon packs own their own presentation. Do not rewrite a mod's
  // author-authored viewmodel; filter only the shipped GoldSrc GLB layouts.
  if(typeof WeaponImport!=='undefined'&&WeaponImport.active?.(asset))return 0;
  if(stockArmVisibilityRecords.length)return stockArmVisibilityRecords.length;
  const primitives=[];
  vm.traverse(mesh=>{
   const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
   if(mesh.isMesh&&/^GoldSrcTexture_\d+$/.test(material?.name||''))primitives.push(mesh);
  });
  // Fail open if the expected primitive layout is not present. The weapon must
  // remain visible rather than risk hiding a grip or the shield itself.
  if(primitives.length<count+1)return 0;
  for(let i=0;i<count;i++){
   const mesh=primitives[i];stockArmVisibilityRecords.push({mesh,visible:mesh.visible});mesh.visible=false;
  }
  stats.stockArmGroupsHidden+=stockArmVisibilityRecords.length;return stockArmVisibilityRecords.length;
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
  const generated=[];
  root.traverse(o=>{
   if(o.isMesh)o.visible=false;
   if(!o.isSkinnedMesh||!o.geometry)return;
   const geometry=armGeometry(o);
   if(!geometry)return;
   const m=new THREE.SkinnedMesh(geometry,o.material);
   m.name='PB_VIEW_ARM_'+generated.length;m.userData.blockStrikePBArmGeometry=true;
   m.frustumCulled=false;m.castShadow=false;m.receiveShadow=false;m.renderOrder=3;
   m.bind(o.skeleton,o.bindMatrix);m.bindMode=o.bindMode||'attached';root.add(m);generated.push(m);
  });
  if(!generated.length){
   root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton?.dispose()});
   return false;
  }
  // The imported character root is translated from the world floor into the
  // first-person camera volume; native GoldSrc orientation/scale are retained.
  root.position.set(0,-.54,-.18);root.visible=true;root.userData.blockStrikePBViewArms=true;
  root.updateMatrixWorld(true);viewScene.add(root);
  armRoot=root;armSource=source;armMixer=new THREE.AnimationMixer(root);
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
  const names=[prefix+verb+'_'+family, 'ref_'+verb+'_'+family, prefix+'aim_rifle','ref_aim_rifle'];
  const clips=model.model.animations||[];let clip=clips.find(c=>names.includes(c.name));
  if(!clip&&verb!=='aim')clip=clips.find(c=>[prefix+'aim_'+family,'ref_aim_'+family,'ref_aim_rifle'].includes(c.name));
  if(!clip)return;
  const oneShot=verb==='shoot'||verb==='reload';
  const key=clip.name+':'+(oneShot?'once':'loop');if(key===armClip)return;
  const action=armMixer.clipAction(clip);action.reset();
  if(oneShot){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}
  else{action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false;}
  action.setEffectiveWeight(1);action.play();
  if(armCurrentAction&&armCurrentAction!==action)armCurrentAction.fadeOut(.08);
  action.fadeIn(.08);armCurrentAction=action;armClip=key;
 }
 function updatePBArms(dt){
  if(!viewScene||!running||Phase13?.isSpectating?.()){
   if(armRoot)armRoot.visible=false;syncStockViewmodelArms(false);return false;
  }
  const active=activePlayerModel();
  if(!active){if(armRoot)disposeArms();syncStockViewmodelArms(false);return false;}
  if(armSource!==active.model||!armRoot){disposeArms();try{buildPBArms(active.model)}catch(e){stats.errors++;console.warn('[22I.3.1] PB first-person arms:',e)}}
  if(!armRoot){syncStockViewmodelArms(false);return false;}
  armRoot.visible=true;armRoot.position.y=-.54-(Phase9?.crouching?.12:0);
  chooseArmClip();
  const t=performance.now(),delta=armLastTime?clamp((t-armLastTime)/1000,0,.08):0;armLastTime=t;
  armMixer?.update(delta);return true;
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
   try{alignBotWeapons();const pbArms=updatePBArms(0);syncStockViewmodelArms(pbArms)}catch(e){stats.errors++;if(stats.errors<4)console.warn('[22I.3.1] character combat presentation:',e)}
   return originalRender.apply(this,arguments);
  };
 }
 global.BlockStrikeCharacterCombat22I3={version:VERSION,stats,refresh:()=>{if(armRoot)disposeArms();syncStockViewmodelArms(false)},dispose:()=>{disposeArms();syncStockViewmodelArms(false)},syncStockViewmodelArms};
})(window);
