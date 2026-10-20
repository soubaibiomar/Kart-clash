import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as THREE from '../gp/vendor/three.module.js';
import {batchRoadDecoration} from '../kart/road-batching.js';
import {cityBatch,drawCity,urbanMaterial} from '../kart/city-art.js';
import {drawTrackDecks} from '../kart/track-geometry.js';
const require=createRequire(import.meta.url),{load}=require('../kart/node-world.cjs');
function renderer(){return {worldRoot:new THREE.Group(),resources:new Set(),materials:new Map(),material(c){return urbanMaterial(this,c);},mesh(g,c,p,x=0,y=0,z=0){this.resources.add(g);const m=new THREE.Mesh(g,this.material(c));m.position.set(x,y,z);p.add(m);return m;},box(p,x,y,z,w,h,d,c){return this.mesh(new THREE.BoxGeometry(w,h,d),c,p,x,y,z);}};}
function box(r,parent,material,size=[2,3,4]){const geometry=new THREE.BoxGeometry(...size),m=new THREE.Mesh(geometry,material);r.resources.add(geometry);m.userData.staticRoad=true;parent.add(m);return m;}
function close(a,b){assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);}

test('road instances preserve nested ramp transforms, dimensions, UVs and shadows',()=>{
 const r=renderer(),p=r.worldRoot;p.position.set(15,20,-10);p.rotation.y=.4;
 const rail=new THREE.Group();rail.rotation.set(.2,-.6,.1);rail.position.set(20,50,30);p.add(rail);
 const material=new THREE.MeshStandardMaterial(),a=box(r,rail,material),b=box(r,p,material,[8,1,3]);a.position.set(5,6,7);a.rotation.z=.3;b.position.set(-30,2,70);a.castShadow=b.castShadow=true;a.receiveShadow=b.receiveShadow=true;
 p.updateWorldMatrix(true,true);const originals=[a,b].map(m=>({matrix:m.matrixWorld.clone(),size:m.geometry.parameters}));
 assert.deepEqual(batchRoadDecoration(r,p),{sources:2,draws:1,batched:2});p.updateWorldMatrix(true,true);
 const result=p.children.find(m=>m.isInstancedMesh);assert.equal(result.material,material);assert.equal(result.castShadow,true);assert.equal(result.receiveShadow,true);
 originals.forEach((source,i)=>{const matrix=new THREE.Matrix4();result.getMatrixAt(i,matrix);matrix.premultiply(result.matrixWorld);for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){const actual=new THREE.Vector3(x,y,z).applyMatrix4(matrix),expected=new THREE.Vector3(x*source.size.width,y*source.size.height,z*source.size.depth).applyMatrix4(source.matrix);close(actual.x,expected.x);close(actual.y,expected.y);close(actual.z,expected.z);}});
 assert.equal(result.geometry.getAttribute('uv').count,a.geometry.getAttribute('uv').count);assert.equal(a.parent,null);assert.equal(b.parent,null);
 for(const resource of r.resources)resource.dispose();material.dispose();
});

test('merged road strips keep transformed positions, normals and texture coordinates',()=>{
 const r=renderer(),p=r.worldRoot,material=new THREE.MeshStandardMaterial(),expected=[];p.rotation.y=.7;p.position.set(100,40,-10);
 for(let i=0;i<2;i++){const geometry=new THREE.PlaneGeometry(8+i,12),m=new THREE.Mesh(geometry,material);m.userData.staticRoad=true;m.rotation.set(-Math.PI/2,.2*i,.1*i);m.position.set(i*30,i*12,10);p.add(m);r.resources.add(geometry);}
 p.updateWorldMatrix(true,true);const inv=p.matrixWorld.clone().invert();for(const m of p.children){const geo=m.geometry.toNonIndexed();geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld));expected.push(geo);}
 assert.equal(batchRoadDecoration(r,p).batched,2);const mesh=p.children[0];assert.equal(mesh.isInstancedMesh,undefined);assert.equal(mesh.material,material);
 for(const name of ['position','normal','uv']){const values=expected.flatMap(g=>Array.from(g.getAttribute(name).array));assert.equal(mesh.geometry.getAttribute(name).array.length,values.length);values.forEach((v,i)=>close(mesh.geometry.getAttribute(name).array[i],v));}
 assert.ok(mesh.geometry.boundingSphere.radius>0);for(const g of expected)g.dispose();for(const resource of r.resources)resource.dispose();material.dispose();
});

test('road batching leaves camera shells, unrelated meshes, singletons and existing instances intact',()=>{
 const r=renderer(),p=r.worldRoot,material=new THREE.MeshBasicMaterial(),a=box(r,p,material),b=box(r,p,material),shell=box(r,p,material),plain=box(r,p,material),single=box(r,p,new THREE.MeshBasicMaterial()),instanced=new THREE.InstancedMesh(a.geometry,material,1);
 shell.userData.cameraSolid=true;plain.userData.staticRoad=false;instanced.userData.staticRoad=true;p.add(instanced);
 assert.deepEqual(batchRoadDecoration(r,p),{sources:3,draws:1,batched:2});for(const m of [shell,plain,single,instanced])assert.equal(m.parent,p);
 const count=p.children.length;assert.deepEqual(batchRoadDecoration(r,p),{sources:1,draws:0,batched:0});assert.equal(p.children.length,count);
 for(const resource of r.resources)resource.dispose();material.dispose();single.material.dispose();instanced.dispose();
});

test('batch ownership releases instance buffers and geometry without prematurely disposing shared materials',()=>{
 const r=renderer(),p=r.worldRoot,material=urbanMaterial(r,'#fff'),a=box(r,p,material),b=box(r,p,material);b.position.x=5;let materialDisposals=0,geometryDisposals=0,instanceDisposals=0;material.addEventListener('dispose',()=>materialDisposals++);a.geometry.addEventListener('dispose',()=>geometryDisposals++);
 batchRoadDecoration(r,p);const mesh=p.children[0];mesh.addEventListener('dispose',()=>instanceDisposals++);assert.ok(r.resources.has(mesh));assert.ok(r.resources.has(mesh.geometry));assert.ok(r.resources.has(a.geometry));assert.equal(geometryDisposals,0);
 for(const res of r.resources)if(res!==material)res.dispose();assert.equal(instanceDisposals,1);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,0);material.dispose();assert.equal(materialDisposals,1);
});

test('city rounded primitives are instanced by shape and color with correct dimensions',()=>{
 const r=renderer(),b=cityBatch(r,r.worldRoot);b.box(0,0,0,4,5,6,'#fff');b.ellipsoid(10,20,30,32,30,24,'#fff');b.ellipsoid(40,20,30,20,18,26,'#fff');b.cylinder(5,50,6,4,100,4,'#fff');assert.equal(b.flush(),3);
 const meshes=r.worldRoot.children;assert.equal(new Set(meshes.map(m=>m.material)).size,1);const sphere=meshes.find(m=>m.userData.cityShape==='ellipsoid'),cylinder=meshes.find(m=>m.userData.cityShape==='cylinder');assert.equal(sphere.count,2);assert.equal(sphere.geometry.type,'SphereGeometry');assert.equal(cylinder.geometry.type,'CylinderGeometry');const matrix=new THREE.Matrix4();sphere.getMatrixAt(0,matrix);const scale=new THREE.Vector3().setFromMatrixScale(matrix);assert.deepEqual(scale.toArray(),[32,30,24]);assert.equal(matrix.elements[12],10);assert.equal(matrix.elements[13],20);assert.equal(matrix.elements[14],30);for(const resource of r.resources)resource.dispose();
});

test('Metropole batches decorative road draws without mutating physical scenery, road data or camera shells',()=>{
 const g=load(),w=new g.KartWorld({track:g.CityTracks.get('@city-skyway')}),r=renderer(),before=JSON.stringify(w.arena.track),city=JSON.stringify(w.arena.city),state=w.rng.state;globalThis.KartTrack=g.KartTrack;
 try{drawTrackDecks(r,w.arena.track);assert.ok(r.roadBatchStats.batched>500);assert.ok(r.roadBatchStats.draws<15);const shells=[];r.worldRoot.traverse(m=>{if(m.userData.cameraSolid)shells.push(m);});assert.ok(shells.length>60);assert.ok(shells.every(m=>!m.isInstancedMesh&&!m.userData.roadBatch));const result=drawCity(r,w.arena.track,{buildings:w.arena.buildings,fixtures:w.arena.fixtures});assert.equal(result.buildings,w.arena.buildings.length);assert.ok(r.worldRoot.children.filter(m=>m.userData.cityInstances).length<30);assert.equal(JSON.stringify(w.arena.track),before);assert.equal(JSON.stringify(w.arena.city),city);assert.equal(w.rng.state,state);}finally{delete globalThis.KartTrack;for(const resource of r.resources)resource.dispose();}
});
