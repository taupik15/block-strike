/* Tahap 14E: suppress native touch gestures on gameplay ONLY.
   Overlay buttons, inputs and scroll containers keep their normal behavior. */
const Phase14E=(()=>{
 'use strict';
 const SELECTOR='#pad,#c,#fire,#ads,#jump,#swap,#rel,#crouchBtn,#walkBtn,#grenadeBtn,#spectatorMove';
 const menuSelector='input,select,textarea,[contenteditable],.screen,.overlay,#radioOverlay,#scoreboard,#controlEditor,#teamOverlay,#weaponOverlay,#pickupPrompt';
 function isGameplayTarget(target){
  if(!document.body.classList.contains('playing'))return false;
  if(!(target instanceof Element))return false;
  if(target.closest(menuSelector))return false;
  return !!target.closest(SELECTOR);
 }
 function installFullscreen(doc,win){
  const button=doc.getElementById('fullscreenToggle'),status=doc.getElementById('fullscreenStatus');
  if(!button||!status)return;
  const root=doc.documentElement;
  const native=()=>String(win.navigator.userAgent||'').includes('BlockStrikeAndroid/');
  const mode=name=>!!win.matchMedia?.('(display-mode: '+name+')').matches;
  const standalone=()=>native()||win.navigator.standalone===true||mode('standalone')||mode('fullscreen')&&!active();
  const active=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement);
  const request=root.requestFullscreen||root.webkitRequestFullscreen;
  const exit=doc.exitFullscreen||doc.webkitExitFullscreen;
  const supported=()=>typeof request==='function'&&(root.requestFullscreen?doc.fullscreenEnabled!==false:doc.webkitFullscreenEnabled!==false);
  function sync(){
   const installed=standalone(),on=active();
   button.disabled=installed||(!on&&!supported())||(on&&typeof exit!=='function');
   button.textContent=installed?'Fullscreen app':on?'Exit fullscreen':'Enter fullscreen';
   status.textContent=native()?'Android APK: immersive fullscreen is managed by the app.':installed?'Installed app: browser tabs are hidden. Rotate your device to landscape.':on?'Fullscreen active.':supported()?'Fullscreen hides browser controls where supported.':'Use Add to Home Screen / Install app if available, then open in landscape.';
  }
  button.addEventListener('click',async()=>{
   if(button.disabled)return;
   try{
    if(active())await exit.call(doc);
    else await request.call(root);
    sync();
   }catch(_){sync();status.textContent='Fullscreen unavailable or denied. Use Add to Home Screen / Install app if available.';}
  });
  for(const type of ['fullscreenchange','webkitfullscreenchange'])doc.addEventListener(type,sync);
  win.addEventListener('pageshow',sync);
  for(const name of ['standalone','fullscreen']){const media=win.matchMedia?.('(display-mode: '+name+')');if(media?.addEventListener)media.addEventListener('change',sync);else media?.addListener?.(sync);}
  sync();
 }
 function install(doc){
  installFullscreen(doc,window);
  // Safari fires gesture events for pinch on some versions despite touch-action.
  for(const evt of ['gesturestart','gesturechange','gestureend'])doc.addEventListener(evt,e=>{
   if(doc.body.classList.contains('playing')&&!e.target?.closest?.(menuSelector))e.preventDefault();
  },{passive:false});
  for(const evt of ['contextmenu','selectstart','dragstart','dblclick'])doc.addEventListener(evt,e=>{
   if(isGameplayTarget(e.target))e.preventDefault();
  });
  // Prevent native long-press selection and double-tap zoom on the gameplay surface.
  // Do NOT prevent default in scrollable radio/buy/settings/scoreboard overlays.
  // Modern Safari uses Pointer Events and CSS touch-action on the game surface.
  // Cancelling every legacy touch event suppresses secondary-finger clicks.
  if(!('PointerEvent' in window))for(const evt of ['touchstart','touchmove','touchend'])doc.addEventListener(evt,e=>{
   if(isGameplayTarget(e.target))e.preventDefault();
  },{passive:false});
 }
 return Object.freeze({install,isGameplayTarget,installFullscreen});
})();
