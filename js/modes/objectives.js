/* Hostage Rescue, VIP Assassination and Escape objectives for local GoldSrc BSPs. */
const ObjectiveMode=(()=>{
 'use strict';
 const human={get team(){return playerTeam},get dead(){return P.hp<=0},get pos(){return P.pos}};
 let data=null,mode='elimination',hostages=[],vip=null,group=null,roundEnded=false,initialCT=0,lastUse=-10;
 const alive=a=>!!a&&(a===human?P.hp>0:!a.dead&&a.hp>0);
 const pos=a=>a===human?P.pos:a.g.position;
 const active=()=>['hostage','vip','escape'].includes(mode);
 const hammer=p=>BSP.toHammer(data.col.T,p.toArray());
 const inside=(zones,p)=>!!data&&zones.some(z=>LocalBSP.inSite(z,hammer(p)));
 const center=z=>BSP.toGame(data.col.T,z.mins.map((n,i)=>(n+z.maxs[i])*.5+z.origin[i]));
 const zoneGoal=(zones,actor=null)=>{if(!zones.length)return null;const zone=actor?zones.slice().sort((a,b)=>pos(actor).distanceToSquared(center(a))-pos(actor).distanceToSquared(center(b)))[0]:zones[0];const mid=center(zone),nodes=data.graph?.nodes?.filter(n=>n.edges?.length&&LocalBSP.inSite(zone,n.h))||[];if(nodes.length){nodes.sort((a,b)=>V(...a.pos).distanceToSquared(mid)-V(...b.pos).distanceToSquared(mid));return V(...nodes[0].pos)}return mid};
 function dispose(){
  if(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}});group.parent?.remove(group);group=null;}
  hostages=[];vip=null;
 }
 function personMesh(color=0xb4a17a){
  const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0xb88e70,roughness:1}),shirt=new THREE.MeshStandardMaterial({color,roughness:1}),pants=new THREE.MeshStandardMaterial({color:0x343b42,roughness:1});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.34,.48,.2),shirt);torso.position.y=.88;g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.115,8,6),skin);head.position.y=1.23;g.add(head);
  for(const x of [-.105,.105]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,.42,.13),pants);leg.position.set(x,.43,0);g.add(leg);const arm=new THREE.Mesh(new THREE.BoxGeometry(.1,.38,.12),shirt);arm.position.set(x*2,.91,0);g.add(arm);}
  g.userData.materials=[skin,shirt,pants];return g;
 }
 function prepare(mapData){
  dispose();data=mapData||null;mode=data?.mode||'elimination';roundEnded=false;
  if(!active()||!S)return;
  group=new THREE.Group();group.name='objective-actors';S.add(group);
  if(mode==='hostage'){
   hostages=(data.objectives?.hostages||[]).map((h,i)=>{
    const mesh=personMesh(0x9b9a83);mesh.position.copy(V(...h.position));mesh.rotation.y=Number(h.angles)||0;group.add(mesh);
    return {...h,mesh,following:null,rescued:false};
   });
  }
 }
 function roundStart(){
  roundEnded=false;lastUse=-10;
  if(!active())return;
  if(mode==='hostage'){
   for(const h of hostages){h.following=null;h.rescued=false;h.mesh.visible=true;h.mesh.position.copy(V(...h.position));}
  }
  P.isVIP=false;for(const b of bots)b.isVIP=false;
  if(mode==='vip'){
   const start=data.objectives?.vipStart?.position;
   if(!start)return;
   const vipActor=playerTeam==='CT'?human:(bots.find(b=>b.team==='CT'&&!b.dead)||null);
   vip={actor:vipActor,position:V(...start),escaped:false,dead:!vipActor};
   if(vipActor===human){P.pos.copy(vip.position);if(window.bspCol)P.pos.y=BSP.snapSpawn(bspCol,P.pos.x,P.pos.z);P.vy=0;P.hp=100;}
   else if(vipActor?.g){vipActor.g.position.copy(vip.position);if(window.bspCol)vipActor.g.position.y=BSP.snapSpawn(bspCol,vipActor.g.position.x,vipActor.g.position.z);vipActor.g.rotation.y=0;}
   if(vipActor===human)P.isVIP=true;else if(vipActor)vipActor.isVIP=true;
  }else vip=null;
  initialCT=bots.filter(b=>b.team==='CT'&&!b.dead).length+(playerTeam==='CT'?1:0);
 }
 function nearestHostage(actor){
  return hostages.filter(h=>!h.rescued&&!h.following).map(h=>({h,d:pos(actor).distanceTo(h.mesh.position)})).filter(x=>x.d<1.75).sort((a,b)=>a.d-b.d)[0]?.h||null;
 }
 function canUseNearby(){return active()&&mode==='hostage'&&playerTeam==='CT'&&P.hp>0&&!!nearestHostage(human);}
 function useNearby(){
  if(!active()||mode!=='hostage'||playerTeam!=='CT'||P.hp<=0||roundWait>0||typeof freezeLeft!=='undefined'&&freezeLeft>0)return false;
  const h=nearestHostage(human);if(!h)return false;
  h.following=human;h.mesh.position.copy(P.pos);say('HOSTAGE FOLLOWING');return true;
 }
 function followHostage(h,actor,dt){
  if(!h.following||!alive(h.following))return;
  const a=h.following,p=pos(a),angle=a===human?P.yaw:(a.g.rotation.y||0);
  const target=p.clone().add(V(Math.sin(angle)*-.72,0,Math.cos(angle)*-.72));
  h.mesh.position.lerp(target,Math.min(1,dt*5));h.mesh.position.y=p.y;
  h.mesh.rotation.y=angle;
  const zones=data.objectives?.hostageRescueZones||[];
  if(inside(zones,h.mesh.position)){h.rescued=true;h.following=null;h.mesh.visible=false;}
 }
 function actorInZones(actor,zones){return alive(actor)&&inside(zones,pos(actor));}
 function update(dt){
  if(!active()||roundEnded||roundWait>0)return;
  if(mode==='hostage'){
   for(const h of hostages){
    if(h.following&&!alive(h.following))h.following=null;
    if(h.following)followHostage(h,h.following,dt);
    else if(!h.rescued&&h.mesh.visible){
     // A CT bot can collect an unclaimed hostage when it reaches the scientist.
     const bot=bots.filter(b=>b.team==='CT'&&!b.dead).find(b=>b.g.position.distanceTo(h.mesh.position)<1.15);
     if(bot)h.following=bot;
    }
   }
   const rescued=hostages.filter(h=>h.rescued).length;
   if(rescued===hostages.length&&hostages.length>0)finish('CT','HOSTAGES RESCUED');
  }else if(mode==='vip'&&vip){
   if(!alive(vip.actor)){vip.dead=true;finish('T','VIP ELIMINATED');return;}
   const zones=data.objectives?.vipSafetyZones||[];
   if(actorInZones(vip.actor,zones)){vip.escaped=true;finish('CT','VIP ESCAPED');return;}
  }else if(mode==='escape'){
   const zones=data.objectives?.escapeZones||[],living=bots.filter(b=>b.team==='CT'&&!b.dead);
   const escaped=living.filter(b=>actorInZones(b,zones)).length+(playerTeam==='CT'&&actorInZones(human,zones)?1:0);
   const total=living.length+(playerTeam==='CT'&&P.hp>0?1:0);
   if(total>0&&escaped>=Math.max(1,Math.ceil(initialCT*.5)))finish('CT','CT ESCAPED');
  }
 }
 function botGoal(bot){
  if(!active()||roundEnded||roundWait>0||!bot||bot.dead)return null;
  if(mode==='vip'&&vip){
   if(bot===vip.actor)return {pos:zoneGoal(data.objectives?.vipSafetyZones||[],bot)||vip.position,radius:1.25,force:true,urgent:true,mode:'vip-escape'};
   if(bot.team==='CT'&&vip.actor&&alive(vip.actor)&&vip.actor!==human)return {pos:pos(vip.actor),radius:3.5,mode:'vip-escort'};
  }
  if(mode==='hostage'&&bot.team==='CT'){
   const carried=hostages.find(h=>h.following===bot&&!h.rescued);
   if(carried)return {pos:zoneGoal(data.objectives?.hostageRescueZones||[],bot)||carried.mesh.position,radius:1.2,force:true,urgent:true,mode:'hostage-rescue'};
   const target=hostages.filter(h=>!h.rescued&&!h.following).sort((a,b)=>pos(bot).distanceToSquared(a.mesh.position)-pos(bot).distanceToSquared(b.mesh.position))[0];
   if(target)return {pos:target.mesh.position,radius:.8,force:true,mode:'hostage-collect'};
  }
  if(mode==='escape'&&bot.team==='CT')return {pos:zoneGoal(data.objectives?.escapeZones||[],bot)||pos(bot),radius:1.2,force:true,urgent:true,mode:'escape-zone'};
  return null;
 }
 function finish(winner,reason){
  if(roundEnded||!['CT','T'].includes(winner))return false;
  roundEnded=true;Phase10.roundEnd(winner,null,false,reason);roundWait=3;return true;
 }
 function checkTimeout(){
  if(!active()||roundEnded||roundTime>0||roundWait>0)return false;
  if(mode==='vip'&&vip?.escaped)return finish('CT','VIP ESCAPED');
  return finish('T',mode==='hostage'?'HOSTAGE TIME EXPIRED':mode==='vip'?'VIP TIME EXPIRED':'ESCAPE TIME EXPIRED');
 }
 function hud(){
  if(!$('modeStatus'))return;
  if(!active()){$('modeStatus').textContent='';return;}
  if(mode==='hostage'){
   const rescued=hostages.filter(h=>h.rescued).length,total=hostages.length;
   $('modeStatus').textContent=`HOSTAGES RESCUED ${rescued}/${total} · ${playerTeam==='CT'?'E / TAKE HOSTAGE':'ELIMINATE CT'}`;
  }else if(mode==='vip')$('modeStatus').textContent=vip?.escaped?'VIP ESCAPED':vip?.dead?'VIP ELIMINATED':vip?.actor===human?'YOU ARE THE VIP · REACH THE ESCAPE ZONE':'PROTECT THE VIP';
  else $('modeStatus').textContent='ESCAPE · CT REACH THE ESCAPE ZONE';
 }
 function state(){return {mode,active:active(),hostages:hostages.map(h=>({rescued:h.rescued,following:h.following===human?'player':h.following?.botId||null})),vip:vip?{actor:vip.actor===human?'player':vip.actor?.botId||null,escaped:vip.escaped,dead:vip.dead}:null,roundEnded};}
 return {active,prepare,roundStart,update,useNearby,canUseNearby,botGoal,hud,checkTimeout,state,isVIP:a=>!!vip&&vip.actor===a};
})();

window.ObjectiveMode=ObjectiveMode;
