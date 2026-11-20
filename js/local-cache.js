/* Device-local optional assets; no upload. Bound writes; preserve existing map library. */
const LocalAssetCache=(()=>{
 let pending;
 function open(){return pending??=new Promise((resolve,reject)=>{const r=indexedDB.open('block-strike-local-assets',1);let blocked=false;r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>{const db=r.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();pending=null};resolve(db)};r.onerror=()=>{if(!blocked)pending=null;reject(r.error)};r.onblocked=()=>{if(blocked)return;blocked=true;pending=null;reject(Error('Local storage blocked'))}})}
 async function access(key,value,write=false){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('data',write?'readwrite':'readonly'),s=tx.objectStore('data');let result;const r=write?(value===null?s.delete(key):s.put(value,key)):s.get(key);r.onsuccess=()=>{result=r.result};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error('Storage cancelled'));tx.onerror=()=>reject(tx.error)})}
 return {get:key=>access(key),put:(key,val)=>access(key,val,true),remove:key=>access(key,null,true)};
})();
