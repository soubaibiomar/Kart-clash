import * as THREE from './vendor/three.module.js';
import {createF1Model,disposeModel} from './f1Model3d.js';
import {createRaceScenery,createContactShadow,chasePose,createSkyDome} from './raceScenery3d.js';

class RaceScene3D {
  constructor(host){
    this.host=host;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#bed2df');
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.domElement.className='race-3d';this.renderer.domElement.setAttribute('aria-hidden','true');host.append(this.renderer.domElement);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.sky=createSkyDome();this.scene.add(this.sky);this.raceFog=new THREE.Fog('#d9e2e5',1200,6500);
    this.ortho=new THREE.OrthographicCamera(-1,1,1,-1,.1,20000);this.chase=new THREE.PerspectiveCamera(52,1,1,20000);this.chase.up.set(0,0,1);
    this.scene.add(new THREE.HemisphereLight('#e6edff','#46503a',1.6));const sun=new THREE.DirectionalLight('#fff2da',2.6);sun.position.set(-700,500,1400);this.scene.add(sun);
    this.world=new THREE.Group();this.scene.add(this.world);this.models=new Map();this.raycaster=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;this.renderer.domElement.hidden=true;document.getElementById('render-state').textContent='Rendu 2D · GPU interrompu';});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.failed=false;this.renderer.domElement.hidden=false;document.getElementById('render-state').textContent='Rendu 3D';});
  }
  mount(sim,view){
    disposeModel(this.world);this.world.clear();this.models.clear();this.extras=new Map();this.serviceBorder=null;this.sim=sim;
    this.texture=new THREE.CanvasTexture(view.background.canvas);this.texture.colorSpace=THREE.SRGBColorSpace;this.texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(sim.track.width,sim.track.height),new THREE.MeshStandardMaterial({map:this.texture,roughness:1}));ground.position.set(sim.track.width/2,-sim.track.height/2,-.5);this.world.add(ground);
    const surround=new THREE.Mesh(new THREE.PlaneGeometry(50000,50000),new THREE.MeshStandardMaterial({color:'#53694b',roughness:1}));surround.position.set(sim.track.width/2,-sim.track.height/2,-1);this.world.add(surround);
    this.world.add(createRaceScenery(sim.track));this.shadows=new Map();
    for(const car of sim.cars){const model=createF1Model(car.driver.color,car.driver.number);model.scale.setScalar(8);this.world.add(model);this.models.set(car,model);const shadow=createContactShadow();this.world.add(shadow);this.shadows.set(car,shadow);}
    this.safety=createF1Model('#a8b7b0',0);this.safety.scale.setScalar(8);this.world.add(this.safety);
    this.crew=sim.crew.map(member=>{const m=new THREE.Mesh(new THREE.CapsuleGeometry(2,5,2,5),new THREE.MeshStandardMaterial({color:GP.teams[member.team][2]}));m.rotation.x=Math.PI/2;this.world.add(m);return m;});
    const ringGeometry=new THREE.RingGeometry(29,31,40),ringMaterial=new THREE.MeshBasicMaterial({color:'#fff2b3',side:THREE.DoubleSide});this.ring=new THREE.Mesh(ringGeometry,ringMaterial);this.world.add(this.ring);
    const debugGeometry=new THREE.BufferGeometry();debugGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(192),3));debugGeometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(192),3));
    this.debug=new THREE.LineSegments(debugGeometry,new THREE.LineBasicMaterial({vertexColors:true}));this.debug.frustumCulled=false;this.world.add(this.debug);this.chaseInitialized=false;
  }
  draw(sim,view,selected,debug){
    if(this.failed)return false;if(this.sim!==sim)this.mount(sim,view);
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return false;
    if(w!==this.w||h!==this.h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.chase.aspect=w/h;this.chase.updateProjectionMatrix();}
    const entities=[...sim.obstacles,...(sim.serviceScenario==='off'?[]:sim.serviceVehicles)],present=new Set(entities);
    for(const [entity,model] of this.extras)if(!present.has(entity)){this.world.remove(model);disposeModel(model);this.extras.delete(entity);}
    for(const entity of entities){
      let model=this.extras.get(entity);if(!model){model=new THREE.Group();
        const material=new THREE.MeshStandardMaterial({color:entity.kind==='obstacle'?'#e99645':entity.slot===0?'#ffcc77':'#94d7b7',roughness:.65});
        const body=new THREE.Mesh(entity.kind==='obstacle'?new THREE.CylinderGeometry(entity.r,entity.r,12,16):new THREE.BoxGeometry(22,13,8),material);body.position.z=7;if(entity.kind==='obstacle')body.rotation.x=Math.PI/2;model.add(body);
        if(entity.kind==='service'){const glass=new THREE.Mesh(new THREE.BoxGeometry(7,11,3),new THREE.MeshStandardMaterial({color:'#20302c',roughness:.35}));glass.position.set(5,0,12);model.add(glass);}
        this.extras.set(entity,model);this.world.add(model);
      }
      model.position.set(entity.pos.x,-entity.pos.y,0);model.rotation.z=-(entity.heading||0);
    }
    for(const [car,m] of this.models){m.position.set(car.pos.x,-car.pos.y,0);m.rotation.z=-car.heading;m.visible=!car.removed;m.userData.detail.visible=view.scale>.9||view.mode==='chase';m.userData.tyreMaterial.color.set(GP.compounds[car.tires.compound].color);const shadow=this.shadows.get(car);shadow.position.set(car.pos.x,-car.pos.y,.05);shadow.rotation.z=-car.heading;shadow.visible=m.visible;}
    const sc=sim.safetyCar;this.safety.position.set(sc.pos.x,-sc.pos.y,0);this.safety.rotation.z=-(sc.vel.mag()>.01?sc.vel.heading():0);this.safety.visible=sc.active;
    sim.crew.forEach((c,i)=>this.crew[i].position.set(c.pos.x,-c.pos.y,4));
    if(sim.serviceArea&&!this.serviceBorder){const a=sim.serviceArea,geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x,-a.y,1),new THREE.Vector3(a.x+a.width,-a.y,1),new THREE.Vector3(a.x+a.width,-a.y-a.height,1),new THREE.Vector3(a.x,-a.y-a.height,1)]);this.serviceBorder=new THREE.LineLoop(geometry,new THREE.LineBasicMaterial({color:'#95c5a3'}));this.world.add(this.serviceBorder);}if(this.serviceBorder)this.serviceBorder.visible=sim.serviceScenario!=='off';
    const diagnostic=view.mode==='paddock'&&sim.serviceVehicles.length?(sim.observedService||sim.serviceVehicles[0]):selected;
    this.ring.position.set(diagnostic.pos.x,-diagnostic.pos.y,.1);this.ring.visible=view.mode!=='chase'||debug;
    this.ortho.left=-w/(2*view.scale);this.ortho.right=-this.ortho.left;this.ortho.top=h/(2*view.scale);this.ortho.bottom=-this.ortho.top;this.ortho.position.set(view.x,-view.y,2000);this.ortho.updateProjectionMatrix();
    const car=view.focus(selected),pose=chasePose(car),goal=pose.position;
    if(!this.chaseInitialized){this.chase.position.copy(goal);this.chaseInitialized=true;}else this.chase.position.lerp(goal,.12);
    this.chase.lookAt(pose.lookAt);
    this.debug.visible=!!(debug&&(diagnostic.sensors||diagnostic.behaviors?.last));if(this.debug.visible){const positions=this.debug.geometry.attributes.position,colors=this.debug.geometry.attributes.color;let i=0;for(const ray of (diagnostic.sensors?.rays||[]).slice(0,12)){const end=ray.point;positions.setXYZ(i,(diagnostic.sensors?.origin||diagnostic.pos).x,-(diagnostic.sensors?.origin||diagnostic.pos).y,3);positions.setXYZ(i+1,end.x,-end.y,3);const c=ray.kind==='car'?[1,.7,.2]:ray.kind==='border'?[1,.3,.2]:[.4,1,.8];colors.setXYZ(i,...c);colors.setXYZ(i+1,...c);i+=2;}
      for(const [n,b] of (diagnostic.behaviors?.last.components||[]).slice(0,12).entries()){positions.setXYZ(i,diagnostic.pos.x,-diagnostic.pos.y,6);positions.setXYZ(i+1,diagnostic.pos.x+b.force.x*220,-diagnostic.pos.y-b.force.y*220,6);const c=[[.3,.8,1],[.8,.5,1],[1,.4,.3],[1,.8,.3]][n%4];colors.setXYZ(i,...c);colors.setXYZ(i+1,...c);i+=2;}
      positions.needsUpdate=true;colors.needsUpdate=true;this.debug.geometry.setDrawRange(0,i);}
    this.sky.visible=view.mode==='chase';this.sky.position.copy(this.chase.position);this.scene.fog=view.mode==='chase'?this.raceFog:null;
    this.camera=view.mode==='chase'?this.chase:this.ortho;this.renderer.render(this.scene,this.camera);return true;
  }
  worldPoint(x,y){if(!this.camera)return null;this.raycaster.setFromCamera(new THREE.Vector2(x/this.w*2-1,1-y/this.h*2),this.camera);const hit=this.raycaster.ray.intersectPlane(this.plane,new THREE.Vector3());return hit?{x:hit.x,y:-hit.y}:null;}
  pick(x,y,sim){const hit=this.worldPoint(x,y);if(!hit)return null;return sim.cars.reduce((a,c)=>Math.hypot(c.pos.x-hit.x,c.pos.y-hit.y)<Math.hypot(a.pos.x-hit.x,a.pos.y-hit.y)?c:a,sim.cars[0]);}
  dispose(){disposeModel(this.world);disposeModel(this.sky);this.renderer.dispose();this.renderer.domElement.remove();}
}
try{window.apex3D=new RaceScene3D(document.getElementById('gp-canvas'));window.addEventListener('pagehide',event=>{if(!event.persisted)window.apex3D.dispose();});}catch(error){console.warn('3D unavailable; keeping the p5 renderer.',error);document.getElementById('render-state').textContent='Rendu 2D · WebGL indisponible';}
