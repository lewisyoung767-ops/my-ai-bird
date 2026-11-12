import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExtensions,validateTaskInput,applyRoomAction,initialRoom} from '../autonomy.js';
import {safeUpdatePath} from '../scripts/update-pip.mjs';
test('new capabilities validate task, research and bounded room actions',()=>{
  assert.equal(validateTaskInput({kind:'drawing',description:'Draw a lighthouse'}).kind,'drawing');assert.throws(()=>validateTaskInput({kind:'shell',description:'bad'}));
  assert.throws(()=>validateExtensions({web_action:{type:'download',url:'https://example.com'}}));assert.throws(()=>validateExtensions({task_update:{status:'completed',summary:''}}));
  for(const change of [{op:'add',kind:'script',label:'x',color:'#ffffff',x:0,z:0,scale:1},{op:'add',kind:'plant',label:'fern',color:'#ffffff',x:9,z:0,scale:1},{op:'style',wall_color:'url(https://x)',floor_color:'#abcdef'}])assert.throws(()=>validateExtensions({scene_action:change}));
});
test('room changes preserve the base room and support styling, adding and removing props',()=>{
  const action={op:'add',kind:'plant',label:'A real fern',color:'#779955',x:1,z:1,scale:.8};validateExtensions({scene_action:action});const room=applyRoomAction(initialRoom,action,'fern');assert.equal(room.objects.length,1);assert.equal(initialRoom.objects.length,0);
  assert.equal(applyRoomAction(room,{op:'remove',id:'fern'}).objects.length,0);assert.throws(()=>applyRoomAction(room,{op:'remove',id:'bed'}));
  assert.equal(applyRoomAction(room,{op:'style',wall_color:'#abcdef',floor_color:'#fedcba'}).wall_color,'#abcdef');
  assert.throws(()=>applyRoomAction({...room,objects:Array(24).fill(room.objects[0])},action,'extra'));
});
test('updater rejects runtime data, traversal, Windows devices and casing tricks',()=>{
  for(const name of ['../server.js','data/mind.json','DATA/mind.json','Data./mind.json','.env','.env.local','.git/config','node_modules/a.js','.local-ai/models/a','C:/secret','public\\a.js','con.txt','public/../.env'])assert.throws(()=>safeUpdatePath(name),name);
  for(const name of ['server.js','public/workshop.js','.env.example','scripts/update-pip.mjs'])assert.equal(safeUpdatePath(name),name);
});
