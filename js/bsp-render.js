// bsp-render.js - memuat geometri BSP hasil ekspor (manifest.json, geo.bin, tex/*.png, lm/*.png).
// Dimuat sebagai script biasa setelah three.js dan sebelum game-core.js.
// Tahap 3: lightmap dipasang lewat MeshBasicMaterial (map * lightMap * lightMapIntensity).
// Skybox tahap 4: 6 sisi GoldSrc (ft, bk, lf, rt, up, dn) pada kotak yang diputar sesuai map.
// Mengikuti kamera lewat window.bspSky.position (diatur dari game-core.js).
function loadBspSky(dir, man, scene, loadTexture) {
  const f = {};
  ['ft','bk','lf','rt','up','dn'].forEach(k => { f[k] = loadTexture(dir + '/' + man.sky.dir + '/' + k + '.png'); });
  return BSPVisuals.mountSky(f,scene,-(man.rotation || 0));
}

// Props (model .mdl statis) tahap 4b. Setiap model dimuat sekali lalu di-clone per instance.
// Sumbu lokal di-swap (vx, vz, vy) seperti pada tools/bsp2json/export_props.py.
function loadBspProps(dir, scene, loadTexture) {
  return Promise.all([
    fetch(dir + '/props/props.json').then(r => r.json()),
    fetch(dir + '/props/props.bin').then(r => r.arrayBuffer())
  ]).then(([pj, buf]) => {
    const protos = {};
    Object.keys(pj.models).forEach(key => {
      const g = new THREE.Group();
      pj.models[key].groups.forEach(gr => {
        const n = gr.vertices;
        const raw = new Float32Array(buf, gr.posOffset, n * 3).slice();
        for (let i = 0; i < n * 3; i += 3) { const y = raw[i + 1]; raw[i + 1] = raw[i + 2]; raw[i + 2] = y; }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(raw, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf, gr.uvOffset, n * 2).slice(), 2));
        geo.computeVertexNormals();
        geo.computeBoundingBox();geo.computeBoundingSphere();
        const tex = loadTexture(dir + '/props/' + gr.tex,!!gr.alpha);
        tex.flipY = false;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = gr.alpha ? THREE.NearestFilter : THREE.LinearMipMapLinearFilter;
        tex.generateMipmaps = !gr.alpha; // Avoid blue palette-key bleed on masked foliage.
        const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, alphaTest: gr.alpha ? 0.5 : 0 });
        g.add(new THREE.Mesh(geo, mat));
      });
      protos[key] = g;
    });
    pj.instances.forEach(inst => {
      const proto = protos[inst.model];
      if (!proto) return;
      const o = proto.clone(true);
      o.position.set(inst.x, inst.y, inst.z);
      o.rotation.y = inst.rotY;
      scene.add(o);o.traverse(m=>{if(m.isMesh)scene.userData.rayMeshes?.push(m)});
    });
  });
}

window.loadBspWorld = function (dir, scene) {
  const loader = new THREE.TextureLoader(), pending = [], errors = [], textures = new Map();
  const loadTexture = (url, masked=false) => {
    const key=url+':'+masked;if(textures.has(key))return textures.get(key);
    let texture;
    pending.push(new Promise(resolve => {
      texture = loader.load(url, resolve, undefined, () => { errors.push(url); resolve(); });
    }));
    textures.set(key,texture);return texture;
  };
  return fetch(dir + '/manifest.json').then(r => {
    if (!r.ok) throw new Error('manifest ' + dir);
    return r.json();
  }).then(man => {
    return fetch(dir + '/geo.bin').then(r => r.arrayBuffer()).then(buf => {
      const lmCache = {};
      const intensity = man.lightmapIntensity ?? 1;
      const texOpts = (t, nearest) => {
        t.flipY = false;                       // baris 0 atlas/tekstur = v 0 (sesuai ekspor)
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = THREE.LinearMipMapLinearFilter;
        return t;
      };
      man.groups.forEach(g => {
        const n = g.vertices;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, g.posOffset, n * 3), 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf, g.uvOffset, n * 2), 2));
        const tex = texOpts(loadTexture(dir + '/' + g.tex,!!g.alpha), true);
        if(g.alpha){tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;}
        const opts = { map: tex, side: THREE.DoubleSide, alphaTest: g.alpha ? 0.5 : 0 };
        if (g.lightmap && g.uv2Offset !== undefined) {
          geo.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(buf, g.uv2Offset, n * 2), 2));
          if (!lmCache[g.lightmap]) {
            const lm=texOpts(loadTexture(dir + '/' + g.lightmap), false);
            // Atlas islands have only narrow gutters; mipmaps mix unrelated faces.
            lm.wrapS=lm.wrapT=THREE.ClampToEdgeWrapping;
            lm.minFilter=lm.magFilter=THREE.LinearFilter;lm.generateMipmaps=false;
            lmCache[g.lightmap]=lm;
          }
          opts.lightMap = lmCache[g.lightmap];
          opts.lightMapIntensity = intensity;
        }
        // Rigid BSP geometry: precompute local raycast bounds once.
        geo.computeBoundingBox();geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial(opts));
        scene.add(mesh);scene.userData.rayMeshes?.push(mesh);
      });
      if (man.sky) loadBspSky(dir, man, scene, loadTexture);
      return loadBspProps(dir, scene, loadTexture).then(() => Promise.all(pending)).then(() => {
        if (errors.length) throw new Error('Tekstur map gagal dimuat: ' + errors[0]);
      });
    });
  }).finally(() => Promise.all(pending)); // drain texture work before map retry
};

/* Shared Three.js presentation for geometry produced by the local importer. */
const BSPVisuals=(()=>{
 const size=1024;
 function lightmaps(data){
  const pages=[];
  let limited=false, nonStatic=false;
  function add(vertices,offset,styles=[0]){
   if(offset<0)return null;
   const minS=Math.floor(Math.min(...vertices.map(p=>p[0]))/16),minT=Math.floor(Math.min(...vertices.map(p=>p[1]))/16);
   const w=Math.ceil(Math.max(...vertices.map(p=>p[0]))/16)-minS+1,h=Math.ceil(Math.max(...vertices.map(p=>p[1]))/16)-minT+1;
   const active=Array.from(styles).slice(0,4);const end=active.indexOf(255);if(end>=0)active.length=end;
   if(!active.length)return null;
   const stride=w*h*3;
   if(!Number.isFinite(w+h)||w<1||h<1||w>256||h>256||offset+stride*active.length>data.byteLength){limited=true;return null}
   if(active.some(id=>id!==0))nonStatic=true;
   // Prefer constant style 0; otherwise freeze the first authored sample layer.
   // Animated lightstyles are explicitly not simulated.
   offset+=Math.max(0,active.indexOf(0))*stride;
   let p=pages.at(-1);
   if(p&&p.x+w+2>size){p.x=0;p.y+=p.row;p.row=0}
   if(!p||p.y+h+2>size){
    if(pages.length===6){limited=true;return null}
    p={x:0,y:0,row:0,rgba:new Uint8Array(size*size*4).fill(255)};pages.push(p);
   }
   const x=p.x+1,y=p.y+1,page=pages.length-1;
   p.x+=w+2;p.row=Math.max(p.row,h+2);
   for(let v=-1;v<=h;v++)for(let u=-1;u<=w;u++){
    const i=offset+(Math.max(0,Math.min(h-1,v))*w+Math.max(0,Math.min(w-1,u)))*3;
    const pos=((y+v)*size+x+u)*4;
    for(let c=0;c<3;c++)p.rgba[pos+c]=Math.min(255,data.getUint8(i+c)*1.45);
   }
   return {page,uv:(s,t)=>[(x+s/16-minS+.5)/size,(y+t/16-minT+.5)/size]};
  }
  return {add,get limited(){return limited},get nonStatic(){return nonStatic},finish:()=>pages.map(p=>{
   const t=new THREE.DataTexture(p.rgba,size,size,THREE.RGBAFormat);
   t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.generateMipmaps=false;
   t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearFilter;t.needsUpdate=true;
   return t;
  })};
 }
 function mesh({name,map,positions,uvs,uv2,lightmap,opacity=1,worldSurface=false}){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  if(uv2)geo.setAttribute('uv2',new THREE.BufferAttribute(uv2,2));
  // Bounds remain local, so translated doors and moving brushes retain correct raycasts.
  geo.computeBoundingBox();geo.computeBoundingSphere();
  const water=/^[!*]/.test(name),transparent=water||opacity<1;
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map,lightMap:lightmap||null,
   color:map?0xffffff:water?0x477f86:0x9b9586,side:THREE.DoubleSide,
   transparent,opacity:water?Math.min(opacity,.74):opacity,depthWrite:!transparent,alphaTest:name.startsWith('{')?.5:0}));
  mesh.userData.textureName=name;mesh.userData.worldSurface=worldSurface;return mesh;
 }
 function mountSky(face,scene,rotation=0){
  // Camera far = 150. All cube vertices must remain within it even at
  // diagonal views; draw first without depth writes, regardless of map size.
  // GoldSrc left/right refer to the view from inside the sky. Three's
  // +Z/-Z face slots use the opposite ordering. Keep the original FT/BK
  // orientation; swapping these two sides joins the authored edges.
  const materials=['ft','bk','up','dn','rt','lf'].map(id=>{
   const map=face[id];map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
   map.encoding=THREE.sRGBEncoding;map.generateMipmaps=false;
   map.minFilter=map.magFilter=THREE.LinearFilter;map.needsUpdate=true;
   return new THREE.MeshBasicMaterial({map,side:THREE.BackSide,depthWrite:false,fog:false});
  });
  const box=new THREE.Mesh(new THREE.BoxGeometry(100,100,100),materials);
  box.rotation.y=rotation;box.renderOrder=-1;box.frustumCulled=false;
  scene.add(box);window.bspSky=box;return box;
 }
 return {lightmaps,mesh,mountSky};
})();
