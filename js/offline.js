/* AR.11.10.3: user-triggered Service Worker refresh. Imported BSP/WAD/GRAPH
 * IndexedDB, match options, and local preferences are never cleared. */
(()=>{
 'use strict';
 const button=document.getElementById('offlinePrepare');
 const status=document.getElementById('offlineCacheStatus');
 const refresh=document.getElementById('refreshGameBtn');
 const refreshStatus=document.getElementById('refreshGameStatus');
 const show=s=>{if(status)status.textContent=s};
 const showRefresh=s=>{if(refreshStatus)refreshStatus.textContent=s};
 const supported='serviceWorker' in navigator && window.isSecureContext;
 if(!supported){
  show('Cache offline memerlukan HTTPS dan Service Worker.');
  if(button)button.disabled=true;
  if(refresh)refresh.addEventListener('click',()=>{showRefresh('Service Worker unavailable; reloading the current page.');location.reload()});
  return;
 }
 let busy=false,refreshing=false,activating=false,activeClose=null,registration=null;
 const waiting=()=>!!registration?.waiting;
 function updateNotice(){
  show('Update game tersedia. Buka menu utama dan pilih Refresh Game untuk memasangnya.');
  if(button)button.disabled=true;
  showRefresh('Versi baru siap. Tekan Refresh Game untuk memasang.');
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
 if(button){button.disabled=true;button.addEventListener('click',()=>{if(!busy&&!waiting()&&!refreshing){try{navigator.storage?.persist?.().catch(()=>{})}catch(_){}message('OFFLINE_PREPARE')}});}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(activating){activating=false;showRefresh('Update aktif. Memuat versi baru…');location.reload();return;}
  if(!refreshing)message('OFFLINE_STATUS');
 });
 const registrationPromise=navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{
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
  if(reg.waiting)return Promise.resolve(true);
  return new Promise(resolve=>{
   let timer;
   const finish=ready=>{clearTimeout(timer);worker.removeEventListener('statechange',tick);resolve(ready)};
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
  const worker=reg.waiting;
  if(!worker)return false;
  activating=true;
  showRefresh('Mengaktifkan update. Game akan dimuat ulang…');
  // Prevent a silent no-op if a browser loses the controllerchange event.
  setTimeout(()=>{if(activating){activating=false;refreshing=false;refresh.disabled=false;showRefresh('Update menunggu aktivasi. Tekan Refresh Game lagi atau muat ulang halaman.')}},20000);
  const channel=new MessageChannel();
  channel.port1.onmessage=({data})=>{
   channel.port1.close();
   if(data?.type==='blocked'){
    activating=false;refreshing=false;refresh.disabled=false;
    showRefresh(`Ada ${data.tabs} tab game terbuka. Tutup tab BLOCK STRIKE lainnya sebelum mengaktifkan update agar match tidak rusak.`);
   }
  };
  try{worker.postMessage({type:'ACTIVATE_UPDATE'},[channel.port2])}
  catch(error){activating=false;refreshing=false;refresh.disabled=false;channel.port1.close();showRefresh('Aktivasi update gagal: '+String(error?.message||error).slice(0,90));}
  return true;
 }
 async function checkAndRefresh(){
  if(refreshing||busy)return;
  // Refreshing an active/paused match is destructive. Ask BEFORE asynchronous work.
  if(document.body.classList.contains('playing')&&!confirm('Refresh akan mengakhiri match yang sedang berjalan. Lanjutkan?'))return;
  if(navigator.onLine===false&&!registration?.waiting){showRefresh('Offline: versi baru tidak bisa diperiksa. Game saat ini tetap bisa dimainkan.');return;}
  refreshing=true;refresh.disabled=true;
  try{
   showRefresh('Memeriksa versi terbaru dari GitHub Pages…');
   const reg=await registrationPromise;
   if(reg.waiting){activate(reg);return;}
   // update() bypasses ordinary HTTP cache for the worker and its imports.
   await reg.update();
   const installing=reg.installing;
   if(installing){
    showRefresh('Versi baru ditemukan. Menyiapkan file aplikasi…');
    const ready=await whenInstalled(reg,installing);
    if(!ready){showRefresh('Update belum siap. Cek koneksi atau penyimpanan, lalu coba lagi.');return;}
    // A Safari statechange can precede the registration.waiting getter update.
    if(installing.state==='installed'&&!reg.waiting)await new Promise(resolve=>setTimeout(resolve,80));
   }
   if(reg.waiting){activate(reg);return;}
   // A first install may become active without a previous controller.
   showRefresh('Tidak ada versi baru. Refresh game sekarang…');
   location.reload();
  }catch(error){
   showRefresh('Gagal memeriksa update: '+String(error?.message||error).slice(0,120)+'. Game lama tetap aman.');
  }finally{
   if(!activating){refreshing=false;refresh.disabled=false;}
  }
 }
 if(refresh?.addEventListener)refresh.addEventListener('click',()=>{void checkAndRefresh()});
})();
