import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as THREE from '../gp/vendor/three.module.js';
import {surfaceTexture,daylightPixels} from '../kart/daylight.js';
import {urbanMaterial} from '../kart/city-art.js';
import {createSkidTrails,updateSkidTrails} from '../kart/skid-trails.js';
import {raceGuideState} from '../kart/race-guide.js';
import {KartRenderer} from '../kart/renderer.js';
import {driveSound} from '../kart/drive-sound.js';
import {roadCurb} from '../kart/track-geometry.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');

test('daylight and micro surface maps are deterministic, finite, bounded and separately owned',()=>{
 const a=daylightPixels(),b=daylightPixels();assert.equal(a.length,128*64*4);assert.deepEqual(a,b);assert.ok(a.some((n,i)=>i%4===0&&n!==a[0]));
 const asphalt=surfaceTexture(true),brick=surfaceTexture(false),again=surfaceTexture(true);assert.equal(asphalt.image.data.length,128*128*4);assert.deepEqual(asphalt.image.data,again.image.data);assert.notDeepEqual(asphalt.image.data,brick.image.data);assert.notEqual(asphalt,again);assert.equal(asphalt.wrapS,THREE.RepeatWrapping);for(const texture of [asphalt,brick,again])texture.dispose();
});

test('cached urban material owns and releases albedo and relief exactly once',()=>{
 const r={materials:new Map(),resources:new Set()},m=urbanMaterial(r,'#474d50',true);assert.ok(m.map&&m.bumpMap);assert.notEqual(m.map,m.bumpMap);assert.equal(m.map.colorSpace,THREE.SRGBColorSpace);assert.equal(m.bumpMap.colorSpace,THREE.NoColorSpace);assert.equal(urbanMaterial(r,'#474d50',true),m);let maps=0;m.map.addEventListener('dispose',()=>maps++);m.bumpMap.addEventListener('dispose',()=>maps++);m.dispose();assert.equal(maps,2);
 const glass=urbanMaterial(r,'#39505c');assert.ok(glass.roughness<.3);const brick=urbanMaterial(r,'#9c5948');assert.ok(brick.bumpMap);glass.dispose();brick.dispose();
});

test('varnished paint, metal hubs and brake fixtures decorate a Vehicle without changing its physics',()=>{
 const g=load(),w=new g.KartWorld({bots:0}),r=Object.create(KartRenderer.prototype);Object.assign(r,{materials:new Map(),geometryCache:new Map(),resources:new Set()});const before=JSON.stringify({pos:w.player.pos,vel:w.player.vel,force:w.player.maxForce,rng:w.rng.state}),model=r.kart(w.player);
 assert.equal(model.brakes.length,2);assert.ok(r.paint(w.player.color).isMeshPhysicalMaterial);assert.equal(r.paint(w.player.color).clearcoat,1);assert.equal(r.paint(w.player.color),r.paint(w.player.color));assert.equal(model.wheels[0].hub.material.metalness,.85);assert.equal(JSON.stringify({pos:w.player.pos,vel:w.player.vel,force:w.player.maxForce,rng:w.rng.state}),before);for(const resource of r.resources)resource.dispose();
});

test('rubber traces sample actual motion once per tick, remain capped and expire on simulated time',()=>{
 const g=load(),w=new g.KartWorld({bots:0}),r={worldRoot:new THREE.Group(),resources:new Set()},trail=createSkidTrails(r),k=w.player;w.phase='playing';k.pos.set(300,700);k.heading=0;k.drifting=true;updateSkidTrails(trail,w);
 for(let i=1;i<=300;i++){w.tick=i;w.time=i/60;k.pos.x+=2;updateSkidTrails(trail,w);}assert.equal(trail.slots.filter(t=>t!==null).length,256);assert.equal(trail.geometry.attributes.position.count,256*12);assert.equal(r.worldRoot.children.length,1);
 const before=trail.positions.slice(),cursor=trail.cursor,rng=w.rng.state;updateSkidTrails(trail,w);assert.deepEqual(trail.positions,before);assert.equal(trail.cursor,cursor);assert.equal(w.rng.state,rng);w.paused=true;w.tick++;k.pos.x+=2;updateSkidTrails(trail,w);assert.equal(trail.cursor,cursor);
 w.paused=false;k.drifting=false;w.time+=12;w.tick++;updateSkidTrails(trail,w);assert.equal(trail.slots.filter(t=>t!==null).length,0);assert.ok(trail.positions.every(n=>n===0));for(const resource of r.resources)resource.dispose();
});

test('rubber traces skip respawns, teleport gaps, floor changes and reduced motion',()=>{
 const g=load(),w=new g.KartWorld({bots:0}),r={worldRoot:new THREE.Group(),resources:new Set()},trail=createSkidTrails(r),k=w.player;w.phase='playing';k.drifting=true;k.pos.set(300,700);updateSkidTrails(trail,w);
 for(const change of [()=>k.spawnSerial++,()=>k.pos.x+=100,()=>k.elevation=140]){w.tick++;w.time+=1/60;change();updateSkidTrails(trail,w);assert.equal(trail.cursor,0);}
 w.tick++;k.pos.x+=2;updateSkidTrails(trail,w,true);assert.equal(trail.cursor,0);for(const resource of r.resources)resource.dispose();
});

test('pickup compass chooses only a ready crate and disappears when armed, dead or in a track trial',()=>{
 const g=load(),w=new g.KartWorld({bots:0});w.player.pos.set(200,200);w.player.heading=0;w.player.item=null;w.arena.pickups=[new g.WeaponCrate('near',210,200),new g.WeaponCrate('north',200,240)];w.arena.pickups[0].readyAt=5;
 const before=w.rng.state,s=raceGuideState(w);assert.equal(s.goal.distance,40);assert.equal(s.goal.angle,Math.PI/2);assert.equal(s.speed,0);w.time=5;assert.equal(raceGuideState(w).goal.distance,10);w.player.equip('rocket');assert.equal(raceGuideState(w).goal,null);w.player.ammo=0;assert.ok(raceGuideState(w).goal);w.player.alive=false;assert.equal(raceGuideState(w).goal,null);assert.equal(w.rng.state,before);const track=new g.KartWorld({track:g.KartTrack.example3D()});assert.equal(raceGuideState(track).goal,null);
});

test('tactical map never reveals an opponent hidden by cover, out of range or eliminated',()=>{
 const g=load(),w=new g.KartWorld({bots:1}),k=w.karts[1];w.player.pos.set(100,100);k.pos.set(200,100);assert.equal(raceGuideState(w).opponents.length,1);w.arena.clear=()=>false;assert.equal(raceGuideState(w).opponents.length,0);w.arena.clear=()=>true;k.pos.x=751;assert.equal(raceGuideState(w).opponents.length,0);k.pos.x=200;k.alive=false;assert.equal(raceGuideState(w).opponents.length,0);
});

test('engine and tyre layers follow measured driving and silence on pause, death and disabled audio',()=>{
 const k={vel:{mag:()=>4.8},alive:true,drifting:false,lastAction:{throttle:1}},before=JSON.stringify(k),normal=driveSound(k,true);assert.ok(normal.gain>0&&normal.undertoneGain>0);assert.equal(normal.skidGain,0);k.drifting=true;assert.ok(driveSound(k,true).skidGain>0);
 for(const s of [driveSound(k,false),driveSound(k,true,false),driveSound({...k,alive:false},true)]){assert.equal(s.gain,0);assert.equal(s.skidGain,0);assert.equal(s.undertoneGain,0);}
 k.drifting=false;assert.equal(JSON.stringify(k),before);assert.ok(driveSound({...k,vel:{mag:()=>0}},true).frequency<normal.frequency);
});

test('curb footprints share exact corner endpoints across curved roads and retain their 14-unit height',()=>{
 const g=load();globalThis.KartTrack=g.KartTrack;
 try{const track=g.CityTracks.get();for(const side of [-1,1])for(let i=0;i<track.points.length;i++){const a=roadCurb(track,i,side),b=roadCurb(track,(i+1)%track.points.length,side),corners=a.parameters.curb,next=b.parameters.curb;assert.equal(JSON.stringify(corners[1]),JSON.stringify(next[0]));assert.equal(JSON.stringify(corners[2]),JSON.stringify(next[3]));const p=a.attributes.position;for(let j=0;j<4;j++)assert.ok(Math.abs(p.getY(j+4)-p.getY(j)-14)<1e-4);assert.equal(a.attributes.uv.count,8);a.dispose();b.dispose();}}finally{delete globalThis.KartTrack;}
});
