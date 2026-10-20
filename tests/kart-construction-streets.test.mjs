import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as THREE from '../gp/vendor/three.module.js';
import {constructionRoute,constructionFrame,constructionCameraDistance,drawConstructionPreview} from '../kart/construction-view.js';
import {TrackPieces} from '../kart/track-pieces.js';
import {TrackBuilderView} from '../kart/track-builder-view.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
const draft=()=>({schema:'kart-track-v2',name:'My street',width:160,closed:false,points:TrackPieces.append([],{length:480})});

test('construction reserves both the committed road and its next curve, without changing the draft or preview',()=>{
 const g=load(),track=draft(),next=TrackPieces.append(track.points,{kind:'right',radius:180,angle:90}),preview=next.slice(track.points.length-1),before=JSON.stringify({track,preview}),planned=constructionRoute(track,preview);
 assert.equal(JSON.stringify(planned.points),JSON.stringify(next));assert.equal(JSON.stringify({track,preview}),before);
 const buildings=g.CityLayout.plan(planned).buildings;
 assert.ok(buildings.some(b=>b.frontage?.side===-1));assert.ok(buildings.some(b=>b.frontage?.side===1));
 for(const b of buildings)assert.ok(g.CityLayout.clear(planned,b,Math.hypot(b.w,b.d)/2,36),'a building intersects the proposed street');
 assert.ok(g.CityLayout.plan(track).buildings.some(b=>!g.CityLayout.clear(planned,b,Math.hypot(b.w,b.d)/2,36)),'fixture reproduces the old preview through buildings');
 planned.points[0].x++;assert.notEqual(planned.points[0].x,track.points[0].x);
});

test('bridges and tunnels reserve their whole projection; committing yields the same city layout',()=>{
 const g=load();for(const options of [{kind:'bridge',ramp:200,span:120,bridgeHeight:80},{kind:'tunnel',length:240}]){
  const track=draft(),next=TrackPieces.append(track.points,options),preview=next.slice(track.points.length-1),planned=constructionRoute(track,preview),committed={...track,points:next};
  assert.equal(JSON.stringify(g.CityLayout.plan(planned)),JSON.stringify(g.CityLayout.plan(committed)));
  for(const b of g.CityLayout.plan(planned).buildings)assert.ok(g.CityLayout.clear(planned,b,Math.hypot(b.w,b.d)/2,36));
 }
});

test('closed or unrelated previews never append to a route, and an empty draft remains untouched',()=>{
 const track=draft(),preview=TrackPieces.append([],{length:240}),closed={...track,closed:true};
 assert.equal(JSON.stringify(constructionRoute(closed,preview)),JSON.stringify(closed));
 assert.equal(JSON.stringify(constructionRoute(track,[{x:30,y:40}, {x:60,y:40}])),JSON.stringify(track));
 const empty={...track,points:[]};assert.equal(constructionRoute(empty,preview).points.length,2);assert.equal(empty.points.length,0);
 assert.equal(constructionRoute(track,null).points.length,track.points.length);
});

test('full-width preview matches the road offsets and elevation, with shared material across rebuilds',()=>{
 const g=load();globalThis.KartTrack=g.KartTrack;
 try{const track=draft(),next=TrackPieces.append(track.points,{kind:'bridge',ramp:200,span:120,bridgeHeight:80}),preview=next.slice(track.points.length-1),r={worldRoot:new THREE.Group(),resources:new Set(),materials:new Map()};
  drawConstructionPreview(r,track,preview);const mesh=r.worldRoot.children[0],positions=mesh.geometry.getAttribute('position');
  assert.equal(positions.count,18);assert.ok(mesh.userData.constructionPreview);assert.equal(mesh.material.depthWrite,false);
  assert.equal(Math.abs(positions.getZ(0)-positions.getZ(1)),track.width);assert.equal(positions.getY(2),83);
  drawConstructionPreview(r,track,preview);assert.equal(r.worldRoot.children[1].material,mesh.material);assert.equal(r.materials.size,1);
  for(const resource of r.resources)resource.dispose();for(const m of r.materials.values())m.dispose();
 }finally{delete globalThis.KartTrack;}
});

test('street framing looks along the selected road and overview frames personal geometry rather than the city grid',()=>{
 const track=draft(),copy=JSON.stringify(track),street=constructionFrame(track,1.5,true,0),overview=constructionFrame(track,1.5),portrait=constructionFrame(track,.4);
 assert.equal(street.x,540);assert.equal(street.z,700);assert.equal(street.angle,Math.PI);assert.ok(street.pitch<.5);assert.ok(street.distance<=1000);
 assert.equal(overview.x,540);assert.ok(overview.distance<2100);assert.ok(portrait.distance>overview.distance);assert.equal(JSON.stringify(track),copy);
 for(const frame of [constructionFrame({...track,points:[]}),constructionFrame({...track,points:track.points.slice(0,1)},0,true),constructionFrame(track,1,true,500)])for(const value of Object.values(frame))assert.ok(Number.isFinite(value));
});

test('rebuilding an edited street releases previous grid and preview resources but retains cached materials',()=>{
 const view=Object.create(TrackBuilderView.prototype),gridMaterial=new THREE.LineBasicMaterial(),sharedMaterial=new THREE.MeshBasicMaterial(),geometry=new THREE.BufferGeometry();let releasedGrid=0,releasedShared=0,releasedGeometry=0;
 gridMaterial.addEventListener('dispose',()=>releasedGrid++);sharedMaterial.addEventListener('dispose',()=>releasedShared++);geometry.addEventListener('dispose',()=>releasedGeometry++);
 view.materials=new Map([['preview',sharedMaterial]]);view.resources=new Set([gridMaterial,sharedMaterial,geometry]);view.releaseScene();
 assert.equal(releasedGrid,1);assert.equal(releasedGeometry,1);assert.equal(releasedShared,0);assert.deepEqual([...view.resources],[sharedMaterial]);
 view.releaseScene();assert.equal(releasedGrid,1);sharedMaterial.dispose();
});

test('street camera shortens before a facade, ignores buildings beside or below its sightline',()=>{
 const frame={x:500,y:18,z:700,angle:Math.PI,pitch:.4,distance:600},building={x:200,y:700,w:100,d:100,height:200},before=JSON.stringify(frame),distance=constructionCameraDistance(frame,[building]);
 assert.ok(distance<300&&distance>24);const eyeX=frame.x+Math.cos(frame.angle)*Math.cos(frame.pitch)*distance;assert.ok(eyeX>building.x+building.w/2+12);
 assert.equal(constructionCameraDistance(frame,[{...building,y:1000}]),600);assert.equal(constructionCameraDistance({...frame,y:300},[building]),600);assert.equal(JSON.stringify(frame),before);
});
