/* BLOCK STRIKE: original implementation of CS-style Auto Buy / Rebuy.
 * Uses the game's normal transaction path. No GoldSrc scripts or binaries are embedded.
 */
(function installQuickBuy(){
 'use strict';
 const KEY='block-strike-quickbuy-v1';
 const TEAM_WEAPONS={
   CT:['m4a1','aug','famas','mp5','ump45','tmp','p90','scout','m3'],
   T:['ak47','sg552','galil','mp5','ump45','mac10','p90','scout','m3']
 };
 const last={CT:[],T:[]};
 const extras=new Set(['helmet','kevlar','flash','he','smoke','defuse','nightvision','primaryAmmo','secondaryAmmo']);
 const valid=id=>typeof id==='string'&&(W[id]?.slot==='primary'||W[id]?.slot==='pistol'||extras.has(id));
 function add(list,id,flashCount=null,keepHelmet=false){
   if(!valid(id))return;
   if(id==='kevlar'&&keepHelmet&&list.includes('helmet'))return;
   const slot=W[id]?.slot;
   for(let i=list.length-1;i>=0;i--){const old=list[i];if(old===id||(slot&&W[old]?.slot===slot)||(['helmet','kevlar'].includes(id)&&['helmet','kevlar'].includes(old))) {
    if(id==='flash'&&flashCount===null)continue;
    list.splice(i,1);
   }}
   if(id==='flash'){
    const count=flashCount===null?Math.min(1,2-list.filter(x=>x==='flash').length):Math.max(0,Math.min(2,flashCount));
    for(let i=0;i<count;i++)list.push(id);
   }else list.push(id);
 }
 try {const saved=JSON.parse(localStorage.getItem(KEY)||'{}');for(const team of ['CT','T'])if(Array.isArray(saved[team]))for(const id of saved[team].slice(0,24))add(last[team],id);}catch(e){}
 let bulk=false;
 function store(){try{localStorage.setItem(KEY,JSON.stringify(last))}catch(e){}}
 function remember(id,team,save=true){
   if(bulk||!last[team])return;
   add(last[team],id,id==='flash'?Math.max(grenades.flash,last[team].filter(x=>x==='flash').length):null,true);if(save)store();
 }
 function orderedPlan(team){
   const rank=id=>W[id]?.slot==='pistol'?0:W[id]?.slot==='primary'?1:['helmet','kevlar'].includes(id)?2:id.endsWith('Ammo')?3:id==='defuse'?4:5;
   return (last[team]||[]).slice().sort((a,b)=>rank(a)-rank(b));
 }
 function canPurchase(id){
   const item=getItem(id);
   return Boolean(item)&&!buyReason(item);
 }
 function execute(mode){
   if(mode!=='auto'&&mode!=='rebuy')return {ok:false,reason:'INVALID MODE',ids:[]};
   if(typeof running==='undefined'||!running){return {ok:false,reason:'NO ACTIVE MATCH',ids:[]};}
   if(typeof buyTime==='undefined'||buyTime<=0||!inBuyZone()||P.hp<=0||roundWait>0||Phase13.isSpectating()){
     if(typeof say==='function')say('BUY ZONE CLOSED');
     return {ok:false,reason:'BUY ZONE CLOSED',ids:[]};
   }
   const team=playerTeam;
   const selected=[];
   function buyOne(id){
     if(!canPurchase(id))return false;
     if(!purchase(id))return false;
     selected.push(id);return true;
   }
   bulk=true;
   try {
     if(mode==='rebuy'){
       for(const id of orderedPlan(team)){if(id.endsWith('Ammo')){for(let i=0;i<32&&buyOne(id);i++);}else if(id==='flash'){const wanted=last[team].filter(x=>x==='flash').length;if(grenades.flash<wanted)buyOne(id);}else buyOne(id);}
     } else {
       const hasPrimary=inventory.some(id=>W[id]?.slot==='primary'||id==='shield');
       if(!inventory.some(id=>W[id]?.slot==='pistol'))buyOne(team==='CT'?'usp':'glock18');
       if(!hasPrimary){for(const id of TEAM_WEAPONS[team]||[]){if(buyOne(id))break;}}
       if(!helmet||armor<100) {if(!buyOne('helmet')&&armor<100)buyOne('kevlar');}
       // Buy ammunition and objective gear before optional grenades.
       for(const id of ['primaryAmmo','secondaryAmmo'])for(let i=0;i<32&&buyOne(id);i++);
       if(team==='CT'&&BombMode.active()&&!defuseKit)buyOne('defuse');
       if(grenades.he<1)buyOne('he');
       while(grenades.flash<2&&buyOne('flash'));
       if(grenades.smoke<1)buyOne('smoke');
     }
   }finally{bulk=false;}
   if(mode==='auto'&&selected.length){for(const id of selected)remember(id,team,false);store();}
   const message=selected.length?((mode==='auto'?'AUTO BUY':'REBUY')+' · '+selected.length+' ITEMS'):'NO AFFORDABLE ITEMS';
   const hint=document.getElementById('buyHint');if(hint)hint.textContent=message;
   if(typeof say==='function')say(message);
   if(typeof hud==='function')hud();
   return {ok:selected.length>0,reason:message,ids:selected};
 }
 function bind(){
   for(const [id,mode] of [['autoBuyBtn','auto'],['rebuyBtn','rebuy']]){
     const button=document.getElementById(id);if(button)button.addEventListener('click',e=>{e.stopPropagation();execute(mode);});
   }
   window.addEventListener('keydown',e=>{
     const mode=e.code==='F3'?'auto':e.code==='F4'?'rebuy':null;
     if(!mode)return;
     const target=e.target;
     if(target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
     e.preventDefault();if(e.repeat)return;
     if(document.getElementById('menu')&&!document.getElementById('menu').classList.contains('hidden'))return;
     execute(mode);
   });
 }
 // Preserve the existing buy function and its buy-zone, team, money, and stock checks.
 const originalPurchase=purchase;
 purchase=function(id){const ok=originalPurchase(id);if(ok)remember(id,playerTeam);return ok;};
 bind();
 window.BSQuickBuy={execute,remember,canPurchase,getLast:team=>(last[team]||[]).slice(),TEAM_WEAPONS};
})();
