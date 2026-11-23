/* Local character cosmetics. Eight existing slots; no gameplay data or upload. */
const CharacterImport=(()=>{'use strict';
 const IDS=['urban','gsg9','sas','gign','arctic','guerilla','leet','terror'], SLOTS=[...IDS,'announcer','female-voice'];
 const urls=new Map();let revision=0,match=null,matchMode=null,matchRevision=-1;
 const MODE_KEY='bs.characterSource',modes=['stock','mod','legacy'];
 let mode='mod';try{const saved=localStorage.getItem(MODE_KEY);mode=modes.includes(saved)?saved:localStorage.getItem('block-strike-classic-characters')==='off'?'legacy':'mod'}catch(_){}
 const knownFemale=new Set(['7841bd4d49e3ec6fd86a50d65359a4f479c085e3895ae35661d94c0b06048aec','82ad2ac26ef1a5621267174fd89e5e07715a1dba8ca1f121036c27972aebce45','a725036c5ed39f72064b5ff374b6a8dad2e6a3db5820d3880e1184187c1f9408']);
 const knownMale=new Set(['cbff76e9988ddd269954caefa4beb73dd2978bef2a601e188fca70d62a5767aa','344e4f5a60461bc517389652150f96d80de2798e2bff1335406d88fa6bd5eccd','b6992c7c8221eabdd0ec4a821fb039de8c2c075df32ba2cd7e675067dd55098f','2087dffbf82014755753b250199230860953c6e03ecb839c29b79bb8ea0cd496','dbaecae8d86abefcfb3dea263706f00807e919dd050663cdfc0e0c6b9b370235']);
 const genderValue=v=>['female','male'].includes(v)?v:'unknown';
 async function knownGender(bytes){try{const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');return knownFemale.has(hash)?'female':knownMale.has(hash)?'male':null}catch(_){return null}}
 function setMode(value){if(!modes.includes(value))return mode;if(mode!==value){mode=value;try{localStorage.setItem(MODE_KEY,value)}catch(_){}changed()}return mode}
 async function beginMatch(){await library.settled();match=new Map(library.rows);matchMode=mode;matchRevision=revision;}
 const active=id=>mode==='mod'?library.rows.get(id):undefined;
 const effective=(id,runtime)=>runtime&&match?matchMode==='mod'?match.get(id):undefined:active(id);

 const base=s=>String(s).replaceAll('\\','/').split('/').pop().toLowerCase();
 const library=ModPacks.create({database:'block-strike-character-skins',selectionKey:'bs.characterPack',slots:SLOTS,defaultName:'Default Character Mods',normalize:async r=>{if(r.model&&!r.gender){const gender=await knownGender(await r.model.arrayBuffer());r={...r,gender:gender||'unknown',knownGender:gender||null}}return r},onChange:changed});
 const ready=library.ready;
 function changed(){revision++;for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();document.dispatchEvent(new Event('blockstrike:character-change'))}
 function mergeTextures(main,companion){const a=new DataView(main);if(a.byteLength<244||a.getUint32(0,true)!==0x54534449||a.getInt32(4,true)!==10)throw Error('Invalid GoldSrc MDL');if(a.getInt32(180,true)>0)return main;if(!companion)throw Error('Missing companion texture MDL (*T.mdl)');const b=new DataView(companion);if(b.byteLength<244||b.getUint32(0,true)!==0x54534449||b.getInt32(4,true)!==10)throw Error('Invalid texture MDL');const n=b.getInt32(180,true),at=b.getInt32(184,true);if(n<1||n>512||at<244||at+n*80>b.byteLength)throw Error('Invalid texture table');const out=new Uint8Array(main.byteLength+companion.byteLength);out.set(new Uint8Array(main));out.set(new Uint8Array(companion),main.byteLength);const v=new DataView(out.buffer);v.setInt32(72,out.length,true);for(const o of [180,192,196])v.setInt32(o,b.getInt32(o,true),true);for(const o of [184,188,200])v.setInt32(o,main.byteLength+b.getInt32(o,true),true);for(let i=0;i<n;i++){const p=main.byteLength+at+i*80+76,old=v.getInt32(p,true);if(old<0||old>=b.byteLength)throw Error('Invalid texture offset');v.setInt32(p,main.byteLength+old,true)}return out.buffer}
 function groupFor(name){if(/\bHead\b/i.test(name))return 1;if(/Pelvis|Spine1?$/i.test(name))return 3;if(/Spine|Neck|Breast/i.test(name))return 2;if(/Clavicle|Arm|Hand|Finger/i.test(name))return /(?:\bL\b|^L )/.test(name)?4:5;if(/Thigh|Calf|Foot|Toe|Hip/i.test(name))return /(?:\bL\b|^L )/.test(name)?6:7;return 0}
 function boxes(parsed){const v=parsed.view,n=v.getInt32(156,true),at=v.getInt32(160,true);if(n<1||n>256||at<244||at+n*32>v.byteLength)throw Error('Character has no valid hitboxes');const rows=[];for(let i=0;i<n;i++){const p=at+i*32,b=parsed.bones[v.getInt32(p,true)];if(!b)throw Error('Invalid hitbox bone');let g=v.getInt32(p+4,true);if(g===0)g=groupFor(b.name);const bounds=Array.from({length:6},(_,j)=>v.getFloat32(p+8+4*j,true));if(g<1||g>8||bounds.some(x=>!Number.isFinite(x)||Math.abs(x)>150)||bounds.slice(0,3).some((x,j)=>bounds[j+3]<=x))continue;rows.push([b.name,g,...bounds])}if(![1,2,3,6,7].every(g=>rows.some(r=>r[1]===g)))throw Error('Missing vital body hitgroups');if(!rows.some(r=>r[1]===8))rows.push(['Bip01 L Hand',8,-16.1,-6.5,-19,10.6,1.5,33]);return rows}
 function parseModel(buffer,id){const p=GoldSrcMDL10.parse(buffer,id),names=new Set(p.bones.map(b=>b.name)),seq=new Set(p.sequences.map(s=>s.name));if(!['Bip01 Head','Bip01 Spine2','Bip01 L Hand','Bip01 R Hand'].every(n=>names.has(n))||!['idle1','run','walk','crouchrun','ref_aim_knife','death1'].every(n=>seq.has(n)))throw Error('Incompatible CS 1.6 character skeleton/animations');if(p.sequences.reduce((a,s)=>a+s.frames,0)*p.bones.length>450000)throw Error('Character animation exceeds limit');return {p,rows:boxes(p)}}
 async function modelFor(id,THREE,runtime=false){await ready;const r=effective(id,runtime);if(!r?.model)return null;const {p,rows}=parseModel(await r.model.arrayBuffer(),id);const g=GoldSrcMDL10.build(p,THREE,{character:true});g.scene.position.y=1.0283;g.scene.userData.characterBoxes=rows;g.scene.userData.characterVoice={id,gender:genderValue(r.gender)};g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(o.isSkinnedMesh)o.castShadow=true});return g}
 function attach(b,THREE,material){const rows=b.body?.userData?.characterBoxes;if(!rows)return false;const groups=['generic','head','chest','stomach','arm','arm','leg','leg','shield'];for(const [name,g,x,y,z,X,Y,Z] of rows){const bone=b.body.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));if(!bone)continue;const m=new THREE.Mesh(new THREE.BoxGeometry(X-x,Y-y,Z-z),material);m.position.set((x+X)/2,(y+Y)/2,(z+Z)/2);m.visible=false;m.userData={bot:b,part:groups[g],studioHitgroup:g};bone.add(m);if(g===8)b.shieldPart=m;else b.parts.push(m)}b.nativeHitboxes=true;return true}
 async function readFiles(files){if(!files.length)throw Error('Choose files');if(files.some(f=>/\.(7z|rar)$/i.test(f.name)))throw Error('Extract RAR/7z first or use a ZIP');const result=[];let total=0;const take=async(name,size,read)=>{if(!/\.(mdl|wav|mp3|ogg|jpg|jpeg|png)$/i.test(name))return;if(size>8*1024*1024||(total+=size)>48*1024*1024)throw Error('Import exceeds 48 MiB');result.push({name,buffer:await read()})};if(files.length===1&&/\.zip$/i.test(files[0].name)){const z=MapImporter.openZip(files[0]);try{const entries=await z.list();if(entries.length>1024)throw Error('Too many files');for(const e of entries){if(e.issue&&/\.(mdl|wav|mp3|ogg|jpg|jpeg|png)$/i.test(e.path))throw Error(e.issue);await take(e.path,e.bytes,()=>z.read(e))}}finally{z.close()}}else{if(files.some(f=>/\.zip$/i.test(f.name)))throw Error('Choose one ZIP at a time');for(const f of files)await take(f.name,f.size,()=>f.arrayBuffer())}return result}
 function stem(name){return base(name).replace(/\.(wav|mp3|ogg)$/i,'')}
 function audioFiles(files){const result={};for(const f of files){if(!/\.(wav|mp3|ogg)$/i.test(f.name))continue;const name=stem(f.name);if(!/^[a-z0-9_-]{1,80}$/.test(name))continue;const v=new Uint8Array(f.buffer);if(v.length<12)throw Error('Invalid audio '+name);const ext=base(f.name).split('.').pop();if(ext==='wav'&&(String.fromCharCode(...v.slice(0,4))!=='RIFF'||String.fromCharCode(...v.slice(8,12))!=='WAVE'))throw Error('Invalid WAV '+name);const path=f.name.replaceAll('\\','/').toLowerCase(),channel=/(^|\/)bot\//.test(path)?'bot/':/(^|\/)radio\//.test(path)?'radio/':/(^|\/)player\//.test(path)?'player/':'';result[channel+name]=new Blob([f.buffer],{type:ext==='wav'?'audio/wav':ext==='ogg'?'audio/ogg':'audio/mpeg'})}return result}
 // A shared female pack never enters a male/unknown/announcer slot.
 const femaleAudioHashes=new Set(["0a82ac9578638e394f434a87847a1b115aa78d965c4e3449b9c8cf23c090e502","13e610d20ac0bf7f9519c4a5feeb9a96c5058e3185eced7cb9e7444a2aa9eae1","1e5b29d8aa03ce014ec850643e27731c9f54d2334292879290270b9547bf8d22","1f4b9815b13d8fe5b2091ff2558a05ef53f1bae399f68a7cd441fb39b323ddc4","2026d9f83426fc43b69656f6a1c265055b766dba7dde2cf9347a741fbc9b0d7c","290276459365426b08b172e3e94e3b818d632ca3d0488f41b468a08ffc86d618","31faeb67d013c0ca89ff08043855390af3c3ae3f12a697d12375dc07c7d73c64","352f32b71ceed7863681f8f05c51b15fd33cc47917d643f3945d1be2e146a9e1","413f51e4c6a6bd7fbb050c3a7e8964a7fdf04634ab2e531075eb8d742118ebfd","4ecf423d4f6bbdec887308cef9b329b0e8b96aa03f0dd4d771fedf8162d832df","4f0e378cfabf93074b2572731441a36eeaba7abe30b84f8ac742b5952be52e73","56f9c96b795ff257a778b95217d728a2eec33fd83e02124fb09cdfde143cbfff","6fb326e44329c1bd088bf7c1c7b1176b27ed2b69930ba198e56996356c4c842f","80d47161a9c96bf41532e06d36272c2551d2a5f10273eb3214c8ca987fdd0419","8185d2d718301feeb13fefc6f7b0a50838ca637c9bdec39e6a445a4819b08d2e","990ddf55a3bd8506f34a36cdb7f83c91653cebdf362db2adda47fd24f39015e5","a6f21d0124991ca2d220634106605750c832ad8fdd3a3ae22de272f1ac6be640","a7054b43d1a8c7459f4635baf9a9692cfc9aa5280f86f7af9c075367381b7d5e","a8508710db496b0601faeec9763505645cd619179e9047928830283e1f2f1383","b02fcdfddb426a36b6d5e26987222d65c41f7b0c0da675625a100d61b6b4751a","b87205a57b69d30c9c91d72d5a4a29230dd74468e2804a2128713058f9f335b3","c95464c943c809d08e9b4765a971e641a7a548bf70126fff7a780fcb3ad487fd","d543551c891f02cba74d220e6c3cf29332cc87ab7a58e6ccac5399e51dc667c6","d7f2b4ec22231268c945dfadf4055223b3a98df13324d3b929186705a3a5ea46","dc4453ae5b23c5711c10bbdc1bc3c2308cd55b8d021d89b8500a6b87ce8052a1","e3207c6cc5f6c36641564b86308b627467f273cbd89023192e909fa75b9f66bd","e85b91d70b40a9ec7e765d33907cf282548d7c631fcd48acefcd73d627c66f9c"]);
 async function containsKnownFemaleAudio(entries){for(const f of entries){if(!/\.(wav|mp3|ogg)$/i.test(f.name))continue;try{const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',f.buffer)),v=>v.toString(16).padStart(2,'0')).join('');if(femaleAudioHashes.has(h))return true}catch(_){}}return false}
 const femalePackPattern=/point[ _-]*blank[ _-]*female[ _-]*radio|female[ _-]*radio/i;
 const aliases={target_spotted:'ct_enemys',attacking_enemies:'stormfront',i_could_use_some_help:'ct_backup',taking_fire_need_assistance2:'ct_backup',need_help:'ct_backup',cover_me:'ct_coverme',enemy_down:'enemydown',got_him:'enemydown',affirmative:'ct_affirm',roger:'roger',roger_that:'roger',ok_cmdr_lets_go:'com_go',ok_sir_lets_go:'com_go',all_clear_here:'clear',area_clear:'clear',clear:'clear',reporting_in:'ct_reportingin',attacking:'stormfront',returning_fire:'fireassis',negative:'negative'};
 function install(slot,files,label='',gender='unknown'){return library.exclusive(async pack=>{
  const records=library.rows;const entries=await readFiles(files),modelEntries=entries.filter(f=>/\.mdl$/i.test(f.name)),sounds=audioFiles(entries);
  const femaleArchive=[...files,...entries].some(f=>femalePackPattern.test(f.name))||await containsKnownFemaleAudio(entries);
  if(femaleArchive&&slot!=='female-voice')throw Error('Female radio pack: select Female voice pack (women only)');
  if(slot==='female-voice'||slot==='announcer'){
   if(modelEntries.length||!Object.keys(sounds).length)throw Error('Voice pack accepts audio only');
   if(slot==='announcer'&&femaleArchive)throw Error('Female character radio is not an announcer pack');
   await library.save(pack,[{id:slot,name:String(label|| (slot==='female-voice'?'Female voice pack':'Announcer')).slice(0,70),sounds:{...records.get(slot)?.sounds,...sounds}}]);return 1;
  }
  const selected=slot==='all'?IDS:[slot];if(selected.some(id=>!IDS.includes(id)))throw Error('Unknown slot');
  const rows=[];for(const id of selected){
   const own=modelEntries.find(f=>base(f.name)===id+'.mdl'),main=own||(slot!=='all'&&modelEntries.length?modelEntries.find(f=>f.buffer.byteLength>=244&&new DataView(f.buffer).getInt32(140,true)>0):null);
   if(slot==='all'&&!main)continue;
   const old=records.get(id)||{id};const r={...old,id,name:String(label||old.name||'Custom '+id).slice(0,70)};
   if(main){const companion=modelEntries.find(f=>base(f.name)===base(main.name).replace(/\.mdl$/,'t.mdl')),merged=mergeTextures(main.buffer,companion?.buffer);parseModel(merged,id);
    const known=await knownGender(merged);r.model=new Blob([merged]);r.gender=known||genderValue(slot==='all'?'unknown':gender);r.knownGender=known||null;
    // A replacement model is a new identity; do not carry voice/portrait from the old model.
    delete r.sounds;delete r.voiceGender;delete r.image;
    r.name=String(label||base(main.name).replace(/\.mdl$/,'')).slice(0,70);
   }
   if(slot!=='all'){
    if(Object.keys(sounds).length){if(!r.model||!['male','female'].includes(r.gender))throw Error('Import a model and choose Male or Female before importing slot voices');r.sounds={...r.sounds,...sounds};r.voiceGender=r.gender}
    const pic=entries.find(f=>/\.(jpg|jpeg|png)$/i.test(f.name));if(pic)r.image=new Blob([pic.buffer],{type:/\.png$/i.test(pic.name)?'image/png':'image/jpeg'});
    if(!main&&!Object.keys(sounds).length&&!pic)throw Error('No supported model, voice or portrait found');
   }
   rows.push(r);
  }
  if(!rows.length)throw Error('No matching character slots found');await library.save(pack,rows);return rows.length;
 })}
 function setGender(id,gender){return library.exclusive(async pack=>{const r=library.rows.get(id);if(!IDS.includes(id)||!r?.model)throw Error('Import a model first');const value=genderValue(gender);if(r.knownGender&&r.knownGender!==value)throw Error('Gender is fixed for the recognized Point Blank model');await library.save(pack,[{...r,gender:value}]);})}
 function exact(sounds,channel,key){return sounds?.[channel+'/'+key]||sounds?.[key]||null}
 function audio(identity,channel,key){
  // Runtime identity comes from the model actually loaded for this actor. A failed
  // model, stock skin, anonymous bot or unknown gender cannot use female radio.
  if(!match||matchMode!=='mod')return null;
  if(identity==='announcer')return exact(match.get('announcer')?.sounds,channel,key);
  if(!identity||!IDS.includes(identity.id))return null;
  const r=match.get(identity.id),g=genderValue(identity.gender);if(!r?.model||g==='unknown'||g!==r.gender)return null;
  const own=r.voiceGender===g?exact(r.sounds,channel,key):null;if(own)return own;
  if(g!=='female')return null;
  const pack=match.get('female-voice')?.sounds;
  return exact(pack,channel,key)||(channel==='bot'&&aliases[key]?exact(pack,'radio',aliases[key]):null)||(channel==='player'&&key==='pain'?exact(pack,'player','pl_pain2'):null)||(channel==='player'&&key==='death'?exact(pack,'player','die1'):null);
 }
 function image(id){const blob=active(id)?.image;if(!blob)return null;if(!urls.has(id))urls.set(id,URL.createObjectURL(blob));return urls.get(id)}
 return Object.freeze({IDS,SLOTS,ready,install,modelFor,attach,audio,image,active,library,installed:id=>library.rows.get(id),setGender,setMode,beginMatch,get mode(){return mode},get matchMode(){return matchMode},get voiceRevision(){return matchRevision},reset:id=>library.exclusive(pack=>library.save(pack,[],id==='all'?IDS:[id])),get revision(){return revision},mergeTextures,parseModel});
})();
