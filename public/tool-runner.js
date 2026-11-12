export function installToolRunner({socket,openCreation}){
  const active=new Map();
  const dispose=id=>{const job=active.get(id);if(!job)return;active.delete(id);window.removeEventListener('message',job.listener);clearTimeout(job.timer);job.frame.remove();};
  socket.on('connect',()=>socket.emit('tool:ready',true));if(socket.connected)socket.emit('tool:ready',true);
  socket.on('disconnect',()=>{for(const id of [...active.keys()])dispose(id);});socket.on('tool:cancel',job=>dispose(job.id));
  socket.on('tool:execute',job=>{
    for(const id of [...active.keys()])dispose(id);
    const frame=document.createElement('iframe');frame.hidden=true;frame.sandbox='allow-scripts';frame.title='Pip is testing a self-made tool';
    const respond=payload=>{socket.emit('tool:result',{id:job.id,...payload});dispose(job.id);};
    const listener=event=>{if(event.source!==frame.contentWindow||event.data?.type!=='pip-tool-result'||event.data.request_id!==job.id)return;try{const encoded=JSON.stringify(event.data.result);if(encoded===undefined)throw new Error('Tool returned no result');if(new TextEncoder().encode(encoded).length>6000)throw new Error('Result exceeds 6000 bytes');respond({ok:true,result:event.data.result});}catch(e){respond({ok:false,error:e.message});}};
    const timer=setTimeout(()=>respond({ok:false,error:'The tool did not return a result in time.'}),7000);active.set(job.id,{frame,listener,timer});window.addEventListener('message',listener);
    frame.onload=()=>frame.contentWindow.postMessage({type:'pip-tool-input',request_id:job.id,input:job.input},'*');frame.src='/api/preview/'+encodeURIComponent(job.filename);document.body.append(frame);
  });
  socket.on('toolbox',box=>{
    const list=document.getElementById('selfMadeTools');list.replaceChildren();if(!box.tools.length)list.textContent='When Pip needs a new method, it can build and register a tool here. Topics and purposes are its own choice.';
    for(const tool of [...box.tools].reverse()){const article=document.createElement('article');const title=document.createElement('h4');title.textContent=tool.name;const p=document.createElement('p');p.textContent=tool.purpose;const usage=document.createElement('p');usage.className='empty-note';usage.textContent=tool.usage;const open=document.createElement('button');open.textContent='Inspect tool';open.onclick=()=>openCreation(tool.filename);article.append(title,p,usage,open);list.append(article);}
    for(const run of [...box.runs].reverse().slice(0,4)){const p=document.createElement('p');p.className='empty-note';p.textContent=run.tool+': '+(run.ok?'produced '+run.result_file:run.error);if(run.result_file){const button=document.createElement('button');button.textContent='Open output';button.onclick=()=>openCreation(run.result_file);p.append(' ',button);}list.append(p);}
  });
}
