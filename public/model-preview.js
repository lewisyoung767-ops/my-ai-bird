import * as THREE from '/vendor/three.module.js';
import {parseSTL,meshChecks} from './model-format.js';
export function showModel(canvas,info,content){
  let renderer,frame,observer,geometry,material,grid;
  try{
    const mesh=parseSTL(content),checks=meshChecks(mesh);
    renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));const scene=new THREE.Scene();scene.background=new THREE.Color('#f0f1e6');scene.add(new THREE.HemisphereLight(0xfff7e0,0x7b8e70,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
    geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(mesh.vertices.flat(),3));geometry.computeVertexNormals();geometry.rotateX(-Math.PI/2);geometry.center();const span=Math.max(...mesh.size);if(span<=0)throw new Error('The model has no size.');geometry.scale(3/span,3/span,3/span);
    material=new THREE.MeshStandardMaterial({color:'#a2bb86',roughness:.65,side:THREE.DoubleSide});const object=new THREE.Mesh(geometry,material);scene.add(object);grid=new THREE.GridHelper(6,12,0xc4cfb6,0xdce3d1);grid.position.y=-1.65;scene.add(grid);
    const camera=new THREE.PerspectiveCamera(40,1,.1,100);let yaw=.8,pitch=.4,dragging=false,previous;
    canvas.onpointerdown=e=>{dragging=true;previous={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=()=>dragging=false;canvas.onpointercancel=()=>dragging=false;canvas.onpointermove=e=>{if(dragging){yaw-=(e.clientX-previous.x)*.008;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-previous.y)*.006,-.9,1.2);previous={x:e.clientX,y:e.clientY};}};
    observer=new ResizeObserver(()=>{renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();});observer.observe(canvas);
    info.textContent=`${mesh.triangles} triangles / size ${mesh.size.map(n=>n.toFixed(2)).join(' × ')} units. Drag to inspect. `+(checks.closed&&checks.consistent&&checks.positiveVolume?'Basic mesh checks pass; validate scale and printability in your slicer.':'Mesh needs repair before printing. See the learning notebook.');
    function draw(){camera.position.set(Math.sin(yaw)*7*Math.cos(pitch),Math.sin(pitch)*7,Math.cos(yaw)*7*Math.cos(pitch));camera.lookAt(0,0,0);renderer.render(scene,camera);frame=requestAnimationFrame(draw);}draw();
  }catch(e){info.textContent='Model preview: '+e.message;}
  return ()=>{cancelAnimationFrame(frame);observer?.disconnect();geometry?.dispose();material?.dispose();grid?.geometry.dispose();grid?.material.dispose();renderer?.dispose();canvas.onpointerdown=canvas.onpointerup=canvas.onpointercancel=canvas.onpointermove=null;};
}
