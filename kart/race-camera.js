import * as THREE from '../gp/vendor/three.module.js';
import {cameraProfile} from './arcade-view.js';

export const cameraModes={chase:'Poursuite',close:'Rapprochée',high:'Haute'};
export function raceCameraSettings(value={}){const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));return {mode:Object.hasOwn(cameraModes,value.mode)?value.mode:'chase',distance:Number.isFinite(value.distance)?clamp(value.distance,.75,1.5):1,response:Number.isFinite(value.response)?clamp(value.response,.5,2):1};}
export function nextCameraMode(mode){const keys=Object.keys(cameraModes);return keys[(keys.indexOf(mode)+1)%keys.length];}

/** Tall checkpoint decorations yield to the view; their ground ring and physical marker remain. */
export function markerOccludesCamera(marker,k,camera){const origin=new THREE.Vector3(camera.x,camera.y,camera.z),target=new THREE.Vector3(k.pos.x,(k.elevation||0)+28,k.pos.y),length=origin.distanceTo(target);if(length<1e-8)return false;const base=marker.elevation||0,box=new THREE.Box3(new THREE.Vector3(marker.pos.x-20,base,marker.pos.y-20),new THREE.Vector3(marker.pos.x+20,base+94,marker.pos.y+20)),hit=new THREE.Vector3(),ray=new THREE.Ray(origin,target.sub(origin).normalize());return !!ray.intersectBox(box,hit)&&origin.distanceTo(hit)<=length;}

/** Camera choices affect presentation only; no perception, forces or RNG. */
export function raceCameraPose(k,w,settings={},reduced=false){
 const o=raceCameraSettings(settings),p=cameraProfile(k.vel.mag(),w.time<k.boostUntil,reduced),scale=o.mode==='close'?.7:o.mode==='high'?1.3:1;
 const tunnel=w.arena.decks?.[k.surfaceIndex]?.kind==='tunnel',height=tunnel?Math.min(65,p.height):o.mode==='close'?p.height*.64:o.mode==='high'?p.height*1.8:p.height;
 const h=k.heading,e=k.elevation||0,distance=p.distance*scale*o.distance,reverse=k.vel.x*Math.cos(h)+k.vel.y*Math.sin(h)<-.4,ahead=reverse?-25:p.look,turn=reduced||reverse?0:Math.max(-1,Math.min(1,k.turn||0))*p.look*.3*Math.min(1,k.vel.mag()/2);
 return {position:{x:k.pos.x-Math.cos(h)*distance,y:e+height,z:k.pos.y-Math.sin(h)*distance},look:{x:k.pos.x+Math.cos(h)*ahead-Math.sin(h)*turn,y:e+24,z:k.pos.y+Math.sin(h)*ahead+Math.cos(h)*turn},fov:p.fov,response:o.response};
}

function slab(a,b,lo,hi){let enter=0,exit=1;for(const key of ['x','y','z']){const delta=b[key]-a[key];if(Math.abs(delta)<1e-9){if(a[key]<lo[key]||a[key]>hi[key])return null;}else{let t=(lo[key]-a[key])/delta,u=(hi[key]-a[key])/delta;if(t>u)[t,u]=[u,t];enter=Math.max(enter,t);exit=Math.min(exit,u);if(enter>exit)return null;}}return enter;}

/** Clip the complete camera segment against physical solids and the rendered road/tunnel shells. */
export function clipRaceCamera(k,position,arena,meshes=[]){
 const origin={x:k.pos.x,y:(k.elevation||0)+28,z:k.pos.y},end={x:position.x,y:position.y,z:position.z},length=Math.hypot(end.x-origin.x,end.y-origin.y,end.z-origin.z);if(length<1e-8)return {...end};let fraction=1;
 for(const o of arena.solids){let a=origin,b=end,lo,hi;
  if(o.rail){const dx=o.b.x-o.a.x,dz=o.b.y-o.a.y,len=Math.hypot(dx,dz),slope=(o.b.elevation-o.a.elevation)/len;const local=p=>{const x=((p.x-o.a.x)*dx+(p.z-o.a.y)*dz)/len;return {x,y:p.y-o.a.elevation-x*slope,z:((p.z-o.a.y)*dx-(p.x-o.a.x)*dz)/len};};a=local(origin);b=local(end);lo={x:-8,y:-8,z:-12};hi={x:len+8,y:o.height+8,z:12};}
  else{const base=o.elevation||0;lo={x:o.pos.x-o.w/2-8,y:base-8,z:o.pos.y-o.h/2-8};hi={x:o.pos.x+o.w/2+8,y:base+o.height+8,z:o.pos.y+o.h/2+8};}
  const hit=slab(a,b,lo,hi);if(hit!==null)fraction=Math.min(fraction,Math.max(0,hit-6/length));
 }
 if(meshes.length){const direction=new THREE.Vector3(end.x-origin.x,end.y-origin.y,end.z-origin.z).normalize(),side=new THREE.Vector3(-direction.z,0,direction.x).normalize(),ray=new THREE.Raycaster();ray.far=length;
  for(const [x,y] of [[0,0],[-6,0],[6,0],[0,-6],[0,6]]){ray.set(new THREE.Vector3(origin.x+side.x*x,origin.y+y,origin.z+side.z*x),direction);const hits=ray.intersectObjects(meshes,false);if(hits.length)fraction=Math.min(fraction,Math.max(0,(hits[0].distance-8)/length));}
 }
 return {x:origin.x+(end.x-origin.x)*fraction,y:origin.y+(end.y-origin.y)*fraction,z:origin.z+(end.z-origin.z)*fraction};
}

/** Post-smoothing clearance prevents the interpolated view crossing a corner or ceiling. */
export function updateRaceCamera(r,w,dt,{settings={},reduced=false}={}){
 const k=w.player,p=raceCameraPose(k,w,settings,reduced),desired=clipRaceCamera(k,p.position,w.arena,r.cameraShells||[]),snap=r.cameraSerial!==k.spawnSerial||reduced;
 const elapsed=w.paused?0:Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0)),blend=1-Math.exp(-elapsed*11*p.response);
 const pos=new THREE.Vector3(desired.x,desired.y,desired.z),look=new THREE.Vector3(p.look.x,p.look.y,p.look.z);
 if(snap){r.camera.position.copy(pos);r.target.copy(look);r.camera.fov=p.fov;r.cameraSerial=k.spawnSerial;}else{r.camera.position.lerp(pos,blend);r.target.lerp(look,blend);r.camera.fov+=(p.fov-r.camera.fov)*(1-Math.exp(-elapsed*5));}
 const clear=clipRaceCamera(k,r.camera.position,w.arena,r.cameraShells||[]);r.camera.position.set(clear.x,clear.y,clear.z);r.camera.updateProjectionMatrix();r.camera.clearViewOffset();r.camera.lookAt(r.target);
}
