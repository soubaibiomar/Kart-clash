import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../gp/vendor/three.module.js';
import {createF1Model,disposeModel} from '../gp/f1Model3d.js';

test('F1 asset is actual indexed geometry with four tyres, PBR materials and plausible metre scale',()=>{
  const model=createF1Model('#ff2233',16);const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());let wheels=0,triangles=0;
  model.traverse(o=>{if(o.name==='wheel')wheels++;if(o.isMesh){assert.ok(o.material.isMeshStandardMaterial);const p=o.geometry.attributes.position;assert.ok([...p.array].every(Number.isFinite));triangles+=(o.geometry.index?.count||p.count)/3;}});
  assert.equal(wheels,4);assert.ok(size.x>4.8&&size.x<5.6);assert.ok(size.y>2&&size.y<2.4);assert.ok(size.z>.8&&size.z<1.5);assert.ok(triangles<6000);assert.equal(model.userData.metres,true);disposeModel(model);
});
test('two liveries have independent materials and release all owned resources',()=>{
  const a=createF1Model('#ff0000',1),b=createF1Model('#0000ff',2);const first=root=>{let paint;root.traverse(o=>{if(o.isMesh&&o.material.metalness===.58)paint=o.material;});return paint;};
  assert.notEqual(first(a),first(b));assert.notEqual(first(a).color.getHex(),first(b).color.getHex());let disposed=0;a.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));disposeModel(a);assert.ok(disposed>20);assert.equal(first(b).color.getHex(),0x0000ff);disposeModel(b);
});
test('race coordinate mapping and heading preserve positions without steering side effects',()=>{
  const m=createF1Model();const source={pos:{x:120,y:240},heading:Math.PI/2};m.position.set(source.pos.x,-source.pos.y,0);m.rotation.z=-source.heading;m.updateMatrixWorld(true);
  const front=m.localToWorld(new THREE.Vector3(1,0,0));assert.ok(Math.abs(front.x-120)<1e-9);assert.ok(Math.abs(front.y+241)<1e-9);assert.deepEqual(source.pos,{x:120,y:240});disposeModel(m);
});
test('all platform routes use shared design; both camera modes and keyboard garage exploration exist',()=>{
  for(const path of ['apex-lab.html','garage.html','training.html'])assert.match(readFileSync(new URL('../'+path,import.meta.url),'utf8'),/gp\/platform.css/);
  const race=readFileSync(new URL('../apex-lab.html',import.meta.url),'utf8');assert.match(race,/data-camera="chase"/);assert.match(race,/gp\/race3d.js/);
  const garage=readFileSync(new URL('../gp/garage3d.js',import.meta.url),'utf8');assert.match(garage,/onkeydown/);assert.match(garage,/disposeModel/);
  const render=readFileSync(new URL('../gp/race3d.js',import.meta.url),'utf8');assert.doesNotMatch(render,/applyForce|\.update\(/);assert.match(render,/diagnostic.sensors/);assert.match(render,/sensors\?\.origin/);assert.doesNotMatch(render,/RacingSensors.scan/);
});
