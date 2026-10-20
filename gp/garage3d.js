import * as THREE from './vendor/three.module.js';
import {createF1Model,disposeModel} from './f1Model3d.js';
const host=document.getElementById('garage-3d');
try{
  const scene=new THREE.Scene();scene.background=new THREE.Color('#13171d');
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.up.set(0,0,1);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  scene.add(new THREE.HemisphereLight('#dce8ff','#333b42',2.7));const key=new THREE.DirectionalLight('#fff3dc',5);key.position.set(3,-4,7);scene.add(key);const rim=new THREE.DirectionalLight('#b0cfff',3);rim.position.set(-4,4,3);scene.add(rim);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(3.7,3.7,.16,64),new THREE.MeshStandardMaterial({color:'#252c32',metalness:.35,roughness:.5}));platform.rotation.x=Math.PI/2;platform.position.z=-.11;scene.add(platform);
  let car=createF1Model(GP.teams[0][2],GP.numbers[0]);scene.add(car);let yaw=-.8,elevation=.46,drag=false,lastX=0,lastY=0;
  const choices=document.getElementById('preview-driver');GP.names.forEach((name,id)=>{const option=document.createElement('option');option.value=id;option.textContent=`${GP.numbers[id]} · ${name}`;choices.append(option);});
  choices.onchange=()=>{const id=Number(choices.value);scene.remove(car);disposeModel(car);car=createF1Model(GP.teams[Math.floor(id/2)][2],GP.numbers[id]);scene.add(car);document.getElementById('preview-team').textContent=GP.teams[Math.floor(id/2)][0];draw();};
  const draw=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const r=11;camera.position.set(Math.cos(yaw)*r,Math.sin(yaw)*r,Math.sin(elevation)*r);camera.lookAt(0,0,.4);renderer.render(scene,camera);};
  host.onpointerdown=e=>{drag=true;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId);};
  host.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-lastX)*.008;elevation=Math.max(.15,Math.min(1.15,elevation+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;draw();};host.onpointerup=host.onpointercancel=()=>drag=false;
  host.tabIndex=0;host.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){yaw=-.8;elevation=.46;}else if(e.key==='ArrowLeft')yaw-=.15;else if(e.key==='ArrowRight')yaw+=.15;else elevation=Math.max(.15,Math.min(1.15,elevation+(e.key==='ArrowUp'?.1:-.1)));draw();};
  const observer=new ResizeObserver(draw);observer.observe(host);draw();window.addEventListener('pagehide',event=>{if(!event.persisted){observer.disconnect();disposeModel(scene);renderer.dispose();}});
  window.garage3D={scene,renderer,camera,get car(){return car;}};
}catch(error){host.textContent='Aperçu 3D indisponible sur cet appareil. La préparation de course reste disponible.';console.warn(error);}
