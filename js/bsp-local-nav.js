/* Walkable graph for imported BSPs. A cell can hold separate floors. Release pre26AR.8. */
const LocalBSPNav=(()=>{
 const stride=48,limit=7000;
 const axes=[[stride,0],[-stride,0],[0,stride],[0,-stride],[stride,stride],[-stride,stride],[stride,-stride],[-stride,-stride]];
 function floorAt(col,p,depth=76){
  // A slide can finish fractionally inside an inclined plane. Probe from a
  // small safe lift, not directly on that collision boundary.
  for(const lift of [8,4,1,0]){
   const start=[p[0],p[1],p[2]+lift],end=[p[0],p[1],p[2]-depth];
   const trace=BSP.traceAll(col,start,end);
   if(trace.startsolid||!trace.hit||!trace.normal||trace.normal[2]<.7)continue;
   return [p[0],p[1],start[2]-(depth+lift)*trace.frac+.25];
  }
  return null;
 }
 function build(col){
  const nodes=[],cells=new Map();
  const key=(x,y)=>Math.round(x/stride)+','+Math.round(y/stride);
  function connect(p){
   
   const cell=key(p[0],p[1]);
   const layer=cells.get(cell)||[];
   const found=layer.find(n=>Math.abs(n.h[2]-p[2])<40);
   if(found)return found;
   if(nodes.length>=limit)return null;
   const node={id:nodes.length,h:p,pos:BSP.toGame(col.T,p),edges:[]};
   layer.push(node);cells.set(cell,layer);nodes.push(node);
   return node;
  }
  for(const team of Object.values(col.spawnTeams))for(const spawn of team){
   const floor=floorAt(col,[spawn[0],spawn[1],spawn[2]+12],112);
   if(floor)connect(floor);
  }
  for(let i=0;i<nodes.length;i++){
   const node=nodes[i],p=node.h;
   for(const [x,y] of axes){
    let next=p;
    for(let step=0;next&&step<8;step++){
     const moved=BSP.stepSlide(col,next,[x/8,y/8,0]);
     const progress=Math.hypot(moved[0]-next[0]-x/8,moved[1]-next[1]-y/8);
     next=progress>1.2?null:floorAt(col,moved,40);
    }
    const neighbor=next&&connect(next);
    if(neighbor&&neighbor!==node&&walkable(col,next,neighbor.h,80)&&!node.edges.includes(neighbor.id))node.edges.push(neighbor.id);
   }
  }
  return {nodes,col};
 }
 // A ladder waypoint must remain at its own height. Only trust a ladder
 // when it overlaps a real BSP ladder volume and a free standing hull.
 function ladderVolume(col,h){return col.ladders?.find(b=>h.every((x,i)=>x>=b.origin[i]+b.mins[i]-22&&x<=b.origin[i]+b.maxs[i]+22))||null;}
 function ladderPoint(col,h){return ladderVolume(col,h)&&!BSP.traceAll(col,h,h).startsolid;}
 function ladderLink(col,a,b){
  if(!a.ladder&&!b.ladder)return false;
  const av=ladderVolume(col,a.h),bv=ladderVolume(col,b.h);
  if(Math.hypot(a.h[0]-b.h[0],a.h[1]-b.h[1])>48||Math.abs(a.h[2]-b.h[2])>600)return false;
  if(!av||!bv){
   if(!av&&!bv||Math.abs(a.h[2]-b.h[2])>24)return false;
   const bank=av?b.h:a.h,ground=floorAt(col,bank,4);
   if(!ground||Math.abs(ground[2]-bank[2])>4)return false;
  }else if(av!==bv)return false;
  return !BSP.traceAll(col,a.h,b.h).hit;
 }
 // Preserve submerged waypoints rather than projecting them to the pool floor.
 // A swim edge must keep its whole sampled route in deep water and clear the hull.
 function waterPoint(col,h){return !!(col.local&&BSP.waterLevel?.(col,h)>=2&&!BSP.traceAll(col,h,h).startsolid);}
 function waterLink(col,a,b){
  if(!waterPoint(col,a.h)||!waterPoint(col,b.h))return false;
  const d=Math.hypot(...b.h.map((v,i)=>v-a.h[i]));
  if(d>600||BSP.traceAll(col,a.h,b.h).hit)return false;
  const steps=Math.max(1,Math.ceil(d/12));
  for(let i=1;i<steps;i++)if(!waterPoint(col,a.h.map((v,j)=>v+(b.h[j]-v)*i/steps)))return false;
  return true;
 }
 // A water/bank connection is accepted only for a short clear transition
 // with one surface-water endpoint and a supported dry/shallow endpoint.
 function waterExitLink(col,a,b){
  const aw=waterPoint(col,a.h),bw=waterPoint(col,b.h);if(aw===bw)return false;
  const wet=aw?a.h:b.h,bank=aw?b.h:a.h;
  if(BSP.waterLevel(col,wet)!==2||Math.abs(bank[2]-wet[2])>18||Math.hypot(...bank.map((v,i)=>v-wet[i]))>96)return false;
  const ground=floorAt(col,bank,4);if(!ground||Math.abs(ground[2]-bank[2])>4||BSP.traceAll(col,wet,bank).hit)return false;
  let left=false;const steps=Math.max(2,Math.ceil(Math.hypot(...bank.map((v,i)=>v-wet[i]))/8));
  for(let i=1;i<=steps;i++){const h=wet.map((v,j)=>v+(bank[j]-v)*i/steps);if(waterPoint(col,h)){if(left)return false;}else left=true;}
  return left;
 }
 function fromPwf(buf,col,mapName){
  const d=new DataView(buf);
  const string=(offset,n)=>new TextDecoder().decode(new Uint8Array(buf,offset,n)).split('\0')[0];
  if(d.byteLength<80||string(0,8)!=='PODWAY!'||d.getInt32(8,true)!==7)throw new Error('Choose a PODBot v7 PWF.');
  const count=d.getInt32(12,true);
  if(count<1||count>2048||d.byteLength!==80+count*204)throw new Error('Invalid PWF size.');
  if(string(16,32).toLowerCase()!==mapName.toLowerCase())throw new Error('PWF map name does not match the BSP filename.');
  const nodes=Array.from({length:count},(_,id)=>{
   const start=80+id*204;
   if(d.getInt32(start,true)!==id)throw new Error('Invalid PWF waypoint index.');
   const original=[8,12,16].map(o=>d.getFloat32(start+o,true));
   if(!original.every(x=>Number.isFinite(x)&&Math.abs(x)<32768))throw new Error('Invalid PWF position.');
   const flags=d.getInt32(start+4,true),ladder=!!ladderPoint(col,original);
   const water=waterPoint(col,original);
   const h=ladder||water?original:floorAt(col,[original[0],original[1],original[2]+12],90)||original;
   const edges=[],jumps=new Set(),crouch=!!(d.getInt32(start+4,true)&4);
   for(let i=0;i<8;i++){
    const edge=d.getInt16(start+40+i*2,true),flags=d.getUint16(start+56+i*2,true);
    if(edge>=0&&edge<count&&edge!==id&&!(flags&~1)){edges.push(edge);if(flags&1)jumps.add(edge)}
   }
   return {id,h,pos:BSP.toGame(col.T,h),edges,jumps,crouch,camp:!!(flags&128),ladder,water,flags};
  });
  return {nodes,col};
 }
 // A hull LOS alone accepts unsupported ledges and floors on the other side of a drop.
 function walkable(col,start,end,maxDistance=360){
  const dx=end[0]-start[0],dy=end[1]-start[1],d=Math.hypot(dx,dy);
  if(d>maxDistance||Math.abs(end[2]-start[2])>100)return false;
  if(d<2)return Math.abs(end[2]-start[2])<20;
  const steps=Math.ceil(d/18);
  let at=start;
  for(let i=1;i<=steps;i++){
   const x=start[0]+dx*i/steps,y=start[1]+dy*i/steps;
   const moved=BSP.stepSlide(col,at,[x-at[0],y-at[1],0]);
   if(Math.hypot(moved[0]-x,moved[1]-y)>3)return false;
   at=floorAt(col,moved,40);if(!at)return false;
  }
  return Math.abs(at[2]-end[2])<26;
 }
 // Independent reader for the area and connection portion of CS/CZ NAV v5.
 function fromNav(buffer,col,bspSize){
  const d=new DataView(buffer);let offset=0;
  const u32=()=>{const v=d.getUint32(offset,true);offset+=4;return v};
  const u16=()=>{const v=d.getUint16(offset,true);offset+=2;return v};
  const u8=()=>d.getUint8(offset++);
  const float=()=>{const v=d.getFloat32(offset,true);offset+=4;return v};
  function skip(n){if(n<0||offset+n>d.byteLength)throw Error('Truncated NAV record.');offset+=n}
  if(u32()!==0xfeedface||u32()!==5)throw Error('Expected a GoldSrc/Condition Zero NAV v5.');
  if(u32()!==bspSize)throw Error('NAV was built for a different BSP.');
  const placeCount=u16();if(placeCount>2000)throw Error('NAV place directory too large.');
  for(let i=0;i<placeCount;i++){const n=u16();if(!n||n>256)throw Error('Invalid NAV place.');skip(n)}
  const count=u32();
  if(count<1||count>7000)throw Error('NAV area count exceeds limits.');
  const nodes=[],ids=new Map();
  for(let i=0;i<count;i++){
   const source=u32(),flags=u8(),[x1,y1,z1,x2,y2,z2,z3,z4]=Array.from({length:8},float);
   if(ids.has(source)||![x1,y1,z1,x2,y2,z2,z3,z4].every(n=>Number.isFinite(n)&&Math.abs(n)<=32768))throw Error('Invalid NAV area.');
   ids.set(source,i);
   const p=[(x1+x2)/2,(y1+y2)/2,(z1+z2+z3+z4)/4+56],h=floorAt(col,p,90)||[p[0],p[1],p[2]-20];
   const edges=[];
   for(let side=0;side<4;side++){
    const n=u32();if(n>1500)throw Error('Invalid NAV connections.');
    for(let j=0;j<n;j++)edges.push(u32());
   }
   skip(u8()*17); // hiding spots
   skip(u8()*14); // approach records
   const paths=u32();if(paths>3000)throw Error('Invalid NAV encounter count.');
   for(let j=0;j<paths;j++){skip(10);skip(u8()*5)}
   u16(); // place index
   nodes.push({id:i,h,pos:BSP.toGame(col.T,h),edges,crouch:!!(flags&1),jump:!!(flags&2)});
  }
  for(const n of nodes)n.edges=[...new Set(n.edges.map(id=>ids.get(id)).filter(id=>id!=null&&id!==n.id))];
  return {nodes,col};
 }
 // GRAPH positions use standing-equivalent origins, even for low corridors.
 // Probe with the actual crouched hull and center only when a node requires it.
 function crouchHull(col){return Number.isInteger(col.crouchHead)?{...col,head:col.crouchHead}:null;}
 const lower=h=>[h[0],h[1],h[2]-18];
 const raise=h=>[h[0],h[1],h[2]+18];
 function nodeClear(col,n){const ch=n.crouch&&!n.ladder&&!n.water&&crouchHull(col);return !BSP.traceAll(ch||col,ch?lower(n.h):n.h,ch?lower(n.h):n.h).startsolid;}
 function edgeWalk(col,a,b,maxDistance=600){
  const ch=(a.crouch||b.crouch)&&!a.ladder&&!b.ladder&&!a.water&&!b.water&&crouchHull(col);
  const h=ch||col,start=ch?lower(a.h):a.h,end=ch?lower(b.h):b.h;
  return !BSP.traceAll(h,start,start).startsolid&&!BSP.traceAll(h,end,end).startsolid&&walkable(h,start,end,maxDistance);
 }
 // Verified original Chateau YaPB GRAPH links may cross real steps or diagonal transitions
 // which walkable() rejects due its discrete 18-Hammer sweep. As a bounded
 // fallback, accept only a link that normal grounded physics actually walks
 // from one original waypoint to the other without jumping or teleporting.
 // Auto-generated cell edges and arbitrary direct goals never use this path.
 function authoredWalkLink(col,a,b){
  if(!col?.local||a.crouch||b.crouch||a.ladder||b.ladder||a.water||b.water)return false;
  const rise=b.h[2]-a.h[2],distance=Math.hypot(b.h[0]-a.h[0],b.h[1]-a.h[1]);
  if(Math.abs(rise)>90||distance<30||distance>260)return false;
  if(BSP.traceAll(col,a.h,a.h).startsolid||BSP.traceAll(col,b.h,b.h).startsolid)return false;
  const floorA=floorAt(col,a.h,5),floorB=floorAt(col,b.h,5);
  if(!floorA||!floorB||Math.abs(floorA[2]-a.h[2])>5||Math.abs(floorB[2]-b.h[2])>5)return false;
  const T=col.T,goal=BSP.toGame(T,b.h),speed=250*T.k,dt=.05;
  const st={pos:BSP.toGame(T,a.h),on:true,vy:0,vel:[0,0],jumpHeld:false};
  let stalled=0;
  for(let i=0;i<32;i++){
   const dx=goal[0]-st.pos[0],dz=goal[2]-st.pos[2],d=Math.hypot(dx,dz);
   if(st.on&&d<=24*T.k&&Math.abs(goal[1]-st.pos[1])<=12*T.k&&
      !BSP.traceAll(col,BSP.toHammer(T,st.pos),BSP.toHammer(T,st.pos)).startsolid)return true;
   if(d<.001||st.pos[1]<goal[1]-110*T.k)return false;
   const before=st.pos.slice();
   BSP.movePlayer(col,T,st,[dx/d*speed,dz/d*speed],dt,false,false);
   stalled=st.on&&Math.hypot(st.pos[0]-before[0],st.pos[2]-before[2])<.4*T.k?stalled+1:0;
   if(stalled>=7)return false;
  }
  return false;
 }
 // A straight hull ray rejects low ledges a jump can clear and accepts gaps
 // that cannot be crossed. Validate flagged transitions with the same physics
 // used by bots, with bounded, plausible ground approach velocities.
 function jumpLink(col,a,b){
  if(a.ladder||b.ladder||a.water||b.water)return false;
  const crouch=!!(a.crouch||b.crouch),hull=crouch?crouchHull(col):col;
  if(!hull)return false;
  const start=crouch?lower(a.h):a.h,end=crouch?lower(b.h):b.h,maxSpeed=crouch?250/3:250;
  const dx=b.h[0]-a.h[0],dy=b.h[1]-a.h[1],dz=b.h[2]-a.h[2],d=Math.hypot(dx,dy);
  if(d<4||d>220||dz>45||dz< -100)return false;
  const launch=floorAt(hull,start,4),landing=floorAt(hull,end,4);
  if(!launch||!landing||Math.abs(launch[2]-start[2])>4||Math.abs(landing[2]-end[2])>4)return false;
  const T=col.T,unit=BSP.toGame(T,[dx/d,dy/d,0]),goal=BSP.toGame(T,end);
  const time=(Math.sqrt(2*800*45)+Math.sqrt(Math.max(0,2*800*(45-dz))))/800;
  const nominal=d/Math.max(.15,time);
  const recorded=a.links?.find(l=>l.to===b.id&&l.flags&1)?.velocity;
  const samples=[nominal,nominal*.85,nominal*1.15,0,100,200,250];
  if(recorded)samples.unshift((recorded[0]*dx+recorded[1]*dy)/d);
  for(const speed of new Set(samples.map(v=>Math.max(0,Math.min(maxSpeed,v))).filter(Number.isFinite))){
   const st={pos:BSP.toGame(T,launch),on:true,vy:0,vel:[unit[0]*speed,unit[2]*speed],jumpHeld:false};
   for(let i=0;i<38;i++){
    BSP.movePlayer(col,T,st,[unit[0]*maxSpeed,unit[2]*maxSpeed],.025,i===0,crouch);
    if(i===0&&!st.jumped)break;
    if(st.medium!=='air')break;
    if(st.on){if(i>0&&Math.hypot(st.pos[0]-goal[0],st.pos[2]-goal[2])<=16*T.k&&Math.abs(st.pos[1]-goal[1])<=8*T.k&&!BSP.traceAll(hull,BSP.toHammer(T,st.pos),end).hit)return true;break;}
   }
  }
  return false;
 }
 // Predict a real launch from the current physical state, not an injected
 // nominal velocity. Use the actual AI tick for the first step.
 function predictJump(col,bot,target,speed,dt){
  if(!bot.onGround||bot.jumpHeld||!(speed>0))return false;
  const crouch=!!bot.crouching,hull=crouch?crouchHull(col):col;
  if(!hull)return false;
  const T=col.T,p=bot.g.position,end=crouch?lower(target.h):target.h,goal=BSP.toGame(T,end);
  const st={pos:p.toArray(),on:true,vy:bot.vy||0,vel:[...(bot.vel||[0,0])],jumpHeld:false};
  const step=Math.max(.001,Math.min(.16,dt));
  for(let i=0;i<Math.ceil(1/step);i++){
   const dx=goal[0]-st.pos[0],dz=goal[2]-st.pos[2],d=Math.hypot(dx,dz);
   BSP.movePlayer(col,T,st,d>(crouch?Math.min(.12,6*T.k):.12)?[dx/d*speed,dz/d*speed]:[0,0],step,i===0,crouch);
   if(i===0&&!st.jumped||st.medium!=='air')return false;
   if(st.on)return Math.hypot(st.pos[0]-goal[0],st.pos[2]-goal[2])<=16*T.k&&Math.abs(st.pos[1]-goal[1])<=8*T.k&&!BSP.traceAll(hull,BSP.toHammer(T,st.pos),end).hit;
  }
  return false;
 }
 function jumpCommand(graph,bot,speed,dt,now){
  const nav=bot.localRoute,target=bot.routeJumpTarget,from=graph.nodes[nav?.from];
  if(!nav||!target||!from||!bot.onGround)return null;
  const col=graph.col,T=col.T,p=bot.g.position,k=T.k,key=from.id+':'+target.id;
  const crouch=!!(from.crouch||target.crouch),hull=crouch?crouchHull(col):col;
  // Never predict using a different stance than the movement step.
  const start=crouch?lower(from.h):from.h;
  const direction=q=>{const x=q[0]-p.x,z=q[2]-p.z,d=Math.hypot(x,z);return {x:d>.03?x/d:0,z:d>.03?z/d:0,jump:false};};
  let prep=nav.jumpPrep;
  if(!prep||prep.key!==key)prep=nav.jumpPrep={key,elapsed:0,phase:'approach',runup:null};
  prep.elapsed+=dt;
  const fail=()=>{(nav.jumpCooldown??=new Map()).set(key,now+5);nav.jumpPrep=null;nav.until=0;nav.direct=false;nav.directCheck=0;return {x:0,z:0,jump:false};};
  if(prep.elapsed>2.8||!hull)return fail();
  if(!!bot.crouching!==crouch)return {x:0,z:0,jump:false};
  const h=BSP.toHammer(T,p.toArray()),d=Math.hypot(h[0]-from.h[0],h[1]-from.h[1]);
  const dx=target.h[0]-from.h[0],dy=target.h[1]-from.h[1],len=Math.hypot(dx,dy)||1;
  const along=((h[0]-from.h[0])*dx+(h[1]-from.h[1])*dy)/len;
  const lateral=Math.abs((h[0]-from.h[0])*dy-(h[1]-from.h[1])*dx)/len;
  // Launch only near the designated take-off corridor on supported ground.
  if(prep.phase!=='back'&&d<=100&&along<=18&&lateral<=22&&Math.abs(h[2]-start[2])<=12&&predictJump(col,bot,target,speed,dt)){
   nav.jumpPrep=null;return {...direction(target.pos),jump:true};
  }
  if(prep.phase==='back'){
   if(Math.hypot(p.x-prep.runup[0],p.z-prep.runup[2])<=12*k){prep.phase='run';return direction(from.pos);}
   return direction(prep.runup);
  }
  if(prep.phase==='run'){
   if(along>=-8||d<8){const retreat=direction(prep.runup);fail();return retreat;}
   // Limit the run-in speed so coarse AI ticks cannot skip the take-off window.
   const flightTime=(BSP.JUMP+Math.sqrt(Math.max(0,BSP.JUMP**2-2*BSP.GRAV*(target.h[2]-from.h[2]))))/BSP.GRAV;
   const cmd=direction(from.pos),cap=Math.min(1,Math.max(180,len/Math.max(.15,flightTime))*k/speed);
   return {...cmd,x:cmd.x*cap,z:cmd.z*cap};
  }
  if(d>18&&along< -8)return direction(from.pos);
  // Find a clear runway behind the launch node. Never move or accelerate the
  // actor by assigning momentum; ordinary ground movement supplies it.
  for(const back of [80,56,32]){
   const point=floorAt(hull,[start[0]-dx/len*back,start[1]-dy/len*back,start[2]],18);
   if(point&&Math.abs(point[2]-start[2])<=12&&walkable(hull,h,point,160)&&walkable(hull,point,start,160)){
    prep.runup=BSP.toGame(T,point);prep.phase='back';return direction(prep.runup);
   }
  }
  return fail();
 }
 // Opportunistic, physically verified two-jump boost via a stationary crouched ally.
 // Plans are transient: never add conditional edges to the shared GRAPH or bomb ETA.
 function boostCommand(graph,bot,goal,stationId,now,dt,speed,actors,allies,eligible){
  const p=bot.g.position,col=graph?.col,k=col?.T.k;
  let plan=bot.boostPlan;
  const cancel=()=>{bot.boostPlan=null;bot.boostRetry=now+2;return null;};
  const helperOK=a=>a&&a!==bot&&a.team===bot.team&&!a.dead&&!a.blinded&&a.onGround&&a.crouching&&!a.visibleEnemy&&!a.remoteDoorRoute&&!a.trafficYield&&Math.hypot(...(a.vel||[0,0]))<=5*k;
  const allowed=eligible&&col&&Number.isInteger(col.crouchHead)&&!bot.crouching&&bot.medium!=='water'&&bot.medium!=='ladder'&&dt>=.02&&dt<=.12&&speed>=80*k;
  if(!allowed)return plan?cancel():null;
  if(plan){
   if(plan.graph!==graph||plan.revision!==(graph.geometryRevision||0)||plan.stationId!==stationId||plan.goal.distanceToSquared(goal)>(8*k)**2||!helperOK(plan.helper)||!allies.includes(plan.helper)||plan.helper.g.position.distanceToSquared(plan.anchor)>(2*k)**2||now>plan.deadline||Math.abs(dt-plan.dt)>.012)return cancel();
   const cmd=plan.commands[plan.index];
   if(!cmd){bot.localRoute=null;return cancel();}
   if(p.distanceToSquared(V(...cmd.pos))>(6*k)**2||!!bot.onGround!==cmd.on||!!bot.jumpHeld!==cmd.held||Math.hypot((bot.vel?.[0]||0)-cmd.vel[0],(bot.vel?.[1]||0)-cmd.vel[1])>35*k||Math.hypot(...cmd.wish)>speed+1e-5)return cancel();
   // Check the immediate action against live collision, including new actors.
   const st={pos:p.toArray(),on:!!bot.onGround,vy:bot.vy||0,vel:[...(bot.vel||[0,0])],jumpHeld:!!bot.jumpHeld};
   BSP.moveActor(col,col.T,st,cmd.wish,dt,cmd.jump,false,actors);
   if(st.jumped!==cmd.jump||st.medium!=='air'||st.on!==cmd.nextOn||Math.hypot(...st.pos.map((v,i)=>v-cmd.end[i]))>6*k)return cancel();
   plan.index++;return {x:cmd.wish[0]/speed,z:cmd.wish[1]/speed,jump:cmd.jump};
  }
  const nav=bot.localRoute;
  if(now<(bot.boostRetry||0)||!bot.onGround||bot.jumpHeld||nav?.graph!==graph||nav.direct||nav.points?.length||nav.flight||bot.remoteDoorRoute)return null;
  bot.boostRetry=now+2;
  if(goal.y-p.y<48*k||goal.y-p.y>86*k||Math.hypot(goal.x-p.x,goal.z-p.z)>150*k||Math.hypot(...(bot.vel||[0,0]))>12*k)return null;
  const helper=allies.filter(helperOK).find(a=>{const q=a.g.position,d=Math.hypot(q.x-p.x,q.z-p.z);return d>=32*k&&d<=42*k&&Math.abs(q.y+18*k-p.y)<3*k&&Math.hypot(q.x-goal.x,q.z-goal.z)<90*k;});
  if(!helper)return null;
  const target=graph.nodes.find(n=>teamAllows(n,bot.team)&&!n.crouch&&!n.ladder&&!n.water&&(stationId==null||stationId===n.id)&&V(...n.pos).distanceToSquared(goal)<=(8*k)**2);
  if(!target)return null;
  const end=V(...target.pos),floor=floorAt(col,target.h,4);
  if(!floor||Math.abs(floor[2]-target.h[2])>4||BSP.traceAll(col,target.h,target.h).startsolid)return null;
  const anchor=helper.g.position.clone();
  if(!actors.some(a=>a.crouch&&V(...a.pos).distanceToSquared(anchor)<k*k))return null;
  const initial={pos:p.toArray(),on:true,vy:bot.vy||0,vel:[...(bot.vel||[0,0])],jumpHeld:false};
  const copy=s=>({...s,pos:s.pos.slice(),vel:s.vel.slice()});
  const direction=(st,q,rate)=>{const x=q.x-st.pos[0],z=q.z-st.pos[2],d=Math.hypot(x,z);return d>k?[x/d*rate,z/d*rate]:[0,0];};
  const advance=(st,list,wish,jump)=>{const cmd={pos:st.pos.slice(),vel:st.vel.slice(),on:st.on,held:!!st.jumpHeld,wish,jump};BSP.moveActor(col,col.T,st,wish,dt,jump,false,actors);cmd.end=st.pos.slice();cmd.nextOn=st.on;list.push(cmd);return st.medium==='air'&&(!jump||st.jumped);};
  const onHelper=st=>st.on&&Math.abs(st.pos[1]-anchor.y-54*k)<2*k&&Math.abs(st.pos[0]-anchor.x)<32*k&&Math.abs(st.pos[2]-anchor.z)<32*k;
  // Bounded simulation of takeoff, short run-up on the ally, and second landing.
  for(const delay of [0,.12,.22]){
   const first=copy(initial),prefix=[];
   let landed=false;
   for(let i=0;i<Math.ceil(.9/dt);i++){
    if(!advance(first,prefix,i*dt<delay?[0,0]:direction(first,anchor,Math.min(speed,80*k)),i===0))break;
    if(first.on){landed=onHelper(first);break;}
   }
   if(!landed)continue;
   const run=copy(first),runup=prefix.slice();
   for(let j=0;j<=Math.ceil(.32/dt);j++){
    if(!onHelper(run))break;
    if(!run.jumpHeld){
     for(const rate of [Math.min(speed,100*k),Math.min(speed,180*k),speed]){
      const second=copy(run),commands=runup.slice();
      for(let i=0;i<Math.ceil(1/dt);i++){
       if(!advance(second,commands,direction(second,end,rate),i===0))break;
       if(second.on){
        if(Math.abs(second.pos[1]-end.y)<=4*k&&Math.hypot(second.pos[0]-end.x,second.pos[2]-end.z)<=16*k&&!onHelper(second)&&!BSP.traceAll(col,BSP.toHammer(col.T,second.pos),target.h).hit){
         bot.boostPlan={graph,revision:graph.geometryRevision||0,stationId,goal:goal.clone(),helper,anchor,dt,index:0,commands,deadline:now+3};
         return boostCommand(graph,bot,goal,stationId,now,dt,speed,actors,allies,eligible);
        }
        break;
       }
      }
     }
    }
    if(!advance(run,runup,direction(run,end,Math.min(speed,140*k)),false))break;
   }
  }
  return null;
 }
 // Pursue vertically separated visible opponents through the map route,
 // never by walking directly into a wall beneath the enemy. The threshold
 // is in Hammer units; close targets on the same floor retain normal combat.
 function elevationPursuit(col,from,to){
  if(!col?.local||!from||!to)return false;
  const k=col.T.k,rise=Math.abs(to.y-from.y);
  if(rise>48*k)return true;
  // Chateau's 40-Hammer-unit window ledges also separate two floors.
  // A visible opponent can be shot through the pane, but the standing hull
  // cannot walk there. Use the verified GRAPH route instead of walking at it.
  if(rise<=20*k)return false;
  const a=BSP.toHammer(col.T,from.toArray()),b=BSP.toHammer(col.T,to.toArray());
  const distance=Math.hypot(a[0]-b[0],a[1]-b[1]);
  return distance>24&&distance<=360&&!walkable(col,a,b,360);
 }
 // Validate the ACTUAL manoeuvre against the imported BSP before attempting
 // a broken pane crossing. Some Chateau windows are visible and shootable but
 // their interior-to-exterior approach is not traversable with a standing
 // player hull. Do not make those bots jump indefinitely into solid masonry.
 const windowCrossTests=new WeakMap();
 function crossableWindow(col,b,axis,side,footZ){
  let memo=windowCrossTests.get(b);
  if(!memo){memo=new Map();windowCrossTests.set(b,memo);}
  const key=axis+':'+side+':'+Math.round(footZ/8);
  if(memo.has(key))return memo.get(key);
  const o=b.origin||[0,0,0],cross=1-axis,plane=o[axis]+(b.mins[axis]+b.maxs[axis])*.5,mid=o[cross]+(b.mins[cross]+b.maxs[cross])*.5;
  const start=[0,0,footZ];start[axis]=plane+side*78;start[cross]=mid;
  const airborne=footZ<o[2]+b.mins[2]+1;
  const wishHammer=[0,0,0];wishHammer[axis]=-side*250;
  const wishGame=BSP.toGame(col.T,wishHammer);
  const st={pos:BSP.toGame(col.T,start),on:true,vy:0,vel:[0,0],jumpHeld:false,assistBrokenGlass:true};
  let launched=false,passed=false,ok=false;
  for(let i=0;i<175;i++){
   const h=BSP.toHammer(col.T,st.pos),d=(h[axis]-plane)*side;
   const v=BSP.toHammer(col.T,[(st.vel||[0,0])[0]||0,0,(st.vel||[0,0])[1]||0]);
   const jump=airborne&&!launched&&d<=54&&d>=30&&(-side*v[axis])>90&&st.on;
   BSP.movePlayer(col,col.T,st,[wishGame[0],wishGame[2]],1/60,jump,false);
   launched=launched||!!st.jumped;
   const next=BSP.toHammer(col.T,st.pos);
   if((next[axis]-plane)*side<-54)passed=true;
   if(passed&&st.on){ok=true;break;}
   if(next[2]<footZ-125)break;
  }
  memo.set(key,ok);
  return ok;
 }
 function windowPaneBetween(col,bot,goal){
  if(!col?.local||!bot?.g?.position||!goal||!col.breakables)return null;
  const pos=BSP.toHammer(col.T,bot.g.position.toArray()),end=BSP.toHammer(col.T,goal.toArray());
  let result=null,nearest=Infinity;
  for(const b of col.breakables){
   if(!b?.destroyed||!b.glassPassage||b.yaw)continue;
   const o=b.origin||[0,0,0],axis=(b.maxs[0]-b.mins[0])<=6?0:(b.maxs[1]-b.mins[1])<=6?1:-1;
   if(axis<0)continue;
   const cross=1-axis,plane=o[axis]+(b.mins[axis]+b.maxs[axis])*.5,mid=o[cross]+(b.mins[cross]+b.maxs[cross])*.5;
   const side=Math.sign(pos[axis]-plane),distance=Math.abs(pos[axis]-plane),line=end[axis]-pos[axis];
   if(!side||(end[axis]-plane)*side>=-24||distance<8||distance>124||Math.abs(pos[cross]-mid)>36||pos[2]<o[2]+b.mins[2]-48||pos[2]>o[2]+b.maxs[2]+24||Math.abs(line)<1e-6)continue;
   const crossAt=pos[cross]+(end[cross]-pos[cross])*(plane-pos[axis])/line;
   if(Math.abs(crossAt-mid)>26)continue;
   if(distance<nearest){nearest=distance;result={pane:b,axis,cross,plane,mid,side,pos};}
  }
  return result;
 }
 function windowDetour(col,bot,goal){
  const pane=bot?.onGround&&windowPaneBetween(col,bot,goal);
  return !!pane&&!crossableWindow(col,pane.pane,pane.axis,pane.side,pane.pos[2]);
 }
 // Broken GoldSrc window crossings require an intentional run-up when the
 // outside sill is above the inside floor. The original Chateau GRAPH contains
 // links across such panes, but a normal walk link cannot satisfy their hull
 // geometry. This is a transient, collision-respecting action, not a new edge
 // or a teleport. Only activate near a shattered, verified narrow pane.
 function windowPassage(col,bot,goal,now,dt=1/60,speed=5){
  bot.windowPassageStep=dt;bot.windowPassageSpeed=speed;
  const p=bot?.g?.position;
  if(!col?.local||!p||!goal||!col.breakables)return null;
  // Do not immediately restart a manoeuvre that just stalled against a solid
  // hull or another player. The ordinary GRAPH route gets a recovery window.
  if(now<(bot.windowPassageRetry||0)){bot.windowPassage=null;return null;}
  const pos=BSP.toHammer(col.T,p.toArray()),end=BSP.toHammer(col.T,goal.toArray());
  let plan=bot.windowPassage;
  const cancel=()=>{bot.windowPassage=null;return null};
  const eligible=b=>b?.destroyed&&b.glassPassage&&!b.yaw;
  if(plan){
   if(!eligible(plan.pane)||now>plan.expires)return cancel();
  }else{
   const m=bot.onGround&&windowPaneBetween(col,bot,goal);
   if(!m||!crossableWindow(col,m.pane,m.axis,m.side,m.pos[2]))return null;
   const match={...m,phase:'back',expires:now+4.0,launched:false};
   plan=bot.windowPassage=match;
  }
  const {pane,axis,cross,plane,mid,side}=plan,k=col.T.k;
  const distance=(pos[axis]-plane)*side,other=(end[axis]-plane)*side;
  if(other>=-12&&distance>14)return cancel();
  // Once across the full body width, resume the ordinary combat/GRAPH goal.
  if(distance< -44)return cancel();
  const lower=pos[2]<(pane.origin?.[2]||0)+pane.mins[2]+1;
  const c=(axisValue,crossValue)=>{const h=pos.slice();h[axis]=axisValue;h[cross]=crossValue;const g=BSP.toGame(col.T,h);const dx=g[0]-p.x,dz=g[2]-p.z,len=Math.hypot(dx,dz);return {x:len>.001?dx/len:0,z:len>.001?dz/len:0,jump:false,active:true};};
  // Any remaining sideways mismatch must be corrected before entering a
  // 59-unit window with a 32-unit standing hull.
  if(Math.abs(pos[cross]-mid)>13&&distance>16){
   const align=c(plane+side*Math.max(48,distance),mid);
   // Throttled lateral steering avoids coarse AI-tick overshoot at a 59-unit
   // window; a full-speed left/right toggle can oscillate forever at 32 bots.
   const travel=Math.max(1,(bot.windowPassageStep||1/60)*(bot.windowPassageSpeed||5)/k);
   const scale=Math.min(1,Math.abs(pos[cross]-mid)/travel);
   return {...align,x:align.x*scale,z:align.z*scale};
  }
  if(lower&&!plan.launched&&distance>0){
   // Starting with one's nose against a sill cannot produce a GoldSrc jump.
   // Back away, acquire real ground speed, launch 28–70 Hammer units out.
   if(plan.phase==='back'){
    if(distance<72)return c(plane+side*84,mid);
    plan.phase='run';
   }
   if(distance>70)return c(plane-side*82,mid);
   // Compute actual horizontal velocity in Hammer without depending on the
   // camera basis; a failed low-speed launch retreats for another run-up.
   const rawVelocity=BSP.toHammer(col.T,[(bot.vel||[0,0])[0]||0,0,(bot.vel||[0,0])[1]||0]);
   const towardSpeed=-side*rawVelocity[axis];
   if(distance>=28&&bot.onGround&&!bot.jumpHeld&&towardSpeed>80){plan.launched=true;return {...c(plane-side*82,mid),jump:true};}
   // A bot that arrived at the sill with no runway must back away and
   // accelerate again. Do not keep pushing the standing hull into the jamb.
   if(bot.onGround&&distance<56&&towardSpeed<80){
    plan.slow=(plan.slow||0)+(bot.windowPassageStep||1/60);
    if(plan.slow>.22){plan.phase='back';plan.slow=0;return c(plane+side*84,mid);}
   }else plan.slow=0;
   if(distance<28&&bot.onGround){plan.phase='back';return c(plane+side*84,mid);}
   return c(plane-side*64,mid);
  }
  // Jump persists as actual ballistic motion. Never inject position or VY.
  if(plan.launched&&bot.onGround&&distance>8){plan.launched=false;plan.phase='back';}
  return c(plane-side*86,mid);
 }
 // Report measured bot movement AFTER actual BSP + actor collision resolution.
 // A collision-bound window plan is never treated as permanent progress.
 function windowProgress(bot,active,moved,speed,dt,now){
  if(!active||bot.onGround===false&&bot.windowPassage?.launched){bot.windowPassageStall=0;return false;}
  const threshold=Math.min(.025,Math.max(0,speed)*Math.max(0,dt)*.18);
  bot.windowPassageStall=moved<threshold?(bot.windowPassageStall||0)+dt:0;
  if(bot.windowPassageStall<=.65)return false;
  bot.windowPassage=null;bot.windowPassageStall=0;bot.windowPassageRetry=now+2.5;
  if(bot.localRoute){bot.localRoute.direct=false;bot.localRoute.directCheck=0;bot.localRoute.until=0;bot.localRoute.avoidDirect=bot.windowPassageRetry;}
  return true;
 }
 function routeOrigin(graph,bot){
  const col=graph.col,raw=BSP.toHammer(col.T,bot.g.position.toArray());
  return bot.crouching&&Number.isInteger(col.crouchHead)&&!ladderPoint(col,raw)&&!waterPoint(col,raw)?raise(raw):raw;
 }
 function near(graph,pos,hull=graph.col,origin=null,allowed=null){
  const p=origin||BSP.toHammer(graph.col.T,pos.toArray());
  const candidates=[],size=256,cell=(x,y)=>Math.floor(x/size)+','+Math.floor(y/size);
  if(!graph.nearCells){graph.nearCells=new Map();for(const n of graph.nodes){const key=cell(n.h[0],n.h[1]);if(!graph.nearCells.has(key))graph.nearCells.set(key,[]);graph.nearCells.get(key).push(n);}}
  for(let x=Math.floor((p[0]-450)/size);x<=Math.floor((p[0]+450)/size);x++)for(let y=Math.floor((p[1]-450)/size);y<=Math.floor((p[1]+450)/size);y++)for(const n of graph.nearCells.get(x+','+y)||[]){
   if(!n.edges.length||n.valid===false||allowed&&!allowed.has(n.id))continue;
   const dx=n.h[0]-p[0],dy=n.h[1]-p[1],dz=2*(n.h[2]-p[2]),d=dx*dx+dy*dy+dz*dz;
   if(d<=450*450)candidates.push({n,d});
  }
  candidates.sort((a,b)=>a.d-b.d||a.n.id-b.n.id);
  if(!candidates.length)return null;
  // The source hull/medium is constant throughout this synchronous search.
  // Recompute on the next call, including after any dynamic door change.
  const col=graph.col,ch=crouchHull(col),usingCrouch=!!ch&&hull.head===col.crouchHead&&hull!==col;
  const a={h:p,crouch:usingCrouch,ladder:!!ladderPoint(col,p),water:waterPoint(col,p)};
  return candidates.find(({n})=>edgeWalk(col,a,n,450)||ladderLink(col,a,n)||waterLink(col,a,n)||waterExitLink(col,a,n))?.n||null;
 }
 function teamAllows(node,team){
  if(!node||node.valid===false)return false;
  if(!team)return true;
  const flags=node.teamFlags||0;
  return !(team==='CT'&&(flags&(1<<29))||team==='T'&&(flags&(1<<30)));
 }
 function path(graph,start,end,blocked,weight,team){
  if(!start||!end||!teamAllows(start,team)||!teamAllows(end,team))return null;
  const routes=graph.routes??={pos:graph.nodes.map(n=>n.pos),adj:graph.nodes.map(n=>n.edges)};
  const ids=NavGraph.pathGraph(routes,start.id,end.id,(a,b)=>blocked.has(a+':'+b)||!teamAllows(graph.nodes[b],team),weight);
  return ids?ids.slice(1).map(id=>graph.nodes[id]):null;
 }
 function waypointDistanceSq(p,q){const dx=p[0]-q.x,dy=p[1]-q.y,dz=p[2]-q.z;return dx*dx+dy*dy+dz*dz;}
 function steerNormal(graph,bot,goal,now,stationId=null){
  const pos=bot.g.position;
  let nav=bot.localRoute;
  if(nav?.graph===graph&&nav.flight&&bot.onGround===false){bot.routeJumpTarget=null;bot.routeJump=false;bot.routeCrouch=!!nav.flightCrouch;bot.routeLadder=false;return V(...nav.flight.pos);}
  if(!nav||nav.graph!==graph||nav.geometryRevision!==(graph.geometryRevision||0)||(!nav.flight&&(nav.stationId!==stationId||nav.goal.distanceToSquared(goal)>9))){
   nav=bot.localRoute={graph,geometryRevision:graph.geometryRevision||0,stationId,jumpCooldown:nav?.graph===graph?nav.jumpCooldown:undefined,goal:goal.clone(),points:[],until:0,blocked:new Set(),last:pos.clone(),check:now+.95,from:null};
  }
  if(nav.flight&&bot.onGround===false){bot.routeJumpTarget=null;bot.routeJump=false;bot.routeCrouch=!!nav.flightCrouch;bot.routeLadder=false;return V(...nav.flight.pos);}
  if(nav.flight){
   const k=graph.col.T.k,landing=nav.flight;
   if(nav.from!=null&&waypointDistanceSq(landing.pos,V(pos.x,pos.y+(nav.flightCrouch?18*k:0),pos.z))>(36*k)**2){(nav.jumpCooldown??=new Map()).set(nav.from+':'+landing.id,now+5);}
   nav.flight=null;nav.flightCrouch=false;nav.until=0;nav.directCheck=0;
  }
  const T=graph.col.T,raw=BSP.toHammer(T,pos.toArray()),dest=BSP.toHammer(T,goal.toArray());
  const needsProbe=now>=(nav.directCheck||0)||now>=nav.until||now>=nav.check;
  let h=routeOrigin(graph,bot),hull=graph.col;
  const routePos=V(...BSP.toGame(T,h));
  if(needsProbe){
   if(bot.crouching&&Number.isInteger(graph.col.crouchHead)&&BSP.traceAll(graph.col,h,h).startsolid)hull=crouchHull(graph.col);
   if(!ladderPoint(graph.col,h)&&!waterPoint(graph.col,h)){
    const small=hull!==graph.col,grounded=floorAt(hull,small?lower(h):h,40);
    if(grounded)h=small?raise(grounded):grounded;
   }
  }
  bot.routeJump=false;bot.routeJumpTarget=null;bot.routeCrouch=false;bot.routeLadder=false;
  if(now>=(nav.directCheck||0)){
   nav.direct=stationId==null&&now>=(nav.avoidDirect||0)&&(hull===graph.col&&!ladderPoint(hull,h)&&walkable(hull,h,dest)||waterLink(graph.col,{h},{h:dest})||waterExitLink(graph.col,{h},{h:dest}));
   nav.directCheck=now+.55;
  }
  // Stalls are measured only after an actual movement request in recover(),
  // not by a wall-clock interval that also includes combat/hold orders.
  if(now>=nav.check){nav.last.copy(pos);nav.check=now+.95;}
  if(nav.direct)return goal;
  if(nav.until<=now){
   nav.replans=(nav.replans||0)+1;
   const start=near(graph,pos,hull,h,graph.teamAllowed?.[bot.team]);
   // An endpoint can be geometrically close but unreachable on a directed
   // graph. Restrict attachment to nodes reachable from this start.
   const reachable=start&&reachableFrom(graph,start.id,bot.team);
   const end=stationId==null?near(graph,goal,graph.col,null,reachable):reachable?.has(stationId)?graph.nodes[stationId]:null;
   nav.end=end;
   // Congestion and observed threats affect route cost, not connectivity.
   const teammates=typeof bots==='undefined'?[]:bots.filter(b=>b!==bot&&!b.dead&&b.team===bot.team).map(b=>b.g.position.toArray());
   const threat=bot.lastSeen&&now-bot.lastSeen.t<4?bot.lastSeen.pos.toArray():null;
   const costs=new Map();
   const weight=teammates.length||threat?(a,b)=>{
    if(costs.has(b))return costs.get(b);
    const p=graph.nodes[b].pos;let cost=1;
    for(const q of teammates){const dx=p[0]-q[0],dy=p[1]-q[1],dz=p[2]-q[2];if(dx*dx+dz*dz<3&&Math.abs(dy)<1)cost+=(graph.nodes[b].ladder||graph.nodes[b].narrow)? .45 : .18;}
    if(threat&&bot.personality==='defensive'&&Math.hypot(p[0]-threat[0],p[1]-threat[1],p[2]-threat[2])<7)cost+=.5;
    const result=Math.min(2.5,cost);costs.set(b,result);return result;
   }:null;
   for(const [edge,until] of nav.jumpCooldown||[])if(until<=now)nav.jumpCooldown.delete(edge);
   const blocked=new Set([...nav.blocked,...(nav.jumpCooldown?.keys()||[])]);
   let points=path(graph,start,end,blocked,weight,bot.team);
   // Local traffic must never permanently blacklist the only valid corridor.
   if(!points&&nav.blocked.size){nav.blocked.clear();points=path(graph,start,end,new Set(nav.jumpCooldown?.keys()||[]),weight,bot.team)}
   nav.points=points||[];
   if(points&&start&&waypointDistanceSq(start.pos,routePos)>.22)nav.points.unshift(start);
   nav.from=start?.id??null;
   nav.until=now+(nav.points.length?3+(bot.teamIndex||0)%4*.13:.9);
  }
  const points=nav.points;
  while(points[0]&&waypointDistanceSq(points[0].pos,routePos)<.20)nav.from=points.shift().id;
  if(points[0]){
   const next=points[0],from=graph.nodes[nav.from];
   const jumping=from?.jumpEdges?from.jumpEdges.has(next.id):from?.jumps?.has(next.id)||next.jump&&next.pos[1]>routePos.y+.20;
   bot.routeJump=!!(jumping&&!from?.ladder&&!next.ladder&&!from?.water&&!next.water);
   bot.routeJumpTarget=bot.routeJump?next:null;
   bot.routeLadder=!!(next.ladder&&ladderLink(graph.col,{h:raw,ladder:!!ladderPoint(graph.col,raw)},next));
   bot.routeCrouch=!!(next.crouch||from?.crouch)&&!bot.routeLadder;
   return V(...next.pos);
  }
  // Probe the final leg when a path ends, rather than waiting for the
  // ordinary replan deadline; keep collision validation mandatory.
  if(nav.from!=null&&nav.until>now&&nav.end?.id===nav.from&&now>=(nav.finishCheck||0)){
   nav.finishCheck=now+.3;
   const here=routeOrigin(graph,bot);
   if(stationId==null&&now>=(nav.avoidDirect||0)&&(!BSP.traceAll(graph.col,here,here).startsolid&&walkable(graph.col,here,dest)||waterLink(graph.col,{h:here},{h:dest})||waterExitLink(graph.col,{h:here},{h:dest}))){nav.direct=true;nav.directCheck=now+.55;return goal;}
   nav.until=Math.min(nav.until,now+.3);
  }
  return nav.direct?goal:routePos;
 }
 // Conditional remote links stay OUT of the ordinary graph and objective
 // distance fields. Execute one crossing at a time; bounded lookahead
 // can connect up to three distinct latched doors. Timed detours stay single.
 // Timed doors use a conservative walking-only travel budget; never assume
 // that jumps, ladders, water or other closed doors are instantaneous.
 function remoteBudget(graph,bot,start,link,extra=0){
  const from=graph.nodes[link.from],to=graph.nodes[link.to];
  if(!start||!from||!to)return Infinity;
  const nodes=path(graph,start,from,new Set(),null,bot.team);
  if(!nodes)return Infinity;
  let distance=extra,prev=start;
  const length=(a,b)=>Math.hypot(...a.pos.map((v,i)=>v-b.pos[i]));
  const special=n=>n.crouch||n.ladder||n.water;
  if(special(start)||special(from)||special(to))return Infinity;
  for(const n of nodes){
   if(special(n)||prev.jumpEdges?.has(n.id)||!edgeWalk(graph.col,prev,n))return Infinity;
   distance+=length(prev,n);prev=n;
  }
  distance+=length(from,to);
  const speed=BSP.maxSpeed(bot.weaponId,{scale:graph.col.T.k,zoom:!!bot.aiming,shield:!!bot.shieldRaised})*.5*Math.max(0,Math.min(1,bot.hitSlow??1));
  return speed>0?distance/speed+1.25:Infinity;
 }
 function currentRemoteBudget(graph,bot,link){
  const start=attach(graph,bot);
  return start?remoteBudget(graph,bot,start,link,bot.g.position.distanceTo(V(...start.pos))):Infinity;
 }
 function remotePlan(graph,bot,goal,stationId){
  if(stationId==null&&walkable(graph.col,routeOrigin(graph,bot),BSP.toHammer(graph.col.T,goal.toArray())))return null;
  const start=attach(graph,bot),end=stationId==null?near(graph,goal,graph.col,null,graph.teamAllowed?.[bot.team]):graph.nodes[stationId];
  if(!start||!end||!teamAllows(end,bot.team))return null;
  const reach=reachableFrom(graph,start.id,bot.team);if(reach.has(end.id))return null;
  let best=null,cost=Infinity;
  const links=graph.remoteLinks||[],first=[];
  // Compute a valid first leg exactly as for a single door. A chain never
  // grants a live pass: later legs must be replanned after actual traversal.
  const options=(link,seen)=>link.buttons.filter(b=>seen.has(b.node)&&reachableFrom(graph,b.node,bot.team).has(link.from));
  for(const link of links){
   if(!reach.has(link.from)||reach.has(link.to)||!teamAllows(graph.nodes[link.to],bot.team))continue;
   const status=window.BSPDoors?.remoteStatus(graph.col,link.entry);if(!status)continue;
   const timed=status.wait>=3,canCross=status.state==='open'&&(!timed||currentRemoteBudget(graph,bot,link)<status.remaining);
   const downstream=reachableFrom(graph,link.to,bot.team),direct=downstream.has(end.id);
   if(timed&&!direct)continue;
   let candidate=null,price=Infinity;
   for(const b of canCross?[null]:options(link,reach)){
    if(timed&&b&&!(remoteBudget(graph,bot,graph.nodes[b.node],link,48*graph.col.T.k)<status.wait))continue;
    const via=b?V(...graph.nodes[b.node].pos):bot.g.position,source=V(...graph.nodes[link.from].pos);
    const score=bot.g.position.distanceTo(via)+via.distanceTo(source);
    if(score<price){price=score;candidate={...link,button:b,phase:b?'button':'source',timed};}
   }
   if(!candidate)continue;
   if(direct&&price<cost){cost=price;best=candidate;}
   else if(!direct&&!timed)first.push({first:candidate,at:link.to,used:[link.entry],price});
  }
  if(best)return best;
  // Prefer fewer distinct doors, then the cheapest initial approach. Bound
  // search work on mobile and never repeat an entry (including reverse links).
  let frontier=first.sort((a,b)=>a.price-b.price).slice(0,32),expanded=0;
  for(let depth=2;depth<=3&&frontier.length&&expanded<64;depth++){
   const next=[];
   for(const step of frontier){
    if(expanded++>=64)break;
    const seen=reachableFrom(graph,step.at,bot.team);
    for(const link of links){
     if(step.used.includes(link.entry)||!seen.has(link.from)||seen.has(link.to)||!teamAllows(graph.nodes[link.to],bot.team))continue;
     const status=BSPDoors.remoteStatus(graph.col,link.entry);
     if(status?.wait!==-1||status.state!=='open'&&!options(link,seen).length)continue;
     if(reachableFrom(graph,link.to,bot.team).has(end.id))return {...step.first,chainLength:depth};
     if(depth<3&&next.length<32)next.push({first:step.first,at:link.to,used:[...step.used,link.entry],price:step.price});
    }
   }
   frontier=next;
  }
  return best;
 }
 function steer(graph,bot,goal,now,stationId=null,allowRemote=true){
  const p=bot.g.position,col=graph.col,k=col.T.k;
  bot.remoteDoorWaiting=false;
  let plan=bot.remoteDoorRoute;
  const cancel=()=>{bot.remoteDoorRoute=null;bot.remoteDoorRetry=now+1;bot.localRoute=null;plan=null;};
  if(plan&&(!allowRemote||plan.graph!==graph||plan.revision!==(graph.geometryRevision||0)||plan.stationId!==stationId||plan.goal.distanceToSquared(goal)>1||now>plan.deadline||!BSPDoors.remoteState(col,plan.entry)))cancel();
  if(!allowRemote||bot.localRoute?.flight&&bot.onGround===false||!graph.remoteLinks?.length)return steerNormal(graph,bot,goal,now,stationId);
  if(!plan&&now>=(bot.remoteDoorRetry||0)&&!bot.crouching&&bot.onGround!==false){
   bot.remoteDoorRetry=now+1;
   const next=remotePlan(graph,bot,goal,stationId);
   if(next){plan=bot.remoteDoorRoute={...next,graph,revision:graph.geometryRevision||0,stationId,goal:goal.clone(),deadline:now+25};bot.localRoute=null;}
  }
  if(!plan)return steerNormal(graph,bot,goal,now,stationId);
  const status=BSPDoors.remoteStatus(col,plan.entry),state=status?.state,h=BSP.toHammer(col.T,p.toArray());
  const go=id=>{const n=graph.nodes[id],point=V(...n.pos);const dest=steerNormal(graph,bot,point,now,id);return p.distanceToSquared(point)<.20&&walkable(col,h,n.h)?point:dest;};
  if(plan.phase==='button'){
   if(state==='open'&&(!plan.timed||currentRemoteBudget(graph,bot,plan)<status.remaining)){plan.phase='source';bot.localRoute=null;}
   else if(!bot.crouching&&bot.onGround!==false&&BSPDoors.remoteButton(col,plan.entry,plan.button.button,h)){
    bot.routeJump=false;bot.routeLadder=false;bot.routeCrouch=false;bot.localRoute=null;bot.remoteDoorWaiting=true;return p.clone();
   }else return go(plan.button.node);
  }
  if(state!=='open'){cancel();return steerNormal(graph,bot,goal,now,stationId);}
  if(plan.phase==='source'){
   if(plan.timed&&now>=(plan.budgetCheck||0)){
    plan.budgetCheck=now+.25;
    if(!(currentRemoteBudget(graph,bot,plan)<status.remaining)){cancel();return steerNormal(graph,bot,goal,now,stationId);}
   }
   const from=graph.nodes[plan.from],to=graph.nodes[plan.to];
   if(!walkable(col,h,to.h)||p.distanceTo(V(...from.pos))>Math.max(.45,26*k))return go(plan.from);
   plan.phase='cross';bot.localRoute=null;
  }
  if(plan.phase==='cross'){
   const to=graph.nodes[plan.to],point=V(...to.pos);
   if(p.distanceTo(point)<=Math.max(.14,Math.min(.16,8*k))){const chained=plan.chainLength>1;cancel();if(chained){bot.remoteDoorRetry=now;return p.clone();}return steerNormal(graph,bot,goal,now,stationId);}
   if(!walkable(col,h,to.h)){cancel();return steerNormal(graph,bot,goal,now,stationId);}
   bot.routeJump=false;bot.routeLadder=false;bot.routeCrouch=false;return point;
  }
  return steerNormal(graph,bot,goal,now,stationId);
 }
 function fromGraph(buffer,col,bspSize){
  const decoded=YaPBWaypoints.decode(buffer,bspSize);
  const nodes=decoded.nodes.map(n=>{const ladder=!!(n.ladder&&ladderPoint(col,n.h));const water=waterPoint(col,n.h);const ch=n.crouch&&!ladder&&!water&&crouchHull(col);const grounded=ladder||water?n.h:(floorAt(ch||col,[n.h[0],n.h[1],n.h[2]+12],90)||(ch&&floorAt(ch,lower([n.h[0],n.h[1],n.h[2]+12]),90)));const h=grounded&&ch?raise(grounded):grounded;return {...n,teamFlags:n.flags,ladder,water,h:h||n.h,valid:n.valid!==false&&!!h,pos:BSP.toGame(col.T,h||n.h)}});
  return {nodes,col,author:decoded.author,modified:decoded.modified,mapSize:decoded.mapSize,version:decoded.version};
 }
 function reachableFrom(graph,start,team){
  if(!teamAllows(graph.nodes[start],team))return new Set();
  const cache=graph.reachCache??=new Map(),key=team?team+':'+start:start;if(cache.has(key))return cache.get(key);
  const seen=new Set([start]),q=[start];for(let i=0;i<q.length;i++)for(const id of graph.nodes[q[i]].edges)if(!seen.has(id)&&teamAllows(graph.nodes[id],team)){seen.add(id);q.push(id)}
  if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(key,seen);return seen;
 }
 // Test an alternate door pose without changing live collision. Only automatic
 // sliding doors carry touchDoor metadata. Named doors are only probed
 // when the directed edge begins inside a supported direct brush trigger.
 function openDoorHull(col,start=null){
  let changed=false;
  const breakables=col.breakables?.map(b=>{const motion=b.touchDoor||(start&&(b.triggerDoor?.triggers?.some(t=>window.BSPDoors?.triggerContains(col,t,start))||b.triggerDoor?.buttons?.some(t=>window.BSPDoors?.buttonReach(col,t,start)))?b.triggerDoor:null);if(b.rotatingDoor&&start){
    const o=b.origin,near=start.every((v,i)=>v>=o[i]+b.mins[i]-24&&v<=o[i]+b.maxs[i]+24);
    const sign=near?window.BSPDoors?.chooseSwing(col,b,b.rotatingDoor.distance,[start],b.rotatingDoor.twoWay):0;
    if(sign){changed=true;return {...b,yaw:sign*b.rotatingDoor.distance*Math.PI/180};}
   }if(!motion)return b;changed=true;return {...b,origin:b.origin.map((v,i)=>v+motion.dir[i]*motion.distance)};});
  return changed?{...col,breakables}:null;
 }
 function validate(graph,sites=[]){
  const {nodes,col}=graph,openCol=openDoorHull(col),hasTriggers=col.breakables?.some(b=>b.triggerDoor||b.rotatingDoor);let good=0,edges=0;
  graph.remoteLinks=[];
  const remoteDoors=(col.breakables||[]).filter(b=>(b.triggerDoor?.wait===-1||b.triggerDoor?.wait>=3)&&b.triggerDoor.buttons?.length&&!b.rotatingDoor).slice(0,16).map(entry=>({entry,open:{...col,breakables:col.breakables.map(b=>b===entry?{...b,origin:b.origin.map((v,i)=>v+b.triggerDoor.dir[i]*b.triggerDoor.distance)}:b)},buttons:[]}));
  if(!graph.originalLinks&&col.breakables?.some(b=>b.destructible))graph.originalLinks=nodes.map(n=>({edges:n.edges.slice(),valid:n.valid}));
  // Mark invalid nodes before checking incoming links and route fields.
  for(const n of nodes){if(n.valid===false||!nodeClear(col,n)){n.valid=false;n.edges=[];}else good++;}
  for(const d of remoteDoors)for(const button of d.entry.triggerDoor.buttons){
   for(const n of nodes){if(n.valid!==false&&!n.crouch&&!n.ladder&&!n.water&&window.BSPDoors?.buttonReach(col,button,n.h))d.buttons.push({node:n.id,button});if(d.buttons.length>=64)break;}
   if(d.buttons.length>=64)break;
  }
  for(const n of nodes){if(n.valid===false)continue;n.jumpEdges=new Set();n.edges=n.edges.filter(id=>{const t=nodes[id];if(!t||t.valid===false)return false;if(ladderLink(col,n,t)||waterLink(col,n,t)||waterExitLink(col,n,t)||edgeWalk(col,n,t)||graph.chateauRepair&&graph.version&&authoredWalkLink(col,n,t))return true;if(openCol&&edgeWalk(openCol,n,t))return true;if(hasTriggers){const triggered=openDoorHull(col,n.crouch?lower(n.h):n.h);if(triggered&&edgeWalk(triggered,n,t))return true;}if((n.jumps?.has(id)||t.jump)&&jumpLink(col,n,t)){n.jumpEdges.add(id);return true;}
    if(graph.remoteLinks.length<128&&!n.crouch&&!t.crouch&&!n.ladder&&!t.ladder&&!n.water&&!t.water){
     for(const d of remoteDoors){if(!d.buttons.length)continue;
      if(BSP.traceAll({...col,head:-1,breakables:[d.entry]},n.h,t.h).hit&&edgeWalk(d.open,n,t)){graph.remoteLinks.push({from:n.id,to:id,entry:d.entry.remoteLiveEntry||d.entry,buttons:d.buttons});break;}
     }
    }return false;});edges+=n.edges.length;}
  // Original YaPB graphs sometimes provide only an inward direction between
  // two spawn waypoints. If the return direction is physically walkable without
  // a jump, restore that one reverse link in the validated runtime graph.
  // Do not fabricate new spatial neighbors or bypass a solid window or door.
  graph.walkVerifiedLinks=[];
  if(graph.chateauRepair&&graph.version){
   const incoming=nodes.map(n=>n.edges.slice());
   for(const n of nodes){
    if(n.valid===false)continue;
    for(const id of incoming[n.id]){
     const t=nodes[id];
     if(t?.valid===false||!t||t.edges.includes(n.id)||t.edges.length>=8)continue;
     if(!authoredWalkLink(col,t,n))continue;
     t.edges.push(n.id);edges++;
     graph.walkVerifiedLinks.push({from:t.id,to:n.id});
    }
   }
  }
  delete graph.routes;delete graph.reachCache;delete graph.commonReachable;delete graph.nearCells;
  graph.teamAllowed=Object.fromEntries(['CT','T'].map(team=>[team,new Set(nodes.filter(n=>teamAllows(n,team)).map(n=>n.id))]));
  const goals=[...new Set(sites.map(s=>s.id))].map(id=>nodes.filter(n=>n.edges.length&&sites.some(s=>s.id===id&&LocalBSP.inSite(s,n.h))).map(n=>n.id));
  
  let reachable=true;
  for(const [team,spawns] of Object.entries(col.spawnTeams)){const entries=spawns.map(h=>near(graph,V(...BSP.toGame(col.T,h)),col,null,graph.teamAllowed[team])).filter(Boolean);if(!entries.length||entries.length!==spawns.length){reachable=false;if(!entries.length)continue}for(const entry of new Set(entries)){const seen=reachableFrom(graph,entry.id,team);graph.commonReachable=graph.commonReachable?new Set([...graph.commonReachable].filter(id=>seen.has(id))):new Set(seen);if(seen.size<Math.min(8,good)||goals.some(gs=>!gs.some(id=>seen.has(id))))reachable=false}}
  if(goals.some(gs=>!gs.some(id=>graph.commonReachable?.has(id))))reachable=false;
  return {ok:good>=8&&edges>=good&&reachable,nodes:good,edges,reachable};
 }
 // Recheck the original candidate links after a real break/reset. Keep the
 // graph object and live collision identity; validate doors in closed pose.
 function refreshGeometry(graph,sites=[]){
  if(!graph?.originalLinks)return null;
  const live=graph.col;
  for(const n of graph.nodes){const source=graph.originalLinks[n.id];n.edges=source.edges.slice();n.valid=source.valid;}
  graph.col={...live,breakables:live.breakables.map(b=>b.closedOrigin?{...b,origin:b.closedOrigin,yaw:b.rotatingDoor?0:b.yaw,remoteLiveEntry:b.remoteLiveEntry||b}:b)};
  try{return validate(graph,sites);}finally{graph.col=live;graph.geometryRevision=(graph.geometryRevision||0)+1;}
 }
 // Distances over the validated directed graph, not straight-line estimates through walls.
 function distanceField(graph,goals,team){
  const n=graph.nodes.length,reverse=Array.from({length:n},()=>[]),dist=new Float64Array(n).fill(Infinity),exit=new Int32Array(n).fill(-1),heap=[];
  for(const node of graph.nodes)if(teamAllows(node,team))for(const id of node.edges)if(teamAllows(graph.nodes[id],team))reverse[id].push(node.id);
  const push=(v)=>{heap.push(v);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=v[0])break;heap[i]=heap[p];i=p;}heap[i]=v};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;};
  for(const id of goals){if(!graph.nodes[id]||!teamAllows(graph.nodes[id],team)||dist[id]===0)continue;dist[id]=0;exit[id]=id;push([0,id])}
  while(heap.length){const [d,id]=pop();if(d!==dist[id])continue;const p=graph.nodes[id].pos;for(const prev of reverse[id]){const q=graph.nodes[prev].pos,nd=d+Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);if(nd<dist[prev]){dist[prev]=nd;exit[prev]=exit[id];push([nd,prev])}}}
  return {dist,exit};
 }
 // Choose a reachable defensive station from the validated directed graph.
 // Never reserve an invalid, enemy-only, submerged or ladder node.
 function defenseStation(graph,bot,anchor,points,others,maxRange=9){
  const start=attach(graph,bot);if(!start)return null;
  const reachable=reachableFrom(graph,start.id,bot.team),sniper=['awp','scout','g3sg1','sg550'].includes(((bot.emptyPrimary?.mag>0||bot.emptyPrimary?.res>0)?bot.emptyPrimary.id:bot.weaponId));
  const occupied=others.filter(b=>b!==bot&&!b.dead&&b.team===bot.team&&b.guardStation?.graph===graph&&b.guardStation.active!==false).map(b=>graph.nodes[b.guardStation.id]).filter(Boolean);
  const p=bot.g.position,preferred=points[(bot.siteSlot??bot.teamIndex??0)%Math.max(1,points.length)];
  let best=null,cost=Infinity;
  for(const id of reachable){const n=graph.nodes[id];if(!n.edges.length||n.ladder||n.water||Math.abs(n.pos[1]-anchor.y)>1.8)continue;
   const q=V(...n.pos),d=q.distanceTo(anchor);if(d>maxRange)continue;
   const marked=n.camp||n.sniper,station=points.some(v=>v.distanceToSquared(q)<.16);if(!marked&&!station)continue;
   // Prefer unique lanes before role bonuses. Keep positions stable across refreshes.
   const crowd=occupied.some(a=>Math.hypot(a.pos[0]-n.pos[0],a.pos[1]-n.pos[1],a.pos[2]-n.pos[2])<1.35)?35:0;
   const score=crowd+(preferred?q.distanceTo(preferred)*.38:0)+p.distanceTo(q)*.12+Math.abs(d-4)*.18-(n.camp?2:0)-(sniper&&n.sniper?7:0)+(n.sniper&&!sniper?1.2:0)-(bot.guardStation?.graph===graph&&bot.guardStation.id===id?1:0);
   if(score<cost){cost=score;best=n;}
  }
  return best;
 }
 function attach(graph,bot){
  const pos=bot.g.position,col=graph.col;let h=routeOrigin(graph,bot),hull=col;
  if(bot.crouching&&Number.isInteger(col.crouchHead)&&BSP.traceAll(col,h,h).startsolid)hull=crouchHull(col);
  if(!ladderPoint(col,h)&&!waterPoint(col,h)){const small=hull!==col,floor=floorAt(hull,small?lower(h):h,40);if(floor)h=small?raise(floor):floor;}
  return near(graph,pos,hull,h,graph.teamAllowed?.[bot.team]);
 }
 return {build,fromPwf,fromNav,fromGraph,validate,refreshGeometry,steer,floorAt,walkable,distanceField,defenseStation,attach,near,jumpLink,predictJump,jumpCommand,boostCommand,elevationPursuit,windowPassage,windowDetour,windowProgress,ladderLink,waterLink,waterExitLink,teamAllows};
})();
