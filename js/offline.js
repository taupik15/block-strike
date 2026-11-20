/* Optional explicit download: never touches map-library IndexedDB. */
(()=>{
 const button=document.getElementById('offlinePrepare'),status=document.getElementById('offlineCacheStatus');
 const show=s=>{status.textContent=s};
 if(!('serviceWorker' in navigator)||!window.isSecureContext){show('Offline cache memerlukan HTTPS dan dukungan Service Worker.');button.disabled=true;return;}
 let busy=false,activeClose=null,registration=null;
 const waiting=()=>!!registration?.waiting;
 const updateNotice=()=>{show('Versi baru tersedia. Tutup semua tab game lalu buka kembali.');button.disabled=true};
 function message(type){
  if(waiting()){updateNotice();return;}
  if(activeClose)activeClose();
  const target=navigator.serviceWorker.controller;
  if(!target){show('Cache aplikasi belum aktif. Muat ulang halaman setelah instalasi selesai.');return;}
  const channel=new MessageChannel();busy=type==='OFFLINE_PREPARE';button.disabled=busy;
  let timeout;const close=()=>{clearTimeout(timeout);channel.port1.close();if(activeClose===close)activeClose=null;busy=false;button.disabled=waiting()};activeClose=close;
  const arm=()=>{clearTimeout(timeout);timeout=setTimeout(()=>{close();show('Tidak ada respons cache. Periksa lagi atau ulangi persiapan.');},120000)};
  channel.port1.onmessage=({data:r})=>{if(activeClose!==close)return;arm();if(r.type==='progress'){show(`Menyiapkan aset: ${r.done}/${r.total} (${r.failed} gagal).`);return;}
   close();if(waiting()){updateNotice();return;}if(r.type==='complete'){show(r.done===r.total?'File aplikasi, aset bawaan, dan database YaPB GRAPH tersimpan. Peta impor tetap di penyimpanan lokal; browser dapat menghapus cache.':`File tersimpan ${r.done}/${r.total}. ${r.failed?'Ada unduhan gagal. ':''}Tekan tombol untuk melengkapi.`);}
   else show(r.type==='busy'?'Persiapan sedang berjalan di tab lain.':'Cache gagal: '+(r.message||'unknown error'));
  };
  arm();try{target.postMessage({type},[channel.port2]);}catch(e){close();show('Cache tidak dapat dihubungi.');}
 }
 button.disabled=true;button.addEventListener('click',()=>{if(!busy&&!waiting()){try{navigator.storage?.persist?.().catch(()=>{})}catch(_){}message('OFFLINE_PREPARE')}});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{message('OFFLINE_STATUS')});
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{
  registration=reg;
  reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(waiting()&&!busy)updateNotice()})});
  if(waiting()){updateNotice();return;}
  if(navigator.serviceWorker.controller)message('OFFLINE_STATUS');
  else show('Menyiapkan cache aplikasi. Muat ulang jika belum aktif.');
 }).catch(()=>{show('Cache offline tidak tersedia. Game masih bisa dimainkan online.');button.disabled=true});
})();
