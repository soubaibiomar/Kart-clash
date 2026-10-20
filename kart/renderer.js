import {setTrackGhost,clearTrackGhost,updateTrackGhost} from './track-ghost-view.js';
import {raceCameraSettings,updateRaceCamera,markerOccludesCamera} from './race-camera.js';
import {createKartWheels,updateKartWheels} from './kart-wheels.js';
import {daylightEnvironment} from './daylight.js';
import {createSkidTrails,updateSkidTrails} from './skid-trails.js';
import {trainingCamera} from './training-camera.js';
import {kartPresentation,visibleOpponent} from './arcade-view.js';
import {drawArcadeArena} from './arcade-art.js';
import {createOrdnance,updateOrdnance,releaseOrdnance,weaponMount,softShadow} from './weapon-art.js';
import {combatEffect,animateCombatEffect,releaseCombatEffect} from './combat-effects.js';
import * as THREE from '../gp/vendor/three.module.js';

export class KartRenderer{

 constructor(canvas){this.THREE=THREE;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));const gl=this.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');this.software=extension?/SwiftShader|llvmpipe|software/i.test(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)):false;this.integrated=extension?/Intel|SwiftShader|llvmpipe/i.test(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)):false;this.renderer.shadowMap.enabled=!this.integrated;this.renderer.setPixelRatio(this.software?.8:Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;

 this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#86d4f0');this.scene.fog=new THREE.Fog('#b2c4ce',1500,3400);this.environmentTarget=daylightEnvironment(this.renderer,this.scene);this.camera=new THREE.PerspectiveCamera(54,1,2,5000);this.camera.position.set(900,1000,1500);this.scene.add(new THREE.HemisphereLight('#e6edf3','#68705e',1.1));const sun=new THREE.DirectionalLight('#fff0d7',2.2);sun.position.set(500,1100,-200);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-1200,right:1200,top:1200,bottom:-1200,near:1,far:2600});sun.shadow.bias=-.00025;sun.shadow.normalBias=1.2;sun.shadow.radius=3;sun.target.position.set(900,0,700);this.scene.add(sun,sun.target);this.entities=new Map();this.resources=new Set();this.geometryCache=new Map();this.materials=new Map();this.effects=[];this.target=new THREE.Vector3();this.cameraSerial=-1;this.debugGroup=new THREE.Group();this.scene.add(this.debugGroup);this.lastDebug=0;this.resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();};this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);this.resize();}

 setQuality(value='auto'){this.renderer.shadowMap.enabled=value==='high'||value==='auto'&&!this.integrated;this.renderer.setPixelRatio(value==='low'?.75:value==='high'?Math.min(devicePixelRatio,1.5):1);this.resize();}

 paint(color){const key='paint:'+color;if(!this.materials.has(key)){const m=new THREE.MeshPhysicalMaterial({color,roughness:.3,metalness:.28,clearcoat:1,clearcoatRoughness:.2,envMapIntensity:.85});this.materials.set(key,m);this.resources.add(m);}return this.materials.get(key);}
 lamp(color,intensity){const key='lamp:'+color+intensity;if(!this.materials.has(key)){const m=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.3});this.materials.set(key,m);this.resources.add(m);}return this.materials.get(key);}
 material(color,roughness=.7,metalness=0){const key=color+roughness+metalness;if(!this.materials.has(key)){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});this.materials.set(key,m);this.resources.add(m);}return this.materials.get(key);}

 mesh(geometry,color,parent,x=0,y=0,z=0){const key=geometry.type+JSON.stringify(geometry.parameters);if(this.geometryCache.has(key)){geometry.dispose();geometry=this.geometryCache.get(key);}else this.geometryCache.set(key,geometry);this.resources.add(geometry);const m=new THREE.Mesh(geometry,this.material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}

 box(parent,x,y,z,w,h,d,color){return this.mesh(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z);}

 rounded(parent,x,y,z,w,h,d,color,r=3){
 const shape=new THREE.Shape(),a=w/2,b=d/2;r=Math.min(r,a,b);shape.moveTo(-a+r,-b);shape.lineTo(a-r,-b);shape.quadraticCurveTo(a,-b,a,-b+r);shape.lineTo(a,b-r);shape.quadraticCurveTo(a,b,a-r,b);shape.lineTo(-a+r,b);shape.quadraticCurveTo(-a,b,-a,b-r);shape.lineTo(-a,-b+r);shape.quadraticCurveTo(-a,-b,-a+r,-b);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(1,h-2*r),steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:Math.min(r,h/3),bevelThickness:Math.min(r,h/3),curveSegments:4});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2+r,0);
 // Extrusions have shape UUIDs; use dimensions to share geometry across identical models.
 geo.parameters={w,h,d,r};return this.mesh(geo,color,parent,x,y,z);
 }
 ellipsoid(parent,x,y,z,a,b,c,color){const m=this.mesh(new THREE.SphereGeometry(1,20,14),color,parent,x,y,z);m.scale.set(a,b,c);return m;}
 kart(k){const root=new THREE.Group();
 const shadow=this.mesh(new THREE.PlaneGeometry(78,66),'#314a43',root,0,2.2,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.material=softShadow(this);
 this.rounded(root,0,9,0,44,10,28,'#19314a',4);this.rounded(root,8,15,0,37,12,30,k.color,5);this.rounded(root,22,9,0,7,8,34,'#23374a',3);this.rounded(root,-22,10,0,6,8,32,'#23374a',2);
 for(const z of [-15,15]){this.rounded(root,-7,17,z,27,10,7,k.color,3);this.rounded(root,17,18,z*.65,8,3,5,'#fff3ae',1);}
 this.rounded(root,-13,22,0,7,19,23,'#20344b',3);this.rounded(root,8,21,0,17,2,5,'#f8fbff',1);
 const spoiler=this.rounded(root,-23,27,0,9,4,37,k.color,2);for(const z of [-12,12])this.box(root,-23,20,z,2,12,2,'#263b47');
 const wheels=createKartWheels(this,root,k.color);
 this.rounded(root,13,23,0,21,2,7,'#fff6dd',1);const character=k.character||['robot','fox','frog'][k.id%3];const skin=character==='fox'?'#f28a35':character==='frog'?'#6ed54b':'#40c6da';
 this.ellipsoid(root,-7,28,0,9,13,9,skin);this.ellipsoid(root,-7,46,0,15,14,14,skin);
 if(character==='fox'){for(const z of [-10,10]){const ear=this.mesh(new THREE.ConeGeometry(6,17,4),skin,root,-10,62,z);ear.rotation.x=z*.018;this.mesh(new THREE.ConeGeometry(3,10,4),'#683c60',root,-8,62,z);}this.ellipsoid(root,6,41,0,7,6,9,'#fff4dd');this.ellipsoid(root,12,43,0,2.5,2,3,'#253048');}
 else if(character==='frog'){for(const z of [-9,9])this.ellipsoid(root,-1,57,z,7,7,7,skin);this.rounded(root,7,40,0,4,3,14,'#205338',1);}
 else{this.rounded(root,5,46,0,8,12,24,'#183657',3);this.box(root,-7,62,0,2,8,2,'#263b47');this.ellipsoid(root,-7,67,0,3,3,3,'#ffe156');}
 for(const z of [-7,7]){const y=character==='frog'?57:49;this.ellipsoid(root,6,y,z,4,5,4,'#ffffff');this.ellipsoid(root,9,y,z,2,3,2,'#172d4a');this.ellipsoid(root,10,y+1,z-.5,.7,.9,.8,'#ffffff');this.ellipsoid(root,3,29,z*1.7,7,4,4,skin);}
 const brakes=[];for(const z of [-11,11]){const light=this.box(root,-26,14,z,2,4,7,'#d64232');brakes.push(light);light.material=this.lamp('#ff3727',.08);}for(const z of [-10,10]){const pipe=this.mesh(new THREE.CylinderGeometry(2.8,3.6,13,10),'#68747a',root,-27,10,z);pipe.rotation.z=Math.PI/2;pipe.material=this.material('#68747a',.3,.8);}
 root.traverse(o=>{if(!o.isMesh)return;if(o.material.color?.getHex()===new THREE.Color(k.color).getHex())o.material=this.paint(k.color);else if(o.material.color?.getHexString()==='a3c2d5')o.material=this.material('#a3c2d5',.23,.85);else if(o.material.color?.getHexString()==='172535')o.material=this.material('#172535',.96,.02);});
 const steering=this.mesh(new THREE.TorusGeometry(6,1.5,6,16),'#263b47',root,9,28,0);steering.rotation.y=Math.PI/2;
 const ring=this.mesh(new THREE.TorusGeometry(31,1.6,6,32),'#a1faff',root,0,8,0);ring.rotation.x=Math.PI/2;const bubble=this.mesh(new THREE.SphereGeometry(37,16,12),'#70dcff',root,0,25,0);const bm=new THREE.MeshStandardMaterial({color:'#55bbf9',transparent:true,opacity:.20,roughness:.15,metalness:.25});this.resources.add(bm);bubble.material=bm;bubble.castShadow=false;
 const flame=this.mesh(new THREE.ConeGeometry(7,26,10),'#ffbf39',root,-34,13,0);flame.rotation.z=Math.PI/2;flame.visible=false;const sparks=new THREE.Group();for(const z of [-20,20]){this.mesh(new THREE.ConeGeometry(3,15,5),'#ffe37a',sparks,-22,5,z).rotation.z=1.5;}root.add(sparks);sparks.visible=false;return {root,wheels,ring,bubble,flame,sparks,brakes};}


 populationKart(k){const root=new THREE.Group();this.box(root,0,12,0,40,12,28,k.color);this.box(root,20,8,0,6,6,34,'#20394e');this.box(root,-20,22,0,8,4,35,k.color);this.mesh(new THREE.SphereGeometry(8,8,6),'#fff3c0',root,-3,26,0);const wheels=createKartWheels(this,root,k.color,{simple:true});const ring=this.mesh(new THREE.TorusGeometry(33,2,4,20),'#8fe778',root,0,3,0);ring.rotation.x=Math.PI/2;return {root,wheels,ring,sparks:new THREE.Group(),flame:new THREE.Group(),bubble:new THREE.Group()};}
 label(text,color='#fff6df'){const canvas=document.createElement('canvas');canvas.width=text==='?'?128:512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=text==='?'?'#ffb224':'#173b46';ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font=text==='?'?'bold 100px Barlow, sans-serif':'bold 66px Barlow, sans-serif';ctx.textAlign='center';ctx.fillText(text,canvas.width/2,text==='?'?100:88);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;this.resources.add(tex);const material=new THREE.MeshBasicMaterial({map:tex});this.resources.add(material);const geometry=new THREE.PlaneGeometry(210,52);this.resources.add(geometry);return new THREE.Mesh(geometry,material);}

 setWorld(w){clearTrackGhost(this);if(this.worldRoot)this.scene.remove(this.worldRoot);this.worldRoot=new THREE.Group();this.scene.add(this.worldRoot);for(const entry of this.entities.values())this.scene.remove(entry.root);this.entities.clear();this.effects=[];this.world=w;this.cameraSerial=-1;this.lastDebug=-12;for(const child of [...this.debugGroup.children]){child.geometry.dispose();child.material.dispose();this.debugGroup.remove(child);}

 // Scene resources are shared through materials; release previous geometries/textures.

 const shared=new Set(this.materials.values());for(const resource of [...this.resources])if(!shared.has(resource)){resource.dispose();this.resources.delete(resource);}this.geometryCache.clear();

 this.scene.background.set(w.arena.decks?'#b6c8d2':'#aac4d4');this.scene.fog.color.copy(this.scene.background);drawArcadeArena(this,w);this.trails=this.populationMode?null:createSkidTrails(this);

 for(const crate of w.arena.pickups){const root=new THREE.Group();this.rounded(root,0,26,0,40,40,40,'#ffc732',4);for(const side of [-1,1]){const mark=this.label('?','#ffffff');mark.scale.set(.13,.5,.5);mark.position.set(0,26,side*27);mark.rotation.y=side<0?Math.PI:0;root.add(mark);const sideMark=this.label('?','#ffffff');sideMark.scale.set(.13,.5,.5);sideMark.position.set(side*27,26,0);sideMark.rotation.y=side*Math.PI/2;root.add(sideMark);}this.box(root,0,8,0,36,4,36,'#d77a20');this.box(root,0,38,0,36,4,36,'#ffe574');root.position.set(crate.pos.x,0,crate.pos.y);this.entities.set(crate.id,{root});this.scene.add(root);}

 for(const marker of w.trackTrial?.markers||w.challenge?.markers||[]){const root=new THREE.Group();if(w.trackTrial&&w.trackTrial.markers.length>24&&marker!==w.trackTrial.markers[0]){this.box(root,0,2,0,8,1,14,'#d9ded5');root.position.set(marker.pos.x,marker.elevation||0,marker.pos.y);this.entities.set(marker.id,{root});this.scene.add(root);continue;}const ring=this.mesh(new THREE.TorusGeometry(40,3,6,40),'#e7ff69',root);ring.rotation.x=Math.PI/2;ring.position.y=4;const markerPole=new THREE.Group();root.add(markerPole);this.box(markerPole,0,40,0,4,80,4,'#fcf4d9');this.box(markerPole,14,71,0,27,20,3,'#254bea');root.position.set(marker.pos.x,marker.elevation||0,marker.pos.y);this.entities.set(marker.id,{root,markerPole});this.scene.add(root);}

 if(w.teamMode){for(const base of w.teamMode.bases){const root=new THREE.Group();const ring=this.mesh(new THREE.TorusGeometry(base.r,5,8,48),base.team===0?'#45bffa':'#ff806d',root,0,5,0);ring.rotation.x=Math.PI/2;const label=this.label(base.team===0?'BASE AZUR':'BASE CORAIL');label.position.set(0,60,0);label.scale.set(.6,.6,.6);root.add(label);root.position.set(base.pos.x,0,base.pos.y);this.entities.set(base.id,{root});this.scene.add(root);}const root=new THREE.Group();this.mesh(new THREE.IcosahedronGeometry(22,0),'#ffe15b',root,0,35,0);this.mesh(new THREE.TorusGeometry(30,3,8,24),'#fff4a4',root,0,35,0);this.entities.set('core',{root});this.scene.add(root);}
 for(const k of w.karts){const model=this.populationMode?this.populationKart(k):this.kart(k);if(!this.populationMode&&k!==w.player){const plate=this.label(k.name);plate.scale.set(.25,.25,.25);plate.position.y=93;model.root.add(plate);model.plate=plate;}this.entities.set(k.id,model);this.scene.add(model.root);}this.fxRoot=new THREE.Group();this.scene.add(this.fxRoot);if(this.oldFxRoot)this.scene.remove(this.oldFxRoot);this.oldFxRoot=this.fxRoot;this.cameraShells=[];this.worldRoot.updateMatrixWorld(true);this.worldRoot.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.cameraSolid)this.cameraShells.push(mesh);});}

 setGhost(entity,record){setTrackGhost(this,entity,record);}
 setCamera(value){const next=raceCameraSettings(value);if(JSON.stringify(next)!==JSON.stringify(this.cameraSettings)){this.cameraSettings=next;this.reset();}}
 reset(){this.cameraSerial=-1;}

 effectsFrom(events,w){for(const event of events){if(!['impact','elimination','pickup','blocked','fire'].includes(event.type)||this.effects.length>=32)continue;const effect=combatEffect(this,event,w);this.fxRoot.add(effect.root);this.effects.push(effect);}}
 aim(w){const k=w.player;if(!k.alive||!['rocket','rapid','homing'].includes(k.item))return null;const end=createVector(k.pos.x+Math.cos(k.heading)*250,k.pos.y+Math.sin(k.heading)*250);let distance=1;for(const o of w.arena.solidsFor?.(w.player)||w.arena.solids){const hit=KartCollision.segment(k.pos,end,KartCollision.box(o),2);if(hit!==null)distance=Math.min(distance,hit);}const point=new THREE.Vector3(k.pos.x+(end.x-k.pos.x)*distance,(k.elevation||0)+14,k.pos.y+(end.y-k.pos.y)*distance).project(this.camera);return {x:(point.x+1)*50,y:(1-point.y)*50,visible:point.z>=-1&&point.z<=1&&Math.abs(point.x)<=1&&Math.abs(point.y)<=1};}

 draw(w,dt,{menu=false,reduced=false,debug=false,overview=false}={}){this.visualTime=(this.visualTime||0)+dt;if(this.trails)updateSkidTrails(this.trails,w,reduced);const liveIds=new Set(w.projectiles.map(p=>p.id).concat(w.mines.map(p=>p.id)));for(const [id,obj] of this.entities)if(typeof id==='number'&&id>=100&&!liveIds.has(id)){releaseOrdnance(this,obj);this.scene.remove(obj.root);this.entities.delete(id);}

 for(const k of w.karts){const m=this.entities.get(k.id);m.root.visible=k.alive;if(!k.alive)continue;if(!this.populationMode&&m.heldKind!==k.item){if(m.weapon)m.root.remove(m.weapon);m.weapon=null;m.heldKind=k.item;if(k.item){m.weapon=weaponMount(this,k.item);m.root.add(m.weapon);}}m.root.position.set(k.pos.x,k.elevation||0,k.pos.y);m.root.rotation.z=Math.atan((k.slopeVector?.x||0)*Math.cos(k.heading)+(k.slopeVector?.y||0)*Math.sin(k.heading))+(reduced?0:(k.lastAction?.throttle||0)*-.012*Math.min(1,k.vel.mag()/2));for(const brake of m.brakes||[])brake.material=this.lamp('#ff3727',k.lastAction?.throttle<0?.9:.08);m.root.rotation.x=reduced?0:kartPresentation(k,w.time).lean;m.root.rotation.y=-k.heading+(menu&&!reduced?Math.sin(this.visualTime*.65)*.15:0);if(m.plate){m.plate.visible=!menu&&visibleOpponent(k,w.player,w);const plateDistance=Math.hypot(this.camera.position.x-k.pos.x,this.camera.position.y-93,this.camera.position.z-k.pos.y);m.plate.scale.setScalar(Math.min(.32,plateDistance*.0008));m.plate.rotation.y=-m.root.rotation.y+Math.atan2(this.camera.position.x-k.pos.x,this.camera.position.z-k.pos.y);}updateKartWheels(m.wheels,k);m.sparks.visible=k.drifting&&!menu;m.flame.visible=w.time<k.boostUntil;m.flame.scale.setScalar(reduced?1:1+Math.sin(w.time*28)*.12);m.ring.visible=this.populationMode?k.id===this.populationSelected:w.time<k.protectedUntil;m.ring.rotation.z=reduced?0:w.time;m.bubble.visible=w.time<k.shieldUntil;m.ring.material=this.material(w.time<k.protectedUntil?'#b1fff0':'#70dcff');if(w.time<k.boostUntil)m.root.position.y=(k.elevation||0)+2;}

 for(const crate of w.arena.pickups){const e=this.entities.get(crate.id);e.root.visible=!w.challenge&&crate.available(w.time);e.root.rotation.y=reduced?0:(menu?this.visualTime:w.time)*.6;e.root.position.y=reduced?0:Math.sin((menu?this.visualTime:w.time)*2+crate.pos.x)*3;}

 if(w.teamMode){const core=w.teamMode.core,model=this.entities.get('core');model.root.position.set(core.pos.x,core.carrier===null?0:50,core.pos.y);model.root.rotation.y=reduced?0:w.time;model.root.visible=core.carrier!==null||w.time>=core.readyAt;}
 for(const m of w.trackTrial?.markers||w.challenge?.markers||[]){const model=this.entities.get(m.id);model.root.visible=!m.reached;}

 for(const p of [...w.projectiles,...w.mines]){if(!this.entities.has(p.id)){const model=createOrdnance(this,p);this.entities.set(p.id,model);this.scene.add(model.root);}updateOrdnance(this,this.entities.get(p.id),p,w.time,reduced);}

 this.effects=this.effects.filter(e=>{if(animateCombatEffect(e,w.time,reduced))return true;this.fxRoot.remove(e.root);releaseCombatEffect(this,e);return false;});

 const k=w.player;if(!menu&&!overview)updateRaceCamera(this,w,dt,{settings:this.cameraSettings,reduced});else{let desired,look;const pose=overview&&w.trackTrial?trainingCamera(w.trackTrial.data,this.camera.aspect):null;
 if(pose){desired=new THREE.Vector3(pose.position.x,pose.position.y,pose.position.z);look=new THREE.Vector3(pose.look.x,pose.look.y,pose.look.z);}else{const angle=-.9;desired=new THREE.Vector3(k.pos.x+Math.cos(angle)*145,88,k.pos.y+Math.sin(angle)*145);look=new THREE.Vector3(k.pos.x,29,k.pos.y);}
 const snap=this.cameraSerial!==k.spawnSerial||reduced;if(snap){this.camera.position.copy(desired);this.target.copy(look);this.cameraSerial=k.spawnSerial;}else{this.camera.position.lerp(desired,1-Math.exp(-dt*11));this.target.lerp(look,1-Math.exp(-dt*10));}const fov=overview?48:46;this.camera.fov+=(fov-this.camera.fov)*(reduced?1:1-Math.exp(-dt*5));this.camera.updateProjectionMatrix();if(menu)this.camera.setViewOffset(this.renderer.domElement.clientWidth,this.renderer.domElement.clientHeight,-this.renderer.domElement.clientWidth*.08,0,this.renderer.domElement.clientWidth,this.renderer.domElement.clientHeight);else this.camera.clearViewOffset();this.camera.lookAt(this.target);}
 if(w.trackTrial)for(const marker of w.trackTrial.markers){const model=this.entities.get(marker.id);if(model?.markerPole)model.markerPole.visible=menu||overview||!markerOccludesCamera(marker,k,this.camera.position);}
 updateTrackGhost(this,w);if(debug){const signature=JSON.stringify([Math.floor(w.tick/6),debug.sample.id,debug.layers]);if(signature!==this.debugSignature){this.debugSignature=signature;this.drawDebug(debug.sample,debug.layers);}}else this.debugSignature=null;this.debugGroup.visible=!!debug;this.renderer.render(this.scene,this.camera);}
 pick(event,w){const rect=this.renderer.domElement.getBoundingClientRect(),mouse=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,this.camera);const hits=ray.intersectObjects([...this.entities.values()].map(m=>m.root),true);for(const hit of hits.filter(h=>{let n=h.object;while(n){if(!n.visible)return false;n=n.parent;}return true;}))for(const [id,m] of this.entities){let node=hit.object;while(node){if(node===m.root)return id;node=node.parent;}}return null;}
 drawDebug(d,layers){for(const child of [...this.debugGroup.children]){child.geometry.dispose();child.material.dispose();this.debugGroup.remove(child);}const elevation=d.elevation??d.position?.elevation??0;const line=(a,b,color,y=12+elevation)=>{if(!a||!b)return;const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x,y,a.y),new THREE.Vector3(b.x,y,b.y)]),mat=new THREE.LineBasicMaterial({color,depthTest:false});const mesh=new THREE.Line(geo,mat);mesh.renderOrder=10;this.debugGroup.add(mesh);};
 const circle=(p,r,c)=>{const points=Array.from({length:49},(_,i)=>new THREE.Vector3(p.x+Math.cos(i*Math.PI/24)*r,8+elevation,p.y+Math.sin(i*Math.PI/24)*r)),geo=new THREE.BufferGeometry().setFromPoints(points),mat=new THREE.LineBasicMaterial({color:c,depthTest:false});this.debugGroup.add(new THREE.Line(geo,mat));};
 if(layers.sensors){for(const r of d.sensors)line(r.origin,r.hit,'#00e6ff');if(d.origin)circle(d.origin,Math.min(d.range||0,700),'#298baf');}
 if(layers.motion&&d.sample){const m=d.sample;for(const [v,scale,color] of [[m.velocity,15,'#ffffff'],[m.desired,15,'#ff9f31'],[m.force,240,'#49ff8e'],[d.planning,240,'#ed6dfa']])if(v)line(m.origin,{x:m.origin.x+v.x*scale,y:m.origin.y+v.y*scale},color,17);}
 if(layers.path&&d.path){const p=d.path;line(p.a,p.b,'#ffc73a');line(p.origin,p.predicted,'#ffffff');line(p.predicted,p.projection,'#ff8964');line(p.projection,p.target,'#7cff6b');circle(p.target,5,'#7cff6b');circle(p.projection,p.radius,'#ffc73a');}
 if(layers.neighbors)for(const p of d.neighbors)line(d.origin||d.position,p,'#d47eff');if(layers.threat&&d.threat){line(d.origin||d.position,d.threat,'#ff4c68');line(d.threat,d.threat.predicted,'#ff9dba');}}

 dispose(){clearTrackGhost(this);this.observer.disconnect();for(const r of this.resources)r.dispose();this.debugGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.environmentTarget?.dispose();this.renderer.dispose();}

}

