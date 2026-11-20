/* BLOCK STRIKE TAHAP 10: match configuration, orders, team AI, radio audio,
 * scoreboard roster, and lightweight GoldSrc visual effects.
 * Loaded after game-systems9; no backend or CDN required.
 */
const Phase10=(()=>{
 'use strict';
 const SETTINGS_KEY='block-strike-match-tahap10-v1';
 const PROFILES={
  noob:{label:'Noob',reaction:1.20,aim:.43,range:.72,speed:1,vision:29,scan:.48,hearing:6},
  easy:{label:'Easy',reaction:.95,aim:.63,range:.80,speed:1,vision:35,scan:.40,hearing:8},
  normal:{label:'Normal',reaction:.50,aim:1,range:1,speed:1,vision:44,scan:.29,hearing:13},
  hard:{label:'Hard',reaction:.36,aim:1.16,range:1.08,speed:1,vision:49,scan:.25,hearing:16},
  expert:{label:'Expert',reaction:.20,aim:1.28,range:1.12,speed:1,vision:53,scan:.20,hearing:19}
 };
 let config={players:16,difficulty:'normal',followers:3},roster=[],statCache=new Map(),playerDeaths=0,roundWinner=null;
 let lossStreak={CT:0,T:0},teamEco={CT:false,T:false};
 let matchStart=0,grenadeBudget={CT:-100,T:-100},radioMode=null,radioOpen=false,radioLast=-100,botVoiceLast=-100,radioSeq=0,voiceEpoch=0,voiceRequest=0;
 const activeVoices=new Set(),radioIcons=new Map();
 const voiceCache=new Map(),textureCache=new Map(),effects=[],sounds=[];
 const CS16_RADIO_WAV=new Set(["blow", "bombdef", "bombpl", "circleback", "clear", "com_followcom", "com_getinpos", "com_go", "com_reportin", "ct_affirm", "ct_backup", "ct_coverme", "ct_enemys", "ct_fireinhole", "ct_imhit", "ct_inpos", "ct_point", "ct_reportingin", "ctwin", "elim", "enemydown", "fallback", "fireassis", "flankthem", "followme", "getout", "go", "hitassist", "hosdown", "letsgo", "locknload", "matedown", "meetme", "moveout", "negative", "position", "regroup", "rescued", "roger", "rounddraw", "sticktog", "stormfront", "takepoint", "terwin", "vip"]);

 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const now=()=>performance.now()/1000;
 const safeNum=n=>Number.isFinite(+n)?Math.floor(+n):16;
 function setConfig(patch,persist=true){
  const players=clamp(safeNum(patch.players??config.players),2,32);
  const difficulty=Object.hasOwn(PROFILES,patch.difficulty)?patch.difficulty:config.difficulty;
  const followers=clamp(Number.isFinite(+patch.followers)?Math.floor(+patch.followers):config.followers,1,7);
  config={players,difficulty,followers};
  const count=$('matchPlayers'),diff=$('matchDifficulty');if(count)count.value=String(players);if(diff)diff.value=difficulty;const follow=$('matchFollowers');if(follow)follow.value=String(followers);
  if(persist){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(config))}catch(e){}}
  preview();return config;
 }
 function counts(team=playerTeam){
  const friends=Math.ceil(config.players/2),foes=config.players-friends;
  return team==='CT'?{CT:friends,T:foes,allies:friends-1,enemies:foes,botCount:config.players-1}:{CT:foes,T:friends,allies:friends-1,enemies:foes,botCount:config.players-1};
 }
 function preview(){
  const c=counts(playerTeam);if($('matchTeamPreview'))$('matchTeamPreview').textContent=`CT ${c.CT} · T ${c.T} · ${c.botCount} bots · ${PROFILES[config.difficulty].label}`;
  if($('matchPerformanceHint'))$('matchPerformanceHint').textContent=config.players>24?'Eksperimental: 25–32 karakter, FPS bergantung perangkat dan peta.':config.players>16?'Pertandingan besar: AI dan grafis memakai pembaruan bertingkat.':'Jumlah termasuk 1 pemain manusia; sisanya bot.';
 }
 function initMatchSettings(){
  try{const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');if(saved&&typeof saved==='object')setConfig(saved,false)}catch(e){}
  setConfig(config,false);
  $('matchPlayers')?.addEventListener('input',e=>{if(e.target.value==='')return;setConfig({players:e.target.value})});
  $('matchPlayers')?.addEventListener('change',e=>setConfig({players:e.target.value}));
  $('matchDifficulty')?.addEventListener('change',e=>setConfig({difficulty:e.target.value}));
  $('matchFollowers')?.addEventListener('change',e=>setConfig({followers:e.target.value}));
  document.querySelectorAll('[data-players]').forEach(button=>button.addEventListener('click',()=>setConfig({players:+button.dataset.players})));
  document.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>queueMicrotask(preview)));
 }
 function resetMatch(){lossStreak={CT:0,T:0};teamEco={CT:false,T:false};resetVoices();radioSeq++;sounds.length=0;statCache.clear();roster=[];playerDeaths=0;matchStart=now();roundWinner=null;closeRadio();}
 function roundStart(){for(const rec of roster){const b=rec.bot,st=statCache.get(rec.id);if(st){
  const active={id:b.weaponId,mag:b.ammo,res:b.reserve,silenced:!!b.silenced},pistol=W[b.weaponId]?.slot==='pistol'?active:b.pistolState;
  const main=b.emptyPrimary||(b.weaponId==='knife'?pistol:active);
  st.loadout=b.dead||!main?null:{id:main.id,mag:main.mag,res:main.res,silenced:!!main.silenced,pistol:pistol?{id:pistol.id,mag:pistol.mag,res:pistol.res,silenced:!!pistol.silenced}:null,he:b.heCount,flash:b.flashCount,smoke:b.smokeCount,shield:!!b.hasBotShield};st.armor=b.dead?0:b.armor;st.helmet=!b.dead&&b.helmet;st.defuseKit=!b.dead&&b.defuseKit}}
  // Evaluate the previous roster before new bots register or buy.
  teamEco=Object.fromEntries(['CT','T'].map(team=>{const members=roster.filter(rec=>rec.team===team).map(rec=>statCache.get(rec.id)).filter(Boolean);return [team,Economy45.teamSave(members,lossStreak[team]||0,id=>W[id]?.slot==='primary')]}));
  resetVoices();sounds.length=0;radioLast=-100;roster=[];roundWinner=null;grenadeBudget={CT:-100,T:-100};radioSeq++;closeRadio()}
 function registerBot(b,sideIndex){
  const id=`${b.team}-${sideIndex}`,prev=statCache.get(id)||{kills:0,deaths:0,money:window.PhaseMenu15?.rules.startMoney??800};
  b.botId=id;b.teamIndex=sideIndex;
  b.name=`${b.team} ${String(sideIndex+1).padStart(2,'0')} · ${(window.CS16BotData?.nameFor(b.team,sideIndex)||b.name||'BOT').toUpperCase()}`;
  b.skill=PROFILES[config.difficulty];
  b.personality=['aggressive','balanced','defensive'][sideIndex%3];
  b.accuracy=clamp((b.accuracy||.42)*b.skill.aim,.10,.72);
  b.effectiveRange=(b.effectiveRange||42)*b.skill.range;
  b.cd=Math.max(b.cd||0,b.skill.reaction*.6);
  b.aiAccum=((sideIndex+(b.team==='T'?5:0))%11)*.007;b.scanTimer=(sideIndex%6)*.045;
  b.savedLoadout=prev.loadout||null;b.money=clamp(prev.money??800,0,16000);b.defuseKit=!!prev.defuseKit;b.armor=prev.armor??0;b.helmet=prev.helmet??false;
  b.noticeElapsed=0;b.seenId=null;b.heard=null;b.threat=null;b.guardScanAt=0;b.guardYaw=null;b.radioUntil=0;b.voiceAt=-100;b.friendlyCue=null;b.reactionAt=-100;b.lastSeen=null;b.memoryShotAt=null;b.memoryProbeAt=0;b.reloadLeft=0;b.heCount=0;b.flashCount=0;b.smokeCount=0;b.visibleEnemy=null;b.memory=null;b.radioOrder=null;b.grenadeUsed=false;b.recoveryTime=0;b.stuck=0;b.layoutNav=null;b.nav=null;
  const rec={id,team:b.team,name:b.name,bot:b,kills:prev.kills,deaths:prev.deaths,money:b.money,alive:true};
  statCache.set(id,prev);roster.push(rec);return b;
 }
 // Each side keeps individual money across rounds; $800 is the first-round balance.
 function creditBot(b,amount,reason=''){
  if(!b||!b.botId||!Number.isFinite(amount))return 0;
  const value=Math.floor(amount);b.money=clamp((b.money??800)+value,0,16000);
  const rec=roster.find(r=>r.bot===b),stored=statCache.get(b.botId)||{kills:0,deaths:0};
  stored.money=b.money;statCache.set(b.botId,stored);
  if(rec)rec.money=b.money;
  return b.money;
 }
 // After consecutive losses, avoid repeatedly spending every dollar on
 // weak buys. Existing weapons and armor are retained. A rich teammate can
 // still buy normally; savings never alter income or weapon availability.
 function botSaveRound(b){return round>1&&lossStreak[b.team]>=2&&b.money<(teamEco[b.team]?4500:3500)&&W[b.savedLoadout?.id]?.slot!=='primary';}
 function prepareBotRound(b){
  if(!b)return;
  const pistol=b.team==='CT'?'usp':'glock18';
  // Round one always starts with the free pistol (never a randomly assigned rifle).
  const saved=b.savedLoadout;let chosen=saved?.id||pistol;
  b.hasBotShield=!!(saved?.shield&&b.team==='CT'&&b.nativeHitboxes&&b.shieldPart&&W[chosen]?.slot==='pistol'&&chosen!=='elite'&&typeof heldModels!=='undefined'&&heldModels.shield);
  const pistolSaved=saved?.pistol||{id:pistol,mag:W[pistol].mag,res:W[pistol].mag*2};
  b.ammoPool={};b.pistolState=Object.assign(Economy45.state(b.ammoPool,pistolSaved.id,pistolSaved.mag,pistolSaved.res),{id:pistolSaved.id,silenced:!!pistolSaved.silenced});
  if(saved?.id&&Economy45.spec(saved.id)?.cal!==Economy45.spec(pistolSaved.id)?.cal)Economy45.grant(b.ammoPool,saved.id,saved.res||0);
  b.emptyPrimary=null;b.heCount=saved?.he||0;b.flashCount=saved?.flash||0;b.smokeCount=saved?.smoke||0;
  const save=botSaveRound(b);
  if(round>1&&!save){
   const team=b.team,limit=clamp((b.money??800)-Math.min(650,(b.money??800)*.17),0,16000);
   const options=team==='CT'?['m4a1','famas','mp5','aug','ump45','p90','scout','awp','m249']
    :['ak47','galil','mac10','mp5','ump45','p90','scout','awp','m249'];
   const affordable=options.filter(id=>W[id]&&W[id].price<=limit);
   if(!b.hasBotShield&&team==='CT'&&b.nativeHitboxes&&b.shieldPart&&typeof heldModels!=='undefined'&&heldModels.shield&&b.personality==='defensive'&&b.teamIndex%6===2&&W[chosen].slot==='pistol'&&chosen!=='elite'&&b.money>=W.shield.price+650){
    b.hasBotShield=true;b.money-=W.shield.price;
   }else if(!b.hasBotShield&&affordable.length&&W[chosen].slot!=='primary'){
    const preferred=b.personality==='defensive'?['awp','scout','aug','m4a1','ak47','famas','galil']:b.personality==='aggressive'?['ak47','m4a1','famas','galil','mp5','mac10','p90']:['m4a1','ak47','famas','galil','aug','mp5'];
    chosen=preferred.find(id=>affordable.includes(id))||affordable[0];
    b.money-=W[chosen].price;
   }else if(W[chosen].slot!=='primary'&&chosen===pistol&&b.money>=W.deagle.price+300&&((b.teamIndex+round)%3===0)){
    chosen='deagle';b.money-=W.deagle.price;
   }
   // Save armor across rounds and only purchase missing protection.
   if(!b.helmet&&b.armor>=100&&b.money>=Combat12.armorPrice('helmet',b.armor,b.helmet)){b.money-=Combat12.armorPrice('helmet',b.armor,b.helmet);b.helmet=true;}
   if(b.armor<60){
    const price=Combat12.armorPrice('helmet',b.armor,b.helmet);
    if(b.money>=price){b.armor=100;b.helmet=true;b.money-=price;}
    else if(b.money>=Combat12.armorPrice('kevlar',b.armor,b.helmet)){b.money-=Combat12.armorPrice('kevlar',b.armor,b.helmet);b.armor=100;}
   }
  }else if(round===1){b.armor=0;b.helmet=false;}
  if(BombMode.active()&&b.team==='CT'&&!b.defuseKit&&b.money>=200&&(b.teamIndex%2===0||b.money>=1000)){b.defuseKit=true;b.money-=200}
  if(!save&&!b.heCount&&round>1&&b.money>=300&&(b.teamIndex%3===0||b.money>=1500)){b.heCount=1;b.money-=300}
  if(!save&&!b.smokeCount&&round>1&&b.money>=300&&b.teamIndex%4===1){b.smokeCount=1;b.money-=300}
  if(!save&&b.flashCount<2&&round>1&&b.money>=200&&b.teamIndex%4===2){b.flashCount++;b.money-=200}
  if(W[chosen].slot==='pistol'&&chosen!==b.pistolState.id)b.pistolState=Object.assign(Economy45.state(b.ammoPool,chosen,W[chosen].mag),{id:chosen});
  equipBot(b,b.teamIndex,chosen);
  b.ammo=saved?.id===chosen?saved.mag:W[chosen].mag;
  if(chosen==='usp'||chosen==='m4a1')b.silenced=!b.hasBotShield&&(saved?.id===chosen?!!saved.silenced:chosen===pistolSaved.id?!!pistolSaved.silenced:false);
  Economy45.bindBot(b,chosen,b.ammoPool);
  const offer=Economy45.spec(chosen);if(offer&&round>1){const target=save?Math.min(offer.max,W[chosen].mag):offer.max;while(b.reserve<target&&b.money>=offer.price){b.reserve=Math.min(offer.max,b.reserve+offer.pack);b.money-=offer.price}}
  if(W[chosen].slot==='pistol')b.pistolState.mag=b.ammo;
  else if(round>1&&b.pistolState){const secondary=Economy45.spec(b.pistolState.id);if(secondary&&b.pistolState.res<Math.min(secondary.max,W[b.pistolState.id].mag)&&b.money>=secondary.price){b.pistolState.res=Math.min(secondary.max,b.pistolState.res+secondary.pack);b.money-=secondary.price}}
  const stored=statCache.get(b.botId);if(stored){stored.money=b.money;stored.armor=b.armor;stored.helmet=b.helmet;stored.defuseKit=b.defuseKit;}
  const rec=roster.find(r=>r.bot===b);if(rec)rec.money=b.money;
 }
 function recordDefuseKit(b){const st=statCache.get(b.botId);if(st)st.defuseKit=!!b.defuseKit;}
 function onBotDeath(b,killer){
  const rec=roster.find(r=>r.bot===b);
  if(!rec||!rec.alive)return;
  if(rec&&rec.alive){rec.alive=false;rec.deaths++;if(b.team==='CT'&&b.defuseKit)Phase9.dropDefuseKit?.(b.g.position.clone(),!!b.crouching);b.defuseKit=false;const st=statCache.get(rec.id)||{};Object.assign(st,{kills:rec.kills,deaths:rec.deaths,money:b.money,armor:0,helmet:false,defuseKit:false,loadout:null});statCache.set(rec.id,st)}
  if(killer&&killer!==b&&killer.botId&&killer.team===b.team)creditBot(killer,-3300,'TEAMKILL');
  if(killer&&killer!==b&&killer.botId&&killer.team!==b.team){
   const k=roster.find(r=>r.bot===killer);if(k){k.kills++;const st=statCache.get(k.id)||{};st.kills=k.kills;statCache.set(k.id,st);creditBot(killer,300,'KILL')}
  }
  if(killer&&killer!==b&&Math.random()<.22)botTalk(killer,'enemy_down');
  if(sbOpen)renderScoreboard();
 }
 function onPlayerDeath(killer){Phase9.dropPlayerOnDeath?.();if(killer?.botId&&killer.team===playerTeam)creditBot(killer,-3300,'TEAMKILL');
  if(playerTeam==='CT'&&defuseKit){Phase9.dropDefuseKit?.(P.pos.clone(),Phase9.crouching);defuseKit=false;}
  playerDeaths++;
  if(killer?.botId&&killer.team!==playerTeam){
   const rec=roster.find(r=>r.bot===killer);if(rec){rec.kills++;const st=statCache.get(rec.id)||{};st.kills=rec.kills;statCache.set(rec.id,st);creditBot(killer,300,'KILL HUMAN')}
  }
  if(sbOpen)renderScoreboard();
 }
 let lastBoardSignature='';
 function renderBoard(){
  const head=$('sbHead'),body=$('sbBody');if(!head||!body)return;
  const all=[{team:playerTeam,name:'★ '+(window.PhaseMenu15?.playerName||'YOU'),kills:kills,deaths:playerDeaths,money,alive:P.hp>0,hp:Math.max(0,Math.ceil(P.hp)),me:true,bot:null},
   ...roster.map(r=>({...r,money:r.bot.money??800,hp:r.alive?Math.max(0,Math.ceil(r.bot.hp)):0}))];
  const ct=all.filter(r=>r.team==='CT'),t=all.filter(r=>r.team==='T');
  const alive=team=>team.filter(r=>r.alive).length;
  head.textContent=`BLOCK STRIKE · ROUND ${round} · CT ${alive(ct)}/${ct.length} · T ${alive(t)}/${t.length}`;
  const signature=JSON.stringify([round,all.map(r=>[r.team,r.name,r.kills,r.deaths,r.money,r.alive,r.hp])]);
  if(signature===lastBoardSignature&&body.children.length)return;
  lastBoardSignature=signature;
  const previousScroll=new Map([...body.querySelectorAll('.sb-team-rows')].map(list=>[list.dataset.team,list.scrollTop]));
  body.replaceChildren();
  for(const [team,rows] of [['CT',ct],['T',t]]){
   const panel=document.createElement('section');panel.className='sb-team-column '+(team==='CT'?'sb-ct':'sb-t');
   panel.setAttribute('aria-label',team==='CT'?'Counter-Terrorists':'Terrorists');
   const title=document.createElement('div');title.className='sb-team-label';
   title.textContent=(team==='CT'?'COUNTER-TERRORISTS':'TERRORISTS')+` · ${alive(rows)}/${rows.length}`;
   const cols=document.createElement('div');cols.className='sb-mini-head';
   for(const label of ['PLAYER','K','D','$','HP']){const cell=document.createElement('span');cell.textContent=label;cols.appendChild(cell)}
   const list=document.createElement('div');list.className='sb-team-rows';list.dataset.team=team;
   rows.sort((a,b)=>Number(b.alive)-Number(a.alive)||b.kills-a.kills||(a.bot?.teamIndex??-1)-(b.bot?.teamIndex??-1));
   for(const r of rows){const row=document.createElement('div');row.className='sb-compact-row '+(r.alive?'':'dead')+(r.me?' me':'');
    for(const str of [r.name,String(r.kills),String(r.deaths),'$'+(r.money??800),r.alive?String(r.hp):'DEAD']){
     const cell=document.createElement('span');cell.textContent=str;cell.title=str;row.appendChild(cell)}list.appendChild(row)}
   panel.append(title,cols,list);body.appendChild(panel);
   list.scrollTop=previousScroll.get(team)||0;
  }
 }
 function botVec(b,raw){return new THREE.Vector3(raw.x,raw.y,raw.z)}
 function frontOf(b,target){
  const p=b.g.position;const dx=target.x-p.x,dz=target.z-p.z,dist=Math.hypot(dx,dz)||1;
  if(p.distanceTo(target)<2.1)return true;
  const facing=new THREE.Vector3(-Math.sin(b.g.rotation.y),0,-Math.cos(b.g.rotation.y));
  return facing.dot(new THREE.Vector3(dx/dist,0,dz/dist))>Math.cos(Math.PI*(b.skill?.aim>=1.16?100:b.skill?.aim<.7?80:90)/180);
 }
 // Only a damage event or an audible, recent event reveals a bearing, not wall vision.
 function noticeDamage(b,source,team){
  if(!source||!b||b.dead||team===b.team)return;
  const t=now(),fresh=!b.threat||t-b.threat.t>.8||b.threat.pos.distanceToSquared(source)>9;
  b.threat={pos:source.clone(),t};
  if(fresh){b.scanTimer=0;b.guardScanAt=0;}
 }
 function orientAwareness(b,order,dt){
  const t=now(),p=b.g.position;
  if(t>=(b.nextListen||0)){listen(b);b.nextListen=t+.2+(b.teamIndex%4)*.025;}
  const recent=b.threat&&t-b.threat.t<2.4?b.threat:null;
  const audible=b.heard&&t-b.heard.t<1.8&&['shot','defuse'].includes(b.heard.type)?b.heard:null;
  const cue=recent||audible;
  if(b.visibleEnemy&&!recent&&audible?.type!=='defuse')return false;
  if(cue&&p.distanceToSquared(cue.pos)>.1){
   const angle=Math.atan2(p.x-cue.pos.x,p.z-cue.pos.z);
   const delta=Math.atan2(Math.sin(angle-b.g.rotation.y),Math.cos(angle-b.g.rotation.y));
   b.g.rotation.y+=clamp(delta,-dt*9,dt*9);
   if(Math.abs(delta)>.45)b.scanTimer=0;
   return true;
  }
  // Friendly contact is a brief look, not hostile memory or a combat target.
  const friendly=b.friendlyCue;
  if(friendly&&t-friendly.t<.65&&!order?.busy&&!order?.urgent&&p.distanceToSquared(friendly.pos)>.02){
   const angle=Math.atan2(p.x-friendly.pos.x,p.z-friendly.pos.z),delta=Math.atan2(Math.sin(angle-b.g.rotation.y),Math.cos(angle-b.g.rotation.y));
   b.g.rotation.y+=clamp(delta,-dt*8,dt*8);return true;
  }
  if(!order||order.busy||!['defend','guard-bomb','protect-defuser','hold'].includes(order.mode))return;
  const offset=order.stationId!=null&&b.crouching&&Number.isInteger(window.bspCol?.crouchHead)?18*bspCol.T.k:0;
  if((p.x-order.pos.x)**2+(p.y+offset-order.pos.y)**2+(p.z-order.pos.z)**2>order.radius**2)return;
  if(b.guardYaw===null||t>=b.guardScanAt){
   const directions=order.looks||[];
   const index=(b.guardIndex||0)+(b.teamIndex||0);
   const target=directions.length?directions[index%directions.length]:null;
   // Cycle all sectors, including rear approaches, even with a single camp heading.
   const base=target&&p.distanceToSquared(target)>.1?Math.atan2(p.x-target.x,p.z-target.z):(b.guardBaseYaw??=b.g.rotation.y);
   b.guardYaw=base+[0,.95,-.95,Math.PI][index%4];
   b.guardIndex=(b.guardIndex||0)+1;b.guardScanAt=t+1.15+(b.teamIndex%4)*.2;
  }
  const delta=Math.atan2(Math.sin(b.guardYaw-b.g.rotation.y),Math.cos(b.guardYaw-b.g.rotation.y));
  b.g.rotation.y+=clamp(delta,-dt*3.8,dt*3.8);
 }
 function selectVisible(b){
  const others=[];
  if(b.team!==playerTeam&&!over&&P.hp>0)others.push({id:'human',pos:P.pos,isP:true,bot:null});
  for(const other of bots){if(other===b||other.dead||other.team===b.team)continue;others.push({id:other.botId||other,bot:other,pos:other.g.position,isP:false})}
  // Limit expensive ray casts: closest six candidates within vision and FOV.
  const pos=b.g.position,vision=b.skill?.vision||44;
  const candidates=others.map(target=>({...target,dist:target.pos.distanceTo(pos)}))
   .filter(t=>t.dist<vision&&frontOf(b,t.pos)).sort((a,c)=>{
    // Keep a confirmed or pending visual contact when it remains visible;
    // another enemy moving slightly closer must not restart reaction timing.
    // A confirmed defuser remains the higher-priority target for T.
    const rank=t=>t.dist-(BombMode.isDefuser?.(t)&&b.team==='T'?vision*3+1:t.id===b.seenId?vision+1:0);
    return rank(a)-rank(c);
   }).slice(0,6);
  for(const target of candidates){
   if(Phase9.blocksSight(b.g.position,target.pos,{startCrouch:!!b.crouching,endCrouch:!!(target.isP?Phase9.crouching:target.bot?.crouching)}))continue;
   if(los(b,target.pos))return target;
  }
  return null;
 }
 function seenEnemy(b,dt){
  b.scanTimer=(b.scanTimer||0)-dt;
  if(b.scanTimer<=0){
   const target=selectVisible(b);
   b.scanTimer=(b.skill?.scan||.29)+((b.teamIndex||0)%5)*.011;
   if(target){
    if(b.seenId!==target.id){b.seenId=target.id;b.seenSince=now();b.noticeElapsed=0}
    else b.noticeElapsed=Math.max(0,now()-(b.seenSince??now()));
    const sampleTime=now(),prev=b.lastSeen,elapsed=sampleTime-(prev?.t??sampleTime);
    const velocity=prev?.id===target.id&&elapsed>.05&&elapsed<1?target.pos.clone().sub(prev.pos).multiplyScalar(1/elapsed).setY(0):V(0,0,0);
    if(velocity.length()>7)velocity.setLength(7);
    b.lastSeen={pos:target.pos.clone(),t:sampleTime,id:target.id,velocity,confirmed:b.noticeElapsed>=(b.skill?.reaction||.5),isP:target.isP,crouching:!!(target.isP?Phase9.crouching:target.bot?.crouching)};
    BombMode.observe?.(b,target.pos,target.id);
    b.visibleEnemy=b.noticeElapsed>=(b.skill?.reaction||.5)?{...target,pos:target.pos.clone(),velocity}:null;
    if(b.visibleEnemy&&!b.spottedNotified){botTalk(b,'target_spotted');b.spottedNotified=true}
   }else{b.visibleEnemy=null;b.seenId=null;b.noticeElapsed=0;b.spottedNotified=false;listen(b)}
  }
  const enemy=b.visibleEnemy;
  if(enemy&&(enemy.isP?P.hp<=0||over:enemy.bot?.dead)){b.visibleEnemy=null;return null;}
  if(enemy)return {...enemy,dist:b.g.position.distanceTo(enemy.pos)};
  return null;
 }
 function isTargetFresh(b){return b.lastSeen&&(now()-b.lastSeen.t)<(['hard','expert'].includes(config.difficulty)?3.7:2.3)}
 // Hearing shares short-lived sound events, never a live enemy reference.
 function soundEvent(team,pos,type,range=1){
  if(!pos||!['CT','T'].includes(team)||!['shot','step','defuse'].includes(type))return;
  const t=now();sounds.push({team,pos:pos.clone(),type,range,t});
  while(sounds.length>96||sounds.length&&t-sounds[0].t>3)sounds.shift();
 }
 function listen(b){
  const t=now(),p=b.g.position;let best=null,bestScore=Infinity;
  for(let i=sounds.length-1;i>=0;i--){const s=sounds[i];if(t-s.t>2.5)break;if(s.team===b.team)continue;
   const d=p.distanceTo(s.pos),radius=(b.skill?.hearing||13)*s.range;
   if(d>radius)continue;const occluded=!!window.bspCol?.pointClip&&BSP.pointLineBlocked(window.bspCol,p.clone().add(V(0,.38,0)),s.pos.clone().add(V(0,.38,0)));if(occluded&&d>radius*.55)continue;const cost=d*(occluded?1.6:1)+4*(t-s.t)-(s.type==='defuse'?8:0);if(cost<bestScore){best=s;bestScore=cost}
  }
  if(best){const p=best.pos.clone();p.x=Math.round(p.x/2)*2;p.z=Math.round(p.z/2)*2;b.heard={pos:p,t:best.t,type:best.type}}
 }
 function radioGoal(b){
  const ord=b.radioOrder;
  if(ord&&(now()>ord.expiresAt||P.hp<=0||b.team!==playerTeam))b.radioOrder=null;
  const current=b.radioOrder;
  if(current){
   if(current.mode==='advance')return BombMode.botGoal(b)||{pos:current.anchor,mode:'advance',radius:2.2};
   if(current.mode==='hold')return {pos:current.anchor,mode:'hold',radius:1.2};
   if(current.mode==='attack')return {pos:current.anchor,mode:'attack',radius:4};
   if(current.mode==='backup')return {pos:P.pos,mode:'backup',radius:2.1+(b.teamIndex%3)*.8};
   if(current.mode==='regroup'){const anchor=current.anchor||P.pos;if(b.g.position.distanceTo(anchor)<2.2){b.radioOrder=null;return null}return {pos:anchor,mode:'regroup',radius:2};}
   if(current.mode==='retreat')return {pos:current.anchor,mode:'retreat',radius:4};
   if(['follow','cover','stick'].includes(current.mode))return {pos:P.pos,mode:current.mode,radius:2.8+(b.teamIndex%4)*.8+(current.mode==='cover'?1:0)};
  }
  return null;
 }
 function tacticalGoal(b,objective,enemy){
  const p=b.g.position,t=now(),memory=b.lastSeen&&t-b.lastSeen.t<4?b.lastSeen:null;
  if(objective?.force||objective?.busy||objective?.urgent)return null;
  if(b.coverGoal&&t<b.coverUntil){
   if(p.distanceTo(b.coverGoal)>1.1)return {pos:b.coverGoal,mode:'take-cover',radius:1,force:true};
   if(!enemy&&(b.reloadLeft>0||b.reserve>0&&b.ammo<Math.max(1,Math.floor(W[b.weaponId].mag*.4))))return {pos:p,mode:'reload-cover',radius:1,hold:true};
   if(enemy){b.coverGoal=null;b.coverUntil=0;}
  }
  const lowAmmo=b.reserve>0&&b.ammo<Math.max(1,Math.floor(W[b.weaponId].mag*.25));
  if(enemy&&(b.hp<35||b.reloadLeft>0||lowAmmo)&&activeMapData?.local?.graph&&t>=(b.coverCheck||0)){
   b.coverCheck=t+3;
   const nodes=activeMapData.local.graph.nodes,from=BSP.toHammer(bspCol.T,p.toArray());
   const threat=BSP.toHammer(bspCol.T,enemy.pos.toArray());
   const candidates=nodes.filter(n=>n.valid!==false&&n.edges.length&&Math.abs(n.pos[1]-p.y)<1.5).map(n=>({n,d:p.distanceTo(V(...n.pos))})).filter(x=>x.d>1.7&&x.d<9).sort((a,b)=>a.d-b.d).slice(0,18);
   for(const {n} of candidates){if(BSP.traceAll(bspCol,n.h,threat).hit&&LocalBSPNav.walkable(bspCol,from,n.h,450)){b.coverGoal=V(...n.pos);b.coverUntil=t+4;return {pos:b.coverGoal,mode:'take-cover',radius:1,force:true}}}
  }
  if(!enemy&&objective?.mode!=='defend'&&(!objective||!BombMode.planted())){
   if(memory&&p.distanceTo(memory.pos)<13&&p.distanceTo(memory.pos)>2&&b.personality!=='defensive')return {pos:memory.pos,mode:'search',radius:1.5};
   if(b.heard&&t-b.heard.t<2.5&&p.distanceTo(b.heard.pos)<12&&p.distanceTo(b.heard.pos)>2&&b.personality==='aggressive')return {pos:b.heard.pos,mode:'investigate',radius:2};
  }
  return null;
 }
 function goal(b){
  const p=b.g.position,radio=radioGoal(b);if(radio)return radio;
  if(isTargetFresh(b)&&p.distanceTo(b.lastSeen.pos)>1.6)return {pos:b.lastSeen.pos,mode:'search',radius:1.4};
  if(b.heard&&now()-b.heard.t<3&&p.distanceTo(b.heard.pos)>2)return {pos:b.heard.pos,mode:'investigate',radius:2};
  const spawn=activeMapData?.spawn?.[b.team==='CT'?'t':'ct'];
  const enemySpawn=spawn?new THREE.Vector3(...spawn):new THREE.Vector3(0,0,b.team==='CT'?-23:23);
  // Enemy bots roam successive visible map points instead of freezing forever
  // when they arrive at the human team's starting area. This never uses the
  // player's live location or grants wall vision.
  const offset=(b.teamIndex||0)%5-2;
  enemySpawn.x+=offset*1.5;enemySpawn.z+=((b.teamIndex||0)%3-1)*1.1;
  const time=now(),reached=b.patrolGoal&&p.distanceTo(b.patrolGoal)<2.6;
  if(!b.patrolGoal||reached||time>=(b.patrolDeadline||0)){
   b.patrolIndex=(b.patrolIndex||0)+1;
   const angle=(b.teamIndex||0)*2.4+b.patrolIndex*2.36;
   const radius=4+((b.patrolIndex+(b.teamIndex||0))%3)*3;
   const candidate=enemySpawn.clone().add(new THREE.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius));
   if(window.bspCol){
    candidate.y=BSP.snapSpawn(bspCol,candidate.x,candidate.z);
    if(!BSP.canStand(bspCol,candidate))candidate.copy(enemySpawn);
   }
   b.patrolGoal=candidate;b.patrolDeadline=time+7+(b.teamIndex%4);
  }
  return {pos:b.patrolGoal,mode:'patrol',radius:2.2};
 }
 function maybeBotGrenade(b,tg,dt){
  if(!b||b.dead||b.blinded>0||b.reloadLeft>0||!(b.heCount||b.flashCount||b.smokeCount)||!tg||!running)return false;
  const t=now(),diff=config.difficulty,likelihood=diff==='expert'?.8:diff==='hard'?.65:diff==='normal'?.35:.08;
  if(t<(b.nextGrenadeAt||0)||t-grenadeBudget[b.team]<2.5||tg.dist<8||tg.dist>19)return false;
  if(Math.random()>likelihood*dt)return false;
  b.nextGrenadeAt=t+.75;
  let type=b.heCount?'he':null,target=tg.pos;
  if(b.smokeCount&&(b.hp<60||BombMode.planted()||b.personality==='defensive')){
   type='smoke';target=b.g.position.clone().lerp(tg.pos,.65);
  }else if(b.flashCount&&(tg.dist>=16||!type)&&b.personality!=='defensive')type='flash';
  if(!type)return false;
  const allies=bots.filter(other=>other!==b&&!other.dead&&other.team===b.team);
  const radius=type==='flash'?30:7;
  if(type!=='smoke'&&(allies.some(other=>other.g.position.distanceTo(target)<radius&&(type!=='flash'||los(other,target)))||P.hp>0&&b.team===playerTeam&&P.pos.distanceTo(target)<radius))return false;
  // Lead only the last observed horizontal motion, bounded to 2.5 world units.
  let success=false;
  if(type==='he'&&tg.velocity?.lengthSq()>.05){const lead=tg.velocity.clone().multiplyScalar(.65);if(lead.length()>2.5)lead.setLength(2.5);success=Phase9.throwBotGrenade(b,target.clone().add(lead),type);}
  if(!success)success=Phase9.throwBotGrenade(b,target,type);
  if(success){b[type+'Count']--;b.nextGrenadeAt=t+4;grenadeBudget[b.team]=t;}
  return success;
 }
 function command(name){
  if(!running||P.hp<=0||inputBlocked()||roundWait)return false;
  const t=now();if(t-radioLast<1.05)return false;
  const spec=RADIO_COMMANDS[name];if(!spec)return false;
  if(!spec.behavior){
   radioLast=t;closeRadio();radioPlay('radio',spec.sound,.55,playerTeam);showRadioText('RADIO · '+spec.label);
   if(name==='report'){
    // "Report in" requests a situational response, but reveals no hidden enemy.
    const ally=bots.filter(b=>!b.dead&&b.team===playerTeam).sort((a,b)=>a.g.position.distanceTo(P.pos)-b.g.position.distanceTo(P.pos))[0];
    if(ally)botTalk(ally,ally.visibleEnemy?'target_spotted':'sector_clear',true);
   }
   return true;
  }
  radioLast=t;closeRadio();
  const dir=cam?.getWorldDirection(new THREE.Vector3())||new THREE.Vector3(0,0,-1);
  dir.y=0;dir.normalize();
  let anchor=P.pos.clone().addScaledVector(dir,23);
  if(spec.behavior==='attack'){
   // Advance toward a fixed location in the player's view, not the live enemy.
   if(!window.bspCol){const lim=worldLim()-1;anchor.x=clamp(anchor.x,-lim,lim);anchor.z=clamp(anchor.z,-lim,lim)}
   else {const graph=activeMapData?.local?.graph;const candidates=(graph?.nodes||[]).filter(n=>n.edges.length&&n.valid!==false).map(n=>V(...n.pos)).filter(p=>p.distanceTo(P.pos)<25&&p.clone().sub(P.pos).dot(dir)>0);candidates.sort((a,b)=>a.distanceToSquared(anchor)-b.distanceToSquared(anchor));anchor=candidates[0]||P.pos.clone()}
  }
  if(spec.behavior==='retreat'){const spawn=activeMapData?.spawn?.[playerTeam==='CT'?'ct':'t'];if(spawn)anchor=new THREE.Vector3(...spawn);else anchor=P.pos.clone().addScaledVector(dir,-15)}
  let changed=0,best=null,closest=Infinity;
  const allies=bots.filter(b=>!b.dead&&b.team===playerTeam).sort((a,b)=>a.g.position.distanceToSquared(P.pos)-b.g.position.distanceToSquared(P.pos));
  const available=allies.filter(b=>!BombMode.radioReserved?.(b));
  const eligible=['follow','cover','backup'].includes(spec.behavior)?available.slice(0,config.followers):available;
  // Fixed, distinct rally stations prevent the whole team converging at one point.
  const rally=(activeMapData?.local?.graph?.nodes||[]).filter(n=>n.valid!==false&&n.edges.length).map(n=>V(...n.pos)).filter(p=>p.distanceTo(P.pos)>1.2&&p.distanceTo(P.pos)<6&&Math.abs(p.y-P.pos.y)<1.2).sort((a,b)=>a.distanceToSquared(P.pos)-b.distanceToSquared(P.pos));
  const rallySpots=[];for(const p of rally){if(rallySpots.every(q=>q.distanceTo(p)>1.35))rallySpots.push(p);if(rallySpots.length>=eligible.length)break}
  for(const b of allies)if(!eligible.includes(b))b.radioOrder=null;
  for(const b of eligible){
   const dist=b.g.position.distanceTo(P.pos);
   if(spec.behavior==='resume'){
    const goal=BombMode.resumeAdvance(b);
    const fallback=activeMapData?.spawn?.[b.team==='CT'?'t':'ct']||[0,0,b.team==='CT'?-23:23];
    const advanceTarget=V(...fallback);advanceTarget.x+=((b.teamIndex||0)%5-2)*1.4;
    b.radioOrder={mode:'advance',anchor:goal?.pos?.clone()||advanceTarget,expiresAt:t+36};
   }else b.radioOrder={mode:spec.behavior,anchor:spec.behavior==='hold'?P.pos.clone():spec.behavior==='regroup'?(rallySpots[changed%rallySpots.length]||P.pos).clone():anchor.clone(),expiresAt:t+(spec.behavior==='attack'?36:55)};
   b.nav=null;b.layoutNav=null;b.localRoute=null;b.scanTimer=Math.min(b.scanTimer||0,.03);
   changed++;if(dist<closest){closest=dist;best=b}
  }
  radioPlay('radio',spec.sound,.64,playerTeam);
  const label=`RADIO · ${spec.label}${changed?' · '+changed+' BOT':' · NO AVAILABLE ALLIES'}${allies.length>available.length?' · C4 PRIORITY':''}`;
  showRadioText(label);
  if(best){const token=++radioSeq;
   setTimeout(()=>{if(token!==radioSeq||!running||best.dead||best.team!==playerTeam)return;botTalk(best,spec.behavior==='backup'?'be_right_there':spec.behavior==='attack'?'attacking':'roger_that',true)},850+Math.random()*400)
  }
  return changed>0;
 }
 // These commands are backed by audio files in assets/phase10/audio/radio.
 // State-changing commands have a behavior; announcements are voice-only.
 const RADIO_COMMANDS={
  cover:{label:'Cover Me!',sound:'ct_coverme',behavior:'cover'},
  takepoint:{label:'You Take the Point!',sound:'takepoint',behavior:'attack'},
  hold:{label:'Hold This Position!',sound:'com_getinpos',behavior:'hold'},
  regroup:{label:'Regroup Team!',sound:'regroup',behavior:'regroup'},
  follow:{label:'Follow Me!',sound:'followme',behavior:'follow'},
  takingfire:{label:'Taking Fire, Need Assistance!',sound:'fireassis',behavior:'backup'},
  go:{label:'Go Go Go!',sound:'go',behavior:'resume'},
  fallback:{label:'Team Fall Back!',sound:'fallback',behavior:'retreat'},
  stick:{label:'Stick Together!',sound:'sticktog',behavior:'stick'},
  getinpos:{label:'Get in Position!',sound:'com_getinpos',behavior:'hold'},
  attack:{label:'Storm the Front!',sound:'stormfront',behavior:'attack'},
  report:{label:'Report In!',sound:'com_reportin'},
  roger:{label:'Roger That!',sound:'roger'},
  enemy:{label:'Enemy Spotted!',sound:'ct_enemys'},
  backup:{label:'Need Backup!',sound:'ct_backup',behavior:'backup'},
  sectorclear:{label:'Sector Clear!',sound:'clear'},
  inpos:{label:"I'm in Position!",sound:'ct_inpos'},
  reporting:{label:'Reporting In!',sound:'ct_reportingin'},
  negative:{label:'Negative!',sound:'negative'},
  enemydown:{label:'Enemy Down!',sound:'enemydown'},
  moveout:{label:'Move Out!',sound:'moveout',behavior:'resume'},
  letsgo:{label:"Let's Go!",sound:'letsgo',behavior:'resume'},
  circleback:{label:'Circle Back!',sound:'circleback',behavior:'retreat'},
  meetme:{label:'Meet Me!',sound:'meetme',behavior:'regroup'},
  followcom:{label:'Follow Commander!',sound:'com_followcom',behavior:'follow'},
  fireinhole:{label:'Fire in the Hole!',sound:'ct_fireinhole'},
  imhit:{label:"I'm Hit!",sound:'ct_imhit'},
  locknload:{label:'Lock and Load!',sound:'locknload'},
  matedown:{label:'Teammate Down!',sound:'matedown'},
  getout:{label:'Get Out!',sound:'getout',behavior:'retreat'},
  position:{label:'Take Position!',sound:'position',behavior:'hold'},
  ctpoint:{label:'Take the Point!',sound:'ct_point',behavior:'attack'},
  ctaffirm:{label:'Affirmative!',sound:'ct_affirm'}
 };
 const RADIO_CATEGORIES={
  z:['cover','takepoint','hold','regroup','follow','takingfire','meetme','followcom','position'],
  x:['go','fallback','stick','getinpos','attack','report','moveout','letsgo','circleback'],
  c:['roger','enemy','backup','sectorclear','inpos','reporting','negative','enemydown','fireinhole'],
  more:['imhit','locknload','matedown','getout','ctpoint','ctaffirm']
 };
 function selectRadio(index){const name=RADIO_CATEGORIES[radioMode]?.[index];if(name)command(name);return !!name}
 function showRadioText(message){const el=$('radioStatus');if(!el)return;el.textContent=message;el.classList.remove('hidden');const token=++showRadioText.token;setTimeout(()=>{if(token===showRadioText.token)el.classList.add('hidden')},2800)}
 showRadioText.token=0;
 // Living and dead players hear their own selected team only. Global round
 // announcements explicitly use null; radio never enters the AI hearing bus.
 function radioAllowed(team){return team===null||team===playerTeam}
 function removeRadioIcon(b){const icon=radioIcons.get(b);if(icon){icon.parent?.remove(icon);icon.material.dispose();radioIcons.delete(b)}}
 function stopVoice(v){activeVoices.delete(v);if(v.speaker&&v.speaker.radioUntil===v.until)v.speaker.radioUntil=0;try{v.source.stop()}catch(_){}try{v.source.disconnect();v.gain.disconnect()}catch(_){}}
 function resetVoices(){voiceEpoch++;botVoiceLast=-100;radioLast=-100;for(const v of activeVoices)stopVoice(v);for(const b of radioIcons.keys())removeRadioIcon(b);for(const b of bots)b.radioUntil=0;showRadioText.token++;$('radioStatus')?.classList.add('hidden')}
 function radioPlay(channel,stem,volume=.5,team=playerTeam,speaker=null){
  if(!AC||!stem||!radioAllowed(team))return;
  const epoch=voiceEpoch,request=++voiceRequest,key=channel+'/'+stem;let task=voiceCache.get(key);
  if(!task){task=fetch(channel==='radio'&&CS16_RADIO_WAV.has(stem)?'assets/cs16-extra-sounds/radio/'+stem+'.wav':'assets/phase10/audio/'+key+'.mp3').then(r=>{if(!r.ok)throw Error('radio asset '+r.status);return r.arrayBuffer()}).then(bytes=>AC.decodeAudioData(bytes)).catch(e=>{voiceCache.delete(key);console.warn(e.message);return null});voiceCache.set(key,task)}
  task.then(buffer=>{if(!buffer||!AC||epoch!==voiceEpoch||request!==voiceRequest||!radioAllowed(team)||!running||(speaker&&(speaker.dead||!bots.includes(speaker))))return;
   const source=AC.createBufferSource(),gain=AC.createGain();source.buffer=buffer;gain.gain.value=clamp(volume*masterVolume,0,.9);source.connect(gain);gain.connect(AC.destination);
   for(const old of activeVoices)stopVoice(old);
   const v={source,gain,team,speaker,until:now()+Math.max(.1,buffer.duration||1)};activeVoices.add(v);source.onended=()=>{activeVoices.delete(v);if(speaker&&speaker.radioUntil===v.until)speaker.radioUntil=0;source.disconnect();gain.disconnect()};
   try{source.start();if(speaker)speaker.radioUntil=v.until}catch(e){stopVoice(v)}
  });
 }
 function botTalk(b,key,urgent=false,channel='bot',label=null){
  if(!b||b.dead||!running||!radioAllowed(b.team))return false;
  const t=now();if(t-botVoiceLast<(urgent?.8:3.4)||t-(b.voiceAt??-100)<(urgent?2:7))return false;
  botVoiceLast=t;b.voiceAt=t;
  // Text-only fallback if audio is locked; actual playback sets the icon duration.
  if(!AC)b.radioUntil=t+1.2;
  radioPlay(channel,key,.37,b.team,b);
  showRadioText((b.name||'BOT')+': '+(label||key.replaceAll('_',' ').toUpperCase()));
  return true;
 }
 function friendlyHit(b,source,team){
  if(!b||b.dead||team!==b.team||!source)return;
  const t=now();if(t-(b.reactionAt??-100)<3)return;
  b.reactionAt=t;b.friendlyCue={pos:source.clone(),t};botTalk(b,'hold_your_fire',true,'bot','HOLD YOUR FIRE!');
 }
 function grenadeThrown(owner,team){
  if(owner==='player'){if(team===playerTeam&&running&&now()-radioLast>=.8){radioLast=now();radioPlay('radio','ct_fireinhole',.52,team);showRadioText('RADIO · FIRE IN THE HOLE!')}}
  else botTalk(owner,'ct_fireinhole',true,'radio','FIRE IN THE HOLE!');
 }
 function friendlyFlash(b,team){if(b.team===team)botTalk(b,'hold_your_fire',true,'bot','HOLD YOUR FIRE!')}
 function radioSpeaking(b){return !!b&&!b.dead&&b.team===playerTeam&&(b.radioUntil||0)>now()}
 function radioBlink(b){return radioSpeaking(b)&&Math.floor(now()*5)%2===0}
 function updateRadio(){
  for(const v of activeVoices)if(!radioAllowed(v.team)||!running)stopVoice(v);
  for(const b of radioIcons.keys())if(!radioSpeaking(b)||!bots.includes(b))removeRadioIcon(b);
  if(!running||!S||typeof cam==='undefined'||!cam?.position)return;
  for(const b of bots){if(!radioSpeaking(b))continue;
   let icon=radioIcons.get(b);if(!icon){
    const art=GoldSrcSprites.radioTexture?.();
    const map=art?.map||loadTexture('radio-marker');
    icon=new THREE.Sprite(new THREE.SpriteMaterial({map,color:0xffffff,transparent:true,depthTest:true,depthWrite:false,alphaTest:.08}));
    icon.scale.set(.34,.34,1);S.add(icon);radioIcons.set(b,icon);
   }
   // Follow animated head proxy, or the simple model fallback.
   const head=b.body?.getObjectByName('Bip01_Head')||b.parts?.find(p=>p.userData.part==='head');
   if(head)head.getWorldPosition(icon.position);else icon.position.copy(b.g.position).add(V(0,window.bspCol?.65:1.65,0));
   icon.position.y+=.28;
   // Depth test plus line of sight prevents a marker peeking through a wall.
   const delta=icon.position.clone().sub(cam.position),distance=delta.length();
   ray.set(cam.position,delta.normalize());ray.far=distance;
   icon.visible=distance>.4&&distance<65&&!ray.intersectObjects(obsM).length&&!Phase9.blocksSight(cam.position,icon.position,{exactStart:true,exactEnd:true});
  }
 }
 function roundEnd(winner,payout=null,timedOut=false,reason=''){
  if(roundWinner||!['CT','T'].includes(winner))return;
  roundWinner=winner;
  payout=Economy45.payout(winner,!BombMode.active()?'ELIMINATION':reason,lossStreak,reason==='BOMB DEFUSED');lossStreak=Economy45.nextStreak(winner,lossStreak);
  if(!(timedOut&&playerTeam==='T'&&P.hp>0))money=Economy45.clampMoney(money+payout[playerTeam]);
  for(const rec of roster){
   if(timedOut&&rec.team==='T'&&!rec.bot.dead)continue;
   creditBot(rec.bot,payout?.[rec.team]??(rec.team===winner?3250:1400),'ROUND PAYOUT');
  }
  if(sbOpen)renderScoreboard();
  radioPlay('radio',winner==='CT'?'ctwin':'terwin',.72,null);
  showRadioText(winner==='CT'?'COUNTER-TERRORISTS WIN':'TERRORISTS WIN');
 }
 // Touch activation must not depend on the primary finger's synthesized click.
 // Radio list scrolling is handled by its own pointer so it works while moving.
 let radioPointer=null;
 function clearRadioPointer(){radioPointer?.cancel()}
 function radioTap(button,activate,scrollHost=null){
  if(!button)return;
  let gesture=null,lastTouch=-Infinity;
  button.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'||e.button!==0)return;
   if(radioPointer)return; // Do not steal a live owner after capture failure.
   if(gesture)return;
   e.preventDefault();e.stopPropagation();lastTouch=now();
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY,scroll:scrollHost?.scrollTop||0,drag:false};
   radioPointer={id:e.pointerId,button,cancel:()=>{const id=gesture?.id;gesture=null;radioPointer=null;lastTouch=now();if(id!=null&&button.hasPointerCapture?.(id))try{button.releasePointerCapture(id)}catch(_){}}};
   try{button.setPointerCapture(e.pointerId)}catch(_){}
  });
  button.addEventListener('pointermove',e=>{
   if(e.pointerId!==gesture?.id)return;
   const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
   if(Math.hypot(dx,dy)>8)gesture.drag=true;
   if(gesture.drag&&scrollHost)scrollHost.scrollTop=gesture.scroll-dy;
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{
   if(e.pointerId!==gesture?.id)return;
   const g=gesture;gesture=null;radioPointer=null;lastTouch=now();
   if(type!=='pointerup')return;
   e.preventDefault();e.stopPropagation();
   const r=button.getBoundingClientRect();
   if(!g.drag&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<=8&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)activate();
  });
  button.addEventListener('click',e=>{
   e.stopPropagation();
   // Preserve keyboard/assistive activation and desktop mouse clicks.
   if(e.pointerType==='touch'||e.pointerType==='pen'||e.detail!==0&&now()-lastTouch<.8)return;
   activate();
  });
 }
 function closeRadio(){clearRadioPointer();radioOpen=false;radioMode=null;$('radioOverlay')?.classList.add('hidden')}
 function openRadio(mode='z'){
  if(!running||inputBlocked())return;
  if(!RADIO_CATEGORIES[mode])mode='z';
  clearRadioPointer();radioOpen=true;radioMode=mode;const box=$('radioCommands');if(!box)return;
  box.replaceChildren();
  for(const [i,name] of RADIO_CATEGORIES[mode].entries()){
   const spec=RADIO_COMMANDS[name];if(!spec)continue;
   const button=document.createElement('button');button.className='radio-option';
   button.textContent=`${(i+1)%10}   ${spec.label}`;
   radioTap(button,()=>selectRadio(i),box);box.appendChild(button);
  }
  $('radioTitle').textContent='RADIO '+mode.toUpperCase()+' · '+({z:'GROUP ORDERS',x:'TEAM ORDERS',c:'REPORTS',more:'EXTRA VOICES'}[mode]);
  for(const [key,btn] of [['z','radioTabZ'],['x','radioTabX'],['c','radioTabC'],['more','radioTabMore']]){
   $(btn)?.classList.toggle('selected',key===mode);
  }
  $('radioOverlay').classList.remove('hidden');
  box.scrollTop=0;
 }
 function setupRadio(){
  for(const mode of ['z','x','c','more'])radioTap($('radioTab'+(mode==='more'?'More':mode.toUpperCase())),()=>openRadio(mode));
  radioTap($('radioBtn'),()=>radioOpen?closeRadio():openRadio('z'));
  radioTap($('radioClose'),closeRadio);
  $('radioOverlay')?.addEventListener('pointerdown',e=>e.stopPropagation());
  $('radioOverlay')?.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
  for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{if(e.pointerId===radioPointer?.id&&(type==='pointercancel'||!radioPointer.button.contains?.(e.target)))clearRadioPointer()},true);
  for(const type of ['blur','pagehide'])addEventListener(type,clearRadioPointer);
  for(const type of ['touchend','touchcancel'])addEventListener(type,e=>{if(e.touches.length||!radioPointer)return;const owner=radioPointer;setTimeout(()=>{if(radioPointer===owner)clearRadioPointer()},80)},{capture:true,passive:true});
  document.addEventListener?.('blockstrike:reset-controls',clearRadioPointer);
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden)clearRadioPointer()});
  addEventListener('keydown',e=>{
   if(radioOpen){
    if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRadio();return}
    const match=/^(Digit|Numpad)([0-9])$/.exec(e.code);
    if(match){e.preventDefault();e.stopImmediatePropagation();selectRadio(match[2]==='0'?9:Number(match[2])-1);return}
    if(['KeyZ','KeyX','KeyC'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();openRadio(e.code.slice(3).toLowerCase());return}
    // Keep movement, reload and combat shortcuts usable while radio is open; buys close radio.
    if(['KeyB','KeyO'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();return}
   }
   if(!running||inputBlocked())return;
   const modes={KeyZ:'z',KeyX:'x',KeyC:'c'};
   if(modes[e.code]){e.preventDefault();e.stopImmediatePropagation();openRadio(modes[e.code])}
  },true);
  $('scoreBtn')?.addEventListener('click',e=>{e.stopPropagation();if(running)setScoreboard(!sbOpen)});
  $('scoreboard')?.addEventListener('click',e=>{if(isT&&e.target===$('scoreboard'))setScoreboard(false)});
  $('scoreClose')?.addEventListener('click',()=>setScoreboard(false));
 }
 function loadTexture(name){
  if(!textureCache.has(name)){textureCache.set(name,new THREE.TextureLoader().load(((name.startsWith('muzzleflash')||name==='radio-marker')?'assets/cs16-sprites/':'assets/phase10/fx/')+name+'.png'));}
  return textureCache.get(name);
 }
 function addEffect(sprite,lifetime){effects.push({sprite,lifetime,age:0});}
 const brassGeometry=new THREE.CylinderGeometry(.012,.012,.045,8);
 function viewAttachment(state,index){
  const point=state?.presentation?.attach[index];
  if(!point)return null;
  const [name,x,y,z]=point;
  const bone=vm.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  if(!bone)return null;
  const position=vm.worldToLocal(bone.localToWorld(new THREE.Vector3(x,y,z)));
  return position.length()<2&&position.z<-.10?position:null;
 }
 function muzzlePlayer(k,display){
  if(!vm||!viewScene||!R)return;
  const state=vm.userData.weaponAnimation;
  const variant=state?.presentation?.flash[state.activeName]??0;
  const muzzle=viewAttachment(state,variant)||flash?.position||V(.12,-.05,-.6);
  if(display==='shield'||!['usp','m4a1'].includes(k)||Phase9.unsilenced(k)){
   const name=k==='m3'||k==='xm1014'?'muzzleflash3':'muzzleflash1';
   const pos=muzzle.clone();pos.z-=.015;
   if(!GoldSrcSprites.play(vm,name,pos,{scale:.005,life:.055})){
   const tex=loadTexture(name);
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
   sprite.position.copy(muzzle);sprite.position.z-=.015;sprite.scale.set(.23,.23,1);
   vm.add(sprite);addEffect(sprite,.055);
   }
  }
  const smoke=['usp','glock18','p228','deagle','elite','fiveseven'].includes(k);
  GoldSrcSprites.play(vm,smoke?'pistol_smoke1':'rifle_smoke1',muzzle,{scale:.0017,fps:60,delay:.038,opacity:.23});
  const eject=viewAttachment(state,1);
  if(eject&&variant!==1&&k!=='elite'){
   const shell=new THREE.Mesh(brassGeometry,new THREE.MeshStandardMaterial({color:k==='m3'||k==='xm1014'?0xa43f31:0xa97e39,roughness:.4,metalness:.5,transparent:true,depthWrite:false}));
   shell.position.copy(eject);shell.position.x*=Math.sign(vm.scale.x);
   viewScene.add(shell);
   effects.push({sprite:shell,lifetime:.32,age:0,velocity:new THREE.Vector3(1.35*Math.sign(vm.scale.x),.42,.38)});
  }
  limitEffects(36);
 }
 function muzzleBot(b){
  if(!b?.g||!S||(['usp','m4a1'].includes(b.weaponId)&&b.silenced))return;
  const pos=V(),forward=V(-Math.sin(b.g.rotation.y),0,-Math.cos(b.g.rotation.y));
  const held=b.weaponModel?.find(m=>m.visible&&m.userData.attachBone==='Bip01 R Hand');
  if(held?.geometry.boundingBox){const box=held.geometry.boundingBox;pos.copy(held.localToWorld(V(box.max.x,0,Math.max(0,box.max.z*.5))))}
  else {pos.copy(b.g.position).add(V(0,(window.bspCol?.56:1.18)-(b.crouchPose||0)*.24,0));pos.addScaledVector(forward,(W[b.weaponId]?.len||.55)*.65)}
  if(GoldSrcSprites.play(S,'muzzleflash2',pos,{scale:.0078,life:.09}))return;
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:loadTexture('muzzleflash2'),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  m.position.copy(pos);
  m.scale.set(.38,.38,1);S.add(m);addEffect(m,.11);limitEffects(36);
 }
 function bloodImpact(b,point){
  if(!S||!point)return;
  const ids=['blood_v1_blood1','blood_v1_blood2','blood_v2_blood3'];
  const tex=loadTexture(ids[(Math.random()*ids.length)|0]);
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,color:0xffffff}));
  m.position.copy(point);m.position.y+=.1;m.scale.set(.7,.65,1);S.add(m);addEffect(m,.75);limitEffects(36);
 }
 function limitEffects(max){while(effects.length>max){const e=effects.shift();e.sprite.parent?.remove(e.sprite);e.sprite.material.dispose()}}
 function updateFX(dt){updateRadio();for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;
  if(e.age>=e.lifetime){e.sprite.parent?.remove(e.sprite);e.sprite.material.dispose();effects.splice(i,1)}
  else {
   if(e.velocity){
    e.velocity.y-=5*dt;e.sprite.position.addScaledVector(e.velocity,dt);
    e.sprite.rotation.x+=16*dt;e.sprite.rotation.z+=9*dt;
   }
   e.sprite.material.opacity=clamp((e.lifetime-e.age)/Math.min(e.lifetime,.28),0,1);
  }
 }}
 function clearFX(){for(const e of effects){e.sprite.parent?.remove(e.sprite);e.sprite.material.dispose()}effects.length=0}
 function init(){initMatchSettings();setupRadio()}
 init();
 return {get config(){return config},get profiles(){return PROFILES},counts,setConfig,preview,resetMatch,roundStart,registerBot,prepareBotRound,creditBot,recordDefuseKit,onBotDeath,onPlayerDeath,
  renderBoard,seenEnemy,noticeDamage,orientAwareness,goal,radioGoal,tacticalGoal,soundEvent,command,radioCommands:RADIO_COMMANDS,radioCategories:RADIO_CATEGORIES,selectRadio,openRadio,maybeBotGrenade,botTalk,friendlyHit,grenadeThrown,friendlyFlash,radioSpeaking,radioBlink,resetVoices,roundEnd,closeRadio,muzzlePlayer,muzzleBot,bloodImpact,updateFX,clearFX,debugBots:()=>bots.map(b=>({id:b.botId,team:b.team,dead:!!b.dead,role:b.objectiveRole,site:b.siteAssignment,radio:b.radioOrder?.mode,waypoint:b.localRoute?.from,pathLength:b.localRoute?.points?.length||0,destination:b.localRoute?.goal?.toArray(),position:b.g.position.toArray(),stuck:b.stuck||0,replans:b.localRoute?.replans||0,lastSeen:b.lastSeen?.pos?.toArray()})),getDebugState:()=>({players:config.players,difficulty:config.difficulty,roster:roster.length,orders:roster.filter(r=>r.bot.radioOrder).length,radioOpen,fx:effects.length})};
})();
