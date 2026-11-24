/* AR11.10.22I.6 — CS-shaped first-person arms re-skinned with the imported character's own colours and sleeve pattern.
 * No bone fitting or per-model constants: the stock viewmodel keeps its shape and position, and only the three stock arm
 * textures (view_glove / view_skin / view_finger) are replaced by recoloured copies built from the imported character's
 * forearm and hand texels. Anything missing falls back to the original CS textures. Bot combat code is unchanged. */
(function (global) {
 'use strict';
 const VERSION='AR11.10.22I.6-CS-ARMS-PB-SKIN';
 const stats={recolored:0,restored:0,errors:0,weaponAxes:0,autoJumps:0,autoCrouches:0,state:'init',character:'',palette:''};
 const vForward=new THREE.Vector3(1,0,0),vDesired=new THREE.Vector3(),qParent=new THREE.Quaternion(),qBaseWorld=new THREE.Quaternion(),qDelta=new THREE.Quaternion(),qWorld=new THREE.Quaternion(),qInverse=new THREE.Quaternion();
 const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3();
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const attributeValue=(a,i,k)=>k===0?a.getX(i):k===1?a.getY(i):k===2?a.getZ(i):a.getW(i);
 const norm=s=>String(s||'').replace(/[_\-.:]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim().toLowerCase();
 const lum=(r,g,b)=>.299*r+.587*g+.114*b;
 const STOCK_KIND=n=>{const k=String(n||'').trim().toLowerCase().replace(/\.\w+$/,'').replace(/[ _-]+/g,'');return k==='viewglove'?'glove':k==='viewskin'?'skin':k==='viewfinger'?'finger':null};
 const boneClass=n=>{const k=norm(n);if(/handle|thigh|toe|foot/.test(k))return null;if(/(^| )(hand|palm)( |$)|finger|thumb/.test(k))return 'hand';if(/fore ?arm/.test(k))return 'fore';if(/upper ?arm/.test(k))return 'upper';return null};
 const params=(()=>{try{return new URLSearchParams(global.location?.search||'')}catch(_){return new URLSearchParams('')}})();
 const enabled=()=>{
  if(global.BS_PB_ARMS===false||params.get('pbarms')==='0')return false;
  try{if(global.localStorage?.getItem('bsPbArms')==='0')return false}catch(_){}
  return true;
 };
 // ---- reading texels from any texture type (DataTexture from the MDL builder, or an image/canvas) ----
 function readPixels(tex){
  const img=tex?.image;if(!img)return null;
  if(img.data&&img.width&&img.height){const ch=img.data.length/(img.width*img.height);if(ch===3||ch===4)return {w:img.width,h:img.height,ch,data:img.data}}
  try{
   const w=img.width||img.naturalWidth,h=img.height||img.naturalHeight;if(!w||!h)return null;
   const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);
   return {w,h,ch:4,data:x.getImageData(0,0,w,h).data};
  }catch(_){return null}
 }
 // ---- sample the imported character's forearm / hand texels through the UV footprint of those triangles ----
 function sampleCharacter(scene){
  const out={fore:[],upper:[],hand:[]};
  scene.traverse(mesh=>{
   if(!mesh.isSkinnedMesh||!mesh.geometry||!mesh.skeleton)return;
   const g=mesh.geometry,pos=g.getAttribute('position'),uv=g.getAttribute('uv'),si=g.getAttribute('skinIndex'),sw=g.getAttribute('skinWeight');
   if(!pos||!uv||!si||!sw)return;
   const mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material,tex=mat?.map,px=readPixels(tex);if(!px)return;
   const cls=mesh.skeleton.bones.map(b=>boneClass(b.name)),flip=tex.flipY!==false,{w,h,ch,data}=px;
   const vertexClass=i=>{let best=-1,bw=0;for(let k=0;k<4;k++){const wt=attributeValue(sw,i,k);if(wt>bw){bw=wt;best=attributeValue(si,i,k)|0}}return bw>.4?cls[best]:null};
   const index=g.index,count=index?index.count:pos.count,tu=new Float32Array(3),tv=new Float32Array(3);
   for(let i=0;i+2<count;i+=3){
    const ids=[index?index.getX(i):i,index?index.getX(i+1):i+1,index?index.getX(i+2):i+2],cs=ids.map(vertexClass);
    let kind=null;for(const c of ['hand','fore','upper'])if(cs.filter(x=>x===c).length>=2){kind=c;break}
    if(!kind)continue;
    for(let k=0;k<3;k++){const u=uv.getX(ids[k]),v=uv.getY(ids[k]);tu[k]=(u-Math.floor(u))*w;tv[k]=((flip?1-v:v)-Math.floor(flip?1-v:v))*h}
    const minx=Math.max(0,Math.floor(Math.min(tu[0],tu[1],tu[2]))),maxx=Math.min(w-1,Math.ceil(Math.max(tu[0],tu[1],tu[2])));
    const miny=Math.max(0,Math.floor(Math.min(tv[0],tv[1],tv[2]))),maxy=Math.min(h-1,Math.ceil(Math.max(tv[0],tv[1],tv[2])));
    if(maxx-minx>w*.5||maxy-miny>h*.5)continue;
    const den=(tv[1]-tv[2])*(tu[0]-tu[2])+(tu[2]-tu[1])*(tv[0]-tv[2]);if(Math.abs(den)<1e-6)continue;
    const list=out[kind];
    for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
     const px0=x+.5,py0=y+.5,a=((tv[1]-tv[2])*(px0-tu[2])+(tu[2]-tu[1])*(py0-tv[2]))/den,b=((tv[2]-tv[0])*(px0-tu[2])+(tu[0]-tu[2])*(py0-tv[2]))/den,c=1-a-b;
     if(a<-.02||b<-.02||c<-.02)continue;
     const o=(y*w+x)*ch;if(ch===4&&data[o+3]<128)continue;
     if(list.length<90000)list.push(data[o],data[o+1],data[o+2]);
    }
   }
  });
  return out;
 }
 const meanOf=(list,filter)=>{let r=0,g=0,b=0,n=0;for(let i=0;i<list.length;i+=3){const R=list[i],G=list[i+1],B=list[i+2];if(filter&&!filter(R,G,B))continue;r+=R;g+=G;b+=B;n++}return n?{rgb:[r/n,g/n,b/n],n}:null};
 const isDark=(r,g,b)=>lum(r,g,b)<=72;
 const isSkin=(r,g,b)=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return r>=g-4&&g>=b-8&&r-b>=22&&lum(r,g,b)>=75&&mx>0&&(mx-mn)/mx>.14};
 // ---- palette: forearm pattern tile + glove colour + hand-skin colour ----
 function buildPalette(character){
  const s=sampleCharacter(character.scene);let forePx=s.fore.length>=72?s.fore:(s.upper.length>=72?s.upper:null);
  if(forePx){ // drop texture padding (near black); prefer skin-like texels when they are a real part of the forearm
   const lit=forePx.filter((v,i)=>{if(i%3)return true;return lum(forePx[i],forePx[i+1],forePx[i+2])>=28});
   const keep=(list,test)=>{const o=[];for(let i=0;i<list.length;i+=3)if(test(list[i],list[i+1],list[i+2]))o.push(list[i],list[i+1],list[i+2]);return o};
   const us=keep(forePx,(r,g,b)=>lum(r,g,b)>=28),ss=keep(us,isSkin);
   forePx=ss.length/3>=Math.max(24,us.length/3*.25)?ss:(us.length/3>=24?us:forePx);
  }
  const skin=meanOf(s.hand,isSkin),glove=meanOf(s.hand,isDark),foreMean=forePx?meanOf(forePx):null;
  if(!foreMean&&!skin)return null; // nothing usable: keep the original CS arms
  let tile=null;
  if(forePx){
   const n=forePx.length/3,raw=new Float32Array(64*64*3);let seed=2166136261;
   for(let i=0;i<64*64;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=(seed%n)*3;raw[i*3]=forePx[j];raw[i*3+1]=forePx[j+1];raw[i*3+2]=forePx[j+2]}
   tile=new Uint8Array(64*64*3); // 3x3 wrap-around blur: smooth mottling that keeps the sleeve's colour distribution
   for(let y=0;y<64;y++)for(let x=0;x<64;x++)for(let c=0;c<3;c++){let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=raw[(((y+dy+64)&63)*64+((x+dx+64)&63))*3+c];tile[(y*64+x)*3+c]=sum/9}
  }
  return {tile,fore:(foreMean||skin).rgb,skin:(skin||foreMean).rgb,glove:glove&&glove.n>=24?glove.rgb:null,counts:{fore:s.fore.length/3,upper:s.upper.length/3,hand:s.hand.length/3}};
 }
 const paletteCache=new WeakMap();
 function paletteFor(character){
  if(paletteCache.has(character))return paletteCache.get(character);
  let p=null;try{p=buildPalette(character)}catch(e){stats.errors++;console.warn('[22I.6] palette:',e)}
  paletteCache.set(character,p);return p;
 }
 // ---- recolour one stock arm texture, keeping its own shading/detail ----
 function recolor(orig,kind,pal){
  const src=readPixels(orig);if(!src||src.ch<3)return null;
  const {w,h,ch,data}=src,out=new Uint8Array(w*h*4);
  let lightSum=0,lightN=0,darkSum=0,darkN=0;
  for(let i=0;i<w*h;i++){const L=lum(data[i*ch],data[i*ch+1],data[i*ch+2]);if(L>72){lightSum+=L;lightN++}else{darkSum+=L;darkN++}}
  const lightMean=lightN?lightSum/lightN:150,darkMean=Math.max(12,darkN?darkSum/darkN:28);
  const gloveColor=pal.glove||null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x,r=data[i*ch],g=data[i*ch+1],b=data[i*ch+2],L=lum(r,g,b),dark=L<=72;let base,mod;
   if(kind==='skin'){
    if(dark){out.set([r,g,b,255],i*4);continue}
    const t=pal.tile?((y&63)*64+(x&63))*3:-1;base=t>=0?[pal.tile[t],pal.tile[t+1],pal.tile[t+2]]:pal.fore;mod=clamp(.45+.55*L/lightMean,.4,1.6);
   }else if(kind==='glove'){
    if(gloveColor){base=gloveColor;mod=clamp(L/darkMean,.3,2.4)}else{base=pal.skin;mod=clamp(.45+.55*L/Math.max(40,lightMean*.5),.35,1.5)}
   }else{ // finger: dark part is the glove, light part is bare skin
    if(dark){if(gloveColor){base=gloveColor;mod=clamp(L/darkMean,.3,2.4)}else{base=pal.skin;mod=clamp(.45+.55*L/Math.max(40,lightMean),.35,1.5)}}
    else{base=pal.skin;mod=clamp(.45+.55*L/lightMean,.4,1.6)}
   }
   out[i*4]=clamp(base[0]*mod,0,255);out[i*4+1]=clamp(base[1]*mod,0,255);out[i*4+2]=clamp(base[2]*mod,0,255);out[i*4+3]=255;
  }
  const t=new THREE.DataTexture(out,w,h,THREE.RGBAFormat);
  t.magFilter=orig.magFilter;t.minFilter=orig.minFilter;t.generateMipmaps=orig.generateMipmaps;t.flipY=orig.flipY;t.wrapS=orig.wrapS;t.wrapT=orig.wrapT;
  if('colorSpace' in orig)t.colorSpace=orig.colorSpace;if('encoding' in orig)t.encoding=orig.encoding;
  t.needsUpdate=true;return t;
 }
 // ---- apply / restore on the viewmodel that is actually rendered ----
 const touched=new Map(),recolorCache=new Map();let lastSubject=null,lastKey='\u0000';
 function activePlayerModel(){
  const id=playerAvatar?.userData?.characterVoice?.id;
  if(!id)return null;
  const model=(playerTeam==='CT'?CTC:TC)?.[id];
  return model?.scene?{id,model}:null;
 }
 function applyToSubject(subject,active){
  const key=active?active.id:'',pal=active?paletteFor(active.model):null;
  if(active&&!pal)return false;
  let changed=0,found=0;
  subject.traverse(mesh=>{
   if(!mesh.isMesh)return;const kind=STOCK_KIND(mesh.userData?.texName);if(!kind)return;
   for(const mat of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){
    if(!mat||!mat.map)continue;found++;
    let rec=touched.get(mat);if(!rec){rec={orig:mat.map,char:''};touched.set(mat,rec)}
    if(rec.char===key)continue;
    if(!active){if(mat.map!==rec.orig){mat.map=rec.orig;mat.needsUpdate=true;stats.restored++}rec.char='';continue}
    const ck=rec.orig.uuid+'|'+key+'|'+kind;let tex=recolorCache.get(ck);
    if(!tex){tex=recolor(rec.orig,kind,pal);if(tex)recolorCache.set(ck,tex)}
    if(tex){mat.map=tex;mat.needsUpdate=true;rec.char=key;changed++;stats.recolored++}
   }
  });
  return found>0;
 }
 function restoreAll(){
  for(const [mat,rec] of touched){if(mat.map!==rec.orig){mat.map=rec.orig;mat.needsUpdate=true;stats.restored++}rec.char=''}
  lastSubject=null;lastKey='\u0000';
 }
 function renderSubject(){
  try{return Phase13?.isSpectating?.()?Phase13.getViewmodel():Phase9?.handlingGrenade?.()?Phase9.getViewmodel():(BombMode?.getViewmodel?.()||vm)}catch(_){return vm}
 }
 function updateArmSkin(){
  const subject=renderSubject();
  if(!enabled()){if(lastKey!==''){restoreAll();lastKey=''}stats.state='disabled by switch';return;}
  if(!subject?.visible||subject.parent!==viewScene)return;
  const found=activePlayerModel(),active=found&&paletteFor(found.model)?found:null,key=active?active.id:'';
  if(subject===lastSubject&&key===lastKey)return;
  const ok=applyToSubject(subject,active);
  lastSubject=subject;lastKey=key;
  const pal=active?paletteFor(active.model):null;
  stats.character=key;stats.palette=pal?('forearm '+pal.counts.fore+' · upper '+pal.counts.upper+' · hand '+pal.counts.hand+' texels'):'';
  stats.state=!found?'stock CS arms (no imported character)':!active?'stock CS arms (character texture not readable)':ok?'recoloured with '+key:'viewmodel has no arm textures';
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
 // ---- optional debug chip: open the game with ?armdebug=1 ----
 function mountDebugChip(){
  if(params.get('armdebug')!=='1'||document.getElementById('bsArmDebug'))return;
  const box=document.createElement('div');box.id='bsArmDebug';
  box.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;background:rgba(0,0,0,.72);color:#fff;font:11px/1.35 sans-serif;padding:6px 8px;border-radius:6px;max-width:60vw';
  const title=document.createElement('div');title.style.fontWeight='700';title.textContent='Lengan CS + skin PB';
  const status=document.createElement('div'),info=document.createElement('div'),sw=document.createElement('div');info.style.opacity='.8';sw.style.cssText='display:flex;gap:4px;margin:3px 0';
  const chips=['fore','skin','glove'].map(()=>{const c=document.createElement('span');c.style.cssText='width:26px;height:14px;border:1px solid #fff;border-radius:3px;background:#333';sw.appendChild(c);return c});
  const toggle=document.createElement('button');toggle.textContent='PB skin ON/OFF';toggle.style.cssText='font-size:11px;padding:3px 6px';
  toggle.onclick=()=>{try{global.localStorage.setItem('bsPbArms',enabled()?'0':'1')}catch(_){}};
  box.append(title,status,info,sw,toggle);document.body.appendChild(box);
  setInterval(()=>{
   status.textContent=(stats.state||'')+(stats.character?' · '+stats.character:'');info.textContent=stats.palette||'';
   const found=activePlayerModel(),pal=found?paletteFor(found.model):null;
   const css=c=>c?'rgb('+c.map(v=>Math.round(v)).join(',')+')':'#333';
   if(pal){chips[0].style.background=css(pal.fore);chips[1].style.background=css(pal.skin);chips[2].style.background=css(pal.glove)}
  },500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountDebugChip);else mountDebugChip();
 if(typeof renderActiveViewmodel==='function'){
  const originalRender=renderActiveViewmodel;
  renderActiveViewmodel=function(){
   try{alignBotWeapons();updateArmSkin()}
   catch(e){stats.errors++;if(stats.errors<4)console.warn('[22I.6] character presentation:',e);if(stats.errors>=6){global.BS_PB_ARMS=false;try{restoreAll()}catch(_){}}}
   return originalRender.apply(this,arguments);
  };
 }
 global.BlockStrikeCharacterCombat22I3={version:VERSION,stats,status:()=>({state:stats.state,character:stats.character,palette:stats.palette}),refresh:()=>{restoreAll()},dispose:()=>{restoreAll()}};
})(window);
