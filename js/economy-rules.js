/* BLOCK STRIKE 16.4.5. Original transaction implementation; CS1.6 ammo constants from ReGameDLL_CS weapontype.h. */
const Economy45=(()=>{
 const rows={acp45:[100,12,25,'USP MAC10 UMP45'],mm9:[120,30,20,'GLOCK18 ELITE TMP MP5'],sig357:[52,13,50,'P228'],ae50:[35,7,40,'DEAGLE'],mm57:[100,50,50,'FIVESEVEN P90'],nato556:[90,30,60,'GALIL FAMAS M4A1 AUG SG552 SG550'],mm762:[90,30,80,'AK47 SCOUT G3SG1'],mag338:[30,10,125,'AWP'],buck:[32,8,65,'M3 XM1014'],box556:[200,30,60,'M249']};
 const byWeapon={};for(const [cal,[max,pack,price,ids]] of Object.entries(rows))for(const id of ids.toLowerCase().split(' '))byWeapon[id]=Object.freeze({cal,max,pack,price});
 const spec=id=>byWeapon[id]||null, clampMoney=n=>Math.max(0,Math.min(16000,Math.floor(n))), clampAmmo=(id,n)=>Math.max(0,Math.min(spec(id)?.max||0,Math.floor(Number(n)||0)));
 function state(pool,id,mag,res){const s=spec(id);if(!s)return {mag,res:0};if(res!==undefined)pool[s.cal]=clampAmmo(id,res);return {mag,get res(){return pool[s.cal]||0},set res(n){pool[s.cal]=clampAmmo(id,n)}}}
 function grant(pool,id,count){const s=spec(id);if(!s)return 0;const before=pool[s.cal]||0;pool[s.cal]=clampAmmo(id,before+count);return pool[s.cal]-before}
 function take(pool,id,remaining){const s=spec(id);if(!s||remaining.some(k=>spec(k)?.cal===s.cal))return 0;const n=pool[s.cal]||0;pool[s.cal]=0;return n}
 function ammoOffer(id,res){const s=spec(id);return s?{...s,count:Math.max(0,Math.min(s.pack,s.max-res))}:null}
 function bindBot(b,id,pool){delete b.reserve;const w=state(pool,id,b.ammo);Object.defineProperty(b,'reserve',{configurable:true,enumerable:true,get:()=>w.res,set:n=>{w.res=n}})}
 function payout(winner,reason,streak,planted=false){const loser=winner==='CT'?'T':'CT';const amounts={[winner]:reason==='BOMB EXPLODED'?3500:reason==='ELIMINATION'?3000:3250,[loser]:nextStreak(winner,streak).bonus};if(planted&&winner==='CT'&&reason==='BOMB DEFUSED')amounts.T+=800;return amounts}
 function nextStreak(winner,streak){const loser=winner==='CT'?'T':'CT';let bonus=streak.bonus??1400;if((streak[winner]||0)>1)bonus=1500;const count=(streak[loser]||0)+1;if(count>1&&bonus<3000)bonus+=500;return {[winner]:0,[loser]:count,bonus}}
 // No money transfer: coordinate low-budget purchases using a prior-round snapshot.
 function teamSave(members,losses,isPrimary){return losses>=2&&members.length>=2&&members.filter(m=>!isPrimary(m.loadout?.id)&&m.money<3500).length>members.length/2;}
 function tickRound(freeze,buy,time,dt,planted,ended){if(freeze>0)return {freeze:Math.max(0,freeze-dt),buy,time};return {freeze:0,buy:Math.max(0,buy-dt),time:planted||ended?time:Math.max(0,time-dt)}}
 return {teamSave,tickRound,bindBot,spec,clampMoney,clampAmmo,state,grant,take,ammoOffer,payout,nextStreak};
})();
