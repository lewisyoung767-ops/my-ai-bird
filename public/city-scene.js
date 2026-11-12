import * as THREE from '/vendor/three.module.js';
import {CITY_BUILDINGS,CITY_PLACES,CITY_TREES} from './city-map.js';
import {createDecorations} from './room-decorations.js';
import {makeBird} from './bird-model.js';
export function startCityScene(canvas,{getState,onError}){
  try{
    const scene=new THREE.Scene();scene.background=new THREE.Color('#e8eddf');scene.fog=new THREE.Fog('#e8eddf',32,85);
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    const camera=new THREE.PerspectiveCamera(43,1,.1,140);scene.add(new THREE.HemisphereLight(0xfff4da,0x92a58b,2.8));const sun=new THREE.DirectionalLight(0xffe5bc,3.4);sun.position.set(-12,28,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24});sun.shadow.normalBias=.035;scene.add(sun);
    const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.85});const palette={grass:mat('#aabe91'),path:mat('#ddd9c6'),road:mat('#b6bda9'),wood:mat('#b89169'),cream:mat('#fff1d5'),leaf:mat('#729a68'),gold:mat('#e3bc6d'),water:mat('#95c8c6'),dark:mat('#536650')};
    function box(w,h,d,m,x,y,z,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
    function ball(r,m,x,y,z,parent=scene){const o=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
    function cylinder(r,h,m,x,y,z,parent=scene){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
    function label(text,x,y,z,width=3,parent=scene){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fff7e4';ctx.fillRect(0,0,512,128);ctx.fillStyle='#4d6249';ctx.font='bold 34px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65,475);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));o.position.set(x,y,z);parent.add(o);return o;}
    box(39,.45,39,palette.grass,0,-.3,0);for(const z of [-6,6]){box(37,.035,3,palette.path,0,-.025,z);box(37,.04,1.5,palette.road,0,.002,z);}for(const x of [-6,6]){box(3,.035,37,palette.path,x,-.025,0);box(1.5,.04,37,palette.road,x,.005,0);}box(9,.05,9,palette.path,0,.01,0);
    for(let i=-16;i<=16;i+=2){for(const z of [-6,6])box(.5,.015,.06,palette.cream,i,.035,z);for(const x of [-6,6])box(.06,.015,.5,palette.cream,x,.04,i);}
    const homeMaterials=[];let homeFloor=mat('#dfb98a');
    for(const b of CITY_BUILDINGS){const group=new THREE.Group();group.position.set(b.x,0,b.z);if(b.id==='home')group.rotation.y=Math.PI;scene.add(group);const walls=mat(b.color);if(b.id==='home')homeMaterials.push(walls);
      box(b.w,b.h,b.d,walls,0,b.h/2,0,group);box(b.w+.45,.3,b.d+.45,palette.cream,0,b.h+.08,0,group);box(1.1,2,.1,palette.dark,0,1,b.d/2+.06,group);
      for(const x of [-b.w*.3,b.w*.3]){box(1.15,1.2,.12,palette.cream,x,1.8,b.d/2+.07,group);box(.95,1,.14,palette.water,x,1.8,b.d/2+.1,group);box(.045,1,.16,palette.cream,x,1.8,b.d/2+.12,group);box(.95,.04,.16,palette.cream,x,1.8,b.d/2+.12,group);}
      if(b.h>3.5)for(const x of [-b.w*.3,0,b.w*.3])box(.75,.7,.12,palette.water,x,3.25,b.d/2+.08,group);
      const p=CITY_PLACES.find(p=>p.id===b.id);label(p?.name||b.id,0,b.h+.65,b.d/2+.1,b.w*.78,group);box(b.w*.85,.1,1,palette.gold,0,2.65,b.d/2+.45,group);
      for(const x of [-b.w/2+.5,b.w/2-.5]){box(.5,.5,.5,palette.wood,x,.25,b.d/2+.4,group);ball(.42,palette.leaf,x,.8,b.d/2+.4,group);}
    }
    // Home courtyard keeps Pip's existing personal additions and colours.
    box(7,.04,5,homeFloor,-12,.01,6);
    const decorate=createDecorations(scene,{floorMaterial:homeFloor,wallMaterials:homeMaterials,origin:{x:-12,z:6}});
    // Central fountain.
    cylinder(1.65,.3,palette.cream,0,.15,0);cylinder(1.42,.12,palette.water,0,.35,0);cylinder(.42,.9,palette.cream,0,.7,0);ball(.5,palette.water,0,1.22,0);
    // A small park, street trees and benches.
    const trees=CITY_TREES;
    for(const[x,z]of trees){cylinder(.17,1.4,palette.wood,x,.7,z);ball(.85,palette.leaf,x,1.85,z);ball(.6,palette.leaf,x+.35,2.35,z);}
    for(const[x,z]of [[-3,2],[3,2],[-4,-3],[4,12]]){box(1.7,.14,.55,palette.wood,x,.55,z);box(1.7,.55,.1,palette.wood,x,.85,z-.25);for(const dx of [-.6,.6])box(.09,.5,.35,palette.dark,x+dx,.25,z);}
    for(const[x,z]of [[-14,4],[-10,4]]){cylinder(.65,.12,palette.wood,x,.85,z);cylinder(.07,.8,palette.dark,x,.4,z);cylinder(.3,.12,palette.cream,x-1,.45,z);cylinder(.3,.12,palette.cream,x+1,.45,z);}
    for(let i=0;i<3;i++){const x=10+i*2;box(1.6,.8,1,palette.wood,x,.4,3.8);box(1.9,.12,1.3,i%2?palette.cream:palette.gold,x,1.7,3.8);for(const dx of [-.7,.7])cylinder(.035,1.6,palette.wood,x+dx,.8,3.8);for(let j=0;j<3;j++)ball(.15,palette.gold,x-.4+j*.4,.95,3.8);}
    // A glass shelter; its interior remains walkable.
    const glass=new THREE.MeshStandardMaterial({color:'#d7eee0',transparent:true,opacity:.28,roughness:.2});box(3,.08,2.4,glass,4.5,2.2,-3.7);for(const x of [3,6])for(const z of [-4.8,-2.6])cylinder(.045,2.2,palette.cream,x,1.1,z);label('The glass garden',4.5,2.8,-2.5,3.6);
    box(9,.08,9,palette.water,12.5,-.01,12.5);box(7,.12,1.3,palette.wood,9.5,.06,12);for(let x=6;x<13;x+=.5)box(.035,.015,1.3,palette.dark,x,.13,12);for(const z of [11.3,12.7]){box(7,.07,.07,palette.cream,9.5,.85,z);for(const x of [6.2,9.5,12.7])cylinder(.04,.9,palette.wood,x,.45,z);}
    label('Waterfront',7,2,10.8,3);
    for(const[x,z]of [[-7,-7],[7,-7],[-7,7],[7,7],[-17,1],[17,1]]){cylinder(.045,2.7,palette.dark,x,1.35,z);ball(.18,new THREE.MeshBasicMaterial({color:'#ffe8b2'}),x,2.7,z);}
    const bird=makeBird(scene);bird.scale.setScalar(1.25);bird.position.set(-12,.1,8);
    const marker=new THREE.Mesh(new THREE.TorusGeometry(.45,.035,8,32),new THREE.MeshBasicMaterial({color:'#f5d580'}));marker.rotation.x=-Math.PI/2;marker.position.y=.075;scene.add(marker);
    const sparkles=new THREE.Group();for(let i=0;i<7;i++)ball(.04,new THREE.MeshBasicMaterial({color:'#ffe3a1'}),0,0,0,sparkles);scene.add(sparkles);
    let city,overview=false,yaw=.7,pitch=.65,distance=15,dragging=false,lastPointer,previous=performance.now();const focus=new THREE.Vector3(-12,.5,8);
    canvas.addEventListener('pointerdown',e=>{dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);canvas.addEventListener('pointermove',e=>{if(dragging){yaw-=(e.clientX-lastPointer.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastPointer.y)*.004,.3,1.15);lastPointer={x:e.clientX,y:e.clientY};}});canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.015,8,48);},{passive:false});
    new ResizeObserver(()=>{renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();}).observe(canvas);
    function draw(now){requestAnimationFrame(draw);const dt=Math.min((now-previous)/1000,.05),time=now/1000;previous=now;const state=getState();if(city){const target=new THREE.Vector3(city.position.x,.1,city.position.z);const moving=city.moving&&!city.paused;bird.position.lerp(target,1-Math.exp(-dt*14));if(moving){const dx=target.x-bird.position.x,dz=target.z-bird.position.z;if(Math.hypot(dx,dz)>.005)bird.rotation.y=THREE.MathUtils.lerp(bird.rotation.y,Math.atan2(dx,dz),Math.min(dt*8,1));bird.position.y=.1+Math.abs(Math.sin(time*11))*.16;}marker.visible=!!city.moving;if(city.goal)marker.position.set(city.goal.x,.075,city.goal.z);}
      const center=overview?new THREE.Vector3(0,0,0):new THREE.Vector3(bird.position.x,.6,bird.position.z);focus.lerp(center,1-Math.exp(-dt*4));const d=overview?47:distance;camera.position.set(focus.x+Math.sin(yaw)*Math.cos(pitch)*d,focus.y+Math.sin(pitch)*d,focus.z+Math.cos(yaw)*Math.cos(pitch)*d);camera.lookAt(focus);
      sparkles.visible=!!state?.creating&&!state.paused;for(let i=0;i<sparkles.children.length;i++)sparkles.children[i].position.set(bird.position.x+Math.sin(time+i)*.5,1.5+((time*.4+i*.17)%1),bird.position.z+Math.cos(time+i)*.5);renderer.render(scene,camera);
    }requestAnimationFrame(draw);
    return {updateCity(value){city=value;},updateWorld:decorate,setOverview(value){overview=value;}};
  }catch(e){onError(e);return {updateCity(){},updateWorld(){},setOverview(){}};}
}
