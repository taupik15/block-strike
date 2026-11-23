// nav-graph.js — graf navigasi bot untuk map BSP (cs_kvartal). Klasik (bukan module).
// Node disimpan dalam satuan game (x, y tinggi, z) setelah konversi dari Hammer dengan transform map.
(function () {
  const NG = {};
  let G = null;          // { pos: [[x,y,z]...], adj: [[...]...], spawns }
  let grid = null;       // bucket spasial untuk pencarian node terdekat
  const BUCKET = 128;

  // konversi Hammer -> game, sama dengan BSP.toGame di bsp-physics.js
  function toGame(T, h) {
    const xp = T.c * h[0] - T.s * h[1], yp = T.s * h[0] + T.c * h[1];
    return [xp * T.k, h[2] * T.k, yp * T.k];
  }

  NG.clear = function(){G=null;grid=null};
  NG.load = function (url, transform) {
    return fetch(url).then(r => r.json()).then(g => {
      const T = { c: transform.c, s: transform.s, k: transform.scale };
      G = { pos: g.nodes.map(h => toGame(T, h)), adj: g.adj, spawns: (g.spawns || []).map(sp => ({ team: sp.team, node: sp.node, pos: toGame(T, sp.pos) })) };
      grid = new Map();
      G.pos.forEach((p, i) => {
        const k = Math.floor(p[0] / BUCKET) + ',' + Math.floor(p[2] / BUCKET);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      });
      return G;
    });
  };

  // node terdekat ke posisi game p (cari di bucket sekitar dulu, lalu perluas)
  NG.nearest = function (p, maxDist = 400) {
    if (!G) return -1;
    const bx = Math.floor(p[0] / BUCKET), bz = Math.floor(p[2] / BUCKET);
    let best = -1, bd = maxDist * maxDist;
    for (let r = 0; r <= Math.ceil(maxDist / BUCKET); r++) {
      for (let i = bx - r; i <= bx + r; i++) for (let j = bz - r; j <= bz + r; j++) {
        if (Math.max(Math.abs(i - bx), Math.abs(j - bz)) !== r) continue;
        const list = grid.get(i + ',' + j); if (!list) continue;
        for (const id of list) {
          const q = G.pos[id];
          const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
          const d = dx * dx + dy * dy * 0.25 + dz * dz;   // tinggi sedikit lebih longgar
          if (d < bd) { bd = d; best = id; }
        }
      }
      if (best >= 0 && bd <= (r * BUCKET) * (r * BUCKET)) break;
    }
    return best;
  };

  // A* uses reusable scratch per graph; no cached paths or dynamic weights.
  // Weak keys allow the workspace to be collected with an unloaded map.
  const workspaces = new WeakMap();
  function workspace(n) {
    return {scores:new Float64Array(n), parents:new Int32Array(n), closed:new Uint8Array(n),
      priorities:[], ids:[], heuristic:new Float64Array(n), busy:false};
  }
  NG.pathGraph = function (graph, start, goal, skip, weight) {
    if (!graph || !Number.isInteger(start) || !Number.isInteger(goal)) return null;
    const P=graph.pos,A=graph.adj,n=P.length;
    if(start<0||goal<0||start>=n||goal>=n)return null;
    if(start===goal)return [start];
    let w=workspaces.get(graph);
    if(!w||w.scores.length!==n){w=workspace(n);workspaces.set(graph,w);}
    // A callback can run another search on the same graph. Do not share live scratch.
    if(w.busy)w=workspace(n);
    w.busy=true;
    const {scores:g,parents:came,closed,priorities:f,ids,heuristic}=w;
    g.fill(Infinity);came.fill(-1);closed.fill(0);heuristic.fill(NaN);f.length=ids.length=0;
    const dest=P[goal];
    // Search-local only: dynamic blocked edges and weights are still evaluated
    // normally. Never share scores or heuristic values across goals/searches.
    const h=i=>{const v=heuristic[i];if(!Number.isNaN(v))return v;const p=P[i];return heuristic[i]=Math.hypot(p[0]-dest[0],p[1]-dest[1],p[2]-dest[2]);};
    // Strict comparisons retain the previous heap's equal-priority ordering.
    function push(cost,id){
      let i=f.length;while(i>0){const p=(i-1)>>1;if(f[p]<=cost)break;f[i]=f[p];ids[i]=ids[p];i=p;}
      f[i]=cost;ids[i]=id;
    }
    function pop(){
      const id=ids[0],last=f.pop(),lastId=ids.pop();
      if(f.length){let i=0;for(;;){const l=i*2+1,r=l+1;if(l>=f.length)break;
        let m=l;if(r<f.length&&f[r]<f[l])m=r;if(!(f[m]<last))break;
        f[i]=f[m];ids[i]=ids[m];i=m;
      }f[i]=last;ids[i]=lastId;}
      return id;
    }
    try {
      g[start]=0;push(h(start),start);let expansions=0;
      while(f.length){
        const cur=pop();
        if(cur===goal){const out=[];for(let c=cur;c!==-1;c=came[c])out.push(c);return out.reverse();}
        if(closed[cur])continue;
        closed[cur]=1;if(++expansions>400000)return null;
        const a=P[cur],gc=g[cur];
        for(const nb of A[cur]||[]){
          if((nb|0)!==nb||nb<0||nb>=n||closed[nb]||skip?.(cur,nb))continue;
          const b=P[nb],ng=gc+Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])*Math.max(1,weight?.(cur,nb)||1);
          if(ng<g[nb]){g[nb]=ng;came[nb]=cur;push(ng+h(nb),nb);}
        }
      }
      return null;
    } finally {w.busy=false;f.length=ids.length=0;}
  };


  NG.path=(start,goal)=>NG.pathGraph(G,start,goal);

  // gerak satu bot: ikuti jalur A* + collision BSP
  // Tahap 7 stuck-fix: deteksi ganda (jarak + displacement), side-step, force repath
  NG.botStep = function (b, target, sp, dt) {
    const col = window.bspCol, p = b.g.position;
    if (!col || !window.BSP || !G) return false;
    const nb = b.nav || (b.nav = {
      path: null, idx: 0, age: 9,
      st: { pos: [p.x, p.y, p.z], vy: 0, on: false },
      stuckCount: 0, noProg: 0, sideT: 0, sideDir: 1,
      lastPos: [p.x, p.z], moveAcc: 0
    });
    nb.age += dt;

    // replan periodik / setelah force
    if (!nb.path || nb.age > 1.5 || !nb.target || Math.hypot(nb.target[0]-target.x,nb.target[2]-target.z)>3) {
      const from = NG.nearest([p.x, p.y, p.z]);
      const to = NG.nearest([target.x, target.y, target.z]);
      nb.path = NG.path(from, to) || [];
      nb.target=[target.x,target.z];
      nb.idx = 0;
      nb.age = 0;
      nb.noProg = 0;
      nb.sideT = 0;
    }

    let wp = [target.x, target.y, target.z];
    if (nb.path && nb.path.length) {
      while (nb.idx < nb.path.length) {
        const q = G.pos[nb.path[nb.idx]];
        const horiz = Math.hypot(q[0] - p.x, q[2] - p.z);
        const vert = Math.abs(q[1] - p.y);
        if (horiz < 0.55 && vert < 2.2) nb.idx++;
        else break;
      }
      if (nb.idx < nb.path.length) wp = G.pos[nb.path[nb.idx]];
    }

    // --- deteksi macet (dua sinyal) ---
    const curD = Math.hypot(wp[0] - p.x, wp[2] - p.z);
    const moved = Math.hypot(p.x - nb.lastPos[0], p.z - nb.lastPos[1]);
    nb.lastPos = [p.x, p.z];
    nb.moveAcc = (nb.moveAcc || 0) * 0.85 + moved;

    if (nb.wpRef !== nb.idx) {
      nb.wpRef = nb.idx;
      nb.bestD = curD;
      nb.noProg = 0;
    } else if (curD < (nb.bestD || curD) - 0.04) {
      nb.bestD = curD;
      nb.noProg = 0;
    } else {
      nb.noProg = (nb.noProg || 0) + dt;
    }

    // sinyal 2: hampir tidak bergerak
    if (nb.moveAcc < sp * dt * 0.25) nb.noProg += dt * 0.55;

    // recovery
    if (nb.noProg > 0.7 && nb.path) {
      nb.idx++;
      nb.noProg = 0;
      nb.stuckCount = (nb.stuckCount || 0) + 1;
      nb.sideT = 0.55;
      nb.sideDir = (nb.sideDir || 1) * -1;
      if (nb.stuckCount >= 3) {
        nb.age = 9;
        nb.stuckCount = 0;
      }
    }

    // Distant waypoints are normal. Replan only on age, target change or actual stall.

    const dx = wp[0] - p.x, dz = wp[2] - p.z, d = Math.hypot(dx, dz) || 1;
    let wishX = dx / d * sp;
    let wishZ = dz / d * sp;

    // side-step saat recovery
    if (nb.sideT > 0) {
      nb.sideT -= dt;
      const sx = -dz / d * sp * 0.85 * (nb.sideDir || 1);
      const sz =  dx / d * sp * 0.85 * (nb.sideDir || 1);
      wishX = wishX * 0.35 + sx;
      wishZ = wishZ * 0.35 + sz;
    }

    const heightDiff = wp[1] - p.y;
    const jump = nb.st.on && heightDiff > 0.32;

    nb.st.pos = [p.x, p.y, p.z];
    nb.st.vel=b.vel;nb.st.vy=b.vy||0;nb.st.on=!!b.onGround;nb.st.jumpHeld=b.jumpHeld;
    BSP.movePlayer(col, col.T, nb.st, [wishX, wishZ], dt, jump,!!b.crouching);
    b.vel=nb.st.vel;b.vy=nb.st.vy;b.onGround=nb.st.on;b.medium=nb.st.medium;b.waterLevel=nb.st.waterLevel;b.jumpHeld=nb.st.jumpHeld;
    p.set(nb.st.pos[0], nb.st.pos[1], nb.st.pos[2]);

    b.navStuck = (nb.noProg > 0.25) || (nb.sideT > 0);
    return true;
  };

  NG.pos = (i) => G.pos[i];
  NG.graph = () => G;
  window.NavGraph = NG;
})();
