/* Shared pack controls for the two existing import dialogs. */
(function(){'use strict';const $=id=>document.getElementById(id);
 function mount(prefix,api,sourceId,manageId,openId){
  const library=api.library,edit=$(prefix+'PackEdit'),option=$(prefix+'PackOption'),name=$(prefix+'PackName'),status=$(prefix+'PackStatus'),create=$(prefix+'PackCreate'),rename=$(prefix+'PackRename'),remove=$(prefix+'PackDelete');
  if(!edit||!option)return;
  let busy=false;function fill(select,list){const wanted=library.selected;select.replaceChildren(...list.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name+' ('+p.count+' overrides)';return o}));select.value=wanted}
  function refresh(){const list=library.list();fill(edit,list);fill(option,list);const p=list.find(x=>x.id===library.selected);const locked=busy||library.busy;edit.disabled=option.disabled=create.disabled=rename.disabled=name.disabled=locked;remove.disabled=locked||!!p?.reserved;}
  function describe(){const p=library.list().find(p=>p.id===library.selected);status.textContent=p?.name+' · '+p?.count+' overrides. '+(p?.reserved?'Default pack is reserved; individual slots can be restored. ':'')+'Other packs are not changed.'}
  function choose(id){if(!library.select(id)){refresh();return}name.value='';describe();refresh()}
  edit.addEventListener('change',()=>choose(edit.value));option.addEventListener('change',()=>choose(option.value));
  $(manageId).addEventListener('click',()=>$(openId).click());
  async function action(kind){if(busy||library.busy)return;const selected=library.selected,value=name.value.trim();if(kind==='delete'&&!confirm('Delete this pack and all its local overrides? Other packs will be kept.'))return;busy=true;refresh();try{if(kind==='create')await library.createPack(value);else if(kind==='rename')await library.renamePack(selected,value);else await library.deletePack(selected);name.value='';describe()}catch(e){status.textContent=String(e.message||e)}finally{busy=false;refresh()}}
  create.onclick=()=>action('create');rename.onclick=()=>action('rename');remove.onclick=()=>action('delete');
  document.addEventListener('blockstrike:mod-packs-change',()=>{refresh();if(!busy)describe()});
  document.addEventListener('blockstrike:pack-busy',refresh);
  library.ready.then(()=>{refresh();describe()});
 }
 mount('character',CharacterImport,'classicModels','manageCharacterPacks','openCharacterImportStorage');
 mount('weapon',WeaponImport,'weaponSource','manageWeaponPacks','openWeaponImportStorage');
})();
