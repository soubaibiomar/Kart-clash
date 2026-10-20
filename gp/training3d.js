import * as THREE from './vendor/three.module.js';
import {createF1Model,disposeModel} from './f1Model3d.js';

// Read-only visualization of GPU diagnostics, never a second simulation.
export function validTrainingFrame(frame){
  const pair=p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite);
  return !!(frame&&Array.isArray(frame.points)&&frame.points.length>=3&&frame.points.every(pair)&&Number.isFinite(frame.radius)&&frame.radius>0&&Array.isArray(frame.positions)&&frame.positions.length>0&&frame.positions.length<=128&&frame.positions.every(pair)&&Array.isArray(frame.heading)&&frame.heading.length===frame.positions.length&&frame.heading.every(Number.isFinite)&&Array.isArray(frame.alive)&&frame.alive.length===frame.positions.length);
}

export function createTrainingTrack(points,radius){
  const root=new THREE.Group();root.name='gpu-track';
  const normals=points.map((p,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];const a=new THREE.Vector2(p[0]-prev[0],p[1]-prev[1]).normalize(),b=new THREE.Vector2(next[0]-p[0],next[1]-p[1]).normalize();const n=new THREE.Vector2(-a.y-b.y,a.x+b.x).normalize();const scale=Math.min(2,1/Math.max(.5,n.dot(new THREE.Vector2(-b.y,b.x))));return n.multiplyScalar(scale);});
  const strip=(inner,outer,z,material)=>{
    const verts=[],indices=[];for(let i=0;i<points.length;i++)for(const distance of [inner,outer])verts.push(points[i][0]+normals[i].x*distance,-points[i][1]-normals[i].y*distance,z);
    for(let i=0;i<points.length;i++){const a=i*2,b=((i+1)%points.length)*2;indices.push(a,b,a+1,b,b+1,a+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    root.add(new THREE.Mesh(geometry,material));
  };
  strip(-radius-15,radius+15,-.4,new THREE.MeshStandardMaterial({color:'#45634c',roughness:1}));
  strip(-radius,radius,0,new THREE.MeshStandardMaterial({color:'#454c52',roughness:.95,side:THREE.DoubleSide}));
  const white=new THREE.MeshStandardMaterial({color:'#dddcd2',roughness:.8,side:THREE.DoubleSide});
  strip(-radius-4,-radius+1,.3,white);strip(radius-1,radius+4,.3,white);
  const linePoints=points.map(p=>new THREE.Vector3(p[0],-p[1],.4));linePoints.push(linePoints[0].clone());
  const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(linePoints),new THREE.LineBasicMaterial({color:'#6e777d',transparent:true,opacity:.25}));root.add(edge);
  return root;
}

export function trainingCameraPose(frame,mode='circuit',aspect=1,yaw=-.8,zoom=1){
  const index=Number.isInteger(frame.leader)&&frame.leader>=0&&frame.leader<frame.positions.length?frame.leader:0;
  if(mode==='follow'){
    const [x,y]=frame.positions[index],heading=frame.heading[index],d=115*zoom;
    return {position:new THREE.Vector3(x-Math.cos(heading)*d,-y+Math.sin(heading)*d,65*zoom),target:new THREE.Vector3(x+Math.cos(heading)*65,-y-Math.sin(heading)*65,5)};
  }
  const xs=frame.points.map(p=>p[0]),ys=frame.points.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);
  const target=new THREE.Vector3((minX+maxX)/2,-(minY+maxY)/2,0),span=Math.max(maxX-minX,maxY-minY,frame.radius*4);
  const distance=span*1.45*zoom/Math.min(1,Math.max(.3,aspect));
  return {position:new THREE.Vector3(target.x+Math.cos(yaw)*distance*.6,target.y+Math.sin(yaw)*distance*.6,distance*.8),target};
}

export class TrainingScene3D {
  constructor(host){
    this.host=host;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#1c272b');this.camera=new THREE.PerspectiveCamera(45,1,1,50000);this.camera.up.set(0,0,1);
    this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.domElement.className='training-3d-canvas';this.renderer.domElement.setAttribute('aria-label','Visualisation 3D des candidats calculés sur le GPU');host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight('#dceaff','#344332',2));const sun=new THREE.DirectionalLight('#fff0d5',3);sun.position.set(-300,200,800);this.scene.add(sun);
    this.world=new THREE.Group();this.scene.add(this.world);this.yaw=-.8;this.zoom=1;this.mode='circuit';this.pool=[];this.failed=false;
    this.empty=document.getElementById('training-3d-empty');this.state=document.getElementById('training-3d-state');
    const control=document.getElementById('training-camera');control.onchange=()=>{this.mode=control.value;this.render();};
    document.getElementById('reset-training-camera').onclick=()=>{this.yaw=-.8;this.zoom=1;this.mode='circuit';control.value='circuit';this.render();};
    let drag=false,lastX=0;host.onpointerdown=e=>{if(!e.target.classList.contains('training-3d-canvas'))return;drag=true;lastX=e.clientX;host.setPointerCapture(e.pointerId);};
    host.onpointermove=e=>{if(!drag)return;this.yaw+=(e.clientX-lastX)*.008;lastX=e.clientX;this.mode='circuit';control.value='circuit';this.render();};host.onpointerup=host.onpointercancel=()=>drag=false;
    host.addEventListener('wheel',e=>{if(this.failed)return;e.preventDefault();this.zoom=Math.max(.35,Math.min(2.5,this.zoom*(e.deltaY>0?1.1:.9)));this.render();},{passive:false});
    host.tabIndex=0;host.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','+','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){this.zoom=1;this.yaw=-.8;}else if(e.key==='ArrowLeft')this.yaw-=.15;else if(e.key==='ArrowRight')this.yaw+=.15;else this.zoom=Math.max(.35,Math.min(2.5,this.zoom*(e.key==='+'?.9:1.1)));this.render();};
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;this.renderer.domElement.hidden=true;host.dataset.render='fallback';this.empty.hidden=true;this.state.textContent='Vue 2D · contexte WebGL interrompu';});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.failed=false;this.renderer.domElement.hidden=false;host.dataset.render='3d';this.draw(this.frame,this.inspect);});
    this.observer=new ResizeObserver(()=>this.render());this.observer.observe(host);host.dataset.render='3d';this.draw(null,false);
  }
  mount(frame){
    disposeModel(this.world);this.world.clear();this.pool=[];
    this.world.add(createTrainingTrack(frame.points,frame.radius));
    const color=typeof GP!=='undefined'?GP.teams[Math.floor(frame.driverId/2)]?.[2]||'#f14a54':'#f14a54';
    const template=createF1Model(color,typeof GP!=='undefined'?GP.numbers[frame.driverId]||0:0);template.updateMatrixWorld(true);
    template.traverse(mesh=>{if(!mesh.isMesh)return;const model=new THREE.InstancedMesh(mesh.geometry,mesh.material,frame.positions.length);model.name='gpu-candidates';this.world.add(model);this.pool.push({model,local:mesh.matrixWorld.clone()});});
    const marker=new THREE.Mesh(new THREE.RingGeometry(24,27,32),new THREE.MeshBasicMaterial({color:'#ffd689',side:THREE.DoubleSide}));marker.position.z=.5;this.world.add(marker);this.marker=marker;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(72),3));this.rays=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#f7c97b'}));this.rays.frustumCulled=false;this.world.add(this.rays);
    this.trafficMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(28,15,8),new THREE.MeshStandardMaterial({color:'#e9bc69',roughness:.6}),3);this.world.add(this.trafficMesh);
    this.key=JSON.stringify([frame.circuit,frame.driverId,frame.points,frame.radius,frame.positions.length]);
  }
  draw(frame,inspect=false){
    this.frame=frame;this.inspect=inspect;
    if(this.failed)return false;
    if(!validTrainingFrame(frame)){
      disposeModel(this.world);this.world.clear();this.key=null;this.pool=[];this.empty.hidden=false;this.state.textContent='En attente des positions GPU';this.render();return true;
    }
    this.empty.hidden=true;
    const key=JSON.stringify([frame.circuit,frame.driverId,frame.points,frame.radius,frame.positions.length]);if(key!==this.key)this.mount(frame);
    const transform=new THREE.Object3D(),matrix=new THREE.Matrix4(),tint=new THREE.Color();
    for(let i=0;i<frame.positions.length;i++){
      transform.position.set(frame.positions[i][0],-frame.positions[i][1],0);transform.rotation.set(0,0,-frame.heading[i]);transform.scale.setScalar(8);transform.updateMatrix();
      tint.set(frame.alive[i]?'#ffffff':'#555b64');for(const {model,local} of this.pool){matrix.multiplyMatrices(transform.matrix,local);model.setMatrixAt(i,matrix);model.setColorAt(i,tint);}
    }
    for(const {model} of this.pool){model.instanceMatrix.needsUpdate=true;model.instanceColor.needsUpdate=true;model.computeBoundingSphere();}
    const index=Number.isInteger(frame.leader)&&frame.positions[frame.leader]?frame.leader:0;this.marker.position.set(frame.positions[index][0],-frame.positions[index][1],.5);
    const traffic=(frame.traffic||[]).filter(p=>Array.isArray(p)&&p.every(Number.isFinite)).slice(0,3);this.trafficMesh.count=traffic.length;
    traffic.forEach((p,i)=>{transform.position.set(p[0],-p[1],5);transform.rotation.set(0,0,0);transform.scale.setScalar(1);transform.updateMatrix();this.trafficMesh.setMatrixAt(i,transform.matrix);});this.trafficMesh.instanceMatrix.needsUpdate=true;this.trafficMesh.computeBoundingSphere();
    this.rays.visible=!!(inspect&&Array.isArray(frame.rays)&&frame.rayOrigin&&Number.isFinite(frame.rayHeading));
    if(this.rays.visible){const angles=[-150,-90,-55,-30,-15,0,15,30,55,90,150,180],positions=this.rays.geometry.attributes.position;
      for(let i=0;i<12;i++){const a=frame.rayHeading+angles[i]*Math.PI/180,d=Math.min(220,Math.max(0,Number(frame.rays[i])||0)*500);positions.setXYZ(i*2,frame.rayOrigin[0],-frame.rayOrigin[1],5);positions.setXYZ(i*2+1,frame.rayOrigin[0]+Math.cos(a)*d,-frame.rayOrigin[1]-Math.sin(a)*d,5);}positions.needsUpdate=true;}
    this.state.textContent=`${frame.positions.length} candidats · tick ${frame.tick} / ${frame.steps} · positions GPU`;
    this.render();return true;
  }
  render(){
    if(this.failed)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;
    if(validTrainingFrame(this.frame)){const pose=trainingCameraPose(this.frame,this.mode,w/h,this.yaw,this.zoom);this.camera.position.copy(pose.position);this.camera.lookAt(pose.target);}else{this.camera.position.set(0,-100,100);this.camera.lookAt(0,0,0);}
    this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.observer.disconnect();disposeModel(this.world);this.renderer.dispose();this.renderer.domElement.remove();}
}

if(typeof document!=='undefined'){
  try{window.training3D=new TrainingScene3D(document.getElementById('training-preview-stage'));window.dispatchEvent(new Event('training3dready'));window.addEventListener('pagehide',e=>{if(!e.persisted)window.training3D.dispose();});}
  catch(error){document.getElementById('training-preview-stage').dataset.render='fallback';document.getElementById('training-3d-state').textContent='Vue 2D · WebGL indisponible';document.getElementById('training-3d-empty').hidden=true;console.warn('Training 3D unavailable; using diagnostic 2D view.',error);}
}
