import * as THREE from '../gp/vendor/three.module.js';

/** Reserve the full proposed street in the editor, without changing the draft. */
export function constructionRoute(track,preview){
 const out={...track,points:track.points.map(p=>({...p}))};
 if(track.closed||!preview?.length)return out;
 const tail=out.points.at(-1),start=preview[0];
 if(tail&&(Math.hypot(tail.x-start.x,tail.y-start.y)>1e-6||Math.abs((tail.elevation||0)-(start.elevation||0))>1e-6))return out;
 if(tail)out.points.pop();
 out.points.push(...preview.map(p=>({...p})));return out;
}

/** Presentation camera only: keep the player's street, rather than the city grid, in frame. */
export function constructionFrame(track,aspect=1,street=false,index=-1){
 const points=track.points;if(!points.length)return {x:900,y:0,z:700,distance:2100,angle:-.8,pitch:.9};
 if(street&&points.length>1){const i=index>=0?Math.min(index,points.length-2):points.length-2,a=points[i],b=points[i+1];return {x:(a.x+b.x)/2,y:((a.elevation||0)+(b.elevation||0))/2+18,z:(a.y+b.y)/2,distance:Math.max(600,track.width*2.5+200),angle:Math.atan2(b.y-a.y,b.x-a.x)+Math.PI,pitch:.4};}
 const xs=points.map(p=>p.x),zs=points.map(p=>p.y),top=Math.max(...points.map(p=>p.elevation||0)),pad=track.width/2+120,span=Math.max((Math.max(...xs)-Math.min(...xs)+2*pad)/Math.max(.3,aspect),Math.max(...zs)-Math.min(...zs)+2*pad);
 return {x:(Math.min(...xs)+Math.max(...xs))/2,y:top/2,z:(Math.min(...zs)+Math.max(...zs))/2,distance:Math.min(3400,Math.max(700,span/Math.sin(24*Math.PI/180)*.76)),angle:-Math.PI/2,pitch:1.15};
}

/** Keep the street camera in front of facades, including at the beginning of a road. */
export function constructionCameraDistance(frame,buildings){
 const origin=new THREE.Vector3(frame.x,frame.y,frame.z),direction=new THREE.Vector3(Math.cos(frame.angle)*Math.cos(frame.pitch),Math.sin(frame.pitch),Math.sin(frame.angle)*Math.cos(frame.pitch)),ray=new THREE.Ray(origin,direction),hit=new THREE.Vector3();let distance=frame.distance;
 for(const b of buildings){const box=new THREE.Box3(new THREE.Vector3(b.x-b.w/2-12,-12,b.y-b.d/2-12),new THREE.Vector3(b.x+b.w/2+12,b.height+12,b.y+b.d/2+12));if(ray.intersectBox(box,hit))distance=Math.min(distance,Math.max(24,origin.distanceTo(hit)-24));}
 return distance;
}

/** Focus an existing vertex, including the closing corner; presentation only. */
export function constructionPointFrame(track,index){
 if(!Number.isInteger(index)||index<0||index>=track.points.length)throw Error('Point de cadrage invalide.');
 const p=track.points[index],next=track.points[(index+1)%track.points.length],previous=track.points[index-1],b=!track.closed&&index===track.points.length-1?previous:next,reverse=!track.closed&&index===track.points.length-1?-1:1;
 const angle=b?Math.atan2((b.y-p.y)*reverse,(b.x-p.x)*reverse)+Math.PI:-.8;
 return {x:p.x,y:(p.elevation||0)+18,z:p.y,distance:Math.max(440,track.width*2.5+120),angle,pitch:.55};
}

/** Full-width ghost pavement is a diagnostic, not another physical road. */
export function drawConstructionPreview(r,track,preview,planned=null){
 if(!preview||preview.length<2)return;
 const route=planned||constructionRoute(track,preview),start=Math.max(0,track.points.length-1),vertices=[];
 for(let i=start;i<route.points.length-(route.closed?0:1);i++){
  const next=(i+1)%route.points.length,a=KartTrack.offset(route,i,-1),b=KartTrack.offset(route,next,-1),c=KartTrack.offset(route,i,1),d=KartTrack.offset(route,next,1);
  for(const p of [a,c,b,b,c,d])vertices.push(p.x,(p.elevation||0)+3,p.y);
 }
 if(!vertices.length)return;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();r.resources.add(geometry);
 const key='construction-preview';let material=r.materials.get(key);
 if(!material){material=new THREE.MeshBasicMaterial({color:'#32b4d5',transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});r.materials.set(key,material);}
 const mesh=new THREE.Mesh(geometry,material);mesh.userData.constructionPreview=true;r.worldRoot.add(mesh);
}
