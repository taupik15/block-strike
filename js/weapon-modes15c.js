/* Batch 15C — GoldSrc-style alternate fire; no timers outside the game loop. */
const WeaponModes15C=(()=>{
 'use strict';
 const config=Object.freeze({glock18:Object.freeze({shots:3,firstDelay:.10,interval:.10,cycle:.50,recovery:.30}),famas:Object.freeze({shots:3,firstDelay:.05,interval:.10,cycle:.55,recovery:.40})});
 let burst=null;
 function start(weapon,ammo){
  const c=config[weapon];if(!c||burst||ammo<2)return false;
  burst={weapon,remaining:Math.min(c.shots,ammo)-1,delay:c.firstDelay,interval:c.interval};return true;
 }
 function cancel(){burst=null}
 function active(){return !!burst}
 function tick(dt,weapon,canFire,fire){
  if(!burst)return 0;
  if(weapon!==burst.weapon||!canFire){cancel();return 0}
  burst.delay-=Math.max(0,dt);let count=0;
  // Fixed limit prevents long background-tab frames from issuing a massive volley.
  while(burst&&burst.delay<=1e-8&&count<2){
   const k=burst.weapon;
   if(!fire(k)){cancel();break}
   count++;burst.remaining--;
   if(!burst.remaining){burst=null;break}
   burst.delay+=config[k].interval;
  }
  return count;
 }
 function recovery(weapon){return config[weapon]?.recovery||0}
 function configured(weapon){return !!config[weapon]}
 return Object.freeze({config,start,cancel,active,tick,recovery,configured});
})();
