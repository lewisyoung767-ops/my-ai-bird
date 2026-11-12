import * as THREE from '/vendor/three.module.js';
export function createDecorations(scene,{floorMaterial,wallMaterials}){
  const root=new THREE.Group();scene.add(root);
  return world=>{
    for(const group of [...root.children]){group.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});root.remove(group);}
    if(world.floor_color)floorMaterial.color.set(world.floor_color);if(world.wall_color)wallMaterials.forEach(m=>m.color.set(world.wall_color));
    for(const item of world.objects||[]){
      const group=new THREE.Group();group.position.set(item.x,0,item.z);group.scale.setScalar(item.scale);root.add(group);
      const mat=new THREE.MeshStandardMaterial({color:item.color,roughness:.8});
      const wood=new THREE.MeshStandardMaterial({color:'#a7815e',roughness:.9});
      function add(geometry,material,x,y,z){const mesh=new THREE.Mesh(geometry,material.clone());mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
      const box=(w,h,d,m,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
      const cylinder=(r1,r2,h,m,x,y,z)=>add(new THREE.CylinderGeometry(r1,r2,h,20),m,x,y,z);
      const sphere=(r,m,x,y,z)=>add(new THREE.SphereGeometry(r,16,12),m,x,y,z);
      const legs=(h,w,d)=>{for(const x of [-w,w])for(const z of [-d,d])box(.06,h,.06,wood,x,h/2,z);};
      switch(item.kind){
        case 'plant':cylinder(.2,.14,.3,wood,0,.15,0);for(let i=0;i<6;i++){const a=i*2.4;const leaf=sphere(.15,mat,Math.sin(a)*.17,.48+(i%2)*.15,Math.cos(a)*.17);leaf.scale.set(.6,1.8,.6);leaf.rotation.z=Math.sin(a)*.5;}break;
        case 'lamp':cylinder(.22,.24,.06,wood,0,.03,0);cylinder(.025,.025,.9,wood,0,.5,0);cylinder(.17,.3,.3,mat,0,1,0);sphere(.075,new THREE.MeshBasicMaterial({color:'#ffe6a2'}),0,.86,0);break;
        case 'books':for(let i=0;i<4;i++){const book=box(.5,.08,.3,i%2?wood:mat,0,.05+i*.085,0);book.rotation.y=i*.13;}break;
        case 'table':box(.9,.1,.65,mat,0,.7,0);legs(.65,.34,.23);break;
        case 'chair':box(.5,.08,.5,mat,0,.45,0);box(.5,.55,.06,mat,0,.75,-.22);legs(.42,.2,.2);break;
        case 'perch':cylinder(.25,.3,.08,wood,0,.04,0);cylinder(.035,.035,.9,wood,0,.5,0);const rail=cylinder(.055,.055,.8,mat,0,.95,0);rail.rotation.z=Math.PI/2;break;
        case 'picture':{
          box(.8,.65,.06,wood,0,.9,0);const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const ctx=canvas.getContext('2d');ctx.fillStyle=item.color;ctx.fillRect(0,0,320,240);ctx.fillStyle='#fff1b8';ctx.beginPath();ctx.arc(160,90,48,0,Math.PI*2);ctx.fill();ctx.fillStyle='#354d38';ctx.font='18px Georgia';ctx.textAlign='center';ctx.fillText(item.label.slice(0,30),160,200,290);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture});add(new THREE.PlaneGeometry(.71,.56),material,0,.9,.035);material.dispose();legs(.6,.28,.15);break;
        }
        case 'sphere':sphere(.3,mat,0,.3,0);break;
        case 'cylinder':cylinder(.22,.27,.6,mat,0,.3,0);break;
        default:box(.55,.55,.55,mat,0,.275,0);
      }
      mat.dispose();wood.dispose();
    }
  };
}
