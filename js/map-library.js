/* IndexedDB holds source blobs once by hash. Runtime meshes are built on demand. */
const MapLibrary=(()=>{
 const maxLibrary=240*1024*1024;
 let connection;
 const request=req=>new Promise((resolve,reject)=>{
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
 function open(){
  return connection??=new Promise((resolve,reject)=>{
   const req=indexedDB.open('block-strike-goldsrc',1);let blocked=false;
   req.onupgradeneeded=()=>{
    req.result.createObjectStore('maps',{keyPath:'id'});
    req.result.createObjectStore('assets',{keyPath:'key'});
   };
   req.onsuccess=()=>{
    const db=req.result;if(blocked){db.close();return;}
    db.onversionchange=()=>{db.close();connection=null};
    resolve(db);
   };
   req.onerror=()=>{if(!blocked)connection=null;reject(req.error)};
   req.onblocked=()=>{if(blocked)return;blocked=true;connection=null;reject(Error('Close other Block Strike tabs to open map storage.'))};
  });
 }
 async function transaction(mode,work){
  const db=await open(),tx=db.transaction(['maps','assets'],mode);
  const done=new Promise((resolve,reject)=>{
   tx.oncomplete=resolve;
   tx.onabort=()=>reject(tx.error||Error('Map storage transaction cancelled.'));
  });
  try{
   const result=await work(tx.objectStore('maps'),tx.objectStore('assets'));
   await done;
   return result;
  }catch(err){
   try{tx.abort()}catch(_){}
   await done.catch(()=>{});
   throw err;
  }
 }
 async function fingerprint(buffer){
  const bytes=await crypto.subtle.digest('SHA-256',buffer);
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
 }
 async function prune(maps,assets){
  const all=await request(maps.getAll());
  const keys=new Set(all.flatMap(map=>map.files.map(f=>f.key)));
  let retained=0;
  // Blob metadata is inspected without reading its bytes.
  await new Promise((resolve,reject)=>{
   const cursor=assets.openCursor();
   cursor.onerror=()=>reject(cursor.error);
   cursor.onsuccess=()=>{
    const row=cursor.result;
    if(!row){resolve();return}
    if(keys.has(row.primaryKey))retained+=row.value.size??row.value.blob.size;
    else row.delete();
    row.continue();
   };
  });
  if(retained>maxLibrary)throw Error('Map library exceeds 240 MiB. Delete a saved map first.');
 }
 function list(){return transaction('readonly',maps=>request(maps.getAll()))}
 async function save(record,files){
  const refs=[];
  for(const {path,buffer} of files)refs.push({path,key:await fingerprint(buffer),blob:new Blob([buffer])});
  const map={...record,files:refs.map(({path,key})=>({path,key}))};
  await transaction('readwrite',async(maps,assets)=>{
   for(const {key,blob} of refs)await request(assets.put({key,blob,size:blob.size}));
   await request(maps.put(map));
   await prune(maps,assets);
  });
  return map;
 }
 async function load(id){
  const saved=await transaction('readonly',async(maps,assets)=>{
   const map=await request(maps.get(id));
   if(!map)throw Error('Saved map was deleted. Import it again.');
   const files=await Promise.all(map.files.map(async file=>{
    const asset=await request(assets.get(file.key));
    if(!asset)throw Error('Saved map dependency is missing. Import it again.');
    return {path:file.path,blob:asset.blob};
   }));
   return {...map,files};
  });
  return {...saved,files:await Promise.all(saved.files.map(async f=>({path:f.path,buffer:await f.blob.arrayBuffer()})))};
 }
 async function preview(id){
  const saved=await transaction('readonly',async(maps,assets)=>{
   const map=await request(maps.get(id)),file=map?.files.find(f=>f.path===map.report.overview);
   if(!file)return null;
   const asset=await request(assets.get(file.key));
   return asset?{path:file.path,blob:asset.blob}:null;
  });
  if(!saved)return null;
  return LocalMapMedia.preview({path:saved.path,buffer:await saved.blob.arrayBuffer()});
 }
 function remove(id){return transaction('readwrite',async(maps,assets)=>{await request(maps.delete(id));await prune(maps,assets)})}
 function updateReport(id,report){return transaction('readwrite',async(maps)=>{const m=await request(maps.get(id));if(m){m.report=report;await request(maps.put(m))}})}
 return {list,save,load,remove,preview,updateReport};
})();
