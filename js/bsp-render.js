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
        BSPVisuals.compact(geo);geo.computeBoundingBox();geo.computeBoundingSphere();
        BSPVisuals.prepareSight(geo);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial(opts));
        scene.add(BSPVisuals.staticMesh(mesh));scene.userData.rayMeshes?.push(mesh);
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
 // Immutable BSP triangles: compact block bounds for boolean LOS.
 // Optional exact indexing retains triangle order, collision and damage.
 const sightBlocks=new WeakMap();
 // Deduplicate only complete, exactly equal vertex tuples. UV/lightmap seams
 // are retained. Uint16 indices work even on WebGL1 without OES_element_index_uint.
 function compact(geo){
  const attrs=Object.entries(geo.attributes),pos=geo.attributes.position,n=pos?.count||0;
  if(geo.index||n<192||n>65535||n%3||geo.groups.length||Object.keys(geo.morphAttributes).length||geo.drawRange.start!==0||geo.drawRange.count!==Infinity||attrs.some(([key,a])=>!['position','uv','uv2'].includes(key)||a.isInterleavedBufferAttribute||a.normalized||a.count!==n||!(a.array instanceof Float32Array)))return false;
  const table=new Map(),first=[],indices=new Uint16Array(n),stride=attrs.reduce((v,[,a])=>v+a.itemSize,0);
  for(let i=0;i<n;i++){
   let key='';for(const [,a] of attrs)for(let j=0;j<a.itemSize;j++){const v=a.array[i*a.itemSize+j];if(!Number.isFinite(v))return false;key+=v+'|';}
   let idx=table.get(key);if(idx===undefined){idx=first.length;table.set(key,idx);first.push(i);}indices[i]=idx;
  }
  // Skip poorly shared batches; do not allocate a larger vertex buffer.
  if(first.length*stride*4+indices.byteLength>n*stride*4*.85)return false;
  for(const [name,a] of attrs){const data=new Float32Array(first.length*a.itemSize);for(let i=0;i<first.length;i++)for(let j=0;j<a.itemSize;j++)data[i*a.itemSize+j]=a.array[first[i]*a.itemSize+j];geo.setAttribute(name,new THREE.BufferAttribute(data,a.itemSize));}
  geo.setIndex(new THREE.BufferAttribute(indices,1));return true;
 }
 function staticMesh(mesh){mesh.updateMatrix();mesh.matrixAutoUpdate=false;return mesh;}
 function canInstance(renderer){return !!(renderer?.capabilities?.isWebGL2||renderer?.extensions?.has?.('ANGLE_instanced_arrays'));}
 // Render-only instances for immutable procedural boxes. Their original meshes
 // stay in obsM with original materials/geometry, bounds and raycast identity.
 function batchBoxes(scene,boxes,renderer){
  if(!canInstance(renderer))return {boxes:0,batches:0};
  const groups=new Map();for(const mesh of boxes){const m=mesh.material,g=mesh.geometry;
   if(mesh.parent!==scene||!mesh.visible||!m?.visible||!m.isMeshLambertMaterial||m.transparent||m.alphaTest||g?.type!=='BoxGeometry'||mesh.children.length||mesh.userData?.breakable)continue;
   const p=g.parameters;if(!p||p.widthSegments!==1||p.heightSegments!==1||p.depthSegments!==1)continue;
   const key=[m.color.getHex(),m.map?.uuid||'',mesh.castShadow,mesh.receiveShadow].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
  }
  let count=0,batches=0;for(const group of groups.values()){
   if(group.length<3)continue;
   const first=group[0],material=first.material.clone(),geometry=new THREE.BoxGeometry(1,1,1),instance=new THREE.InstancedMesh(geometry,material,group.length),matrix=new THREE.Matrix4(),scale=new THREE.Vector3();
   instance.castShadow=first.castShadow;instance.receiveShadow=first.receiveShadow;instance.frustumCulled=false;instance.userData.renderOnly=true;
   group.forEach((mesh,i)=>{const p=mesh.geometry.parameters;scale.set(p.width,p.height,p.depth).multiply(mesh.scale);matrix.compose(mesh.position,mesh.quaternion,scale);instance.setMatrixAt(i,matrix);});instance.instanceMatrix.needsUpdate=true;scene.add(staticMesh(instance));
   for(const mesh of group){mesh.material.visible=false;mesh.castShadow=false;staticMesh(mesh);}count+=group.length;batches++;
  }return {boxes:count,batches};
 }

 function prepareSight(geo){
  const pos=geo.attributes.position,index=geo.index,count=index?index.count:pos?.count;
  if(!pos||pos.itemSize!==3||count<192||count%3)return;
  const blocks=[],v=new THREE.Vector3();
  for(let first=0;first<count;first+=96){
   const end=Math.min(count,first+96),box=new THREE.Box3();
   for(let i=first;i<end;i++)box.expandByPoint(v.fromBufferAttribute(pos,index?index.getX(i):i));
   // Tiny padding makes the broadphase conservative at shared triangle edges.
   box.expandByScalar(1e-5);blocks.push({first,end,box});
  }
  sightBlocks.set(geo,{pos,version:pos.version,index,indexVersion:index?.version,blocks});
 }
 const sightScratch={inverse:new THREE.Matrix4(),ray:new THREE.Ray(),a:new THREE.Vector3(),b:new THREE.Vector3(),c:new THREE.Vector3(),hit:new THREE.Vector3(),sphere:new THREE.Sphere(),hits:[]};
 function occluded(caster,meshes){
  const q=sightScratch;
  for(const obj of meshes){
   const geo=obj.geometry,entry=geo&&sightBlocks.get(geo);
   // Native path for procedural boxes, animated or custom meshes and atypical draw ranges.
   if(!entry||obj.children.length||obj.raycast!==THREE.Mesh.prototype.raycast||obj.material?.side!==THREE.DoubleSide||obj.material===undefined||obj.isSkinnedMesh||geo.index!==entry.index||geo.index?.version!==entry.indexVersion||geo.attributes.position!==entry.pos||entry.version!==entry.pos.version||geo.drawRange.start!==0||geo.drawRange.count!==Infinity||!geo.boundingSphere||!geo.boundingBox){
    q.hits.length=0;caster.intersectObject(obj,true,q.hits);if(q.hits.length){q.hits.length=0;return true;}continue;
   }
   if(!obj.layers.test(caster.layers))continue;
   q.sphere.copy(geo.boundingSphere).applyMatrix4(obj.matrixWorld);
   if(!caster.ray.intersectsSphere(q.sphere))continue;
   q.inverse.copy(obj.matrixWorld).invert();q.ray.copy(caster.ray).applyMatrix4(q.inverse);
   if(!q.ray.intersectsBox(geo.boundingBox))continue;
   for(const block of entry.blocks){
    if(!q.ray.intersectsBox(block.box))continue;
    for(let i=block.first;i<block.end;i+=3){
     const ix=entry.index;q.a.fromBufferAttribute(entry.pos,ix?ix.getX(i):i);q.b.fromBufferAttribute(entry.pos,ix?ix.getX(i+1):i+1);q.c.fromBufferAttribute(entry.pos,ix?ix.getX(i+2):i+2);
     if(!q.ray.intersectTriangle(q.a,q.b,q.c,false,q.hit))continue;
     const d=q.hit.applyMatrix4(obj.matrixWorld).distanceTo(caster.ray.origin);
     if(d>=caster.near&&d<=caster.far)return true;
    }
   }
  }
  return false;
 }

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
  compact(geo);geo.computeBoundingBox();geo.computeBoundingSphere();prepareSight(geo);
  const water=/^[!*]/.test(name),transparent=water||opacity<1;
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map,lightMap:lightmap||null,
   color:map?0xffffff:water?0x477f86:0x9b9586,side:THREE.DoubleSide,
   transparent,opacity:water?Math.min(opacity,.74):opacity,depthWrite:!transparent,alphaTest:name.startsWith('{')?.5:0}));
  mesh.userData.textureName=name;mesh.userData.worldSurface=worldSurface;return staticMesh(mesh);
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
 return {lightmaps,mesh,mountSky,prepareSight,occluded,compact,staticMesh,canInstance,batchBoxes};
})();
