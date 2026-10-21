import {surfaceTexture} from './daylight.js';
import * as THREE from '../gp/vendor/three.module.js';
/** City materials retain game units and have a lifetime tied to their material. */
export function urbanMaterial(r,color,asphalt=false){
 const key='urban:'+color+(asphalt?':asphalt':'');if(r.materials.has(key))return r.materials.get(key);
 const m=new THREE.MeshStandardMaterial({color,roughness:asphalt?.96:.82,metalness:color==='#39505c'?.25:.02});
 const facade=['#a09280','#9c5948','#bec4bc','#6d8189'].includes(color);if(asphalt||facade){const bump=surfaceTexture(asphalt);m.bumpMap=bump;if(asphalt){const map=surfaceTexture(true);map.colorSpace=THREE.SRGBColorSpace;m.map=map;m.addEventListener('dispose',()=>map.dispose());}m.bumpScale=asphalt?.65:.35;m.addEventListener('dispose',()=>bump.dispose());}
 if(color==='#39505c'){m.roughness=.22;m.metalness=.35;m.envMapIntensity=.8;}

 r.materials.set(key,m);r.resources.add(m);return m;
}
/** Static city details are batched, keeping thousands of facade windows inexpensive. */
export function cityBatch(r,parent){
 const groups=new Map(),add=(shape,x,y,z,w,h,d,color,yaw=0)=>{if(w<=0||h<=0||d<=0)return;const key=shape+':'+color;if(!groups.has(key))groups.set(key,{shape,color,list:[]});groups.get(key).list.push({x,y,z,w,h,d,yaw});};
 return {box:(...a)=>add('box',...a),ellipsoid:(...a)=>add('ellipsoid',...a),cylinder:(...a)=>add('cylinder',...a),flush(){const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3();for(const {shape,color,list} of groups.values()){const geo=shape==='ellipsoid'?new THREE.SphereGeometry(.5,10,6):shape==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,8):new THREE.BoxGeometry(1,1,1);r.resources.add(geo);const mesh=new THREE.InstancedMesh(geo,urbanMaterial(r,color),list.length);list.forEach((b,i)=>{pos.set(b.x,b.y,b.z);scale.set(b.w,b.h,b.d);q.setFromAxisAngle(new THREE.Vector3(0,1,0),-b.yaw);matrix.compose(pos,q,scale);mesh.setMatrixAt(i,matrix);});r.resources.add(mesh);mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=!['#39505c','#ead9a0','#a5b6ba','#dfdfd2'].includes(color);mesh.receiveShadow=true;mesh.userData.cityInstances=list.length;mesh.userData.cityShape=shape;parent.add(mesh);}return groups.size;}};
}
export function drawCity(r,track,{parent=r.worldRoot,buildings,fixtures,arcade=false}={}){
 const plan=buildings&&fixtures?null:CityLayout.plan(track),houses=buildings||plan.buildings.map(s=>new CityBuilding(s)),props=fixtures||plan.fixtures.map(s=>new StreetFixture(s)),b=cityBatch(r,parent);
 const terrain=track.bounds||{width:1800,height:1400};b.box(terrain.width/2,-16,terrain.height/2,terrain.width+1600,20,terrain.height+1500,arcade?'#76c77b':'#a4a99e');b.box(terrain.width/2,-3,terrain.height/2,terrain.width+300,5,terrain.height+300,arcade?'#9edb80':'#b5b7ad');
 const colors=['#a09280','#9c5948','#bec4bc','#6d8189'];
 for(const o of houses){const x=o.pos.x,z=o.pos.y,h=o.height,c=colors[o.style%4];
  b.box(x,h/2,z,o.w,h,o.h,c);b.box(x,h+3,z,o.w+6,6,o.h+6,'#d4d1c4');b.box(x,h+7,z,o.w-10,2,o.h-10,'#59646a');b.box(x+o.w*.17,h+13,z+o.h*.1,22,12,20,'#9fa8a5');b.box(x,5,z,o.w+12,10,o.h+12,'#d2cabe');
  for(const side of [-1,1]){b.box(x+side*(o.w/2+1),h+9,z,4,12,o.h+6,'#d4d1c4');b.box(x,h+9,z+side*(o.h/2+1),o.w-2,12,4,'#d4d1c4');}b.box(x+o.w*.17,h+13,z+o.h*.1+10.4,17,6,1,'#59646a');
  for(let y=25;y<h-8;y+=23){for(let dx=-o.w/2+14;dx<o.w/2-8;dx+=20)for(const side of [-1,1])b.box(x+dx,y,z+side*(o.h/2+.6),10,12,1.4,(Math.round(dx+y)+o.style)%5===0?'#ead9a0':'#39505c');for(let dz=-o.h/2+14;dz<o.h/2-8;dz+=20)for(const side of [-1,1])b.box(x+side*(o.w/2+.6),y,z+dz,1.4,12,10,'#39505c');}
  // Doors and shop awnings face the road rather than the same world direction.
  const toRoad=o.frontage?{x:o.frontage.x-x,z:o.frontage.y-z}:{x:0,z:1},alongX=Math.abs(toRoad.x)>Math.abs(toRoad.z),side=Math.sign(alongX?toRoad.x:toRoad.z)||1,front=alongX?o.w:o.h,span=alongX?o.h:o.w;
  const facade=(across,y,out,w,h,d,color)=>b.box(x+(alongX?side*(front/2+out):across),y,z+(alongX?across:side*(front/2+out)),alongX?d:w,h,alongX?w:d,color);
  facade(0,12,.9,13,22,2,'#39505c');if(o.frontage){for(const side of [-1,1]){facade(side*span*.28,10,1.1,Math.max(8,span*.28),18,1.5,'#39505c');facade(side*span*.28,20,1.8,Math.max(10,span*.28+3),2,3,'#d2cabe');}facade(0,34,1.6,span-10,2,3,'#d2cabe');}if(o.style===1){facade(0,25,5,span-12,3,12,'#8f4439');for(const edge of [-1,1])facade(edge*(span/2-9),12,10,2,24,2,'#5c6565');}
 }
 for(const o of props){const x=o.pos.x,z=o.pos.y;if(o.fixture==='lamp'){b.cylinder(x,50,z,4,100,4,'#46565e');b.box(x,5,z,10,10,10,'#8b9594');const dx=Math.cos(o.heading),dz=Math.sin(o.heading);b.box(x-dx*13,99,z-dz*13,32,4,5,'#46565e',o.heading);b.box(x-dx*26,96,z-dz*26,16,3,10,'#ead9a0',o.heading);}else{b.cylinder(x,17,z,7,34,7,'#74604b');b.ellipsoid(x,43,z,32,30,32,'#54755b');b.ellipsoid(x+3,55,z,24,18,26,'#718860');b.box(x,0,z,42,2,42,'#747f70');}}
 // Road crossings are painted markings only, outside the driving/sensor model.
 for(let i=0;i<track.points.length-(track.closed?0:1);i++){const a=track.points[i],c=track.points[(i+1)%track.points.length],dx=c.x-a.x,dz=c.y-a.y,l=Math.hypot(dx,dz),angle=Math.atan2(dz,dx),width=(a.width??track.width)+((c.width??track.width)-(a.width??track.width))*Math.min(1,90/l);if(l<300||(a.elevation||0)>1||(c.elevation||0)>1||a.kind==='tunnel')continue;const px=a.x+dx*90/l,pz=a.y+dz*90/l;for(let d=-width/2+22;d<width/2-12;d+=17)b.box(px-dz/l*d,.7,pz+dx/l*d,36,.2,9,'#dfdfd2',angle);b.box(px-dx/l*35,.7,pz-dz/l*35,4,.2,width-24,'#dfdfd2',angle);}
 b.flush();return {buildings:houses.length,fixtures:props.length};
}
