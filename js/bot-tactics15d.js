/* Batch 15D — bounded tactical movement that never accesses hidden enemy state. */
const BotTactics15D=(()=>{
 'use strict';
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 function engage(bot,target,order){
  const p=bot.g.position,dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz)||1;
  const ux=dx/d,uz=dz/d,hold=bot.radioOrder?.mode==='hold';
  if(hold)return {x:0,z:0};
  if(bot.weaponId==='knife')return d>.45?{x:ux,z:uz}:{x:0,z:0};
  // Attack cautiously, avoid fighting inside another soldier's collision hull.
  const ranged=['awp','scout','g3sg1','sg550'].includes(bot.weaponId),preferred=ranged?24:bot.personality==='aggressive'?10:bot.personality==='defensive'?17:13;
  let approach=d>preferred+4?1:d<preferred*.6?-.65:d<preferred?-.15:0;
  if((bot.hp??100)<30&&d<22)approach=Math.min(approach,-.8);
  const side=(bot.strafe||1)*(ranged?.18:d<24?.47:.20);
  return {x:ux*approach-uz*side,z:uz*approach+ux*side};
 }
 function separate(bot,others,scale=1){
  if(!bot||!others)return {x:0,z:0};
  const p=bot.g.position;let x=0,z=0;
  for(const ally of others){if(ally===bot||ally.dead||ally.team!==bot.team||Math.abs(p.y-ally.g.position.y)>.94)continue;
   let dx=p.x-ally.g.position.x,dz=p.z-ally.g.position.z,d2=dx*dx+dz*dz;
   if(d2<=.001&&bot.botId&&ally.botId){
    const sign=bot.botId<ally.botId?-1:1;dx=.04*sign;dz=.037*sign;d2=dx*dx+dz*dz;
   }
   if(d2>.001&&d2<4){const weight=clamp((2-Math.sqrt(d2))/2,0,1);x+=dx/Math.sqrt(d2)*weight;z+=dz/Math.sqrt(d2)*weight}
  }
  const l=Math.hypot(x,z);return l>0?{x:x/l*Math.min(.8,l)*scale,z:z/l*Math.min(.8,l)*scale}:{x:0,z:0};
 }
 // Slow followers in a shared lane rather than treating a moving teammate as
 // a static obstacle. Team checks and vertical tolerance use Hammer scale.
 function queueSpeed(bot,others,x,z,speed,k=.02){
  const len=Math.hypot(x,z);if(len<.05||speed<=0)return 1;
  const p=bot.g.position,ux=x/len,uz=z/len;let factor=1;
  for(const b of others){
   if(b===bot||b.dead||b.team!==bot.team||Math.abs(b.g.position.y-p.y)>36*k)continue;
   const dx=b.g.position.x-p.x,dz=b.g.position.z-p.z,a=dx*ux+dz*uz,l=Math.abs(dx*uz-dz*ux);
   if(a<=0||a>80*k||l>24*k)continue;
   const v=(b.vel?.[0]||0)*ux+(b.vel?.[1]||0)*uz;
   // A stopped leader waiting for an allied refuge is not an invitation to push.
   if(v<=20*k){
    const st=b.trafficYield,intent=b.trafficIntent;
    if(st?.passer===b&&['back','side'].includes(st.phase)&&intent&&intent.x*ux+intent.z*uz>.7)factor=Math.min(factor,clamp((a-40*k)*3/speed,0,1));
    continue;
   }
   factor=Math.min(factor,clamp((v+Math.max(0,a-40*k)*3)/speed,.0,1));
  }
  return factor;
 }
 function recover(bot,requested,moved,speed,dt,routeDriven=true){
  if(!requested||bot.localRoute?.flight&&bot.onGround===false){bot.stuck=0;bot.recoveryTime=0;return false}
  const progress=moved>=Math.min(.025,speed*dt*.18);
  bot.stuck=progress?0:(bot.stuck||0)+dt;
  if(bot.recoveryTime>0)bot.recoveryTime=Math.max(0,bot.recoveryTime-dt);
  if(bot.stuck>.8){bot.stuck=0;bot.nav=null;bot.layoutNav=null;
   if(routeDriven&&bot.localRoute){const route=bot.localRoute,next=route.points?.[0];
    if(next&&route.from!==null&&route.from!==next.id){route.blocked.add(route.from+':'+next.id);if(route.blocked.size>30)route.blocked.clear()}
    route.until=0;route.direct=false;route.directCheck=0;route.avoidDirect=performance.now()/1000+2;
   }
   if(bot.patrolGoal)bot.patrolDeadline=0;
   bot.strafe=-(bot.strafe||1);bot.recoveryTime=.65;return true}
  return false;
 }
 function sidestep(bot,x,z){
  if(!(bot.recoveryTime>0))return {x,z};
  const l=Math.hypot(x,z)||1,side=bot.strafe||1;
  return {x:x*.25-z/l*side*.95,z:z*.25+x/l*side*.95};
 }
 // Bounded right-of-way for opposing allied traffic. Only a verified, supported
 // retreat and side pocket are used; the live actor hull is never disabled.
 function clearJunction(bot,now){
  const st=bot.trafficJunction;if(!st)return;
  for(const b of st.members||[st.passer,st.waiter])if(b.trafficJunction===st){
   b.trafficJunction=null;b.trafficConvoyWait=false;b.trafficPass=null;b.junctionRetry=now+.5;
  }
 }
 function clearYield(bot,now){
  clearJunction(bot,now);
  const state=bot.trafficYield;if(!state)return;
  for(const b of [state.yielder,state.passer,state.rear?.bot].filter(Boolean))if(b.trafficYield===state){
   b.trafficYield=null;b.trafficPass=null;b.trafficIntent=null;b.trafficMeet=null;b.trafficRetry=now+1;
   if(b.localRoute){b.localRoute.until=0;b.localRoute.directCheck=0;}
  }
 }
 function yieldPocket(bot,heading,col,front=null){
  const p=bot.g.position,T=col.T,k=T.k,h=BSP.toHammer(T,p.toArray());
  const axis=BSP.toHammer(T,[p.x+heading[0]*k,p.y,p.z+heading[1]*k]).map((v,i)=>v-h[i]);
  const len=Math.hypot(axis[0],axis[1]);if(len<.01)return null;
  const x=axis[0]/len,y=axis[1]/len;
  // Search only a short straight retreat, then a perpendicular refuge. The
  // walkability probe checks ground at every step rather than trusting a ray.
  for(const back of [24,48,72,96,128,160,192,224]){
   const q=LocalBSPNav.floorAt(col,[h[0]-x*back,h[1]-y*back,h[2]],12);
   if(!q||Math.abs(q[2]-h[2])>8||!LocalBSPNav.walkable(col,h,q,240))continue;
   for(const sign of [-1,1]){
    const side=LocalBSPNav.floorAt(col,[q[0]-y*40*sign,q[1]+x*40*sign,q[2]],12);
    if(!side||Math.abs(q[2]-side[2])>8||!LocalBSPNav.walkable(col,q,side,48))continue;
    if(front){
     const g=BSP.toGame(T,q),sg=BSP.toGame(T,side);
     if((g[0]-front.back[0])*heading[0]+(g[2]-front.back[2])*heading[1]>-48*k||Math.hypot(sg[0]-front.side[0],sg[2]-front.side[2])<48*k)continue;
    }
    // Give the passer a full 32-unit hull plus margin on the main lane.
    const lane=[q[0]-x*48,q[1]-y*48,q[2]];
    if(!LocalBSPNav.walkable(col,q,lane,56))continue;
    return {back:BSP.toGame(T,q),side:BSP.toGame(T,side),rejoin:p.toArray(),distance:back};
   }
  }
  return null;
 }
 // Snapshot a bounded convoy when a pair negotiates a refuge. Only nearby,
 // same-lane, same-heading teammates with fresh navigation intent qualify.
 function convoy(passer,yielder,heading,others,k,now){
  const p=passer.g.position,dx=-heading[0],dz=-heading[1];
  return others.filter(b=>{
   const i=b.trafficIntent,q=b.g.position;
   if(b===passer||b===yielder||b.dead||b.blinded>0||b.team!==passer.team||b.trafficYield||b.trafficJunction||!i||now-i.t>.25)return false;
   const x=q.x-p.x,z=q.z-p.z,a=x*dx+z*dz;
   return a<0&&a>=-160*k&&Math.abs(x*dz-z*dx)<=24*k&&Math.abs(q.y-p.y)<=8*k&&i.x*dx+i.z*dz>.7;
  }).sort((a,b)=>a.g.position.distanceToSquared(p)-b.g.position.distanceToSquared(p)).slice(0,3);
 }
 // A two-member retreat train uses a separate refuge for its rear actor.
 // Reject larger retreat groups rather than sending the leader into them.
 function retreatPlan(bot,other,heading,col,others,now){
  const pocket=yieldPocket(bot,heading,col),k=col.T.k;
  if(!pocket)return null;
  const behind=convoy(bot,other,[-heading[0],-heading[1]],others,k,now);
  if(behind.length>1)return null;
  if(!behind.length)return {pocket,rear:null};
  const rear=behind[0],refuge=yieldPocket(rear,heading,col,pocket);
  return refuge?{pocket,rear:{bot:rear,pocket:refuge,phase:'back'}}:null;
 }
 function retreatMove(rear,p,k,returning){
  if(returning&&rear.phase==='parked')rear.phase='return';
  let dest=rear.phase==='back'||rear.phase==='return'?rear.pocket.back:rear.phase==='rejoin'?rear.pocket.rejoin:rear.pocket.side;
  let dx=dest[0]-p.x,dz=dest[2]-p.z,d=Math.hypot(dx,dz);
  if(d<5*k){
   rear.phase=({back:'side',side:'parked',return:'rejoin',rejoin:'done'})[rear.phase]||rear.phase;
   dest=rear.phase==='side'?rear.pocket.side:rear.phase==='rejoin'?rear.pocket.rejoin:dest;
   dx=dest[0]-p.x;dz=dest[2]-p.z;d=Math.hypot(dx,dz);
  }
  return ['parked','done'].includes(rear.phase)||d<.001?{x:0,z:0}:{x:dx/d*Math.min(.28,d/(32*k)),z:dz/d*Math.min(.28,d/(32*k))};
 }
 function convoyPending(st,others,k,now){
  const ref=st.rear?.pocket.back||st.pocket.back,h=st.heading;
  // Release followers that turn away, stop publishing eligible intent, die,
  // or clear the refuge. New arrivals cannot extend a reservation forever.
  st.followers=(st.followers||[]).filter(b=>{
   const i=b.trafficIntent,q=b.g.position;
   return others.includes(b)&&!b.dead&&!(b.blinded>0)&&b.team===st.passer.team&&i&&now-i.t<=.25&&i.x*h[0]+i.z*h[1]<-.7&&Math.abs(q.y-ref[1])<=8*k&&(q.x-ref[0])*h[0]+(q.z-ref[2])*h[1]>=-40*k;
  });
  return st.followers.length>0;
 }
 // Reserve a level crossing for two small same-direction allied streams.
 // Never admit opposing approaches, new arrivals, or unverified walk geometry.
 function junction(bot,heading,col,others,now){
  const k=col.T.k,p=bot.g.position;
  let st=bot.trafficJunction;
  if(st){
   const progress=(b,h)=>(b.g.position.x-st.x)*h[0]+(b.g.position.z-st.z)*h[1];
   const invalid=(b,h)=>{
    const i=b.trafficIntent,q=b.g.position;
    return !others.includes(b)||b.dead||b.blinded>0||b.trafficYield||b.trafficJunction!==st||b.team!==st.passer.team||!i||now-i.t>.25||i.x*h[0]+i.z*h[1]<.8||Math.abs(q.y-st.y)>8*k;
   };
   const ph=[st.dx,st.dz],wh=[st.wx,st.wz];
   if(now>st.until||st.passing.every(b=>progress(b,ph)>48*k)||others.some(o=>!st.members.includes(o)&&!o.dead&&Math.abs(o.g.position.y-st.y)<72*k&&Math.hypot(o.g.position.x-st.x,o.g.position.z-st.z)<st.radius*k)||st.passing.some(b=>invalid(b,ph))||st.waiting.some(b=>invalid(b,wh))){clearJunction(bot,now);return null;}
   if(st.waiting.includes(bot)){bot.trafficConvoyWait=true;bot.trafficPass=null;return {x:0,z:0};}
   return null;
  }
  if(now<(bot.junctionRetry||0)||bot.trafficYield)return null;
  for(const ally of others){
   const i=ally.trafficIntent,q=ally.g.position;
   if(ally===bot||ally.dead||ally.blinded>0||ally.team!==bot.team||ally.trafficYield||ally.trafficJunction||!i||now-i.t>.25||now<(ally.junctionRetry||0)||Math.abs(p.y-q.y)>8*k)continue;
   const [ux,uz]=heading,vx=i.x,vz=i.z,dot=ux*vx+uz*vz,cross=ux*vz-uz*vx;
   if(Math.abs(dot)>.25||Math.abs(cross)<.95)continue;
   const dx=q.x-p.x,dz=q.z-p.z,a=(dx*vz-dz*vx)/cross,b=(dx*uz-dz*ux)/cross;
   if(a<32*k||b<32*k||a>128*k||b>128*k||Math.abs(a-b)>64*k)continue;
   const cx=p.x+a*ux,cz=p.z+a*uz;
   const valid=(pos,hx,hz)=>LocalBSPNav.walkable(col,BSP.toHammer(col.T,pos.toArray()),BSP.toHammer(col.T,[cx+hx*52*k,pos.y,cz+hz*52*k]),260);
   if(!valid(p,ux,uz)||!valid(q,vx,vz))continue;
   const A=[bot],B=[ally];let unsafe=false;
   // Only one follower per approach; reject any unexpected nearby actor.
   for(const o of others){
    if(o===bot||o===ally||o.dead)continue;
    const r=o.g.position,ox=r.x-cx,oz=r.z-cz,oi=o.trafficIntent;
    if(Math.abs(r.y-p.y)>=72*k||Math.hypot(ox,oz)>=200*k)continue;
    if(o.team!==bot.team||o.blinded>0||o.trafficYield||o.trafficJunction||!oi||now-oi.t>.25||now<(o.junctionRetry||0)||Math.abs(r.y-p.y)>8*k){unsafe=true;break;}
    const follow=(hx,hz,d)=>oi.x*hx+oi.z*hz>.95&&Math.abs(ox*hz-oz*hx)<=8*k&&-(ox*hx+oz*hz)>=d+40*k;
    const inA=follow(ux,uz,a),inB=follow(vx,vz,b);
    if(inA===inB|| (inA?A:B).length>=2||!valid(r,inA?ux:vx,inA?uz:vz)){unsafe=true;break;}
    (inA?A:B).push(o);
   }
   if(unsafe)continue;
   const holdA=a>=80*k,holdB=b>=80*k;if(!holdA&&!holdB)continue;
   const priorityA=A.some(o=>o.trafficPriority),priorityB=B.some(o=>o.trafficPriority);
   const passA=holdB&&(!holdA||(priorityA!==priorityB?priorityA:a<b||a===b&&String(bot.botId)<String(ally.botId)));
   const passing=passA?A:B,waiting=passA?B:A,members=[...A,...B];
   st={passer:passing[0],waiter:waiting[0],passing,waiting,members,x:cx,y:p.y,z:cz,dx:passA?ux:vx,dz:passA?uz:vz,wx:passA?vx:ux,wz:passA?uz:vz,radius:200,until:now+4};
   for(const o of members){o.trafficJunction=st;o.trafficPass=null;}
   if(waiting.includes(bot)){bot.trafficConvoyWait=true;return {x:0,z:0};}
   return null;
  }
  return null;
 }
 function trafficYield(bot,x,z,eligible,col,others,now){
  const len=Math.hypot(x,z),k=col?.T.k||.02,p=bot.g.position;
  bot.trafficConvoyWait=false;
  if(!eligible||!col||bot.dead||bot.blinded>0){clearYield(bot,now);bot.trafficIntent=null;bot.trafficMeet=null;return null;}
  if(len>.08)bot.trafficIntent={x:x/len,z:z/len,t:now};
  else if(!bot.trafficYield){clearJunction(bot,now);bot.trafficIntent=null;bot.trafficMeet=null;return null;}
  let st=bot.trafficYield;
  if(st){
   const members=[st.yielder,st.passer,st.rear?.bot].filter(Boolean);
   if(now>st.until||members.some(b=>b.dead||b.blinded>0||!others.includes(b)||b.trafficYield!==st)){clearYield(bot,now);return null;}
   const q=st.passer.g.position,ref=st.rear?.pocket.back||st.pocket.back;
   if(st.rear&&bot===st.rear.bot){
    const move=retreatMove(st.rear,p,k,st.phase==='rear-return');
    if(st.rear.phase==='done'){clearYield(bot,now);return null;}
    return move;
   }
   if(st.rear&&st.rear.phase!=='parked'&&st.phase==='back')return {x:0,z:0};
   if(st.phase==='parked'){
    const waiting=convoyPending(st,others,k,now);
    if(!waiting&&(q.x-ref[0])*st.heading[0]+(q.z-ref[2])*st.heading[1]<-40*k)st.phase='return';
   }
   if(bot===st.passer)return ['parked','return','rejoin','rear-return'].includes(st.phase)?null:{x:0,z:0};
   if(st.phase==='rear-return')return {x:0,z:0};
   let dest=st.phase==='rejoin'?st.pocket.rejoin:st.phase==='back'||st.phase==='return'?st.pocket.back:st.pocket.side;
   let dx=dest[0]-p.x,dz=dest[2]-p.z,d=Math.hypot(dx,dz);
   if(st.phase==='rejoin'&&d<5*k){if(st.rear){st.phase='rear-return';return {x:0,z:0};}clearYield(bot,now);return null;}
   if(st.phase==='return'&&d<5*k){st.phase='rejoin';dest=st.pocket.rejoin;dx=dest[0]-p.x;dz=dest[2]-p.z;d=Math.hypot(dx,dz);}
   else if((st.phase==='back'||st.phase==='side')&&d<5*k){
    st.phase=st.phase==='back'?'side':'parked';dest=st.pocket.side;
    dx=dest[0]-p.x;dz=dest[2]-p.z;d=Math.hypot(dx,dz);
   }
   // Slow near a refuge to avoid oscillating across it with coarse AI ticks.
   return st.phase==='parked'||d<.001?{x:0,z:0}:{x:dx/d*Math.min(.28,d/(32*k)),z:dz/d*Math.min(.28,d/(32*k))};
  }
  // A registered follower brakes rather than trying to sidestep a stopped
  // convoy into a wall. Once the refuge is occupied it resumes live steering.
  const reservation=others.find(b=>b.trafficYield?.passer===b&&b.trafficYield.followers?.includes(bot))?.trafficYield;
  if(reservation&&now<=reservation.until&&bot.trafficIntent){
   if(['back','side'].includes(reservation.phase)&&bot.trafficIntent.x*reservation.heading[0]+bot.trafficIntent.z*reservation.heading[1]<-.7){bot.trafficConvoyWait=true;bot.trafficPass=null;return {x:0,z:0};}
   if(reservation.phase==='parked')return null;
  }
  if(len<=.08||now<(bot.trafficRetry||0))return null;
  const heading=[x/len,z/len];
  const crossing=junction(bot,heading,col,others,now);
  if(crossing||bot.trafficJunction)return crossing;
  let meeting=false;
  for(const ally of others){
   const intent=ally.trafficIntent;
   if(ally===bot||ally.dead||ally.blinded>0||ally.team!==bot.team||ally.trafficYield||ally.trafficJunction||!intent||now-intent.t>.25||now<(ally.trafficRetry||0))continue;
   const q=ally.g.position,dx=q.x-p.x,dz=q.z-p.z;
   if(Math.abs(q.y-p.y)>8*k||Math.hypot(dx,dz)>52*k||dx*heading[0]+dz*heading[1]<=0||Math.abs(dx*heading[1]-dz*heading[0])>24*k||intent.x*heading[0]+intent.z*heading[1]>-.7)continue;
   meeting=true;
   const meet=bot.trafficMeet;
   if(!meet||meet.ally!==ally){bot.trafficMeet={ally,since:now,heading,their:[intent.x,intent.z]};return null;}
   if(now-meet.since<.55&&(bot.trafficWait||0)<.55)return null;
   const own=retreatPlan(bot,ally,meet.heading,col,others,now),their=retreatPlan(ally,bot,meet.their,col,others,now);
   if(!own&&!their){bot.trafficRetry=now+1;continue;}
   const priority=!!bot.trafficPriority,allyPriority=!!ally.trafficPriority;
   const yieldSelf=own&&(!their||(priority!==allyPriority?allyPriority:own.pocket.distance<their.pocket.distance||own.pocket.distance===their.pocket.distance&&String(bot.botId)>String(ally.botId)));
   st={yielder:yieldSelf?bot:ally,passer:yieldSelf?ally:bot,pocket:(yieldSelf?own:their).pocket,rear:(yieldSelf?own:their).rear,heading:yieldSelf?meet.heading:meet.their,phase:'back',until:now+12};
   st.followers=convoy(st.passer,st.yielder,st.heading,others,k,now);
   bot.trafficYield=ally.trafficYield=st;bot.trafficPass=ally.trafficPass=null;
   if(st.rear){st.rear.bot.trafficYield=st;st.rear.bot.trafficPass=null;}
   return trafficYield(bot,x,z,eligible,col,others,now);
  }
  if(!meeting)bot.trafficMeet=null;
  return null;
 }
 function obstacleSteer(bot,x,z,dt,speed,col,others,actors=[]){
  bot.trafficBlocked=false;const length=Math.hypot(x,z);if(length<.08)return {x,z};
  const p=bot.g.position,heading=[x/length,z/length],start=BSP.toHammer(col.T,p.toArray());
  const base=bot.crouching&&Number.isInteger(col.crouchHead)?{...col,head:col.crouchHead}:col;
  const hull=actors.length?BSP.actorHull(base,actors,!!bot.crouching):base;
  const step=Math.max(.09,speed*dt),magnitude=length>1?1:length;
  const teammates=others.filter(b=>b!==bot&&!b.dead&&b.team===bot.team&&Math.abs(b.g.position.y-p.y)<.85&&b.g.position.distanceToSquared(p)<3.4);
  // Commit briefly to one passing side; reevaluating the sign every AI
  // tick makes two approaching actors mirror one another indefinitely.
  const probe=(vx,vz)=>{
   const end=BSP.toHammer(col.T,[p.x+vx*step,p.y,p.z+vz*step]);
   const moved=BSP.stepSlide(hull,start,[end[0]-start[0],end[1]-start[1],0]);
   const g=BSP.toGame(col.T,moved);return ((g[0]-p.x)*vx+(g[2]-p.z)*vz)/step;
  };
  if(bot.trafficPass){
   const pass=bot.trafficPass;pass.left-=dt;
   if(pass.left>0&&probe(pass.x,pass.z)>.35)return {x:pass.x*magnitude,z:pass.z*magnitude};
   bot.trafficPass=null;
  }
  const k=col.T.k;
  const blocker=actors.some(a=>{
   const dx=a.pos[0]-p.x,dz=a.pos[2]-p.z,forward=dx*heading[0]+dz*heading[1],lateral=Math.abs(dx*heading[1]-dz*heading[0]);
   return forward>0&&forward<48*k&&lateral<34*k&&Math.abs(a.pos[1]-p.y)<((bot.crouching?18:36)+(a.crouch?18:36))*k;
  });
  if(blocker&&probe(...heading)<.9&&hull.actorContact){
   for(const sign of [-1,1]){
    const vx=-heading[1]*sign,vz=heading[0]*sign;
    if(probe(vx,vz)>.55){bot.trafficPass={x:vx,z:vz,left:.45};return {x:vx*magnitude,z:vz*magnitude};}
   }
  }
  let choice={x:0,z:0},best=0;
  // Use a consistent passing side relative to travel. A backed-up bot can
  // also try lateral and backward moves instead of pushing forever.
  const queued=(bot.trafficWait||0)>.35;
  for(const radians of queued?[0,-.43,.43,-.87,.87,-1.57,1.57,-2.35,2.35,Math.PI]:[0,-.43,.43,-.87,.87,-1.36,1.36]){
   const c=Math.cos(radians),s=Math.sin(radians),vx=heading[0]*c-heading[1]*s,vz=heading[0]*s+heading[1]*c;
   const point=BSP.toHammer(col.T,[p.x+vx*step,p.y,p.z+vz*step]);
   const moved=BSP.stepSlide(hull,start,[point[0]-start[0],point[1]-start[1],0]);
   const g=BSP.toGame(col.T,moved),progress=(g[0]-p.x)*heading[0]+(g[2]-p.z)*heading[1];
   let penalty=0;
   for(const ally of teammates){
    const d=Math.hypot(g[0]-ally.g.position.x,g[2]-ally.g.position.z);
    const old=Math.hypot(p.x-ally.g.position.x,p.z-ally.g.position.z);
    if(d<old)penalty+=Math.max(0,.83-d)*1.4;
   }
   if(radians===0&&progress>=step*.9&&penalty<.05)return {x,z};
   // A blocked combat approach may require an initial sideways move. Only
   // relax the forward preference during the bounded recovery window.
   const travel=Math.hypot(g[0]-p.x,g[2]-p.z)/step;
   const score=progress/step*.9-penalty-Math.abs(radians)*.055+(bot.recoveryTime>0||queued?travel*.65:0)+(queued&&radians<0?.025:0);
   if(score>best){best=score;choice={x:vx*magnitude,z:vz*magnitude}}
  }
  bot.trafficBlocked=!!hull.actorContact&&best<.35;
  return choice;
 }
 return Object.freeze({engage,separate,recover,sidestep,obstacleSteer,queueSpeed,trafficYield,clearYield});
})();
