/* Hostage Rescue, VIP Assassination and Escape objectives for local GoldSrc BSPs. */
const ObjectiveMode=(()=>{
 'use strict';
 // Tuning: CT pickup reach (game units). T non-guards hold near hostages until this many seconds into the round.
 const HOSTAGE_PICKUP_RADIUS=1.6,RUSH_AFTER_SECONDS=0;
 const human={get team(){return playerTeam},get dead(){return P.hp<=0},get pos(){return P.pos}};
 let data=null,mode='elimination',hostages=[],vip=null,group=null,roundEnded=false,initialCT=0,lastUse=-10;
 const alive=a=>!!a&&(a===human?P.hp>0:!a.dead&&a.hp>0);
 const pos=a=>a===human?P.pos:a.g.position;
 const active=()=>['hostage','vip','escape'].includes(mode);
 const hammer=p=>BSP.toHammer(data.col.T,p.toArray());
 const inside=(zones,p)=>!!data&&zones.some(z=>LocalBSP.inSite(z,hammer(p)));
 const center=z=>BSP.toGame(data.col.T,z.mins.map((n,i)=>(n+z.maxs[i])*.5+z.origin[i]));
 const zoneGoal=(zones,actor=null)=>{if(!zones.length)return null;const zone=actor?zones.slice().sort((a,b)=>pos(actor).distanceToSquared(center(a))-pos(actor).distanceToSquared(center(b)))[0]:zones[0];const mid=center(zone),nodes=data.graph?.nodes?.filter(n=>n.edges?.length&&LocalBSP.inSite(zone,n.h))||[];if(nodes.length){nodes.sort((a,b)=>V(...a.pos).distanceToSquared(mid)-V(...b.pos).distanceToSquared(mid));const slot=nodes[(actor?.teamIndex||0)%Math.min(6,nodes.length)];return V(...slot.pos)}return mid};
 // Choose only collision-validated, team-usable GRAPH nodes for local patrols.
 function patrolNodes(team,anchor,minRange,maxRange){
  const nodes=data?.graph?.nodes||[];
  return nodes.filter(n=>{
   const flags=n.teamFlags??n.flags??0;
   if(n.valid===false||!n.edges?.length||n.ladder||n.water)return false;
   if(team==='CT'&&(flags&(1<<29))||team==='T'&&(flags&(1<<30)))return false;
   const p=V(...n.pos),d=p.distanceTo(anchor);
   return d>=minRange&&d<=maxRange;
  }).map(n=>({node:n,pos:V(...n.pos),angle:Math.atan2(n.pos[2]-anchor.z,n.pos[0]-anchor.x)})).sort((a,b)=>a.angle-b.angle);
 }
 // Patrol routes cycle through real waypoints. At each stop bots pause and scan
 // four directions before moving to the next point instead of camping forever.
 function patrolOrder(bot,key,anchor,team,minRange,maxRange,modeName){
  const now=performance.now()/1000,p=pos(bot);let state=bot[key];
  if(state?.pos&&p.distanceTo(state.pos)<=1.3){
   if(state.pauseUntil==null){state.pauseAt=now;state.pauseUntil=now+1.65+((bot.teamIndex||0)%4)*.12;state.scanYaw=bot.g.rotation.y||0;}
   if(now<state.pauseUntil){
    const sector=Math.floor((now-state.pauseAt)/.4)%4,target=state.scanYaw+[0,.95,-.95,Math.PI][sector];
    const delta=Math.atan2(Math.sin(target-bot.g.rotation.y),Math.cos(target-bot.g.rotation.y));
    bot.g.rotation.y+=Math.max(-.08,Math.min(.08,delta));
    return {pos:p.clone(),radius:.3,hold:true,mode:'defend'};
   }
   state=null;bot[key]=null;
  }
  if(state?.pos&&now<state.until)return {pos:state.pos,radius:1.05,force:true,mode:modeName};
  const candidates=patrolNodes(team,anchor,minRange,maxRange);
  if(candidates.length){
   const next=(bot[key+'Index']||0);bot[key+'Index']=next+1;
   const choice=candidates[(next+(bot.teamIndex||0)*2)%candidates.length];
   state=bot[key]={pos:choice.pos,until:now+14,pauseUntil:null};
   return {pos:state.pos,radius:1.05,force:true,mode:modeName};
  }
  // Keep a bounded fallback if a custom graph has no patrol node near the anchor.
  const index=(bot[key+'Index']||0);bot[key+'Index']=index+1;
  const angle=(bot.teamIndex||0)*1.7+index*1.9,rad=(minRange+maxRange)*.5;
  const target=anchor.clone().add(V(Math.cos(angle)*rad,0,Math.sin(angle)*rad));
  bot[key]={pos:target,until:now+10,pauseUntil:null};
  return {pos:target,radius:1.2,force:true,mode:modeName};
 }
 function dispose(){
  if(group){group.traverse(o=>{
   // MDL textures belong to the map decoder. Drop the reference before dispose.
   if(o.userData?.keepMap&&o.material&&!Array.isArray(o.material))o.material.map=null;
   if(o.geometry)o.geometry.dispose();
   if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}
  });group.parent?.remove(group);group=null;}
  hostages=[];vip=null;
 }
 // Yellow boxes only if the map did not ship the hostage mdl.
 function yawOf(angles){
  const parts=String(angles??'0').trim().split(/\s+/).map(Number);
  const deg=parts.length>1&&Number.isFinite(parts[1])?parts[1]:Number.isFinite(parts[0])?parts[0]:0;
  return deg*Math.PI/180;
 }
 function hostageParts(h){
  const models=data?.media?.models;if(!models)return null;
  const key=String(h.model||'models/scientist.mdl').replaceAll('\\','/').toLowerCase();
  const model=models.get(key);
  return Array.isArray(model)&&model.length&&model[0].positions?model:null;
 }
 function mdlHostage(parts){
  const g=new THREE.Group();g.userData.mdlHostage=true;
  for(const part of parts){
   const mesh=BSPVisuals.mesh(part);
   mesh.matrixAutoUpdate=true;mesh.frustumCulled=false;mesh.userData.keepMap=true;g.add(mesh);
  }
  return g;
 }
 function personMesh(color=0xd7b84a,variant=0){
  const g=new THREE.Group();
  const skin=new THREE.MeshStandardMaterial({color:0xc4a07a,roughness:.95});
  const shirt=new THREE.MeshStandardMaterial({color,roughness:.9});
  const pants=new THREE.MeshStandardMaterial({color:variant%2?0x3a4550:0x2e3842,roughness:.95});
  const shoes=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:1});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.36,.5,.22),shirt);torso.position.y=.9;g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),skin);head.position.y=1.26;g.add(head);
  for(const x of [-.11,.11]){
   const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,.44,.13),pants);leg.position.set(x,.42,0);g.add(leg);
   const foot=new THREE.Mesh(new THREE.BoxGeometry(.13,.08,.18),shoes);foot.position.set(x,.18,.02);g.add(foot);
   const arm=new THREE.Mesh(new THREE.BoxGeometry(.1,.4,.12),shirt);arm.position.set(x*2.05,.92,0);g.add(arm);
  }
  g.userData.materials=[skin,shirt,pants,shoes];return g;
 }
 function prepare(mapData){
  dispose();data=mapData||null;mode=data?.mode||'elimination';roundEnded=false;
  if(!active()||!S)return;
  group=new THREE.Group();group.name='objective-actors';S.add(group);
  if(mode==='hostage'){
   // Box coats are only the fallback when scientist.mdl is not in the map.
   const coats=[0xd7b84a,0xe2c35a,0xc9a83e,0xf0d06a];
   hostages=(data.objectives?.hostages||[]).map((h,i)=>{
    const parts=hostageParts(h);
    const mesh=parts?mdlHostage(parts):personMesh(coats[i%coats.length],i);
    mesh.position.copy(V(...h.position));mesh.rotation.y=yawOf(h.angles);group.add(mesh);
    return {...h,mesh,following:null,rescued:false};
   });
   const mdlCount=hostages.filter(h=>h.mesh.userData.mdlHostage).length;
   console.info('[hostage] actors '+hostages.length+', mdl '+mdlCount+(mdlCount?'':' (yellow box fallback, scientist.mdl missing from the map)'));
  }
 }
 function roundStart(){
  roundEnded=false;lastUse=-10;
  if(!active())return;
  if(mode==='hostage'){
   for(const h of hostages){h.following=null;h.assignedTo=null;h.rescued=false;h.mesh.visible=true;h.mesh.position.copy(V(...h.position));h.mesh.rotation.y=yawOf(h.angles);}
  }
  P.isVIP=false;for(const b of bots){
   b.isVIP=false;b.hostageGuardPatrol=null;b.hostageAttackPatrol=null;
   b.hostageGuardPatrolIndex=0;b.hostageAttackPatrolIndex=0;
  }
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
     const bot=bots.filter(b=>b.team==='CT'&&!b.dead).find(b=>b.g.position.distanceTo(h.mesh.position)<HOSTAGE_PICKUP_RADIUS);
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
  if(mode==='hostage'){
   const free=hostages.filter(h=>!h.rescued&&!h.following);
   const live=hostages.filter(h=>!h.rescued);
   // CT bots reserve different hostages to prevent the entire team stacking on one.
   if(bot.team==='CT'){
    const tnow=performance.now()/1000;
    // Release hostages whose assigned CT cannot make route progress; retarget and tell the player.
    for(const h of free){
     if(!h.assignedTo)continue;
     const who=h.assignedTo,stalled=tnow-(h.assignedAt||0)>5&&!(who.localRoute?.points?.length);
     if(!alive(who)||stalled){h.assignedTo=null;if(stalled&&alive(who))h.lockedOut=who;}
    }
    const carried=hostages.find(h=>h.following===bot&&!h.rescued);
    if(carried)return {pos:zoneGoal(data.objectives?.hostageRescueZones||[],bot)||carried.mesh.position,radius:1.2,force:true,urgent:true,mode:'hostage-rescue'};
    const assigned=free.find(h=>h.assignedTo===bot);
    if(assigned)return {pos:assigned.mesh.position,radius:.85,force:true,urgent:true,mode:'hostage-collect'};
    const available=free.filter(h=>!h.assignedTo&&h.lockedOut!==bot);
    if(available.length){
     available.sort((a,b)=>pos(bot).distanceToSquared(a.mesh.position)-pos(bot).distanceToSquared(b.mesh.position));
     const pick=available[0];pick.assignedTo=bot;pick.assignedAt=performance.now()/1000;
     return {pos:pick.mesh.position,radius:.85,force:true,urgent:true,mode:'hostage-collect'};
    }
    const zone=zoneGoal(data.objectives?.hostageRescueZones||[],bot);
    if(zone)return {pos:zone,radius:1.4,force:true,mode:'hostage-support'};
    const carrier=hostages.find(h=>h.following&&!h.rescued);
    if(carrier)return {pos:carrier.mesh.position,radius:2.5,mode:'hostage-support'};
   }
   // Most Ts leave the hostage room and pressure CT approach routes; a minority guard.
   if(bot.team==='T'&&live.length){
    if(bot.visibleEnemy)return null; // combat AI handles visible enemies
    const idx=bot.teamIndex||0;
    // Follow a recent, actually observed enemy position; never read hidden live positions.
    if(bot.lastSeen?.pos&&performance.now()/1000-bot.lastSeen.t<3.5)
     return {pos:bot.lastSeen.pos,radius:1.8,force:true,mode:'hunt-last-seen'};
    if(idx%4===0){
     const h=live[Math.floor(idx/4)%live.length];
     return patrolOrder(bot,'hostageGuardPatrol',h.mesh.position,'T',2.3,6.5,'defend');
    }
    const elapsed=(window.PhaseMenu15?.rules.roundSeconds??120)-roundTime;
    if(elapsed<RUSH_AFTER_SECONDS){
     const h=live[idx%live.length];
     return patrolOrder(bot,'hostageAttackPatrol',h.mesh.position,'T',3.5,9,'defend');
    }
    const ctSpawns=data.col?.spawnTeams?.CT||[];
    if(ctSpawns.length){
     const spawn=ctSpawns[(idx+Math.floor(idx/4))%ctSpawns.length];
     const anchor=V(...BSP.toGame(data.col.T,spawn));
     return patrolOrder(bot,'hostageAttackPatrol',anchor,'T',2.8,8,'advance');
    }
    const zones=data.objectives?.hostageRescueZones||[];
    const intercept=zoneGoal(zones,bot);
    if(intercept)return {pos:intercept,radius:2.2,force:true,mode:'deny-rescue'};
   }
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
