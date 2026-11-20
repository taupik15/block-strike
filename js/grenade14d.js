/* Phase 14D grenade mechanics. Pure, deterministic helpers reused by both teams.
 * World units: approximately 40 GoldSrc units per metre in BLOCK STRIKE.
 * A mechanic approximation, not a copy of proprietary GoldSrc source code.
 */
const Grenade14D=(()=>{
 'use strict';
 const TYPES=Object.freeze({
  he:Object.freeze({fuse:1.5,blastRadius:7,maxDamage:100,bounce:.42}),
  flash:Object.freeze({fuse:1.5,flashRadius:30,bounce:.45}),
  smoke:Object.freeze({fuse:1.5,maxWait:5.2,radius:4.15,duration:25.4,bounce:.36})
 });
 const GRAVITY=19; // shared current projectile tuning; not native GoldSrc parity
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function throwVelocity(direction,{strength=1,playerVertical=0}={}){
  const mag=Math.hypot(direction.x,direction.y,direction.z)||1;
  const x=direction.x/mag,y=direction.y/mag,z=direction.z/mag;
  const speed=15*clamp(strength,.25,1.4);
  return {x:x*speed,y:y*speed+4.4+clamp(playerVertical,-3,3)*.3,z:z*speed};
 }
 // Keep the existing linear damage curve. The weighted exposure is an
 // optional Condition Zero-inspired cover approximation, not CS 1.6 parity.
 const worldScale=k=>Number.isFinite(k)&&k>0?k/.02:1;
 function heDamage(distance,blocked=false,scale=.02,exposure=1){if(blocked)return 0;const t=clamp(1-distance/(TYPES.he.blastRadius*worldScale(scale)),0,1);return TYPES.he.maxDamage*t*clamp(exposure,0,1);}
 function blastExposure(origin,center,{head,feet,side},visible){
  const dx=center.x-origin.x,dz=center.z-origin.z,l=Math.hypot(dx,dz),nx=l>1e-8?-dz/l:1,nz=l>1e-8?dx/l:0;
  const point=(x,y,z)=>({x:center.x+x,y:center.y+y,z:center.z+z});
  return [[point(0,0,0),.4],[point(0,head,0),.2],[point(0,-feet,0),.2],[point(nx*side,0,nz*side),.1],[point(-nx*side,0,-nz*side),.1]].reduce((sum,[p,w])=>sum+(visible(p)?w:0),0);
 }
 function smokeEyeOffset(col,crouch=false){return col?(28-(crouch?(Number.isInteger(col.crouchHead)?16:9):0))*col.T.k:(crouch?.95:1.5);}
 function waterSeparates(wet,level){return wet?level===0:level===3;}

 function flashExposure(distance,facingDot,occluded=false,scale=.02){
  const radius=1500*(Number.isFinite(scale)&&scale>0?scale:.02);
  const power=occluded?0:4*clamp(1-distance/radius,0,1);
  const front=facingDot>=0;
  const hold=power/(front?1.5:3.5),fade=power*(front?3:1.75);
  return {strength:power>0?(front?1:200/255):0,hold,fade,duration:hold+fade};
 }
 function flashOpacity(elapsed,exposure){
  if(exposure.fade<=0)return 0;
  return exposure.strength*clamp((exposure.duration-elapsed)/exposure.fade,0,1);
 }
 function smokeOpacity(age,duration=TYPES.smoke.duration){
  return clamp(age/2.3,0,1)*clamp((duration-age)/5.4,0,1);
 }
 function smokeRadius(age,duration=TYPES.smoke.duration,scale=.02){
  return TYPES.smoke.radius*worldScale(scale)*clamp(age/2.6,0,1)*clamp((duration-age)/4.2,0,1);
 }
 function segmentSmokeOpacity(a,b,center,radius,age,duration=TYPES.smoke.duration,scale=.02){
  if(radius<.25*worldScale(scale))return 0;
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
  const ll=dx*dx+dy*dy+dz*dz;
  if(ll<.00001)return 0;
  const x=a.x-center.x,y=a.y-center.y,z=a.z-center.z;
  const dot=x*dx+y*dy+z*dz,c=x*x+y*y+z*z-radius*radius;
  const disc=dot*dot-ll*c;
  if(disc<=0)return 0;
  const spread=Math.sqrt(disc),inT=clamp((-dot-spread)/ll,0,1),outT=clamp((-dot+spread)/ll,0,1);
  const length=Math.max(0,outT-inT)*Math.sqrt(ll);
  return 1-Math.exp(-length*.67/worldScale(scale)*smokeOpacity(age,duration));
 }
 function bounce(velocity,normal,material='hard'){
  let n=normal;const len=Math.hypot(n.x,n.y,n.z)||1;
  n={x:n.x/len,y:n.y/len,z:n.z/len};
  const dot=velocity.x*n.x+velocity.y*n.y+velocity.z*n.z;
  if(dot>=0||Math.hypot(normal.x,normal.y,normal.z)<1e-8)return {...velocity};
  const elasticity=material==='ground'?.32:.43;
  const impact=Math.min(0,dot);
  const v={x:velocity.x-(1+elasticity)*impact*n.x,y:velocity.y-(1+elasticity)*impact*n.y,z:velocity.z-(1+elasticity)*impact*n.z};
  const friction=material==='ground'?.71:.84;
  if(n.y>.6){v.x*=friction;v.z*=friction;if(Math.abs(v.y)<1.1)v.y=0}
  else {v.x*=.89;v.y*=.89;v.z*=.89}
  return v;
 }
 return Object.freeze({TYPES,GRAVITY,clamp,throwVelocity,heDamage,blastExposure,worldScale,smokeEyeOffset,waterSeparates,flashExposure,flashOpacity,smokeOpacity,smokeRadius,segmentSmokeOpacity,bounce});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Grenade14D;
