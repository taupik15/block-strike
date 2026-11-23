/* Optional local cosmetic weapon replacement UI. Never changes inventory slots. */
(function(){'use strict';
 const $=id=>document.getElementById(id),dlg=$('weaponImportScreen');if(!dlg)return;
 const slot=$('weaponImportSlot'),pick=$('weaponImportFiles'),name=$('weaponImportName'),status=$('weaponImportStatus'),preview=$('weaponImportPreview');
 const labels={shield_usp:'Tactical Shield + USP',shield_glock18:'Tactical Shield + Glock',shield_p228:'Tactical Shield + P228',shield_deagle:'Tactical Shield + Deagle',shield_fiveseven:'Tactical Shield + Five-SeveN',shield_knife:'Tactical Shield + Knife',hegrenade:'HE Grenade',flashbang:'Flashbang',smokegrenade:'Smoke Grenade',c4:'C4 Bomb'};
 for(const id of WeaponImport.IDS){const option=document.createElement('option');option.value=id;
  option.textContent=(labels[id]||W[id]?.n||id.toUpperCase())+(id==='m3'?' (shotgun pertama)':'');slot.appendChild(option)}
 function render(){const id=slot.value;status.textContent=WeaponImport.status(id)+' · Import only replaces visuals/sounds. Combat stays unchanged.';
  const src=WeaponImport.imageUrl(id);preview.hidden=!src;
  if(src)preview.src=src;else preview.removeAttribute('src');
  $('weaponImportStock').hidden=id!=='m3';
  $('weaponImportRemove').textContent=id==='m3'?'Restore included M1887 Silver':'Remove custom skin';
 }
 const open=()=>{dlg.classList.remove('hidden');slot.value='m3';pick.value='';name.value='';render();slot.focus()};
 const close=()=>{dlg.classList.add('hidden');pick.value=''};
 $('openWeaponImport')?.addEventListener('click',open);
 $('openWeaponImportStorage')?.addEventListener('click',open);
 $('weaponImportClose').addEventListener('click',close);
 $('weaponImportCancel').addEventListener('click',close);
 slot.addEventListener('change',render);
 pick.addEventListener('change',()=>{if(!name.value&&pick.files.length)name.value=pick.files[0].name.replace(/\.(zip|mdl|rar|glb)$/i,'').slice(0,70)});
 $('weaponImportApply').addEventListener('click',async()=>{
  const files=[...pick.files];if(!files.length){status.textContent='Choose a ZIP or loose model/sound files first.';return}
  const button=$('weaponImportApply');button.disabled=true;status.textContent='Validating models and saving locally…';
  try{const result=await WeaponImport.install(slot.value,files,name.value.trim());render();status.textContent='Installed '+result.name+' in '+slot.value+' only. Price, ammo and damage unchanged. You can close this menu.';pick.value=''}
  catch(e){status.textContent='Import failed: '+String(e.message||e)}
  finally{button.disabled=false}
 });
 $('weaponImportRemove').addEventListener('click',async()=>{
  try{await WeaponImport.reset(slot.value);render();status.textContent='Local override cleared. '+WeaponImport.status(slot.value)}
  catch(e){status.textContent=String(e.message||e)}
 });
 $('weaponImportStock').addEventListener('click',async()=>{
  try{await WeaponImport.reset('m3',true);render();status.textContent='M3 restored to the original CS 1.6 visuals and sounds.'}
  catch(e){status.textContent=String(e.message||e)}
 });
 document.addEventListener('blockstrike:weapon-skin-change',()=>{if(!dlg.classList.contains('hidden'))render()});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dlg.classList.contains('hidden')){e.preventDefault();e.stopImmediatePropagation();close()}},true);
 WeaponImport.ready.then(()=>{if(!dlg.classList.contains('hidden'))render()});
})();
