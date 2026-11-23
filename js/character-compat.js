/* 22A: capability checks and a rigid, raycastable humanoid when a character rig cannot load/render. */
const CharacterCompat=(()=>{
 const notes=new Map();let caps=null;
 function reset(renderer){notes.clear();caps=renderer?.capabilities||null;}
 function record(id,reason){const message=String(reason?.message||reason||'unavailable').replace(/[\r\n]+/g,' ').slice(0,180);if(notes.get(id)!==message){notes.set(id,message);console.warn('[Character compatibility]',id,message);}}
 function summary(){return [...notes].map(([id,reason])=>id+': '+reason);}
 function reasonFor(id){return notes.get(id)||'';}
 // Three r128 uses floor((MAX_VERTEX_UNIFORM_VECTORS-20)/4) without float vertex textures.
 function check(g,cap=caps){
  if(!g?.scene?.traverse||!Array.isArray(g.animations))return 'Missing scene or animations';
  let meshes=0,skinned=0,reason='';
  g.scene.traverse(o=>{
   if(!o.isMesh||!o.geometry?.attributes?.position?.count)return;
   meshes++;if(!o.isSkinnedMesh)return;skinned++;
   const n=o.skeleton?.bones?.length||0;
   if(!n||!o.geometry.attributes.skinIndex||!o.geometry.attributes.skinWeight){reason='Invalid skin/bone attributes';return;}
   if(!cap)return;
   if(cap.floatVertexTextures){const size=Math.max(4,Math.ceil(Math.sqrt(n*4)/4)*4);if(n>1024||size>cap.maxTextureSize)reason='Bone texture exceeds GPU limits ('+n+')';}
   else if(Number.isFinite(cap.maxVertexUniforms)&&n>Math.max(0,Math.floor((cap.maxVertexUniforms-20)/4)))reason='GPU bone uniform limit: '+n+' bones / '+Math.max(0,Math.floor((cap.maxVertexUniforms-20)/4));
  });
  if(!meshes||!skinned||!g.animations.length)return 'Missing animated character geometry';
  return reason;
 }
 // Old WebGL1 drivers can reject a shader even when the advertised limits pass.
 // Probe only that path, before spawning bots, without a second GL context.
 function probe(g,renderer,T,shadows=false){
  const reason=check(g,renderer?.capabilities);if(reason)return reason;
  if(!renderer||renderer.capabilities?.isWebGL2!==false)return '';
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(72,1,.05,150);
  scene.fog=new T.Fog(0x9fd0ff,35,95);scene.add(new T.HemisphereLight(0xffffff,0x998866,.65));const sun=new T.DirectionalLight(0xffffff,.6);sun.castShadow=shadows;scene.add(sun);scene.add(g.scene);
  const gl=renderer.getContext();const previous=renderer.shadowMap.enabled;
  try{renderer.shadowMap.enabled=shadows;renderer.compile(scene,camera);let failed=false;g.scene.traverse(o=>{if(!o.isSkinnedMesh)return;for(const m of [].concat(o.material||[])){const p=renderer.properties.get(m).currentProgram;if(p&&(p.diagnostics?.runnable===false||p.program&&gl.getProgramParameter(p.program,gl.LINK_STATUS)===false))failed=true;}});return failed?'Character shader link failed':'';}
  catch(e){return 'Character shader probe: '+String(e?.message||e);}
  finally{renderer.shadowMap.enabled=previous;scene.remove(g.scene);sun.shadow?.dispose();}
 }
 // Only for an unaccepted source asset, never for a cloned/active model.
 function releaseRejected(g){
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();g?.scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of [].concat(o.material||[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());skeletons.forEach(x=>x.dispose());
 }
 function make(b,T,shape){
  const body=new T.Group(),geo=new T.BoxGeometry(1,1,1),skin=new T.MeshLambertMaterial({color:0xbba084}),cloth=new T.MeshLambertMaterial({color:b.team==='CT'?0x465a63:0x796344}),pants=new T.MeshLambertMaterial({color:b.team==='CT'?0x303e49:0x45463a}),vest=new T.MeshLambertMaterial({color:0x303632}),metal=new T.MeshLambertMaterial({color:0x24282b}),proxy=new T.MeshBasicMaterial({visible:false});
  const mesh=(material,parent)=>{const m=new T.Mesh(geo,material);m.castShadow=false;parent.add(m);return m;};
  const regions=shape.boxes.map(row=>{const part=row[0],group=new T.Group();body.add(group);const render=mesh(part==='head'?skin:part==='leg'?pants:part==='chest'?vest:cloth,group),hit=mesh(proxy,group);hit.visible=false;hit.userData={bot:b,part};b.parts.push(hit);return {group,render,hit};});
  // Visible equipment is intentionally cheap and never participates in damage traces.
  const helmet=mesh(cloth,body),gun=new T.Group();body.add(gun);const receiver=mesh(metal,gun),barrel=mesh(metal,gun),grip=mesh(vest,gun);
  const shield=mesh(vest,body),shieldHit=mesh(proxy,body);shieldHit.visible=false;shieldHit.userData={bot:b,part:'shield'};b.shieldPart=shieldHit;
  b.g.add(body);b.body=body;b.nativeHitboxes=true;b.fallbackRig={regions,helmet,gun,receiver,barrel,grip,shield,shape};pose(b,shape);return b;
 }
 function pose(b,shape=b.fallbackRig?.shape){
  const rig=b.fallbackRig;if(!rig||!shape)return;rig.shape=shape;
  const moving=!b.dead&&(b.lastMoveSpeed||0)>.12,phase=moving?Math.sin(b.t||0)*.32:0;
  shape.boxes.forEach(([part,w,h,d,x,y,z],i)=>{const r=rig.regions[i];r.group.position.set(x,y,z);r.group.rotation.x=part==='leg'?(i===0?phase:-phase):part==='arm'?(b.weaponId ? .7 : .12)+(i===5?phase:-phase)*.25:0;r.render.scale.set(w,h,d);r.hit.scale.copy(r.render.scale);});
  const head=shape.boxes.find(x=>x[0]==='head'),chest=shape.boxes.find(x=>x[0]==='chest'),unit=chest[1]/.70;
  rig.helmet.position.set(head[4],head[5]+head[2]*.38,head[6]);rig.helmet.scale.set(head[1]*1.12,head[2]*.36,head[3]*1.12);
  rig.gun.position.set(unit*.32,chest[5]-.04,-unit*.55);rig.gun.rotation.x=-(b.aimPitch||0);rig.gun.visible=!!b.weaponId&&!b.dead;
  const long=!['usp','glock18','p228','deagle','elite','fiveseven','knife'].includes(b.weaponId),knife=b.weaponId==='knife';
  rig.receiver.scale.set(unit*.13,unit*(knife?.07:.15),unit*(long?.62:.31));rig.receiver.position.z=-unit*.12;
  rig.barrel.scale.set(unit*.065,unit*.065,unit*(long?.44:.15));rig.barrel.position.z=-unit*(long?.59:.31);rig.grip.scale.set(unit*.11,unit*.17,unit*.13);rig.grip.position.set(0,-unit*.12,0);rig.grip.visible=!knife;
  const [,w,h,d,x,y,z]=shape.shield;rig.shield.visible=!!b.hasBotShield&&!b.dead;rig.shield.scale.set(w,h,d);rig.shield.position.set(b.shieldRaised?x:-unit*.57,b.shieldRaised?y:y-unit*.22,b.shieldRaised?z:-unit*.12);rig.shield.rotation.y=b.shieldRaised?0:.48;
  b.shieldPart.position.set(x,y,z);b.shieldPart.scale.set(w,h,d);
 }
 return Object.freeze({reset,record,summary,reasonFor,check,probe,releaseRejected,make,pose});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CharacterCompat;
