import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { safePath, writeCreation, readCreation, listCreations } from '../workspace.js';
import { demoDecision, validateDecision, validateMind, initialMind } from '../brain.js';

test('sandbox rejects traversal, absolute paths, ADS, device names and executable types',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pip-test-'));
  try { for(const name of ['../server.js','..\\secret.txt','/tmp/a.txt','C:\\a.txt','a.txt:evil','CON.txt','lpt1.html','nested/a.txt','app.js','.env','x.svg.exe','hello%2ftest.txt','a..txt'])await assert.rejects(safePath(root,name)); }
  finally{await fs.rm(root,{recursive:true,force:true});}
});
test('creations can be written, edited, read and listed without exposing unrelated files',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pip-test-'));
  try{await writeCreation(root,'note.txt','hello');assert.equal(await readCreation(root,'note.txt'),'hello');await writeCreation(root,'note.txt','changed');assert.equal(await readCreation(root,'note.txt'),'changed');await fs.writeFile(path.join(root,'.hidden'),'secret');assert.deepEqual((await listCreations(root)).map(f=>f.name),['note.txt']);await assert.rejects(writeCreation(root,'large.txt','x'.repeat(150001)));await fs.mkdir(path.join(root,'directory.txt'));await assert.rejects(readCreation(root,'directory.txt'));}
  finally{await fs.rm(root,{recursive:true,force:true});}
});
test('symlinks are rejected when OS permits creating them',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pip-test-'));
  const outside=await fs.mkdtemp(path.join(os.tmpdir(),'pip-outside-'));
  try{await fs.writeFile(path.join(outside,'secret.txt'),'secret');try{await fs.symlink(path.join(outside,'secret.txt'),path.join(root,'link.txt'));}catch(e){if(['EPERM','EACCES'].includes(e.code)){t.skip('OS requires symlink privilege');return;}throw e;}await assert.rejects(readCreation(root,'link.txt'));await assert.rejects(writeCreation(root,'link.txt','changed'));assert.equal(await fs.readFile(path.join(outside,'secret.txt'),'utf8'),'secret');}
  finally{await fs.rm(root,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
});
test('demo decisions have valid custom actions and desk-bound creation',()=>{
  for(let i=1;i<=20;i++)assert.ok(validateDecision(demoDecision(i)));
  assert.throws(()=>validateDecision({thought:'hi',action_label:'testing',target:'system'}));
  assert.throws(()=>validateDecision({thought:'hi',action_label:'testing',target:'bed',create_or_edit_file:{filename:'x.txt',content:'a'}}));
  assert.deepEqual(validateMind(initialMind),initialMind);assert.throws(()=>validateMind({...initialMind,core_traits:'oops'}));
});
