import fs from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export async function findOllama(root) {
  const portable=path.join(root,'.local-ai','ollama',process.platform==='win32'?'ollama.exe':'ollama');
  try{await fs.access(portable);return {exe:portable,portable:true};}catch{}
  if(process.platform==='win32'){
    const installed=path.join(process.env.LOCALAPPDATA||'','Programs','Ollama','ollama.exe');
    try{await fs.access(installed);return {exe:installed,portable:false};}catch{}
  }
  const check=spawnSync('ollama',['--version'],{windowsHide:true,timeout:10000,stdio:'ignore'});
  return check.error?null:{exe:'ollama',portable:false};
}
export function ollamaEnvironment(root,runtime,url) {
  return {...process.env,OLLAMA_HOST:url,...(runtime.portable?{OLLAMA_MODELS:path.join(root,'.local-ai','models')}:{})};
}
export async function ollamaReady(url) {
  try{const r=await fetch(url+'/api/version',{signal:AbortSignal.timeout(2000)});return r.ok&&typeof (await r.json()).version==='string';}catch{return false;}
}
export async function ensureOllama(root,config,runtime) {
  if(await ollamaReady(config.localURL))return;
  runtime ||= await findOllama(root);
  if(!runtime)throw new Error('Ollama is not installed yet. Double-click Setup-Local-AI.cmd first.');
  const logs=path.join(root,'.local-ai','logs');await fs.mkdir(logs,{recursive:true});
  const out=openSync(path.join(logs,'ollama.log'),'a');
  const child=spawn(runtime.exe,['serve'],{cwd:root,env:ollamaEnvironment(root,runtime,config.localURL),detached:true,windowsHide:true,stdio:['ignore',out,out]});
  let failure;child.on('error',e=>failure=e);child.unref();closeSync(out);
  for(let i=0;i<40;i++){if(failure)throw failure;if(await ollamaReady(config.localURL))return;await new Promise(r=>setTimeout(r,500));}
  throw new Error('Ollama did not start. Check .local-ai/logs/ollama.log, then try Setup-Local-AI.cmd.');
}

export function updateEnvText(existing,values) {
  let text=existing;
  for(const [key,value] of Object.entries(values)){
    if(!/^[A-Z][A-Z0-9_]*$/.test(key)||/[\r\n]/.test(String(value)))throw new Error('Invalid configuration value');
    const pattern=new RegExp('^(?:export\\s+)?'+key+'\\s*=.*$','gm');
    text=pattern.test(text)?text.replace(pattern,()=>key+'='+value):text.replace(/\s*$/,'')+'\n'+key+'='+value+'\n';
  }
  return text;
}
