/* AR.11.10.3 + SW-UPDATE-FIX: user-triggered Service Worker refresh.
 * Imported BSP/WAD/GRAPH IndexedDB, match options, and local preferences are never cleared.
 * Never call registration.update() when Get Newest Worker would be null.
 * Never force-reload on a failed/no-op check; keep the current game playable. */
(()=>{
 'use strict';
 const button=document.getElementById('offlinePrepare');
 const status=document.getElementById('offlineCacheStatus');
 const refresh=document.getElementById('refreshGameBtn');
 const refreshStatus=document.getElementById('refreshGameStatus');
 const show=s=>{if(status)status.textContent=s};
 const showRefresh=s=>{if(refreshStatus)refreshStatus.textContent=s};
 const SW_URL='./sw.js';
 const SW_SCOPE='./';
 const UPDATE_TIMEOUT_MS=20000;
 const supported='serviceWorker' in navigator && window.isSecureContext;

 if(!supported){
  show('Cache offline memerlukan HTTPS dan Service Worker.');
  if(button)button.disabled=true;
  if(refresh)refresh.addEventListener('click',()=>{
   showRefresh('Service Worker tidak tersedia di browser ini.');
  });
  return;
 }

 let busy=false,refreshing=false,activating=false,activeClose=null,registration=null;

 const waiting=()=>!!registration?.waiting;
 const hasAnyWorker=reg=>!!(reg&&(reg.installing||reg.waiting||reg.active));

 function updateNotice(){
  show('Update game tersedia. Buka menu utama dan pilih Refresh Game untuk memasangnya.');
  if(button)button.disabled=true;
  showRefresh('Update tersedia.');
 }

 function message(type){
  if(waiting()){updateNotice();return;}
  if(activeClose)activeClose();
  const target=navigator.serviceWorker.controller;
  if(!target){show('Cache aplikasi belum aktif. Muat ulang halaman setelah instalasi selesai.');return;}
  const channel=new MessageChannel();busy=type==='OFFLINE_PREPARE';if(button)button.disabled=busy;
  let timeout;
  const close=()=>{clearTimeout(timeout);channel.port1.close();if(activeClose===close)activeClose=null;busy=false;if(button)button.disabled=waiting()};
  activeClose=close;
  const arm=()=>{clearTimeout(timeout);timeout=setTimeout(()=>{close();show('Cache tidak merespons. Coba ulangi persiapan.');},120000)};
  channel.port1.onmessage=({data:r})=>{
   if(activeClose!==close)return;arm();
   if(r.type==='progress'){show(`Menyiapkan aset: ${r.done}/${r.total} (${r.failed} gagal).`);return;}
   close();if(waiting()){updateNotice();return;}
   if(r.type==='complete')show(r.done===r.total?'File aplikasi, aset bawaan, dan database YaPB GRAPH tersimpan. Peta impor tetap aman.':`Cache ${r.done}/${r.total}; ${r.failed||0} gagal. Tekan tombol untuk melengkapi.`);
   else show(r.type==='busy'?'Cache sedang diproses di tab lain.':'Cache gagal: '+(r.message||'unknown error'));
  };
  arm();try{target.postMessage({type},[channel.port2])}catch(_){close();show('Cache tidak dapat dihubungi.')}
 }

 if(button){
  button.disabled=true;
  button.addEventListener('click',()=>{
   if(!busy&&!waiting()&&!refreshing){
    try{navigator.storage?.persist?.().catch(()=>{})}catch(_){}
    message('OFFLINE_PREPARE');
   }
  });
 }

 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  // Only reload when the user explicitly activated a waiting worker.
  if(activating){
   activating=false;
   showRefresh('Update aktif. Memuat versi baru…');
   location.reload();
   return;
  }
  if(!refreshing)message('OFFLINE_STATUS');
 });

 /** Fresh registration lookup. Prefer getRegistration; register only if missing. */
 async function ensureRegistration(){
  let reg=null;
  try{reg=await navigator.serviceWorker.getRegistration(SW_SCOPE)}catch(_){reg=null}
  if(reg){
   registration=reg;
   return reg;
  }
  reg=await navigator.serviceWorker.register(SW_URL,{scope:SW_SCOPE,updateViaCache:'none'});
  registration=reg;
  return reg;
 }

 const registrationPromise=ensureRegistration().then(reg=>{
  registration=reg;
  reg.addEventListener('updatefound',()=>{
   const worker=reg.installing;
   worker?.addEventListener('statechange',()=>{if(waiting()&&!refreshing)updateNotice()});
  });
  if(waiting())updateNotice();
  else if(navigator.serviceWorker.controller)message('OFFLINE_STATUS');
  else show('Menyiapkan cache aplikasi. Muat ulang jika belum aktif.');
  return reg;
 }).catch(error=>{
  show('Cache offline tidak tersedia. Game masih dapat dimainkan online.');
  if(button)button.disabled=true;
  throw error;
 });
 // Avoid an unhandled rejection if the user never presses Refresh Game.
 registrationPromise.catch(()=>{});

 function whenInstalled(reg,worker){
  if(!worker)return Promise.resolve(false);
  if(reg.waiting||worker.state==='installed'||worker.state==='activated')return Promise.resolve(true);
  if(worker.state==='redundant')return Promise.resolve(false);
  return new Promise(resolve=>{
   let timer;
   const finish=ready=>{
    clearTimeout(timer);
    try{worker.removeEventListener('statechange',tick)}catch(_){}
    resolve(ready);
   };
   const tick=()=>{
    if(reg.waiting||worker.state==='installed'||worker.state==='activated')finish(true);
    else if(worker.state==='redundant')finish(false);
   };
   worker.addEventListener('statechange',tick);
   timer=setTimeout(()=>finish(false),180000);
   tick();
  });
 }

 function activate(reg){
  const worker=reg&&reg.waiting;
  if(!worker){
   showRefresh('Tidak ada update yang menunggu aktivasi.');
   return false;
  }
  activating=true;
  showRefresh('Mengaktifkan update. Game akan dimuat ulang…');
  // Prevent a silent no-op if a browser loses the controllerchange event.
  setTimeout(()=>{
   if(activating){
    activating=false;
    refreshing=false;
    if(refresh)refresh.disabled=false;
    showRefresh('Update menunggu aktivasi. Tekan Refresh Game lagi atau muat ulang halaman.');
   }
  },20000);
  const channel=new MessageChannel();
  channel.port1.onmessage=({data})=>{
   channel.port1.close();
   if(data?.type==='blocked'){
    activating=false;refreshing=false;if(refresh)refresh.disabled=false;
    showRefresh(`Ada ${data.tabs} tab game terbuka. Tutup tab BLOCK STRIKE lainnya sebelum mengaktifkan update agar match tidak rusak.`);
   }
  };
  try{worker.postMessage({type:'ACTIVATE_UPDATE'},[channel.port2])}
  catch(error){
   activating=false;refreshing=false;if(refresh)refresh.disabled=false;channel.port1.close();
   showRefresh('Aktivasi update gagal: '+String(error?.message||error).slice(0,90));
  }
  return true;
 }

 function isUpdateStateError(err){
  const msg=String(err?.message||err||'');
  const name=String(err?.name||'');
  return name==='InvalidStateError'
   ||/newestWorker/i.test(msg)
   ||/InvalidStateError/i.test(msg)
   ||/invalid state/i.test(msg)
   ||/null\/nonexistent/i.test(msg)
   ||/Cannot update/i.test(msg)
   ||/nonexistent service worker/i.test(msg);
 }

 async function safeUpdate(reg){
  // Spec: update() rejects when Get Newest Worker is null.
  if(!hasAnyWorker(reg)){
   const err=new Error('Cannot update a null/nonexistent service worker registration');
   err.name='InvalidStateError';
   throw err;
  }
  let timedOut=false;
  const timeout=new Promise((_,reject)=>{
   setTimeout(()=>{timedOut=true;reject(Object.assign(new Error('Update check timed out'),{name:'TimeoutError'}))},UPDATE_TIMEOUT_MS);
  });
  try{
   await Promise.race([reg.update(),timeout]);
  }catch(e){
   if(timedOut)throw Object.assign(new Error('Update check timed out'),{name:'TimeoutError'});
   throw e;
  }
 }

 /**
  * User-triggered update check.
  * - Never calls update() without a worker on the registration.
  * - Never force-reloads on failed/no-op checks (old game stays playable).
  * - Only reloads after the user activates a waiting worker (controllerchange).
  */
 async function checkAndRefresh(){
  if(refreshing||busy)return;
  if(document.body.classList.contains('playing')&&!confirm('Refresh akan mengakhiri match yang sedang berjalan. Lanjutkan?'))return;

  if(navigator.onLine===false){
   // Offline: can still activate a worker that already finished downloading.
   try{
    const reg=await ensureRegistration();
    if(reg.waiting){activate(reg);return;}
   }catch(_){}
   showRefresh('Tidak dapat memeriksa update. Versi game saat ini tetap aman.');
   return;
  }

  refreshing=true;
  if(refresh)refresh.disabled=true;

  try{
   showRefresh('Memeriksa update…');

   // Always resolve a live registration; do not trust a stale closed-over object alone.
   let reg=await ensureRegistration();

   // Waiting worker: update already downloaded — offer activation.
   if(reg.waiting){
    showRefresh('Update tersedia.');
    activate(reg);
    return;
   }

   // Empty registration (no installing/waiting/active): re-register once, never update().
   if(!hasAnyWorker(reg)){
    showRefresh('Memasang Service Worker…');
    try{
     reg=await navigator.serviceWorker.register(SW_URL,{scope:SW_SCOPE,updateViaCache:'none'});
     registration=reg;
    }catch(_){
     showRefresh('Tidak dapat memeriksa update. Versi game saat ini tetap aman.');
     return;
    }
    if(reg.installing){
     const ready=await whenInstalled(reg,reg.installing);
     if(!ready){
      showRefresh('Tidak dapat memeriksa update. Versi game saat ini tetap aman.');
      return;
     }
    }
    // Re-read after install settles.
    try{reg=await navigator.serviceWorker.getRegistration(SW_SCOPE)||reg}catch(_){}
    registration=reg;
    if(reg.waiting){
     showRefresh('Update tersedia.');
     activate(reg);
     return;
    }
    if(!hasAnyWorker(reg)){
     showRefresh('Tidak dapat memeriksa update. Versi game saat ini tetap aman.');
     return;
    }
    // Fresh install completed to active — this is current, not a pending update.
    showRefresh('Game sudah menggunakan versi terbaru.');
    return;
   }

   // Safe path: registration has at least one worker → update() is legal per spec.
   try{
    await safeUpdate(reg);
   }catch(updateErr){
    if(isUpdateStateError(updateErr)||updateErr?.name==='TimeoutError'){
     showRefresh('Tidak dapat memeriksa update. Versi game saat ini tetap aman.');
     return;
    }
    throw updateErr;
   }

   // Refresh registration object after update() — installing may have appeared.
   try{reg=await navigator.serviceWorker.getRegistration(SW_SCOPE)||reg}catch(_){}
   registration=reg;

   if(reg.waiting){
    showRefresh('Update tersedia.');
    activate(reg);
    return;
   }

   if(reg.installing){
    showRefresh('Update tersedia.');
    const ready=await whenInstalled(reg,reg.installing);
    if(!ready){
     showRefresh('Tidak dapat memeriksa update. Versi game saat ini tetap aman.');
     return;
    }
    // Safari can lag registration.waiting behind worker.state === 'installed'.
    if(reg.installing&&reg.installing.state==='installed'&&!reg.waiting){
     await new Promise(r=>setTimeout(r,100));
    }
    try{reg=await navigator.serviceWorker.getRegistration(SW_SCOPE)||reg}catch(_){}
    registration=reg;
    if(reg.waiting){
     showRefresh('Update tersedia.');
     activate(reg);
     return;
    }
   }

   // update() completed and no waiting worker → already on latest.
   showRefresh('Game sudah menggunakan versi terbaru.');
  }catch(error){
   if(isUpdateStateError(error)){
    showRefresh('Tidak dapat memeriksa update. Versi game saat ini tetap aman.');
   }else{
    showRefresh('Tidak dapat memeriksa update. Versi game saat ini tetap aman.');
   }
  }finally{
   if(!activating){
    refreshing=false;
    if(refresh)refresh.disabled=false;
   }
  }
 }

 if(refresh?.addEventListener)refresh.addEventListener('click',()=>{void checkAndRefresh()});
})();
