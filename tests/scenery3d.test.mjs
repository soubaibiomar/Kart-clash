import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../gp/vendor/three.module.js';
import {createRaceScenery,createContactShadow,chasePose,createSkyDome} from '../gp/raceScenery3d.js';
import {disposeModel} from '../gp/f1Model3d.js';
import {setupGP} from './gp-harness.mjs';
const {GrandPrixSimulation}=setupGP();

test('scenery follows the circuit, uses bounded instancing and leaves simulation geometry unchanged',()=>{
  for(const circuit of ['coast','it-1922']){
    const sim=new GrandPrixSimulation({circuit,drivers:2}),track=sim.track;
    const original=JSON.stringify(track.points),root=createRaceScenery(track);
    const curb=root.getObjectByName('raised-kerbs'),rails=root.getObjectByName('guardrails');
    assert.ok(curb.isInstancedMesh&&rails.isInstancedMesh);assert.ok(curb.count<=2800);assert.equal(curb.count,rails.count);
    assert.equal(JSON.stringify(track.points),original);assert.ok(root.getObjectByName('starting-gantry'));
    for(const mesh of [curb,rails]){assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));mesh.computeBoundingBox();assert.ok(!mesh.boundingBox.isEmpty());}
    const m=new THREE.Matrix4();curb.getMatrixAt(0,m);const pos=new THREE.Vector3().setFromMatrixPosition(m),s=track.sample(0,-track.radius-3);
    assert.ok(Math.hypot(pos.x-s.point.x,pos.y+s.point.y)<.001);
    let released=0;curb.geometry.addEventListener('dispose',()=>released++);disposeModel(root);assert.equal(released,1);
  }
});

test('contact shadow fades to transparency and owns a disposable texture without writing depth',()=>{
  const sky=createSkyDome();assert.equal(sky.material.side,THREE.BackSide);assert.equal(sky.material.depthWrite,false);assert.ok([...sky.geometry.attributes.color.array].every(Number.isFinite));disposeModel(sky);
  const shadow=createContactShadow(),texture=shadow.material.map,data=texture.image.data;
  assert.equal(data[3],0);assert.ok(data[(16*32+16)*4+3]>80);assert.equal(shadow.material.depthWrite,false);
  assert.ok([...data].every(Number.isFinite));let released=false;texture.addEventListener('dispose',()=>released=true);disposeModel(shadow);assert.ok(released);
});

test('chase camera stays behind heading, looks ahead and does not change a vehicle',()=>{
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const car={pos:{x:200,y:300},heading},before=JSON.stringify(car),pose=chasePose(car),dx=Math.cos(heading),dy=-Math.sin(heading);
    assert.ok((pose.position.x-car.pos.x)*dx+(pose.position.y+car.pos.y)*dy<0);
    assert.ok((pose.lookAt.x-car.pos.x)*dx+(pose.lookAt.y+car.pos.y)*dy>0);assert.equal(pose.position.z,43);assert.equal(JSON.stringify(car),before);
  }
});
