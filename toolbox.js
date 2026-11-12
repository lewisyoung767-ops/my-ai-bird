import {randomUUID} from 'node:crypto';
import {readCreation,writeCreation} from './workspace.js';
export async function createToolbox({load,save,creations}){
  const data=await load('toolbox.json',{tools:[],runs:[]});if(!Array.isArray(data.tools)||!Array.isArray(data.runs))throw new Error('Invalid toolbox.json');
  const clients=new Set(),pending=new Map();let io;
  const publish=()=>io?.emit('toolbox',data);
  function finish(id,result){const job=pending.get(id);if(!job)return;pending.delete(id);clearTimeout(job.timer);job.socket.emit('tool:cancel',{id});job.resolve(result);}
  return {
    attach(app,sockets){io=sockets;app.get('/api/toolbox',(_req,res)=>res.json(data));io.on('connection',socket=>{
      socket.emit('toolbox',data);socket.on('tool:ready',ready=>{if(ready===true)clients.add(socket);else clients.delete(socket);});
      socket.on('disconnect',()=>{clients.delete(socket);for(const[id,job]of pending)if(job.socket===socket)finish(id,{ok:false,error:'The browser disconnected.'});});
      socket.on('tool:result',payload=>{const job=pending.get(payload?.id);if(!job||job.socket!==socket)return;try{if(Buffer.byteLength(JSON.stringify(payload))>7000)throw new Error('Tool result is too large');if(typeof payload.ok!=='boolean'||payload.ok&&payload.result===undefined)throw new Error('Invalid result');finish(payload.id,payload.ok?{ok:true,result:payload.result}:{ok:false,error:String(payload.error||'Tool failed').slice(0,400)});}catch(e){finish(payload.id,{ok:false,error:e.message});}});
    });},
    context(){return {tools:data.tools.slice(-12),recent_runs:data.runs.slice(-3)};},
    findByFilename(filename){return data.tools.find(t=>t.filename===filename);},
    async register(update){
      if(!update)return;await readCreation(creations,update.filename);
      let tool=data.tools.find(t=>t.filename===update.filename);if(!tool){tool={id:randomUUID(),filename:update.filename};data.tools.push(tool);}
      Object.assign(tool,{name:update.name,purpose:update.purpose,usage:update.usage,runnable:update.filename.endsWith('.html'),updatedAt:new Date().toISOString()});data.tools=data.tools.slice(-24);await save('toolbox.json',data);publish();
    },
    abort(){for(const id of [...pending.keys()])finish(id,{ok:false,error:'Tool execution was cancelled.'});},
    async run(action){
      const tool=data.tools.find(t=>t.id===action.id);if(!tool)return {type:'tool_result',ok:false,error:'Unknown tool ID. Create and register a tool first.'};
      if(!tool.runnable)return {type:'tool_result',ok:false,error:'This file is a design or procedure, not a runnable HTML tool.'};
      try{await readCreation(creations,tool.filename);}catch{return {type:'tool_result',ok:false,error:'Tool file is unavailable.'};}
      const socket=[...clients].find(s=>s.connected!==false);if(!socket)return {type:'tool_result',ok:false,error:'Open Pip in a browser to run self-made tools. No browser is available.'};
      let input;try{input=JSON.parse(action.input_json);if(Buffer.byteLength(action.input_json)>2500)throw new Error();}catch{return {type:'tool_result',ok:false,error:'Tool input must be JSON under 2500 bytes.'};}
      const id=randomUUID();const result=await new Promise(resolve=>{const timer=setTimeout(()=>finish(id,{ok:false,error:'Tool timed out after 8 seconds.'}),8000);pending.set(id,{socket,resolve,timer});socket.emit('tool:execute',{id,filename:tool.filename,input});});
      let result_file=null;if(result.ok){try{const output=JSON.stringify({tool:tool.name,input,result:result.result},null,2);if(Buffer.byteLength(output)>10000)throw new Error('Tool output is too large');result_file='tool-result-'+id+'.json';await writeCreation(creations,result_file,output);}catch(e){result.ok=false;result.error=e.message;}}
      const observation={type:'tool_result',id,tool:tool.name,ok:result.ok,result_file,error:result.error||null,result:result.ok?result.result:null,at:new Date().toISOString()};data.runs.push(observation);data.runs=data.runs.slice(-30);await save('toolbox.json',data);publish();return observation;
    }
  };
}
