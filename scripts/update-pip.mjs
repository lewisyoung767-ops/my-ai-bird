import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function safeUpdatePath(relative){
  if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.split('/').some(p=>!p||p==='.'||p==='..'||p.endsWith('.')||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p)||! /^[\w.-]+$/.test(p)))throw new Error('Invalid update path');
  const first=relative.split('/')[0].toLowerCase();if(['data','bird_creations','.local-ai','.git','.updates','node_modules'].includes(first)||first.startsWith('.env')&&relative!=='.env.example')throw new Error('Runtime files cannot be updated');return relative;
}
async function regularDestination(relative){const parts=safeUpdatePath(relative).split('/');let current=root;for(const part of parts){current=path.join(current,part);try{const s=await fs.lstat(current);if(s.isSymbolicLink())throw new Error('Linked paths cannot be updated automatically');}catch(e){if(e.code!=='ENOENT')throw e;}}return current;}
async function run(exe,args){await new Promise((resolve,reject)=>{const p=spawn(exe,args,{cwd:root,stdio:'inherit',windowsHide:true});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error('Update command exited with code '+code)));});}
export async function updatePip(){
  if(process.platform!=='win32')throw new Error('This updater is for Windows. Use git pull on other platforms.');
  let port=3000;try{const env=await fs.readFile(path.join(root,'.env'),'utf8');port=Number(env.match(/^PORT\s*=\s*(\d+)/m)?.[1]||3000);}catch{}
  try{const res=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1000)});if(res.ok)throw new Error('PIP_RUNNING');}catch(e){if(e.message==='PIP_RUNNING')throw new Error('Close the old Pip server with Ctrl+C, then run Update-Pip.cmd again.');}
  const stage=path.join(root,'.updates',randomUUID());await fs.mkdir(stage,{recursive:true});const archive=path.join(stage,'source.zip');
  console.log('Downloading the latest main branch. Your settings, memories, creations and local model will be kept.');
  const res=await fetch('https://github.com/lewisyoung767-ops/my-ai-bird/archive/refs/heads/main.zip',{signal:AbortSignal.timeout(120000)});if(!res.ok||!res.body)throw new Error('Could not download the latest project');
  if(Number(res.headers.get('content-length'))>100000000)throw new Error('Update archive is unexpectedly large');
  let received=0;await pipeline(Readable.fromWeb(res.body),async function*(source){for await(const chunk of source){received+=chunk.length;if(received>100000000)throw new Error('Update archive is too large');yield chunk;}},createWriteStream(archive));
  await run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts','unpack-local-ai.ps1'),'-Archive',archive,'-Destination',stage]);
  const source=path.join(stage,'my-ai-bird-main');const manifest=JSON.parse(await fs.readFile(path.join(source,'update-manifest.json'),'utf8'));
  if(!Array.isArray(manifest)||manifest.length>200||!manifest.includes('server.js')||!manifest.includes('package.json'))throw new Error('Invalid project update manifest');
  for(const relative of manifest){safeUpdatePath(relative);const file=path.join(source,relative);if(!(await fs.lstat(file)).isFile())throw new Error('Update contains an invalid file');await regularDestination(relative);}
  const backup=path.join(stage,'backup');
  for(const relative of manifest){const destination=await regularDestination(relative);try{await fs.access(destination);const copy=path.join(backup,relative);await fs.mkdir(path.dirname(copy),{recursive:true});await fs.copyFile(destination,copy);}catch(e){if(e.code!=='ENOENT')throw e;}await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(path.join(source,relative),destination);}
  console.log('Updating project dependencies…');
  await run('cmd.exe',['/d','/c','npm.cmd install --ignore-scripts']);
  console.log('Update complete. Run Start-Pip.cmd, then refresh localhost. Code backups are in '+backup);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))updatePip().catch(e=>{console.error('Update could not finish: '+e.message+'\nYour runtime data was not replaced. If dependency installation failed, retry npm install before starting Pip.');process.exitCode=1;});
