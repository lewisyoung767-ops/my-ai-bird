import test from 'node:test';
import assert from 'node:assert/strict';
import {brainConfig,createBrain,decisionSchema,reflectionSchema,localContext} from '../ai-provider.js';
import {validateDecision,validateMind,initialMind} from '../brain.js';
import {updateEnvText} from '../local-runtime.js';
const decision={thought:'I wonder whether the rain has a favourite colour.',action_label:'considering_the_rain',target:'window',create_or_edit_file:null,question_for_you:'What colour does rain make you think of?',request_for_you:null,message_for_you:null};
const config=()=>brainConfig({DEMO_MODE:'false',AI_PROVIDER:'ollama'});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});

test('local AI needs no key, and legacy OpenAI/demo configurations remain supported',()=>{
  assert.equal(config().model,'qwen2.5:3b');assert.equal(config().timeoutMs,180000);
  assert.equal(brainConfig({}).provider,'demo');
  assert.equal(brainConfig({DEMO_MODE:'false',OPENAI_API_KEY:'test'}).provider,'openai');
  assert.throws(()=>brainConfig({DEMO_MODE:'false'}),/OPENAI_API_KEY/);
});
test('local configuration refuses cloud hosts, credentials, cloud models and invalid timeouts',()=>{
  for(const url of ['https://example.com','http://192.168.0.2:11434','http://localhost@evil.com','http://user:pass@localhost:11434','http://localhost:11434/proxy','file:///tmp/ollama'])assert.throws(()=>brainConfig({DEMO_MODE:'false',AI_PROVIDER:'ollama',OLLAMA_BASE_URL:url}));
  assert.throws(()=>brainConfig({AI_PROVIDER:'ollama',OLLAMA_MODEL:'gemma4:cloud'}),/cloud/);
  assert.throws(()=>brainConfig({AI_PROVIDER:'ollama',AI_TIMEOUT_SECONDS:'0'}),/TIMEOUT/);
});
test('local requests use JSON schemas and bounded context, with no API key or cloud fallback',async()=>{
  const calls=[];
  const ask=createBrain(config(),{fetchImpl:async(url,options)=>{calls.push({url,options,body:JSON.parse(options.body)});return url.endsWith('/api/show')?json({details:{family:'qwen2'}}):json({done:true,message:{content:JSON.stringify(decision)}});},openAIClient:{chat:{completions:{create(){throw new Error('Must not call OpenAI');}}}}});
  assert.deepEqual(validateDecision(await ask('Choose your own action',{memories:[],conversation:[],files:[]},decisionSchema)),decision);
  assert.equal(calls.length,2);assert.equal(calls[1].body.format.properties.target.enum.includes('window'),true);assert.equal(calls[1].body.stream,false);assert.equal(calls[1].body.options.num_ctx,8192);
  assert.equal(calls[1].options.headers.Authorization,undefined);assert.ok(calls.every(c=>c.url.startsWith('http://127.0.0.1:11434/')));
  await ask('Choose again',{},decisionSchema);assert.equal(calls.filter(c=>c.url.endsWith('/api/show')).length,1);
});
test('reflection uses its own schema and validates a complete mind',async()=>{
  const ask=createBrain(config(),{fetchImpl:async(url,options)=>url.endsWith('/api/show')?json({}):json({message:{content:JSON.stringify(initialMind)}})});
  assert.deepEqual(validateMind(await ask('Reflect',{},reflectionSchema)),initialMind);
});
test('local provider refuses models that proxy to cloud',async()=>{
  const ask=createBrain(config(),{fetchImpl:async()=>json({remote_host:'https://ollama.com',remote_model:'remote'})});
  await assert.rejects(ask('Choose',{}),/cloud inference/);
});
test('missing models, offline service, malformed output and truncated output surface errors',async()=>{
  await assert.rejects(createBrain(config(),{fetchImpl:async()=>json({},404)})('Choose',{}),/ollama pull/);
  await assert.rejects(createBrain(config(),{fetchImpl:async()=>{throw new Error('offline');}})('Choose',{}),/Cannot reach local Ollama/);
  await assert.rejects(createBrain(config(),{fetchImpl:async url=>url.endsWith('/api/show')?json({}):json({message:{content:'not JSON'}})})('Choose',{}),SyntaxError);
  await assert.rejects(createBrain(config(),{fetchImpl:async url=>url.endsWith('/api/show')?json({}):json({done_reason:'length',message:{content:'{}'}})})('Choose',{}),/cut short/);
});
test('small-model context preserves recent conversations and bounded creation excerpts',()=>{
  const bounded=localContext({mind:initialMind,memories:Array(30).fill({thought:'a'.repeat(800)}),conversation:Array(30).fill({text:'b'.repeat(1200)}),files:Array(3).fill({name:'a.txt',content:'c'.repeat(9000)})});
  assert.equal(bounded.memories.length,5);assert.equal(bounded.memories[0].thought.length,400);assert.equal(bounded.conversation.length,8);assert.equal(bounded.files.length,2);assert.equal(bounded.files[0].content.length,1800);
});
test('setup changes only intended environment values and preserves private keys',()=>{
  const source='OPENAI_API_KEY=private-test-key\r\nDEMO_MODE=true\r\nPORT=3001\r\n';
  const updated=updateEnvText(source,{DEMO_MODE:'false',AI_PROVIDER:'ollama'});
  assert.match(updated,/OPENAI_API_KEY=private-test-key/);assert.match(updated,/PORT=3001/);assert.match(updated,/DEMO_MODE=false/);assert.match(updated,/AI_PROVIDER=ollama/);assert.doesNotMatch(updated,/DEMO_MODE=true/);
  assert.throws(()=>updateEnvText(source,{AI_PROVIDER:'ollama\nBAD=true'}));
});
