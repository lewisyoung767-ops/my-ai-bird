export const taskKinds=['drawing','toy','story','research','other'];
export const propKinds=['plant','lamp','books','table','chair','perch','picture','box','sphere','cylinder'];
export const initialRoom={wall_color:'#f0e6cf',floor_color:'#dfb98a',objects:[]};
const short=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const colour=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function validateTaskInput(v){if(!v||!taskKinds.includes(v.kind)||!short(v.description,800))throw new Error('Choose a task type and write a request (up to 800 characters).');return {kind:v.kind,description:v.description.trim()};}
export function validateExtensions(raw){
  const web=raw.web_action||null,task=raw.task_update||null,room=raw.scene_action||null;
  if(web&&(!['search','read'].includes(web.type)||web.type==='search'&&!short(web.query,180)||web.type==='read'&&!short(web.url,1800)))throw new Error('Invalid web action');
  if(task&&(!['in_progress','completed','deferred'].includes(task.status)||!short(task.summary,600)||task.id!=null&&!short(task.id,80)||task.id==null&&(!short(task.title,100)||!taskKinds.includes(task.kind))||task.result_file!=null&&!short(task.result_file,90)))throw new Error('Invalid task update');
  if(room){
    if(!['add','remove','style'].includes(room.op))throw new Error('Invalid room change');
    if(room.op==='add'&&(!propKinds.includes(room.kind)||!short(room.label,80)||!colour(room.color)||!Number.isFinite(room.x)||Math.abs(room.x)>2.8||!Number.isFinite(room.z)||Math.abs(room.z)>2.4||!Number.isFinite(room.scale)||room.scale<.3||room.scale>1.5))throw new Error('Invalid room decoration');
    if(room.op==='remove'&&!short(room.id,80))throw new Error('Invalid decoration id');
    if(room.op==='style'&&(!colour(room.wall_color)||!colour(room.floor_color)))throw new Error('Invalid room colours');
  }
  return {web_action:web,task_update:task,scene_action:room,mind_update:raw.mind_update||null};
}
export function applyRoomAction(room,action,id){
  const next=structuredClone(room);
  if(action.op==='style'){next.wall_color=action.wall_color;next.floor_color=action.floor_color;}
  if(action.op==='remove'){if(!next.objects.some(o=>o.id===action.id))throw new Error('Decoration no longer exists');next.objects=next.objects.filter(o=>o.id!==action.id);}
  if(action.op==='add'){if(next.objects.length>=24)throw new Error('The room has 24 decorations. Remove one before adding another.');next.objects.push({id,kind:action.kind,label:action.label,color:action.color,x:action.x,z:action.z,scale:action.scale});}
  return next;
}
const nullableString={type:['string','null']};
export const extensionSchemas={
  web_action:{anyOf:[{type:'null'},{type:'object',required:['type','query','url'],properties:{type:{type:'string',enum:['search','read']},query:nullableString,url:nullableString}}]},
  task_update:{anyOf:[{type:'null'},{type:'object',required:['id','title','kind','status','summary','result_file'],properties:{id:nullableString,title:nullableString,kind:{type:'string',enum:taskKinds},status:{type:'string',enum:['in_progress','completed','deferred']},summary:{type:'string',maxLength:600},result_file:nullableString}}]},
  scene_action:{anyOf:[{type:'null'},
    {type:'object',required:['op','kind','label','color','x','z','scale'],properties:{op:{const:'add'},kind:{type:'string',enum:propKinds},label:{type:'string',maxLength:80},color:{type:'string'},x:{type:'number',minimum:-2.8,maximum:2.8},z:{type:'number',minimum:-2.4,maximum:2.4},scale:{type:'number',minimum:.3,maximum:1.5}}},
    {type:'object',required:['op','id'],properties:{op:{const:'remove'},id:{type:'string'}}},
    {type:'object',required:['op','wall_color','floor_color'],properties:{op:{const:'style'},wall_color:{type:'string'},floor_color:{type:'string'}}}]}
};
