import {installToolRunner} from './tool-runner.js';
import {installLearning} from './learning.js';
export function installWorkshop({socket,openCreation,getState}){
  installLearning({socket,openCreation});
  installToolRunner({socket,openCreation});
  const $=id=>document.getElementById(id);const status=text=>$('workshopStatus').textContent=text;
  const send=(event,payload)=>new Promise(resolve=>socket.timeout(6000).emit(event,payload,(error,result)=>{if(error||result?.error)status(result?.error||'Connection interrupted. Please try again.');resolve(!error&&!result?.error);}));
  $('taskForm').onsubmit=async e=>{e.preventDefault();if(await send('task:submit',{kind:$('taskKind').value,description:$('taskDescription').value})){$('taskDescription').value='';status(getState()?.demo?'Queued. Demo mode will make a sample result. Enable AI mode for original work.':'Idea added. Pip will choose how to approach it on a future cycle.');}};
  $('internetToggle').onclick=()=>send('internet:enabled',$('internetToggle').getAttribute('aria-pressed')!=='true');
  $('resetRoom').onclick=async()=>{if(await send('room:reset',null))status('Pip’s added decorations and room colours were reset.');};
  socket.on('features:settings',settings=>{$('internetToggle').textContent=settings.internetEnabled?'Internet: on':'Internet: off';$('internetToggle').setAttribute('aria-pressed',String(settings.internetEnabled));});
  socket.on('tasks',tasks=>{
    const list=$('taskResults');list.replaceChildren();if(!tasks.length){list.textContent='Pip’s projects and finished creations will appear here. Suggest an idea, or let Pip invent one.';return;}
    for(const task of [...tasks].reverse().slice(0,12)){
      const card=document.createElement('article');card.className='project-card';const meta=document.createElement('small');meta.textContent=`${task.origin==='pip'?'PIP’S IDEA':'YOUR IDEA'} / ${task.kind} / ${task.status.replaceAll('_',' ')}`;
      const title=document.createElement('h3');title.textContent=task.title;const summary=document.createElement('p');summary.textContent=task.summary||'';card.append(meta,title,summary);
      if(task.status==='completed'&&task.result_file){
        if(task.result_file.endsWith('.svg')){const preview=document.createElement('iframe');preview.title=task.title;preview.sandbox='';preview.loading='lazy';preview.src='/api/preview/'+encodeURIComponent(task.result_file);card.append(preview);}
        const button=document.createElement('button');button.textContent='Open result';button.onclick=()=>openCreation(task.result_file);card.append(button);
      }else if(['queued','in_progress','deferred'].includes(task.status)){const button=document.createElement('button');button.textContent='Cancel idea';button.onclick=()=>send('task:cancel',task.id);card.append(button);}
      list.append(card);
    }
  });
  socket.on('research',notes=>{
    const list=$('researchNotes');list.replaceChildren();if(!notes.length){list.textContent='When Pip chooses to search or read, its sources and discoveries will appear here.';return;}
    const link=(title,url)=>{const a=document.createElement('a');try{const u=new URL(url);if(u.protocol!=='https:')throw new Error();a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=title;}catch{a.textContent=title;}return a;};
    for(const note of [...notes].reverse().slice(0,8)){const article=document.createElement('article');const heading=document.createElement('h4');heading.textContent=note.title||'A new discovery';article.append(heading);const meta=document.createElement('small');meta.textContent=(note.demo?'SIMULATED DEMO / ':'')+new Date(note.at).toLocaleString();article.append(meta);
      if(note.text){const p=document.createElement('p');p.textContent=note.text.slice(0,600)+(note.text.length>600?'…':'');article.append(p);}
      if(note.error){const p=document.createElement('p');p.textContent=note.error;article.append(p);}
      if(note.url)article.append(link('Read source',note.url));
      for(const hit of note.results||[]){const p=document.createElement('p');p.append(link(hit.title,hit.url));article.append(p);}list.append(article);
    }
  });
  socket.on('state',state=>{
    $('demoNotice').hidden=!state.demo&&!state.error;
    $('demoNotice').textContent=state.error?'Pip’s brain needs attention: '+state.error:state.demo?'DEMO MODE: thoughts and examples are scripted. Run Setup-Local-AI.cmd and restart Pip for independent AI decisions.':'';
    $('brainActivity').textContent=state.paused?'Paused':state.brainStatus==='testing_tool'?'Testing a self-made tool':state.brainStatus==='researching'?'Reading the internet':state.brainStatus==='thinking'?'Choosing its next action':state.brainStatus==='error'?'AI needs attention':state.creating?'Making a real creation':'Free to choose its next project';
  });
}
