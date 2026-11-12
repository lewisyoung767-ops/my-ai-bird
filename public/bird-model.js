import * as THREE from '/vendor/three.module.js';
export function makeBird(scene){
const material=color=>new THREE.MeshStandardMaterial({color,roughness:.85});const mat={cream:material('#fff4da'),dark:material('#3c4938'),pink:material('#dfad9c'),wood:material('#b88b60')};
function box(w,h,d,m,x,y,z,parent){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
function ball(x,y,z,sx,sy,sz,m,parent){const o=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
  const bird=new THREE.Group();scene.add(bird);
  const body=material('#d5a950'),head=material('#e8c566'),wing=material('#9aa980');
  ball(0,.36,0,.29,.36,.26,body,bird);ball(0,.66,.08,.26,.25,.24,head,bird);ball(0,.34,.185,.19,.23,.1,mat.cream,bird);
  for(const x of [-.13,.13]){ball(x,.7,.282,.04,.045,.025,mat.dark,bird);ball(x-.008,.715,.302,.011,.012,.006,mat.cream,bird);ball(x*1.4,.59,.253,.045,.023,.01,mat.pink,bird);}
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.075,.17,4),material('#cd8050'));beak.rotation.x=Math.PI/2;beak.position.set(0,.61,.36);bird.add(beak);
  for(const x of [-.27,.27]){const w=ball(x,.38,-.01,.085,.23,.17,wing,bird);w.rotation.z=x>0?-.2:.2;}
  for(const x of [-.1,.1]){box(.035,.12,.035,mat.wood,x,.04,.03,bird);box(.1,.035,.16,mat.wood,x,-.01,.08,bird);}
  for(let i=-1;i<=1;i++){const feather=ball(i*.06,.4,-.28,.055,.06,.21,wing,bird);feather.rotation.x=-.3;}
  for(let i=0;i<2;i++){const tuft=ball(.03*i,.91,.05,.035,.095,.035,head,bird);tuft.rotation.z=-.3+i*.4;}
return bird;
}
