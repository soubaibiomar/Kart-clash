import * as THREE from '../gp/vendor/three.module.js';

function glow(r,color,opacity=1){const key=`ordnance:${color}:${opacity}`;if(!r.materials.has(key)){const m=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1});r.materials.set(key,m);r.resources.add(m);}return r.materials.get(key);}
function luminous(r,mesh,color){mesh.material=glow(r,color);mesh.castShadow=false;return mesh;}

/** Original weapon meshes. They decorate Vehicle entities, never simulate movement. */
export function weaponBody(r,kind){
 const root=new THREE.Group(),model={root,kind};root.userData.weapon=kind;
 const cylinder=(x,y,z,radius,length,color)=>{const m=r.mesh(new THREE.CylinderGeometry(radius,radius,length,12),color,root,x,y,z);m.rotation.z=-Math.PI/2;return m;};
 if(kind==='mine'){
  r.mesh(new THREE.CylinderGeometry(17,19,6,16),'#253d4a',root,0,4,0);
  const dome=r.mesh(new THREE.SphereGeometry(15,16,8),'#88a56c',root,0,8,0);dome.scale.y=.42;
  r.mesh(new THREE.TorusGeometry(15,2,5,24),'#ffdc67',root,0,7,0).rotation.x=Math.PI/2;
  for(let i=0;i<4;i++){const angle=i*Math.PI/2;const tab=r.box(root,Math.cos(angle)*14,3,Math.sin(angle)*14,8,4,8,'#ffbd4b');tab.rotation.y=-angle;}
  model.beacon=luminous(r,r.mesh(new THREE.SphereGeometry(4,10,8),'#ffdc67',root,0,16,0),'#ffdc67');
 }else if(kind==='rapid'){
  cylinder(-2,0,0,3,16,'#d99b35');cylinder(7,0,0,2.5,6,'#fff0a3');
  const tip=r.mesh(new THREE.ConeGeometry(2.5,6,8),'#ffe9a1',root,13,0,0);tip.rotation.z=-Math.PI/2;
  const streak=luminous(r,r.box(root,-16,0,0,22,2,2,'#ffefb8'),'#ffefb8');model.flame=streak;
 }else if(kind==='shield'||kind==='boost'){
  const color=kind==='shield'?'#52cde9':'#a18bdc';cylinder(0,0,0,7,20,color);cylinder(-11,0,0,6,4,'#355362');cylinder(11,0,0,6,4,'#dce6ec');
  luminous(r,r.mesh(new THREE.TorusGeometry(7.5,1.8,6,20),'#a3f4ff',root),'#a3f4ff').rotation.y=Math.PI/2;
 }else{
  const color=kind==='homing'?'#de7ec0':'#f27955';
  cylinder(0,0,0,6,26,'#e4e9de');cylinder(-15,0,0,5,6,'#304b62');
  const nose=r.mesh(new THREE.ConeGeometry(6,14,12),color,root,20,0,0);nose.rotation.z=-Math.PI/2;
  for(let i=0;i<4;i++){const a=i*Math.PI/2,fin=r.box(root,-10,Math.cos(a)*7,Math.sin(a)*7,13,2,9,color);fin.rotation.x=a;}
  const band=r.mesh(new THREE.TorusGeometry(6.5,1.5,5,20),color,root,6,0,0);band.rotation.y=Math.PI/2;
  if(kind==='homing')luminous(r,r.mesh(new THREE.SphereGeometry(2.5,8,6),'#8ff0ff',root,25,0,0),'#8ff0ff');
  const flame=new THREE.Group();root.add(flame);for(const [radius,length,x,c] of [[5,28,-32,'#ff9b47'],[2.6,20,-25,'#fff0ad']]){const m=luminous(r,r.mesh(new THREE.ConeGeometry(radius,length,10),c,flame,x,0,0),c);m.rotation.z=Math.PI/2;}model.flame=flame;
 }
 return model;
}

export function createOrdnance(r,p){
 const model=weaponBody(r,p.kind||'mine');model.owned=[];
 if(!p.kind){
  const radius=p.detectionRadius;
  model.detectionRing=r.mesh(new THREE.TorusGeometry(radius,1.1,5,64),'#ffdc67',model.root,0,2,0);model.detectionRing.rotation.x=Math.PI/2;
  model.detectionFill=r.mesh(new THREE.CircleGeometry(radius,64),'#ff755c',model.root,0,1.5,0);model.detectionFill.rotation.x=-Math.PI/2;
  for(const [mesh,opacity] of [[model.detectionRing,.65],[model.detectionFill,.05]]){const mat=new THREE.MeshBasicMaterial({color:'#ffdc67',transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});mesh.material=mat;mesh.castShadow=false;model.owned.push(mat);r.resources.add(mat);}
 }
 return model;
}

export function updateOrdnance(r,model,p,time,reduced=false){
 model.root.position.set(p.pos.x,(p.elevation||0)+(p.kind?14:0),p.pos.y);model.root.rotation.y=p.kind?-p.vel.heading():0;
 if(model.flame)model.flame.scale.setScalar(reduced?1:1+Math.sin(time*45)*.12);
 if(model.detectionRing){const armed=!!p.detection?.armed,color=armed?'#ff6958':'#ffdc67';model.beacon.material=glow(r,color);model.detectionRing.material.color.set(color);model.detectionFill.material.color.set(color);model.detectionFill.material.opacity=armed?.09+(reduced?0:Math.sin(time*6)*.025):.035;model.detectionRing.material.opacity=armed?.8:.45;}
}
export function releaseOrdnance(r,model){for(const mat of model.owned||[]){mat.dispose();r.resources.delete(mat);}model.owned=[];}

export function weaponMount(r,kind){
 const model=weaponBody(r,kind),root=model.root;
 if(model.flame)model.flame.visible=false;
 root.scale.setScalar(kind==='rapid'?.65:.52);root.position.set(kind==='mine'?-26:15,kind==='mine'?26:28,kind==='mine'?0:-22);
 if(kind==='rapid'){
  root.clear();r.box(root,-3,0,0,18,12,13,'#dfb654');for(const z of [-3,3]){const barrel=r.mesh(new THREE.CylinderGeometry(2.5,2.5,22,8),'#304858',root,15,1,z);barrel.rotation.z=-Math.PI/2;}r.box(root,3,-8,0,7,5,8,'#283f50');
 }
 return root;
}

export function softShadow(r){const key='kart-contact-shadow';if(r.materials.has(key))return r.materials.get(key);let map=null;if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'rgba(0,0,0,.5)');gradient.addColorStop(.55,'rgba(0,0,0,.26)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);map=new THREE.CanvasTexture(canvas);}
 const material=new THREE.MeshBasicMaterial({color:'#172c3b',map,transparent:true,opacity:.65,depthWrite:false});if(map)material.addEventListener('dispose',()=>map.dispose());r.resources.add(material);r.materials.set(key,material);return material;}
