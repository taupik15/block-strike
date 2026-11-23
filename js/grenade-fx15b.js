/* Effects driven by the original indexed SPR frames present in the supplied archive. */
const GrenadeFX15B=(()=>{
 const ROOT='assets/cs16-grenade-fx/',banks={},bursts=[];
 let scene=null,loading=null,light=null,lightTime=0,lightPower=0,shake=null;
 let c4Texture=null,scorchTexture=null;
 function radialTexture(colors){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(48,48,2,48,48,48);
  for(const [stop,color] of colors)gradient.addColorStop(stop,color);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
  const texture=new THREE.CanvasTexture(canvas);texture.needsUpdate=true;return texture;
 }
 // Procedural fallback still shows a blast if the optional original SPR pack
 // has not loaded yet. The textures are shared across explosions.
 function fireball(group,factor=1){
  c4Texture??=radialTexture([[0,'rgba(255,254,211,1)'],[.22,'rgba(255,218,87,.94)'],[.55,'rgba(255,94,19,.78)'],[1,'rgba(76,15,4,0)']]);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:c4Texture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  sprite.position.set(0,.8,0);sprite.scale.set(5.8*factor,5.8*factor,1);group.add(sprite);return sprite;
 }
 function scorch(group,factor=1){
  scorchTexture??=radialTexture([[0,'rgba(10,9,8,.55)'],[.55,'rgba(25,19,15,.3)'],[1,'rgba(24,18,13,0)']]);
  const material=new THREE.MeshBasicMaterial({map:scorchTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,opacity:.72,side:THREE.DoubleSide});
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(5.3*factor,5.3*factor),material);
  mark.rotation.x=-Math.PI/2;mark.position.y=.018*factor;group.add(mark);return mark;
 }
 function shakeC4(origin,scale=.02){
  shake={origin:origin.clone(),radius:3000*scale,age:0,duration:1};
 }
 // Visual-only screen shake: restore camera immediately after rendering, so
 // aiming, world-space hit traces, and spectating never inherit an offset.
 function cameraShake(camera){
  if(!camera||!shake||shake.age>=shake.duration)return ()=>{};
  const dist=camera.position.distanceTo(shake.origin),weight=Math.max(0,1-dist/shake.radius);
  if(!weight)return ()=>{};
  const factor=weight*(1-shake.age/shake.duration),t=shake.age;
  const pos=camera.position.clone(),rot=camera.rotation.clone();
  camera.position.y+=Math.sin(t*39)*.075*factor;
  camera.rotation.x+=Math.sin(t*43)*.025*factor;
  camera.rotation.y+=Math.cos(t*37)*.018*factor;
  return ()=>{camera.position.copy(pos);camera.rotation.copy(rot)};
 }
 const kinds={smoke:'black_smoke3',puff:'smokepuff'};
 function preload(){
  return loading??=Promise.all(Object.entries(kinds).map(async([kind,name])=>{
   try{
    const response=await fetch(ROOT+name+'.spr');
    if(!response.ok)throw Error('HTTP '+response.status);
    banks[kind]=LocalMapMedia.decodeSprite(await response.arrayBuffer()).frames;
   }catch(err){console.warn('Grenade sprite unavailable:',name,err.message);banks[kind]=[]}
  }));
 }
 function init(root){
  scene=root;void preload();
  light??=new THREE.PointLight(0xffffff,0,5.7,2);
  if(light.parent!==root)root.add(light);
 }
 function renderPuff(group,kind,position,start,lifetime,width,color,rotation=0){
  const bank=banks[kind];
  if(!bank?.length)return null;
  const material=new THREE.SpriteMaterial({map:bank[0].map,color,transparent:true,opacity:0,depthWrite:false,rotation});
  const sprite=new THREE.Sprite(material);sprite.position.copy(position);sprite.visible=false;group.add(sprite);
  return {sprite,bank,start,lifetime,width,position};
 }
 function release(p){p.sprite.parent?.remove(p.sprite);p.sprite.material.dispose()}
 function advance(p,clock,smoke=false){
  const age=clock-p.start;
  if(age<0)return true;
  if(age>=p.lifetime){release(p);return false}
  const t=age/p.lifetime;
  const frame=p.bank[Math.min(p.bank.length-1,Math.floor(t*p.bank.length))];
  p.sprite.visible=true;p.sprite.material.map=frame.map;
  const size=p.width*(smoke?.45+1.1*Math.sqrt(t):.8+t*.62);
  p.sprite.scale.set(size,size*(frame.h/frame.w),1);
  p.sprite.position.y=p.position.y+t*(smoke?1.12*p.width/3.10:.49);
  p.sprite.material.opacity=(smoke?.82:.59)*Math.min(1,t*9,(1-t)*3.2);
  return true;
 }
 function burst(kind,pos){
  if(!scene)return false;
  const group=new THREE.Group();group.position.copy(pos);scene.add(group);
  const flash=kind==='flash';
  const factor=kind==='c4'?Math.max(.5,Math.min(3,(Number(window.bspCol?.T?.k)||.02)/.02)):1;
  light.color.setHex(flash?0xf7f9ff:0xffba72);light.distance=flash?4.2:kind==='c4'?16*factor:5.7;
  light.position.copy(pos);light.position.y+=flash?.25:.55;
  lightPower=flash?1.9:kind==='c4'?4.6:2.15;lightTime=kind==='c4'?.32:.13;light.intensity=lightPower;
  if(kind==='he'){
   GoldSrcSprites.play(scene,'fexplo',pos.clone().add(V(0,.4,0)),{scale:.05,fps:30});
   GoldSrcSprites.play(scene,'eexplo',pos.clone().add(V((rnd()-.5)*2.56,.6+rnd()*.10,(rnd()-.5)*2.56)),{scale:.06,fps:30});
  }else if(kind==='c4'){
   // GoldSrc C4 uses several staggered fireball sprites, not HE's single flash.
   GoldSrcSprites.play(scene,'fexplo',pos.clone().add(V(0,.8*factor,0)),{scale:.105*factor,fps:26});
   GoldSrcSprites.play(scene,'eexplo',pos.clone().add(V(3.4*factor,1.1*factor,-2.3*factor)),{scale:.10*factor,fps:26,delay:.09});
   GoldSrcSprites.play(scene,'eexplo',pos.clone().add(V(-3.1*factor,1.5*factor,2.0*factor)),{scale:.088*factor,fps:24,delay:.16});
  }
  const p=renderPuff(group,'puff',new THREE.Vector3(0,.18,0),flash?.30:kind==='c4'?.52:.43,flash?1.1:kind==='c4'?2.9:1.65,flash?1.5:kind==='c4'?5.8*factor:2.45,0xdedbd6);
  const flame=kind==='c4'?fireball(group,factor):null,mark=kind==='c4'?scorch(group,factor):null;
  if(bursts.length>=12){const old=bursts.shift();if(old.p)release(old.p);if(old.flame)old.flame.material.dispose();if(old.mark)old.mark.material.dispose();old.group.parent?.remove(old.group)}
  bursts.push({type:kind,group,p,flame,mark,factor,age:0});
  return true;
 }
 function update(dt){
  if(lightTime>0){lightTime=Math.max(0,lightTime-dt);light.intensity=lightPower*(lightTime/(lightPower>3?.32:.13))}
  if(shake)shake.age+=dt;
  for(let i=bursts.length-1;i>=0;i--){
   const e=bursts[i];e.age+=dt;
   if(e.p&&!advance(e.p,e.age))e.p=null;
   if(e.flame){const t=Math.min(1,e.age/.78);e.flame.scale.setScalar((5.8+t*5.5)*e.factor);e.flame.material.opacity=Math.max(0,1-t);if(t>=1){e.flame.material.dispose();e.group.remove(e.flame);e.flame=null}}
   if(e.mark)e.mark.material.opacity=.72*Math.max(0,1-e.age/4.2);
   if(!e.p&&!e.flame&&(!e.mark||e.age>=4.2)&&e.age>.13){if(e.mark)e.mark.material.dispose();e.group.parent?.remove(e.group);bursts.splice(i,1)}
  }
 }
 function smoke(pos,duration,scale=.02){
  if(!scene)return null;
  const group=new THREE.Group();group.position.copy(pos);scene.add(group);
  return {mesh:group,particles:[],age:0,duration,scale,radius:0,next:0,serial:0,origin:pos.clone()};
 }
 function updateSmoke(c,dt){
  c.age+=dt;c.radius=Grenade14D.smokeRadius(c.age,c.duration,c.scale);const factor=Grenade14D.worldScale(c.scale);
  while(c.age>=c.next&&c.next<=20){
   for(let i=0;i<3;i++){
    const n=c.serial++,angle=n*2.39996323,extent=.68+((n*7)%13)/13*1.13;
    const pos=new THREE.Vector3(Math.cos(angle)*extent*factor,(.12+((n*5)%9)*.075)*factor,Math.sin(angle)*extent*factor);
    const p=renderPuff(c.mesh,'smoke',pos,c.next+i*.09,5.4,3.10*factor,0xd7d7d3,angle);
    if(p)c.particles.push(p);
   }
   c.next+=1;
  }
  c.particles=c.particles.filter(p=>advance(p,c.age,true));
  return c.age<c.duration;
 }
 function removeSmoke(c){c.particles.forEach(release);c.mesh.parent?.remove(c.mesh)}
 function reset(){for(const e of bursts){if(e.p)release(e.p);if(e.flame)e.flame.material.dispose();if(e.mark)e.mark.material.dispose();e.group.parent?.remove(e.group)}bursts.length=0;shake=null;lightTime=0;if(light)light.intensity=0}
 function debug(){return {burstCount:bursts.length,burstTypes:bursts.map(x=>x.type),
  spriteCount:bursts.filter(x=>x.p).length,textureCounts:Object.fromEntries(Object.entries(banks).map(([k,a])=>[k,a.length]))}}
 return Object.freeze({preload,init,burst,shakeC4,cameraShake,update,reset,smoke,updateSmoke,removeSmoke,debug});
})();
