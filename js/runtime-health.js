/* Runtime watchdog: local diagnostics, bounded recovery, no telemetry uploads. */
const RuntimeHealth=(()=>{
 const VERSION='AR11.10.22I.1',label=document.getElementById('runtimeHealth'),toggle=document.getElementById('runtimeHealthToggle');
 let enabled=false,lost=false,halted=false,stageName='startup',fault=null,warningUntil=0,frameAt=0,updateAt=0,updateMs=0,renderMs=0,renderOK=false,frameGap=0,frameAverage=0,updateAverage=0,renderAverage=0,failUpdate=0,failRender=0,lastPaint=-Infinity,frames=0,bound=null;
 const clock=()=>performance.now();
 let lifecycleReason=null,lifecycleAt=0;
 let stageAt=0,stagePeak=0,stagePeakName='',lastSlow='',simOKCount=0,renderOKCount=0;
 const reportKey='bs.lastRuntimeFault',reportButton=document.getElementById('runtimeHealthLastFault'),reportLabel=document.getElementById('runtimeHealthHistory');
 let lastReport='';try{lastReport=localStorage.getItem(reportKey)||''}catch(_){}
 function refreshHistory(){if(reportButton)reportButton.disabled=!lastReport;if(reportLabel&&!reportLabel.hidden)reportLabel.textContent=lastReport||'No saved engine fault.';}
 function saveFault(){if(!fault)return;const map=typeof activeMapData!=='undefined'?(activeMapData?.name||activeMapData?.id||'unknown'):'startup';lastReport=[VERSION+' | '+map,new Date().toISOString(),fault.kind+' / '+fault.stage+': '+fault.message,'Frames '+frames+' / simulation '+simOKCount+' / render '+renderOKCount,'Frame '+frameGap.toFixed(0)+' ms | sim '+updateAverage.toFixed(1)+' | render '+renderAverage.toFixed(1)+' ms',lastSlow?'Slow stage: '+lastSlow:''].filter(Boolean).join('\n');try{localStorage.setItem(reportKey,lastReport)}catch(_){}refreshHistory();}
 if(reportButton){refreshHistory();reportButton.addEventListener('click',()=>{if(reportLabel){reportLabel.hidden=!reportLabel.hidden;refreshHistory();}});}
 let drawCalls=0,lastStall=0,baseRatio=1,minRatio=.65,adaptive=false,currentRatio=1,ratioAt=0,slowFor=0,fastFor=0,sampleAverage=0,sampleFps=0,scaleReason='preset';
 function resetSamples(){slowFor=fastFor=sampleAverage=sampleFps=0;}
 function applyRatio(ratio){
  if(typeof R==='undefined'||!R?.setPixelRatio)return;
  if(R.getPixelRatio()!==ratio)R.setPixelRatio(ratio);currentRatio=ratio;
 }
 function configureResolution(base,mobile,min=.65){
  baseRatio=Math.max(.5,Math.min(2,Number(base)||1));minRatio=Math.max(.5,Math.min(baseRatio,Number(min)||.65));adaptive=!!mobile;
  resetSamples();ratioAt=clock();scaleReason=adaptive?'sampling':'fixed';applyRatio(baseRatio);
 }
 function adaptResolution(){
  if(!adaptive||!renderOK||lost||halted||!Number.isFinite(frameGap)||frameGap<=0||frameGap>250){resetSamples();return;}
  const fps=typeof FrameLimiter!=='undefined'?FrameLimiter.fps:60,target=1000/fps;
  // Do not interpret a deliberately changed cap or a resumed page as pressure.
  if(sampleFps!==fps){resetSamples();sampleFps=fps;ratioAt=clock();}
  sampleAverage=sampleAverage?sampleAverage*.9+frameGap*.1:frameGap;
  const now=clock(),cpuBound=updateAverage>=target*.9;
  if(sampleAverage>target*1.3&&!cpuBound){slowFor+=frameGap;fastFor=0;}
  else if(sampleAverage<target*1.08&&!cpuBound){fastFor+=frameGap;slowFor=0;}
  else{slowFor=fastFor=0;}
  // A slow simulation cannot be fixed by repeatedly allocating smaller buffers.
  if(cpuBound){scaleReason='CPU pressure';return;}
  if(now-ratioAt>=2500&&slowFor>=1800&&currentRatio>minRatio){applyRatio(Math.max(minRatio,Math.round(currentRatio*.85*100)/100));ratioAt=now;slowFor=fastFor=0;scaleReason='sustained frame pressure';}
  else if(now-ratioAt>=10000&&fastFor>=8000&&currentRatio<baseRatio){applyRatio(Math.min(baseRatio,Math.round((currentRatio+.1)*100)/100));ratioAt=now;slowFor=fastFor=0;scaleReason='stable recovery';}
  else if(currentRatio===minRatio&&slowFor>=1800)scaleReason='minimum scale';
 }
 function performanceState(){return {adaptive,baseRatio,minRatio,currentRatio,reason:scaleReason,pressure:adaptive&&currentRatio<baseRatio-.04};}
 try{enabled=localStorage.getItem('bs.runtimeDiagnostics')==='1'}catch(_){}
 function shortError(e){return String(e?.message||e||'Unknown error').replace(/[\r\n]+/g,' ').slice(0,240);}
 function refreshToggle(){if(toggle){toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=enabled?'Hide performance diagnostics':'Show performance diagnostics';}}
 function paint(force=false){
  if(!label)return;
  const now=clock(),active=typeof running!=='undefined'&&running,show=enabled&&(lost||halted||active);
  // Diagnostics OFF must never open the giant telemetry overlay, including
  // async model faults. Faults remain in console and local fault history.
  if(label.hidden===show)label.hidden=!show;if(!show||!force&&now-lastPaint<500)return;lastPaint=now;
  const p=typeof P!=='undefined'?P?.pos:null,r=typeof R!=='undefined'?R:null;
  const map=typeof activeMapData!=='undefined'?(activeMapData?.name||activeMapData?.id||'unknown'):'startup';
  const pos=p?[p.x,p.y,p.z].map(n=>Number.isFinite(n)?n.toFixed(1):String(n)).join(', '):'-';
  const input=typeof jx==='number'&&typeof jy==='number'?`${jx.toFixed(2)},${jy.toFixed(2)}`:'-';
  const count=typeof bots!=='undefined'?bots.length:0;
  const lines=[`BS ${VERSION} | ${map} | ${count} bots`,`${frameAverage>0?(1000/frameAverage).toFixed(0):'-'} FPS (cap ${typeof FrameLimiter!=='undefined'?FrameLimiter.fps:60}) | frame ${frameGap.toFixed(0)} ms | sim ${updateAverage.toFixed(1)} | render ${renderAverage.toFixed(1)} ms`, `pos ${pos} | stick ${input} | tex ${r?.info?.memory?.textures??'-'} | geo ${r?.info?.memory?.geometries??'-'}`,`draw ${drawCalls} | DPR ${r?.getPixelRatio?.()?.toFixed(2)??'-'}`];
  lines.push(`ticks ${simOKCount} | frames ${renderOKCount} / ${frames}`);
  if(typeof graphicsProfile==='function')lines.push(`Quality ${graphicsProfile().name} | DPR target ${baseRatio.toFixed(2)} / floor ${minRatio.toFixed(2)} | AA ${r?.getContext?.()?.getContextAttributes?.()?.antialias?'on':'off'}`);
  lines.push(`Adaptive resolution ${adaptive?'on':'off'} | ${scaleReason}`);
  if(typeof GraphicsQuality!=='undefined')lines.push(`LOD ${GraphicsQuality.preference('autoCharacterLOD')} | GPU model preference ${GraphicsQuality.preference('gpuCompatibilityMode')} (next match)`);
  if(r?.capabilities){const c=r.capabilities;lines.push(`WebGL ${c.isWebGL2?2:1} | bone uniforms ${c.maxVertexUniforms} | float vertex textures ${c.floatVertexTextures?'yes':'no'}`);}
  if(typeof AssetMemory!=='undefined'){const m=AssetMemory.stats();lines.push(`Decoded audio ${(m.bytes/1048576).toFixed(1)} MiB | pending ${m.pending} | memory mode ${m.constrained?'limited':'normal'}`);}
  if(typeof characterLOD!=='undefined')lines.push(`Character LOD | culled ${characterLOD.culled} | pose deferred ${characterLOD.deferred} | evaluated ${characterLOD.evaluated}`);
  if(typeof S!=='undefined'&&S?.userData?.staticBatch){const b=S.userData.staticBatch;lines.push(`Static boxes ${b.boxes} → ${b.batches} batches | instancing ${BSPVisuals.canInstance(r)?'yes':'no'}`);}
  if(typeof CharacterCompat!=='undefined'){const notes=CharacterCompat.summary();lines.push(`Rigid bots ${typeof bots==='undefined'?0:bots.filter(b=>b.fallbackRig).length} | model warnings ${notes.length}`);if(notes.length)lines.push(...notes.slice(0,3));}
  const col=typeof window!=='undefined'?window.bspCol:null;
  if(col?.local&&p&&typeof BSP!=='undefined'){
   try{const T=col.T,b=BSP.toGame(T,[0,1,0]),h=BSP.toHammer(T,p.toArray()),yaw=typeof P!=='undefined'&&Number.isFinite(P.yaw)?P.yaw:0;
    const f=BSP.toHammer(T,[-Math.sin(yaw),0,-Math.cos(yaw)]),heading=(Math.atan2(f[1],f[0])*180/Math.PI+360)%360;
    lines.push(`BSP ${col.orientationId||'legacy?'} | Y->Z ${Math.sign(b[2])} | H ${h.map(n=>n.toFixed(0)).join(',')} | yaw ${heading.toFixed(0)}`);
    const team=typeof playerTeam!=='undefined'?playerTeam:null,sp=col.spawnTeams?.[team]?.[0];if(sp)lines.push(`Spawn ${team} H ${sp.join(',')} | map axis checked`);
   }catch(_){lines.push('BSP orientation diagnostics unavailable');}
  }
  if(lastSlow)lines.push(`Slow stage: ${lastSlow}`);
  if(lifecycleReason)lines.push(`Lifecycle paused: ${lifecycleReason} (${Math.round(now-lifecycleAt)} ms). Tap to recover controls.`);
  if(lost)lines.push('WebGL context lost. Waiting for browser recovery. Reload if unavailable.');
  if(halted)lines.push('Match paused after repeated errors. Menu → start a new match. Screenshot this panel.');
  if(fault)lines.push(`${fault.kind} / ${fault.stage}: ${fault.message}`);
  else if(now<warningUntil)lines.push(`Foreground frame stalled (${Math.round(lastStall)} ms).`);
  label.textContent=lines.join('\n');
 }
 function lifecycleWait(reason){
  if(reason!==lifecycleReason){lifecycleReason=reason;lifecycleAt=clock();lastPaint=-Infinity;resetSamples();ratioAt=clock();}
  if(reason==='input suspended')paint();
 }
 function idle(){resetSamples();if(label&&!lost&&!halted&&!label.hidden)label.hidden=true;}
 function reset(){lifecycleReason=null;lifecycleAt=0;halted=false;fault=null;warningUntil=0;failUpdate=failRender=0;frames=simOKCount=renderOKCount=0;frameAverage=updateAverage=renderAverage=frameGap=0;stageName='startup';stageAt=0;stagePeak=0;stagePeakName=lastSlow='';lastStall=0;resetSamples();ratioAt=clock();paint(true);}
 function begin(t,gap){frameAt=clock();stageAt=frameAt;stagePeak=0;stagePeakName='';stageName='frame';frameGap=gap;updateAt=frameAt;updateMs=renderMs=0;renderOK=false;drawCalls=0;frames++;if(gap>1000){lastStall=gap;warningUntil=clock()+8000;}}
 function stage(name){
  const now=clock(),ms=now-stageAt;
  if(stageAt&&ms>stagePeak){stagePeak=ms;stagePeakName=stageName;}
  stageAt=now;stageName=name;
 }
 function fail(kind,e){
  const message=shortError(e),same=fault?.kind===kind&&fault.stage===stageName&&fault.message===message;
  fault={kind,stage:stageName,message};warningUntil=clock()+12000;
  if(!same){console.error('[BLOCK STRIKE '+VERSION+'] '+kind+' / '+stageName,e);saveFault();}
  paint(true);
 }
 function updated(){updateAt=clock();updateMs=Math.max(0,updateAt-frameAt);}
 function countDraws(){if(typeof R!=='undefined')drawCalls+=R?.info?.render?.calls||0;}
 function rendered(){renderOK=true;renderMs=Math.max(0,clock()-updateAt);}
 function stopControls(){
  // A context loss or persistent runtime fault is a genuine interruption.
  try{resetInputs();P.jumpHeld=false;}catch(e){console.warn('Input release',e)}
  try{resetWeaponVoices();CS16SFX.reset?.();LocalMapMedia.pauseAmbient?.();Phase10.resetVoices?.();}catch(e){console.warn('Audio release',e)}
 }
 function end(t,updateOK){
  stage('frame end');if(stagePeak>=25)lastSlow=`${stagePeakName} ${stagePeak.toFixed(0)} ms`;
  const blend=(a,b)=>frames===1?b:a*.9+b*.1;
  frameAverage=blend(frameAverage,frameGap);updateAverage=blend(updateAverage,updateMs);renderAverage=blend(renderAverage,renderMs);
  if(updateOK)simOKCount++;if(renderOK)renderOKCount++;
  failUpdate=updateOK?0:failUpdate+1;failRender=renderOK||lost?0:failRender+1;
  if(!lost&&!halted&&(failUpdate>=3||failRender>=3)){halted=true;saveFault();stopControls();paint(true);}
  else {if(updateOK){try{adaptResolution()}catch(e){adaptive=false;stage('resolution');fail('render scale',e)}}else resetSamples();paint();}
 }
 function bindCanvas(canvas){
  if(bound===canvas)return;bound=canvas;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;resetSamples();stage('WebGL');fail('context','WebGL context lost');stopControls();paint(true);});
  canvas.addEventListener('webglcontextrestored',()=>{
   lost=false;resetSamples();ratioAt=clock();failUpdate=failRender=0;stage('WebGL restore');
   try{t0=clock();resizeGameViewport();}catch(e){fail('restore',e);halted=true;}
   if(!halted){fault={kind:'context',stage:'WebGL restore',message:'Browser restored context; match resumed.'};warningUntil=clock()+5000;}paint(true);
  });
 }
 if(toggle){refreshToggle();toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('bs.runtimeDiagnostics',enabled?'1':'0')}catch(_){}refreshToggle();paint(true);});}
 // Asynchronous asset or event-handler errors also need to be readable on a phone.
 addEventListener('error',e=>{if(typeof running!=='undefined'&&running&&e.message){stage('event handler');fail('JavaScript',e.error||e.message);}});
 addEventListener('unhandledrejection',e=>{if(typeof running!=='undefined'&&running){stage('async task');fail('Promise',e.reason);}});
 return Object.freeze({reset,idle,lifecycleWait,begin,stage,fail,updated,rendered,countDraws,end,bindCanvas,configureResolution,performanceState,blocked:()=>lost||halted,contextLost:()=>lost,halted:()=>halted});
})();
