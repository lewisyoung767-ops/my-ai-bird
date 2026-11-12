import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('real application startup uses a local model without an OpenAI key and persists its choices',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'pip-local-test-'));let child;const calls=[];
  const mock=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    calls.push({url:req.url,authorization:req.headers.authorization,body:body?JSON.parse(body):null});res.setHeader('Content-Type','application/json');
    if(req.url==='/api/version')return res.end(JSON.stringify({version:'test-local'}));
    if(req.url==='/api/show')return res.end(JSON.stringify({details:{family:'qwen2'}}));
    if(req.url==='/api/chat')return res.end(JSON.stringify({done:true,message:{content:JSON.stringify({thought:'I decided to invent a tiny blue beetle.',action_label:'inventing_a_blue_beetle',target:'desk',create_or_edit_file:{filename:'blue-beetle.txt',content:'A tiny blue beetle collects fallen stars.'},question_for_you:'What should I name my beetle?',request_for_you:'Please suggest a name for my field guide.',message_for_you:null,task_update:{id:null,title:'A blue beetle story',kind:'story',status:'completed',summary:'Wrote a real story',result_file:'blue-beetle.txt'},scene_action:{op:'add',kind:'plant',label:'A fern',color:'#778855',x:1,z:1,scale:1}})}}));
    res.writeHead(404);res.end('{}');
  });
  try{
    await new Promise(r=>mock.listen(0,'127.0.0.1',r));const localURL=`http://127.0.0.1:${mock.address().port}`;
    for(const f of ['server.js','start.js','ai-provider.js','local-runtime.js','brain.js','autonomy.js','features.js','web-reader.js','autonomy-prompt.js','workspace.js','package.json','.env.example'])await fs.copyFile(path.join(root,f),path.join(temp,f));
    await fs.cp(path.join(root,'public'),path.join(temp,'public'),{recursive:true});await fs.symlink(path.join(root,'node_modules'),path.join(temp,'node_modules'),process.platform==='win32'?'junction':'dir');
    const portProbe=createServer();await new Promise(r=>portProbe.listen(0,'127.0.0.1',r));const port=portProbe.address().port;await new Promise(r=>portProbe.close(r));
    let log='';child=spawn(process.execPath,['start.js'],{cwd:temp,env:{...process.env,OPENAI_API_KEY:'',AI_PROVIDER:'ollama',OLLAMA_BASE_URL:localURL,OLLAMA_MODEL:'qwen2.5:3b',DEMO_MODE:'false',PORT:String(port),CYCLE_SECONDS:'30'},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);const base=`http://127.0.0.1:${port}`;
    let state;
    for(let i=0;i<100;i++){try{state=await(await fetch(base+'/api/state')).json();if(state.cycle===1)break;}catch{}await new Promise(r=>setTimeout(r,100));}
    assert.equal(state?.provider,'ollama',log);assert.equal(state?.demo,false);assert.equal(state?.thought,'I decided to invent a tiny blue beetle.');assert.equal(state?.action_label,'inventing_a_blue_beetle');
    const conversation=await(await fetch(base+'/api/conversation')).json();assert.ok(conversation.some(m=>m.kind==='question'));assert.ok(conversation.some(m=>m.kind==='request'&&m.status==='pending'));
    let saved=false;for(let i=0;i<70;i++){try{saved=(await fs.readFile(path.join(temp,'bird_creations','blue-beetle.txt'),'utf8')).includes('fallen stars');if(saved)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(saved,log);
    let memories=[];for(let i=0;i<30;i++){memories=JSON.parse(await fs.readFile(path.join(temp,'data','memories.json'),'utf8'));if(memories.length)break;await new Promise(r=>setTimeout(r,100));}assert.equal(memories.at(-1)?.action_label,'inventing_a_blue_beetle');
    assert.ok(calls.some(c=>c.url==='/api/version'));assert.ok(calls.some(c=>c.url==='/api/chat'&&c.body.format.properties.target));assert.ok(calls.every(c=>!c.authorization));assert.equal((await(await fetch(base+'/api/world')).json()).objects[0].kind,'plant');assert.equal((await(await fetch(base+'/api/tasks')).json())[0].status,'completed');assert.doesNotMatch(log,/Brain cycle:|Error:/);
  }finally{if(child&&child.exitCode===null){const closed=new Promise(r=>child.once('exit',r));child.kill();await closed;}mock.closeAllConnections();await new Promise(r=>mock.close(r));await fs.rm(temp,{recursive:true,force:true});}
});
