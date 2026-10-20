import * as THREE from '../gp/vendor/three.module.js';

/** Wheel meshes decorate a Kart; steering and locomotion remain in Vehicle. */
function axleGeometry(radius,width,segments){
 const geometry=new THREE.CylinderGeometry(radius,radius,width,segments);geometry.rotateX(Math.PI/2);
 // Transforms are baked before caching. Distinguish this from a vertical cylinder.
 geometry.parameters={...geometry.parameters,axle:'z'};return geometry;
}
export function createKartWheels(r,parent,color,{simple=false}={}){
 const wheels=[],radius=simple?9:10,width=simple?8:9;
 for(const x of [-14,15])for(const side of [-1,1]){
  const pivot=new THREE.Group(),roll=new THREE.Group();pivot.position.set(x,radius,side*22);pivot.add(roll);parent.add(pivot);
  const wheel=r.mesh(axleGeometry(radius,width,simple?10:24),'#172535',roll);wheel.material=r.material('#172535',.96,.02);
  let hub=null;
  if(!simple){
   hub=r.mesh(axleGeometry(5.8,width+.5,16),'#a3c2d5',roll);hub.material=r.material('#a3c2d5',.23,.85);
   r.mesh(axleGeometry(2.2,width+1,12),color,roll);
   // A narrow spoke on the outside makes rolling visible without another tyre axis.
   const spoke=r.box(roll,0,0,side*(width/2+.4),1.2,9,.6,'#a3c2d5');spoke.material=hub.material;
   for(const z of [-2.5,2.5])r.mesh(new THREE.TorusGeometry(radius-.1,.22,4,24),'#10191e',roll,0,0,z);
  }
  wheels.push({pivot,roll,wheel,hub,radius,front:x>0,lastTravel:null,lastPosition:null,serial:null});
 }
 return wheels;
}

/** Rotate the whole wheel around its fixed Z axle, once per travelled distance. */
export function updateKartWheels(wheels,k){
 const travel=Math.max(0,Number(k.travel)||0),forward=(k.vel?.x||0)*Math.cos(k.heading||0)+(k.vel?.y||0)*Math.sin(k.heading||0),direction=Math.sign(forward)||Math.sign(k.lastAction?.throttle||0)||1;
 for(const wheel of wheels){
  wheel.pivot.rotation.y=wheel.front?-(k.turn||0)*.35:0;
  if(wheel.serial!==k.spawnSerial||wheel.lastTravel===null||travel<wheel.lastTravel){wheel.roll.rotation.z=0;wheel.serial=k.spawnSerial;}
  else{
   let distance=(travel-wheel.lastTravel)*direction;
   // Streamed training poses have no local locomotion/travel counter. Read their
   // displayed displacement without integrating or changing the physical kart.
   if(distance===0&&wheel.lastPosition&&k.pos){const dx=k.pos.x-wheel.lastPosition.x,dy=k.pos.y-wheel.lastPosition.y;if(Math.hypot(dx,dy)<=32)distance=dx*Math.cos(k.heading||0)+dy*Math.sin(k.heading||0);}
   wheel.roll.rotation.z=(wheel.roll.rotation.z-distance/wheel.radius)%(Math.PI*2);
  }
  wheel.lastTravel=travel;wheel.lastPosition=k.pos?{x:k.pos.x,y:k.pos.y}:null;
 }
}
