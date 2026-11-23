/* Local multi-pack library. Uses the existing IndexedDB stores so v1 slots migrate
 * atomically; metadata and slot keys cannot collide. No assets leave the device. */
const ModPacks=(()=>{'use strict';
 const DEFAULT='default', key=(pack,slot)=>'slot:'+pack+':'+slot, meta=pack=>'pack:'+pack;
 const validId=id=>id===DEFAULT||/^p-[a-f0-9]{32}$/.test(id);
 const req=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error||Error('Storage read failed'))});
 function create({database,selectionKey,slots,defaultName,normalize=async r=>r,onChange=()=>{}}){
  const allowed=new Set(slots),packs=new Map([[DEFAULT,{id:DEFAULT,name:defaultName,rows:new Map()}]]);
  let db=null,selected=DEFAULT,pending=null,error=null;
  try{const saved=localStorage.getItem(selectionKey);if(validId(saved))selected=saved}catch(_){}
  const current=()=>packs.get(selected)||packs.get(DEFAULT);
  function notify(){onChange();document.dispatchEvent(new Event('blockstrike:mod-packs-change'))}
  function persistSelection(){try{localStorage.setItem(selectionKey,selected)}catch(_){}}
  function write(puts=[],deletes=[]){if(!db)throw Error('Local storage unavailable; '+(error?.message||'retry after closing other tabs'));
   return new Promise((ok,no)=>{const tx=db.transaction('slots','readwrite');tx.oncomplete=ok;tx.onabort=()=>no(tx.error||Error('Storage write failed'));try{const s=tx.objectStore('slots');for(const row of puts)s.put(row);for(const id of deletes)s.delete(id)}catch(e){try{tx.abort()}catch(_){}no(e)}});
  }
  const ready=new Promise((ok,no)=>{if(typeof indexedDB==='undefined')return no(Error('IndexedDB unavailable'));const r=indexedDB.open(database,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('slots'))r.result.createObjectStore('slots',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onblocked=()=>no(Error('Close other game tabs'))}).then(async d=>{
   db=d;db.onversionchange=()=>{db?.close();db=null};
   const all=await req(d.transaction('slots','readonly').objectStore('slots').getAll());
   for(const row of all)if(row.type==='pack'&&validId(row.pack)&&row.id===meta(row.pack)&&typeof row.name==='string')packs.set(row.pack,{id:row.pack,name:row.name,rows:new Map()});
   for(const row of all)if(row.type==='slot'&&packs.has(row.pack)&&allowed.has(row.slot)&&row.id===key(row.pack,row.slot)&&row.record?.id===row.slot)packs.get(row.pack).rows.set(row.slot,await normalize(row.record));
   const puts=[],deletes=[];if(!all.some(r=>r.id===meta(DEFAULT)&&r.type==='pack'))puts.push({id:meta(DEFAULT),type:'pack',pack:DEFAULT,name:defaultName});
   // Copy legacy slots into the default pack. Do not overwrite a migrated slot.
   for(const row of all)if(allowed.has(row.id)){const rows=packs.get(DEFAULT).rows;if(!rows.has(row.id)){const record=await normalize(row);rows.set(row.id,record);puts.push({id:key(DEFAULT,row.id),type:'slot',pack:DEFAULT,slot:row.id,record})}deletes.push(row.id)}
   if(puts.length||deletes.length)await write(puts,deletes);
   if(!packs.has(selected))selected=DEFAULT;persistSelection();notify();
  }).catch(e=>{error=e;db=null;if(!packs.has(selected))selected=DEFAULT;console.warn('Mod library unavailable',database,e)});
  async function exclusive(fn){await ready;if(!db)throw Error('Local mod storage unavailable');if(pending)throw Error('Another mod operation is still running');const pack=current().id;const task=Promise.resolve().then(()=>fn(pack));pending=task;document.dispatchEvent(new Event('blockstrike:pack-busy'));try{return await task}finally{if(pending===task)pending=null;document.dispatchEvent(new Event('blockstrike:pack-busy'))}}
  async function settled(){await ready;if(pending)try{await pending}catch(_){} }
  function select(id){if(pending||!packs.has(id))return false;if(selected!==id){selected=id;persistSelection();notify()}return true}
  function cleanName(value,except){const s=String(value??'').trim();if(!s||s.length>70)throw Error('Enter a pack name (1–70 characters)');if([...packs.values()].some(p=>p.id!==except&&p.name.toLowerCase()===s.toLowerCase()))throw Error('Pack name already exists');return s}
  function createPack(name){return exclusive(async()=>{if(packs.size>=32)throw Error('Maximum 32 packs per library');const label=cleanName(name);const id='p-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');await write([{id:meta(id),type:'pack',pack:id,name:label}]);packs.set(id,{id,name:label,rows:new Map()});selected=id;persistSelection();notify();return id})}
  function renamePack(id,name){return exclusive(async()=>{const p=packs.get(id);if(!p)throw Error('Unknown pack');const label=cleanName(name,id);await write([{id:meta(id),type:'pack',pack:id,name:label}]);p.name=label;notify()})}
  function deletePack(id){return exclusive(async()=>{if(id===DEFAULT)throw Error('Default pack is reserved; restore its slots individually');const p=packs.get(id);if(!p)throw Error('Unknown pack');await write([],[meta(id),...[...p.rows.keys()].map(slot=>key(id,slot))]);packs.delete(id);if(selected===id){selected=DEFAULT;persistSelection()}notify()})}
  async function save(pack,rows,remove=[]){const p=packs.get(pack);if(!p||[...rows.map(r=>r.id),...remove].some(id=>!allowed.has(id)))throw Error('Invalid pack or slot');await write(rows.map(record=>({id:key(pack,record.id),type:'slot',pack,slot:record.id,record})),remove.map(id=>key(pack,id)));for(const row of rows)p.rows.set(row.id,row);for(const id of remove)p.rows.delete(id);notify()}
  return Object.freeze({ready,exclusive,settled,save,select,createPack,renamePack,deletePack,list:()=>[...packs.values()].map(p=>({id:p.id,name:p.name,count:p.rows.size,reserved:p.id===DEFAULT})),get selected(){return current().id},get rows(){return current().rows},get busy(){return !!pending}});
 }
 return Object.freeze({create,DEFAULT});
})();
