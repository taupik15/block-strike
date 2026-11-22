/* AR.11.10.9: shared first-person and spectator perspective profile.
 * Camera FOVs in Three.js are VERTICAL. The 4:3 reference is GoldSrc 90° horizontal.
 * Hor+ is retained up to a bounded 108° horizontal on extra-wide screens; this
 * avoids the wide-angle/tiny-room look on an 844x390 landscape phone.
 * World geometry, physics, movement hulls and per-weapon calibration are untouched.
 */
const CAMERA_PROFILE=(()=>{
 'use strict';
 const rad=Math.PI/180,refAspect=4/3;
 const refVertical=2*Math.atan(Math.tan(90*rad/2)/refAspect)/rad;
 const values=Object.freeze({
  worldVerticalFov:refVertical, referenceAspect:refAspect,
  aspectHandling:'Hor+ with 108 degree horizontal cap',maxWideHorizontalFov:108,
  worldNear:.05,worldFar:150,viewmodelNear:.01,viewmodelFar:10,
  standingHullHeight:72,crouchingHullHeight:36,
  eyeHeightStanding:64,eyeHeightCrouch:28,
  crouchLerpSpeed:18,
  viewmodelFov:65,viewmodelGlobalOffset:Object.freeze([0,0,0])
 });
 // Debug overrides live only in memory, and only with ?cameraDebug=1.
 const debugEnabled=(()=>{try{return new URLSearchParams(location.search).get('cameraDebug')==='1'}catch(_){return false}})();
 let debugWorldFov=null,debugViewmodelFovShift=0;
 let debugViewmodelOffset=[0,0,0];
 const validAspect=a=>Number.isFinite(a)&&a>.1?a:refAspect;
 function verticalFromHorizontal(horizontal,aspect){return 2*Math.atan(Math.tan(horizontal*rad/2)/validAspect(aspect))/rad}
 function horizontalFromVertical(vertical,aspect){return 2*Math.atan(Math.tan(vertical*rad/2)*validAspect(aspect))/rad}
 function worldFov(aspect){
  if(debugWorldFov!=null)return debugWorldFov;
  const a=validAspect(aspect);
  return a>refAspect?Math.min(values.worldVerticalFov,verticalFromHorizontal(values.maxWideHorizontalFov,a)):values.worldVerticalFov;
 }
 function eyeHeight(col,crouchBlend){
  const blend=Math.min(1,Math.max(0,Number(crouchBlend)||0));
  const k=col?.T?.k;
  if(Number.isFinite(k)&&k>0){
   const stand=values.eyeHeightStanding-values.standingHullHeight/2;
   const crouch=values.eyeHeightCrouch-values.crouchingHullHeight/2;
   return (stand+(crouch-stand)*blend)*k;
  }
  // Keep the established non-BSP layout actor camera (feet-based origin).
  return 1.6-.63*blend;
 }
 function blendCrouch(current,wanted,dt){
  const target=wanted?1:0;
  return current+(target-current)*(1-Math.exp(-values.crouchLerpSpeed*Math.max(0,dt||0)));
 }
 function getViewmodelFov(calibrated){return Math.min(100,Math.max(20,(Number.isFinite(calibrated)?calibrated:values.viewmodelFov)+debugViewmodelFovShift))}
 function viewmodelOffset(){return debugViewmodelOffset}
 function setDebug(next){
  if(!debugEnabled)return false;
  if(Object.hasOwn(next,'worldFov'))debugWorldFov=next.worldFov==null?null:Math.max(55,Math.min(90,Number(next.worldFov)||values.worldVerticalFov));
  if(Object.hasOwn(next,'viewmodelFovShift'))debugViewmodelFovShift=Math.max(-10,Math.min(10,Number(next.viewmodelFovShift)||0));
  if(Array.isArray(next.viewmodelOffset)&&next.viewmodelOffset.length===3)debugViewmodelOffset=next.viewmodelOffset.map(n=>Math.max(-.12,Math.min(.12,Number(n)||0)));
  return true;
 }
 function resetDebug(){return setDebug({worldFov:null,viewmodelFovShift:0,viewmodelOffset:[0,0,0]})}
 return Object.freeze({...values,verticalFromHorizontal,horizontalFromVertical,worldFov,eyeHeight,blendCrouch,getViewmodelFov,viewmodelOffset,setDebug,resetDebug,
  get debugEnabled(){return debugEnabled},get debugWorldFov(){return debugWorldFov},get debugViewmodelFovShift(){return debugViewmodelFovShift}});
})();

/* Nothing is mounted for ordinary players. Query flag is explicit developer QA.
 * This is a DOM overlay, not a WebGL pass. No per-frame timers are created.
 */
const CameraDebug=(()=>{
 'use strict';
 if(!CAMERA_PROFILE.debugEnabled)return Object.freeze({enabled:false,update(){}});
 let panel,readout,worldSlider,worldPreset,vmSlider,offsetSliders,worldLabel;
 const rounded=x=>Number.isFinite(x)?x.toFixed(2):'?';
 function update(){
  if(!panel||panel.hidden)return;
  const state=window.blockStrikeCameraState?.();
  if(!state)return;
  readout.textContent=`World V ${rounded(state.worldFov)}° · H ${rounded(CAMERA_PROFILE.horizontalFromVertical(state.worldFov,state.aspect))}°\n`+
   `Viewmodel V ${rounded(state.viewmodelFov)}° (${state.weapon||'none'})\n`+
   `Eye ${rounded(state.eyeHeight)} · Aspect ${rounded(state.aspect)}\n`+
   `World near/far ${CAMERA_PROFILE.worldNear}/${CAMERA_PROFILE.worldFar} · VM near/far ${CAMERA_PROFILE.viewmodelNear}/${CAMERA_PROFILE.viewmodelFar}\n`+
   `${state.spectating?'Spectating':'Playing'} · ${CAMERA_PROFILE.aspectHandling}`;
 }
 function create(){
  panel=document.createElement('section');panel.id='cameraDebugPanel';panel.setAttribute('aria-label','Camera calibration debug');
  Object.assign(panel.style,{position:'fixed',top:'8px',left:'8px',zIndex:'99999',background:'rgba(7,13,19,.93)',color:'#e7f2e6',border:'1px solid #89a998',padding:'8px 10px',borderRadius:'5px',font:'12px/1.5 system-ui,sans-serif',width:'min(340px,70vw)',maxHeight:'75dvh',overflowY:'auto',boxShadow:'0 4px 16px #0009'});
  const title=document.createElement('strong');title.textContent='Camera QA · Ctrl+Shift+V';panel.append(title);
  const collapse=document.createElement('button');collapse.textContent='Hide';collapse.type='button';collapse.style.cssText='float:right;color:white;background:#374c42;border:1px solid #9ba;font:11px system-ui;padding:2px 5px';
  collapse.addEventListener('click',()=>{const folded=collapse.textContent==='Hide';for(const child of [...panel.children])if(child!==title&&child!==collapse)child.hidden=folded;collapse.textContent=folded?'Show':'Hide';});panel.append(collapse);
  readout=document.createElement('pre');readout.textContent='Start a match for live camera measurements.';Object.assign(readout.style,{whiteSpace:'pre-wrap',font:'11px/1.3 monospace',margin:'6px 0'});panel.append(readout);
  const field=(name,min,max,step,val,fn)=>{
   const wrap=document.createElement('label');wrap.style.cssText='display:flex;gap:6px;justify-content:space-between;align-items:center;margin-top:5px';
   const label=document.createElement('span');label.textContent=name;wrap.append(label);
   const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=val;input.style.width='150px';
   const value=document.createElement('output');value.textContent=val;input.addEventListener('input',()=>{value.textContent=input.value;fn(Number(input.value));update()});wrap.append(input,value);panel.append(wrap);return input;
  };
  const presets=document.createElement('div');presets.textContent='World FOV presets: ';presets.style.cssText='margin-top:5px;display:flex;gap:4px;flex-wrap:wrap;align-items:center';
  for(const n of [65,70,74,78]){const b=document.createElement('button');b.type='button';b.textContent=n+'°';b.style.cssText='font:11px system-ui;padding:3px 7px;background:#394e44;color:white;border:1px solid #91b499';b.onclick=()=>{CAMERA_PROFILE.setDebug({worldFov:n});worldSlider.value=n;worldLabel.textContent=n;update()};presets.append(b)}panel.append(presets);
  worldSlider=field('World V FOV',60,82,1,Math.round(CAMERA_PROFILE.worldFov(844/390)),n=>CAMERA_PROFILE.setDebug({worldFov:n}));
  worldLabel=worldSlider.nextElementSibling;
  vmSlider=field('VM FOV Δ',-10,10,.5,0,n=>CAMERA_PROFILE.setDebug({viewmodelFovShift:n}));
  offsetSliders=[0,1,2].map((i)=>field('VM offset '+['X','Y','Z'][i],-.08,.08,.005,0,n=>{const offs=[...CAMERA_PROFILE.viewmodelOffset()];offs[i]=n;CAMERA_PROFILE.setDebug({viewmodelOffset:offs})}));
  const reset=document.createElement('button');reset.type='button';reset.textContent='Reset to release profile';reset.style.cssText='margin-top:8px;padding:5px;color:white;background:#315e53;border:1px solid #a7bdae';reset.onclick=()=>{CAMERA_PROFILE.resetDebug();worldSlider.value=Math.round(CAMERA_PROFILE.worldFov(window.innerWidth/window.innerHeight));worldLabel.textContent=worldSlider.value;vmSlider.value=0;vmSlider.nextElementSibling.textContent='0';for(const i of offsetSliders){i.value=0;i.nextElementSibling.textContent='0'}update()};panel.append(reset);
  document.body.append(panel);
  document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.code==='KeyV'){e.preventDefault();panel.hidden=!panel.hidden;update()}});
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create,{once:true});else create();
 return Object.freeze({enabled:true,update});
})();
