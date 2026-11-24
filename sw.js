/* AR11.10.22I.3.1 CHARACTER-AI-HANDS: imported PB arms, bot held-weapon axis, auto hop and combat crouch. */
/* AR11.10.22I.2: mod character grounding, voices and actual character previews. */
/* AR11.10.22I.1: startup Phase9 API and import menu scroll hotfix. */
/* AR11.10.22I-FINAL: validated cumulative release; no new gameplay changes. */
/* AR11.10.22H: platform lifecycle, touch menus, immersive APK. */
/* AR11.10.22G: configurable adaptive resolution, character LOD and GPU model preference. */
/* AR11.10.22F: bounded memory caches and match-boundary resource release. */
/* AR11.10.22E: exact bot vision, collision and graph CPU optimizations. */
/* AR11.10.22D: conservative offscreen character pose scheduling and rigid attachment optimization. */
/* AR11.10.22C: conservative static render batching and WebGL1-compatible indexed BSP. */
/* AR11.10.22B-GRAPHICS: graphics presets, bounded cosmetic budgets and 20 FPS. */
/* AR11.10.22A: capability-checked character loaders and rigid humanoid fallback. */
/* AR11.10.21-CHAR4-PACKS: independent local character/voice and weapon packs; atomic legacy migration. */
/* AR11.10.21-CHAR3: generic character and weapon source labels; no changes to import or voice routing. */
/* AR11.10.21-CHAR2-VOICE: source selectors and gender-safe local voice packs. */
/* AR11.10.21-CHAR1: character slots, local voice packs and native hitboxes. */
/* WEAPON.1.2-SNIPER: hidden bot hit proxies restored for bullet traces; sniper crosshair policy; PWA cache rollover. */
/* PWA-FULLSCREEN.1: Android installed PWA landscape fullscreen; refresh manifest cache. */
/* AR11.10.20-WEAPON.1.1-C4: BSP C4 blast scaling, world prop clone, C4 VFX, debug OFF. */
/* AR11.10.20-WEAPON.1: optional local skin importer and included M1887. */
/* AR11.10.19-AUTH.1: economy parity, YaPB shard reuse, cold-start prefetch, offline settings, release QA. */
/* AR11.10.15-COMBAT.1: mobile resume, bounded bullet chains, C4 water separation. */
/* SHIELD.1: original knife+shield and pistol+shield presentation / PWA cache rollover. */
/* MDL.2-MAPS.1: 4 bundled GoldSrc maps, lazy BSP/WAD loading and map selector integration. */
/* AR.11.10.9-MDL.2 fixes GPU skinning (three r128 material.skinning=true), per-model hand mirroring; removes the -0.30 depth hack. */
/* AR.11.10.9-MDL.1 viewmodel near-plane clearance, emergency legacy mode; no gameplay changes. */
/* AR.11.10.9-MDL native GoldSrc v10 viewmodels and offline cache refresh. */
/* AR.11.10.8: team-parity audit and connected bombsite search patrol; no combat or graph balance cheats. */
/* AR.11.10.7: physically verified combat breakables, single active touch joystick, complete original radio asset mapping. */
/* AR.11.10.6: C4 touch discoverability and event-linked team voice parity. */
/* AR.11.10.5: spectator camera eye-height parity with player for BSP/non-BSP maps. */
/* AR.11.10.4 shield reload timing, frontal cover and bot reload visual parity. */
/* AR.11.10.3: explicit in-app update activation, FPS settings and efficient refresh. */
/* AR.11.10.2: Chateau source GRAPH physically validated stairs, safe reverse links, cache upgrade. */
/* AR.11.10.1 Chateau real-BSP live-bot choke recovery; versioned cache refresh. */
/* AR.11.10 cumulative release from deployed AR.11.1. Shell/cache rollover only. */
/* AR.11.9 visual parity: hide released grenade prop, keep hand recoil motion. */
/* AR.11.8 spectator and bot animation parity: refresh offline shell. */
/* AR.11.7 shield presentation audio and grenade transition; trigger PWA update. */
/* AR.11.2 decorative non-solid brushes must not intercept glass shots. */
/* Versioned, project-scoped offline cache. Never caches imported maps or remote URLs. */
importScripts('offline-assets.js');
const scope = self.registration.scope;
const prefix = 'block-strike:' + scope + ':';
const cacheName = prefix + OFFLINE_BUILD;
const absolute = path => new URL(path, scope).href;
const shell = OFFLINE_SHELL.map(absolute);
const assets = OFFLINE_ASSETS.map(absolute);
const allowed = new Set([...shell, ...assets]);
function localKey(url) {
 const u = new URL(url); u.search = ''; u.hash = '';
 return allowed.has(u.href) ? u.href : null;
}
function criticalHash(key){
 const path=key.startsWith(scope)?key.slice(scope.length):'';
 return (typeof OFFLINE_CRITICAL_HASHES!=='undefined'?OFFLINE_CRITICAL_HASHES[path]:null)||(path==='js/bsp-local-nav.js'&&typeof OFFLINE_NAV_SHA256!=='undefined'?OFFLINE_NAV_SHA256:null);
}
async function fetchResource(key) {
 // Request the exact release of the navigation/core pair rather than a stale CDN URL.
 const expected=criticalHash(key),critical=!!expected||['js/bsp-local-nav.js','js/game-core.js','js/runtime-health.js'].some(path=>key===absolute(path));
 const requestURL = critical ? key+'?v='+encodeURIComponent(OFFLINE_BUILD) : key;
 const response = await fetch(requestURL,{cache:'reload',credentials:'same-origin'});
 if (!response.ok || response.status !== 200 || response.redirected ||
     (key !== absolute('index.html') && /text\/html/i.test(response.headers.get('content-type')||''))) throw Error('Resource unavailable: '+key);
 if(expected&&self.crypto?.subtle){
  const digest=new Uint8Array(await self.crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer()));
  if(Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')!==expected)throw Error('Critical module does not match release: '+key+' '+OFFLINE_BUILD);
 }
 return response;
}
async function store(cache,key){
 const response=await fetchResource(key);await cache.put(key,response.clone());return response;
}
// Only immutable-by-content assets may cross a build boundary. Neither shell JS
// nor imported map data participates. An older cache remains usable until activate.
async function migrateAssets(cache) {
 if(typeof OFFLINE_HASHES==='undefined'||!self.crypto?.subtle)return;
 const names=(await caches.keys()).filter(k=>k.startsWith(prefix)&&k!==cacheName);
 const previous=await Promise.all(names.map(async name=>{const old=await caches.open(name);return {old,keys:new Set((await old.keys()).map(r=>r.url))}}));
 const existing=new Set((await cache.keys()).map(r=>r.url));let next=0;
 // Throttle old-cache digest migration on mobile: avoid four parallel large
 // SHA-256 reads competing with the browser and heating the device on update.
 await Promise.all(Array.from({length:2},async()=>{
  while(next<assets.length){const i=next++,key=assets[i];if(existing.has(key))continue;
   for(const {old,keys} of previous){if(!keys.has(key))continue;
    try{const response=await old.match(key);if(!response||response.status!==200||response.redirected)continue;
     const bytes=new Uint8Array(await self.crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer()));
     const hash=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
     if(hash!==OFFLINE_HASHES[i])continue;
     await cache.put(key,response);break;
    }catch(_){/* Optional migration: quota/read errors must not prevent install. */}
   }
  }
 }));
}
async function populate(cache,keys,report=()=>{}) {
 let next=0,done=0,failed=0;
 const existing=new Set((await cache.keys()).map(r=>r.url));
 await Promise.all(Array.from({length:4},async()=>{
  while(next<keys.length){const key=keys[next++];try{if(!existing.has(key))await store(cache,key);done++;}catch(_){failed++;}
   if((done+failed)%20===0||done+failed===keys.length)report({done,failed,total:keys.length});
  }
 }));
 return {done,failed,total:keys.length};
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(cacheName);const result=await populate(cache,shell);
 if(result.failed)throw Error('Offline shell incomplete');
 try{await migrateAssets(cache)}catch(_){/* Re-prepare missing assets after activation. */}
 // Do not skipWaiting: a running round must not mix two builds.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await Promise.all((await caches.keys()).filter(k=>k.startsWith(prefix)&&k!==cacheName).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
async function respond(req,key){
 const cache=await caches.open(cacheName);let response=await cache.match(key);
 const range=req.headers.get('range');
 if(!response){try{response=await fetchResource(key);}catch(e){if(criticalHash(key))throw e;return fetch(req);}try{await cache.put(key,response.clone());}catch(_){/* Quota failure must not break online play. */}}
 if(!range)return response;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return fetch(req);
 const blob=await response.blob(),size=blob.size;
 let first=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 let last=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
 if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first>last||first>=size||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 return new Response(blob.slice(first,last+1),{status:206,headers:{'Content-Type':response.headers.get('content-type')||'application/octet-stream','Content-Length':String(last-first+1),'Content-Range':`bytes ${first}-${last}/${size}`,'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const u=new URL(req.url);let key=localKey(req.url);
 if(req.mode==='navigate'&&(u.href===scope||u.pathname===new URL(scope).pathname&&u.origin===new URL(scope).origin))key=absolute('index.html');
 if(key)event.respondWith(respond(req,key).catch(()=>criticalHash(key)?new Response('Module update incomplete',{status:503}):fetch(req)));
});
let preparing=null;
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){
  // Do not claim another game tab that may still be running the old scripts.
  event.waitUntil((async()=>{
   const port=event.ports?.[0];
   const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true});
   if(tabs.length>1){port?.postMessage({type:'blocked',tabs:tabs.length});return;}
   port?.postMessage({type:'activating'});
   await self.skipWaiting();
  })());return;
 }
 const port=event.ports[0];if(!port||!['OFFLINE_STATUS','OFFLINE_PREPARE'].includes(event.data?.type))return;
 const send=data=>{try{port.postMessage(data)}catch(_){}};
 event.waitUntil((async()=>{
  const cache=await caches.open(cacheName);
  if(event.data.type==='OFFLINE_STATUS'){const keys=new Set((await cache.keys()).map(r=>r.url));send({type:'complete',done:allowed.size-[...allowed].filter(k=>!keys.has(k)).length,total:allowed.size,failed:0});return;}
  if(preparing){send({type:'busy'});return;}
  preparing=populate(cache,[...allowed],result=>send({type:'progress',...result}));
  try{send({type:'complete',...await preparing});}finally{preparing=null;}
 })().catch(e=>send({type:'error',message:String(e.message||e)})));
});
