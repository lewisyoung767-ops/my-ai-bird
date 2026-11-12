import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_PLACES,routeBetween,isWalkable,advancePosition,validateDestination} from '../public/city-map.js';
import {createCity} from '../city.js';
test('every venue connects through walkable paths without cutting through obstacles',()=>{
  for(const from of CITY_PLACES)for(const to of CITY_PLACES){const route=routeBetween(from,to);assert.ok(route.length);for(let i=1;i<route.length;i++)for(let n=0;n<=10;n++){const a=route[i-1],b=route[i];assert.ok(isWalkable(a.x+(b.x-a.x)*n/10,a.z+(b.z-a.z)*n/10),`${from.id} to ${to.id}`);}}
});
test('open coordinate destinations remain available and movement consumes elapsed distance',()=>{
  assert.deepEqual(validateDestination({place_id:null,x:17,z:-17,reason:'My own reason'}),{place_id:null,x:17,z:-17,reason:'My own reason'});
  assert.throws(()=>validateDestination({x:100,z:0,reason:'escape'}));assert.throws(()=>validateDestination({place_id:'unknown',reason:'x'}));
  const route=[{x:1,z:0},{x:1,z:2}];const first=advancePosition({x:0,z:0},route,1.5);assert.deepEqual(first.position,{x:1,z:.5});assert.equal(first.arrived,false);assert.deepEqual(advancePosition(first.position,first.route,1.5).position,{x:1,z:2});
});
test('visits are recorded after arrival and pausing freezes authoritative travel',async()=>{
  let saved;const city=await createCity({load:async()=>null,save:async(_,s)=>{saved=structuredClone(s);},speed:50});city.attach({get(){}},{on(){},emit(){}});
  try{const pending=city.travel({destination:{place_id:null,x:-12,z:7,reason:'Look at the street'}});assert.equal(city.snapshot().visits.length,0);city.pause(true);assert.equal((await pending).arrived,false);const before={...city.snapshot().position};await new Promise(r=>setTimeout(r,150));assert.deepEqual(city.snapshot().position,before);city.pause(false);await new Promise(r=>setTimeout(r,250));assert.equal(city.snapshot().moving,false);assert.equal(city.snapshot().visits.length,1);assert.equal(saved.visits.length,1);}finally{await city.close();}
});
