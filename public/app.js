import * as THREE from '/vendor/three.module.js';

const $ = id => document.getElementById(id);
const socket = io();
let state, bird, scene, renderer, camera, deskLight, sparkles, yaw = .68, currentFile, downloadUrl, showSource = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const destinations = { bed: new THREE.Vector3(-2.05, .64, -1.45), bowl: new THREE.Vector3(2.15, .18, 1.8), desk: new THREE.Vector3(1.8, 1.55, -1.35), window: new THREE.Vector3(-.5, 1.9, -2.3), random_spot:new THREE.Vector3(0,.18,1) };
let target = destinations.bed.clone(), look = 0;
socket.on('connect', () => { $('connection').textContent='Connected'; $('pauseButton').disabled=false; $('sendMessage').disabled=false; });
socket.on('disconnect', () => { $('connection').textContent='Reconnecting…'; $('pauseButton').disabled=true; $('sendMessage').disabled=true; });
socket.on('state', next => {
  const changed = !state || state.cycle !== next.cycle || state.target !== next.target;
  state = next;
  $('thought').textContent=state.thought;
  $('action').textContent=state.action_label.replaceAll('_',' ');
  $('roomActivity').textContent=state.paused ? 'Taking a little pause' : state.creating ? 'Making something at the desk' : state.action_label.replaceAll('_',' ');
  $('obsession').textContent=state.mind.current_obsession;
  $('project').textContent=state.mind.active_project;
  $('thoughtHeading').textContent=state.reflecting ? 'A MOMENT OF DEEP REFLECTION' : 'A PENNY FOR MY THOUGHTS';
  for(const name of ['energy','hunger','mood']) { $(name).value=state[name]; $(name+'Value').textContent=state[name]+'%'; }
  $('pauseButton').textContent=state.paused ? 'Resume Brain' : 'Pause Brain';
  $('pauseButton').setAttribute('aria-pressed',String(state.paused));
  $('mode').textContent=state.demo ? 'DEMO MODE · A LITTLE IMAGINATION, NO API KEY' : state.provider==='ollama' ? 'LOCAL AI · '+state.model+' · NO API CHARGES' : 'OPENAI · A MIND OF ITS OWN';
  $('brainError').hidden=!state.error; $('brainError').textContent=state.error || '';
  if(changed) target=state.target==='random_spot' ? new THREE.Vector3((Math.random()-.5)*3.5,.18,Math.random()*2) : destinations[state.target].clone();
});
setInterval(() => { if(state) $('cycle').textContent=state.paused ? `Paused · cycle ${state.cycle}` : state.nextCycleAt ? `Cycle ${state.cycle} · next in ${Math.max(0,Math.ceil((state.nextCycleAt-Date.now())/1000))}s` : state.reflecting ? 'Reflecting…' : 'Thinking…'; },500);
$('pauseButton').onclick=()=>{if(state)socket.emit('brain:pause',!state.paused);};
socket.on('conversation', messages => {
  const log=$('conversationLog'),nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<50;
  log.replaceChildren();$('requests').replaceChildren();
  if(!messages.length)log.textContent='Pip will ask or share something when it feels curious.';
  for(const message of messages){
    if(message.kind==='request'){
      const card=document.createElement('div');card.className='request-card';const p=document.createElement('p');p.textContent=message.text;card.append(p);
      if(message.status==='pending'){
        const actions=document.createElement('div');actions.className='request-actions';
        for(const [text,status] of [['Grant','granted'],['Not now','declined']]){const button=document.createElement('button');button.textContent=text;button.onclick=()=>socket.timeout(5000).emit('companion:request',{id:message.id,status},(error,result)=>{if(error||result?.error)$('messageStatus').textContent=result?.error||'Connection interrupted. Please try again.';});actions.append(button);}card.append(actions);
      }else{const small=document.createElement('small');small.textContent=message.status==='granted'?'✓ You granted this request':'You declined for now';card.append(small);}
      $('requests').append(card);
    }
    const bubble=document.createElement('div');bubble.className='message '+(message.role==='you'?'from-you':'from-pip');const label=document.createElement('small');label.textContent=(message.role==='you'?'YOU':'PIP')+(message.kind==='question'?' · A QUESTION':message.kind==='request'?' · A REQUEST':'');const text=document.createElement('p');text.textContent=message.text;bubble.append(label,text);log.append(bubble);
  }
  if(!$('requests').children.length)$('requests').textContent='No requests just yet.';
  if(nearBottom)log.scrollTop=log.scrollHeight;
});
$('messageForm').onsubmit=e=>{
  e.preventDefault();const text=$('messageInput').value.trim();if(!text||!socket.connected)return;
  $('sendMessage').disabled=true;
  socket.timeout(5000).emit('companion:message',text,(error,result)=>{
    $('sendMessage').disabled=!socket.connected;
    if(error||result?.error){$('messageStatus').textContent=result?.error||'Could not confirm delivery. Check the conversation before sending again.';return;}
    $('messageInput').value='';$('messageStatus').textContent=state?.demo?'Saved. Demo mode simulates Pip; switch on AI mode for personal replies.':state?.paused?'Saved. Pip will read this after you resume its brain.':'Saved. Pip will consider your message on its next cycle.';
  });
};
function renderMemories(memories){const history=$('thoughtHistory');history.replaceChildren();for(const memory of [...memories].reverse()){const article=document.createElement('article');const label=document.createElement('small');label.textContent=`Cycle ${memory.cycle} · ${new Date(memory.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · ${memory.action_label.replaceAll('_',' ')}`;const p=document.createElement('p');p.textContent=memory.thought;article.append(label,p);history.append(article);}if(!memories.length)history.textContent='The first little thought is still forming.';}
socket.on('memories',renderMemories);
fetch('/api/memories').then(r=>r.json()).then(renderMemories).catch(()=>{});
$('galleryButton').onclick=()=>{$('gallery').showModal();refreshFiles();};
$('closeGallery').onclick=()=> $('gallery').close();
$('gallery').addEventListener('click', e=> { if(e.target===$('gallery')) {const r=$('gallery').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('gallery').close();} });
socket.on('creations:changed',()=>{if($('gallery').open)refreshFiles(true);});
async function refreshFiles(reload=false) {
  try {
    const response=await fetch('/api/creations'); if(!response.ok)throw new Error('Could not load the collection.');
    const files=await response.json(); $('fileList').replaceChildren();
    if(!files.length)$('fileList').textContent='Pip is still dreaming up its first creation.';
    files.forEach(file=>{const button=document.createElement('button');button.classList.toggle('active',currentFile?.name===file.name);const title=document.createElement('span');title.textContent=file.name;const small=document.createElement('small');small.textContent=`${Math.max(1,Math.round(file.size/1024))} KB · ${new Date(file.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;button.append(title,small);button.onclick=()=>openFile(file.name);$('fileList').append(button);});
    if(files.length&&(!currentFile||reload))await openFile(currentFile?.name||files[0].name);
  }catch(e){$('source').textContent=e.message;}
}
async function openFile(name) {
  try {
    const response=await fetch('/api/creations/'+encodeURIComponent(name)); if(!response.ok)throw new Error('This creation could not be opened.');
    currentFile=await response.json(); showSource=false; $('fileName').textContent=name; $('sourceButton').disabled=false;
    if(downloadUrl)URL.revokeObjectURL(downloadUrl);
    downloadUrl=URL.createObjectURL(new Blob([currentFile.content],{type:'application/octet-stream'}));$('download').href=downloadUrl;$('download').download=name;$('download').hidden=false;
    renderFile();
    [...$('fileList').children].forEach(b=>b.classList.toggle('active',b.firstChild?.textContent===name));
  }catch(e){$('source').hidden=false;$('source').textContent=e.message;$('preview').hidden=true;}
}
$('sourceButton').onclick=()=>{showSource=!showSource;renderFile();};
function renderFile() {
  $('preview').src='about:blank';
  const visual=/\.(html|svg)$/.test(currentFile.name)&&!showSource;
  $('source').hidden=visual;$('preview').hidden=!visual;$('sourceButton').textContent=showSource?'View preview':'View source';
  $('source').textContent=currentFile.content;
  if(visual){
    // Opaque-origin sandbox: scripts allowed for toys, but no same-origin, forms,
    // popups, downloads, top navigation or network. No generated code enters our DOM.
    $('preview').src='/api/preview/'+encodeURIComponent(currentFile.name)+'?v='+Date.now();
  }
}

try { initRoom(); } catch(e) { $('renderError').hidden=false;$('renderError').textContent='The 3D room needs WebGL. Enable hardware acceleration in your browser and reload. The brain and gallery still work.';console.error(e); }
function initRoom(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#e9eddf');
  camera=new THREE.PerspectiveCamera(35,1,.1,100);
  renderer=new THREE.WebGLRenderer({canvas:$('room'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  scene.add(new THREE.HemisphereLight(0xfff9df,0x89977d,2.5));
  const sun=new THREE.DirectionalLight(0xffedcf,4);sun.position.set(-3,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.normalBias=.03;scene.add(sun);
  const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.85});
  const mat={wood:material('#b88b60'),oak:material('#dfb98a'),wall:material('#f0e6cf'),sage:material('#b7c49f'),cream:material('#fff4da'),dark:material('#3c4938'),pink:material('#dfad9c'),green:material('#7f9a67'),gold:material('#e9bd66')};
  function box(w,h,d,m,x,y,z,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function ball(x,y,z,sx,sy,sz,m,parent=scene){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;}
  function cylinder(r1,r2,h,m,x,y,z,parent=scene){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,32),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  box(6.6,.25,5.8,mat.oak,0,-.15,0);
  for(let z=-2.75;z<2.9;z+=.42)box(6.5,.008,.012,mat.wood,0,-.02,z);
  box(.16,3.8,5.8,mat.sage,-3.3,1.8,0);
  // Back wall segments leave an actual opening for the window.
  box(1.55,3.8,.16,mat.wall,-2.57,1.8,-2.9);box(3.3,3.8,.16,mat.wall,1.7,1.8,-2.9);
  box(1.8,.95,.16,mat.wall,-.9,.375,-2.9);box(1.8,.75,.16,mat.wall,-.9,3.325,-2.9);
  box(.09,.17,5.7,mat.cream,-3.18,.08,0);box(6.5,.17,.09,mat.cream,0,.08,-2.78);
  const sky=new THREE.MeshBasicMaterial({color:'#b9d5cf'});box(1.85,2.1,.07,sky,-.9,1.95,-3.01);
  ball(-.46,2.6,-2.94,.23,.23,.02,new THREE.MeshBasicMaterial({color:'#ffe6a1'}));
  box(1.98,.12,.3,mat.cream,-.9,.9,-2.8);box(1.98,.1,.13,mat.cream,-.9,3.02,-2.8);
  for(const x of [-1.85,.05,-.9])box(.07,2.1,.15,mat.cream,x,1.96,-2.8);box(1.85,.07,.15,mat.cream,-.9,2,-2.8);
  // Bed, soft blanket and pillow.
  box(1.4,.3,2,mat.wood,-2.15,.25,-1.4);box(1.35,.27,1.95,mat.cream,-2.15,.53,-1.4);box(1.38,.13,1.25,mat.pink,-2.15,.72,-.99);box(1.42,.95,.14,mat.wood,-2.15,.55,-2.42);
  ball(-2.15,.76,-2.03,.53,.13,.26,mat.cream);
  for(const x of [-2.72,-1.57])for(const z of [-2.18,-.61])box(.13,.35,.13,mat.wood,x,.12,z);
  // Rug.
  cylinder(1.45,1.45,.025,material('#d6cba6'),0,.005,.8).scale.z=.75;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.28,.014,8,80),mat.cream);ring.rotation.x=-Math.PI/2;ring.position.set(0,.025,.8);ring.scale.y=.75;scene.add(ring);
  // Writing desk.
  box(1.85,.14,1.04,mat.oak,1.92,1.36,-1.97);
  for(const x of [1.17,2.67])for(const z of [-2.32,-1.62])box(.1,1.3,.1,mat.wood,x,.65,z);
  box(.6,.015,.45,mat.cream,1.8,1.445,-1.88);box(.035,.035,.4,mat.green,2.06,1.475,-1.85).rotation.y=.4;
  cylinder(.22,.26,.06,mat.wood,2.51,1.46,-2.15);cylinder(.035,.035,.5,mat.dark,2.51,1.72,-2.15);cylinder(.15,.28,.25,mat.gold,2.51,2.02,-2.15);
  cylinder(.33,.33,.13,mat.sage,1.95,.77,-.9);for(const x of [1.75,2.15])box(.07,.73,.07,mat.wood,x,.36,-.9);
  // Bowl and seeds.
  cylinder(.38,.26,.19,mat.pink,2.15,.12,1.8);cylinder(.31,.31,.013,material('#7c6241'),2.15,.222,1.8);
  for(let i=0;i<18;i++){const a=i*2.4,r=.25*Math.sqrt(i/18);ball(2.15+Math.sin(a)*r,.24,1.8+Math.cos(a)*r,.032,.019,.023,mat.gold);}
  // A plant and two books give the room a lived-in feeling.
  cylinder(.28,.2,.4,mat.cream,-2.62,.2,1.8);
  for(let i=0;i<7;i++){const a=i*2.4;const leaf=ball(-2.62+Math.sin(a)*.18,.65+(i%3)*.13,1.8+Math.cos(a)*.18,.12,.34,.07,mat.green);leaf.rotation.z=Math.sin(a)*.6;}
  box(.65,.1,.36,mat.sage,1.3,1.49,-2.12);box(.6,.08,.33,mat.pink,1.28,1.58,-2.12);
  // Framed miniature on left wall.
  box(.07,.9,.72,mat.wood,-3.16,2.35,-.4);box(.08,.75,.57,mat.cream,-3.1,2.35,-.4);ball(-3.05,2.38,-.4,.03,.21,.21,mat.gold);
  bird=new THREE.Group();scene.add(bird);bird.position.copy(destinations.bed);
  const body=material('#d5a950'),head=material('#e8c566'),wing=material('#9aa980');
  ball(0,.36,0,.29,.36,.26,body,bird);ball(0,.66,.08,.26,.25,.24,head,bird);ball(0,.34,.185,.19,.23,.1,mat.cream,bird);
  for(const x of [-.13,.13]){ball(x,.7,.282,.04,.045,.025,mat.dark,bird);ball(x-.008,.715,.302,.011,.012,.006,mat.cream,bird);ball(x*1.4,.59,.253,.045,.023,.01,mat.pink,bird);}
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.075,.17,4),material('#cd8050'));beak.rotation.x=Math.PI/2;beak.position.set(0,.61,.36);bird.add(beak);
  for(const x of [-.27,.27]){const w=ball(x,.38,-.01,.085,.23,.17,wing,bird);w.rotation.z=x>0?-.2:.2;}
  for(const x of [-.1,.1]){box(.035,.12,.035,mat.wood,x,.04,.03,bird);box(.1,.035,.16,mat.wood,x,-.01,.08,bird);}
  for(let i=-1;i<=1;i++){const feather=ball(i*.06,.4,-.28,.055,.06,.21,wing,bird);feather.rotation.x=-.3;}
  for(let i=0;i<2;i++){const tuft=ball(.03*i,.91,.05,.035,.095,.035,head,bird);tuft.rotation.z=-.3+i*.4;}
  deskLight=new THREE.PointLight(0xffce75,0,3);deskLight.position.set(1.8,2.2,-1.6);scene.add(deskLight);
  sparkles=new THREE.Group();scene.add(sparkles);for(let i=0;i<9;i++)ball(0,0,0,.025,.025,.025,new THREE.MeshBasicMaterial({color:'#ffda83'}),sparkles);
  const canvas=$('room');let dragging=false,lastX=0;
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
  canvas.addEventListener('pointermove',e=>{if(dragging){yaw=THREE.MathUtils.clamp(yaw-(e.clientX-lastX)*.003,-.15,1.12);lastX=e.clientX;}});
  new ResizeObserver(()=>{const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(canvas);
  let previous=performance.now();
  function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;const t=now/1000;
    camera.position.set(Math.sin(yaw)*11,7.7,Math.cos(yaw)*11);camera.lookAt(0,.95,0);
    if(!state?.paused){const distance=bird.position.distanceTo(target),moving=distance>.035;
      bird.position.lerp(target,1-Math.exp(-dt*1.6));
      if(moving){look=Math.atan2(target.x-bird.position.x,target.z-bird.position.z);bird.rotation.y+=Math.atan2(Math.sin(look-bird.rotation.y),Math.cos(look-bird.rotation.y))*Math.min(dt*7,1);}
      bird.children.forEach((child,i)=>{if(i===0)child.scale.y=.36+(reduced?0:Math.sin(t*3)*.006);});
      bird.position.y+=moving&&!reduced?Math.abs(Math.sin(t*11))*.045:0;
    }
    const active=state?.creating&&!state.paused;sparkles.visible=!!active;deskLight.intensity=active?2:0;
    sparkles.children.forEach((p,i)=>p.position.set(1.8+Math.sin(t+i*2.4)*.4,1.7+((t*.3+i*.12)%1),-1.8+Math.cos(t+i)*.3));
    renderer.render(scene,camera);
  }requestAnimationFrame(animate);
}
