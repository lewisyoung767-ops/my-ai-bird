import {CITY_PLACES,CITY_BUILDINGS,CITY_LIMIT} from './city-map.js';
export function installCityUI(socket,getScene){
  const $=id=>document.getElementById(id);let latest,overview=false;const map=$('cityMap'),ctx=map.getContext('2d');map.width=280;map.height=280;
  const point=(x,z)=>({x:(x+CITY_LIMIT+1)*280/38,y:(z+CITY_LIMIT+1)*280/38});
  const draw=state=>{ctx.fillStyle='#e4ecd9';ctx.fillRect(0,0,280,280);ctx.fillStyle='#b8d6d2';const water=point(8,8);ctx.fillRect(water.x,water.y,9*280/38,9*280/38);ctx.strokeStyle='#c6c9b8';ctx.lineWidth=14;for(const n of [-6,6]){const a=point(-18,n),b=point(18,n);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();const c=point(n,-18),d=point(n,18);ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();}
    for(const b of CITY_BUILDINGS){ctx.fillStyle=b.color;const p=point(b.x-b.w/2,b.z-b.d/2);ctx.fillRect(p.x,p.y,b.w*280/38,b.d*280/38);}
    if(state.route?.length){ctx.strokeStyle='#b18b48';ctx.lineWidth=2;ctx.beginPath();let p=point(state.position.x,state.position.z);ctx.moveTo(p.x,p.y);for(const next of state.route){p=point(next.x,next.z);ctx.lineTo(p.x,p.y);}ctx.stroke();}
    for(const place of CITY_PLACES){const p=point(place.x,place.z);ctx.fillStyle='#698458';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}
    const pip=point(state.position.x,state.position.z);ctx.fillStyle='#e5aa46';ctx.strokeStyle='#fff8dc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pip.x,pip.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();
  };
  socket.on('city',city=>{latest=city;getScene()?.updateCity(city);const place=CITY_PLACES.find(p=>p.id===city.current_place);$('cityLocation').textContent=city.paused?'Exploration paused':city.moving?'On the way to '+city.goal.name:place?'Visiting '+place.name:'Exploring freely';$('cityReason').textContent=city.goal?.reason||'Pip chooses where to go next.';draw(city);
    const diary=$('cityVisits');diary.replaceChildren();for(const visit of [...city.visits].reverse().slice(0,10)){const item=document.createElement('article');const heading=document.createElement('strong');heading.textContent=visit.name;const reason=document.createElement('p');reason.textContent=visit.reason;const when=document.createElement('small');when.textContent=new Date(visit.at).toLocaleString();item.append(heading,reason,when);diary.append(item);}if(!city.visits.length)diary.textContent='Visits appear when Pip actually arrives.';
  });
  $('cityOverview').onclick=()=>{overview=!overview;$('cityOverview').setAttribute('aria-pressed',String(overview));getScene()?.setOverview(overview);$('cityOverview').textContent=overview?'Follow Pip':'City overview';};
  const places=$('cityPlaces');for(const place of CITY_PLACES){const button=document.createElement('button');button.textContent=place.name;button.onclick=()=>{$('cityPlaceInfo').textContent=place.name+': '+place.description+' Pip chooses when and why to visit.';};places.append(button);}
  return ()=>{if(latest)getScene()?.updateCity(latest);};
}
