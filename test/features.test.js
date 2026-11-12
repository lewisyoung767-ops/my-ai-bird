import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createFeatures} from '../features.js';
test('task completion requires a real file; room and research results persist',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pip-features-'));const saved={};let connect;const handlers={};
  try{
    const features=await createFeatures({load:async(_name,fallback)=>structuredClone(fallback),save:async(name,value)=>saved[name]=structuredClone(value),creations:root,demo:false,webReader:{read:async url=>({type:'read',title:'A verified source',url,text:'A lighthouse helps ships navigate.',at:new Date().toISOString()})}});
    features.attach({get(){}},{emit(){},on(_event,fn){connect=fn;}});connect({emit(){},on(event,fn){handlers[event]=fn;}});
    let ack;await handlers['task:submit']({kind:'drawing',description:'Draw a lighthouse'},r=>ack=r);assert.equal(ack.ok,true);const id=features.context().tasks[0].id;
    await assert.rejects(features.apply({task_update:{id,status:'completed',summary:'Done',result_file:'missing.svg'}}));assert.equal(features.context().tasks[0].status,'queued');
    await fs.writeFile(path.join(root,'lighthouse.svg'),'<svg xmlns="http://www.w3.org/2000/svg"><rect width="20" height="100"/></svg>');
    await features.apply({task_update:{id,status:'completed',summary:'Drew a lighthouse',result_file:'lighthouse.svg'},scene_action:{op:'add',kind:'lamp',label:'Reading lamp',color:'#eebb66',x:1,z:1,scale:1}});
    assert.equal(saved['tasks.json'][0].status,'completed');assert.equal(saved['room.json'].objects[0].kind,'lamp');
    const observation=await features.web({type:'read',url:'https://example.com'},new AbortController().signal);assert.equal(observation.title,'A verified source');assert.equal(saved['research.json'].length,1);
    await handlers['internet:enabled'](false,()=>{});assert.match((await features.web({type:'read',url:'https://example.com'},new AbortController().signal)).error,/off/);
    await handlers['room:reset'](null,()=>{});assert.equal(saved['room.json'].objects.length,0);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
