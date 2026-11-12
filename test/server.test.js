import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('demo server starts, serves room, seeds gallery, and exposes working Socket.io',async()=>{
  // Run a disposable project copy so smoke tests never modify the bird’s actual mind.
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'pip-smoke-'));
  let child;
  try{
    for(const name of ['server.js','city.js','workspace.js','brain.js','autonomy.js','features.js','toolbox.js','learning.js','learning-ledger.js','artifact-review.js','web-reader.js','autonomy-prompt.js','ai-provider.js','package.json'])await fs.copyFile(path.join(project,name),path.join(temp,name));
    await fs.cp(path.join(project,'public'),path.join(temp,'public'),{recursive:true});
    await fs.symlink(path.join(project,'node_modules'),path.join(temp,'node_modules'),process.platform==='win32'?'junction':'dir');
    const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
    let log='';child=spawn(process.execPath,['server.js'],{cwd:temp,env:{...process.env,DEMO_MODE:'true',PORT:String(port),CYCLE_SECONDS:'5',CITY_SPEED:'50'},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
    const base=`http://127.0.0.1:${port}`;
    let ready=false;for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
    assert.ok(ready,log);assert.equal((await (await fetch(base+'/api/health')).json()).demo,true);
    assert.match(await (await fetch(base)).text(),/Pip/);
    const files=await (await fetch(base+'/api/creations')).json();assert.ok(files.some(f=>f.name.endsWith('.svg')));assert.ok(files.some(f=>f.name.endsWith('.txt')));
    const source=await (await fetch(base+'/api/creations/first-sketch.svg')).json();assert.match(source.content,/<svg/);
    const preview=await fetch(base+'/api/preview/first-sketch.svg');assert.equal(preview.status,200);assert.match(preview.headers.get('content-security-policy'),/sandbox allow-scripts/);assert.match(preview.headers.get('content-security-policy'),/connect-src 'none'/);
    assert.equal((await fetch(base+'/api/creations/CON.txt')).status,400);
    assert.equal((await fetch(base+'/vendor/three.module.js')).status,200);
    assert.equal((await fetch(base+'/.env')).status,404);
    const socket=await fetch(base+'/socket.io/?EIO=4&transport=polling');assert.equal(socket.status,200);assert.match(await socket.text(),/sid/);
    // Exercise real Socket.io protocol over Engine.io polling without another dependency.
    const handshake=await (await fetch(base+'/socket.io/?EIO=4&transport=polling')).text();const sid=JSON.parse(handshake.slice(1)).sid;
    const endpoint=base+`/socket.io/?EIO=4&transport=polling&sid=${sid}`;
    await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:'40'});await fetch(endpoint);
    await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:'42["brain:pause",true]'});
    await new Promise(r=>setTimeout(r,100));assert.equal((await (await fetch(base+'/api/state')).json()).paused,true);
    await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:'42["brain:pause",false]'});
    await new Promise(r=>setTimeout(r,100));assert.equal((await (await fetch(base+'/api/state')).json()).paused,false);
    await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:'42["companion:message","Hello Pip, I like tiny bugs!"]'});
    await new Promise(r=>setTimeout(r,100));assert.ok((await (await fetch(base+'/api/conversation')).json()).some(m=>m.role==='you'&&m.text==='Hello Pip, I like tiny bugs!'));
    assert.doesNotMatch(log,/Brain cycle:|Error:/);
  }finally{if(child){const closed=new Promise(r=>child.once('exit',r));child.kill();await closed;}await fs.rm(temp,{recursive:true,force:true});}
});
