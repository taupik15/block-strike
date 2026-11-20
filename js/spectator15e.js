/* Batch 15E spectator logic. No game state or rendering side effects here. */
const Spectator15E=(()=>{
 'use strict';
 const MODES=Object.freeze([
  {id:'first',label:'First Person'},
  {id:'locked',label:'Locked Chase'},
  {id:'chase',label:'Free Chase'},
  {id:'free',label:'Free Look'},
  {id:'map',label:'Free Map Overview'},
  {id:'chase-map',label:'Chase Map Overview'}
 ]);
 const modeIds=MODES.map(m=>m.id);
 const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
 const alive=(b,team)=>!!(b&&b.g&&b.g.parent&&b.team===team&&!b.dead&&b.hp>0);
 const teammates=(bots,team)=>bots.filter(b=>alive(b,team));
 function nextBot(bots,team,current,direction=1){
  const candidates=teammates(bots,team);if(!candidates.length)return null;
  const index=candidates.indexOf(current);if(index<0)return candidates[0];
  return candidates[(index+(direction<0?-1:1)+candidates.length)%candidates.length];
 }
 function score(b,now){
  const sawEnemy=!!b.visibleEnemy;
  const recentShot=Number.isFinite(b.lastShot?.at)&&now-b.lastShot.at<4500;
  const proximity=b.visibleEnemy?.pos?Math.hypot(b.visibleEnemy.pos.x-b.g.position.x,b.visibleEnemy.pos.z-b.g.position.z):Infinity;
  return (sawEnemy?6:0)+(recentShot?4:0)+(proximity<13?3:proximity<26?1:0)+(b.hp<40?1:0);
 }
 function director(bots,team,current,now){
  const list=teammates(bots,team);if(!list.length)return null;
  // Keep the current target on ties, to avoid strobing between bots every tick.
  let best=list.includes(current)?current:list[0],high=score(best,now);
  for(const b of list){const candidate=score(b,now);if(candidate>high){best=b;high=candidate}}
  return best;
 }
 function nextMode(current,dir=1){
  const index=modeIds.indexOf(current);return modeIds[((index<0?0:index)+dir+modeIds.length)%modeIds.length];
 }
 return Object.freeze({MODES,modeIds,clamp,alive,teammates,nextBot,director,nextMode});
})();
if(typeof module==='object'&&module.exports)module.exports=Spectator15E;
