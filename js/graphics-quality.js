/* Pure graphics profiles. CSS HUD and gameplay parameters are never scaled. */
const GraphicsQuality=(()=>{
 const profiles=Object.freeze({
  '-1':Object.freeze({id:-1,name:'Ultra Low',mobileDpr:.65,desktopDpr:.65,minDpr:.5,antialias:false,shadows:false,tracers:24,particles:24,particleScale:.35,sprites:14,wallAttempts:3,bulletDecals:12,bloodDecals:5,bloodSprites:6,secondaryExplosions:false}),
  0:Object.freeze({id:0,name:'Low',mobileDpr:.85,desktopDpr:1,minDpr:.65,antialias:false,shadows:false,tracers:48,particles:48,particleScale:.6,sprites:24,wallAttempts:6,bulletDecals:24,bloodDecals:10,bloodSprites:12,secondaryExplosions:false}),
  1:Object.freeze({id:1,name:'Medium',mobileDpr:1.25,desktopDpr:1.5,minDpr:.65,antialias:true,shadows:false,tracers:96,particles:128,particleScale:1,sprites:44,wallAttempts:12,bulletDecals:48,bloodDecals:20,bloodSprites:26,secondaryExplosions:true}),
  2:Object.freeze({id:2,name:'High',mobileDpr:1.5,desktopDpr:2,minDpr:.65,antialias:true,shadows:true,tracers:96,particles:128,particleScale:1,sprites:44,wallAttempts:12,bulletDecals:48,bloodDecals:20,bloodSprites:26,secondaryExplosions:true})
 });
 const normalize=(v,fallback=1)=>['-1','0','1','2'].includes(String(v))?Number(v):fallback;
 const profile=id=>profiles[normalize(id)];
 function resolution(id,dpr,mobile){const p=profile(id),cap=mobile?p.mobileDpr:p.desktopDpr;const base=Math.max(.5,Math.min(cap,Number(dpr)>0&&Number.isFinite(Number(dpr))?Number(dpr):1));return {base,min:Math.min(base,p.minDpr),adaptive:!!mobile||p.id===-1};}
 // At a deliberately low cap, retain modest scheduling jitter instead of
 // slowing game clocks. Still bound catch-up and keep individual updates small.
 function frameSteps(elapsed,fps){const dt=Math.min(fps===20?.1:.05,Math.max(0,Number.isFinite(elapsed)?elapsed:0)/1000);const count=fps===20&&dt>.055?2:1;return {dt,count,step:dt/count};}
 const performanceFields=Object.freeze({
  adaptiveResolution:Object.freeze({key:'bs.adaptiveResolution',values:['auto','on','off'],defaultValue:'auto'}),
  autoCharacterLOD:Object.freeze({key:'bs.autoCharacterLOD',values:['auto','off'],defaultValue:'auto'}),
  gpuCompatibilityMode:Object.freeze({key:'bs.gpuCompatibilityMode',values:['auto','compatible'],defaultValue:'auto'})
 });
 const preferences={};
 function preference(field){const f=performanceFields[field];if(!f)return null;if(!Object.prototype.hasOwnProperty.call(preferences,field)){let value;try{value=localStorage.getItem(f.key)}catch(_){}preferences[field]=f.values.includes(value)?value:f.defaultValue;}return preferences[field];}
 function setPreference(field,value){const f=performanceFields[field];if(!f)return null;value=f.values.includes(value)?value:f.defaultValue;preferences[field]=value;try{localStorage.setItem(f.key,value)}catch(_){}return value;}
 function adaptiveEnabled(recommended){const value=preference('adaptiveResolution');return value==='auto'?!!recommended:value==='on';}
 function lodQuality(id,underPressure=false){if(preference('autoCharacterLOD')==='off')return 2;return id===1&&underPressure?0:id;}
 const effectCount=(n,id)=>Math.max(0,Math.min(n,Math.ceil(n*profile(id).particleScale)));
 return Object.freeze({normalize,profile,resolution,frameSteps,effectCount,performanceFields,preference,setPreference,adaptiveEnabled,lodQuality});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=GraphicsQuality;
