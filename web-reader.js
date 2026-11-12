import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import ipaddr from 'ipaddr.js';
import {load} from 'cheerio';

export function publicIP(address){try{return ipaddr.process(address).range()==='unicast';}catch{return false;}}
export function publicURL(value){
  if(typeof value!=='string'||value.length>1800)throw new Error('Invalid public page URL');
  const url=new URL(value);const host=url.hostname.replace(/^\[|\]$/g,'');
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||!host.includes('.')&& !isIP(host)||/\.(localhost|local|internal|test|invalid)$/i.test(host)||host==='localhost')throw new Error('Only public HTTPS pages are available');
  if(isIP(host)&&!publicIP(host))throw new Error('Private and reserved addresses are blocked');url.hash='';return url;
}
export async function resolvePublic(value,resolver=lookup){
  const url=publicURL(value);const host=url.hostname.replace(/^\[|\]$/g,'');
  const addresses=isIP(host)?[{address:host,family:isIP(host)}]:await resolver(host,{all:true,verbatim:true});
  if(!addresses.length||addresses.some(a=>!publicIP(a.address)))throw new Error('Private or reserved DNS answers are blocked');
  return {url,address:addresses[0]};
}
export function extractPage(html){
  const $=load(html);const title=$('title').first().text().trim().slice(0,180)||$('h1').first().text().trim().slice(0,180)||'Public page';
  $('script,style,noscript,iframe,form,nav,footer,header,svg').remove();
  const main=$('main,article,[role=main]').first();const text=(main.length?main:$('body')).text().replace(/\s+/g,' ').trim().slice(0,5000);
  return {title,text};
}
export function createWebReader({resolver=lookup,request=https.request}={}){
  async function get(value,signal,redirects=0){
    if(redirects>3)throw new Error('Too many redirects');
    const combined=AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(12000)]);
    const resolved=await Promise.race([resolvePublic(value,resolver),new Promise((_,reject)=>{if(combined.aborted)reject(combined.reason);else combined.addEventListener('abort',()=>reject(combined.reason),{once:true});})]);
    const {url,address}=resolved;combined.throwIfAborted();
    const response=await new Promise((resolve,reject)=>{
      const req=request(url,{method:'GET',agent:false,autoSelectFamily:false,signal:combined,lookup:(_host,options,cb)=>options.all?cb(null,[address]):cb(null,address.address,address.family),headers:{'User-Agent':'PipVirtualBird/1.0 (https://github.com/lewisyoung767-ops/my-ai-bird)','Accept':'text/html,text/plain,application/json','Accept-Encoding':'identity'}},res=>{
        const status=res.statusCode||0;
        if([301,302,303,307,308].includes(status)){res.resume();resolve({redirect:res.headers.location});return;}
        if(status<200||status>=300){res.resume();reject(new Error(`Page returned HTTP ${status}`));return;}
        const type=String(res.headers['content-type']||'').toLowerCase();
        if(!/^(text\/html|text\/plain|application\/json)/.test(type)||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();reject(new Error('Only uncompressed HTML, text and JSON pages can be read'));return;}
        const chunks=[];let bytes=0,finished=false;
        const finish=truncated=>{if(finished)return;finished=true;resolve({body:Buffer.concat(chunks).toString('utf8'),type,truncated,url:url.href});};
        res.on('data',chunk=>{const remaining=512000-bytes;if(remaining>0){chunks.push(chunk.subarray(0,remaining));bytes+=Math.min(chunk.length,remaining);}if(chunk.length>remaining||bytes>=512000){finish(true);res.destroy();}});
        res.on('end',()=>finish(false));res.on('error',e=>{if(!finished)reject(e);});
      });req.on('error',reject);req.setTimeout(10000,()=>req.destroy(new Error('Page timed out')));req.end();
    });
    if('redirect'in response){if(!response.redirect)throw new Error('Invalid redirect');return get(new URL(response.redirect,url).href,signal,redirects+1);}
    return response;
  }
  return {
    async search(query,signal){
      if(typeof query!=='string'||!query.trim()||query.length>180)throw new Error('Search needs 1–180 characters');
      const url=new URL('https://en.wikipedia.org/w/api.php');url.search=new URLSearchParams({action:'query',list:'search',srsearch:query,srlimit:'4',format:'json',utf8:'1'});
      const result=await get(url.href,signal);const data=JSON.parse(result.body);if(data.error)throw new Error('Encyclopedia search is unavailable');
      return {type:'search',title:'Wikipedia search: '+query,query,at:new Date().toISOString(),results:(data.query?.search||[]).slice(0,4).map(r=>({title:String(r.title).slice(0,180),url:'https://en.wikipedia.org/wiki/'+encodeURIComponent(r.title.replaceAll(' ','_')),snippet:load(String(r.snippet||'')).text().slice(0,450)}))};
    },
    async read(url,signal){const result=await get(url,signal);return {type:'read',url:result.url,at:new Date().toISOString(),...(result.type.startsWith('text/html')?extractPage(result.body):{title:new URL(result.url).hostname,text:result.body.slice(0,5000)}),truncated:result.truncated};}
  };
}
