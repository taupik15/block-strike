/* Shared, immutable WAD3 source chunks. Only required miptexture lumps are
 * copied into map parsing; the service worker caches packs for offline play.
 * Non-miptexture entries (including decals) remain in the original WAD bytes. */
const GlobalWads=(()=>{
 const BASE='assets/wad/',CHUNK=4*1024*1024,MAX_INDEX=2*1024*1024,MAX_WAD=64*1024*1024;
 let indexPromise;
 const key=p=>String(p).replaceAll('\\','/').split('/').at(-1).toLowerCase();
 const owns=(obj,k)=>Object.prototype.hasOwnProperty.call(obj,k);
 const validHash=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
 async function fetchOnce(path,max,timeout){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
   const r=await fetch(BASE+path,{signal:ctrl.signal,credentials:'same-origin'});
   if(!r.ok||r.redirected||/text\/html/i.test(r.headers.get('content-type')||''))throw Error('Local WAD unavailable: '+path);
   if(Number(r.headers.get('content-length'))>max)throw Error('Local WAD exceeds size limit');
   // Bound streamed responses even if Content-Length is absent.
   if(!r.body){const b=await r.arrayBuffer();if(b.byteLength>max)throw Error('Local WAD exceeds size limit');return b}
   const reader=r.body.getReader(),parts=[];let length=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>max)throw Error('Local WAD exceeds size limit');parts.push(value)}}finally{reader.cancel().catch(()=>{})}
   const out=new Uint8Array(length);let off=0;for(const p of parts){out.set(p,off);off+=p.length}return out.buffer;
  }finally{clearTimeout(timer)}
 }
 async function localFetch(path,max){try{return await fetchOnce(path,max,15000)}catch(e){if(e.name!=='AbortError'&&e.name!=='TypeError')throw e;return fetchOnce(path,max,30000)}}
 async function digest(b){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('')}
 async function index(){return indexPromise??=localFetch('index.json',MAX_INDEX).then(b=>{
  const x=JSON.parse(new TextDecoder().decode(b));
  if(x.version!==1||x.chunkSize!==CHUNK||!Array.isArray(x.packs)||x.packs.length>128||!x.wads||typeof x.wads!=='object'||Object.keys(x.wads).length>64)throw Error('Invalid global WAD index');
  if(x.packs.some(p=>!p||!Number.isSafeInteger(p.size)||p.size<1||p.size>CHUNK||!validHash(p.sha256)))throw Error('Invalid global WAD pack');
  for(const [n,w] of Object.entries(x.wads)){
   if(!/^[a-z0-9_.-]+\.wad$/.test(n)||!Number.isSafeInteger(w.size)||w.size<12||w.size>MAX_WAD||!Array.isArray(w.packs)||w.packs.length!==Math.ceil(w.size/CHUNK)||!w.textures||typeof w.textures!=='object')throw Error('Invalid global WAD entry');
   if(w.packs.some((p,i)=>!Number.isSafeInteger(p)||x.packs[p]?.size!==Math.min(CHUNK,w.size-i*CHUNK)))throw Error('Invalid global WAD chunk');
  }
  return x;
 }).catch(e=>{indexPromise=null;throw e})}
 // Precedence: map-declared WADs (last declaration wins, as local importer),
 // same-name map WAD, then unambiguous identical/unique global texture.
 function candidates(db,name,declared,mapName){
  const preferred=[...new Set([...declared].reverse().map(key).concat(key(mapName)+'.wad'))].filter(n=>owns(db.wads,n)&&owns(db.wads[n].textures,name));
  if(preferred.length)return preferred;
  const matches=Object.keys(db.wads).filter(n=>owns(db.wads[n].textures,name));
  return matches.length&&matches.every(n=>db.wads[n].textures[name][2]===db.wads[matches[0]].textures[name][2])?matches:[];
 }
 async function resolve(wanted,declared=[],mapName='',issues=[]){
  const result=new Map(),used=new Set();if(!wanted.length)return {textures:result,used};
  let db;try{db=await index()}catch(e){issues.push('Global WAD index: '+e.message);return {textures:result,used}}
  // Group work by pack so every chunk is fetched at most once per resolve.
  const jobs=new Map();let total=0;
  for(const name of new Set(wanted)){
   const list=candidates(db,name,declared,mapName);if(!list.length)continue;
   const wad=list[0],w=db.wads[wad],r=w.textures[name];
   if(!Array.isArray(r)||r.length!==3||!Number.isSafeInteger(r[0])||!Number.isSafeInteger(r[1])||r[0]<12||r[1]<40||r[1]>2*1024*1024||r[0]+r[1]>w.size||!validHash(r[2])){issues.push('Invalid global texture: '+name);continue}
   if(total+r[1]>32*1024*1024){issues.push('Global WAD texture memory budget reached');break}total+=r[1];
   const job={name,wad,bytes:new Uint8Array(r[1]),hash:r[2],remaining:0,failed:false};
   let pos=r[0],dst=0;while(dst<r[1]){const part=Math.floor(pos/CHUNK),off=pos%CHUNK,id=w.packs[part],length=Math.min(r[1]-dst,db.packs[id].size-off);if(!jobs.has(id))jobs.set(id,[]);jobs.get(id).push({job,off,dst,length});job.remaining++;pos+=length;dst+=length}
  }
  for(const [id,parts] of jobs){
   try{
    const meta=db.packs[id],buf=await localFetch('pack-'+String(id).padStart(3,'0')+'.bin',CHUNK);
    if(buf.byteLength!==meta.size||await digest(buf)!==meta.sha256)throw Error('Local WAD pack integrity mismatch: '+id);
    for(const {job,off,dst,length} of parts){job.bytes.set(new Uint8Array(buf,off,length),dst);if(--job.remaining===0&&!job.failed){
     const view=new DataView(job.bytes.buffer);if(await digest(job.bytes)!==job.hash||!LocalBSP.validWadTexture(view,job.name)){issues.push('Invalid global texture: '+job.name);continue}
     result.set(job.name,view);used.add(job.wad);
    }}
   }catch(e){for(const {job} of parts)job.failed=true;issues.push('Global WAD pack: '+e.message)}
  }
  return {textures:result,used};
 }
 return {resolve};
})();
