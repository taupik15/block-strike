// bsp-physics.js — gabungan bsp-collision + bsp-player untuk pemakaian klasik (bukan module)
(function () {
// bsp-collision.js — trace GoldSrc clipnode hull (Hammer units, Z up)
const CONTENTS_EMPTY = -1, CONTENTS_SOLID = -2;
const EPS = 0.03125;

function loadClipData(planesBuf, nodesBuf) {
  const pf = new Float32Array(planesBuf);            // nx,ny,nz,dist per plane
  const nv = new DataView(nodesBuf), n = nodesBuf.byteLength / 8;
  const pn = new Int32Array(n), c0 = new Int16Array(n), c1 = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    pn[i] = nv.getInt32(i * 8, true);
    c0[i] = nv.getInt16(i * 8 + 4, true);
    c1[i] = nv.getInt16(i * 8 + 6, true);
  }
  return { pf, pn, c0, c1 };
}

// Trace segment p1->p2 through hull rooted at `head`. Returns {frac, hit, normal, startsolid}.
function traceHull(clip, head, p1, p2) {
  const { pf, pn, c0, c1 } = clip;
  const out = { frac: 1, hit: false, normal: null, startsolid: false };
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2];
  function rec(node, f1, f2, a, b) {
    if (node < 0) {
      if (node === CONTENTS_SOLID) {
        out.hit = true; out.frac = f1;
        if (f1 === 0) out.startsolid = true;
        return true;
      }
      return false;
    }
    const k = pn[node] * 4;
    const nx = pf[k], ny = pf[k + 1], nz = pf[k + 2], d = pf[k + 3];
    const t1 = nx * a[0] + ny * a[1] + nz * a[2] - d;
    const t2 = nx * b[0] + ny * b[1] + nz * b[2] - d;
    if (t1 >= 0 && t2 >= 0) return rec(c0[node], f1, f2, a, b);
    if (t1 < 0 && t2 < 0) return rec(c1[node], f1, f2, a, b);
    const side = t1 < 0 ? 1 : 0;
    let frac = t1 < 0 ? (t1 + EPS) / (t1 - t2) : (t1 - EPS) / (t1 - t2);
    frac = Math.min(1, Math.max(0, frac));
    const midf = f1 + (f2 - f1) * frac;
    const m = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
    const first = side ? c1[node] : c0[node], second = side ? c0[node] : c1[node];
    const sg = side ? -1 : 1; // normal faces the side the trace came from
    if (rec(first, f1, midf, a, m)) {
      if (out.normal === null) out.normal = [sg * nx, sg * ny, sg * nz];
      return true;
    }
    if (rec(second, midf, f2, m, b)) {
      if (out.normal === null) out.normal = [sg * nx, sg * ny, sg * nz];
      return true;
    }
    return false;
  }
  rec(head, 0, 1, p1, p2);
  if (out.hit) out.frac = Math.max(0, out.frac);
  return out;
}

// Move a point by delta with up to 4 slides. Returns new position + flags.
function slideMove(clip, head, pos, delta) {
  let p = [pos[0], pos[1], pos[2]], d = [delta[0], delta[1], delta[2]];
  let onGround = false, startsolid = false;
  for (let i = 0; i < 4; i++) {
    const end = [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
    const t = traceHull(clip, head, p, end);
    if (t.startsolid) startsolid = true;
    if (!t.hit) { p = end; break; }
    p = [p[0] + d[0] * t.frac, p[1] + d[1] * t.frac, p[2] + d[2] * t.frac];
    const n = t.normal; if (!n) break;
    if (n[2] > 0.7) onGround = true;
    const rem = 1 - t.frac;
    const dot = (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]);
    d = [(d[0] - dot * n[0]) * rem, (d[1] - dot * n[1]) * rem, (d[2] - dot * n[2]) * rem];
    if (Math.hypot(d[0], d[1], d[2]) < 1e-4) break;
  }
  return { pos: p, onGround, startsolid };
}

// bsp-player.js — gerak pemain di atas clipnode BSP (satuan Hammer di dalam, satuan game di luar).
// Gravitasi, lompat, step height, slide di dinding/sudut. Dipakai untuk map BSP saja.

const STEP = 18;       // step height CS (Hammer units)
const GRAV = 800, JUMP = Math.sqrt(2 * GRAV * 45);
const SPEED = Object.freeze({knife:250,usp:250,glock18:250,deagle:250,p228:250,fiveseven:250,elite:250,mac10:250,tmp:250,mp5:250,ump45:250,p90:245,galil:240,famas:240,ak47:221,m4a1:230,aug:240,sg552:235,scout:260,awp:210,g3sg1:210,sg550:210,m3:230,xm1014:240,m249:220,c4:250,he:250,flash:250,smoke:250,shield:250});
const ZOOM = Object.freeze({aug:240,sg552:200,scout:220,awp:150,g3sg1:150,sg550:150});
function maxSpeed(id,{scale=.02,zoom=false,shield=false,crouch=false,walk=false}={}){
 const speed=shield?180:zoom&&ZOOM[id]!==undefined?ZOOM[id]:SPEED[id]??250;
 return speed*scale*(crouch?1/3:1)*(walk?.52:1);
}
function analog(x,y,dead=.10){const d=Math.hypot(x,y);if(d<=dead)return [0,0];const m=Math.min(1,(d-dead)/(1-dead));return [x*m/d,y*m/d]}
// GoldSrc-style friction / projected acceleration. All internal speeds in Hammer units.
function accelerate(v,wish,dt,grounded,scale=.02,medium='air'){
 let x=(v?.[0]||0)/scale,z=(v?.[1]||0)/scale;
 const wx=wish[0]/scale,wz=wish[1]/scale,w=Math.hypot(wx,wz),speed=Math.hypot(x,z);
 if(grounded||medium==='water'||medium==='ladder'){
  const drop=Math.max(speed,100)*(medium==='water'?2:4)*dt;
  const f=speed>0?Math.max(0,speed-drop)/speed:0;x*=f;z*=f;
 }
 if(w>1e-8){const dx=wx/w,dz=wz/w,air=!grounded&&medium==='air';
  const add=(air?Math.min(w,30):w)-x*dx-z*dz;
  if(add>0){const a=Math.min(add,10*w*dt);x+=dx*a;z+=dz*a;}
 }
 // Only clamp grounded movement to the commanded maximum; air retains momentum.
 // On release friction naturally brings velocity to zero rather than snapping.
 const len=Math.hypot(x,z);if(w>0&&(grounded||medium!=='air')&&len>w){x*=w/len;z*=w/len}
 return [x*scale,z*scale];
}
function fallDamage(speed){return speed>580?(speed-580)*100/(1024-580):0}


function makeTransform(meta) {
  return { c: meta.transform.c, s: meta.transform.s, k: meta.transform.scale };
}

function toHammer(T, g) {
  const xp = g[0] / T.k, yp = g[2] * (T.zSign??1) / T.k;
  return [T.c * xp + T.s * yp, -T.s * xp + T.c * yp, g[1] / T.k];
}
function toGame(T, h) {
  const xp = T.c * h[0] - T.s * h[1], yp = T.s * h[0] + T.c * h[1];
  return [xp * T.k, h[2] * T.k, yp * T.k * (T.zSign??1)];
}
// kecepatan horizontal (game -> hammer): transformasi linear tanpa translasi
function velToHammer(T, v) {
  const xp = v[0] / T.k, yp = v[1] * (T.zSign??1) / T.k;
  return [T.c * xp + T.s * yp, -T.s * xp + T.c * yp];
}

// Subtle, collision-checked centering at an already destroyed glass pane.
// A 59-unit GoldSrc window admits a 32-unit standing hull through only a
// 27-unit lane. A touch joystick can hit the adjacent solid jamb even when
// the glass is gone. Never move through a wall, another actor, or intact glass.
function alignBrokenGlass(col, pos, d) {
  if (!col?.breakables || Math.hypot(d[0],d[1]) < 0.25) return null;
  for (const b of col.breakables) {
    if (!b.destroyed || !b.glassPassage || b.yaw) continue;
    const o=b.origin||[0,0,0],dims=b.mins.map((x,i)=>b.maxs[i]-x);
    const axis=dims[0]<=6?0:dims[1]<=6?1:-1;
    if(axis<0 || Math.abs(d[axis])<Math.abs(d[1-axis])*1.5)continue;
    const cross=1-axis,plane=o[axis]+(b.mins[axis]+b.maxs[axis])*.5;
    const toward=plane-pos[axis];
    if(toward*d[axis]<=0 || Math.abs(toward)>56)continue;
    const low=o[cross]+b.mins[cross]+19,high=o[cross]+b.maxs[cross]-19;
    if(low>=high || pos[2]<o[2]+b.mins[2]-40 || pos[2]>o[2]+b.maxs[2]+40)continue;
    const desired=Math.max(low,Math.min(high,pos[cross]));
    const difference=desired-pos[cross];
    if(Math.abs(difference)<.1 || Math.abs(difference)>16)continue;
    const delta=[0,0,0];delta[cross]=Math.sign(difference)*Math.min(2,Math.abs(difference));
    const path=slideAll(col,pos,delta);
    if(path.startsolid || Math.abs(path.pos[cross]-pos[cross])<Math.abs(delta[cross])*.95)continue;
    return path.pos;
  }
  return null;
}

// Gerak horizontal dengan naik tangga. d = [dx, dy, 0] (Hammer)
function stepSlide(col, pos, d, assistBrokenGlass=false) {
  const a = slideAll(col, pos, d);
  const want = Math.hypot(d[0], d[1]);
  if (want < 1e-6) return a.pos;
  const got = Math.hypot(a.pos[0] - pos[0], a.pos[1] - pos[1]);
  if (got >= want * 0.98) return a.pos;          // tidak terhalang
  const up = slideAll(col, pos, [0, 0, STEP]).pos;
  const b = slideAll(col, up, d).pos;
  const down = slideAll(col, b, [0, 0, -STEP]);
  const gb = Math.hypot(down.pos[0] - pos[0], down.pos[1] - pos[1]);
  const best=gb > got + 1e-3 ? down.pos : a.pos;
  // If the player is stopped by a doorjamb after the pane has shattered,
  // allow at most a two-unit sideways step toward its legal collision lane.
  // This is a real swept movement, never a teleport or reduced player hull.
  if(assistBrokenGlass && Math.hypot(best[0]-pos[0],best[1]-pos[1])<want*.6){
    const aligned=alignBrokenGlass(col,pos,d);
    if(aligned){
      // A glass-passage correction is a swept sideways move. Continue the
      // requested forward move in the SAME tick, with normal collision, so
      // touching a jamb does not consume a whole frame of walking speed.
      const through=slideAll(col,aligned,d).pos;
      return through;
    }
  }
  return best;
}

// A jumping actor still has its full physical hull. Apply the same bounded,
// swept centering used on the ground when an already shattered pane's jamb
// catches it in midair. This never skips world, actor or intact-glass collision.
function airGlassSlide(col,pos,d,assist){
 const move=slideAll(col,pos,d),want=Math.hypot(d[0],d[1]),got=Math.hypot(move.pos[0]-pos[0],move.pos[1]-pos[1]);
 if(!assist||want<.001||got>=want*.6)return move.pos;
 const aligned=alignBrokenGlass(col,pos,d);
 return aligned?slideAll(col,aligned,d).pos:move.pos;
}

// Keluarkan origin dari solid (mis. spawn terlalu dekat lantai)
function unstick(col, pos) {
  let p = pos;
  for (let i = 0; i < 64 && traceAll(col, p, p).startsolid; i++) p = [p[0], p[1], p[2] + 1];
  return p;
}

// st: { pos:[gx,gy,gz], vy (game/s), on }, wish: [vx, vz] (game/s, bidang XZ game)
function within(b,h,margin=0){
  return h.every((x,i)=>x>=b.origin[i]+b.mins[i]-margin&&x<=b.origin[i]+b.maxs[i]+margin);
}
function contentsAt(col,h){
  const {pn,pf,c0,c1}=col.pointClip||col.clip;
  let node=col.pointClip?col.pointHead:col.head;
  while(node>=0){
   const k=pn[node]*4,side=pf[k]*h[0]+pf[k+1]*h[1]+pf[k+2]*h[2]-pf[k+3];
   node=side>=0?c0[node]:c1[node];
  }
  return node;
}
// Sample feet, torso and eye separately. Point hull is preferable to the expanded movement hull.
function pointWater(col,g){
 if(!col?.pointClip||!col.local)return false;
 const h=toHammer(col.T,g.toArray()),c=contentsAt(col,h);
 return c===-3||c===-4||c===-5||!!col.water?.some(b=>within(b,h));
}
function waterLevel(col,h,crouching=false){
 if(!col.local)return 0;
 const half=crouching?18:36,eye=crouching?12:28;
 const wet=z=>{const p=[h[0],h[1],h[2]+z],c=contentsAt(col,p);return c===-3||c===-4||c===-5||!!col.water?.some(b=>within(b,p));};
 if(!wet(-half+1))return 0;
 if(!wet(0))return 1;
 return wet(eye)?3:2;
}
// Visual motion only: distance-driven phase and time-based smoothing prevent snapping on stop.
function viewMotion(st,travel,speed,dt,grounded,lateral=0){
 const a=1-Math.exp(-12*Math.max(0,dt));
 const target=grounded?Math.max(0,Math.min(1,speed)):0;
 st.phase=((st.phase||0)+Math.max(0,travel)*1.6*(grounded?1:0))%(Math.PI*4);
 st.amplitude=(st.amplitude||0)+(target-(st.amplitude||0))*a;
 const side=grounded?Math.max(-1,Math.min(1,lateral)):0;
 st.sway=(st.sway||0)+(side-(st.sway||0))*a;
 return {camera:Math.sin(st.phase)*.03*st.amplitude,x:Math.sin(st.phase*.5)*.005*st.amplitude+st.sway*.003,y:Math.abs(Math.sin(st.phase))*.006*st.amplitude};
}
function movePlayer(col,T,st,wish,dt,jump,crouching=false) {
 const priorHead=col.head;if(crouching&&Number.isInteger(col.crouchHead))col.head=col.crouchHead;
 st.landed=0;st.jumped=false;
 try{
  let h=unstick(col,toHammer(T,st.pos)),vz=(st.vy||0)/T.k;
  let vel=st.vel||[0,0];const count=Math.max(1,Math.ceil(dt/.025)),step=dt/count;
  const edge=jump&&!st.jumpHeld;st.jumpHeld=!!jump;
  for(let i=0;i<count;i++){
   const ladderVolume=col.ladders?.find(b=>within(b,h,22));
   st.ladderDetach=Math.max(0,(st.ladderDetach||0)-step);
   if(!ladderVolume)st.ladderDetach=0;
   // Jump deliberately detaches from the ladder; prevent immediate reattachment.
   const dismount=!!ladderVolume&&!st.ladderDetach&&i===0&&edge;
   if(dismount){
    st.ladderDetach=.35;vz=120;st.jumped=true;
    let dir=velToHammer(T,wish);
    if(Math.hypot(...dir)<.01)dir=[h[0]-ladderVolume.origin[0]-(ladderVolume.mins[0]+ladderVolume.maxs[0])*.5,h[1]-ladderVolume.origin[1]-(ladderVolume.mins[1]+ladderVolume.maxs[1])*.5];
    const len=Math.hypot(...dir);if(len>.01){const v=toGame(T,[dir[0]*140/len,dir[1]*140/len,0]);vel=[v[0],v[2]];}
   }
   const ladder=!!ladderVolume&&!st.ladderDetach;
   const level=waterLevel(col,h,crouching);st.waterLevel=level;
   const water=level>=2;
   const medium=ladder?'ladder':water?'water':'air';st.medium=medium;
   const floor=traceAll(col,h,[h[0],h[1],h[2]-2]);
   let on=!ladder&&!water&&vz<=0&&(st.on||Math.abs(vz)<1e-4)&&floor.hit&&floor.normal?.[2]>.7;
   if(on&&i===0&&edge&&!dismount){vz=JUMP;on=false;st.jumped=true;}
   // Ladder/water caps are medium-specific; vertical motion is independent of weapon weight.
   const wishSpeed=Math.hypot(...wish)/T.k;
   const factor=water?.8:ladder?Math.min(1,200/Math.max(1,wishSpeed))*.3:1;
   vel=accelerate(vel,[wish[0]*factor,wish[1]*factor],step,on,T.k,medium);
   const wv=velToHammer(T,vel),before=h;
   const delta=[wv[0]*step,wv[1]*step,0];let bankExit=false;
   h=on?stepSlide(col,h,delta,!!st.assistBrokenGlass):airGlassSlide(col,h,delta,!!st.assistBrokenGlass);
   // Near the surface, allow a short supported step onto a bank. Never
   // lift through solid geometry or climb an unsupported wall.
   if(water&&!ladder&&level===2&&(jump||st.swimVertical>0)&&Math.hypot(...delta)>1e-5&&Math.hypot(h[0]-before[0],h[1]-before[1])<Math.hypot(...delta)*.98){
    const up=slideAll(col,before,[0,0,STEP]).pos;
    if(up[2]-before[2]>=STEP-.05){
     const across=slideAll(col,up,delta).pos,down=slideAll(col,across,[0,0,-STEP-2]);
     if(down.onGround&&down.pos[2]>=before[2]-.05&&waterLevel(col,down.pos,crouching)<2&&Math.hypot(down.pos[0]-before[0],down.pos[1]-before[1])>Math.hypot(h[0]-before[0],h[1]-before[1])+.001){h=down.pos;vz=0;bankExit=true;on=true;}
    }
   }
   if(step>0) { const actual=toGame(T,[(h[0]-before[0])/step,(h[1]-before[1])/step,0]);vel=[actual[0],actual[2]]; }
   const pre=vz;
   if(bankExit)vz=0;
   else if(ladder){const climb=jump?1:Math.max(-1,Math.min(1,st.climb||0));vz=climb*200;}
   else if(water){
    // Bots steer directly toward a 3D waypoint; human controls retain pitch-based swimming.
    const target=Number.isFinite(st.swimVertical)?Math.max(-1,Math.min(1,st.swimVertical))*100:jump?100:crouching?-100:(st.climb||0)*(st.lookVertical||0)*100-30;
    vz+=(target-vz)*(1-Math.exp(-4*step));
   }
   else if(!on)vz-=GRAV*step;
   else vz=0;
   const vertical=on?-2:ladder||water?vz*step:(pre+vz)*.5*step;
   const oldZ=h[2],v=slideAll(col,h,[0,0,vertical]);h=v.pos;
   if(v.onGround&&vz<=0&&!ladder&&(!water||bankExit)){if(!on)st.landed=Math.max(st.landed,-vz);vz=0;st.on=true;}
   else st.on=false;
   // An upward trace that stops short must not keep accelerating into the ceiling.
   if(vertical>0&&h[2]-oldZ<vertical-.05)vz=0;
   if(vertical<0&&(ladder||water)&&h[2]-oldZ>vertical+.05)vz=0;
  }
  st.waterLevel=waterLevel(col,h,crouching);
  st.medium=!st.ladderDetach&&col.ladders?.some(b=>within(b,h,22))?'ladder':st.waterLevel>=2?'water':'air';
  st.pos=toGame(T,h);st.vy=vz*T.k;st.vel=vel;return st;
 }finally{col.head=priorHead}
}

// ---- tahap 6: func_breakable (collision statis) dan func_buyzone ----
// col.breakables: [{origin, mins, maxs, hull1}] (Hammer). Setiap breakable diuji dengan hull-nya sendiri.
// Actor hulls are transient movement-only obstacles, in Hammer coordinates.
// Never attach them to the shared map collision used by GRAPH validation.
function actorHull(col, actors, crouching=false){
 const half=crouching&&Number.isInteger(col.crouchHead)?18:36;
 return {...col,actorHulls:actors.map(a=>({center:toHammer(col.T,a.pos),half:half+(a.crouch&&Number.isInteger(col.crouchHead)?18:36)})),actorContact:false};
}
function traceActors(col,p1,p2,best){
 for(const a of col.actorHulls||[]){
  const radius=[32,32,a.half],d=p2.map((v,i)=>v-p1[i]);
  const rel=p1.map((v,i)=>v-a.center[i]);
  // Existing spawn/stance overlaps must be escapable without an upward unstick.
  if(rel.every((v,i)=>Math.abs(v)<radius[i]))continue;
  let enter=0,exit=1,normal=null;
  for(let i=0;i<3;i++){
   if(Math.abs(d[i])<1e-9){if(Math.abs(rel[i])>=radius[i]){exit=-1;break;}continue;}
   let lo=(-radius[i]-rel[i])/d[i],hi=(radius[i]-rel[i])/d[i];
   if(lo>hi)[lo,hi]=[hi,lo];
   if(lo>=enter){enter=lo;normal=[0,0,0];normal[i]=-Math.sign(d[i]);}
   exit=Math.min(exit,hi);if(exit<=enter)break;
  }
  if(normal&&enter>=0&&enter<exit&&enter<best.frac){
   const frac=Math.max(0,enter-EPS/Math.max(EPS,Math.hypot(...d)));
   best={frac,hit:true,normal,startsolid:false,actor:true};
  }
 }
 if(best.actor)col.actorContact=true;
 return best;
}
function moveActor(col,T,st,wish,dt,jump,crouching,actors){
 const hull=actorHull(col,actors||[],crouching);
 movePlayer(hull,T,st,wish,dt,jump,crouching);
 st.actorContact=hull.actorContact;return st;
}
function traceAll(col, p1, p2) {
  let best = traceHull(col.clip, col.head, p1, p2);
  if (!col.breakables) return traceActors(col,p1,p2,best);
  const lo = [Math.min(p1[0], p2[0]) - 40, Math.min(p1[1], p2[1]) - 40, Math.min(p1[2], p2[2]) - 40];
  const hi = [Math.max(p1[0], p2[0]) + 40, Math.max(p1[1], p2[1]) + 40, Math.max(p1[2], p2[2]) + 40];
  for (const b of col.breakables) {
    if(b.destroyed)continue;
    const o = b.origin;
    const angle=b.yaw||0,cs=Math.cos(angle),sn=Math.sin(angle);
    // Brush-local expanded hull rotates around its entity origin. Use a
    // conservative radial broadphase so the swinging leaf cannot disappear.
    const radius=angle?Math.hypot(Math.max(Math.abs(b.mins[0]),Math.abs(b.maxs[0])),Math.max(Math.abs(b.mins[1]),Math.abs(b.maxs[1]))):0;
    if ((angle?-radius:b.mins[0]) + o[0] > hi[0] || (angle?radius:b.maxs[0]) + o[0] < lo[0]) continue;
    if ((angle?-radius:b.mins[1]) + o[1] > hi[1] || (angle?radius:b.maxs[1]) + o[1] < lo[1]) continue;
    if (b.mins[2] + o[2] > hi[2] || b.maxs[2] + o[2] < lo[2]) continue;
    const local=p=>{const x=p[0]-o[0],y=p[1]-o[1];return [cs*x+sn*y,-sn*x+cs*y,p[2]-o[2]];};
    const r = traceHull(col.clip, b.hull1, local(p1), local(p2));
    if(angle&&r.normal){const [x,y,z]=r.normal;r.normal=[cs*x-sn*y,sn*x+cs*y,z];}
    if (r.startsolid) best.startsolid = true;
    if (r.hit && (!best.hit || r.frac < best.frac)) { best = { ...r, hit: true }; }
  }
  return traceActors(col,p1,p2,best);
}

function slideAll(col, pos, delta) {
  let p = [pos[0], pos[1], pos[2]], d = [delta[0], delta[1], delta[2]];
  let onGround = false, startsolid = false;
  for (let i = 0; i < 4; i++) {
    const end = [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
    const t = traceAll(col, p, end);
    if (t.startsolid) startsolid = true;
    if (!t.hit) { p = end; break; }
    p = [p[0] + d[0] * t.frac, p[1] + d[1] * t.frac, p[2] + d[2] * t.frac];
    const n = t.normal; if (!n) break;
    if (n[2] > 0.7) onGround = true;
    const rem = 1 - t.frac;
    const dot = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
    d = [(d[0] - dot * n[0]) * rem, (d[1] - dot * n[1]) * rem, (d[2] - dot * n[2]) * rem];
    if (Math.hypot(d[0], d[1], d[2]) < 1e-4) break;
  }
  return { pos: p, onGround, startsolid };
}

function inBuyzone(col, g, team) {
  const h = toHammer(col.T, g);
  for (const z of col.buyzones || []) {
    if(team&&z.team&&team!==z.team)continue;
    const o = z.origin;
    if (h[0] >= z.mins[0] + o[0] && h[0] <= z.maxs[0] + o[0] &&
        h[1] >= z.mins[1] + o[1] && h[1] <= z.maxs[1] + o[1] &&
        h[2] >= z.mins[2] + o[2] && h[2] <= z.maxs[2] + o[2]) return true;
  }
  return false;
}

// ---- spawn: mulai dari z spawn Hammer yang paling dekat (bukan dari atas, agar tidak mendarat di atap) ----
function snapSpawn(col, gx, gz) {
  const hx = toHammer(col.T, [gx, 0, gz]);
  let best = null, bd = 1e18;
  for (const s of col.spawns || []) {
    const d = Math.hypot(s[0] - hx[0], s[1] - hx[1]);
    if (d < bd) { bd = d; best = s; }
  }
  let z = best ? best[2] : hx[2];
  for (let i = 0; i < 60 && traceAll(col, [hx[0], hx[1], z], [hx[0], hx[1], z]).startsolid; i++) z += 2;
  const r = slideAll(col, [hx[0], hx[1], z], [0, 0, -300]);
  return toGame(col.T, r.pos)[1];
}


// ---- klien untuk game-core.js ----
function loadCollision(dir) {
  return Promise.all([
    fetch(dir + '/collision/clip.json').then(r => r.json()),
    fetch(dir + '/collision/clip_planes.bin').then(r => r.arrayBuffer()),
    fetch(dir + '/collision/clip_nodes.bin').then(r => r.arrayBuffer()),
    fetch(dir + '/collision/entities.json').then(r => r.json())
  ]).then(([meta, pb, nb, ent]) => {
    const n = nb.byteLength / 8, dv = new DataView(nb);
    const clip = { pf: new Float32Array(pb), pn: new Int32Array(n), c0: new Int16Array(n), c1: new Int16Array(n) };
    for (let i = 0; i < n; i++) {
      clip.pn[i] = dv.getInt32(i * 8, true);
      clip.c0[i] = dv.getInt16(i * 8 + 4, true);
      clip.c1[i] = dv.getInt16(i * 8 + 6, true);
    }
    return { clip, T: makeTransform(meta), head: 0, crouchHead:meta.hulls?.["3"], breakables: ent.breakables, buyzones: ent.buyzones, spawns: ent.spawns };
  });
}
function snapFloor(col, gx, gz) {
  const hx = toHammer(col.T, [gx, 0, gz]);
  const top = [hx[0], hx[1], 1000], bot = [hx[0], hx[1], -1200];
  const r = slideAll(col, top, [0, 0, bot[2] - top[2]]);
  return toGame(col.T, r.pos)[1];
}
// GoldSrc hull 1 is 72 units tall, hull 3 is 36. Their centers
// differ by 18 units when preserving the same feet position.
function changeStance(col, pos, fromCrouch, toCrouch, grounded=true, actors=[]){
 if(fromCrouch===toCrouch||!Number.isInteger(col.crouchHead))return true;
 const origin=toHammer(col.T,pos.toArray()),hull={...col,head:toCrouch?col.crouchHead:(col.standHead??col.head)};
 // Stance changes must not expand into an actor above or beside us. A zero-
 // length movement trace intentionally ignores existing actor overlaps, so
 // test the requested hull explicitly instead. Do not alter shared collision.
 const bodies=actorHull(col,actors,toCrouch).actorHulls;
 const bodyClear=h=>!bodies.some(a=>Math.abs(h[0]-a.center[0])<32-EPS&&Math.abs(h[1]-a.center[1])<32-EPS&&Math.abs(h[2]-a.center[2])<a.half-EPS);
 const clear=h=>bodyClear(h)&&!traceAll(hull,h,h).startsolid;
 if(!grounded){if(!clear(origin))return false;return true}
 // Preserve feet on an actor platform. In particular, do not choose a lower
 // world-clear center when standing up on a teammate. Never force a stand
 // by searching around a body that blocks the nominal expansion.
 if(bodies.length){
  const nominal=[origin[0],origin[1],origin[2]+(toCrouch?-18:18)];
  if(!bodyClear(nominal))return false;
  if(clear(nominal)){pos.set(...toGame(col.T,nominal));return true;}
 }
 // Real compiled hulls can differ at clip brushes, edges and slopes.
 // Find a non-solid center strictly between the two nominal origins.
 // Then settle onto the target hull's floor, never move through a wall.
 const low=toCrouch?origin[2]-18:origin[2],high=low+18;
 for(let z=low;z<=high+1e-6;z+=1){
  const h=[origin[0],origin[1],Math.min(z,high)];if(!clear(h))continue;
  const settled=slideAll(hull,h,[0,0,-Math.min(1,Math.max(0,h[2]-low))]).pos;
  if(!clear(settled))continue;
  pos.set(...toGame(col.T,settled));return true;
 }
 return false;
}
function canStand(col, g){
 const old=col.head;col.head=col.standHead??col.head;
 try{const h=toHammer(col.T,[g.x,g.y,g.z]);return !traceAll(col,h,h).startsolid}
 finally{col.head=old}
}
function traceSegment(col, start, end){
 const old=col.head;col.head=col.standHead??col.head;
 try{const a=toHammer(col.T,start.toArray()),b=toHammer(col.T,end.toArray()),r=traceAll(col,a,b);
  const n=r.normal;
  return {hit:r.hit,frac:r.frac,normal:n?new THREE.Vector3(...toGame(col.T,n)).normalize():null};
 }finally{col.head=old}
}
// Read actual brush contents at a point; no expanded player hull.
function pointSolid(col,g){
 if(!col?.pointClip)return null;const h=toHammer(col.T,g.toArray()),{pn,pf,c0,c1}=col.pointClip;let n=col.pointHead;
 for(let i=0;n>=0&&i<257;i++){const k=pn[n]*4;if(!Number.isFinite(pf[k]))return null;n=pf[k]*h[0]+pf[k+1]*h[1]+pf[k+2]*h[2]>=pf[k+3]?c0[n]:c1[n];}
 return n<0?n===CONTENTS_SOLID:null;
}
function wallExit(col,entry,dir,maxDepth){
 if(!col?.pointClip||!(maxDepth>0))return null;const step=.25*col.T.k;
 // Require an actual solid run, then a verified exit within the allowed depth.
 let entered=false;for(let d=step;d<=maxDepth+1e-8;d+=step){const p=entry.clone().addScaledVector(dir,d),solid=pointSolid(col,p);if(solid===null)return null;if(solid)entered=true;else if(entered)return p;else if(d>col.T.k)return null;}return null;
}
function tracePointSegment(col,a,b){
 if(!col?.pointClip)return null;
 const r=traceHull(col.pointClip,col.pointHead,toHammer(col.T,a.toArray()),toHammer(col.T,b.toArray())),n=r.normal;
 return {...r,normal:n?new THREE.Vector3(...toGame(col.T,n)).normalize():null};
}
function pointLineBlocked(col,a,b){if(!col?.pointClip)return true;return traceHull(col.pointClip,col.pointHead,toHammer(col.T,a.toArray()),toHammer(col.T,b.toArray())).hit;}
window.BSP = { loadClipData, traceAll, stepSlide, canStand, changeStance, traceSegment, movePlayer, moveActor, actorHull, loadCollision, snapFloor, snapSpawn, inBuyzone, toHammer, toGame, makeTransform, STEP, GRAV, JUMP, SPEED, ZOOM, maxSpeed, analog, accelerate, fallDamage, waterLevel, pointWater, viewMotion, pointSolid, wallExit, pointLineBlocked, tracePointSegment };

})();
