// Shared data-only city geometry and navigation; no browser dependencies.
export const CITY_LIMIT=18;
export const CITY_TREES=[[-4,-3],[-2,-4],[-4,1],[-15,-5],[-9,-16],[9,-16],[15,7],[-16,15],[3,14],[2,-2],[4,-4],[16,-6]];
export const CITY_OBSTACLES=[{x:-14,z:4,w:2.8,d:1.5},{x:-10,z:4,w:2.8,d:1.5},...[[10,3.8],[12,3.8],[14,3.8]].map(([x,z])=>({x,z,w:1.8,d:1.2})),...[[ -3,2],[3,2],[-4,-3],[4,12]].map(([x,z])=>({x,z,w:1.9,d:.9}))];
export const CITY_BUILDINGS=[
  {id:'home',x:-12,z:12,w:7,d:5,h:3.1,color:'#e8c99a'},
  {id:'library',x:-12,z:-12,w:7,d:5,h:4.3,color:'#c7d5bc'},
  {id:'studio',x:12,z:-12,w:7,d:5,h:3.3,color:'#dbb5a3'},
  {id:'cafe',x:-12,z:0,w:6,d:5,h:3,color:'#e5b77e'},
  {id:'market',x:12,z:0,w:6,d:5,h:3.8,color:'#b9c8d5'},
  {id:'gallery',x:0,z:-12,w:6,d:5,h:3.5,color:'#d8c5d8'}
];
export const CITY_PLACES=[
  {id:'home',name:"Pip's home",x:-12,z:8,description:"A familiar front garden, a place to rest, and room for Pip's own decorations."},
  {id:'library',name:'The library',x:-12,z:-8,description:'Quiet tables, tall shelves and an open invitation to follow any question.'},
  {id:'studio',name:"The makers' studio",x:12,z:-8,description:'A shared workshop with benches for whatever Pip decides to design or invent.'},
  {id:'cafe',name:'Corner café',x:-12,z:4,description:'Outdoor tables, a seed snack and a spot to watch the city go by.'},
  {id:'market',name:'The market',x:12,z:5.5,description:'Colourful stalls, useful materials and unexpected things to notice.'},
  {id:'gallery',name:'The gallery',x:0,z:-8,description:'A small public gallery where Pip can reflect on its creations.'},
  {id:'park',name:'Willow park',x:-5,z:-2,description:'Trees, open grass and a little breathing space. Pip decides what to do here.'},
  {id:'garden',name:'The glass garden',x:5,z:-3,description:'A planted courtyard with a glass shelter, benches and changing patterns of light.'},
  {id:'square',name:'Sunbeam square',x:0,z:3,description:'The meeting point of the city, with a fountain and paths in every direction.'},
  {id:'waterfront',name:'The waterfront',x:7,z:12,description:'A wooden boardwalk beside still water, with a view across the city.'}
];
export function isWalkable(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>CITY_LIMIT||Math.abs(z)>CITY_LIMIT)return false;
  if(CITY_BUILDINGS.some(b=>Math.abs(x-b.x)<b.w/2+.45&&Math.abs(z-b.z)<b.d/2+.45))return false;
  if(CITY_TREES.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<.6)||CITY_OBSTACLES.some(b=>Math.abs(x-b.x)<b.w/2+.2&&Math.abs(z-b.z)<b.d/2+.2))return false;
  if(Math.hypot(x,z)<1.7)return false;
  if(x>8&&x<17&&z>8&&z<17&&!(x<13&&Math.abs(z-12)<.7))return false;
  return true;
}
export function accessiblePoint(point){
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.abs(point.x)>CITY_LIMIT||Math.abs(point.z)>CITY_LIMIT)throw new Error('Choose a city point inside the map.');
  const options=[];for(let x=-CITY_LIMIT;x<=CITY_LIMIT;x++)for(let z=-CITY_LIMIT;z<=CITY_LIMIT;z++)if(isWalkable(x,z))options.push({x,z,d:(x-point.x)**2+(z-point.z)**2});
  options.sort((a,b)=>a.d-b.d);return {x:options[0].x,z:options[0].z};
}
export function routeBetween(from,to){
  const start=accessiblePoint(from),goal=accessiblePoint(to),key=p=>p.x+','+p.z;
  const open=new Map([[key(start),{...start,g:0,f:0}]]),seen=new Set(),parents=new Map(),cost=new Map([[key(start),0]]);
  while(open.size){let current;for(const entry of open.values())if(!current||entry.f<current.f)current=entry;const id=key(current);open.delete(id);if(id===key(goal)){const path=[goal];let k=id;while(parents.has(k)){const p=parents.get(k);path.push(p);k=key(p);}return path.reverse();}seen.add(id);
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const next={x:current.x+dx,z:current.z+dz},nkey=key(next);if(!isWalkable(next.x,next.z)||!isWalkable(current.x+dx/2,current.z+dz/2)||seen.has(nkey)||dx&&dz&&(!isWalkable(current.x+dx,current.z)||!isWalkable(current.x,current.z+dz)))continue;
      const g=current.g+Math.hypot(dx,dz);if(g>=(cost.get(nkey)??Infinity))continue;cost.set(nkey,g);parents.set(nkey,{x:current.x,z:current.z});open.set(nkey,{...next,g,f:g+Math.hypot(goal.x-next.x,goal.z-next.z)});
    }
  }
  throw new Error('No walkable route to that city point.');
}
export function randomCityPoint(random=Math.random){const points=[];for(let x=-16;x<=16;x++)for(let z=-16;z<=16;z++)if(isWalkable(x,z))points.push({x,z});return points[Math.min(points.length-1,Math.floor(random()*points.length))];}
export function validateDestination(value){
  if(value==null)return null;if(typeof value!=='object'||typeof value.reason!=='string'||value.reason.length>240)throw new Error('Invalid city travel reason');
  if(value.place_id!=null){if(!CITY_PLACES.some(p=>p.id===value.place_id))throw new Error('That place is not in the city map.');return {place_id:value.place_id,x:null,z:null,reason:value.reason};}
  if(!Number.isFinite(value.x)||!Number.isFinite(value.z)||Math.abs(value.x)>CITY_LIMIT||Math.abs(value.z)>CITY_LIMIT)throw new Error('Choose a valid free-roam city point.');
  return {place_id:null,x:value.x,z:value.z,reason:value.reason};
}
export function advancePosition(position,route,distance){
  let point={...position},remaining=distance,index=0;
  while(index<route.length){const next=route[index],length=Math.hypot(next.x-point.x,next.z-point.z);if(length>remaining&&length>0){const fraction=remaining/length;point={x:point.x+(next.x-point.x)*fraction,z:point.z+(next.z-point.z)*fraction};remaining=0;break;}point={...next};remaining-=length;index++;}
  return {position:point,route:route.slice(index),arrived:index===route.length};
}
