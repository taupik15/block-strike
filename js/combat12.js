/* BLOCK STRIKE Tahap 12 Final — deterministic combat rules.
 * Inspired by the documented weapon constants / armor hit groups of ReGameDLL_CS.
 * Browser-world scale: 50 GoldSrc units per game unit. A portable approximation,
 * not a claim of byte-for-byte GoldSrc hitbox or wall-penetration equivalence.
 * No dependency on rendering, DOM, or input: tested in Node directly.
 */
const Combat12=(()=>{
 'use strict';
 const specs={
  usp:[34,.79,1],glock18:[25,.75,1.05],p228:[32,.8,1.25],deagle:[54,.81,1.5],
  elite:[36,.75,1.05],fiveseven:[20,.885,1.5],
  mac10:[29,.82,.95],tmp:[20,.85,1],mp5:[26,.84,1],ump45:[30,.82,1],p90:[21,.885,1.5],
  galil:[30,.98,1.55],ak47:[36,.98,1.55],famas:[30,.96,1.4],m4a1:[32,.97,1.4],
  aug:[32,.96,1.4],sg552:[33,.955,1.4],scout:[75,.98,1.7],awp:[115,.99,1.95],
  g3sg1:[80,.98,1.65],sg550:[70,.98,1.45],m3:[20,.7,1],xm1014:[20,.7,1],m249:[32,.97,1.5],
  knife:[15,1,1.7]
 };
 const TABLE=Object.freeze(Object.fromEntries(Object.entries(specs).map(([k,v])=>[k,Object.freeze({damage:v[0],rangeModifier:v[1],armorFactor:v[2],pellets:k==='m3'?9:k==='xm1014'?6:1})])));
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 function baseDamage(id,{silenced=false,burst=false,knifeStab=false,backstab=false,firstSlash=false}={}){
  if(id==='knife')return (knifeStab?65:firstSlash?20:15)*(knifeStab&&backstab?3:1);
  if(id==='usp')return silenced?30:34;
  if(id==='m4a1')return silenced?33:32;
  if(id==='famas')return burst?34:30;
  return TABLE[id]?.damage??0;
 }
 function rangeDamage(id,raw,worldDistance,{silenced=false,scale=.02}={}){
  const s=TABLE[id];if(!s||!Number.isFinite(worldDistance))return raw;
  const modifier=id==='m4a1'&&silenced?.95:s.rangeModifier;
  // Original weapon range modifiers are applied per 500 GoldSrc units.
  return raw*Math.pow(modifier,Math.max(0,worldDistance)/(scale>0?scale:.02)/500);
 }
 const HIT={head:4,chest:1,body:1,stomach:1.25,arm:1,leg:.75,generic:1};
 function armorAffects(hitgroup,helmet,kind='bullet'){
  if(kind==='fall')return false;
  if(kind==='explosion')return true;
  if(hitgroup==='head')return !!helmet;
  return !['leg','knife_unarmored'].includes(hitgroup);
 }
 function reduceArmor(damage,armor,hitgroup,helmet,weaponId,kind='bullet'){
  const points=Math.max(0,armor||0);
  if(!points||!armorAffects(hitgroup,helmet,kind))return {hpDamage:damage,armorUsed:0};
  const ratio=clamp(.5*(TABLE[weaponId]?.armorFactor||1),.1,.99);
  const absorb=(damage-damage*ratio)*.5; // armor bonus from CS damage model
  if(absorb>points)return {hpDamage:damage-points/.5,armorUsed:points};
  return {hpDamage:damage*ratio,armorUsed:absorb};
 }
 function resolve({weaponId,raw,hitgroup='chest',range=0,armor=0,helmet=false,kind='bullet',silenced=false,burst=false,knifeStab=false,backstab=false,firstSlash=false,scale=.02}={}){
  const base=raw??baseDamage(weaponId,{silenced,burst,knifeStab,backstab,firstSlash});
  const group=Object.prototype.hasOwnProperty.call(HIT,hitgroup)?hitgroup:'chest';
  const hit=kind==='bullet'?(HIT[group]||1):1;
  const damage=kind==='bullet'?rangeDamage(weaponId,base,range,{silenced,scale})*hit:base;
  const reduction=reduceArmor(damage,armor,group,helmet,weaponId,kind);
  // ReGameDLL TakeDamage truncates final bullet/knife health damage to an
  // integer AFTER armor; armor itself remains fractional. Keep the analytical
  // result for diagnostics. Explosion/fall rules remain project-specific.
  const appliedHpDamage=kind==='bullet'||kind==='melee'?Math.max(0,Math.trunc(reduction.hpDamage)):reduction.hpDamage;
  return {...reduction,appliedHpDamage,baseDamage:base,rawDamage:damage,hitgroup:group};
 }
 // Resolve one shotgun discharge against a single victim. Keep per-pellet
 // hitgroup/range and sequential armor depletion, but truncate HP once.
 function resolveVolley(hits,options={}){
  let armor=Math.max(0,options.armor||0),hpDamage=0,rawDamage=0,armorUsed=0,hitgroup='chest',strongest=-1;
  for(const h of hits){const q=resolve({...options,raw:h.raw,hitgroup:h.part,range:h.distance,armor,helmet:!!options.helmet&&armor>0});
   hpDamage+=q.hpDamage;rawDamage+=q.rawDamage;armorUsed+=q.armorUsed;armor=Math.max(0,armor-q.armorUsed);
   if(q.rawDamage>strongest){strongest=q.rawDamage;hitgroup=q.hitgroup;}
  }
  return {hpDamage,rawDamage,armorUsed,appliedHpDamage:Math.max(0,Math.trunc(hpDamage)),hitgroup};
 }
 // DefaultDeploy in ReGameDLL_CS locks primary attack for .75s. AWP/Scout
 // override that value. Draw animation duration is not the gameplay lock.
 function deployTime(id){return id==='awp'?1.45:id==='scout'?1.25:.75;}
 function armorPrice(id,points,helmet){
  if(id==='kevlar')return 650;
  if(id==='helmet')return helmet?650:points>=100?350:1000;
  return 0;
 }
 // Fire intervals and magazine reload duration from ReGameDLL_CS wpn_shared and weapons.h.
 // Shotguns use the existing per-shell animation-driven reload instead of the magazine time.
 const timing=Object.freeze(Object.fromEntries(Object.entries({
  usp:[.15,2.7],glock18:[.15,2.2],p228:[.15,2.7],deagle:[.225,2.2],elite:[.122,4.5],fiveseven:[.15,2.7],
  mac10:[.07,3.15],tmp:[.07,2.12],mp5:[.075,2.63],ump45:[.1,3.5],p90:[.066,3.4],galil:[.0875,2.45],ak47:[.0955,2.45],famas:[.0825,3.3],m4a1:[.0875,3.05],aug:[.0825,3.3],sg552:[.0825,3],scout:[1.25,2],awp:[1.45,2.5],g3sg1:[.25,3.5],sg550:[.25,3.35],m3:[.875,2.3],xm1014:[.25,2.8],m249:[.1,4.7]
 }).map(([id,[rate,reload]])=>[id,Object.freeze({rate,reload})])));
 // Shotgun reload start/insert intervals from ReGameDLL_CS. Bot reload
 // commits one shell at a time. Magazine reload is an atomic transfer.
 const shellTiming=Object.freeze({m3:.45,xm1014:.30});
 function beginBotReload(b,w){
  if(!w||b.reloadLeft>0||!(b.reserve>0)||b.ammo>=w.mag)return false;
  b.reloadStage=shellTiming[b.weaponId]?'start':null;
  b.reloadLeft=b.reloadStage?.55:w.rl;
  b.cd=Math.max(b.cd||0,b.reloadLeft);return true;
 }
 function advanceBotReload(b,w,dt){
  if(!(b.reloadLeft>0)||!w)return;
  let left=b.reloadLeft-Math.max(0,Number.isFinite(dt)?dt:0);
  if(left>1e-8){b.reloadLeft=left;return;}
  if(!b.reloadStage){const n=Math.max(0,Math.min(w.mag-b.ammo,b.reserve||0));b.ammo+=n;b.reserve-=n;b.reloadLeft=0;return;}
  // Consume elapsed time across phase boundaries; no per-frame lost time.
  while(left<=1e-8){
   if(b.reloadStage==='insert'&&b.ammo<w.mag&&b.reserve>0){b.ammo++;b.reserve--;}
   if(b.ammo>=w.mag||!(b.reserve>0)){b.reloadLeft=0;b.reloadStage=null;return;}
   b.reloadStage='insert';left=shellTiming[b.weaponId]+Math.min(0,left);
  }
  b.reloadLeft=left;b.cd=Math.max(b.cd||0,left);
 }
 function interruptBotReload(b){
  if(b.reloadStage!=='insert'||!(b.ammo>0))return false;
  b.reloadStage=null;b.reloadLeft=0;b.cd=0;return true;
 }
 function fireInterval(id,zoom=false){return zoom&&['aug','sg552'].includes(id)?.135:timing[id]?.rate??.4}
 // Stance-based angular spread. Coefficients for rifles/SMGs come from the
 // corresponding PrimaryAttack routines. Accuracy growth/pistol recovery is
 // a bounded browser approximation, not the original shared random sequence.
 const spreadProfiles={
  ak47:[.0275,.04,.07,.04,.4],galil:[.0375,.04,.07,.04,.3],famas:[.02,.03,.07,.03,.3],m4a1:[.02,.035,.07,.035,.4],aug:[.02,.035,.07,.035,.4],sg552:[.02,.035,.07,.035,.4],m249:[.03,.045,.095,.045,.5],
  mac10:[.03,0,.03,0,.375],tmp:[.03,0,.03,0,.25],mp5:[.04,0,.04,0,.2],ump45:[.04,0,.04,0,.24],p90:[.045,0,.115,0,.3]
 };
 const pistolSpread={usp:[.1,.25,1.3,.125],glock18:[.1,.165,1,.075],p228:[.15,.255,1.5,.075],deagle:[.13,.25,1.5,.115],elite:[.1,.175,1.3,.08],fiveseven:[.15,.255,1.5,.075]};
 function shotSpread(id,{speed=0,onGround=true,crouch=false,zoom=false,silenced=false,shots=0,scale=.02}={}){
  const moving=speed/(scale>0?scale:.02)>140,walking=speed/(scale>0?scale:.02)>5;
  if(id==='awp')return !onGround?.85:moving?.25:walking?.1:!zoom?.1:crouch?0:.001;
  if(id==='scout')return !onGround?.2:moving?.075:!zoom?.025:crouch?0:.007;
  if(id==='g3sg1'||id==='sg550')return !onGround?.45:moving?.15:!zoom?.055:crouch?.025:.035;
  if(id==='m3')return .0675;
  if(id==='xm1014')return .0725;
  const p=id==='usp'?(silenced?[.15,.25,1.3,.125]:[.1,.225,1.2,.08]):pistolSpread[id];if(p){const a=clamp(.12+shots*.055,.12,.55);return p[!onGround?2:walking?1:crouch?3:0]*a;}
  const r=spreadProfiles[id];if(r){const a=clamp(.2+shots*shots*.012,.2,1.25);let spread=!onGround?r[3]+r[4]*a:moving?r[1]+r[2]*a:r[0]*a;if(id==='m4a1'&&silenced&&onGround&&!moving)spread=.025*a;return spread;}
  return 0;
 }
 // Original M3/XM1014 have distinct buckshot cones and trace ranges.
 function shotRange(id,slot,scale=.02){return (id==='m3'?3000:id==='xm1014'?3048:slot==='pistol'?4096:8192)*scale;}
 // Buckshot uses a bounded circular cone. Preserve other weapons' existing
 // triangular random spread and the supplied RNG for deterministic tests.
 function spreadOffset(id,spread,rng=Math.random){
  const shotgun=id==='m3'||id==='xm1014';
  for(let attempt=0;attempt<32;attempt++){
   const x=rng()+rng()-1,y=rng()+rng()-1;
   if(!shotgun||x*x+y*y<=1)return [x*spread,y*spread];
  }
  return [0,0]; // pathological scripted RNG; never loop indefinitely
 }
 function knifeBackstab(dx,dz,victimYaw){
  const length=Math.hypot(dx,dz);
  return length>1e-6&&(dx*(-Math.sin(victimYaw||0))+dz*(-Math.cos(victimYaw||0)))/length>.8;
 }
 // Recoil offsets in radians, independent from input aim. Standing kickback
 // coefficients are sourced from weapon-specific KickBack calls; pistol/shotgun
 // values and recovery below are approximations. No permanent camera drift.
 // Weapon-specific KickBack coefficients from ReGameDLL_CS PrimaryAttack.
 // Order: moving, airborne, crouched, standing. Preserve source branch order.
 const recoilProfiles={"ak47":[[1.5,0.45,0.225,0.05,6.5,2.5,7],[2,1,0.5,0.35,9,6,5],[0.9,0.35,0.15,0.025,5.5,1.5,9],[1,0.375,0.175,0.0375,5.75,1.75,8]],"m4a1":[[1,0.45,0.28,0.045,3.75,3,7],[1.2,0.5,0.23,0.15,5.5,3.5,6],[0.6,0.3,0.2,0.0125,3.25,2,7],[0.65,0.35,0.25,0.015,3.5,2.25,7]],"famas":[[1,0.45,0.275,0.05,4,2.5,7],[1.25,0.45,0.22,0.18,5.5,4,5],[0.575,0.325,0.2,0.011,3.25,2,8],[0.625,0.375,0.25,0.0125,3.5,2.25,8]],"sg552":[[1,0.45,0.28,0.04,4.25,2.5,7],[1.25,0.45,0.22,0.18,6,4,5],[0.6,0.35,0.2,0.0125,3.7,2,10],[0.625,0.375,0.25,0.0125,4,2.25,9]],"mac10":[[0.9,0.45,0.25,0.035,3.5,2.75,7],[1.3,0.55,0.4,0.05,4.75,3.75,5],[0.75,0.4,0.175,0.03,2.75,2.5,10],[0.775,0.425,0.2,0.03,3,2.75,9]],"tmp":[[0.8,0.4,0.2,0.03,3,2.5,7],[1.1,0.5,0.35,0.045,4.5,3.5,6],[0.7,0.35,0.125,0.025,2.5,2,10],[0.725,0.375,0.15,0.025,2.75,2.25,9]],"mp5":[[0.5,0.275,0.2,0.03,3,2,10],[0.9,0.475,0.35,0.0425,5,3,6],[0.225,0.15,0.1,0.015,2,1,10],[0.25,0.175,0.125,0.02,2.25,1.25,10]],"ump45":[[0.55,0.3,0.225,0.03,3.5,2.5,10],[0.125,0.65,0.55,0.0475,5.5,4,10],[0.25,0.175,0.125,0.02,2.25,1.25,10],[0.275,0.2,0.15,0.0225,2.5,1.5,10]],"p90":[[0.45,0.3,0.2,0.0275,4,2.25,7],[0.9,0.45,0.35,0.04,5.25,3.5,4],[0.275,0.2,0.125,0.02,3,1,9],[0.3,0.225,0.125,0.02,3.25,1.25,8]],"m249":[[1.1,0.5,0.3,0.06,4,3,8],[1.8,0.65,0.45,0.125,5,3.5,8],[0.75,0.325,0.25,0.025,3.5,2.5,9],[0.8,0.35,0.3,0.03,3.75,3,9]],"galil":[[1,0.45,0.28,0.045,3.75,3,7],[1.2,0.5,0.23,0.15,5.5,3.5,6],[0.6,0.3,0.2,0.0125,3.25,2,7],[0.65,0.35,0.25,0.015,3.5,2.25,7]],"aug":[[1,0.45,0.275,0.05,4,2.5,7],[1.25,0.45,0.22,0.18,5.5,4,5],[0.575,0.325,0.2,0.011,3.25,2,8],[0.625,0.375,0.25,0.0125,3.5,2.25,8]]};
 const movingFirst=new Set(['ak47','m4a1','galil','famas','aug','sg552']);
 const rad=Math.PI/180;
 function fireRecoil(state,id,{moving=false,crouch=false,air=false,random=.5}={}){
  const old=state||{},shots=(old.shots||0)+1,profiles=recoilProfiles[id],p=profiles?.[moving&&movingFirst.has(id)?0:air?1:moving?0:crouch?2:3];let pitch=old.pitch||0,yaw=old.yaw||0,side=old.side||1;
  if(p){pitch=Math.min(p[4]*rad,pitch+(p[0]+p[2]*(shots===1?0:shots))*rad);yaw=clamp(yaw+side*(p[1]+p[3]*(shots===1?0:shots))*rad,-p[5]*rad,p[5]*rad);if(random<1/(p[6]+1))side=-side;}
  else {const amount=id==='m3'?5:id==='xm1014'?4:['awp','scout'].includes(id)?2:id==='deagle'?2:1.2;pitch=Math.min(8*rad,pitch+amount*rad*(air?1.5:1));yaw=clamp(yaw+(random-.5)*.6*rad,-2*rad,2*rad);}
  return {shots,pitch,yaw,side,quiet:0,id,releaseShots:null};
 }
 function recoverRecoil(state,dt,held=false){
  if(!state)return null;
  const elapsed=Math.max(0,dt),decay=Math.exp(-elapsed*9);
  const automatic=!!recoilProfiles[state.id],quiet=held?0:(state.quiet||0)+elapsed;
  // GoldSrc caps the spray counter at 15 on release, then removes one
  // count after .4s and every .0225s. Browser recovery uses elapsed time.
  const releaseShots=held?null:state.releaseShots??Math.min(15,state.shots);
  const shots=held?state.shots:automatic?Math.max(0,releaseShots-(quiet<.4?0:1+Math.floor((quiet-.4+1e-9)/.0225))):quiet>.38?0:state.shots;
  return {...state,quiet,releaseShots,shots,pitch:state.pitch*decay,yaw:state.yaw*decay};
 }
 // ReGameDLL distinguishes small flinch from weapon-specific large flinch.
 // Use the velocity modifier and default large-flinch impulse (170 HU/s).
 // Recovery remains time-based rather than the native per-command increment.
 const largeFlinchWeapons=new Set(['scout','aug','sg550','galil','famas','awp','m3','m4a1','g3sg1','deagle','sg552','ak47']);
 function tag(actor,damage,kind,{weaponId='',hitgroup='chest',crouch=false,scale=.02,source=null,position=null}={}){
  if(!(damage>0)||!['bullet','melee'].includes(kind))return;
  const large=!crouch&&hitgroup!=='leg'&&largeFlinchWeapons.has(weaponId);
  const k=Number.isFinite(scale)&&scale>0?scale:.02,vel=actor.vel||[0,0],vy=actor.vy||0;
  if(large&&Math.hypot(...vel,vy)/k>=300)return;
  actor.hitSlow=large?.65:.5;
  // TakeDamageImpulse: normalize victim minus attacker, not camera/aim.
  // Feed ordinary movement velocity so walls, floors and ceilings still collide.
  if(large&&position&&source){
   const dx=position.x-source.x,dy=position.y-source.y,dz=position.z-source.z,n=Math.hypot(dx,dy,dz);
   if(Number.isFinite(n)&&n>1e-8){const f=170*k/n;actor.vel=[vel[0]+dx*f,vel[1]+dz*f];actor.vy=vy+dy*f;}
  }
 }
 function recoverTag(actor,dt){actor.hitSlow=Math.min(1,(actor.hitSlow??1)+Math.max(0,dt)*1.5);return actor.hitSlow;}
 // Material tags from the user-supplied CS16 archive (sound/materials.txt).
 const materials=Object.freeze({"snow":"N","a_snow":"N","znow1":"N","tsbgvent":"G","tscaution":"M","tscprflr":"M","tscrtesd":"M","tscrtetp":"M","tsflrgrt":"G","tshull2":"M","tshull4":"M","tshull7":"M","tshull8":"M","tshull9":"M","tsibeam":"M","tsnoskd":"G","tsoily":"M","tsplainred":"M","tsrfgrvl":"D","tsshutters":"G","tsvent":"G","747wall_x4":"M","-1a747plane_":"M","-0a747plane_":"M","747inv_block":"M","planegen1":"M","pl_out_shell":"M","overhead_x4":"M","curtain3":"W","blueback_x4":"W","chair1_x4":"W","planeseatsid":"W","brickpath":"D","64crate0":"W","64crate1":"W","64cratetop":"W","bigcrate0":"W","bigcrate1":"W","bigcrate2":"W","bigcratetop":"W","chestdrawers":"W","cratebox":"W","crateboxlabe":"W","oldwood":"W","panelwood":"W","wbarrelside":"W","wbarreltop":"W","wdndrawer":"W","wdbdrawers":"W","traintop01":"M","traintop02":"M","dumpsterfron":"M","dumpsterside":"M","tracks01":"D","tracks02":"D","gravel01":"D","gravel02":"D","gravelgrass0":"D","grass01":"D","wood01":"W","{cstrike_oe4":"V","-0cstrike_fj":"W","-0cstrike_me":"M","-0cstrike_mh":"T","-0cstrike_mj":"W","-0cstrike_we":"M","-1cstrike_fj":"W","-1cstrike_me":"M","-1cstrike_mh":"T","-1cstrike_mj":"W","-1cstrike_we":"M","-2cstrike_me":"M","-2cstrike_we":"M","-3cstrike_me":"M","-4cstrike_me":"M","-5cstrike_me":"M","-6cstrike_me":"M","cstrike_ce2x":"M","cstrike_ch3t":"T","cstrike_cj2b":"W","cstrike_de6h":"M","cstrike_de6v":"M","cstrike_dj2o":"W","cstrike_fe2g":"G","cstrike_fe2s":"M","cstrike_fe4c":"M","cstrike_fh4w":"T","cstrike_fj2d":"W","cstrike_ft2d":"D","cstrike_ft2m":"D","cstrike_ft4a":"D","cstrike_me1c":"M","cstrike_me1g":"G","cstrike_me2d":"M","cstrike_me2r":"M","cstrike_me4d":"M","cstrike_me4g":"M","cstrike_me4m":"M","cstrike_me4r":"G","cstrike_me7c":"M","cstrike_oe1b":"M","cstrike_oe1l":"M","cstrike_oe1s":"M","cstrike_oe2s":"M","cstrike_oe2v":"V","cstrike_oe4f":"M","cstrike_oe4p":"M","cstrike_oe4v":"V","cstrike_oe6t":"G","cstrike_we2r":"M","{cxchana":"G","{cxchanb":"G","{cxcnstrctpo":"M","{cxcrtna":"D","{cxcrtnd":"D","{cxcrtnf":"D","{cxgate":"M","{fence2":"M","cxbarrela":"W","cxbooksa":"D","cxbooksb":"D","cxbooksc":"D","cxbooksd":"D","cxbookse":"D","cxbooksf":"D","cxbrusha":"N","cxbrushb":"N","cxcnstrcttar":"D","cxcnstrctwoo":"W","cxcrptb":"D","cxcrptc":"D","cxcrptd":"D","cxdecwdc":"W","cxdecwdd":"W","cxdrc":"W","cxdrd":"W","cxgrounda":"D","cxgroundc":"D","cxgroundd":"D","cxgroundh":"D","cxgroundk":"D","cxmarblec":"T","cxmarblee":"T","cxmrbla":"T","cxroofa":"W","cxruga":"D","cxsolida":"G","cxsolidb":"G","cxsolidc":"G","cxstairsd":"W","cxstairse":"W","cxstairsf":"W","cxtapa":"D","cxtapb":"D","cxtapc":"D","cxtapd":"D","cxtape":"D","cxwllbooksa":"D","cxwllh":"W","cxwooda":"W","cxwoodb":"W","cxwoodd":"W","cxwoodf":"W","cxwoodh":"W","cxwoodi":"W","cxwoodj":"W","cxwoodk":"W","cxwoodl":"W","cxwoodm":"W","{pi_benchsid":"M","{pi_chairbac":"W","{pi_orrery01":"M","{pi_orrery02":"M","{pi_orrery03":"M","{pi_railing":"M","{pi_scaffold":"M","{pi_window":"M","pi_art1":"W","pi_art2":"W","pi_art3":"W","pi_art4":"W","pi_barrel":"W","pi_barrelt":"W","pi_bcase":"W","pi_bigdoor":"W","pi_brusha":"D","pi_brushb":"D","pi_buckets":"M","pi_buckett":"S","pi_chairleg":"W","pi_chairtop":"W","pi_floorst1":"T","pi_floorst1g":"T","pi_floorst4":"T","pi_floorst4g":"T","pi_floorst5":"T","pi_floorwd1":"W","pi_floorwd2":"W","pi_floorwd3":"W","pi_grnmetal":"M","pi_grnmetalp":"M","pi_grnmetalt":"M","pi_ground":"X","pi_lantern":"M","pi_motor":"M","pi_orrery04":"M","pi_orrery05":"M","pi_orrery06":"M","pi_orrery07":"M","pi_potb":"D","pi_roof":"T","pi_roofedge":"T","pi_rug1":"D","pi_rug2":"D","pi_rug3":"D","pi_rug4":"D","pi_rug5":"D","pi_rug6":"D","pi_rust":"M","pi_scaffold2":"M","pi_secretf":"W","pi_secrets":"W","pi_signexc":"T","pi_signexd":"T","pi_steptop1":"T","pi_steptop1d":"T","pi_sundial":"M","pi_ticketwnd":"Y","pi_treetr1":"W","pi_treetr2":"W","pi_wood1":"W","pi_wood2":"W","pi_wood3":"W","pi_wood4":"W","pi_wood5":"W","pi_woodceil":"W","{ikcanopt":"W","{ikcanopy":"W","{ikcnp1":"W","{ikfencea":"G","{ikfenceb":"G","{ikfencec":"G","{ikjungwt":"W","{ikjungwt2":"W","{ikjungwt3":"W","{ikjungwt4":"W","{ikvinea":"W","{ikvineb":"W","{ikvinec":"D","{ikvined":"W","-0ikjungw":"W","-1ikjungw":"W","-2ikjungw":"W","ikbarls1":"M","ikbarls2":"M","ikbarls3":"M","ikbarls4":"M","ikbarlt1":"M","ikbarlt2":"M","ikbarlt3":"M","ikbarlt4":"M","ikcratea":"W","ikcrateb":"W","ikcratec":"W","ikcrated":"W","ikcratee":"W","ikcratef":"W","ikcrateg":"W","ikcrateh":"W","ikftanks":"M","ikftankt":"M","ikgrndj":"X","ikgrndjt":"D","ikgrndrt":"D","ikgrndrw":"D","ikgrnds":"D","ikgrndt":"D","ikgrndt2":"D","ikgrndt3":"D","ikgrndte":"D","ikgrndte2":"D","ikgrndte3":"D","ikjungw":"W","ikjungwg":"D","ikmetla":"M","ikmetlb":"M","ikmetlc":"M","ikvines":"W","duct_flr01":"V","duct_flr01a":"V","duct_flr02a":"V","duct_vnt":"V","duct_vnt2":"V","duct_wall01":"V","duct_wall02":"V","duct_wall03":"V","duct_wall04":"V","silo2_cor":"V","out_grvl1":"D","out_grvl2":"D","out_grvl2b":"D","out_grvl3":"D","out_mud1":"D","out_snd1":"D","out_snd2":"D","out_snd2b":"D","out_snd2c":"D","out_wlk":"D","out_grss1":"D","out_dirt1":"D","out_dirt2":"D","generic48":"D","generic49":"D","generic51":"D","generic52":"D","generic93":"D","out_pave2":"D","out_snbag":"D","out_snbag2":"D","out_snbagb":"D","out_snbagc":"D","out_tnt2":"D","out_tnt1":"D","out_tnt1b":"D","out_tnt1c":"D","out_tnt3":"D","out_tnt3b":"D","out_net1":"D","out_net1b":"D","frostsewflr":"D","generic109":"G","generic015c":"G","generic015d":"G","generic015e":"G","generic015f":"G","generic015g":"G","generic015h":"G","generic015i":"G","generic015":"G","generic015a":"G","generic015b":"G","babtech_flr0":"G","crete2_flr03":"G","elev1_flr":"G","elev2_flr":"G","elev_flr":"G","grate1":"G","grate2":"G","grate2a":"G","grate3a":"G","grid1":"G","grid2":"G","tnnl_flr12":"G","tnnl_flr12a":"G","tnnl_flr1a":"G","lab1_stair2a":"G","frostfloor":"G","grate4a":"G","grate3b":"G","gratestep1":"G","gratestep2":"G","gratestep3":"G","generic015v":"M","c1a1_flr1":"M","babfl":"M","c2a3turbine1":"M","c2a3turbine2":"M","c2a3turbine3":"M","c2a3turbine4":"M","silo2_p2":"M","silo2_p2b":"M","silo2_p3":"M","silo2_p4":"M","silo2_pan2":"M","silo2_w1":"M","silo2_w1a":"M","silo2_wall1":"M","silo2_w2":"M","babtech_c5":"M","lab3_flr2a":"M","lab3_flr2b":"M","fifties_cmp3":"M","lab1_stair2b":"M","out_qunst11":"M","freezer_flr1":"M","generic015n":"M","generic015p":"M","generic015r":"M","generic0150":"M","generic015s":"M","generic015t":"M","generic015u":"M","generic015v2":"M","c1a4_dome3":"M","generic_114":"S","waterblue":"S","watergreen":"S","toxicgrn":"S","fluid1a":"S","fluid1b":"S","fluid2":"S","fluid3":"S","fluid4":"S","watersilo":"S","watersilo2":"S","waterf":"S","fift_bloodfl":"T","fifties_f01":"T","fifties_f02":"T","fifties_f03":"T","fifties_f03b":"T","fifties_flr0":"T","fifties_flr5":"T","lab1_bluxflr":"T","lab1_blux1":"T","lab1_blux1b":"T","lab1_c4003":"T","lab1_c4a001":"T","lab1_c4b002":"T","lab1_c4d2":"T","lab1_cab2":"T","lab1_floor2a":"T","lab1_floor2b":"T","lab1_floor3":"T","lab1_floor4":"T","lab1_floor5":"T","lab1_floor6":"T","lab1_floor10":"T","lab1_flr3":"T","lab1_flr4":"T","lab1_flr4b":"T","lab1_flr4c":"T","lab1_flr4d":"T","lab1_flr5b":"T","lab1_flr5c":"T","lab1_flr5d":"T","lab1_flr6b":"T","lab1_flr6c":"T","lab1_flr6d":"T","lab1_w8flr1":"T","lab1_w8flr1b":"T","lab1_w8flr1c":"T","lab1_w8flr1d":"T","c2a4_flr6":"T","c1a2_flr1":"T","c1a2_flr2":"T","c1a0_labflrb":"T","c1a0_labflrc":"T","c1a0_labflrd":"T","c1a0_labflre":"T","c1a0_labflr":"T","crate01":"W","crate02":"W","crate02b":"W","crate03":"W","crate04":"W","crate05":"W","crate06":"W","crate07":"W","crate08":"W","crate08b":"W","crate09":"W","crate09b":"W","crate09c":"W","crate19":"W","crate20":"W","crate21":"W","crate22":"W","crate23":"W","crate25":"W","fifties_dr6":"W","fifties_dr6a":"W","fifties_cch1":"W","fifties_cch2":"W","fifties_cch3":"W","fifties_cch4":"W","fifties_dr1k":"W","fifties_dr2":"W","fifties_dr7":"W","fifties_dr8":"W","fifties_dr9":"W","fifties_dsk1":"W","out_slat01":"W","out_wd":"W","out_cac1":"W","out_cac2":"W","bcrate02":"W","bcrate03":"W","bcrate04":"W","bcrate05":"W","bcrate06":"W","bcrate07":"W","bcrate08":"W","bcrate12":"W","bcrate14":"W","bcrate15":"W","bcrate16":"W","bcrate17":"W","bcrate18":"W","bcrate25":"W","bcrate26":"W","crate10":"W","crate11":"W","crate12":"W","crate13":"W","crate24":"W","crate27":"W","c3a1_nrc2":"P","c1a1_gad1":"P","c1a1_gad2":"P","c1a1_gad3":"P","c1a1_gad4":"P","c1a1_gad4a":"P","c1a1_ggt8":"P","c1a4_pan1a":"P","c1a4_pan1b":"P","c1a4_swtch1":"P","c2a2_satorb":"P","c2a4_cmp1":"P","c2a4_gad2":"P","c3a2a_w1d":"P","c3a2a_w1e":"P","c3a2a_w2d":"P","c3a2a_w2e":"P","drkmtl_scrn2":"P","drkmtl_scrn3":"P","drkmtl_scrn4":"P","drkmtlt_wall":"P","fifties_ggt8":"P","fifties_mon1":"P","fifties_mon2":"P","fifties_mon3":"P","fifties_mon4":"P","fifties_pan2":"P","generic105":"P","generic106":"P","generic107":"P","generic114":"P","generic87a":"P","generic88a":"P","generic89a":"P","generic113":"P","lab1_cmpm1":"P","lab1_cmpm2":"P","lab1_cmpm3":"P","lab1_cmpm4":"P","lab1_cmpm5":"P","lab1_cmpm6":"P","lab1_cmpm7":"P","lab1_cmpm8":"P","lab1_comp1":"P","lab1_comp2":"P","lab1_comp3":"P","lab1_comp2a":"P","lab1_comp10a":"P","lab1_comp10b":"P","lab1_comp10c":"P","lab1_comp10d":"P","lab1_comp10e":"P","lab1_comp7":"P","lab1_comp8":"P","lab1_comp9a":"P","lab1_comp9a2":"P","lab1_comp9b":"P","lab1_comp9c":"P","lab1_comp9d":"P","lab1_gad2":"P","lab1_gad3":"P","lab1_gad4":"P","lab1_radscrn":"P","lab4_gad3":"P","lab4_gad4":"P","lab4_swtch":"P","lab_compm4":"P","rechargea":"P","tnnl_gad1":"P","tnnl_gad2":"P","tnnl_gad4":"P","c2a4c2c":"P","c2a4w1b":"P","lab1_cmp":"P","lab1_cmp1":"P","lab1_cmp2":"P","lab1_comp3a":"P","lab1_comp3b":"P","lab1_comp3c":"P","lab1_comp3d":"P","lab1_comp4":"P","lab1_comp5":"P","lab1_sw1":"P","lab_crt1":"P","lab_crt10a":"P","lab_crt10b":"P","lab_crt10c":"P","lab_crt10d":"P","lab_crt2":"P","lab_crt3":"P","lab_crt4":"P","lab_crt5":"P","lab_crt6":"P","lab_crt7":"P","lab_crt8":"P","lab_crt9c":"P","cretestch01a":"P","drkmtllgt1":"P","fifts_lght01":"P","fifts_lght3":"P","fifts_lght4":"P","fifties_lgt2":"P","fifts_lght5":"P","gymlight":"P","light1":"P","light2a":"P","light3a":"P","light3b":"P","light3c":"P","light3d":"P","light3e":"P","light3f":"P","light4a":"P","light5a":"P","light5b":"P","light5c":"P","light5d":"P","light5e":"P","light5f":"P","light6a":"P","metalstch2":"P","tnnl_lgt1":"P","tnnl_lgt2":"P","tnnl_lgt3":"P","tnnl_lgt4":"P","elev1_dwn":"P","spotblue":"P","spotgreen":"P","spotred":"P","spotyellow":"P","lab1_gad3b":"P","elev2_pan":"P","elev1_pan":"P","c2a4x_c3":"P","c2a4x_c1":"P","medkit":"P","glass_bright":"Y","glass_dark":"Y","glass_med":"Y","glassblue1":"Y","glassblue2":"Y","glassgreeen":"Y","cubed":"D","cubrusha":"N","cudumpsterc":"M","cugroundb":"D","cuiflra":"T","cuiflrb":"T","cuiflrc":"T","cuiflrd":"T","cuiflre":"T","cuiflrf":"T","custovetop":"M","cutrashb":"M","cuwoodm":"W"});
 function materialType(name){const key=String(name||'').toLowerCase().replace(/^[+-]./,'').replace(/^[{!~ ]/,'').slice(0,12);return materials[String(name||'').toLowerCase().slice(0,12)]||materials[key]||'C';}
 // Conservative world penetration; material and thickness budgets per trace. Thickness must be proven against
 // the original point hull, never inferred from the walking hull or the mesh alone.
 const penetrationSpecs={deagle:[30,1000],ak47:[39,5000],m4a1:[35,4000],galil:[35,4000],famas:[35,4000],aug:[35,4000],sg552:[35,4000],scout:[39,5000],awp:[45,8000],sg550:[35,4000],g3sg1:[39,5000],m249:[35,4000]};
 const surfaceFactors={M:[.15,.2],C:[.25,.5],G:[.5,.4],V:[.5,.45],T:[.65,.3],P:[.4,.45],W:[1,.6]};
 function penetration(id,material,entryDistance,scale=.02){const spec=penetrationSpecs[id],factor=surfaceFactors[material];if(!spec||!factor||entryDistance/scale>spec[1])return null;return {depth:Math.floor(spec[0]*factor[0])*scale,damageFactor:factor[1]};}
 // FireBullets3 trace budgets: 3 traces allow at most two world layers.
 function penetrationLayers(id){return ['awp','scout','g3sg1'].includes(id)?2:penetrationSpecs[id]?1:0;}
 function verifiedWallPass({col,collision,hit,origin,dir,range,weaponId,entryDistance,obstacles,THREE}){
  if(!col?.pointClip||!hit?.object?.userData?.worldSurface||!collision?.wallExit)return null;
  const scale=col.T.k,entry=hit.point;
  if(collision.pointLineBlocked(col,origin,entry.clone().addScaledVector(dir,-.5*scale)))return null;
  const pen=penetration(weaponId,materialType(hit.object.userData.textureName),entryDistance,scale);if(!pen)return null;
  const exit=collision.wallExit(col,entry,dir,pen.depth);if(!exit)return null;
  const travel=origin.distanceTo(exit),remaining=(range-travel)*.5;if(!(remaining>0))return null;
  // AABB guard: no penetration of independently moving or unverified brushes.
  const from=entry.clone().addScaledVector(dir,-.5*scale),length=from.distanceTo(exit),probe=new THREE.Ray(from,dir),box=new THREE.Box3(),point=new THREE.Vector3();
  for(const mesh of obstacles){if(mesh.visible===false||mesh.userData?.worldSurface===true)continue;
   box.setFromObject(mesh);if(box.isEmpty())continue;
   if(box.containsPoint(from)||box.containsPoint(exit)||(probe.intersectBox(box,point)&&from.distanceTo(point)<=length))return null;
  }
  return {exit,remaining,travel,damageFactor:pen.damageFactor};
 }
 const scoped=new Set(['awp','scout','aug','sg552','sg550','g3sg1']);
 return Object.freeze({TABLE,baseDamage,rangeDamage,reduceArmor,resolve,resolveVolley,deployTime,armorPrice,scoped,timing,beginBotReload,advanceBotReload,interruptBotReload,fireInterval,shotSpread,shotRange,spreadOffset,knifeBackstab,fireRecoil,recoverRecoil,tag,recoverTag,materialType,penetration,penetrationLayers,verifiedWallPass});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Combat12;
