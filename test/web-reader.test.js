import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {publicURL,publicIP,resolvePublic,extractPage,createWebReader} from '../web-reader.js';
test('web reader rejects loopback, private, metadata, reserved and encoded addresses',async()=>{
  for(const ip of ['127.0.0.1','10.0.0.2','169.254.169.254','192.168.1.1','100.64.0.1','0.0.0.0','224.0.0.1','198.18.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1','2001:db8::1'])assert.equal(publicIP(ip),false,ip);
  for(const url of ['file:///etc/passwd','http://example.com','https://127.0.0.1','https://2130706433','https://[::1]','https://localhost','https://example.com:8443','https://user:pass@example.com'])assert.throws(()=>publicURL(url),url);
  await assert.rejects(resolvePublic('https://example.com',async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]),/DNS/);
  assert.equal(publicIP('8.8.8.8'),true);assert.equal(publicIP('2606:4700:4700::1111'),true);
});
test('HTML extraction returns text and removes executable/interface content',()=>{
  const result=extractPage('<title>Learning about clouds</title><script>STEAL</script><nav>JUNK</nav><main><h1>Clouds</h1><p>Clouds contain tiny water droplets.</p></main>');assert.equal(result.title,'Learning about clouds');assert.match(result.text,/water droplets/);assert.doesNotMatch(result.text,/STEAL|JUNK/);
});
function transport(responseFactory,seen){return (url,options,callback)=>{const req=new EventEmitter();req.setTimeout=()=>req;req.end=()=>{seen.push({url:url.href,options});queueMicrotask(()=>{const config=responseFactory(url);const res=Readable.from([Buffer.from(config.body||'')]);res.statusCode=config.status||200;res.headers=config.headers||{'content-type':'text/html'};callback(res);});};req.destroy=e=>req.emit('error',e);return req;};}
test('each connection pins a verified public DNS address and redirects are revalidated',async()=>{
  const seen=[];const reader=createWebReader({resolver:async()=>[{address:'8.8.8.8',family:4}],request:transport(()=>({body:'<title>Source</title><main>Some actual page text</main>'}),seen)});
  assert.equal((await reader.read('https://example.com')).title,'Source');let pinned;seen[0].options.lookup('example.com',{},(_err,address)=>pinned=address);assert.equal(pinned,'8.8.8.8');assert.equal(seen[0].options.agent,false);assert.equal(seen[0].options.method,'GET');
  const redirect=createWebReader({resolver:async()=>[{address:'8.8.8.8',family:4}],request:transport(()=>({status:302,headers:{location:'https://127.0.0.1/private'}}),[])});await assert.rejects(redirect.read('https://example.com'),/addresses|HTTPS/);
});
test('encyclopedia search has real URLs and does not treat snippets as full pages',async()=>{
  const reader=createWebReader({resolver:async()=>[{address:'8.8.8.8',family:4}],request:transport(()=>({body:JSON.stringify({query:{search:[{title:'Sunlight',snippet:'<span>Light</span> from the Sun'}]}}),headers:{'content-type':'application/json'}}),[])});
  const result=await reader.search('sunlight');assert.equal(result.type,'search');assert.equal(result.results[0].url,'https://en.wikipedia.org/wiki/Sunlight');assert.equal(result.results[0].snippet,'Light from the Sun');
});
