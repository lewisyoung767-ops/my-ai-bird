export const DEFAULT_LOCAL_MODEL = 'qwen2.5:3b';
export function brainConfig(env = process.env) {
  const demo = (env.DEMO_MODE || 'true').toLowerCase() === 'true';
  const provider = (env.AI_PROVIDER || 'openai').toLowerCase();
  if (!['openai','ollama'].includes(provider)) throw new Error('AI_PROVIDER must be openai or ollama');
  const timeout = Number(env.AI_TIMEOUT_SECONDS || (provider === 'ollama' ? 180 : 30));
  if (!Number.isFinite(timeout) || timeout < 5 || timeout > 600) throw new Error('AI_TIMEOUT_SECONDS must be between 5 and 600');
  const model = provider === 'ollama' ? (env.OLLAMA_MODEL || DEFAULT_LOCAL_MODEL) : (env.OPENAI_MODEL || 'gpt-4o-mini');
  const url = new URL(env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434');
  if (provider === 'ollama') {
    if (url.protocol !== 'http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('OLLAMA_BASE_URL must be a local HTTP origin');
    if (!/^[a-zA-Z0-9_.:/-]+$/.test(model) || /cloud/i.test(model)) throw new Error('Choose a downloaded local OLLAMA_MODEL, not a cloud model');
  }
  if (!demo && provider === 'openai' && !env.OPENAI_API_KEY) throw new Error('Add OPENAI_API_KEY, use AI_PROVIDER=ollama, or set DEMO_MODE=true');
  return {demo,provider:demo?'demo':provider,model:demo?null:model,localURL:url.origin,timeoutMs:timeout*1000};
}
export function localContext(context) {
  return {...context,
    memories:context.memories?.slice(-5).map(m=>({...m,thought:m.thought?.slice(0,400)})),
    conversation:context.conversation?.slice(-8).map(m=>({...m,text:m.text?.slice(0,650)})),
    files:context.files?.slice(0,2).map(f=>({name:f.name,content:f.content.slice(0,1800)}))};
}
export function createBrain(config,{openAIClient,fetchImpl=fetch}={}) {
  let verified=false;
  return async function ask(system,context,schema) {
    if(config.provider==='demo')throw new Error('Demo mode does not call AI');
    if(config.provider==='openai') {
      const completion=await openAIClient.chat.completions.create({model:config.model,response_format:{type:'json_object'},max_tokens:2600,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(context)}]});
      return JSON.parse(completion.choices[0].message.content);
    }
    async function post(endpoint,body) {
      let response;
      try{response=await fetchImpl(config.localURL+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(config.timeoutMs)});}
      catch(e){throw new Error(e.name==='TimeoutError'?'Local AI timed out. Try a smaller model or increase AI_TIMEOUT_SECONDS.':'Cannot reach local Ollama. Open Ollama or run Setup-Local-AI.cmd.');}
      if(!response.ok)throw new Error(response.status===404?`Local model missing. Run ollama pull ${config.model}, or Setup-Local-AI.cmd.`:`Ollama returned HTTP ${response.status}. Check its terminal.`);
      return response.json();
    }
    if(!verified){const info=await post('/api/show',{model:config.model});if(info.remote_host||info.remote_model)throw new Error('This model uses cloud inference. Choose a downloaded local model.');verified=true;}
    const result=await post('/api/chat',{model:config.model,stream:false,format:schema||'json',keep_alive:'5m',options:{num_ctx:8192,num_predict:2400,temperature:0.8},messages:[{role:'system',content:system+' Return only one complete JSON object. Keep file creations short (under 4000 characters).'},{role:'user',content:JSON.stringify(localContext(context))}]});
    if(result.done_reason==='length')throw new Error('Local AI response was cut short. Pip will try again next cycle.');
    return JSON.parse(result.message.content);
  };
}
const text={type:['string','null'],maxLength:600};
export const decisionSchema={type:'object',additionalProperties:false,required:['thought','action_label','target','create_or_edit_file','question_for_you','request_for_you','message_for_you'],properties:{thought:{type:'string',minLength:1,maxLength:800},action_label:{type:'string',minLength:1,maxLength:100},target:{type:'string',enum:['bed','bowl','desk','window','random_spot']},create_or_edit_file:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['filename','content'],properties:{filename:{type:'string'},content:{type:'string',maxLength:4000}}}]},question_for_you:text,request_for_you:text,message_for_you:text}};
export const reflectionSchema={type:'object',additionalProperties:false,required:['core_traits','current_obsession','active_project','worldview'],properties:{core_traits:{type:'array',minItems:1,maxItems:8,items:{type:'string',maxLength:120}},current_obsession:{type:'string',maxLength:1000},active_project:{type:'string',maxLength:1000},worldview:{type:'string',maxLength:1000}}};
