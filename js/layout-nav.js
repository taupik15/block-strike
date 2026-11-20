/* Walkable ground grid for non-BSP maps (Dust Block and simplified ES layout).
 * The original BSP A* graph and its recovery logic remain in nav-graph.js. */
const LayoutNav=(()=>{
 let limit=0,width=0,free=null,parent=null,queue=null,traffic=new WeakMap(),intents=new WeakMap(),retry=new WeakMap();
 const index=(x,z)=>(z+limit)*width+x+limit;
 function reset(){limit=0;free=parent=queue=null;traffic=new WeakMap();intents=new WeakMap();retry=new WeakMap()}
 function build(){
  limit=Math.floor(worldLim());width=limit*2+1;free=new Uint8Array(width*width);parent=new Int32Array(free.length);queue=new Int32Array(free.length);
  const walls=obs.filter(o=>o.y1<1.7&&o.y2>.35);
  for(let z=-limit;z<=limit;z++)for(let x=-limit;x<=limit;x++)if(!walls.some(o=>x>o.x1-.44&&x<o.x2+.44&&z>o.z1-.44&&z<o.z2+.44))free[index(x,z)]=1;
 }
 function nearest(p){
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return -1;
  if(!free)build();const x=Math.round(p.x),z=Math.round(p.z);
  for(let r=0;r<width;r++){let best=-1,dist=Infinity;
   for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const xx=x+dx,zz=z+dz;if(Math.abs(xx)>limit||Math.abs(zz)>limit)continue;const id=index(xx,zz),d=(xx-p.x)**2+(zz-p.z)**2;if(free[id]&&d<dist){dist=d;best=id}}
   if(best>=0)return best;
  }return -1;
 }
 const point=id=>V(id%width-limit,0,Math.floor(id/width)-limit);
 function snap(p){const n=nearest(p);if(n>=0)p.copy(point(n))}
 function path(a,b){
  const start=nearest(a),goal=nearest(b);if(start<0||goal<0)return [];
  // Synchronous BFS reuses per-map buffers and visits neighbours in the same
  // order. Avoid per-node arrays and large per-route temporary allocations.
  parent.fill(-1);let first=0,last=1;queue[0]=start;parent[start]=start;
  while(first<last){const cur=queue[first++];if(cur===goal)break;const x=cur%width,z=Math.floor(cur/width);
   for(let dir=0;dir<4;dir++){
    const next=dir===0?(x>0?cur-1:-1):dir===1?(x<width-1?cur+1:-1):dir===2?(z>0?cur-width:-1):(z<width-1?cur+width:-1);
    if(next>=0&&free[next]&&parent[next]<0){parent[next]=cur;queue[last++]=next}
   }
  }
  if(parent[goal]<0)return [];const out=[];let n=goal;while(n!==start){out.push(point(n));n=parent[n]}return out.reverse();
 }
 // Procedural foot-coordinate hulls: sweep circular bodies, not occupied grid nodes.
 const R=.4, HEIGHT=c=>c?1.05:1.7, GAP=1e-5;
 function horizontalFraction(p,dx,dz,crouch,actors){
  const a=dx*dx+dz*dz;if(a<1e-16)return 1;let f=1;
  for(const actor of actors){
   const [x,y,z]=actor.pos;
   if(p.y+HEIGHT(crouch)<=y+GAP||p.y>=y+HEIGHT(actor.crouch)-GAP)continue;
   const rx=p.x-x,rz=p.z-z,rad=R*2,b=rx*dx+rz*dz,c=rx*rx+rz*rz-rad*rad;
   // Escape pre-existing overlaps without moving deeper into them.
   if(c<0){if(b<0)f=0;continue;}
   const disc=b*b-a*c;if(b>=0||disc<=0)continue;
   const t=(-b-Math.sqrt(disc))/a;
   if(t>=0&&t<f)f=Math.max(0,t-GAP/Math.sqrt(a));
  }
  return f;
 }
 function moveActor(p,dx,dz,crouch,actors){
  if(![p.x,p.y,p.z,dx,dz].every(Number.isFinite))throw Error('Non-finite layout movement');
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));let contact=false;
  for(let i=0;i<count;i++){
   const start=p.clone(),candidate=p.clone();candidate.x+=dx/count;candidate.z+=dz/count;
   collide(candidate,R,crouch);
   const lim=worldLim();candidate.x=Math.max(-lim,Math.min(lim,candidate.x));candidate.z=Math.max(-lim,Math.min(lim,candidate.z));
   const x=candidate.x-start.x,z=candidate.z-start.z,f=horizontalFraction(start,x,z,crouch,actors);
   if(f<1){contact=true;candidate.x=start.x+x*f;candidate.z=start.z+z*f;
    const check=candidate.clone();collide(check,R,crouch);
    if(Math.hypot(check.x-candidate.x,check.z-candidate.z)>GAP)candidate.copy(start);
   }
   p.copy(candidate);
  }
  return contact;
 }
 function verticalLimit(p,nextY,crouch,actors){
  let y=nextY;const h=HEIGHT(crouch),up=nextY>p.y;
  for(const actor of actors){
   const [x,feet,z]=actor.pos,top=feet+HEIGHT(actor.crouch);
   if(Math.hypot(p.x-x,p.z-z)>=R*2)continue;
   if(up&&p.y+h<=feet+GAP&&y+h>feet)y=Math.max(p.y,feet-h-GAP);
   else if(!up&&p.y>=top-GAP&&y<top)y=Math.min(p.y,top+GAP);
  }
  return y;
 }
 // Crouch release must not grow into an overhead actor. Horizontal collision
 // and the static ceiling check remain separate from this expansion test.
 function canExpand(p,actors){
  return !actors.some(a=>Math.hypot(p.x-a.pos[0],p.z-a.pos[2])<R*2-GAP&&p.y+HEIGHT(false)>a.pos[1]+GAP&&p.y+HEIGHT(true)<a.pos[1]+HEIGHT(a.crouch)-GAP);
 }
 // Local, temporary detour: reconnect to one of the next eight route nodes.
 // Search only a 9x9 patch, and verify every segment against live body snapshots
 // and static collision. The permanent walkability grid is never modified.
 function detour(p,route,crouch,actors){
  if(!actors.length||!route.length||Math.abs(p.y)>.1)return null;
  const cx=Math.round(p.x),cz=Math.round(p.z),inside=(x,z)=>Math.abs(x-cx)<=4&&Math.abs(z-cz)<=4&&Math.abs(x)<=limit&&Math.abs(z)<=limit;
  const at=id=>V(id%width-limit,p.y,Math.floor(id/width)-limit);
  function clear(a,b){
   const dx=b.x-a.x,dz=b.z-a.z;
   if(horizontalFraction(a,dx,dz,crouch,actors)<1)return false;
   const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
   for(let i=1;i<=count;i++){const q=V(a.x+dx*i/count,a.y,a.z+dz*i/count),test=q.clone();collide(test,R,crouch);if(Math.hypot(test.x-q.x,test.z-q.z)>GAP)return false;}
   return true;
  }
  const goals=new Map();for(let i=0;i<Math.min(8,route.length);i++){
   const x=Math.round(route[i].x),z=Math.round(route[i].z);if(inside(x,z))goals.set(index(x,z),i);
  }
  const parent=new Map(),queue=[];
  // Do not assume the nearest grid node is physically reachable from a body
  // in contact with another actor. Seed only genuinely reachable nodes.
  for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++)if(inside(x,z)){
   const id=index(x,z);if(free[id]&&clear(p,at(id))){parent.set(id,-1);queue.push(id);}
  }
  let best=-1,join=-1;
  for(let head=0;head<queue.length;head++){
   const id=queue[head],q=at(id),g=goals.get(id);
   if(g!==undefined&&g>join){best=id;join=g;}
   for(const [x,z] of [[q.x-1,q.z],[q.x+1,q.z],[q.x,q.z-1],[q.x,q.z+1]])if(inside(x,z)){
    const next=index(x,z);if(!free[next]||parent.has(next)||!clear(q,at(next)))continue;
    parent.set(next,id);queue.push(next);
   }
  }
  if(best<0)return null;
  const prefix=[];for(let id=best;id!==-1;id=parent.get(id))prefix.push(point(id));prefix.reverse();
  return {path:prefix.concat(route.slice(join+1)),count:prefix.length};
 }
 // Two allied ground bots can negotiate a temporary retreat into a side bay.
 // All movement still goes through moveActor; no actor is removed from collision.
 function segmentClear(a,b,actors){
  const dx=b.x-a.x,dz=b.z-a.z,lim=worldLim();
  if(Math.abs(b.x)>lim||Math.abs(b.z)>lim||horizontalFraction(a,dx,dz,false,actors)<1)return false;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=1;i<=count;i++){const q=V(a.x+dx*i/count,a.y,a.z+dz*i/count),test=q.clone();collide(test,R,false);if(Math.hypot(test.x-q.x,test.z-q.z)>GAP)return false;}
  return true;
 }
 const body=b=>({pos:b.g.position.toArray(),crouch:!!b.crouching});
 function cancelTraffic(b,now){
  intents.delete(b);const plan=traffic.get(b);if(!plan)return;
  for(const a of [plan.winner,plan.yielder]){traffic.delete(a);retry.set(a,now+1);}
 }
 function trafficStep(b,target,eligible,others,now,actors){
  const p=b.g.position;
  if(!eligible||b.dead||b.blinded>0||b.crouching||Math.abs(p.y)>.1){cancelTraffic(b,now);return null;}
  const d=target.clone().sub(p);d.y=0;if(d.length()<.25){cancelTraffic(b,now);return null;}d.normalize();
  intents.set(b,{d,target:target.clone(),t:now});
  let plan=traffic.get(b);
  if(plan){
   const other=plan.winner===b?plan.yielder:plan.winner,oi=intents.get(other),wp=plan.winner.g.position,yp=plan.yielder.g.position;
   const original=b===plan.winner?plan.wTarget:plan.yTarget;
   if(actors.some(a=>Math.abs(a.pos[1])<1.7&&Math.hypot(a.pos[0]-other.g.position.x,a.pos[2]-other.g.position.z)>.02)||now>plan.until||!others.includes(other)||other.dead||other.blinded>0||other.crouching||other.team!==b.team||!oi||now-oi.t>.35||target.distanceToSquared(original)>1||Math.abs(other.g.position.y)>.1){cancelTraffic(b,now);return null;}
   if(plan.phase==='retreat'&&yp.distanceTo(plan.refuge)<.07)plan.phase='pass';
   if(plan.phase==='pass'&&wp.clone().sub(plan.start).dot(plan.heading)>=plan.passDistance-.07){cancelTraffic(b,now);return null;}
   if(b===plan.winner)return {point:plan.phase==='pass'?plan.exit:null};
   if(plan.phase==='pass')return {point:null};
   if(yp.distanceTo(plan.back)<.07)plan.atBack=true;
   return {point:plan.atBack?plan.refuge:plan.back};
  }
  if(now<(retry.get(b)||0)||((b.layoutNav?.blocked||0)<.25&&(b.trafficWait||0)<.25))return null;
  for(const other of others){
   if(other===b||other.dead||other.blinded>0||other.crouching||other.team!==b.team||traffic.has(other)||now<(retry.get(other)||0))continue;
   const oi=intents.get(other),q=other.g.position;if(!oi||now-oi.t>.25||Math.abs(q.y)>.1||d.dot(oi.d)>-.85)continue;
   const rel=q.clone().sub(p),dist=rel.length();if(dist<.79||dist>1.2||rel.clone().normalize().dot(d)<.9)continue;
   // Limit to an isolated pair: a third body near the maneuver is a veto.
   const extras=actors.filter(a=>Math.hypot(a.pos[0]-q.x,a.pos[2]-q.z)>.02||Math.abs(a.pos[1]-q.y)>.02);
   if(extras.some(a=>Math.abs(a.pos[1])<1.7))continue;
   // C4 carrier gets the first attempt; otherwise stable bot-array order.
   const preferred=!!b.trafficPriority!==!!other.trafficPriority?(b.trafficPriority?b:other):(others.indexOf(b)<others.indexOf(other)?b:other);
   for(const winner of [preferred,preferred===b?other:b]){
    const yielder=winner===b?other:b,w=winner.g.position,y=yielder.g.position,heading=y.clone().sub(w).normalize(),side=V(-heading.z,0,heading.x);
    for(const distance of [0,.5,1,1.5,2,2.5,3]){
     const passDistance=w.distanceTo(y)+distance+1.05,exit=w.clone().addScaledVector(heading,passDistance);
     if(!segmentClear(w,exit,[]))continue;
     const back=y.clone().addScaledVector(heading,distance);
     if(!segmentClear(y,back,[body(winner)]))continue;
     for(const sign of [-1,1]){
      const refuge=back.clone().addScaledVector(side,sign*1.15);
      if(!segmentClear(back,refuge,[body(winner)])||!segmentClear(w,exit,[{pos:refuge.toArray(),crouch:false}]))continue;
      plan={winner,yielder,start:w.clone(),heading,back,refuge,exit,passDistance,phase:'retreat',atBack:distance===0,until:now+6,wTarget:intents.get(winner).target.clone(),yTarget:intents.get(yielder).target.clone()};
      traffic.set(winner,plan);traffic.set(yielder,plan);
      return {point:b===winner?null:plan.atBack?refuge:back};
     }
    }
   }
  }
  retry.set(b,now+.9);return null;
 }
 function step(b,target,speed,dt,move,actors=null){
  const p=b.g.position;let n=b.layoutNav;
  const changed=!n||n.target.distanceToSquared(target)>9;
  if(changed||n.age>8||n.age>2&&!n.detourCount){n=b.layoutNav={path:path(p,target),age:0,target:target.clone(),blocked:changed?0:n.blocked||0,retry:changed?0:n.retry||0,detourCount:0}}
  n.age+=dt;n.retry=Math.max(0,(n.retry||0)-dt);
  if(actors&&n.blocked>=.25&&n.retry<=0){
   n.retry=.9;const alt=detour(p,n.path,!!b.crouching,actors);
   if(alt){n.path=alt.path;n.detourCount=alt.count;n.age=0;n.blocked=0;}
  }
  while(n.path.length&&n.path[0].distanceToSquared(p)<(n.detourCount?.0025:.12)){n.path.shift();if(n.detourCount)n.detourCount--;}
  const q=n.path[0];if(!q)return false;
  const d=q.clone().sub(p);d.y=0;const distance=d.length();
  if(distance>0){const requested=Math.min(speed*dt,distance),f=requested/distance,x=p.x,z=p.z,contact=move(d.x*f,d.z*f);
   if(actors){const progress=Math.hypot(p.x-x,p.z-z);n.blocked=contact&&requested>1e-5&&progress<requested*.35?Math.min(2,(n.blocked||0)+dt):0;}
  }
  return true;
 }
 return {reset,prepare:()=>{if(!free)build()},snap,step,moveActor,verticalLimit,canExpand,trafficStep,cancelTraffic};
})();
