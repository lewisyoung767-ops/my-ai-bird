import {randomUUID} from 'node:crypto';
import {readCreation} from './workspace.js';
import {createWebReader} from './web-reader.js';
import {initialRoom,validateTaskInput,applyRoomAction} from './autonomy.js';
export async function createFeatures({load,save,creations,demo,webReader}){
  let tasks=await load('tasks.json',[]),research=await load('research.json',[]),world=await load('room.json',initialRoom);
  const settings=await load('settings.json',{internetEnabled:(process.env.INTERNET_ENABLED||'true')==='true'});
  if(!Array.isArray(tasks)||!Array.isArray(research)||!Array.isArray(world.objects)||typeof settings.internetEnabled!=='boolean')throw new Error('Invalid task/research/room/settings data');
  let io,webAbort;const reader=webReader||createWebReader();
  const publish=()=>{io?.emit('tasks',tasks);io?.emit('research',research);io?.emit('world',world);io?.emit('features:settings',{...settings,demo});};
  return {
    attach(app,sockets){
      io=sockets;app.get('/api/tasks',(_req,res)=>res.json(tasks));app.get('/api/research',(_req,res)=>res.json(research));app.get('/api/world',(_req,res)=>res.json(world));
      io.on('connection',socket=>{
        socket.emit('tasks',tasks);socket.emit('research',research);socket.emit('world',world);socket.emit('features:settings',{...settings,demo});let lastTask=0;
        const bind=(event,fn)=>socket.on(event,async(payload,ack)=>{try{await fn(payload);if(typeof ack==='function')ack({ok:true});}catch(e){if(typeof ack==='function')ack({error:e.message});}});
        bind('task:submit',async payload=>{if(Date.now()-lastTask<1000)throw new Error('Please wait between tasks.');lastTask=Date.now();if(tasks.filter(t=>['queued','in_progress'].includes(t.status)).length>=20)throw new Error('There are already 20 open ideas.');const input=validateTaskInput(payload);tasks.push({id:randomUUID(),title:input.description.slice(0,90),...input,origin:'you',status:'queued',summary:'Waiting for Pip to consider this idea.',result_file:null,at:new Date().toISOString()});tasks=tasks.slice(-80);await save('tasks.json',tasks);publish();});
        bind('task:cancel',async id=>{const task=tasks.find(t=>t.id===id);if(!task||!['queued','in_progress','deferred'].includes(task.status))throw new Error('Task is no longer open');task.status='cancelled';task.summary='Cancelled by you.';await save('tasks.json',tasks);publish();});
        bind('internet:enabled',async enabled=>{if(typeof enabled!=='boolean')throw new Error('Invalid internet setting');settings.internetEnabled=enabled;if(!enabled)webAbort?.abort();await save('settings.json',settings);publish();});
        bind('room:reset',async()=>{world=structuredClone(initialRoom);await save('room.json',world);publish();});
      });
    },
    abortWeb(){webAbort?.abort();},
    context(){return {internet_enabled:settings.internetEnabled,tasks:tasks.filter(t=>t.status!=='cancelled').slice(-10),research:research.slice(-3),room:world};},
    async web(action,signal){
      if(!settings.internetEnabled)return {type:'error',error:'Internet is switched off.'};webAbort=new AbortController();let observation;
      try{if(demo)observation={type:'search',title:'Demo research (simulated, not fetched)',query:action.query||'creative ideas',at:new Date().toISOString(),demo:true,results:[{title:'Nature',url:'https://en.wikipedia.org/wiki/Nature',snippet:'This is a demo example. AI mode can read actual public pages.'}]};else observation=await reader[action.type](action.type==='search'?action.query:action.url,AbortSignal.any([webAbort.signal,signal]));}
      catch(e){observation={type:'error',title:'A page could not be read',at:new Date().toISOString(),error:e.message.slice(0,300)};}
      if(signal.aborted||webAbort.signal.aborted||!settings.internetEnabled)return {type:'error',error:'Research was cancelled.'};research.push({id:randomUUID(),...observation});research=research.slice(-40);await save('research.json',research);publish();return observation;
    },
    async apply(decision){
      if(decision.scene_action){world=applyRoomAction(world,decision.scene_action,randomUUID());await save('room.json',world);publish();}
      if(decision.task_update){const update=decision.task_update;let task=update.id?tasks.find(t=>t.id===update.id):null;
        if(update.id&&!task)throw new Error('Task id was not found');if(task?.status==='cancelled')return;
        if(update.status==='completed'){if(!update.result_file)throw new Error('Task needs a real result file before completion');if(!(await readCreation(creations,update.result_file)).trim())throw new Error('Result file is empty');}
        if(!task){if(tasks.filter(t=>t.origin==='pip'&&t.status==='in_progress').length>=5)throw new Error('Finish one of your existing projects first');task={id:randomUUID(),title:update.title,description:update.title,kind:update.kind,origin:'pip',at:new Date().toISOString()};tasks.push(task);}
        Object.assign(task,{status:update.status,summary:update.summary,result_file:update.status==='completed'?update.result_file:null,updatedAt:new Date().toISOString()});tasks=tasks.slice(-80);await save('tasks.json',tasks);publish();
      }
    },
    demoDecision(base,cycle,sample){
      const task=tasks.find(t=>['queued','in_progress'].includes(t.status));
      if(task){const ext=task.kind==='drawing'?'svg':task.kind==='toy'?'html':'txt';const filename='task-'+task.id.slice(0,8)+'.'+ext;const content=ext==='svg'?sample:ext==='html'?'<h1>Pip’s little colour toy (demo)</h1><button onclick="document.body.style.background=[\'#e3edcf\',\'#ffe2a7\',\'#e6d9ee\'][Math.floor(Math.random()*3)]">Change colour</button>':'A small demo result by Pip.\nA sunbeam arrived at the window with no plans at all. Pip turned it into an idea.\nDemo mode is simulated; enable AI for original work based on your request.';return {...base,thought:'I will make something real at my desk and put the result on my project board.',action_label:'making_a_demo_project',target:'desk',create_or_edit_file:{filename,content},scene_action:world.objects.length?null:{op:'add',kind:'plant',label:'A plant for my thinking corner',color:'#83a96d',x:.8,z:2,scale:.8},task_update:{id:task.id,title:task.title,kind:task.kind,status:'completed',summary:'Created a sample result in demo mode.',result_file:filename}};}
      if(cycle%6===2)return {...base,web_action:{type:'search',query:'creative ideas from nature',url:null},scene_action:world.objects.some(o=>o.label==='A plant for my thinking corner')?null:{op:'add',kind:'plant',label:'A plant for my thinking corner',color:'#83a96d',x:.8,z:2,scale:.8}};
      return base;
    }
  };
}
