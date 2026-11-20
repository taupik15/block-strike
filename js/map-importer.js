/* Map import and dependency lookup shared by ZIP and loose files. */
const MapImporter=(()=>{
 const MiB=1024*1024,limit=88*MiB;
 const pathKey=path=>path.replaceAll('\\','/').toLowerCase();
 const basename=path=>pathKey(path).split('/').at(-1);
 const stem=path=>basename(path).replace(/\.[^.]+$/,'');
 const ident=path=>'saved:'+pathKey(path);
 const ext=path=>basename(path).split('.').at(-1);
 function zip(file){
  const worker=new Worker('js/map-zip-worker.js'),jobs=new Map();
  let id=0;
  worker.onmessage=({data})=>{
   const job=jobs.get(data.request);if(!job)return;
   jobs.delete(data.request);
   if(data.error)job.reject(Error(data.error));else job.resolve(data.value);
  };
  worker.onerror=()=>{
   for(const job of jobs.values())job.reject(Error('Map ZIP worker failed.'));
   jobs.clear();
  };
  function send(args){
   const request=++id;
   return new Promise((resolve,reject)=>{jobs.set(request,{resolve,reject});worker.postMessage({request,...args})});
  }
  return {list:()=>send({file}),read:entry=>send({id:entry.id}),close:()=>{
   for(const job of jobs.values())job.reject(Error('Import cancelled.'));
   jobs.clear();worker.terminate();
  }};
 }
 async function scan(file,progress=()=>{}){
  const source=ext(file.name)==='zip'?zip(file):{
   async list(){return [{id:0,path:file.name,bytes:file.size,issue:file.size>32*MiB?'BSP exceeds 32 MiB.':''}]},
   read:()=>file.arrayBuffer(),close(){}
  };
  try{
   const files=await source.list(),bsps=files.filter(f=>ext(f.path)==='bsp');
   if(!bsps.length)throw Error('No BSP files found.');
   if(bsps.length>64)throw Error('Choose a ZIP with at most 64 BSP maps.');
   const maps=[],seen=new Set();
   for(let i=0;i<bsps.length;i++){
    const entry=bsps[i];
    progress('Checking map '+(i+1)+' / '+bsps.length+'…');
    try{
     if(entry.issue)throw Error(entry.issue);
     const key=pathKey(entry.path);
     if(seen.has(key))throw Error('Duplicate ZIP map path.');
     seen.add(key);
     maps.push({entry,info:LocalBSP.inspect(await source.read(entry))});
    }catch(err){maps.push({entry,issue:err.message})}
   }
   return {source,files,maps};
  }catch(err){source.close();throw err}
 }
 function resolver(files,origin){
  const usable=files.filter(f=>!f.issue),base=pathKey(origin).split('/').slice(0,-1);
  const location=entry=>{
   const parts=pathKey(entry.path).split('/').slice(0,-1);
   let common=0;
   while(common<base.length&&common<parts.length&&parts[common]===base[common])common++;
   return common*4-Math.abs(base.length-parts.length);
  };
  return (name,extensions)=>{
   const key=pathKey(name);
   return usable.filter(f=>extensions.includes(ext(f.path))&&(basename(f.path)===basename(key)||stem(f.path)===stem(key)&&!key.includes('.')))
    .sort((a,b)=>{
     const match=e=>pathKey(e.path).endsWith('/'+key)||pathKey(e.path)===key?100:0;
     return match(b)-match(a)||location(b)-location(a)||a.path.localeCompare(b.path);
    })[0];
  };
 }
 async function collect(scan,map,loose=[],progress=()=>{}){
  await GoldSrcSprites.ready?.();
  const {entry,info}=map;
  const files=[...scan.files,...loose.map(file=>({path:file.name,bytes:file.size,file}))];
  const find=resolver(files,entry.path),used=new Set(),loaded=[],notes=[];
  let bytes=0;
  async function add(item,required=false,preloaded=null){
   if(!item||used.has(item))return;
   const sizeLimit=['bsp','wad'].includes(ext(item.path))?32*MiB:8*MiB;
   if(item.bytes>sizeLimit||bytes+item.bytes>limit){
    if(required)throw Error('Map expands beyond the import limit.');
    notes.push('Skipped dependency over memory budget: '+item.path);return;
   }
   used.add(item);
   try{
    const buffer=preloaded||(item.file?await item.file.arrayBuffer():await scan.source.read(item));
    loaded.push({path:item.path,buffer});bytes+=buffer.byteLength;
   }catch(err){
    if(required)throw err;
    notes.push(item.path+': '+err.message);
   }
  }
  await add(entry,true);
  progress('Resolving textures, bot routes and map media…');
  for(const name of info.wad){
   const wad=find(name,['wad']);
   if(wad)await add(wad);
   else notes.push('WAD not found: '+basename(name));
  }
  if(!info.wad.length){
   // Loose WADs and a same-name WAD are explicit dependencies for incomplete BSPs.
   for(const file of files.filter(f=>ext(f.path)==='wad'&&(f.file||stem(f.path)===stem(entry.path))))await add(file);
  }else for(const file of files.filter(f=>f.file&&ext(f.path)==='wad'))await add(file);
  const unmatched=new Set(info.externalTextures.filter(name=>!find(name+'.png',['png'])));
  function resolvedBy(buffer,commit){
   let matches=false;
   try{
    for(const name of LocalBSP.wadNames(buffer))if(unmatched.has(name)){matches=true;if(commit)unmatched.delete(name)}
   }catch(_){}
   return matches;
  }
  for(const wad of loaded.filter(f=>ext(f.path)==='wad'))resolvedBy(wad.buffer,true);
  let probed=0;
  if(unmatched.size)for(const wad of files.filter(f=>!f.issue&&!used.has(f)&&ext(f.path)==='wad').slice(0,16)){
   if(!unmatched.size||probed+wad.bytes>48*MiB)break;
   if(wad.bytes>32*MiB||bytes+wad.bytes>limit)continue;
   probed+=wad.bytes;
   try{
    const buffer=wad.file?await wad.file.arrayBuffer():await scan.source.read(wad);
    if(resolvedBy(buffer,false)){await add(wad,false,buffer);resolvedBy(buffer,true)}
   }catch(err){notes.push(basename(wad.path)+': '+err.message)}
  }
  await add(find(stem(entry.path)+'.pwf',['pwf']));
  await add(find(stem(entry.path)+'.graph',['graph']));
  await add(find(stem(entry.path)+'.nav',['nav']));
  for(const name of [...info.models,...info.sounds]){
   const dep=find(name,[ext(name)]);
   if(dep)await add(dep);
   else if(!LocalMapMedia.reuse(name)&&!(ext(name)==='spr'&&GoldSrcSprites.file(name)))notes.push('Missing map media: '+basename(name));
   if(ext(name)==='mdl'&&dep&&typeof dep.path==='string')await add(find(stem(dep.path)+'t.mdl',['mdl']));
  }
  // The map description maps/<name>.txt is not an overview configuration.
  const overviewCandidates=files.filter(f=>!f.issue&&ext(f.path)==='txt'&&stem(f.path)===stem(entry.path))
   .sort((a,b)=>Number(/(?:^|\/)overviews\//i.test(pathKey(b.path)))-Number(/(?:^|\/)overviews\//i.test(pathKey(a.path))));
  for(const overview of overviewCandidates){
   if(overview.bytes>64*1024)continue;
   try{
    const buffer=overview.file?await overview.file.arrayBuffer():await scan.source.read(overview);
    const text=new TextDecoder().decode(buffer),image=/\bIMAGE\s+"?([^"\s]+)/i.exec(text)?.[1];
    if(!image)continue;
    await add(overview,false,buffer);
    const texture=find(image,['png','bmp','jpg','jpeg','tga','spr']);
    if(texture)await add(texture);
    else notes.push('Missing overview image: '+basename(image));
    break;
   }catch(err){notes.push(basename(overview.path)+': '+err.message)}
  }
  if(info.sky)for(const face of ['ft','bk','up','dn','lf','rt'])await add(find(info.sky+face,['png','tga','bmp','jpg','jpeg']));
  for(const texture of new Set(info.textures))await add(find(texture+'.png',['png']));
  // WAD names in the BSP header are not mandatory when all used textures are resolved.
  return {files:loaded,notes:notes.filter(issue=>unmatched.size||!issue.startsWith('WAD not found:'))};
 }
 async function compile(source){
  await GoldSrcSprites.ready?.();
  const bsp=source.files.find(f=>ext(f.path)==='bsp');
  if(!bsp)throw Error('No BSP in saved map.');
  // Recheck old missing-sprite notes against the active pack; actual decode
  // failures are still reported by LocalMapMedia.compile.
  const wads=[],issues=(source.notes||[]).filter(note=>{
   const match=/^Missing map media: (.+\.spr)$/i.exec(note);
   return !match||!GoldSrcSprites.file(match[1]);
  });
  for(const file of source.files.filter(f=>ext(f.path)==='wad')){
   try{LocalBSP.validateWad(file.buffer);wads.push(file.buffer)}
   catch(err){issues.push(basename(file.path)+': '+err.message)}
  }
  const info=LocalBSP.inspect(bsp.buffer);
  let globalTextures=new Map(),globalUsed=[];
  if(typeof GlobalWads!=='undefined'&&info.externalTextures?.length){
   const local=new Map();for(const buffer of wads)for(const [name,view] of LocalBSP.validateWad(buffer))local.set(name,view);
   const wanted=info.externalTextures.filter(name=>(!local.has(name)||!LocalBSP.validWadTexture(local.get(name),name))&&!source.files.some(f=>basename(f.path)===name+'.png'));
   const resolved=await GlobalWads.resolve(wanted,info.wad,stem(bsp.path),issues);
   globalTextures=resolved.textures;globalUsed=[...resolved.used];
  }
  const data=LocalBSP.parse(bsp.buffer,wads,globalTextures);
  data.globalWads=globalUsed;
  data.name=source.name;
  // Cache is keyed by the exact BSP bytes, not just filename. New map revisions cannot reuse old routes.
  const digest=await crypto.subtle.digest('SHA-256',bsp.buffer);
  const cacheKey='nav-v1:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const mapName=stem(bsp.path);
  let best=null;
  async function attempt(buffer,type,origin,cache=false){
   try{
    const graph=type==='PWF'?LocalBSPNav.fromPwf(buffer,data.col,mapName):type==='NAV v5'?LocalBSPNav.fromNav(buffer,data.col,bsp.buffer.byteLength):LocalBSPNav.fromGraph(buffer,data.col,bsp.buffer.byteLength);
    const check=LocalBSPNav.validate(graph,data.sites);
    if(!best||check.edges>best.check.edges)best={graph,check,origin};
    if(!check.ok){issues.push(origin+': incomplete validated routes ('+check.nodes+' nodes, '+check.edges+' links).');return false}
    data.graph=graph;data.navSource=origin+(graph.author?' · '+graph.author:'');data.navValidation=check;
    if(cache)try{await LocalAssetCache.put(cacheKey,{buffer,type,origin})}catch(e){issues.push('Waypoint cache unavailable: '+e.message)}
    return true;
   }catch(e){issues.push(origin+': '+e.message);return false}
  }
  // Explicit imports take priority over stale BSP-keyed waypoint cache.
  for(const [suffix,type] of [['graph','YaPB GRAPH'],['pwf','PWF'],['nav','NAV v5']]){
   if(data.graph)break;
   const file=source.files.find(f=>ext(f.path)===suffix&&stem(f.path)===mapName);
   if(file)await attempt(file.buffer,type,type+' (imported)',true);
  }
    let prior=null,priorPreferred=false;
  if(!data.graph)try{prior=await LocalAssetCache.get(cacheKey);priorPreferred=!!prior?.buffer&&!/GitHub/i.test(prior.origin||'');if(priorPreferred)await attempt(prior.buffer,prior.type,(prior.origin||prior.type)+' (cached)');}catch(e){issues.push('Waypoint cache unavailable: '+e.message)}
  if(!data.graph){
   try{const buffer=await YaPBWaypoints.bundled(mapName);if(buffer)await attempt(buffer,'YaPB GRAPH','YaPB GRAPH (bundled)',true)}
   catch(e){issues.push('Bundled YaPB lookup: '+e.message)}
  }
  if(!data.graph&&prior?.buffer&&!priorPreferred)await attempt(prior.buffer,prior.type,(prior.origin||prior.type)+' (cached)');
  if(!data.graph&&globalThis.navigator?.onLine!==false){
   try{const buffer=await YaPBWaypoints.download(mapName);await attempt(buffer,'YaPB GRAPH','YaPB GRAPH (GitHub)',true)}
   catch(e){issues.push('YaPB lookup: '+e.message)}
  }
  if(!data.graph){
   const generated=LocalBSPNav.build(data.col),check=LocalBSPNav.validate(generated,data.sites);
   if(check.ok||!best||check.edges>best.check.edges){data.graph=generated;data.navValidation=check;data.navSource='generated'}
   else{data.graph=best.graph;data.navSource=best.origin+' (partial)';data.navValidation=best.check}
  }
  if(!data.navValidation.ok)issues.push('Bot navigation incomplete: spawn/bombsite connectivity not verified. Import matching PWF/GRAPH/NAV.');
  await LocalMapMedia.compile(data,info,source.files,issues);
  // WAD declarations can include unused packages; only warn when a texture remains unresolved.
  data.warnings.push(...new Set(issues.filter(issue=>!issue.startsWith('WAD not found:')||(data.missing.length&&!globalUsed.includes(basename(issue.slice(15)))))));
  return data;
 }
 async function importMap(catalog,map,loose,progress){
  const source=await collect(catalog,map,loose,progress);
  const record={id:ident(map.entry.path),name:map.entry.path.split('/').at(-1).replace(/\.bsp$/i,''),
   path:map.entry.path,mode:map.info.mode,notes:source.notes};
  const data=await compile({...source,name:record.name});
  record.report={missing:data.missing,warnings:data.warnings,nav:data.navSource,overview:data.overviewPath||null,globalWads:data.globalWads,navRevision:15};
  try{await MapLibrary.save(record,source.files);return record}
  finally{disposePreview(data)}
 }
 function disposePreview(data){
   const textures=new Set();const add=t=>{if(t?.isTexture)textures.add(t)};
   for(const mesh of data.meshes){add(mesh.map);add(mesh.lightmap)}
   Object.values(data.sky||{}).forEach(add);
   for(const sprite of data.media?.sprites?.values()||[])for(const frame of sprite.frames||[])add(frame.map);
   for(const model of data.media?.models?.values()||[])if(Array.isArray(model))for(const mesh of model)add(mesh.map);
   for(const t of textures)t.dispose();
 }
 // Repair an existing saved map without changing its identity or BSP-keyed nav cache.
 async function repairWads(id,inputs){
  if(!inputs.length||inputs.length>16)throw Error('Choose 1–16 WAD3 files.');
  const saved=await MapLibrary.load(id),files=saved.files.slice();
  const baseFile=files.find(f=>ext(f.path)==='bsp');if(!baseFile)throw Error('Saved BSP missing.');
  const wanted=new Set(saved.report?.missing||LocalBSP.inspect(baseFile.buffer).externalTextures);
  if(!wanted.size)throw Error('No missing texture dependencies in this map.');
  const added=[];
  for(const input of inputs){
   if(ext(input.name)!=='wad'||input.size>32*MiB)throw Error('Expected WAD3 file within 32 MiB.');
   const buffer=await input.arrayBuffer();LocalBSP.validateWad(buffer);
   if(!Array.from(LocalBSP.wadNames(buffer)).some(n=>wanted.has(n)))continue;
   const index=files.findIndex(f=>ext(f.path)==='wad'&&basename(f.path)===basename(input.name));
   if(index>=0)files.splice(index,1);
   files.push({path:'local-wads/'+basename(input.name),buffer});added.push(basename(input.name));
  }
  if(!added.length)throw Error('Selected WADs do not contain the missing textures.');
  if(files.reduce((sum,f)=>sum+f.buffer.byteLength,0)>limit)throw Error('Map expands beyond the import limit.');
  const notes=(saved.notes||[]).filter(note=>!added.some(name=>note.toLowerCase()==='wad not found: '+name));
  const data=await compile({...saved,notes,files});
  try{
   if(data.missing.length>=wanted.size)throw Error('Selected WADs did not resolve additional textures. Existing map kept.');
   const {files:oldFiles,...record}=saved;
   record.notes=notes;record.report={missing:data.missing,warnings:data.warnings,nav:data.navSource,overview:data.overviewPath||null,globalWads:data.globalWads,navRevision:15};
   await MapLibrary.save(record,files);return record;
  }finally{disposePreview(data)}
 }
 return {scan,importMap,compile,repairWads,openZip:zip};
})();
