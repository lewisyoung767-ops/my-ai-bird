import {randomUUID} from 'node:crypto';
import {CITY_PLACES,isWalkable,routeBetween,randomCityPoint,validateDestination,advancePosition} from './public/city-map.js';
export async function createCity({load,save,speed=2.8}){
  if(!Number.isFinite(speed)||speed<.5||speed>50)throw new Error('CITY_SPEED must be between 0.5 and 50');
  const stored=await load('city.json',null);let position=stored?.position||{x:-12,z:8};if(!isWalkable(position.x,position.z))position={x:-12,z:8};
  const state={position,goal:null,route:[],moving:false,paused:false,current_place:CITY_PLACES.find(p=>Math.hypot(p.x-position.x,p.z-position.z)<1.8)?.id||null,visits:Array.isArray(stored?.visits)?stored.visits.slice(-80):[],speed};
  let io,timer,last=Date.now(),persisted=Date.now();const waiters=new Set();
  const snapshot=()=>({...state,places:CITY_PLACES});const emit=()=>io?.emit('city',snapshot());const persist=()=>save('city.json',{position:state.position,current_place:state.current_place,visits:state.visits});
  const finish=result=>{for(const resolve of waiters)resolve(result);waiters.clear();};
  function tick(){const now=Date.now(),dt=Math.min((now-last)/1000,.5);last=now;if(state.paused||!state.moving)return;
    const next=advancePosition(state.position,state.route,speed*dt);state.position=next.position;state.route=next.route;
    if(next.arrived){state.moving=false;const place=CITY_PLACES.find(p=>Math.hypot(p.x-state.position.x,p.z-state.position.z)<1.8);state.current_place=place?.id||null;const visit={id:randomUUID(),place_id:place?.id||null,name:place?.name||'An open city spot',reason:state.goal?.reason||'Exploring freely',at:new Date().toISOString(),observation:place?.description||"An unhurried moment somewhere along the city's paths."};state.visits.push(visit);state.visits=state.visits.slice(-80);persist().catch(e=>console.error('City save:',e.message));finish({arrived:true,visit});}
    else if(now-persisted>10000){persisted=now;persist().catch(e=>console.error('City save:',e.message));}emit();
  }
  return {
    attach(app,sockets){io=sockets;app.get('/api/city',(_req,res)=>res.json(snapshot()));io.on('connection',socket=>socket.emit('city',snapshot()));timer=setInterval(tick,100);timer.unref();},
    context(){return {position:state.position,current_place:state.current_place,goal:state.goal,moving:state.moving,places:CITY_PLACES,recent_visits:state.visits.slice(-5)};},
    snapshot,
    travel(decision){
      finish({arrived:false,cancelled:true});let destination=validateDestination(decision.destination);
      if(!destination){const alias={desk:'studio',bed:'home',bowl:'cafe',window:'waterfront'};const place=alias[decision.target];destination=place?{place_id:place,reason:decision.action_label.replaceAll('_',' ')}:{...randomCityPoint(),place_id:null,reason:decision.action_label.replaceAll('_',' ')};}
      const place=CITY_PLACES.find(p=>p.id===destination.place_id);const route=routeBetween(state.position,place||destination);state.goal={...destination,name:place?.name||'A freely chosen city spot',x:route.at(-1).x,z:route.at(-1).z};state.route=route;state.current_place=null;state.moving=true;last=Date.now();emit();
      return new Promise(resolve=>waiters.add(resolve));
    },
    pause(paused){state.paused=paused;last=Date.now();if(paused)finish({arrived:false,cancelled:true});persist().catch(e=>console.error('City save:',e.message));emit();},
    async close(){clearInterval(timer);finish({arrived:false,cancelled:true});await persist();}
  };
}
