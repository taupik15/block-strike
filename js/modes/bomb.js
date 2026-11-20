/* Local Bomb Defusal uses the same round, HUD, weapon and bot entry points. */
const BombMode=(()=>{
 const plantTime=3,interactDistance=1.65,blastRadius=12,safeRadius=13.5;
 let fuse=45;
 let phase='inactive',carrier=null,position=null,site=null,timer=0,beep=0;
 let action=null,held=false,model=null,view=null,serial=0,ctBombKnown=false,selected=false,dropFlight=null,holdSource=null;
 let recoveryField=null,recoverer=null,recoverAt=0;
 let sites=[],graph=null,retake=null,retakeBackup=null,retakeAt=0,groups=[],ctGroups=[],guardLookCache=new WeakMap(),escapeField=null,bombField=null,plan=null,sitePressure=new Map(),ctPressure=new Map(),lastAttack=null,attackStreak=0,roundWinner='',result='',teamScores={CT:0,T:0},losses={CT:0,T:0};
 const human={get team(){return playerTeam},get pos(){return P.pos},get dead(){return P.hp<=0},get kit(){return defuseKit}};
 const active=()=>activeMapData?.local?.mode==='bomb';
 const planted=()=>phase==='planted';
 const alive=actor=>!!actor&&!actor.dead;
 const pos=actor=>actor===human?P.pos:actor.g.position;
 const clearAction=()=>{
  action=null;
  if(view){view.visible=selected; if(selected)playC4('idle1',true);}
 };
 const locked=()=>action?.actor===human;
 const speedTime=actor=>(actor===human?defuseKit:actor.defuseKit)?5:10;
 function siteAt(p,crouching=false){
  const h=BSP.toHammer(bspCol.T,p.toArray());if(crouching)h[2]+=18;
  return sites.find(s=>LocalBSP.inSite(s,h));
 }
 function marker(position,planted){
  clearMarker();
  const box=new THREE.Group(),token=++serial;model=box;
  box.position.copy(position);box.position.y=Phase9.itemFloor?Phase9.itemFloor(position):position.y-(window.bspCol?36*bspCol.T.k:0);S.add(box);
  // Model identity differs for dropped backpack and planted bomb. Only the
  // planted model has a blinking status light; no persistent generic cube.
  const dot=new THREE.Sprite(new THREE.SpriteMaterial({color:planted?0xff412e:0xffbb57,depthTest:true,depthWrite:false}));
  dot.scale.set(.065,.065,1);dot.position.y=.15;box.add(dot);
  Phase9.loadWorldModel(planted?'c4':'backpack').then(source=>{
   if(!source||token!==serial)return;
   const item=source.clone(true);Phase9.orientGoldSrcWorld(item);box.add(item);
   const floor=box.position.y;box.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(item);
   if(Number.isFinite(bounds.min.y)){item.position.y+=floor+.015-bounds.min.y;dot.position.y=Math.max(.06,bounds.max.y-bounds.min.y+.025);}
   dot.visible=planted;box.userData.hasModel=true;
  });
 }
 function clearMarker(){
  serial++;
  if(!model)return;
  model.children.find(c=>c.isSprite)?.material.dispose();
  model.parent?.remove(model);model=null;
 }
 function clearScene(){
  held=false;holdSource=null;selected=false;dropFlight=null;clearAction();clearMarker();
  if(view){
   const mixer=view.userData.mixer;mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot());
   const skeletons=new Set();view.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton)});skeletons.forEach(s=>s.dispose());
   viewScene.remove(view);view=null;
  }
 }
 function prepare(data){
  lastAttack=null;attackStreak=0;clearScene();phase='inactive';fuse=window.PhaseMenu15?.rules.c4Seconds||45;
  graph=data?(data.graph||LocalBSPNav.build(data.col)):null;guardLookCache=new WeakMap();
  sites=(data?.sites||[]).map(zone=>{
   const center=zone.mins.map((n,i)=>(n+zone.maxs[i])*.5+zone.origin[i]);
   const nodes=graph.nodes.filter(n=>n.edges.length&&(!graph.commonReachable||graph.commonReachable.has(n.id))&&LocalBSP.inSite(zone,n.h));
   nodes.sort((a,b)=>Math.hypot(...a.h.map((n,i)=>n-center[i]))-Math.hypot(...b.h.map((n,i)=>n-center[i])));
   const goal=V(...(nodes[0]?.pos||BSP.toGame(data.col.T,center)));
   // Reserve distinct in-site stations first, then nearby approaches.
   const stations=[];const preferred=nodes.slice().sort((a,b)=>Number(!!b.camp)-Number(!!a.camp));for(const n of preferred){const p=V(...n.pos);if(stations.every(q=>q.distanceTo(p)>1.35))stations.push(p);if(stations.length>=8)break}
   const approaches=guardPoints(goal,3,8).filter(p=>stations.every(q=>q.distanceTo(p)>1.35));
   return {...zone,goal,guards:[...stations,...approaches]};
  });
  teamScores={CT:0,T:0};losses={CT:0,T:0};roundWinner='';result='';plan=null;sitePressure.clear();ctPressure.clear();
 }
 function roundStart(){
  clearScene();recoveryField=null;recoverer=null;recoverAt=0;
  phase=active()?'carried':'inactive';
  carrier=null;position=null;site=null;timer=beep=0;ctBombKnown=false;retake=null;retakeBackup=null;retakeAt=0;groups=[];ctGroups=[];escapeField=bombField=null;
  roundWinner='';result='';plan=null;ctPressure.clear();
  for(const [id,score] of sitePressure)sitePressure.set(id,score*.45);
  if(active()){
   const terrorists=bots.filter(b=>b.team==='T');
   carrier=playerTeam==='T'&&(round===1||round%2===1)?human:terrorists[(round-1)%terrorists.length]||human;
   for(const bot of bots){bot.localRoute=null;bot.remoteDoorRoute=null;bot.remoteDoorRetry=0;bot.bombRouteInfo=null;bot.bombEscaping=false;bot.retakeFailedUntil=0;bot.siteAssignment=null;bot.objectiveRole=null;bot.siteSlot=null;bot.guardStation=null;}
   assignTeams();
  }
 }
 function groundOrigin(actor){
  const p=pos(actor).clone(),h=BSP.toHammer(bspCol.T,p.toArray());
  if(actor===human?Phase9.crouching:actor.crouching)h[2]+=18;
  const floor=LocalBSPNav.floorAt(bspCol,h,300);
  return floor?V(...BSP.toGame(bspCol.T,floor)):p;
 }
 function drop(actor,voluntary=false){
  if(phase!=='carried'||carrier!==actor||!actor)return false;
  dropFlight=voluntary&&actor===human&&Phase9.tossItem?Phase9.tossItem(P.pos,P.yaw,Phase9.crouching):null;
  position=dropFlight?dropFlight.landing:groundOrigin(actor);
  selected=false;held=false;holdSource=null;carrier=null;phase='dropped';recoveryField=null;recoverer=null;recoverAt=0;clearAction();
  marker(position,false);if(dropFlight&&model)model.position.copy(dropFlight.points[0]);say('C4 DROPPED');return true;
 }
 function pickup(actor){
  if(dropFlight||phase!=='dropped'||actor.team!=='T'||!alive(actor)||!canReach(actor))return false;
  carrier=actor;phase='carried';position=null;clearMarker();
  if(actor!==human){actor.objectiveRole='carrier';actor.siteAssignment=plan?.attack;actor.localRoute=null;}
  if(actor===human)say('C4 PICKED UP');
  return true;
 }
 function canReach(actor){
  if(!position||pos(actor).distanceTo(position)>interactDistance)return false;
  let from=BSP.toHammer(bspCol.T,pos(actor).toArray());const to=BSP.toHammer(bspCol.T,position.toArray());
  let hull=bspCol;
  if((actor===human?Phase9.crouching:actor.crouching)&&Number.isInteger(bspCol.crouchHead)){
   const stand=[from[0],from[1],from[2]+18];
   if(!BSP.traceAll(bspCol,stand,stand).startsolid)from=stand;
   else {hull={...bspCol,head:bspCol.crouchHead};to[2]-=18;}
  }
  return !BSP.traceAll(hull,from,to).hit;
 }
 function defuseLook(eye,yaw){
  if(!position)return {yaw,pitch:0};
  const target=position.clone();target.y=(model?.position.y??(Phase9.itemFloor?Phase9.itemFloor(position):position.y))+.06;
  const delta=target.sub(eye),horizontal=Math.hypot(delta.x,delta.z);
  return {yaw:horizontal>.0001?Math.atan2(-delta.x,-delta.z):yaw,pitch:Math.max(-1.45,Math.min(1.45,Math.atan2(delta.y,horizontal)))};
 }
 function faceBomb(bot){const p=pos(bot),k=window.bspCol?.T.k||.02,eye=p.clone();eye.y+=window.bspCol?(28-(bot.crouching?16:0))*k:bot.crouching? .95:1.35;const aim=defuseLook(eye,bot.g.rotation.y);bot.g.rotation.y=aim.yaw;bot.aimPitch=aim.pitch;return aim;}
 function progressFor(bot=null,first=false,spectating=false){
  if(!action||!alive(action.actor)||phase==='resolved'||roundWait)return null;
  if(spectating?(!first||!bot||action.actor!==bot):action.actor!==human)return null;
  return {type:action.type,value:Math.max(0,Math.min(1,action.time/action.duration))};
 }
 function updateProgressHud(){
  const el=$('bombProgress'),wrap=$('bombActionProgress');if(!el||!wrap)return;
  const spec=Phase13.isSpectating(),progress=active()?progressFor(spec?Phase13.getObserved?.():null,spec&&Phase13.isFirstPerson?.(),spec):null;
  wrap.classList.toggle('hidden',!progress);el.value=progress?.value||0;
  if(progress){$('bombActionLabel').textContent=progress.type==='defuse'?'DEFUSING BOMB':'PLANTING BOMB';el.setAttribute('aria-label',progress.type==='defuse'?'Defusing bomb':'Planting bomb');}
 }
 function options(actor){if(typeof freezeLeft!=='undefined'&&freezeLeft>0)return null;
  if(!alive(actor)||(actor!==human&&actor.blinded>0))return null;
  if(actor===human&&Phase9.handlingGrenade())return null;
  if(!dropFlight&&phase==='dropped'&&actor.team==='T'&&canReach(actor))return 'pickup';
  if(phase==='carried'&&carrier===actor&&siteAt(pos(actor),actor===human?Phase9.crouching:actor.crouching)&&(actor===human?P.on:actor.onGround))return 'plant';
  if(phase==='planted'&&actor.team==='CT'&&(actor===human?P.on:actor.onGround)!==false&&canReach(actor))return 'defuse';
  return null;
 }
 // C4 viewmodel is used only when planting, never when disarming.
 function playC4(name,loop=false){
  if(!weaponModels.c4||!viewScene)return;
  if(!view){
   const gltf=weaponModels.c4,object=cloneViewmodel(gltf,'c4');
   view=new THREE.Group();view.userData.viewAsset='c4';view.add(object);Phase13.applyHand(view);
   view.userData.mixer=new THREE.AnimationMixer(object);
   view.userData.clips=gltf.animations;
   viewScene.add(view);
  }
  const clip=view.userData.clips.find(c=>c.name===name);
  if(clip){const mixer=view.userData.mixer;mixer.stopAllAction();const a=mixer.clipAction(clip);a.reset().setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);if(name==='pressbutton')a.setDuration(plantTime);a.clampWhenFinished=!loop;a.play();mixer.update(0);}
  view.userData.clip=gltfClip(view,name);
  view.visible=true;
 }
 function gltfClip(v,name){return v.userData.clips?.find(c=>c.name===name)}
 function selectC4(){if(!active()||phase!=='carried'||carrier!==human||inputBlocked()||roundWait||locked()||!weaponModels.c4)return false;
  if(selected)return true;Phase9.cancelGrenade();Phase9.lowerShield?.();WeaponModes15C.cancel();pendingKnife=pendingAutoReload=null;reloading=0;shotgunReload=null;reloadSfxToken++;fh=fl=secondaryHeld=false;aiming=false;zoomIdx=0;syncAim();selected=true;held=false;holdSource=null;playC4('draw');return true;}
 function deselect(){if(!selected)return;selected=false;held=false;holdSource=null;if(locked())clearAction();if(view)view.visible=false;}
 function holdFrom(on,source){if(!on){if(holdSource===source){holdSource=null;return hold(false)}return false;}
  const type=options(human);if(source==='fire'&&(!selected||type!=='plant')||source==='use'&&type==='plant')return false;
  if(held&&holdSource!==source)return false;holdSource=source;return hold(true);}
 function start(actor,type){
  if(type==='pickup')return pickup(actor);
  if(action||!type||type==='defuse'&&actor!==human&&timer<=speedTime(actor)+.15)return false;
  action={actor,type,time:0,duration:type==='plant'?plantTime:speedTime(actor),origin:pos(actor).clone()};
  if(actor===human){
   if(reloading){reloading=0;shotgunReload=null;reloadSfxToken++;playWeaponAnimation('idle')}
   if(aiming){aiming=false;zoomIdx=0;syncAim()}
   if(type!=='plant'){fh=fl=false;P.vel=[0,0];}secondaryHeld=false;WeaponModes15C.cancel();
   if(type==='plant')playC4('pressbutton');else if(type==='defuse'){if(view)view.visible=false;if(vm)vm.visible=true;playWeaponAnimation('idle');}
  }
  if(actor!==human){
   // Keep the same hull while interacting on a slope or at a step edge.
   if(type==='defuse'){actor.vel=[0,0];faceBomb(actor);}
   setAnim(actor,actor.crouching?'crouch_idle':'idle1');
   actor.animHoldUntil=performance.now()/1000+action.duration;
  }
  if(typeof playWorldSound==='function')playWorldSound(type==='plant'?'c4_click.wav':'c4_disarm.wav',pos(actor),.38);else playOriginalSound(type==='plant'?'c4_click.wav':'c4_disarm.wav',.38);
  if(type==='defuse')Phase10.soundEvent('CT',pos(actor),'defuse',1.05);
  return true;
 }
 function hold(on){
  held=on;
  if(!on&&locked())clearAction();
  return on&&active()&&!roundWait&&!inputBlocked()&&start(human,options(human));
 }
 function finish(winner,reason){
  if(phase==='resolved')return;
  clearAction();phase='resolved';roundWinner=winner;result=reason;
  if(!winner){say(reason);roundWait=4;return}
  teamScores[winner]++;
  Phase10.roundEnd(winner,null,reason==='TIME EXPIRED',reason);
  say(reason+' · '+winner+' WIN');roundWait=4;
 }
 function objectiveCash(actor){
  if(actor===human)money=Math.min(16000,money+300);
  else Phase10.creditBot(actor,300,'C4 OBJECTIVE');
 }
 function plant(actor){
  site=siteAt(pos(actor),actor===human?Phase9.crouching:actor.crouching);if(!site){clearAction();return}position=groundOrigin(actor);carrier=null;
  if(actor===human)fh=fl=false;selected=false;held=false;holdSource=null;phase='planted';timer=fuse;beep=0;ctBombKnown=false;buyTime=0;groups=guardPoints(position,2.5,6);ctGroups=guardPoints(position,4.5,9);clearAction();
  // Build two reverse shortest-path fields once, for estimated travel to a
  // legal escape position and to a point within interaction range of C4.
  if(graph){
   const reachable=graph.nodes.filter(n=>n.valid!==false&&n.edges.length);
   const safe=reachable.filter(n=>V(...n.pos).distanceTo(position)>=safeRadius);
   const close=reachable.filter(n=>V(...n.pos).distanceTo(position)<=interactDistance&&LocalBSPNav.walkable(graph.col,n.h,BSP.toHammer(graph.col.T,position.toArray()),100));
   if(!close.length){const node=LocalBSPNav.near(graph,position,graph.col,null,graph.teamAllowed?.CT);if(node)close.push(node)}
   escapeField=Object.fromEntries(['CT','T'].map(team=>[team,LocalBSPNav.distanceField(graph,safe.map(n=>n.id),team)]));
   bombField=LocalBSPNav.distanceField(graph,close.map(n=>n.id),'CT');
  }
  marker(position,true);objectiveCash(actor);playOriginalSound('c4_plant.wav',.62);say('BOMB PLANTED · '+site.id);
 }
 function defuse(actor){
  objectiveCash(actor);clearMarker();playOriginalSound('c4_disarmed.wav',.63);finish('CT','BOMB DEFUSED');
 }
 function explode(){
  const origin=position.clone();origin.y-=.45;
  finish('T','BOMB EXPLODED');clearMarker();
  if(typeof playWorldSound==='function')playWorldSound('c4_explode1.wav',origin,.82);else playOriginalSound('c4_explode1.wav',.82);
  GrenadeFX15B.init(S);GrenadeFX15B.burst('c4',origin);
  const damage=p=>Math.max(0,390*(1-p.distanceTo(origin)/blastRadius));
  for(const bot of bots)if(alive(bot)&&damage(bot.g.position)>0)damageBot(bot,damage(bot.g.position),'chest',null,false,null,'c4',0,'explosion');
  if(P.hp>0&&damage(P.pos)>0)hurt(damage(P.pos),origin,'explosion',null,'chest','c4');
 }
 function aliveTeam(team){return playerTeam===team&&P.hp>0||bots.some(b=>b.team===team&&!b.dead)}
 function update(dt){
  if(!active()||roundWait||phase==='resolved')return;
  if(phase==='carried'&&!alive(carrier))drop(carrier);
  if(dropFlight&&model&&!Phase9.advanceDropFlight(model,dropFlight,dt))dropFlight=null;
  if(selected&&view?.visible&&!locked()){view.userData.mixer.update(dt);const clip=view.userData.clip;if(clip?.name==='draw'&&view.userData.mixer.clipAction(clip).time>=clip.duration-.001)playC4('idle1',true);}
  if(action){
   const {actor,type,origin}=action;
   if(options(actor)!==type||pos(actor).distanceToSquared(origin)>.23||actor===human&&(!held||inputBlocked())||actor!==human&&type==='defuse'&&timer<=action.duration-action.time){
    // Losing contact must not silently restart a held human defuse in the same tick.
    if(actor===human&&type==='defuse'){held=false;holdSource=null;}
    clearAction();
   }
  }
  if(phase==='planted'){
   // Resolve deadlines in chronological order. Explosion wins an exact tie.
   if(timer<=dt&&action?.type==='defuse'&&action.duration-action.time<timer){timer-=action.duration-action.time;defuse(action.actor);return;}
   timer=Math.max(0,timer-dt);
   const blink=model?.children.find(c=>c.isSprite);if(blink&&model.userData.hasModel)blink.visible=beep<.12;
   if(timer<=0){explode();return}
   beep-=dt;
   if(beep<=0){
    const fraction=timer/fuse,stage=Math.max(1,Math.min(5,1+Math.floor((1-fraction)*5)));
    beep=.17+.95*fraction;
    if(typeof playWorldSound==='function')playWorldSound('c4_beep'+stage+'.wav',position,.46);else playOriginalSound('c4_beep'+stage+'.wav',.46/(1+P.pos.distanceTo(position)*.12));
   }
  }
  if(!action&&held&&!inputBlocked()){const use=options(human);if((holdSource!=='fire'||selected&&use==='plant')&&(holdSource!=='use'||use!=='plant'))start(human,use);}
  if(!action){
   const actors=bots.filter(alive);
   if(phase==='dropped')actors.some(pickup);
   else if(phase==='carried'&&carrier!==human&&options(carrier)==='plant')start(carrier,'plant');
   else if(phase==='planted'){
    const bot=actors.filter(b=>options(b)==='defuse'&&timer>speedTime(b)+.15&&!b.bombEscaping).sort((a,b)=>speedTime(a)-speedTime(b))[0];
    if(bot)start(bot,'defuse');
   }
  }
  if(action){
   action.time+=dt;
   if(locked()&&action.type==='plant'&&view?.visible){if(vm)vm.visible=false;view.userData.mixer.update(dt)}
   if(action.time>=action.duration){
    const {actor,type}=action;
    if(type==='plant')plant(actor);else{defuse(actor);return}
   }
  }
  const ct=aliveTeam('CT'),t=aliveTeam('T');
  if(!ct&&!t&&phase!=='planted')finish('','ROUND DRAW');
  else if(!ct)finish('T',phase==='planted'?'CT ELIMINATED · BOMB SECURED':'CT ELIMINATED');
  else if(phase!=='planted'&&!t)finish('CT','T ELIMINATED');
  else if(phase!=='planted'&&roundTime<=0)finish('CT','TIME EXPIRED');
 }
 function guardPoints(anchor,min,max){
  const buckets=Array(8).fill(null),score=Array(8).fill(Infinity);
  for(const node of graph?.nodes||[]){
   if(node.valid===false||!node.edges.length||graph.commonReachable&&!graph.commonReachable.has(node.id)||Math.abs(node.pos[1]-anchor.y)>1.8)continue;
   const x=node.pos[0]-anchor.x,z=node.pos[2]-anchor.z,d=Math.hypot(x,z);
   if(d<min||d>max)continue;
   const sector=Math.floor((Math.atan2(z,x)+Math.PI)*4/Math.PI)%8,cost=Math.abs(d-(min+max)*.5)-(node.camp?1.8:0);
   if(cost<score[sector]){score[sector]=cost;buckets[sector]=node.pos}
  }
  return buckets.filter(Boolean).map(p=>V(...p));
 }
 function cover(points,bot,anchor,fallbackRadius=2,defensive=false){
  let node=null;
  if(defensive&&graph){
   const t=performance.now()/1000,weapon=((bot.emptyPrimary?.mag>0||bot.emptyPrimary?.res>0)?bot.emptyPrimary.id:bot.weaponId),cache=bot.guardStation;
   if(cache?.graph===graph&&cache.anchor===anchor&&cache.points===points&&cache.weapon===weapon&&t<cache.until)node=graph.nodes[cache.id]||null;
   else{node=LocalBSPNav.defenseStation(graph,bot,anchor,points,bots,phase==='planted'&&bot.team==='T'?7:9);if(cache?.id!==node?.id){bot.guardYaw=null;bot.guardScanAt=0;bot.guardBaseYaw=null;}bot.guardStation={graph,anchor,points,weapon,id:node?.id??-1,active:true,until:t+3+(bot.teamIndex||0)%4*.21};}
  }else bot.guardStation=null;
  const spot=node?V(...node.pos):defensive&&graph?null:points.length?points[(bot.siteSlot??bot.teamIndex??0)%points.length]:null;
  const point=spot||anchor;
  // Cache only metadata look directions: a fallback anchor can change by objective.
  const camp=node||graph?.nodes.find(n=>n.camp&&V(...n.pos).distanceToSquared(point)<.35);
  let looks=camp&&guardLookCache.get(camp);
  if(!looks){looks=[];
   for(const angles of camp?.campLooks||[]){const a=angles[1]*Math.PI/180;looks.push(V(...BSP.toGame(graph.col.T,[camp.h[0]+Math.cos(a)*500,camp.h[1]+Math.sin(a)*500,camp.h[2]])))}
   if(camp)guardLookCache.set(camp,looks);
  }
  return {pos:point,radius:node?(node.crouch?.5:.8):spot?1.1:fallbackRadius,looks:looks.length?looks:[anchor],stationId:node?.id??null,stationCrouch:!!node?.crouch};
 }
 function routeInfo(bot){
  const t=performance.now()/1000,p=pos(bot);let info=bot.bombRouteInfo;
  if(info&&info.anchor===position&&t<info.until&&p.distanceToSquared(info.from)<4)return info;
  const node=graph&&LocalBSPNav.attach(graph,bot),offset=node?p.distanceTo(V(...node.pos)):Infinity;
  const field=escapeField?.[bot.team];
  const escape=node&&field&&field.exit[node.id]>=0?V(...graph.nodes[field.exit[node.id]].pos):null;
  const speed=Math.max(.5,BSP.maxSpeed(bot.weaponId,{scale:window.bspCol?.T.k||.02,crouch:!!bot.crouching}));
  const bombDist=canReach(bot)?0:node&&bombField?offset+bombField.dist[node.id]:Infinity;
  info={anchor:position,from:p.clone(),until:t+.85+(bot.teamIndex%4)*.13,escape,escapeTime:node&&escape? (offset+field.dist[node.id])/speed:Infinity,bombTime:bombDist/speed};
  bot.bombRouteInfo=info;return info;
 }
 function escapeGoal(bot){
  const p=pos(bot),dist=p.distanceTo(position);
  if(dist>=safeRadius){if(timer<=6)bot.bombEscaping=true;return bot.bombEscaping?{pos:p,radius:.5,mode:'escape-bomb',hold:true,force:true,urgent:true}:null;}
  const info=routeInfo(bot);
  // A safe point is outside actual damage radius, plus margin. Start early
  // enough for route travel, including detours, and keep escape sticky.
  if(!bot.bombEscaping&&(dist<safeRadius?timer<=Math.max(3.5,Number.isFinite(info.escapeTime)?info.escapeTime+3:10):timer<=6))bot.bombEscaping=true;
  if(!bot.bombEscaping)return null;
  let goal=info.escape;
  if(!goal&&graph&&!info.fallbackChecked){
   // No safe route: move toward a reachable station farther from the blast.
   const start=LocalBSPNav.attach(graph,bot);if(start){const queue=[start.id],seen=new Set(queue);let best=start;for(let i=0;i<queue.length;i++){const n=graph.nodes[queue[i]];if(V(...n.pos).distanceTo(position)>V(...best.pos).distanceTo(position))best=n;for(const id of n.edges)if(!seen.has(id)&&LocalBSPNav.teamAllows(graph.nodes[id],bot.team)){seen.add(id);queue.push(id)}}goal=V(...best.pos)}
   info.fallbackChecked=true;info.fallback=goal;
  }
  return {pos:goal||info.fallback||p,radius:.55,mode:'escape-bomb',force:true,urgent:true};
 }
 function isDefuser(target){return phase==='planted'&&action?.type==='defuse'&&(action.actor===human?target.isP:target.bot===action.actor)}
 function chooseRetake(){
  const now=performance.now();
  if(action?.type==='defuse')return action.actor===human?null:action.actor;
  const viable=b=>alive(b)&&b.team==='CT'&&!b.blinded&&!b.bombEscaping&&timer>routeInfo(b).bombTime+speedTime(b)+.25;
  const stalled=b=>b.localRoute?.points.length===0&&(b.stuck>.25||b.recoveryTime>0);
  if(retake&&!canReach(retake)&&stalled(retake))retake.retakeFailedUntil=now+3500;
  const cost=b=>routeInfo(b).bombTime+speedTime(b)+(b.retakeFailedUntil>now?8:0);
  const current=viable(retake);
  if(now<retakeAt&&current&&!(retake.retakeFailedUntil>now)&&(!retakeBackup||viable(retakeBackup)))return retake;
  if(now<retakeAt&&!retake)return null;
  const candidates=bots.filter(viable).sort((a,b)=>cost(a)-cost(b));
  const best=candidates[0];
  // Avoid oscillating between two similarly placed CTs. Replace immediately
  // if the current defuser is no longer eligible, or another is substantially faster.
  if(!current||best&&best!==retake&&cost(best)+2<cost(retake))retake=best||null;
  retakeBackup=candidates.find(b=>b!==retake)||null;retakeAt=now+1000;
  return retake;
 }
 // Match roles are stable during a round; CT split by distance with balanced capacity.
 function assignTeams(){
  if(!sites.length)return;
  const ts=bots.filter(b=>b.team==='T'&&!b.dead),cts=bots.filter(b=>b.team==='CT'&&!b.dead);
  const origin=alive(carrier)?pos(carrier):ts[0]?.g.position||sites[0].goal;
  const ratings=sites.map(s=>({s,cost:origin.distanceTo(s.goal)*.18+(sitePressure.get(s.id)||0)*1.3+Math.random()*11+(s.id===lastAttack?Math.min(15,4+attackStreak*3):0)})).sort((a,b)=>a.cost-b.cost);
  const attack=ratings[0].s;attackStreak=attack.id===lastAttack?attackStreak+1:1;lastAttack=attack.id;
  plan={attack:attack.id,next:performance.now()/1000+15};
  const alternate=ratings[1]?.s||attack;
  const escorts=ts.filter(b=>b!==carrier).sort((a,b)=>pos(a).distanceToSquared(origin)-pos(b).distanceToSquared(origin));
  // A human carrier is not the team's movement leader. At most two escorts;
  // entry attackers and scouts have independent, fixed tactical destinations.
  const escortLimit=Math.min(2,Math.floor(escorts.length/4));
  let main=0,scouts=0;
  for(const [i,b] of escorts.entries()){
   b.objectiveRole=i<escortLimit?'escort':i%4===3&&alternate!==attack?'scout':'attacker';
   b.siteAssignment=b.objectiveRole==='scout'?alternate.id:attack.id;
   b.siteSlot=b.objectiveRole==='scout'?scouts++:main++;
  }
  if(carrier!==human&&carrier){carrier.siteAssignment=attack.id;carrier.objectiveRole='carrier'}
  const a=sites[0],b=sites[1]||a;
  cts.sort((x,y)=>(pos(x).distanceTo(a.goal)-pos(x).distanceTo(b.goal))-(pos(y).distanceTo(a.goal)-pos(y).distanceTo(b.goal)));
  for(const [i,bot] of cts.entries()){bot.siteAssignment=(i<Math.ceil(cts.length/2)?a:b).id;bot.objectiveRole='defender';bot.siteSlot=i<Math.ceil(cts.length/2)?i:i-Math.ceil(cts.length/2);bot.flexDefense=cts.length>=6;bot.rotateAt=performance.now()/1000+2+(bot.siteSlot%3)*.35}
 }
  function observe(bot,point,contactId=null){
  if(!active()||phase!=='carried'||!point)return;
  const t=performance.now()/1000;if(t<(bot.nextSiteObservation||0))return;bot.nextSiteObservation=t+1.25;
  const nearest=sites.slice().sort((a,b)=>a.goal.distanceToSquared(point)-b.goal.distanceToSquared(point))[0];
  if(nearest&&nearest.goal.distanceTo(point)<18){if(bot.team==='T')sitePressure.set(nearest.id,Math.min(12,(sitePressure.get(nearest.id)||0)+1));else{let contacts=ctPressure.get(nearest.id);if(!contacts){contacts=new Map();ctPressure.set(nearest.id,contacts)}const key=contactId??bot.botId??bot;for(const [id,known] of ctPressure){for(const [seen,at] of known)if(t-at>=8||id!==nearest.id&&seen===key)known.delete(seen)}contacts.set(key,t)}}
 }
 function radioReserved(bot){
  if(!active()||!bot||bot.dead)return false;
  if(action?.actor===bot)return true;
  if(phase==='planted'&&(bot.bombEscaping||bot.team==='CT'))return bot.bombEscaping||bot===chooseRetake();
  if(phase==='carried'&&bot===carrier&&roundTime<24)return true;
  if(phase==='dropped'&&bot.team==='T')return botGoal(bot)?.mode==='recover-c4';
  return false;
 }
 // Pick the C4 retriever by directed, team-legal travel rather than
 // Euclidean proximity through walls. Cache the field until the C4 moves.
 function chooseRecovery(){
  const t=performance.now()/1000;
  if(graph&&!recoveryField){
   const h=BSP.toHammer(graph.col.T,position.toArray());
   const goals=graph.nodes.filter(n=>LocalBSPNav.teamAllows(n,'T')&&V(...n.pos).distanceTo(position)<=interactDistance&&LocalBSPNav.walkable(graph.col,n.h,h,100));
   if(!goals.length){const n=LocalBSPNav.near(graph,position,graph.col,null,graph.teamAllowed?.T);if(n&&LocalBSPNav.teamAllows(n,'T'))goals.push(n);}
   recoveryField=LocalBSPNav.distanceField(graph,goals.map(n=>n.id),'T');
  }
  const eligible=b=>alive(b)&&b.team==='T'&&!b.blinded;
  if(t<recoverAt&&eligible(recoverer))return recoverer;
  let best=null,cost=Infinity;
  for(const b of bots.filter(eligible)){
   const p=pos(b);let d=p.distanceTo(position);
   if(canReach(b))d=0;
   else if(graph){
    const n=LocalBSPNav.attach(graph,b);d=n?V(...n.pos).distanceTo(p)+recoveryField.dist[n.id]:Infinity;
   }
   if(b.recoveryTime>0&&b.localRoute?.points.length===0)d+=8;
   if(d<cost){best=b;cost=d;}
  }
  recoverer=best;recoverAt=t+1;return recoverer;
 }
 function botGoal(bot){
  if(!active()||roundWait)return null;
  if(action?.actor===bot)return {pos:pos(bot),radius:1,hold:true,busy:true};
  if(phase==='planted'){
   const primary=bot.team==='CT'?chooseRetake():null;
   if(bot===primary){
    const threat=bot.visibleEnemy,dist=threat&&pos(bot).distanceTo(threat.pos);
    if(threat&&dist<16&&timer>routeInfo(bot).bombTime+speedTime(bot)+3.5)return {pos:pos(bot),radius:.5,hold:true,urgent:true,force:true,mode:'retake-clear'};
    return {pos:position,radius:canReach(bot)?interactDistance:.25,force:true,urgent:true,mode:'defuse'};
   }
   const flee=escapeGoal(bot);
   if(flee)return flee;
   // Any T with a visually confirmed defuser fights from a useful position;
   // no wall vision, no unconditional shared enemy position.
   if(bot.team==='T'&&bot.visibleEnemy&&isDefuser(bot.visibleEnemy))return {pos:pos(bot),radius:.5,hold:true,urgent:true,mode:'guard-bomb'};
   if(bot.team==='T'&&!bot.visibleEnemy&&bot.heard?.type==='defuse'){
    const age=performance.now()/1000-bot.heard.t;
    if(age<1.4)return {pos:pos(bot),radius:.5,hold:true,urgent:true,mode:'guard-bomb'};
    if(age<2.5)return {pos:bot.heard.pos,radius:1.5,force:true,mode:'investigate-defuse'};
   }
   return {...cover(bot.team==='CT'?(bot===retakeBackup?groups:ctGroups):groups,bot,position,bot.team==='CT'?2.8:4.7,true),mode:bot.team==='CT'?'protect-defuser':'guard-bomb'};
  }
  if(phase==='dropped'&&bot.team==='T'){
   const closest=chooseRecovery();
   if(bot===closest)return {pos:position,radius:.75,force:true,urgent:true,mode:'recover-c4'};
  }
  if(!plan)assignTeams();
  if(bot.team==='T'&&phase==='carried'){
   // Only observed combat influences replanning. Do not read hidden enemy positions.
   if(carrier!==human&&alive(carrier)&&plan&&performance.now()/1000>plan.next&&roundTime>35){
    plan.next=performance.now()/1000+12;
    const current=sites.find(s=>s.id===plan.attack),alternative=sites.filter(s=>s!==current).sort((a,b)=>(sitePressure.get(a.id)||0)-(sitePressure.get(b.id)||0))[0];
    if(current&&alternative&&(sitePressure.get(current.id)||0)>(sitePressure.get(alternative.id)||0)+3&&pos(carrier).distanceTo(current.goal)>5){plan.attack=alternative.id;for(const b of bots)if(b.team==='T'){b.siteAssignment=b.objectiveRole==='scout'?current.id:alternative.id;b.localRoute=null}}
   }
   if(bot===carrier){const target=sites.find(s=>s.id===plan?.attack)||sites[0];return target?{pos:target.goal,radius:.65,force:true,urgent:roundTime<24,mode:'plant'}:null}
   if(carrier===human&&alive(human)&&bot.objectiveRole==='escort'&&bot.radioOrder?.mode!=='advance')return {pos:P.pos,radius:3.1+(bot.teamIndex%3),mode:'escort'};
  }
  // Only a limited flexible defender may rotate toward recent sightings.
  if(bot.team==='CT'&&bot.flexDefense&&!bot.radioOrder&&performance.now()/1000>=(bot.rotateAt||0)){
   const t=performance.now()/1000;bot.rotateAt=t+2.5;
   const pressure=id=>{const contacts=ctPressure.get(id);return contacts?[...contacts.values()].filter(at=>t-at<8).length:0};
   const other=sites.find(s=>s.id!==bot.siteAssignment&&pressure(s.id)>=pressure(bot.siteAssignment)+2);
   const same=bots.filter(b=>alive(b)&&b.team==='CT'&&b.siteAssignment===bot.siteAssignment);
   // Never vacate a site or rotate away from an active visible fight. Reserve at least two defenders.
   if(other&&same.length>2&&!bot.visibleEnemy){
    const incoming=bots.filter(b=>alive(b)&&b.team==='CT'&&b.siteAssignment===other.id);
    const limit=Math.max(3,Math.ceil((same.length+incoming.length)*.75));
    // Select an unused station instead of piling rotating defenders on one node.
    if(incoming.length<limit){const used=new Set(incoming.map(b=>b.siteSlot%Math.max(1,other.guards.length)));let slot=0;while(slot<other.guards.length&&used.has(slot))slot++;
     if(slot<other.guards.length){bot.siteAssignment=other.id;bot.siteSlot=slot;bot.localRoute=null;bot.guardYaw=null;bot.rotateAt=t+10;}}
   }
  }
  const target=sites.find(s=>s.id===bot.siteAssignment)||sites[0];
  if(!target)return null;
  return {...cover(target.guards,bot,target.goal,2,bot.team==='CT'),mode:bot.team==='CT'?'defend':'advance',site:target.id};
 }
 function resumeAdvance(bot){if(active()&&bot.team==='T'&&bot.objectiveRole==='escort'){bot.objectiveRole='attacker';bot.siteAssignment=plan?.attack||bot.siteAssignment;}return botGoal(bot)}
 function route(bot,goal,stationId=null,allowRemote=true){const point=V(goal.x,goal.y,goal.z);return graph?LocalBSPNav.steer(graph,bot,point,performance.now()/1000,stationId,allowRemote):point}
 function hud(){
  const enabled=active()&&phase!=='inactive',status=$('bombStatus'),button=$('bombUse'),dropButton=$('bombDrop');
  document.body.classList.toggle('bomb-mode',enabled);
  GoldSrcSprites.updateBomb(enabled?phase:'inactive',enabled&&playerTeam==='CT'&&defuseKit,enabled&&carrier===human,playerTeam);
  $('kitStatus')?.classList.toggle('hidden',!enabled||playerTeam!=='CT'||!defuseKit||P.hp<=0);
  if(!enabled){$('c4Chip')?.classList.add('hidden');updateProgressHud();return;}
  const use=options(human);
  button.textContent=use==='pickup'?'⬇':'⚙';button.setAttribute('aria-label',use==='pickup'?'Take C4':'Hold to defuse');
  button.classList.toggle('hidden',!isT||!use||use==='plant'||roundWait>0||Phase13.isSpectating());
  dropButton?.classList.add('hidden');const chip=$('c4Chip');if(chip){chip.classList.toggle('hidden',carrier!==human||phase!=='carried'||P.hp<=0);chip.classList.toggle('on',selected);for(const gun of $('chips').querySelectorAll('.chip:not(#c4Chip)'))gun.classList.toggle('on',!selected&&Number(gun.dataset.index)===wi);}
  updateProgressHud();
  status.textContent=result||(
   phase==='planted'?'C4 '+(playerTeam==='T'||ctBombKnown?site.id+' · ':'')+Math.ceil(timer)+'s':
   phase==='dropped'&&playerTeam==='T'?'C4 DROPPED':
   carrier===human?'C4 · '+(selected?'EQUIPPED':'CARRIED'):
   playerTeam==='CT'?(defuseKit?'DEFUSE KIT · 5s':'DEFUSE · 10s'):'C4 CARRIED BY TEAMMATE'
  );
  const roundLabel=$('bombScore');
  roundLabel.textContent='CT '+teamScores.CT+' : '+teamScores.T+' T';
 }
 // T gets their team's C4 position. CT learns the planted position only
 // from a nearby unobstructed teammate observation, never from a hidden carrier.
 function radar(){
  if(!active())return [];
  const points=sites.map(s=>[s.goal,s.id]);
  if(playerTeam==='T'){
   if(phase==='carried'&&carrier!==human&&alive(carrier))points.push([pos(carrier),'C4 carrier']);
   if(position&&['dropped','planted'].includes(phase))points.push([position,'C4']);
  }else if(phase==='planted'&&position){
   if(!ctBombKnown&&Phase9.canSeeItem){
    const candidates=[...(P.hp>0?[{p:P.pos,crouch:Phase9.crouching}]:[]),...bots.filter(b=>b.team==='CT'&&alive(b)).map(b=>({p:pos(b),crouch:b.crouching}))];
    ctBombKnown=candidates.some(({p,crouch})=>p.distanceToSquared(position)<144&&!Phase9.blocksSight(p,position,{startCrouch:!!crouch,endItem:true})&&Phase9.canSeeItem(p,position,crouch));
   }
   if(ctBombKnown)points.push([position,'C4']);
  }
  return points;
 }
 return {active,planted,isCarrier:bot=>phase==='carried'&&carrier===bot,isPlanting:bot=>action?.type==='plant'&&action.actor===bot,isDefusing:bot=>action?.type==='defuse'&&action.actor===bot,prepare,roundStart,dropHuman:()=>drop(human,true),hold,holdUse:on=>holdFrom(on,'use'),holdFire:on=>holdFrom(on,'fire'),selected:()=>selected,selectC4,deselect,hasHumanC4:()=>phase==='carried'&&carrier===human,humanDefusing:()=>locked()&&action.type==='defuse',bombPosition:()=>position,locked,defuseLook,faceBomb,progressFor,updateProgressHud,getViewmodel:()=>view?.visible&&(selected||locked()&&action.type==='plant')?view:null,resetInput:()=>{holdSource=null;hold(false)},update,hud,radar,botGoal,route,observe,radioReserved,resumeAdvance,isDefuser,
  state:()=>({phase,attack:plan?.attack,carrier:carrier===human?'player':carrier?.botId,site:site?.id,timer,retake:retake?.botId,retakeBackup:retakeBackup?.botId,action:action?.type,duration:action?.duration,roundWinner,result,teamScores:{...teamScores}})};
})();
