/* YaPB GRAPH v1/v2 / ULZ. Format references: yapb/yapb inc/graph.h, src/storage.cpp;
 * yapb/ystl ystl/ulz.h (Unlicense). Remote database CC BY-SA 4.0; author retained.
 *
 * Offline-first policy (Block Strike):
 * - bundled() reads assets/yapb-graph/ (index + pack shards) for classic maps.
 * - download() still exists for opt-in / debug (window.BLOCK_STRIKE_YAPB_ONLINE).
 * - Custom/imported maps should ship .graph/.pwf alongside the BSP; do not rely
 *   on the public GitHub graph DB (most custom maps are absent → 404).
 */
const YaPBWaypoints=(()=>{
 const MAX=2*1024*1024,BASE='https://raw.githubusercontent.com/yapb/graph/refs/heads/master/graph/';
 // Built-in GoldSrc maps shipped with the game (see js/bundled-maps.js).
 const BUILTIN_MAPS=new Set(['de_dust','de_chateau','de_aztec','de_luxville']);
 function ulz(input,size){
  if(!Number.isInteger(size)||size<0||size>MAX)throw Error('ULZ output exceeds limit');
  const out=new Uint8Array(size);let i=0,o=0;
  const byte=()=>{if(i>=input.length)throw Error('Truncated ULZ');return input[i++]};
  function variable(){let n=0;for(let s=0;s<=28;s+=7){const b=byte();n+=b*2**s;if(n>MAX)throw Error('ULZ length exceeds budget');if(b<128)return n}throw Error('Invalid ULZ length')}
  while(i<input.length){const token=byte();let run=token>>>5;if(run===7)run+=variable();
   if(i+run>input.length||o+run>size)throw Error('Invalid ULZ literal run');out.set(input.subarray(i,i+run),o);i+=run;o+=run;if(i===input.length&&run)break;
   let n=(token&15)+4;if(n===19)n+=variable();const d=((token&16)<<12)+byte()+256*byte();
   if(!d||d>o||o+n>size)throw Error('Invalid ULZ backreference');while(n--){out[o]=out[o-d];o++}
  }if(o!==size)throw Error('ULZ size mismatch');return out;
 }
 function decode(buffer,bspSize){
  const d=new DataView(buffer);if(d.byteLength<24||d.byteLength>MAX)throw Error('Invalid GRAPH length');
  const [magic,version,options,count,compressed,raw]=Array.from({length:6},(_,i)=>d.getUint32(i*4,true));
  if(![0x59415042,0x544f4255].includes(magic)||![1,2].includes(version)||!count||count>4096||raw!==count*220||!compressed||24+compressed>d.byteLength)throw Error('Unsupported GRAPH header');
  const tail=24+compressed,decoder=new TextDecoder();let author='',modified='',mapSize=0;
  if(options&64){
   const length=d.byteLength-tail;
   const str=p=>decoder.decode(new Uint8Array(buffer,p,32)).split('\0')[0];
   // Legacy v1 stores author + modifier; v2 adds the BSP byte size.
   // Some v1/v2 files have BSP size but omit the optional modifier.
   const legacy=version===1&&(length===32||length===64);
   const sized=(length===36||length===68);
   if(!legacy&&!sized)throw Error('Unsupported or truncated GRAPH author record');
   author=str(tail);
   if(sized){mapSize=d.getInt32(tail+32,true);if(mapSize<0||mapSize>0&&mapSize!==bspSize)throw Error('GRAPH BSP size mismatch');if(length===68)modified=str(tail+36)}
   else if(length===64)modified=str(tail+32);
  }
  const bytes=ulz(new Uint8Array(buffer,24,compressed),raw),v=new DataView(bytes.buffer);
  const nodes=Array.from({length:count},(_,id)=>{const p=id*220;if(v.getInt32(p,true)!==id)throw Error('GRAPH index mismatch');const h=[8,12,16].map(x=>v.getFloat32(p+x,true));if(!h.every(x=>Number.isFinite(x)&&Math.abs(x)<32768))throw Error('GRAPH invalid coordinate');const flags=v.getInt32(p+4,true),edges=[],jumps=new Set(),links=[];for(let k=0;k<8;k++){const q=p+56+k*20,idx=v.getInt16(q+18,true),f=v.getUint16(q+16,true);if(idx>=0&&idx<count&&idx!==id&&!(f&~1)){edges.push(idx);if(f&1)jumps.add(idx);const velocity=[0,4,8].map(o=>v.getFloat32(q+o,true)),distance=v.getInt32(q+12,true);links.push({to:idx,flags:f,distance:distance>=0?distance:null,velocity:velocity.every(Number.isFinite)?velocity:null})}}const camp=!!(flags&128),campLooks=camp?[20,32].map(o=>[v.getFloat32(p+o,true),v.getFloat32(p+o+4,true)]).filter(a=>a.every(x=>Number.isFinite(x)&&Math.abs(x)<=360)):[];const radius=v.getFloat32(p+44,true),light=v.getFloat32(p+48,true),display=v.getFloat32(p+52,true);return {id,h,flags,valid:flags!==-1,radius:Number.isFinite(radius)&&radius>=0?radius:null,light:Number.isFinite(light)?light:null,display:Number.isFinite(display)?display:null,links,edges:[...new Set(edges)],jumps,narrow:!!(flags&1024),sniper:!!(flags&(1<<28)),crouch:!!(flags&4),ladder:!!(flags&32),camp,campLooks}});
  return {nodes,author,modified,mapSize,version};
 }
 async function download(name){
  // Opt-in remote only. Prefer bundled() or an imported .graph for production.
  if(!/^[a-z0-9_][a-z0-9_.-]{0,99}$/i.test(name))throw Error('Invalid map name for remote lookup');
  const url=BASE+encodeURIComponent(name.toLowerCase())+'.graph';
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),5500);
  try{
   const r=await fetch(url,{signal:ctrl.signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!r.ok)throw Error('YaPB HTTP '+r.status);
   const size=Number(r.headers.get('content-length'));
   if(size>MAX)throw Error('GRAPH too large');
   if(!r.body){const b=await r.arrayBuffer();if(b.byteLength>MAX)throw Error('GRAPH too large');return b}
   const reader=r.body.getReader(),parts=[];let total=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX)throw Error('GRAPH exceeds download limit');parts.push(value)}}
   finally{reader.cancel().catch(()=>{})}
   const out=new Uint8Array(total);let off=0;for(const p of parts){out.set(p,off);off+=p.length}
   return out.buffer;
  }finally{clearTimeout(timer)}
 }
 async function hasBundled(name){
  if(typeof name!=='string'||!name)return false;
  try{
   const index=await (indexPromise??=localFetch('index.json',2*1024*1024,true).then(x=>{
    if(x.version!==1||!Array.isArray(x.sizes)||!x.maps||typeof x.maps!=='object')throw Error('Invalid bundled GRAPH index');return x;
   }).catch(e=>{indexPromise=null;throw e}));
   return Object.prototype.hasOwnProperty.call(index.maps,name.toLowerCase());
  }catch(_){return false}
 }
 // Bundled CC BY-SA database. Only the index and one compressed shard are read
 // per lookup; no bulk graph expansion or writes to the imported map library.
 const DB='assets/yapb-graph/',SHARD_MAX=4*1024*1024;
 let indexPromise;
 const shardCache=new Map(),MAX_RESIDENT_SHARDS=2;
 function shardOnce(shard,size){
  if(shardCache.has(shard)){
   const p=shardCache.get(shard);shardCache.delete(shard);shardCache.set(shard,p);return p;
  }
  const path='pack-'+String(shard).padStart(3,'0')+'.bin';
  const pending=localFetch(path,SHARD_MAX).then(pack=>{
   if(pack.byteLength!==size)throw Error('Truncated bundled GRAPH shard');
   return pack;
  }).catch(error=>{if(shardCache.get(shard)===pending)shardCache.delete(shard);throw error});
  shardCache.set(shard,pending);
  while(shardCache.size>MAX_RESIDENT_SHARDS)shardCache.delete(shardCache.keys().next().value);
  return pending;
 }

 async function localFetchOnce(path,limit,json,timeout){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{const r=await fetch(DB+path,{signal:ctrl.signal,credentials:'same-origin'});
   if(!r.ok||r.redirected||/text\/html/i.test(r.headers.get('content-type')||''))throw Error('Bundled GRAPH unavailable (HTTP '+r.status+')');
   const size=Number(r.headers.get('content-length'));if(size>limit)throw Error('Bundled GRAPH exceeds limit');
   const buf=await r.arrayBuffer();if(buf.byteLength>limit)throw Error('Bundled GRAPH exceeds limit');
   return json?JSON.parse(new TextDecoder().decode(buf)):buf;
  }finally{clearTimeout(timer)}
 }
 async function localFetch(path,limit,json=false){
  try{return await localFetchOnce(path,limit,json,15000)}catch(e){
   if(e.name!=='AbortError'&&e.name!=='TypeError')throw e;
   try{return await localFetchOnce(path,limit,json,30000)}catch(retry){if(retry.name==='AbortError')throw Error('Local GRAPH request timed out after retry');throw retry;}
  }
 }
 async function bundled(name){
  if(typeof name!=='string'||!name||name.length>255||/[\\/\x00-\x1f]/.test(name))return null;
  const index=await (indexPromise??=localFetch('index.json',2*1024*1024,true).then(x=>{
   if(x.version!==1||!Array.isArray(x.sizes)||!x.maps||typeof x.maps!=='object')throw Error('Invalid bundled GRAPH index');return x;
  }).catch(e=>{indexPromise=null;throw e}));
  const key=name.toLowerCase();if(!Object.prototype.hasOwnProperty.call(index.maps,key))return null;
  const entry=index.maps[key];if(!Array.isArray(entry)||entry.length!==4||!entry.every(Number.isSafeInteger))throw Error('Invalid bundled GRAPH entry');
  const [shard,offset,length,raw]=entry,size=index.sizes[shard];
  if(shard<0||shard>=index.sizes.length||!Number.isSafeInteger(size)||size<1||size>SHARD_MAX||offset<0||length<1||offset+length>size||raw<24||raw>MAX)throw Error('Invalid bundled GRAPH range');
  const pack=await shardOnce(shard,size);
  const out=new Uint8Array(raw);let written=0;const inflater=new pako.Inflate({raw:true,chunkSize:32768});
  inflater.onData=chunk=>{if(written+chunk.length>raw)throw Error('Bundled GRAPH inflate exceeds limit');out.set(chunk,written);written+=chunk.length};
  inflater.push(new Uint8Array(pack,offset,length),true);
  if(inflater.err||!inflater.ended||written!==raw)throw Error('Invalid bundled GRAPH compression');
  return out.buffer;
 }
 return {ulz,decode,download,bundled,hasBundled,BUILTIN_MAPS};
})();
