import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as THREE from '../gp/vendor/three.module.js';
import {cameraModes,raceCameraSettings,nextCameraMode,raceCameraPose,clipRaceCamera,updateRaceCamera,markerOccludesCamera} from '../kart/race-camera.js';
import {KartRenderer} from '../kart/renderer.js';
import {KartInput} from '../kart/inspection.js';
import {drawTrackDecks} from '../kart/track-geometry.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
function fixture(){const g=load(),w=new g.KartWorld({bots:0});w.arena.solids=[];w.player.pos.set(900,700);w.player.heading=0;w.player.vel.set(4.8,0);const r={camera:new THREE.PerspectiveCamera(54,1.5,2,5000),target:new THREE.Vector3(),cameraSerial:-1};return {g,w,k:w.player,r};}
function shell(track,g){globalThis.KartTrack=g.KartTrack;const r={resources:new Set(),materials:new Map(),worldRoot:new THREE.Group(),mesh(geometry,color,parent,x=0,y=0,z=0){this.resources.add(geometry);const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));this.resources.add(m.material);m.position.set(x,y,z);parent.add(m);return m;},box(parent,x,y,z,w,h,d,color){return this.mesh(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z);}};try{drawTrackDecks(r,track);r.worldRoot.updateMatrixWorld(true);const meshes=[];r.worldRoot.traverse(m=>{if(m.isMesh&&m.userData.cameraSolid)meshes.push(m);});return {meshes,release(){for(const v of r.resources)v.dispose();}};}finally{delete globalThis.KartTrack;}}

test('three view modes and both setting ranges affect actual camera poses and sanitize stored data',()=>{
 const {w,k,g}=fixture(),p=raceCameraPose(k,w),close=raceCameraPose(k,w,{mode:'close'}),high=raceCameraPose(k,w,{mode:'high'});assert.ok(close.position.y<p.position.y&&p.position.y<high.position.y);assert.ok(close.position.x>p.position.x&&p.position.x>high.position.x);
 for(const distance of [.75,1,1.5])assert.ok(Math.abs((k.pos.x-raceCameraPose(k,w,{distance}).position.x)/(k.pos.x-p.position.x)-distance)<1e-9);
 assert.deepEqual(raceCameraSettings({mode:'bad',distance:Infinity,response:NaN}),{mode:'chase',distance:1,response:1});assert.deepEqual(raceCameraSettings({distance:0,response:10}),{mode:'chase',distance:.75,response:2});
 const values=new Map(),stored=load({storage:{getItem:key=>values.get(key)||null,setItem:(key,v)=>values.set(key,v)}});stored.KartStorage.write('preferences',{cameraMode:'high',cameraDistance:1.5,cameraResponse:.5});const read=stored.KartStorage.preferences();assert.equal(read.cameraMode,'high');assert.equal(read.cameraDistance,1.5);assert.equal(read.cameraResponse,.5);stored.KartStorage.write('preferences',{cameraMode:'bad',cameraDistance:'bad',cameraResponse:null});assert.equal(stored.KartStorage.preferences().cameraDistance,1);
 assert.equal(nextCameraMode('chase'),'close');assert.equal(nextCameraMode('close'),'high');assert.equal(nextCameraMode('high'),'chase');assert.equal(Object.keys(cameraModes).length,3);
});

test('turn preview and reverse look remain read-only; reduced motion removes pace and turn effects',()=>{
 const {w,k}=fixture();k.turn=.8;const before=JSON.stringify({pos:k.pos,vel:k.vel,acc:k.acc,turn:k.turn,rng:w.rng.state,tick:w.tick});assert.ok(raceCameraPose(k,w).look.z>k.pos.y);k.turn=-.8;assert.ok(raceCameraPose(k,w).look.z<k.pos.y);k.turn=.8;assert.equal(JSON.stringify({pos:k.pos,vel:k.vel,acc:k.acc,turn:k.turn,rng:w.rng.state,tick:w.tick}),before);
 const fast=raceCameraPose(k,w,{},true);k.vel.set(0,0);assert.deepEqual(raceCameraPose(k,w,{},true),fast);k.vel.set(-2,0);assert.ok(raceCameraPose(k,w).look.x<k.pos.x);
});

test('clearance checks height as well as footprint, including oriented rails and solids on other levels',()=>{
 const {g,w,k}=fixture(),desired={x:600,y:150,z:700},block=new g.ArenaObstacle('wall',760,700,50,90,200);w.arena.solids=[block];const clipped=clipRaceCamera(k,desired,w.arena);assert.ok(clipped.x>block.pos.x+block.w/2+8);assert.ok(clipped.y<desired.y);assert.deepEqual(clipRaceCamera(k,clipped,w.arena),clipped);
 block.height=5;assert.deepEqual(clipRaceCamera(k,desired,w.arena),desired);block.height=100;block.elevation=300;assert.deepEqual(clipRaceCamera(k,desired,w.arena),desired);
 const rail=new g.TrackRail('rail',{x:760,y:650,elevation:30},{x:760,y:750,elevation:30});rail.height=130;w.arena.solids=[rail];assert.ok(clipRaceCamera(k,desired,w.arena).x>772);
});

test('real tunnel shell clips a stale high view, while its valid low view stays inside the roof',()=>{
 const {g,w,k,r}=fixture(),track=g.KartTrack.upgrade({schema:'kart-track-v1',name:'Tunnel fixture',width:160,closed:false,points:[{x:300,y:700},{x:600,y:700},{x:1200,y:700},{x:1500,y:700}]});track.points[1].kind='tunnel';const s=shell(track,g);
 try{assert.equal(s.meshes.length,6);w.arena.decks=[{}, {kind:'tunnel'}];k.surfaceIndex=1;r.cameraShells=s.meshes;r.cameraSerial=k.spawnSerial;r.camera.position.set(650,250,700);r.target.set(950,24,700);updateRaceCamera(r,w,0,{settings:{mode:'high'}});assert.ok(r.camera.position.y<94);for(let i=0;i<30;i++)updateRaceCamera(r,w,.016,{settings:{mode:'high'}});assert.ok(r.camera.position.y<66);assert.ok(r.camera.position.y>28);
 }finally{s.release();}
});

test('bridge underside blocks an upward camera ray using the same drawn deck geometry',()=>{
 const {g,w,k}=fixture(),track={schema:'kart-track-v2',name:'Upper deck',closed:false,width:200,points:[{x:500,y:700,elevation:160,kind:'bridge'},{x:1100,y:700,elevation:160,kind:'bridge'},{x:1500,y:700,elevation:160,kind:'bridge'}]},s=shell(track,g);
 try{const clipped=clipRaceCamera(k,{x:650,y:240,z:700},w.arena,s.meshes);assert.ok(clipped.y<148);assert.ok(clipped.y>28);assert.equal(s.meshes.length,2);}finally{s.release();}
});

test('response changes smoothing, pause freezes it, mode/reset snaps and camera work cannot change physics',()=>{
 const {g,w,k,r}=fixture(),start={x:300,y:100,z:700};const sample=response=>{r.cameraSerial=k.spawnSerial;r.camera.position.set(start.x,start.y,start.z);updateRaceCamera(r,w,.02,{settings:{response}});return r.camera.position.x;};assert.ok(sample(2)>sample(.5));const before=r.camera.position.clone();w.paused=true;updateRaceCamera(r,w,5);assert.ok(r.camera.position.distanceTo(before)<1e-9);w.paused=false;
 const original=g.Vehicle.prototype.update;let calls=0;g.Vehicle.prototype.update=function(){calls++;return original.call(this);};const state=JSON.stringify({pos:k.pos,vel:k.vel,acc:k.acc,rng:w.rng.state,tick:w.tick});for(let i=0;i<60;i++)updateRaceCamera(r,w,.016);assert.equal(calls,0);assert.equal(JSON.stringify({pos:k.pos,vel:k.vel,acc:k.acc,rng:w.rng.state,tick:w.tick}),state);
 const renderer=Object.create(KartRenderer.prototype);renderer.setCamera({mode:'close'});assert.equal(renderer.cameraSerial,-1);r.cameraSerial=-1;updateRaceCamera(r,w,.016,{settings:renderer.cameraSettings});assert.equal(r.camera.fov,raceCameraPose(k,w,renderer.cameraSettings).fov);assert.equal(r.cameraSerial,k.spawnSerial);
});

test('C switches exactly once while held and ignores text fields without stealing movement controls',()=>{
 let count=0;const input=new KartInput({reset:()=>count++,isPlaying:()=>true,isPaused:()=>false,toggleDebug(){},pause(){}}),event=(key,repeat=false,editing=false)=>({key,repeat,target:{closest:()=>editing},preventDefault(){}});input.keydown(event('c'));input.keydown(event('c',true));input.keydown(event('c',false,true));assert.equal(count,1);input.keydown(event('ArrowUp'));assert.equal(input.action().throttle,1);input.keyup(event('ArrowUp'));assert.equal(input.action().throttle,0);
});

test('only checkpoint posts actually between the camera and kart are hidden, respecting elevation',()=>{
 const {k}=fixture(),camera={x:1200,y:65,z:700},marker={pos:{x:1050,y:700},elevation:0},copy=JSON.stringify(marker);assert.equal(markerOccludesCamera(marker,k,camera),true);assert.equal(JSON.stringify(marker),copy);marker.pos.y=780;assert.equal(markerOccludesCamera(marker,k,camera),false);marker.pos.y=700;marker.pos.x=1300;assert.equal(markerOccludesCamera(marker,k,camera),false);marker.pos.x=1050;marker.elevation=160;assert.equal(markerOccludesCamera(marker,k,camera),false);
});
