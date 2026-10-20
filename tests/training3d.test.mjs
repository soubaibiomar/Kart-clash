import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../gp/vendor/three.module.js';
import {validTrainingFrame,createTrainingTrack,trainingCameraPose} from '../gp/training3d.js';
import {disposeModel} from '../gp/f1Model3d.js';
const frame=()=>({points:[[0,0],[1000,0],[1000,1000],[0,1000]],radius:80,positions:[[20,0],[100,30]],heading:[0,Math.PI/2],alive:[true,false],leader:1});
test('training 3D requires actual finite per-driver GPU positions and rejects incomplete or oversized frames',()=>{
  assert.ok(validTrainingFrame(frame()));for(const f of [null,{...frame(),positions:[]},{...frame(),heading:[0]},{...frame(),radius:NaN},{...frame(),positions:[[NaN,0],[0,0]]},{...frame(),positions:Array(129).fill([0,0])}])assert.equal(validTrainingFrame(f),false);
});
test('GPU track rendering is finite, closed, disposable and never modifies GPU coordinates',()=>{
  const f=frame(),before=JSON.stringify(f),track=createTrainingTrack(f.points,f.radius);let vertices=0,disposed=0;
  track.traverse(mesh=>{if(mesh.geometry){const p=mesh.geometry.attributes.position;vertices+=p.count;assert.ok([...p.array].every(Number.isFinite));mesh.geometry.addEventListener('dispose',()=>disposed++);}});
  assert.ok(vertices>0);assert.equal(JSON.stringify(f),before);disposeModel(track);assert.equal(disposed,5);
});
test('camera follows the actual leader heading and circuit framing stays finite on narrow screens without moving candidates',()=>{
  const f=frame(),before=JSON.stringify(f),follow=trainingCameraPose(f,'follow');assert.ok(Math.abs(follow.position.x-100)<1e-6);assert.ok(follow.position.y>-30);
  for(const aspect of [.3,1,2]){const pose=trainingCameraPose(f,'circuit',aspect);assert.ok(pose.position instanceof THREE.Vector3);assert.ok(pose.position.toArray().every(Number.isFinite));assert.ok(pose.position.z>0);}
  f.leader=99;assert.ok(trainingCameraPose(f,'follow').position.toArray().every(Number.isFinite));f.leader=1;assert.equal(JSON.stringify(f),before);
});
