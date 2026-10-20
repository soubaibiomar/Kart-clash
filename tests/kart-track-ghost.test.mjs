import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as THREE from '../gp/vendor/three.module.js';
import {TrackGhostRecording,validateTrackGhost,readTrackGhosts,trackGhostPose,GHOST_LIMIT} from '../kart/track-ghost.js';
import {TrackRunTiming} from '../kart/track-timing.js';
import {timingResultHtml} from '../kart/track-timing-view.js';
import {KartRenderer} from '../kart/renderer.js';
import {setTrackGhost,clearTrackGhost,updateTrackGhost} from '../kart/track-ghost-view.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
const record=()=>({schema:'kart-track-ghost-v1',key:'fixture',time:1,frames:[[0,300,700,0,Math.PI-.1,0,0],[1,500,700,120,-Math.PI+.1,.2,.1]]});
function world(){const g=load(),w=new g.KartWorld({track:g.KartTrack.example(),bots:0});return {g,w};}
function complete(t,w,step=1){for(let i=1;i<=t.count;i++){w.time=i*step;w.player.pos.x+=2;w.player.trackState.passed=i;w.player.trackState.finished=i===t.count;t.crossing(w,w.player);t.sample(w);}}

test('capture is bounded, detached, sampled by simulated time and includes the exact final pose',()=>{
 const {w}=world(),k=w.player,r=new TrackGhostRecording(k);for(let i=1;i<=61;i++){k.pos.x=300+i;r.capture(i/60,k,i===61);}assert.equal(r.frames.length,12);const exported=r.export('fixture',61/60);assert.ok(exported);assert.equal(exported.frames.at(-1)[0],61/60);const first=exported.frames[0][1];k.pos.x=900;r.frames[0][1]=1;assert.equal(exported.frames[0][1],first);
 const bounded=new TrackGhostRecording(k);for(let i=1;i<=10800;i++)bounded.capture(i/60,k);assert.ok(bounded.frames.length<=GHOST_LIMIT);assert.equal(bounded.frames.at(-1)[0],180);assert.ok(bounded.export('fixture',180));
 const t=new TrackRunTiming(w);w.phase='playing';w.time=.5;w.paused=true;t.sample(w);assert.equal(t.recording.frames.length,1);w.paused=false;t.sample(w);assert.equal(t.recording.frames.length,2);w.phase='countdown';w.time=1;t.sample(w);assert.equal(t.recording.frames.length,2);
});

test('ghost validation rejects oversized, unordered, nonfinite, incomplete and out-of-bounds replays',()=>{
 const r=record(),copy=validateTrackGhost(r);r.frames[0][1]=0;assert.equal(copy.frames[0][1],300);
 for(const change of [v=>v.time=181,v=>v.frames[0][0]=.1,v=>v.frames[1][0]=.9,v=>v.frames[1][1]=NaN,v=>v.frames[0][1]=3000,v=>v.frames[0][3]=999,v=>v.frames[0][5]=Infinity,v=>v.key='a'.repeat(30001),v=>v.frames=Array.from({length:GHOST_LIMIT+1},()=>[0,300,700,0,0,0,0])]){const v=record();change(v);assert.throws(()=>validateTrackGhost(v));}
 assert.deepEqual(readTrackGhosts(()=>[null,record(),{schema:'old'}]).map(v=>v.key),['fixture']);assert.deepEqual(readTrackGhosts(()=>{throw Error('Storage blocked');}),[]);assert.equal(readTrackGhosts(()=>Array.from({length:10},record)).length,3);
});

test('playback interpolates measured height/slope and the shortest angle without extrapolation or mutation',()=>{
 const r=record(),before=JSON.stringify(r),pose=trackGhostPose(r,.5);assert.equal(pose.x,400);assert.equal(pose.elevation,60);assert.ok(Math.abs(pose.heading-Math.PI)<1e-9);assert.equal(pose.slopeVector.x,.1);assert.equal(pose.slopeVector.y,.05);
 assert.equal(trackGhostPose(r,0).x,300);assert.equal(trackGhostPose(r,1).x,500);for(const t of [-1,1.001,NaN,Infinity])assert.equal(trackGhostPose(r,t),null);assert.equal(trackGhostPose(null,0),null);assert.equal(JSON.stringify(r),before);assert.deepEqual(trackGhostPose(r,.5),pose);assert.equal(trackGhostPose(r,.1).x,320);
});

test('GhostKart inherits Vehicle and only applies presentation snapshots outside every simulation collection',()=>{
 const {g,w}=world(),ghost=new g.GhostKart(),before=JSON.stringify({pos:w.player.pos,vel:w.player.vel,acc:w.player.acc,rng:w.rng.state}),update=g.Vehicle.prototype.update;let updates=0;g.Vehicle.prototype.update=function(){updates++;return update.call(this);};
 assert.ok(ghost instanceof g.Kart);assert.ok(ghost instanceof g.Vehicle);ghost.present(trackGhostPose(record(),.5));assert.equal(ghost.pos.x,400);assert.equal(ghost.elevation,60);assert.equal(ghost.maxForce,0);assert.equal(ghost.vel.mag(),0);assert.equal(updates,0);assert.ok(!w.karts.includes(ghost));assert.ok(!w.arena.solids.includes(ghost));ghost.present(null);assert.equal(ghost.playbackVisible,false);assert.equal(JSON.stringify({pos:w.player.pos,vel:w.player.vel,acc:w.player.acc,rng:w.rng.state}),before);
});

test('only a matching complete record supplies a ghost; old timing records and a failed ghost save stay valid',()=>{
 const {w}=world();let records=[],ghosts=[];const store={read:()=>records,write:r=>{records=r;return true;},readGhosts:()=>ghosts,writeGhosts:r=>{ghosts=r;return true;}};let t=new TrackRunTiming(w,store);w.phase='playing';complete(t,w);assert.equal(t.commit().ghostSaved,true);assert.equal(ghosts.length,1);assert.equal(ghosts[0].time,records[0].time);
 const next=world().w;assert.ok(new TrackRunTiming(next,store).ghostReference);ghosts[0].time+=1;ghosts[0].frames.at(-1)[0]+=1;assert.equal(new TrackRunTiming(next,store).ghostReference,null);ghosts=[];assert.ok(new TrackRunTiming(next,store).reference);assert.equal(new TrackRunTiming(next,store).ghostReference,null);
 const oldBest=records[0].time;t=new TrackRunTiming(next,{...store,writeGhosts:()=>{throw Error('Quota');}});next.phase='playing';complete(t,next,.5);const result=t.commit();assert.equal(result.saved,true);assert.equal(result.ghostSaved,false);assert.ok(records[0].time<oldBest);assert.match(timingResultHtml(t,next),/temps reste enregistré/);assert.doesNotMatch(timingResultHtml(t,next),/Fantôme enregistré/);
});

test('ghost history keeps at most three different circuits and cannot change the current run reference',()=>{
 const {w}=world();let records=[],ghosts=['a','b','c'].map(key=>({...record(),key}));const t=new TrackRunTiming(w,{read:()=>records,write:r=>{records=r;return true;},readGhosts:()=>ghosts,writeGhosts:r=>{ghosts=r;return true;}});w.phase='playing';complete(t,w);t.commit();assert.equal(ghosts.length,3);assert.equal(ghosts[0].key,t.key);assert.equal(ghosts[1].key,'a');assert.equal(t.ghostReference,null);
 const incomplete=new TrackRunTiming(world().w,{write:()=>{throw Error('Must not write');},writeGhosts:()=>{throw Error('Must not write');}});assert.equal(incomplete.commit().status,'incomplete');
});

test('translucent replay respects occlusion, overlap, pause, visibility and renderer resource ownership',()=>{
 const {g,w}=world(),r=Object.create(KartRenderer.prototype);Object.assign(r,{scene:new THREE.Scene(),resources:new Set(),geometryCache:new Map(),materials:new Map()});const entity=new g.GhostKart(),rec=record();setTrackGhost(r,entity,rec);const ghost=r.ghost,material=ghost.material;let disposed=0;material.addEventListener('dispose',()=>disposed++);assert.equal(material.depthTest,true);assert.equal(material.depthWrite,false);assert.equal(material.opacity,.32);assert.equal(ghost.model.ring.visible,false);ghost.model.root.traverse(o=>{if(o.isMesh){assert.equal(o.material,material);assert.equal(o.castShadow,false);}});
 w.phase='playing';w.time=.5;w.player.pos.set(900,700);updateTrackGhost(r,w);assert.equal(ghost.model.root.visible,true);assert.equal(ghost.model.root.position.x,400);assert.equal(ghost.model.root.position.y,60);const before=ghost.model.root.position.clone();w.paused=true;updateTrackGhost(r,w);assert.equal(ghost.model.root.position.distanceTo(before),0);ghost.enabled=false;updateTrackGhost(r,w);assert.equal(ghost.model.root.visible,false);ghost.enabled=true;w.player.pos.set(355,700);w.player.elevation=60;updateTrackGhost(r,w);assert.equal(ghost.model.root.visible,true);w.player.pos.x=355.01;updateTrackGhost(r,w);assert.equal(ghost.model.root.visible,false);w.player.pos.set(400,700);w.player.elevation=60;updateTrackGhost(r,w);assert.equal(ghost.model.root.visible,false);w.time=1.01;updateTrackGhost(r,w);assert.equal(ghost.model.root.visible,false);
 const cached=[...r.geometryCache.values()];clearTrackGhost(r);assert.equal(disposed,1);assert.equal(ghost.model.root.parent,null);assert.ok(!r.resources.has(material));assert.equal(r.ghost,null);assert.ok(cached.every(geometry=>r.resources.has(geometry)));clearTrackGhost(r);assert.equal(disposed,1);for(const resource of r.resources)resource.dispose();
});

test('recording all real physics ticks produces an exact last pose without adding forces or Vehicle updates',()=>{
 const g=load(),track=g.KartTrack.example(),a=new g.KartWorld({track,bots:0,seed:4}),b=new g.KartWorld({track,bots:0,seed:4}),t=new TrackRunTiming(b);b.trackTrial.timing=t;for(const w of [a,b]){w.phase='playing';w.countdown=0;w.player.plan=g.BotKart.prototype.plan;}
 for(let i=0;i<2400&&a.phase!=='finished';i++){for(const w of [a,b]){w.trackTrial.assign(w);w.playerAction=w.player.plan(w);w.step();}assert.equal(JSON.stringify(a.player.motionSample),JSON.stringify(b.player.motionSample));}
 assert.equal(a.phase,'finished');assert.equal(b.time,a.time);assert.equal(b.rng.state,a.rng.state);const ghost=t.recording.export(t.key,t.finalTime);assert.ok(ghost);const pose=trackGhostPose(ghost,b.time);assert.equal(pose.x,b.player.pos.x);assert.equal(pose.y,b.player.pos.y);assert.ok(ghost.frames.length<b.tick/4);assert.ok(ghost.frames.length<=GHOST_LIMIT);
});
