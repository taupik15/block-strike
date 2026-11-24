/* AR11.10.22I.6 — imported character first-person arms (rotation match + scale bias), generic for any imported mod.
 * Design:
 *  - Only forearm+hand triangles of the imported character are used (like the stock viewmodel), one skeleton
 *    clone per side so each hand can be pinned to its own stock hand.
 *  - Stock viewmodels are authored left-handed and mirrored for right-handed play, so the stock "Righthand"
 *    bone may appear on the LEFT of the screen. Roles are therefore assigned by on-screen position, not name.
 *  - Each imported hand is translated onto the matching LIVE stock hand bone every frame (viewmodel scale, no
 *    per-model constants). Stock hand meshes (bodypart rhand/lhand/hands) are hidden only while imported arms
 *    are anchored; otherwise stock arms stay visible.
 *  - A small on-screen debug line (ARM_DEBUG) reports state, because iPhone has no console.
 * Bot combat presentation below is unchanged from AR11.10.22I.3.1. */
(function (global) {
 'use strict';
 const VERSION='AR11.10.22I.6-CHARACTER-ARMS';
 const ARM_DEBUG=true;
 const stats={armsBuilt:0,armsTriangles:0,stockHandMeshesHidden:0,anchorFrames:0,weaponAxes:0,autoJumps:0,autoCrouches:0,errors:0};
 const status={state:'idle',reason:'',anchor:'',clip:'',map:'',hands:0,hidden:0};
 let arms=[],armSource=null,armLastTime=0;
 const hiddenStockHands=new Set();
 const vForward=new THREE.Vector3(1,0,0),vDesired=new THREE.Vector3(),qParent=new THREE.Quaternion(),qBaseWorld=new THREE.Quaternion(),qDelta=new THREE.Quaternion(),qWorld=new THREE.Quaternion(),qInverse=new THREE.Quaternion();
 const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3();
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const boneName=b=>String(b?.name||'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
 const attributeValue=(a,i,k)=>k===0?a.getX(i):k===1?a.getY(i):k===2?a.getZ(i):a.getW(i);
 // --- bone classification (hierarchy based, so any mod's naming works) ---
 const SHOULDER_RE=/Clavicle|UpperArm|Shoulder|bicep/i,FOREARM_RE=/Forearm|Elbow|wrist|knuckle/i,TORSO_RE=/Spine|Neck|Head|Pelvis|Thigh|Calf|Foot|Toe|Butt|Hip/i;
 const chainHas=(b,re)=>{for(let c=b;c;c=c.parent)if(re.test(boneName(c)))return true;return false};
 function sideOf(b){
  for(let c=b;c;c=c.parent){const n=boneName(c);if(/(^|\s)R(ight)?(\s|$)/i.test(n))return 'R';if(/(^|\s)L(eft)?(\s|$)/i.test(n))return 'L';}
  return null;
 }
 const armFlags=(bones,side,re)=>bones.map(b=>!TORSO_RE.test(boneName(b))&&sideOf(b)===side&&chainHas(b,re));
 function armGeometry(source,side,re){
  const g=source.geometry,p=g?.getAttribute('position'),si=g?.getAttribute('skinIndex'),sw=g?.getAttribute('skinWeight');
  if(!p||!si||!sw||p.count<3)return null;
  const flags=armFlags(source.skeleton?.bones||[],side,re),index=g.index,count=index?index.count:p.count,keep=[];
  const armWeight=i=>{let s=0;for(let k=0;k<4;k++){const w=attributeValue(sw,i,k);if(w>.02&&flags[attributeValue(si,i,k)|0])s+=w}return s};
  for(let i=0;i+2<count;i+=3){
   const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
   const wa=armWeight(a),wb=armWeight(b),wc=armWeight(c);
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
  return out;
 }
 function disposeArms(){
  for(const sd of arms){
   try{sd.mixer.stopAllAction()}catch(_){}
   sd.group.parent?.remove(sd.group);
   sd.group.traverse(o=>{if(o.userData?.blockStrikePBArmGeometry)o.geometry?.dispose();if(o.isSkinnedMesh&&o.skeleton){try{o.skeleton.dispose()}catch(_){}}});
  }
  arms=[];armSource=null;armLastTime=0;
 }
 function activePlayerModel(){
  const id=playerAvatar?.userData?.characterVoice?.id;
  if(!id)return null;
  const model=(playerTeam==='CT'?CTC:TC)?.[id];
  return model?.scene&&Array.isArray(model.animations)?{id,model}:null;
 }
 const pbHand=(root,side)=>{
  let h=null;
  // Prefer exact "R Hand" / "L Hand" (with optional Bip01 prefix), then fall back to any bone containing Hand on that side
  const preferred=side==='R'?/(Bip0?1\s*)?R(ight)?\s*Hand$/i:/(Bip0?1\s*)?L(eft)?\s*Hand$/i;
  const fallback=side==='R'?/R(ight)?.*Hand/i:/L(eft)?.*Hand/i;
  root.traverse(o=>{
    if(h||!o.isBone)return;
    const n=boneName(o);
    if(preferred.test(n))h=o;
  });
  if(!h)root.traverse(o=>{
    if(h||!o.isBone)return;
    const n=boneName(o);
    if(fallback.test(n)&&sideOf(o)===side)h=o;
  });
  return h;
};
 // One imported skeleton clone per side; only that side's forearm/hand triangles are kept.
 function buildSide(source,side){
  const root=THREE.SkeletonUtils.clone(source.scene);root.name='BLOCKSTRIKE_IMPORTED_VIEW_ARM_'+side;
  const targets=[];root.traverse(o=>{if(o.isMesh)o.visible=false;if(o.isSkinnedMesh&&o.geometry)targets.push(o)});
  const make=re=>{const out=[];let tris=0;for(const o of targets){const geometry=armGeometry(o,side,re);if(!geometry)continue;const m=new THREE.SkinnedMesh(geometry,o.material);m.name='PB_VIEW_ARM_'+side+out.length;m.userData.blockStrikePBArmGeometry=true;m.frustumCulled=false;m.castShadow=false;m.receiveShadow=false;m.renderOrder=3;m.bind(o.skeleton,o.bindMatrix);m.bindMode=o.bindMode||'attached';out.push(m);tris+=geometry.getAttribute('position').count/3;}return {out,tris}};
  let made=make(FOREARM_RE),mode='forearm';
  if(!made.out.length){made=make(SHOULDER_RE);mode='full-arm'}
  const hand=pbHand(root,side);
  if(!made.out.length||!hand){root.traverse(o=>{if(o.isSkinnedMesh){try{o.skeleton?.dispose()}catch(_){}}});return null;}
  made.out.forEach(m=>root.add(m));
  root.position.set(0,0,0);root.visible=true;
  const group=new THREE.Group();group.name='BLOCKSTRIKE_PB_ARM_ANCHOR_'+side;group.add(root);viewScene.add(group);
  stats.armsTriangles+=made.tris;
  return {side,root,group,hand,mixer:new THREE.AnimationMixer(root),clipKey:'',action:null,tris:Math.round(made.tris),mode};
 }
 function buildArms(source){
  if(!viewScene||!source?.scene)return false;
  const built=['R','L'].map(s=>buildSide(source,s)).filter(Boolean);
  if(!built.length){status.state='no-arm-geometry';status.reason='tidak ada segitiga lengan/tulang tangan pada model import';return false;}
  arms=built;armSource=source;stats.armsBuilt+=1;return true;
 }
 const familyFor=id=>{
  if(id==='knife'||id==='knife_r')return 'knife';
  if(id==='elite')return 'dualpistols_1';
  if(id==='m3'||id==='xm1014')return 'shotgun';
  if(id==='m249')return 'm249';
  if(id==='ak47')return 'ak47';
  if(id==='mp5')return 'mp5';
  if(['m4a1','famas','galil','aug','sg552'].includes(id))return 'carbine';
  if(['usp','glock18','p228','deagle','fiveseven'].includes(id))return 'onehanded';
  if(id==='awp'||id==='scout'||id==='g3sg1'||id==='sg550')return 'rifle';
  return 'rifle';
 };
 function chooseArmClip(){
  const model=activePlayerModel();if(!model||!arms.length)return;
  const state=vm?.userData?.weaponAnimation,id=cur(),prefix=Phase9?.crouching?'crouch_':'ref_',family=familyFor(id);
  const kind=state?.currentKind||'idle';
  // Map engine state → sequence verb used by CS/PB player models
  let verb='aim';
  if(kind==='fire'||kind==='shoot')verb='shoot';
  else if(kind==='reload')verb='reload';
  else if(kind==='draw'||kind==='holster')verb='aim';
  // Prefer exact family, then generic rifle, then idle1 as last resort
  const names=[
    prefix+verb+'_'+family,
    'ref_'+verb+'_'+family,
    prefix+'aim_'+family,
    'ref_aim_'+family,
    prefix+'aim_rifle',
    'ref_aim_rifle',
    'ref_aim_onehanded',
    'idle1',
    'crouch_idle'
  ];
  const clips=model.model.animations||[];
  let clip=null;
  for(const n of names){clip=clips.find(c=>c.name===n);if(clip)break;}
  if(!clip){status.clip='none';return;}
  const oneShot=verb==='shoot'||verb==='reload';
  const key=clip.name+':'+(oneShot?'once':'loop');
  for(const sd of arms){
   if(sd.clipKey===key)continue;
   const action=sd.mixer.clipAction(clip);action.reset();
   if(oneShot){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}
   else{action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false;}
   action.setEffectiveWeight(1);action.play();
   if(sd.action&&sd.action!==action)sd.action.fadeOut(.08);
   action.fadeIn(.08);sd.action=action;sd.clipKey=key;
  }
  status.clip=clip.name;
 }
 // --- stock viewmodel hands ---
 const R_HAND_RE=/(^|\s)R(ight)?\s?Hand$|Righthand$/i,L_HAND_RE=/(^|\s)L(eft)?\s?Hand$|Lefthand$/i,HAND_PART_RE=/^(r|l)?hands?$/i;
 let stockCache={vm:null,anchors:null};
 function stockHandMeshes(vmObj){const out=[];vmObj?.traverse(o=>{if(o.isSkinnedMesh&&HAND_PART_RE.test(String(o.userData?.mdlPart||'')))out.push(o)});return out}
 function stockHandAnchors(vmObj){
  if(!vmObj)return null;
  if(stockCache.vm===vmObj&&stockCache.anchors)return stockCache.anchors;
  const meshes=stockHandMeshes(vmObj);status.hands=meshes.length;
  if(!meshes.length)return null;
  const out={R:null,L:null,source:''};
  for(const m of meshes)for(const b of m.skeleton?.bones||[]){
   const n=String(b.userData?.mdlName||b.name||'');
   if(!out.R&&R_HAND_RE.test(n))out.R=b;
   if(!out.L&&L_HAND_RE.test(n))out.L=b;
  }
  if(out.R||out.L)out.source='bone';
  if(!out.R||!out.L){
   for(const m of meshes){
    const part=String(m.userData.mdlPart||'').toLowerCase(),side=part.startsWith('r')?'R':part.startsWith('l')?'L':null;
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
 const localPoint=(a,scene)=>{const p=a.isObject3D?a.getWorldPosition(new THREE.Vector3()):a.clone();return scene.worldToLocal(p)};
 // Per-frame placement: translate each imported hand onto a stock hand. Stock hands are matched to
 // imported sides by camera-space X (screen-right hand = imported right hand), which stays correct
 // for mirrored (left-authored) viewmodels and for a left-handed setting.
 function placeArms(vmObj){
  const stock=stockHandAnchors(vmObj);
  if(!stock){status.state='no-stock-hand';status.reason='viewmodel ini tidak punya mesh tangan terpisah';return false;}
  viewScene.updateMatrixWorld(true);viewCamera?.updateMatrixWorld(true);
  // Prefer live bone objects so we can match both position AND rotation.
  // Fall back to bbox centers only when bones are missing.
  const boneR = stock.R && stock.R.isObject3D ? stock.R : null;
  const boneL = stock.L && stock.L.isObject3D ? stock.L : null;
  const pts=[];
  if(stock.R) pts.push(localPoint(stock.R,viewScene));
  if(stock.L) pts.push(localPoint(stock.L,viewScene));
  const camX=p=>viewCamera?viewCamera.worldToLocal(viewScene.localToWorld(p.clone())).x:p.x;
  // Map stock anchors to imported sides by camera-space X (screen-right = imported R)
  let targetPos={R:null,L:null}, targetBone={R:null,L:null};
  if(pts.length===2){
    const [a,b]=pts;
    if(camX(a)>=camX(b)){targetPos.R=a;targetPos.L=b;targetBone.R=boneR||boneL;targetBone.L=boneL||boneR;}
    else{targetPos.R=b;targetPos.L=a;targetBone.R=boneL||boneR;targetBone.L=boneR||boneL;}
  }else if(pts.length===1){
    const side=camX(pts[0])>=0?'R':'L';
    targetPos[side]=pts[0];
    targetBone[side]=boneR||boneL;
  }
  // Scale: keep character arm roughly the same visual size as stock hands.
  // PB / CS player models are authored at ~1.0 unit scale; viewmodels use globalScale 0.02.
  const scaleBase=GoldSrcMDL10.profile?.globalScale||.02;
  // Slightly larger than pure ratio so PB arms don't look tiny on mobile FOV.
  const SCALE_BIAS=1.12;
  let placed=0;
  for(const sd of arms){
    const t=targetPos[sd.side];
    const tb=targetBone[sd.side];
    sd.group.visible=!!t;
    if(!t)continue;

    // Reset then re-apply
    sd.group.position.set(0,0,0);
    sd.group.quaternion.identity();
    sd.group.scale.setScalar(1);
    sd.root.updateMatrixWorld(true);

    // Current world transform of the imported hand bone
    const handWorldPos=new THREE.Vector3();
    const handWorldQuat=new THREE.Quaternion();
    sd.hand.getWorldPosition(handWorldPos);
    sd.hand.getWorldQuaternion(handWorldQuat);

    // Desired world transform = stock hand bone (or bbox center + identity if no bone)
    const desiredPos=viewScene.localToWorld(t.clone());
    let desiredQuat=new THREE.Quaternion();
    if(tb && tb.isObject3D){
      tb.getWorldQuaternion(desiredQuat);
    }else{
      // No bone orientation available — keep imported hand orientation relative to camera
      desiredQuat.copy(handWorldQuat);
    }

    // Delta that takes imported hand -> stock hand
    // position: desired = deltaPos + scale * R * localHand
    // We apply transform on the group that contains the root.
    const s=scaleBase*SCALE_BIAS/Math.max(1e-6, sd.root.scale.x||0.028);

    // Rotation delta in world space: desiredQuat = deltaQuat * handWorldQuat
    const deltaQuat=desiredQuat.clone().multiply(handWorldQuat.clone().invert());

    // Apply rotation first (around current hand), then translate, then scale
    sd.group.quaternion.copy(deltaQuat);
    sd.group.scale.setScalar(s);
    sd.group.updateMatrixWorld(true);

    // After rotation+scale, hand is at a new world position — correct translation
    const newHandWorld=new THREE.Vector3();
    sd.hand.getWorldPosition(newHandWorld);
    const deltaPos=desiredPos.clone().sub(newHandWorld);
    // Convert world delta into viewScene local space for the group
    const parent=sd.group.parent;
    if(parent){
      parent.updateMatrixWorld(true);
      const inv=new THREE.Matrix4().copy(parent.matrixWorld).invert();
      deltaPos.applyMatrix4(inv);
    }
    sd.group.position.add(deltaPos);
    sd.group.updateMatrixWorld(true);
    placed++;
  }
  if(!placed){status.state='no-target';status.reason='tidak ada pasangan tangan';return false;}
  stats.anchorFrames++;status.state='anchored';status.reason='';status.anchor=stock.source+'/'+pts.length+'hand+rot';
  status.map='R@'+(targetPos.R?camX(targetPos.R).toFixed(2):'-')+' L@'+(targetPos.L?camX(targetPos.L).toFixed(2):'-');
  return true;
}

 function hideStockHands(vmObj){for(const m of stockHandMeshes(vmObj)){if(m.visible){m.visible=false;hiddenStockHands.add(m);stats.stockHandMeshesHidden++}}status.hidden=hiddenStockHands.size}
 function restoreStockHands(){for(const m of hiddenStockHands)m.visible=true;hiddenStockHands.clear();status.hidden=0}
 function setArmsVisible(v){for(const sd of arms)sd.group.visible=v}
 // --- on-screen debug (iPhone has no console) ---
 let dbgEl=null,dbgAt=0;
 function debugLine(){
  if(!ARM_DEBUG||typeof document==='undefined'||!document.body)return;
  const now=performance.now();if(now-dbgAt<400)return;dbgAt=now;
  if(!dbgEl){dbgEl=document.createElement('div');dbgEl.id='arm-debug';dbgEl.style.cssText='position:fixed;left:6px;top:50%;z-index:99999;pointer-events:none;font:10px/1.25 monospace;color:#9f9;background:rgba(0,0,0,.55);padding:2px 5px;border-radius:3px;max-width:44vw;white-space:pre-wrap';document.body.appendChild(dbgEl)}
  const sd=arms.map(a=>a.side+':'+a.tris+a.mode[0]).join(' ')||'-';
  dbgEl.textContent='ARM '+VERSION.slice(9)+'\n'+status.state+(status.reason?' ('+status.reason+')':'')+'\nvm:'+(vm?.userData?.viewAsset||'-')+(vm?.userData?.nativeMdl?' mdl':' glb')+' hands:'+status.hands+' hid:'+status.hidden+'\n'+sd+' '+status.anchor+' '+status.map+'\nclip:'+status.clip;
 }
 function updatePBArms(){
  const now=performance.now(),dt=armLastTime?clamp((now-armLastTime)/1000,0,.08):0;armLastTime=now;
  if(!viewScene||!running||Phase13?.isSpectating?.()){setArmsVisible(false);restoreStockHands();return false;}
  const active=activePlayerModel();
  if(!active){disposeArms();restoreStockHands();status.state='no-model';status.reason='karakter import belum aktif';return false;}
  if(armSource!==active.model||!arms.length){
   disposeArms();
   try{if(!buildArms(active.model)){restoreStockHands();return false}}
   catch(e){stats.errors++;disposeArms();status.state='build-error';status.reason=String(e?.message||e);restoreStockHands();return false}
  }
  chooseArmClip();
  for(const sd of arms)sd.mixer.update(dt);
  let ok=false;
  try{ok=placeArms(vm)}catch(e){stats.errors++;status.state='place-error';status.reason=String(e?.message||e)}
  if(ok)hideStockHands(vm);else{setArmsVisible(false);restoreStockHands()}
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
   try{alignBotWeapons();updatePBArms();debugLine()}
   catch(e){stats.errors++;status.state='error';status.reason=String(e?.message||e);if(stats.errors<4)console.warn('[22I.5] character arms:',e)}
   return originalRender.apply(this,arguments);
  };
 }
 const api={version:VERSION,stats,status,refresh:()=>{disposeArms();restoreStockHands();stockCache={vm:null,anchors:null}},dispose:()=>{disposeArms();restoreStockHands();stockCache={vm:null,anchors:null}}};
 global.BlockStrikeCharacterCombat22I3=api;global.BlockStrikeCharacterArms=api;
})(window);
