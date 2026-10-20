import * as THREE from './vendor/three.module.js';

// Render asset only: metres, +X forward, +Z up. The owning entity remains GrandPrixCar extends Vehicle.
export function createF1Model(color='#ed3348',number=1){
  const root=new THREE.Group();root.name=`F1-${number}`;
  const paint=new THREE.MeshPhysicalMaterial({color,metalness:.58,roughness:.3,clearcoat:.8,clearcoatRoughness:.2});
  const carbon=new THREE.MeshStandardMaterial({color:'#15191d',metalness:.25,roughness:.64});
  const rubber=new THREE.MeshStandardMaterial({color:'#101113',roughness:.94});
  const metal=new THREE.MeshStandardMaterial({color:'#bbc3c8',metalness:.85,roughness:.27});
  const stripe=new THREE.MeshStandardMaterial({color:'#f5d74f',roughness:.65});
  const detail=new THREE.Group();detail.name='details';root.add(detail);
  const mesh=(geometry,material,x,y,z,parent=root)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(x,y,z,a,b,c,material=paint,parent=root)=>mesh(new THREE.BoxGeometry(a,b,c),material,x,y,z,parent);
  const shell=(points,depth,z,material)=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.04,bevelThickness:.04}),material,0,0,z);};
  shell([[-2.1,-.73],[-2.1,.73],[.2,.73],[.85,.36],[2.3,.12],[2.3,-.12],[.85,-.36],[.2,-.73]],.07,.16,carbon);
  shell([[-1.9,-.27],[-1.9,.27],[-.7,.43],[.3,.32],[1.95,.1],[1.95,-.1],[.3,-.32],[-.7,-.43]],.36,.3,paint);
  for(const side of [-1,1]){
    shell([[-1.55,side*.42],[-1.15,side*.73],[.25,side*.68],[.58,side*.4]],.3,.29,paint);
    box(.35,side*.49,.53,.25,.31,.16,carbon,detail);
    for(const x of [-1.55,1.55]){
      const wheel=mesh(new THREE.CylinderGeometry(.36,.36,.35,24),rubber,x,side*.91,.38);wheel.name='wheel';
      const hub=mesh(new THREE.CylinderGeometry(.17,.17,.365,12),metal,x,side*.91,.38,detail);hub.name='hub';
      const band=mesh(new THREE.TorusGeometry(.31,.018,5,16),stripe,x,side*1.09,.38);band.rotation.x=Math.PI/2;band.name='tyre-band';
      const arm=box(x*.62,side*.66,.33,.91,.035,.035,carbon,detail);arm.rotation.z=side*x*.13;
    }
  }
  for(const x of [2.25,2.39,2.52])box(x,0,.22,.13,1.96,.055,carbon);
  box(-2.09,0,.82,.42,1.25,.08);box(-2.2,0,.97,.24,1.2,.055,carbon);
  for(const side of [-1,1]){box(-2.1,side*.65,.67,.5,.045,.67);box(2.36,side*.98,.24,.43,.04,.3);}
  box(-1.8,0,.5,.05,.07,.64,carbon,detail);
  const cockpit=mesh(new THREE.SphereGeometry(.34,12,8),carbon,-.18,0,.68);cockpit.scale.set(1.6,.83,.4);
  mesh(new THREE.SphereGeometry(.16,12,8),new THREE.MeshStandardMaterial({color:'#ffe9b3',roughness:.4}),-.3,0,.81,detail);
  const halo=mesh(new THREE.TorusGeometry(.33,.035,6,16,Math.PI*1.8),metal,-.1,0,.9,detail);halo.scale.x=1.4;
  box(.28,0,.73,.045,.045,.3,metal,detail);
  const engine=mesh(new THREE.SphereGeometry(.5,16,10),paint,-1.1,0,.57,detail);engine.scale.set(1.25,.45,.6);
  for(const side of [-1,1]){
    box(-.55,side*.695,.48,.78,.018,.065,new THREE.MeshStandardMaterial({color:'#e9edf1',roughness:.45}),detail);
    const mirror=box(.4,side*.56,.83,.18,.12,.09,paint,detail);mirror.rotation.z=side*.12;
    box(.34,side*.48,.73,.035,.18,.035,carbon,detail);
  }
  const intake=mesh(new THREE.ConeGeometry(.19,.48,8),paint,-.8,0,.85,detail);intake.rotation.x=Math.PI/2;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f2f3f5';ctx.font='bold 82px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(number),64,64);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    mesh(new THREE.PlaneGeometry(.5,.5),new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.4}),-1.25,0,.705,detail);
  }
  // Authentic silhouette and team-coloured materials; an illustrative model, not a homologated chassis.
  root.userData={metres:true,detail,tyreMaterial:stripe};return root;
}

export function disposeModel(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}
