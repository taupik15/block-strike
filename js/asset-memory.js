/* 22F: bounded decoded-audio caches and explicit model ownership. No persistent data is removed. */
const AssetMemory=(()=>{
 const MiB=1024*1024;
 function constrained(){try{return Number(navigator.deviceMemory||4)<=2||(typeof Q!=='undefined'&&Q===-1)}catch(_){return false}}
 const modelWorkers=()=>constrained()?1:4;
 const soundWorkers=()=>constrained()?1:4;
 const audioQueue=[];let audioActive=0;
 function pumpAudio(){while(audioActive<soundWorkers()&&audioQueue.length){const {task,resolve,reject}=audioQueue.shift();audioActive++;Promise.resolve().then(task).then(resolve,reject).finally(()=>{audioActive--;pumpAudio()});}}
 function scheduleAudio(task){return new Promise((resolve,reject)=>{audioQueue.push({task,resolve,reject});pumpAudio()});}
 const builds=[];let activeBuilds=0;
 function pumpBuilds(){while(activeBuilds<(constrained()?1:4)&&builds.length){const job=builds.shift();activeBuilds++;Promise.resolve().then(job.work).then(job.resolve,job.reject).finally(()=>{activeBuilds--;pumpBuilds()})}}
 function build(work){return new Promise((resolve,reject)=>{builds.push({work,resolve,reject});pumpBuilds()})}
 const caches=new Set();
 function audioCache(lowMiB,normalMiB){
  const entries=new Map();let bytes=0;
  const size=b=>Math.max(0,Number(b?.length)||0)*Math.max(1,Number(b?.numberOfChannels)||1)*4;
  function remove(k){const e=entries.get(k);if(e){bytes-=e.bytes;entries.delete(k)}}
  function trim(){const limit=(constrained()?lowMiB:normalMiB)*MiB;for(const [k,e] of entries){if(bytes<=limit)break;if(!e.pending)remove(k)}}
  function touch(k,e){entries.delete(k);entries.set(k,e);return e}
  function get(k){trim();const e=entries.get(k);return e?touch(k,e).buffer:null}
  function set(k,buffer){remove(k);if(!buffer)return buffer;const n=size(buffer);if(n>0&&n<=(constrained()?lowMiB:normalMiB)*MiB){entries.set(k,{buffer,bytes:n,pending:false});bytes+=n;trim()}return buffer}
  function load(k,loader){trim();const old=entries.get(k);if(old){touch(k,old);return old.pending?old.task:Promise.resolve(old.buffer)}
   // Do not start unlimited concurrent decodes on slow devices.
   let pending=0;for(const e of entries.values())if(e.pending)pending++;
   if(pending>=(constrained()?4:12))return Promise.resolve(null);
   const e={pending:true,bytes:0,task:null};entries.set(k,e);
   e.task=scheduleAudio(()=>entries.get(k)===e?loader():null).then(b=>{if(entries.get(k)===e){remove(k);if(b)set(k,b)}return b||null},()=>{if(entries.get(k)===e)remove(k);return null});return e.task;
  }
  function clear(){entries.clear();bytes=0}
  const api={get,set,load,delete:remove,clear,keys:()=>entries.keys(),trim,stats:()=>({bytes,entries:entries.size,pending:[...entries.values()].filter(e=>e.pending).length})};caches.add(api);return api;
 }
 // GLTFLoader's parser keeps decoded buffers, dependency promises and JSON. The
 // game uses only the scene and clips; retaining the parser has no runtime benefit.
 function compact(g){return g?{scene:g.scene,animations:g.animations||[],nativeMdl:g.nativeMdl,report:g.report}:g}
 // Clones share geometry/material/texture. Dispose only clone-owned skeletons.
 function skeletons(root){const set=new Set();root?.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton)set.add(o.skeleton)});for(const s of set)s.dispose()}
 // Source disposal is legal only after all consumers have been detached.
 function releaseSources(models){const geo=new Set(),mat=new Set(),tex=new Set(),bones=new Set();for(const g of new Set(models)){(g?.scene||g)?.traverse?.(o=>{if(o.geometry)geo.add(o.geometry);if(o.skeleton)bones.add(o.skeleton);for(const m of [].concat(o.material||[])){mat.add(m);for(const v of Object.values(m))if(v?.isTexture)tex.add(v)}})}
  for(const set of [geo,mat,tex,bones])for(const v of set)v.dispose();return {geometry:geo.size,materials:mat.size,textures:tex.size,skeletons:bones.size};}
 function stats(){let bytes=0,pending=0;for(const c of caches){const s=c.stats();bytes+=s.bytes;pending+=s.pending}return {bytes,pending,constrained:constrained(),audioActive,audioQueued:audioQueue.length}}
 return Object.freeze({constrained,modelWorkers,soundWorkers,build,scheduleAudio,audioCache,compact,skeletons,releaseSources,stats});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=AssetMemory;
