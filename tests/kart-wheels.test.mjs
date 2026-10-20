import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../gp/vendor/three.module.js';
import {createRequire} from 'node:module';
import {KartRenderer} from '../kart/renderer.js';
import {updateKartWheels} from '../kart/kart-wheels.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
const renderer=()=>Object.assign(Object.create(KartRenderer.prototype),{resources:new Set(),materials:new Map(),geometryCache:new Map()});
const snapshot=k=>JSON.stringify(k,(key,value)=>key==='vehicle'?undefined:value);
const free=r=>{for(const resource of r.resources)resource.dispose();};

test('game and training karts have four upright tyres resting on the road, clear of the body sides',()=>{
 const g=load(),r=renderer(),k=new g.Kart(0,'Fixture','#ff783e');
 for(const model of [r.kart(k),r.populationKart(k)]){
  assert.equal(model.wheels.length,4);assert.equal(model.wheels.filter(w=>w.front).length,2);model.root.updateMatrixWorld(true);
  for(const w of model.wheels){assert.equal(w.pivot.position.y,w.radius);assert.equal(Math.abs(w.pivot.position.z),22);assert.equal(w.wheel.geometry.parameters.axle,'z');const box=new THREE.Box3().setFromObject(w.wheel);assert.ok(Math.abs(box.min.y)<1e-5);assert.ok(Math.abs(box.max.y-w.radius*2)<1e-5);assert.ok(box.max.z-box.min.z<10);}
 }free(r);
});

test('rolling a quarter or full turn never tips the axle or changes tyre height',()=>{
 const g=load(),r=renderer(),model=r.kart(new g.Kart(0,'Fixture','#ff783e'));
 for(const w of model.wheels){w.pivot.rotation.y=w.front?-.3:0;for(const angle of [0,Math.PI/2,Math.PI,Math.PI*2]){w.roll.rotation.z=angle;model.root.updateMatrixWorld(true);const axis=new THREE.Vector3(0,0,1).transformDirection(w.wheel.matrixWorld),expected=new THREE.Vector3(0,0,1).applyQuaternion(w.pivot.quaternion);assert.ok(axis.distanceTo(expected)<1e-8);const box=new THREE.Box3().setFromObject(w.wheel);assert.ok(Math.abs(box.min.y)<1e-5);assert.ok(Math.abs(box.max.y-20)<1e-5);}}
 free(r);
});

test('tyre, hub and cap roll together at the correct radius and reverse when driving backwards',()=>{
 const g=load(),r=renderer(),k=new g.Kart(0,'Fixture','#ff783e'),m=r.kart(k);k.vel.set(4,0);k.turn=1;updateKartWheels(m.wheels,k);k.travel=10*Math.PI/2;updateKartWheels(m.wheels,k);
 for(const w of m.wheels){assert.ok(Math.abs(w.roll.rotation.z+Math.PI/2)<1e-8);assert.equal(w.wheel.parent,w.roll);assert.equal(w.hub.parent,w.roll);assert.equal(w.wheel.rotation.z,0);assert.equal(w.hub.rotation.z,0);assert.equal(w.pivot.rotation.y,w.front?-.35:0);}
 k.vel.set(-4,0);k.travel+=10*Math.PI/2;updateKartWheels(m.wheels,k);for(const w of m.wheels)assert.ok(Math.abs(w.roll.rotation.z)<1e-8);free(r);
});

test('stopped frames freeze the wheels and respawn resets visual rotation without changing a Vehicle',()=>{
 const g=load(),r=renderer(),k=new g.Kart(0,'Fixture','#ff783e'),m=r.kart(k);k.vel.set(3,0);updateKartWheels(m.wheels,k);k.travel=12;updateKartWheels(m.wheels,k);const angle=m.wheels[0].roll.rotation.z,before=snapshot(k);for(let i=0;i<100;i++)updateKartWheels(m.wheels,k);assert.equal(m.wheels[0].roll.rotation.z,angle);assert.equal(snapshot(k),before);k.spawnSerial=2;updateKartWheels(m.wheels,k);assert.equal(m.wheels[0].roll.rotation.z,0);free(r);
});

test('streamed training wheels read position changes and ignore discontinuities without simulating locomotion',()=>{
 const g=load(),r=renderer(),k=new g.EvolutionKart(0),m=r.populationKart(k);k.pos.set(300,700);updateKartWheels(m.wheels,k);k.pos.x+=9;const before=snapshot(k);updateKartWheels(m.wheels,k);assert.equal(m.wheels[0].roll.rotation.z,-1);assert.equal(snapshot(k),before);k.pos.x+=100;updateKartWheels(m.wheels,k);assert.equal(m.wheels[0].roll.rotation.z,-1);updateKartWheels(m.wheels,k);assert.equal(m.wheels[0].roll.rotation.z,-1);free(r);
});

test('baked wheel cylinders do not contaminate cached vertical cylinders and repeated karts share resources',()=>{
 const g=load(),r=renderer(),k=new g.Kart(0,'Fixture','#ff783e'),m=r.kart(k),first=r.geometryCache.size,parent=new THREE.Group(),vertical=r.mesh(new THREE.CylinderGeometry(10,10,9,24),'#172535',parent);assert.notEqual(vertical.geometry,m.wheels[0].wheel.geometry);vertical.geometry.computeBoundingBox();assert.equal(vertical.geometry.boundingBox.max.y,4.5);
 const withVertical=r.geometryCache.size;r.kart(k);assert.equal(r.geometryCache.size,withVertical);assert.equal(withVertical,first+1);free(r);
});
