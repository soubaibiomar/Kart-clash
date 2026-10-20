import * as THREE from '../gp/vendor/three.module.js';
/** Bounded rubber traces sampled from real Vehicle motion. No second simulation. */
export function createSkidTrails(r){
 const capacity=256,positions=new Float32Array(capacity*36),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 const material=new THREE.MeshBasicMaterial({color:'#22282b',transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=1;r.resources.add(geometry);r.resources.add(material);r.worldRoot.add(mesh);
 return {capacity,positions,geometry,mesh,slots:Array(capacity).fill(null),last:new Map(),cursor:0};
}
export function updateSkidTrails(trails,w,reduced=false){
 let dirty=false;
 for(let i=0;i<trails.capacity;i++)if(trails.slots[i]!==null&&w.time-trails.slots[i]>=12){trails.positions.fill(0,i*36,(i+1)*36);trails.slots[i]=null;dirty=true;}
 for(const k of w.karts){
  const previous=trails.last.get(k.id),now={x:k.pos.x,z:k.pos.y,y:k.elevation||0,serial:k.spawnSerial,tick:w.tick};
  if(previous?.tick===w.tick)continue;trails.last.set(k.id,now);
  if(reduced||w.paused||w.phase!=='playing'||!k.alive||!k.drifting||!previous||previous.serial!==now.serial||Math.hypot(now.x-previous.x,now.z-previous.z)>32||Math.abs(now.y-previous.y)>12)continue;
  if(Math.hypot(now.x-previous.x,now.z-previous.z)<.5)continue;
  const side={x:-Math.sin(k.heading),z:Math.cos(k.heading)},i=trails.cursor++%trails.capacity,vertices=[];
  for(const wheel of [-22,22]){const point=(p,edge)=>[p.x+side.x*(wheel+edge),p.y+.8,p.z+side.z*(wheel+edge)],a=point(previous,-1.7),b=point(previous,1.7),c=point(now,-1.7),d=point(now,1.7);vertices.push(...a,...b,...c,...c,...b,...d);}
  trails.positions.set(vertices,i*36);trails.slots[i]=w.time;dirty=true;
 }
 if(dirty)trails.geometry.attributes.position.needsUpdate=true;
 return trails.slots.filter(t=>t!==null).length;
}
