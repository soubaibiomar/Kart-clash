import * as THREE from './vendor/three.module.js';

// Render-only representations of the circuit. Never used as collision entities.
export function createRaceScenery(track){
  const root=new THREE.Group();root.name='circuit-scenery';
  const segments=Math.min(1400,Math.max(80,Math.ceil(track.totalLength/22)));
  const step=track.totalLength/segments;
  const dummy=new THREE.Object3D();
  const curb=new THREE.InstancedMesh(new THREE.BoxGeometry(1,9,1.6),new THREE.MeshStandardMaterial({roughness:.86}),segments*2);
  const rail=new THREE.InstancedMesh(new THREE.BoxGeometry(1,2,13),new THREE.MeshStandardMaterial({color:'#b0b7b9',metalness:.65,roughness:.48}),segments*2);
  curb.name='raised-kerbs';rail.name='guardrails';
  let count=0;
  for(let i=0;i<segments;i++)for(const side of [-1,1]){
    const along=i*step,s=track.sample(along,side*(track.radius+3));
    dummy.position.set(s.point.x,-s.point.y,.5);dummy.rotation.set(0,0,-Math.atan2(s.tangent.y,s.tangent.x));dummy.scale.set(step*.95,1,1);dummy.updateMatrix();
    curb.setMatrixAt(count,dummy.matrix);curb.setColorAt(count,new THREE.Color(i%2?'#eeebe1':'#b72f35'));
    const p=track.sample(along,side*(track.radius+38)).point;
    // Leave the illustrated pit corridor open; barriers are scenery, not new physics.
    dummy.position.set(p.x,-p.y,6.5);dummy.scale.set(step*1.02,1,track.pitProject(p).distance<60?0:1);dummy.updateMatrix();rail.setMatrixAt(count,dummy.matrix);count++;
  }
  root.add(curb,rail);
  const concrete=new THREE.MeshStandardMaterial({color:'#949d9e',roughness:.92});
  const roof=new THREE.MeshStandardMaterial({color:'#d5d9d7',metalness:.35,roughness:.55,side:THREE.DoubleSide});
  const seats=new THREE.MeshStandardMaterial({color:'#34546c',roughness:.82});
  for(const fraction of [.08,.27,.48,.68,.88]){
    const s=track.sample(track.totalLength*fraction,track.radius+155);
    if(track.project(s.point).distance<track.radius+95||track.pitProject(s.point).distance<110)continue;
    const stand=new THREE.Group();stand.name='grandstand';stand.position.set(s.point.x,-s.point.y,0);stand.rotation.z=-Math.atan2(s.tangent.y,s.tangent.x);
    for(let row=0;row<5;row++){
      const tier=new THREE.Mesh(new THREE.BoxGeometry(240,13,5+row*5),row%2?concrete:seats);tier.position.set(0,24-row*13,(5+row*5)/2);stand.add(tier);
    }
    const canopy=new THREE.Mesh(new THREE.BoxGeometry(260,90,3),roof);canopy.position.z=58;stand.add(canopy);
    for(const x of [-115,115]){const post=new THREE.Mesh(new THREE.BoxGeometry(4,4,58),concrete);post.position.set(x,-30,29);stand.add(post);}
    root.add(stand);
  }
  const start=track.sample(0),gantry=new THREE.Group();gantry.name='starting-gantry';gantry.position.set(start.point.x,-start.point.y,0);gantry.rotation.z=-Math.atan2(start.tangent.y,start.tangent.x);
  const span=track.radius*2+28;
  for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(5,5,70),concrete);post.position.set(0,side*span/2,35);gantry.add(post);}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(9,span,16),new THREE.MeshStandardMaterial({color:'#24282c',roughness:.7}));beam.position.z=68;gantry.add(beam);
  for(let i=0;i<5;i++){const lamp=new THREE.Mesh(new THREE.SphereGeometry(2.4,8,6),new THREE.MeshStandardMaterial({color:'#70191d',emissive:'#280405',roughness:.4}));lamp.position.set(5,(i-2)*9,66);gantry.add(lamp);}
  root.add(gantry);root.userData.instances=segments*4;return root;
}

export function createContactShadow(){
  const size=32,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x+0.5-size/2)/(size/2),(y+0.5-size/2)/(size/2)),i=(y*size+x)*4;data[i+3]=Math.round(105*Math.max(0,1-r)**1.6);}
  const map=new THREE.DataTexture(data,size,size);map.needsUpdate=true;
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(54,30),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));shadow.name='contact-shadow';shadow.position.z=.05;return shadow;
}

export function chasePose(car){
  const dx=Math.cos(car.heading),dy=-Math.sin(car.heading);
  return {position:new THREE.Vector3(car.pos.x-dx*112,-car.pos.y-dy*112,43),lookAt:new THREE.Vector3(car.pos.x+dx*95,-car.pos.y+dy*95,8)};
}

export function createSkyDome(){
  const geometry=new THREE.SphereGeometry(11000,24,12);geometry.rotateX(Math.PI/2);
  const points=geometry.attributes.position,colors=[];
  const horizon=new THREE.Color('#d9e2e5'),zenith=new THREE.Color('#6d9fc6');
  for(let i=0;i<points.count;i++){const t=Math.max(0,points.getZ(i)/11000),c=horizon.clone().lerp(zenith,Math.sqrt(t));colors.push(c.r,c.g,c.b);}
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const sky=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false}));sky.name='sky';sky.renderOrder=-1;return sky;
}
