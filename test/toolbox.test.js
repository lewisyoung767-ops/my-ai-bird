import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createToolbox} from '../toolbox.js';
test('self-made tools require real files and browser results are stored only from the chosen client',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pip-tools-'));const stored={};let connection;const handlers={},otherHandlers={};let job;
  try{
    const box=await createToolbox({load:async(_name,fallback)=>fallback,save:async(name,value)=>stored[name]=structuredClone(value),creations:root});
    box.attach({get(){}},{emit(){},on(_event,fn){connection=fn;}});
    const client={connected:true,emit(event,payload){if(event==='tool:execute')job=payload;},on(event,fn){handlers[event]=fn;}};connection(client);handlers['tool:ready'](true);connection({connected:true,emit(){},on(event,fn){otherHandlers[event]=fn;}});
    await assert.rejects(box.register({name:'fake',filename:'../server.js'}));await fs.writeFile(path.join(root,'helper.html'),'<title>Helper</title>');
    await box.register({name:'My own method',purpose:'A freely chosen purpose',usage:'Input an object',filename:'helper.html'});const tool=box.context().tools[0];
    const pending=box.run({id:tool.id,input_json:'{"n":21}'});for(let i=0;i<30&&!job;i++)await new Promise(r=>setTimeout(r,10));assert.ok(job);
    otherHandlers['tool:result']({id:job.id,ok:true,result:'forged'});handlers['tool:result']({id:job.id,ok:true,result:{answer:42}});
    const result=await pending;assert.equal(result.ok,true);assert.equal(result.result.answer,42);assert.match(await fs.readFile(path.join(root,result.result_file),'utf8'),/42/);assert.equal(stored['toolbox.json'].runs.length,1);
    const cancelled=box.run({id:tool.id,input_json:'{}'});job=null;for(let i=0;i<30&&!job;i++)await new Promise(r=>setTimeout(r,10));box.abort();assert.equal((await cancelled).ok,false);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
