import {showModel} from './model-preview.js';
import {installWorkshop} from './workshop.js';
import {startCityScene} from './city-scene.js';
import {installCityUI} from './city-ui.js';

const $ = id => document.getElementById(id);
const socket = io();
let worldState,stopModel,citySceneHandle;
const replayCity=installCityUI(socket,()=>citySceneHandle);
socket.on('world',world=>{worldState=world;citySceneHandle?.updateWorld(world);});
installWorkshop({socket,getState:()=>state,openCreation:async name=>{$('gallery').showModal();await refreshFiles();await openFile(name);}});
let state,currentFile,downloadUrl,showSource=false;
socket.on('connect', () => { $('connection').textContent='Connected'; $('pauseButton').disabled=false; $('sendMessage').disabled=false; });
socket.on('disconnect', () => { $('connection').textContent='Reconnecting…'; $('pauseButton').disabled=true; $('sendMessage').disabled=true; });
socket.on('state', next => {
  state = next;
  $('thought').textContent=state.thought;
  $('action').textContent=state.action_label.replaceAll('_',' ');
  $('roomActivity').textContent=state.paused ? 'Taking a little pause' : state.creating ? 'Making something in the city' : state.action_label.replaceAll('_',' ');
  $('obsession').textContent=state.mind.current_obsession;
  $('project').textContent=state.mind.active_project;
  $('thoughtHeading').textContent=state.reflecting ? 'A MOMENT OF DEEP REFLECTION' : 'A PENNY FOR MY THOUGHTS';
  for(const name of ['energy','hunger','mood']) { $(name).value=state[name]; $(name+'Value').textContent=state[name]+'%'; }
  $('pauseButton').textContent=state.paused ? 'Resume Brain' : 'Pause Brain';
  $('pauseButton').setAttribute('aria-pressed',String(state.paused));
  $('mode').textContent=state.demo ? 'DEMO MODE · A LITTLE IMAGINATION, NO API KEY' : state.provider==='ollama' ? 'LOCAL AI · '+state.model+' · NO API CHARGES' : 'OPENAI · A MIND OF ITS OWN';
  $('brainError').hidden=!state.error; $('brainError').textContent=state.error || '';
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
$('galleryButton').onclick=()=>{$('gallery').showModal();refreshFiles(true);};
$('gallery').addEventListener('close',()=>{stopModel?.();stopModel=null;});
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
  stopModel?.();stopModel=null;
  $('preview').src='about:blank';
  const visual=/\.(html|svg)$/.test(currentFile.name)&&!showSource;
  const model=currentFile.name.endsWith('.stl')&&!showSource;
  $('modelPreview').hidden=!model;$('modelInfo').hidden=!model;
  if(model)stopModel=showModel($('modelPreview'),$('modelInfo'),currentFile.content);
  $('source').hidden=visual||model;$('preview').hidden=!visual;$('sourceButton').textContent=showSource?'View preview':'View source';
  $('source').textContent=currentFile.content;
  if(visual){
    // Opaque-origin sandbox: scripts allowed for toys, but no same-origin, forms,
    // popups, downloads, top navigation or network. No generated code enters our DOM.
    $('preview').src='/api/preview/'+encodeURIComponent(currentFile.name)+'?v='+Date.now();
  }
}

citySceneHandle=startCityScene($('room'),{getState:()=>state,onError:error=>{$('renderError').hidden=false;$('renderError').textContent='The 3D city could not load: '+error.message;}});
if(worldState)citySceneHandle.updateWorld(worldState);replayCity();
