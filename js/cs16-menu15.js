/* Classic single-player UI integration. Uses source-supplied GameMenu.res and
 * ClientScheme/GUI assets as structure, but all controls are native browser UI.
 * GoldSrc maps are imported as local data. No native code is loaded.
 */
(function(){
 'use strict';
 const id=n=>document.getElementById(n);
 const KEY='bs-classic-menu15-v1';
 const RULE_KEY='bs-classic-match15-v1';
 const number=(value,def,min,max)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):def;};
 const tryRead=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
 const trySave=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}};
 const defaults={playerName:'PLAYER',crosshairSize:22,crosshairColor:'green',hudScale:100};
 const allowedCross={green:'#7fff7f',yellow:'#ffe06d',cyan:'#79f8ff',white:'#ffffff'};
 const baseRules={roundSeconds:120,buyTime:15,startMoney:800,c4Seconds:45,freezeTime:6};
 const permittedC4=[25,35,45,60,90];
 const permittedRounds=[60,90,120,180,300],permittedBuy=[10,15,30,45,60],permittedMoney=[800,1500,3000,5000,8000,16000];
 let prefs={...defaults,...(tryRead(KEY)||{})};
 let rules={...baseRules,...(tryRead(RULE_KEY)||{})};
 const fromAllowed=(value,allowed,fallback)=>allowed.includes(Number(value))?Number(value):fallback;
 rules.c4Seconds=fromAllowed(rules.c4Seconds,permittedC4,45);
 rules.roundSeconds=fromAllowed(rules.roundSeconds,permittedRounds,120);
 rules.freezeTime=fromAllowed(rules.freezeTime,[0,3,6,10],6);
 rules.buyTime=fromAllowed(rules.buyTime,permittedBuy,15);
 rules.startMoney=fromAllowed(rules.startMoney,permittedMoney,800);
 const name=()=>String(prefs.playerName||'PLAYER').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,24)||'PLAYER';
 const showTabs=(rootName,attribute,panelAttribute,name)=>{
  const root=id(rootName);if(!root)return;
  const buttons=[...root.querySelectorAll('button['+attribute+']')];
  const activate=tab=>{
   buttons.forEach(button=>{
    const selected=button.getAttribute(attribute)===tab;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-selected',String(selected));
    button.tabIndex=selected?0:-1;
   });
   document.querySelectorAll('['+panelAttribute+']').forEach(panel=>panel.classList.toggle('hidden',panel.getAttribute(panelAttribute)!==tab));
  };
  buttons.forEach(button=>button.addEventListener('click',()=>activate(button.getAttribute(attribute))));
  root.addEventListener('keydown',event=>{
   if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;
   const i=buttons.indexOf(document.activeElement);if(i<0)return;
   event.preventDefault();const next=buttons[(i+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];
   activate(next.getAttribute(attribute));next.focus();
  });
  return activate;
 };
 const activateOptions=showTabs('optionsTabs','data-options-tab','data-options-panel','options');
 const activateCreate=showTabs('createTabs','data-create-tab','data-create-panel','create');
 function applyAppearance(){
  const color=Object.hasOwn(allowedCross,prefs.crosshairColor)?prefs.crosshairColor:'green';
  const size=number(prefs.crosshairSize,22,12,38);
  const hud=number(prefs.hudScale,100,80,125);
  document.documentElement.style.setProperty('--cs-cross-color',allowedCross[color]);
  document.documentElement.style.setProperty('--cross-size',size+'px');
  document.documentElement.style.setProperty('--cs-hud-scale',hud/100);
  // Only scale visible status, not click targets, to keep touch hit-boxes stable.
  const status=['hp','armor','economy','ammo','gear'];
  status.forEach(k=>{const e=id(k);if(e)e.style.zoom=String(hud/100)});
 }
 function syncPrefs(){
  const nameEl=id('playerNickname');if(nameEl)nameEl.value=name();
  id('crosshairColor').value=Object.hasOwn(allowedCross,prefs.crosshairColor)?prefs.crosshairColor:'green';
  id('crosshairSize').value=String(number(prefs.crosshairSize,22,12,38));
  id('hudScale').value=String(number(prefs.hudScale,100,80,125));
  id('crossSizeValue').value=id('crosshairSize').value;
  id('hudScaleValue').value=id('hudScale').value+'%';
  id('sensitivityValue').value=(Number(id('sn').value)*1000).toFixed(1);
  id('volumeValue').value=Math.round(Number(id('volume').value)*100)+'%';
  id('fpsCap').value=String(FrameLimiter.fps);id('fpsCapValue').value=FrameLimiter.fps+' FPS';
  applyAppearance();
 }
 function persistPrefs(){prefs.playerName=name();trySave(KEY,prefs);applyAppearance()}
 id('playerNickname').addEventListener('input',event=>{prefs.playerName=event.target.value;persistPrefs()});
 id('crosshairSize').addEventListener('input',event=>{prefs.crosshairSize=number(event.target.value,22,12,38);id('crossSizeValue').value=String(prefs.crosshairSize);persistPrefs()});
 id('crosshairColor').addEventListener('change',event=>{prefs.crosshairColor=event.target.value;persistPrefs()});
 id('hudScale').addEventListener('input',event=>{prefs.hudScale=number(event.target.value,100,80,125);id('hudScaleValue').value=prefs.hudScale+'%';persistPrefs()});
 id('sn').addEventListener('input',event=>{id('sensitivityValue').value=(Number(event.target.value)*1000).toFixed(1);event.target.dispatchEvent(new Event('change',{bubbles:false}))});
 id('volume').addEventListener('input',event=>{id('volumeValue').value=Math.round(Number(event.target.value)*100)+'%'});
 id('fpsCap').addEventListener('change',event=>{id('fpsCapValue').value=FrameLimiter.set(event.target.value)+' FPS'});
 id('optionsDefaults').addEventListener('click',()=>{
  prefs={...defaults};persistPrefs();
  for(const [field,value] of [['q',FrameLimiter.mobile?'0':'1'],['fpsCap',String(FrameLimiter.recommended)],['sn','0.0045'],['volume','0.8'],['weaponHand','right'],['crouchMode','toggle'],['classicModels','on']]){
   const e=id(field);e.value=value;e.dispatchEvent(new Event(field==='volume'?'input':'change',{bubbles:true}));
  }
  syncPrefs();id('optionsStatus').textContent='Defaults restored';
 });
 // Settings use a reversible editing session: Cancel/X restores controls and saved values.
 let optionsSnapshot=null;
 const nativeOptions=['q','fpsCap','sn','volume','weaponHand','crouchMode','classicModels'];
 const captureOptions=()=>{
  optionsSnapshot={prefs:{...prefs},fields:Object.fromEntries(nativeOptions.map(key=>[key,id(key).value]))};
 };
 const restoreOptions=()=>{
  if(!optionsSnapshot)return;
  const snap=optionsSnapshot;optionsSnapshot=null;
  prefs={...snap.prefs};trySave(KEY,prefs);
  for(const [field,value] of Object.entries(snap.fields)){
   const el=id(field);if(!el||el.value===value)continue;
   el.value=value;el.dispatchEvent(new Event(field==='volume'?'input':'change',{bubbles:true}));
  }
  syncPrefs();
 };
 const closeOptions=()=>{const cancel=id('settingsScreen').querySelector('[data-close]');if(cancel)cancel.click()};
 id('settingsScreen').querySelector('[data-close]').addEventListener('click',restoreOptions,true);
 id('optionsApply').addEventListener('click',()=>{optionsSnapshot=null;persistPrefs();closeOptions()});
 id('optionsCloseX').addEventListener('click',closeOptions);
 const originalSettings=id('settingsBtn').onclick;
 id('settingsBtn').onclick=()=>{
  captureOptions();
  if(typeof originalSettings==='function')originalSettings();else id('settingsScreen').classList.remove('hidden');
  activateOptions('multiplayer');syncPrefs();
 };
 // In-match settings are opened by Phase13 directly, not through settingsBtn.
 id('settingsGameBtn').addEventListener('click',()=>{
  captureOptions();queueMicrotask(()=>{if(!id('settingsScreen').classList.contains('hidden')){activateOptions('multiplayer');syncPrefs()}});
 },true);
 const openStatus=msg=>{id('offlineNotice').textContent=msg};
 id('findServersBtn').addEventListener('click',()=>openStatus('Find Servers requires network multiplayer. BLOCK STRIKE currently supports offline bot matches only.'));
 id('quitBtn').addEventListener('click',()=>id('quitDialog').classList.remove('hidden'));
 const hideQuit=()=>id('quitDialog').classList.add('hidden');
 id('quitClose').onclick=id('quitBack').onclick=hideQuit;
 id('quitExitMatch').onclick=()=>{
  hideQuit();if(typeof pauseToMenu==='function')pauseToMenu();
  over=true;id('resumeBtn').classList.add('hidden');openStatus('Match closed. Choose New Game to start a fresh local game.');
 };
 function syncRules(){
  id('matchC4Time').value=String(rules.c4Seconds);
  id('matchRoundTime').value=String(rules.roundSeconds);
  id('matchBuyTime').value=String(rules.buyTime);id('matchFreezeTime').value=String(rules.freezeTime);
  id('matchStartMoney').value=String(rules.startMoney);
 }
 function saveRules(){
  rules={c4Seconds:fromAllowed(id('matchC4Time').value,permittedC4,45),roundSeconds:fromAllowed(id('matchRoundTime').value,permittedRounds,120),
   buyTime:fromAllowed(id('matchBuyTime').value,permittedBuy,15),freezeTime:fromAllowed(id('matchFreezeTime').value,[0,3,6,10],6),
   startMoney:fromAllowed(id('matchStartMoney').value,permittedMoney,800)};
  trySave(RULE_KEY,rules);
 }
 for(const control of ['matchRoundTime','matchBuyTime','matchStartMoney','matchC4Time','matchFreezeTime'])id(control).addEventListener('change',saveRules);
 // Phase10 is the owner of actual bot count/difficulty. Keep both UI fields in sync.
 const total=id('matchPlayers'),botInput=id('matchBotCount'),botDiff=id('matchDifficulty');
 const syncBotCount=()=>{botInput.value=String(Math.max(1,Number(Phase10.config.players)-1))};
 total.addEventListener('input',syncBotCount);
 total.addEventListener('change',syncBotCount);
 botInput.addEventListener('input',()=>{if(botInput.value==='')return;Phase10.setConfig({players:number(botInput.value,15,1,31)+1});syncBotCount()});
 botInput.addEventListener('change',()=>{Phase10.setConfig({players:number(botInput.value,15,1,31)+1});syncBotCount()});
 botDiff.addEventListener('change',()=>Phase10.preview());
 let createSnapshot=null,scanToken=0,catalog=null,importing=false,scanning=false;
 const mapSelect=id('createMap'),bspFile=id('bspFile'),bspWads=id('bspWads'),bspWaypoints=id('bspWaypoints');
 let saved=[],showImport=false,overviewToken=0;
 function modeLabel(mode){return mode==='bomb'?'Bomb Defusal':'Team Elimination'}
 function syncMap(){
  const record=saved.find(m=>m.id===mapSelect.value);
  id('dustMapPreview').classList.toggle('hidden',!!record||showImport);
  id('bspImport').classList.toggle('hidden',!showImport);
  id('removeSavedMap').classList.toggle('hidden',!record||showImport);
  id('repairMapWads').classList.toggle('hidden',!record?.report?.missing?.length||showImport);id('repairMapWads').disabled=importing;
  id('savedMapReport').classList.toggle('hidden',!record||showImport);
  id('createMode').value=modeLabel(record?.mode);
  id('matchC4Time').disabled=record?.mode!=='bomb';
  id('continueMatchConfig').disabled=importing;
  if(record){
   const {missing,warnings,nav}=record.report||{missing:[],warnings:[],nav:'generated'};
   id('savedMapReport').textContent=[modeLabel(record.mode),(record.report?.navRevision===16?nav+' bot routes':'Navigation will be rechecked on Start'),
    record.report?.navRevision===16&&record.report.globalWads?.length?'Global WAD: '+record.report.globalWads.join(', '):'',
    record.report?.navRevision===16&&missing.length?'Missing textures: '+missing.join(', '):'',...(record.report?.navRevision===16?warnings:[]),
    record.report?.navRevision!==16?'Saved report from previous version; navigation is rechecked on Start.':''].filter(Boolean).join(' · ');
  }
  const canvas=id('savedMapOverview'),token=++overviewToken;
  canvas.classList.add('hidden');
  if(record?.report?.overview&&!showImport){
   MapLibrary.preview(record.id).then(image=>{
    if(!image||token!==overviewToken)return;
    const context=canvas.getContext('2d');
    context.clearRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    canvas.classList.remove('hidden');
   }).catch(()=>{});
  }
 }
 async function refreshMaps(selected=mapSelect.value){
  try{
   saved=await MapLibrary.list();
   saved.sort((a,b)=>a.name.localeCompare(b.name)||a.path.localeCompare(b.path));
   for(const option of [...mapSelect.options])if(option.value!=='dust_block')option.remove();
   for(const record of saved){
    const option=new Option(record.name+' · '+modeLabel(record.mode),record.id);
    option.title=record.path;
    mapSelect.add(option);
   }
   mapSelect.value=saved.some(m=>m.id===selected)?selected:'dust_block';
  }catch(err){
   showImport=true;
   id('bspStatus').textContent='Map storage unavailable: '+err.message;
  }
  syncMap();
 }
 function syncImportButtons(){
  const options=[...id('mapCandidates').querySelectorAll('input:not(:disabled)')];
  id('importAllMaps').disabled=importing||!options.length;
  id('importSelectedMaps').disabled=importing||!options.some(input=>input.checked);
  bspFile.disabled=bspWads.disabled=bspWaypoints.disabled=importing||scanning;
 }
 function listCandidates(){
  const list=id('mapCandidates');list.replaceChildren();
  for(const [i,map] of (catalog?.maps||[]).entries()){
   const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span');
   box.type='checkbox';box.value=String(i);box.disabled=!!map.issue;box.checked=!map.issue;
   text.textContent=map.entry.path+' · '+(map.issue||modeLabel(map.info.mode));
   label.append(box,text);list.append(label);
  }
  syncImportButtons();
 }
 async function scanFiles(){
  const file=bspFile.files[0],token=++scanToken;
  catalog?.source.close();catalog=null;listCandidates();
  if(!file)return;
  scanning=true;syncImportButtons();
  id('bspStatus').textContent='Reading map directory…';
  try{
   const result=await MapImporter.scan(file,message=>{if(token===scanToken)id('bspStatus').textContent=message});
   if(token!==scanToken){result.source.close();return}
   catalog=result;listCandidates();
   const count=result.maps.filter(m=>!m.issue).length;
   id('bspStatus').textContent=count+' candidate'+(count===1?'':'s')+' found. Select maps to import.';
  }catch(err){if(token===scanToken)id('bspStatus').textContent=err.message}
  finally{if(token===scanToken){scanning=false;syncImportButtons()}}
 }
 async function importMaps(all){
  if(importing||!catalog)return;
  const indexes=[...id('mapCandidates').querySelectorAll('input:not(:disabled)')].filter(input=>all||input.checked).map(input=>+input.value);
  if(!indexes.length)return;
  importing=true;syncImportButtons();syncMap();
  const status=id('bspStatus'),failures=[];
  const companion=[...bspWads.files,...bspWaypoints.files];
  let completed=0,last=null;
  for(const [i,n] of indexes.entries()){
   const map=catalog.maps[n],prefix='Map '+(i+1)+' / '+indexes.length+' · ';
   status.textContent=prefix+map.entry.path;
   try{
    const record=await MapImporter.importMap(catalog,map,companion,message=>status.textContent=prefix+message);
    completed++;last=record.id;
   }catch(err){failures.push(map.entry.path+': '+err.message)}
  }
  importing=false;syncImportButtons();
  status.textContent=[completed+' map'+(completed===1?'':'s')+' saved.',...failures].join(' ');
  if(last){
   catalog.source.close();catalog=null;bspFile.value='';listCandidates();
   await refreshMaps(last);
   status.textContent=[completed+' map'+(completed===1?'':'s')+' saved.',...failures].join(' ');
  }
  syncMap();
 }
 mapSelect.addEventListener('change',()=>{showImport=false;syncMap()});
 id('openMapImport').onclick=()=>{showImport=!showImport;syncMap()};
 id('removeSavedMap').onclick=async()=>{
  const record=saved.find(m=>m.id===mapSelect.value);
  if(!record||!confirm('Delete the local map '+record.name+'?'))return;
  try{await MapLibrary.remove(record.id);await refreshMaps('dust_block')}
  catch(err){showImport=true;id('bspStatus').textContent=err.message;syncMap()}
 };
 id('repairMapWads').onclick=()=>id('repairWadFiles').click();
 id('repairWadFiles').addEventListener('change',async event=>{
  const selected=mapSelect.value,files=[...event.target.files];event.target.value='';if(!files.length||importing)return;
  importing=true;syncMap();id('savedMapReport').textContent='Checking local WAD dependencies…';
  try{await MapImporter.repairWads(selected,files);await refreshMaps(selected)}
  catch(err){id('savedMapReport').textContent='WAD repair: '+err.message}
  finally{importing=false;id('continueMatchConfig').disabled=false;id('repairMapWads').disabled=false}
 });
 bspFile.addEventListener('change',scanFiles);
 id('mapCandidates').addEventListener('change',syncImportButtons);
 id('importSelectedMaps').onclick=()=>importMaps(false);
 id('importAllMaps').onclick=()=>importMaps(true);
 const openCreate=()=>{
  if(typeof Phase10==='undefined')return;
  createSnapshot={config:{...Phase10.config},rules:{...rules}};
  id('menu').classList.add('hidden');id('matchConfigScreen').classList.remove('hidden');
  activateCreate('server');
  selectedMapId='dust_block';showImport=false;syncMap();void refreshMaps();
  syncRules();Phase10.preview();syncBotCount();
 };
 id('go').onclick=openCreate;
 id('selectMapBtn').onclick=openCreate;
 id('createClose').onclick=()=>id('backMatchConfig').click();
 id('backMatchConfig').addEventListener('click',()=>{
  if(!createSnapshot)return;
  Phase10.setConfig(createSnapshot.config);
  rules=createSnapshot.rules;trySave(RULE_KEY,rules);syncRules();syncBotCount();
  createSnapshot=null;
 });
 id('continueMatchConfig').addEventListener('click',()=>{
  saveRules();selectedMapId=mapSelect.value;createSnapshot=null;
 });
 // Prevent accidental keyboard shots when changing settings during gameplay.
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(!id('quitDialog').classList.contains('hidden')){event.stopImmediatePropagation();event.preventDefault();hideQuit();return}
  if(!id('settingsScreen').classList.contains('hidden')){event.stopImmediatePropagation();event.preventDefault();closeOptions();return}
  if(!id('matchConfigScreen').classList.contains('hidden')){event.stopImmediatePropagation();event.preventDefault();id('backMatchConfig').click()}
 },true);
 syncPrefs();syncRules();syncBotCount();syncMap();
 window.PhaseMenu15={get rules(){return {...rules}},get playerName(){return name()},openCreate,saveRules,openOptions:()=>id('settingsBtn').click()};
})();
