import * as THREE from '../gp/vendor/three.module.js';

/** Bounded, time-based visual feedback. No lights, world RNG or collision entities. */
export function combatEffect(r,event,w){
 const root=new THREE.Group(),explosion=event.type==='impact'||event.type==='elimination',color=event.item==='homing'?'#eca5f0':event.type==='blocked'?'#80eaff':event.type==='pickup'?'#ffe98e':'#ffc46b';
 const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}),smoke=new THREE.MeshBasicMaterial({color:'#5a6272',transparent:true,opacity:.4,depthWrite:false});r.resources.add(mat);r.resources.add(smoke);
 const particles=[],count=event.type==='elimination'?12:explosion?9:event.type==='fire'?3:6;
 for(let i=0;i<count;i++){const p=r.mesh(new THREE.IcosahedronGeometry(explosion?6:3,0),color,root);p.material=explosion&&i%3===0?smoke:mat;p.castShadow=false;p.userData.flight={x:Math.cos(i*2.399)*95,y:35+(i%3)*25,z:Math.sin(i*2.399)*95};particles.push(p);}
 const ring=r.mesh(new THREE.TorusGeometry(explosion?12:8,explosion?2:1,6,32),color,root);ring.material=mat;ring.rotation.x=Math.PI/2;ring.castShadow=false;
 root.position.set(event.pos.x,(event.pos.elevation||0)+14,event.pos.y);
 if(event.type==='fire'){const k=w.karts.find(k=>k.id===event.id);if(k){const offset=event.item==='mine'?-35:37;root.position.x+=Math.cos(k.heading)*offset;root.position.z+=Math.sin(k.heading)*offset;root.position.y=(k.elevation||0)+(event.item==='mine'?5:20);}}
 return {root,particles,ring,owned:[mat,smoke],born:w.time,duration:event.type==='elimination'?.85:explosion?.6:.28,explosion};
}
export function animateCombatEffect(e,time,reduced=false){const age=Math.max(0,time-e.born),t=Math.min(1,age/e.duration);if(age>=e.duration)return false;
 for(const p of e.particles){const f=p.userData.flight;p.position.set(reduced?0:f.x*age,reduced?0:f.y*age-70*age*age,reduced?0:f.z*age);p.scale.setScalar(e.explosion&&p.material===e.owned[1]?1+t*2:Math.max(.05,1-t));}
 e.ring.scale.setScalar(reduced?1:1+t*(e.explosion?4:2));e.owned[0].opacity=(1-t)*.8;e.owned[1].opacity=(1-t)*.35;return true;
}
export function releaseCombatEffect(r,e){for(const m of e.owned){m.dispose();r.resources.delete(m);}e.owned=[];}
