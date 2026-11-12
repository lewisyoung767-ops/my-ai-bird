import fs from 'node:fs/promises';
import {createWriteStream,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {spawn} from 'node:child_process';
import {brainConfig,createBrain,decisionSchema} from '../ai-provider.js';
import {validateDecision} from '../brain.js';
import {findOllama,ensureOllama,ollamaEnvironment,updateEnvText} from '../local-runtime.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(root);
async function run(exe,args,options={}){
  await new Promise((resolve,reject)=>{const child=spawn(exe,args,{cwd:root,stdio:'inherit',windowsHide:true,...options});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${path.basename(exe)} exited with code ${code}`)));});
}
async function downloadRuntime(){
  if(process.platform!=='win32')throw new Error('Install Ollama from https://ollama.com/download, then run this setup again.');
  const arch=process.arch==='arm64'?'arm64':process.arch==='x64'?'amd64':null;
  if(!arch)throw new Error('This setup supports Windows ARM64 and x64 only.');
  console.log('Downloading the official Ollama Windows '+arch+' runtime. No administrator access is required.');
  const release=await fetch('https://api.github.com/repos/ollama/ollama/releases/latest',{headers:{'Accept':'application/vnd.github+json','User-Agent':'Pip-local-AI-setup'},signal:AbortSignal.timeout(30000)});
  if(!release.ok)throw new Error('Could not read the official Ollama release. Check your internet connection.');
  const info=await release.json();const asset=info.assets?.find(a=>a.name===`ollama-windows-${arch}.zip`);
  if(!asset||!/^sha256:[a-f0-9]{64}$/i.test(asset.digest||''))throw new Error('The official release has no matching checksummed Windows archive. Install from https://ollama.com/download/windows and rerun setup.');
  const url=new URL(asset.browser_download_url);
  if(url.origin!=='https://github.com'||!url.pathname.startsWith('/ollama/ollama/releases/download/'))throw new Error('Unexpected runtime download location');
  console.log(`Ollama ${info.tag_name}; download size ${(asset.size/1024**3).toFixed(2)} GB.`);
  const cache=path.join(root,'.local-ai');await fs.mkdir(cache,{recursive:true});const archive=path.join(cache,'ollama-runtime.zip');const partial=archive+'.part';
  const response=await fetch(url,{signal:AbortSignal.timeout(30*60*1000)});if(!response.ok||!response.body)throw new Error('Ollama download failed');
  try{await pipeline(Readable.fromWeb(response.body),createWriteStream(partial));const hash=createHash('sha256');for await(const chunk of createReadStream(partial))hash.update(chunk);if(hash.digest('hex')!==asset.digest.slice(7).toLowerCase())throw new Error('Ollama checksum mismatch. Download was not installed.');await fs.rename(partial,archive);}
  finally{await fs.rm(partial,{force:true});}
  await run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts','unpack-local-ai.ps1'),'-Archive',archive,'-Destination',path.join(cache,'ollama')]);
  await fs.rm(archive,{force:true});
  const runtime=await findOllama(root);if(!runtime)throw new Error('Ollama was downloaded but its executable could not be found');return runtime;
}
try{
  console.log('\nPip local AI setup — no API key, account or API charges.\n');
  const config=brainConfig({DEMO_MODE:'false',AI_PROVIDER:'ollama',OLLAMA_MODEL:'qwen2.5:3b',AI_TIMEOUT_SECONDS:'300'});
  const runtime=await findOllama(root)||await downloadRuntime();
  await ensureOllama(root,config,runtime);
  console.log('Downloading qwen2.5:3b (about 1.9 GB). Existing model downloads will be reused.');
  await run(runtime.exe,['pull',config.model],{env:ollamaEnvironment(root,runtime,config.localURL)});
  console.log('Checking that the local model can produce a valid bird decision. This can take a few minutes on CPU.');
  const ask=createBrain(config);validateDecision(await ask('You are Pip, a curious virtual bird. Pick one short thought, invent an action label and choose bed, bowl, desk, window or random_spot. Return JSON. For this connection test, set create_or_edit_file, question_for_you, request_for_you and message_for_you to null.',{mind:{current_obsession:'tiny garden discoveries'}},decisionSchema));
  const envPath=path.join(root,'.env');let existing;
  try{existing=await fs.readFile(envPath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;existing=await fs.readFile(path.join(root,'.env.example'),'utf8');}
  const next=updateEnvText(existing,{AI_PROVIDER:'ollama',OLLAMA_BASE_URL:config.localURL,OLLAMA_MODEL:config.model,AI_TIMEOUT_SECONDS:300,DEMO_MODE:'false'});
  // Write a temporary replacement only after the model has passed its real connection test.
  await fs.writeFile(envPath+'.local-ai-tmp',next);await fs.rename(envPath+'.local-ai-tmp',envPath);
  console.log('\nSuccess. Pip is configured for LOCAL AI. Your existing API key (if any), memories and creations were preserved.\nStop the old Pip server with Ctrl+C, then run Start-Pip.cmd and refresh http://localhost:3000.\nThe footer should say LOCAL AI.');
}catch(e){console.error('\nSetup could not finish: '+e.message+'\nPip configuration was not switched. Check your internet connection and try again.');process.exitCode=1;}
