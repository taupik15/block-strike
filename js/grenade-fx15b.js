/* Effects driven by the original indexed SPR frames present in the supplied archive. */
const GrenadeFX15B=(()=>{
 const ROOT='assets/cs16-grenade-fx/',banks={},bursts=[];
 let scene=null,loading=null,light=null,lightTime=0,lightPower=0;
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
  light.color.setHex(flash?0xf7f9ff:0xffba72);light.distance=flash?4.2:5.7;
  light.position.copy(pos);light.position.y+=flash?.25:.55;
  lightPower=flash?1.9:2.15;lightTime=.13;light.intensity=lightPower;
  if(kind==='he'){
   GoldSrcSprites.play(scene,'fexplo',pos.clone().add(V(0,.4,0)),{scale:.05,fps:30});
   GoldSrcSprites.play(scene,'eexplo',pos.clone().add(V((rnd()-.5)*2.56,.6+rnd()*.10,(rnd()-.5)*2.56)),{scale:.06,fps:30});
  }
  const p=renderPuff(group,'puff',new THREE.Vector3(0,.18,0),flash?.30:.43,flash?1.1:1.65,flash?1.5:2.45,0xdedbd6);
  if(bursts.length>=12){const old=bursts.shift();if(old.p)release(old.p);old.group.parent?.remove(old.group)}
  bursts.push({type:kind,group,p,age:0});
  return true;
 }
 function update(dt){
  if(lightTime>0){lightTime=Math.max(0,lightTime-dt);light.intensity=lightPower*(lightTime/.13)}
  for(let i=bursts.length-1;i>=0;i--){
   const e=bursts[i];e.age+=dt;
   if(e.p&&!advance(e.p,e.age))e.p=null;
   if(!e.p&&e.age>.13){e.group.parent?.remove(e.group);bursts.splice(i,1)}
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
 function reset(){for(const e of bursts){if(e.p)release(e.p);e.group.parent?.remove(e.group)}bursts.length=0;lightTime=0;if(light)light.intensity=0}
 function debug(){return {burstCount:bursts.length,burstTypes:bursts.map(x=>x.type),
  spriteCount:bursts.filter(x=>x.p).length,textureCounts:Object.fromEntries(Object.entries(banks).map(([k,a])=>[k,a.length]))}}
 return Object.freeze({preload,init,burst,update,reset,smoke,updateSmoke,removeSmoke,debug});
})();
