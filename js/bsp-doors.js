// bsp-doors.js — func_door: geometri bergerak + collision bergerak + logika buka/tutup (klasik, dipakai game-core.js).
(function () {
  const S = 0.02;                  // skala Hammer -> game (sama dengan manifest)
  const TOUCH = 24;                // jarak sentuh (Hammer units) untuk memicu pintu
  const doors = [];
  let col = null, mapDir = null, intensity = 1;

  function texOpts(t, nearest) {
    t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
    t.minFilter = THREE.LinearMipMapLinearFilter; return t;
  }
  // muat geometri pintu dan kumpulkan entry collision
  function load(dir, scene, collision, manifestIntensity) {
    mapDir = dir; col = collision; intensity = manifestIntensity || 1;
    doors.length = 0;
    return Promise.all([
      fetch(dir + '/doors.json').then(r => r.json()),
      fetch(dir + '/doors_geo.bin').then(r => r.arrayBuffer())
    ]).then(([meta, buf]) => {
      intensity = meta.lightmapIntensity || intensity;
      const loader = new THREE.TextureLoader(), lmCache = {}, texCache = {};
      for (const d of meta.doors) {
        const grp = new THREE.Group(); scene.add(grp);
        for (const g of d.groups) {
          const n = g.vertices;
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, g.posOffset, n * 3), 3));
          geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf, g.uvOffset, n * 2), 2));
          const opts = { side: THREE.DoubleSide, alphaTest: g.alpha ? 0.5 : 0 };
          if (g.tex) {
            if (!texCache[g.tex]) texCache[g.tex] = texOpts(loader.load(dir + '/' + g.tex), true);
            opts.map = texCache[g.tex];
          }
          if (g.uv2Offset !== undefined && g.lightmap) {
            geo.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(buf, g.uv2Offset, n * 2), 2));
            if (!lmCache[g.lightmap]) lmCache[g.lightmap] = texOpts(loader.load(dir + '/' + g.lightmap), false);
            opts.lightMap = lmCache[g.lightmap]; opts.lightMapIntensity = intensity;
          }
          const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial(opts));grp.add(mesh);scene.userData.rayMeshes?.push(mesh);
        }
        const entry = { origin: [0, 0, 0], mins: d.mins, maxs: d.maxs, hull1: d.hull1 };
        if (col && col.breakables) col.breakables.push(entry);
        doors.push({ d, grp, entry, p: 0, state: 'closed', timer: 0, touchable: !d.targetname });
      }
      return doors.length;
    });
  }
  function insideTouch(dr, h, closed=false) {
    if(!h)return false;
    const o = closed?(dr.base||[0,0,0]):dr.entry.origin, mn = dr.d.mins, mx = dr.d.maxs;
    if(dr.d.rotating){const yaw=closed?0:dr.entry.yaw||0,cs=Math.cos(yaw),sn=Math.sin(yaw),x=h[0]-o[0],y=h[1]-o[1];h=[o[0]+cs*x+sn*y,o[1]-sn*x+cs*y,h[2]];}
    for (let i = 0; i < 3; i++) {
      if (h[i] < mn[i] + o[i] - TOUCH || h[i] > mx[i] + o[i] + TOUCH) return false;
    }
    return true;
  }
  function triggerContains(c,b,h){
    if(!h||!c?.clip||b.hull1<0)return false;
    if(!h.every((v,i)=>v>=b.mins[i]+b.origin[i]-40&&v<=b.maxs[i]+b.origin[i]+40))return false;
    const q=h.map((v,i)=>v-b.origin[i]);
    return BSP.traceAll({clip:c.clip,head:b.hull1},q,q).startsolid;
  }
  // Reach a stationary button with a conservative standing-hull trace. Do not
  // let a player or bot use it through a wall. Exclude only the button itself.
  function buttonReach(c,b,h){
    if(!c?.clip||!b||!h||b.destroyed)return false;
    const p=h.map((v,i)=>Math.max(b.origin[i]+b.mins[i],Math.min(b.origin[i]+b.maxs[i],v)));
    if(Math.hypot(...p.map((v,i)=>v-h[i]))>48)return false;
    return !BSP.traceAll({...c,actorHulls:[],breakables:(c.breakables||[]).filter(x=>x!==b)},h,p).hit;
  }
  function useButton(c,h,activate=true){
    for(const dr of doors){
      if(!c?.breakables?.includes(dr.entry)||!(dr.state==='closed'||dr.state==='closing'))continue;
      if(dr.d.buttons?.some(b=>buttonReach(c,b,h))){if(activate)dr.buttonRequested=true;return true;}
    }
    return false;
  }
  // Remote navigation may request only its exact, reachable button, never
  // another door or an unsupported short-window door.
  function remoteButton(c,entry,button,h){
    const dr=doors.find(d=>d.entry===entry&&d.c===c&&(d.d.wait===-1||d.d.wait>=3)&&d.d.buttons?.includes(button));
    if(!dr||!buttonReach(c,button,h))return false;
    if(dr.state==='closed'||dr.state==='closing'||dr.state==='open'&&dr.d.wait>=3)dr.buttonRequested=true;
    return true;
  }
  function remoteStatus(c,entry){
    const dr=doors.find(d=>d.entry===entry&&d.c===c&&(d.d.wait===-1||d.d.wait>=3));
    return dr?{state:dr.state,wait:dr.d.wait,remaining:dr.d.wait===-1?Infinity:Math.max(0,dr.timer)}:null;
  }
  function remoteState(c,entry){return remoteStatus(c,entry)?.state||null;}
  function triggered(dr,h){return dr.d.triggers?.some(b=>triggerContains(dr.c,b,h))||false;}
  // Conservative sampled swing: never intentionally push/crush actors. The
  // expanded brush hull is tested independently of the world and other doors.
  function swingClear(c,entry,from,to,actors){
    const radius=Math.hypot(...[0,1].map(i=>Math.max(Math.abs(entry.mins[i]),Math.abs(entry.maxs[i]))));
    const steps=Math.max(1,Math.ceil(Math.abs(to-from)*Math.max(1,radius)/2));
    for(let i=1;i<=steps;i++){
      const b={...entry,yaw:from+(to-from)*i/steps};
      for(const h of actors)if(BSP.traceAll({...c,head:-1,actorHulls:[],breakables:[b]},h,h).startsolid)return false;
    }
    return true;
  }
  // Pick a complete swing that clears every current actor. Freeze the chosen
  // direction until the door is fully closed; never flip a partly open leaf.
  function chooseSwing(c,entry,distance,actors,twoWay=false){
    const yaw=distance*Math.PI/180;
    if(swingClear(c,entry,0,yaw,actors))return 1;
    if(twoWay&&swingClear(c,entry,0,-yaw,actors))return -1;
    return 0;
  }
  function pose(dr){
    const d=dr.d;
    if(d.rotating){
      const a=dr.p*(dr.sign||1)*Math.PI/180,T=dr.c.T,p=BSP.toGame(T,dr.base),r=-a*(T.zSign??1),cs=Math.cos(r),sn=Math.sin(r);
      dr.entry.yaw=a;dr.grp.rotation.y=r;
      dr.grp.position.set(p[0]-cs*p[0]-sn*p[2],0,p[2]+sn*p[0]-cs*p[2]);
      dr.grp.updateMatrixWorld(true);return;
    }
    const mv=d.movedir_g,s=dr.p*(dr.c?.T?.k||S);dr.grp.position.set(mv[0]*s,mv[1]*s,mv[2]*s);
    dr.entry.origin=d.movedir_h.map((n,i)=>n*dr.p+(dr.base?.[i]||0));
  }
  // dt dalam detik; ph = posisi pemain dalam Hammer units
  function update(dt, ph, other=[]) {
    for (const dr of doors) {
      const d = dr.d;
      const actors=[ph,...other].filter(Boolean);
      const touching = !!dr.buttonRequested||actors.some(h=>dr.touchable?insideTouch(dr,h,!!d.rotating):triggered(dr,h));
      dr.buttonRequested=false;
      // A named door must not activate from its brush alone. Once open, keep the
      // closed opening clear while an actor passes, even after leaving the trigger.
      const occupied=(!!d.triggers?.length||!!d.buttons?.length||d.rotating)&&actors.some(h=>insideTouch(dr,h,true));
      const prior=dr.p;
      dr.swingBlocked=false;
      if (dr.state === 'closed' && touching) {
        if(d.rotating&&d.twoWay){
          dr.sign=chooseSwing(dr.c,dr.entry,d.distance,actors,true);
          if(!dr.sign){dr.swingBlocked=true;continue;}
        }
        dr.state = 'opening';
      }
      if (dr.state === 'opening') {
        dr.p += d.speed * dt;
        if (dr.p >= d.distance) { dr.p = d.distance; dr.state = 'open'; dr.timer = d.wait; }
      } else if (dr.state === 'open') {
        if (d.wait >= 0) {
          if (touching||occupied) dr.timer = d.wait;
          else { dr.timer -= dt; if (dr.timer <= 0) dr.state = 'closing'; }
        }
      } else if (dr.state === 'closing') {
        if (touching||occupied) dr.state = 'opening';
        else {
          dr.p -= d.speed * dt;
          if (dr.p <= 0) { dr.p = 0; dr.state = 'closed'; }
        }
      }
      if(d.rotating&&dr.p!==prior&&!swingClear(dr.c,dr.entry,prior*(dr.sign||1)*Math.PI/180,dr.p*(dr.sign||1)*Math.PI/180,actors)){
        const opening=dr.p>prior;dr.p=prior;dr.state='opening';dr.swingBlocked=opening;
      }
      pose(dr);
    }
  }
  // A bot already inside the touch range can wait while a nearby door opens.
  // Keep actual BSP collision active; a solid wall must never be bypassed.
  function waitingForPassage(c,h,end){
    if(!c?.breakables)return false;
    for(const dr of doors){
      const button=dr.d.buttons?.some(b=>buttonReach(c,b,h));
      if(dr.swingBlocked||!c.breakables.includes(dr.entry)||!(dr.touchable?insideTouch(dr,h,!!dr.d.rotating):button||triggered(dr,h)||(dr.state==='opening'&&insideTouch(dr,h,true)))||(dr.state!=='closed'&&dr.state!=='opening'&&dr.state!=='closing'))continue;
      const probe={...c,breakables:[dr.entry]},without={...c,breakables:c.breakables.filter(b=>b!==dr.entry)};
      if(!BSP.traceAll(without,h,end).hit&&BSP.traceAll(probe,h,end).hit){if(button)dr.buttonRequested=true;return true;}
    }
    return false;
  }
  window.BSPDoors = { load, update, waitingForPassage, triggerContains, buttonReach, useButton, remoteButton, remoteState, remoteStatus, swingClear, chooseSwing, addLocal:(d,grp,entry,c)=>{entry.closedOrigin??=[...entry.origin];entry.origin=[...entry.closedOrigin];if(d.rotating)entry.yaw=0;const dr={d,grp,entry,c,base:[...entry.closedOrigin],p:0,state:'closed',timer:0,touchable:!d.targetname};doors.push(dr);if(d.rotating)pose(dr);}, clear:()=>{doors.length=0;col=null}, list: () => doors };
})();

// Local BSP shootable brush lifecycle. Geometry and raycast membership change
// atomically with the collision entry; graph refresh is coalesced per tick.
window.BSPBreakables=(()=>{
 let data=null,rays=null,items=[],dirty=false;
 const effects=[];
 // GoldSrc material IDs; cosmetic approximation, not material damage rules.
 const profiles={0:{color:0xbde5ed,size:[.65,.8,.13],count:10,frequency:6500,duration:.12},1:{color:0x9b7041,size:[.45,1.1,.35],count:8,frequency:1400,duration:.15},2:{color:0xa5adb6,size:[.7,.8,.2],count:7,frequency:4200,duration:.18},3:{color:0x824343,size:[.8,.8,.8],count:5,frequency:650,duration:.13},4:{color:0x9c9b91,size:[.95,.8,.8],count:7,frequency:1000,duration:.15},5:{color:0xd0c9b3,size:[1,.75,.18],count:7,frequency:1700,duration:.12},6:{color:0x647c70,size:[.6,.9,.35],count:8,frequency:3300,duration:.16},8:{color:0x77716c,size:[.8,.9,.8],count:7,frequency:950,duration:.17}};
 function queueEffect(item,mesh,contact){
  if(effects.length>=16)return; // cosmetic budget; never limit destruction
  let pos=contact?.isVector3?contact.clone():null;
  if(!pos&&mesh?.geometry){const box=new THREE.Box3().setFromObject(mesh);if(!box.isEmpty())pos=box.getCenter(new THREE.Vector3());}
  if(!pos||![pos.x,pos.y,pos.z].every(Number.isFinite))return;
  effects.push({pos,profile:profiles[item.material]||profiles[0],scale:data?.col?.T?.k||.02});
 }
 function takeEffects(){return effects.splice(0);}
 function refresh(){if(!dirty)return;dirty=false;const check=LocalBSPNav.refreshGeometry(data?.graph,data?.sites||[]);if(check)data.navValidation=check;}
 function clear(){items=[];data=null;rays=null;dirty=false;effects.length=0;}
 function mount(map,rayMeshes){clear();data=map;rays=rayMeshes;items=(map.destructibles||[]).map(d=>{if(d.entry.destroyed)dirty=true;d.entry.destroyed=false;return {...d,health:d.hp,meshes:[]};});refresh();}
 function register(index,mesh,raycast=true){const item=items[index];if(!item)return;item.meshes.push({mesh,raycast});mesh.userData.breakable=item;}
 function hit(mesh,damage,contact=null){const item=mesh?.userData?.breakable;if(!item||item.bombTarget||!items.includes(item)||item.entry.destroyed||!Number.isFinite(damage)||damage<=0)return false;
  item.health=Math.max(0,item.health-damage);if(item.health>0)return false;
  return destroy(item,mesh,contact);
 }
 function destroy(item,mesh,contact){
  if(item.entry.destroyed)return false;item.health=0;item.entry.destroyed=true;queueEffect(item,mesh,contact);for(const {mesh} of item.meshes){mesh.visible=false;const i=rays.indexOf(mesh);if(i>=0)rays.splice(i,1);}dirty=true;return true;
 }
 // HE uses the existing radius/damage curve and visible brush surfaces.
 // Collect all damage before mutating any brush so one explosion cannot clear
 // a screen and then damage another brush through it in the same frame.
 function blast(pos,source,col){
  if(!col?.local||data?.col!==col||!rays||!items.length)return 0;
  const k=col.T.k,radius=Grenade14D.TYPES.he.blastRadius*Grenade14D.worldScale(k),wet=BSP.pointWater(col,pos),ray=new THREE.Raycaster(),pending=[];
  for(const item of items){if(item.entry.destroyed||item.bombTarget)continue;let best=null;
   for(const {mesh,raycast} of item.meshes){if(!raycast||!mesh.visible||!rays.includes(mesh)||!mesh.geometry)continue;
    const box=new THREE.Box3().setFromObject(mesh),near=box.clampPoint(source,V());if(box.isEmpty()||near.distanceTo(pos)>=radius)continue;
    const center=box.getCenter(V()),samples=[near,center];
    for(const axis of ['x','y','z'])for(const bound of [box.min,box.max]){const q=center.clone();q[axis]=bound[axis];samples.push(q);}
    for(const q of samples){const delta=q.clone().sub(source),len=delta.length();if(len<1e-6)continue;
     ray.set(source,delta.divideScalar(len));ray.far=Math.min(radius+k,len+k);
     const h=ray.intersectObjects(rays)[0];if(h?.object?.userData?.breakable!==item)continue;
     const point=h.point,dist=point.distanceTo(pos);if(dist>=radius||BSP.pointWater(col,point)!==wet)continue;
     const before=point.clone().addScaledVector(delta,-Math.min(k*.25,h.distance*.5));
     if(col.pointClip&&BSP.pointLineBlocked(col,source,before))continue;
     if(!best||dist<best.dist)best={mesh:h.object,dist,point:point.clone()};
    }
   }
   if(best){const damage=Grenade14D.heDamage(best.dist,false,k);if(damage>0)pending.push([best.mesh,damage,best.point]);}
  }
  let destroyed=0;for(const [mesh,damage,point] of pending)if(hit(mesh,damage,point))destroyed++;
  return destroyed;
 }
 function bombExplode(target){if(!target)return 0;let count=0;for(const item of items)if((item.bombTarget===target||item.bombTrigger===target)&&destroy(item,item.meshes[0]?.mesh,null))count++;return count;}
 function reset(){effects.length=0;for(const item of items){item.health=item.hp;if(!item.entry.destroyed)continue;item.entry.destroyed=false;for(const {mesh,raycast} of item.meshes){mesh.visible=true;if(raycast&&!rays.includes(mesh))rays.push(mesh);}dirty=true;}refresh();}
 // Find a visible shootable brush on the intended final walking leg. Never
 // alter live collision while probing, or accept a wall/second brush behind it.
 function passageTarget(col,bot,goal,raycaster){
  const nav=bot.localRoute, p=bot.g.position,k=col?.T?.k;
  if(!items.length||!k||!nav||nav.graph?.col!==col||nav.direct||nav.points?.length||nav.flight||nav.stationId!=null||bot.routeJump||bot.routeLadder||bot.crouching||!bot.onGround||bot.medium==='water'||bot.medium==='ladder')return null;
  const d=goal.clone().sub(p);if(Math.abs(d.y)>18*k||Math.hypot(d.x,d.z)>360*k||Math.hypot(d.x,d.z)<24*k)return null;
  const eye=p.clone().add(V(0,28*k,0)),end=goal.clone().add(V(0,28*k,0)),delta=end.sub(eye),range=delta.length();
  raycaster.set(eye,delta.normalize());raycaster.far=range;
  const hit=raycaster.intersectObjects(rays)[0],item=hit?.object?.userData?.breakable;
  if(!item||item.bombTarget||!items.includes(item)||item.entry.destroyed||!col.breakables.includes(item.entry)||hit.distance>160*k)return null;
  const a=BSP.toHammer(col.T,p.toArray()),b=BSP.toHammer(col.T,goal.toArray());
  if(!BSP.traceAll(col,a,b).hit||!BSP.traceAll({...col,breakables:[item.entry]},a,b).hit)return null;
  const open={...col,breakables:col.breakables.filter(x=>x!==item.entry)};
  if(BSP.traceAll(open,a,b).hit||!LocalBSPNav.walkable(open,a,b))return null;
  return {item,point:hit.point.clone()};
 }
 function active(item){return !!item&&items.includes(item)&&!item.entry.destroyed;}
 return {mount,register,hit,blast,bombExplode,reset,refresh,clear,passageTarget,active,takeEffects};
})();
