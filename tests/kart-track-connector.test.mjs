import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as THREE from '../gp/vendor/three.module.js';
import {TrackConnector} from '../kart/track-connector.js';
import {TrackEditor} from '../kart/track-editor.js';
import {drawConstructionPreview} from '../kart/construction-view.js';
const require=createRequire(import.meta.url),{load}=require('../kart/node-world.cjs'),{evaluate}=require('../kart/academy/evaluate.cjs');
const draft=()=>({schema:'kart-track-v2',name:'Smooth fixture',width:160,closed:false,points:[[600,400],[1200,400],[1200,900],[900,900]].map(([x,y])=>({x,y,elevation:0,kind:'road'}))});
function context(fn){const g=load();globalThis.KartTrack=g.KartTrack;try{return fn(g);}finally{delete globalThis.KartTrack;}}

test('connector preserves the draft and exact entry/exit tangents, with no duplicate finish point',()=>context(g=>{
 const data=draft(),before=JSON.stringify(data),result=TrackConnector.close(data,400),p=result.track.points,n=data.points.length;
 assert.equal(JSON.stringify(data),before);assert.equal(result.track.closed,true);assert.ok(result.added>2);assert.ok(result.length>Math.hypot(300,500));
 assert.equal(p[n].y,p[n-1].y);assert.ok(p[n].x<p[n-1].x);assert.equal(p.at(-1).y,p[0].y);assert.ok(p.at(-1).x<p[0].x);
 assert.ok(Math.hypot(p.at(-1).x-p[0].x,p.at(-1).y-p[0].y)>=8);assert.equal(g.KartTrack.validate(result.track).points.length,p.length);
 result.preview[0].x++;assert.notEqual(result.preview[0].x,p[n-1].x);assert.deepEqual(g.KartTrack.validate(JSON.parse(JSON.stringify(result.track))),result.track);
}));

test('invalid reach, tight bends, terrain, duplicates and point budgets fail atomically',()=>context(()=>{
 const data=draft(),before=JSON.stringify(data);for(const reach of [NaN,79,701,Infinity,80])assert.throws(()=>TrackConnector.close(data,reach));
 assert.throws(()=>TrackConnector.close({...data,closed:true},400),/déjà/);assert.throws(()=>TrackConnector.close({...data,points:data.points.slice(0,2)},400),/trois/);
 assert.throws(()=>TrackConnector.close({...data,points:[...data.points,{...data.points[0]}]},400),/jointes/);
 const edge={...data,points:data.points.map(p=>({...p,x:p.x-430}))};assert.throws(()=>TrackConnector.close(edge,700),/zone/);
 const full={...data,points:[...Array.from({length:237},(_,i)=>({x:600+i*2,y:400,elevation:0,kind:'road'})),...data.points.slice(1)]};assert.throws(()=>TrackConnector.close(full,400),/240/);
 assert.equal(JSON.stringify(data),before);
}));

test('height joins use bridge entities and retain slope, crossing and radius validation',()=>context(g=>{
 const data=draft();data.points[2].elevation=120;data.points[3].elevation=120;const r=TrackConnector.close(data,400);
 assert.equal(r.track.points[3].kind,'bridge');assert.ok(r.track.points.slice(4).every(p=>p.kind==='bridge'&&p.elevation>=0&&p.elevation<=120));
 for(let i=3;i<r.track.points.length;i++){const a=r.track.points[i],b=r.track.points[(i+1)%r.track.points.length];assert.ok(Math.abs(a.elevation-b.elevation)<=Math.hypot(a.x-b.x,a.y-b.y)*.5+1e-6);}
 const crossed=draft();crossed.points.splice(1,0,{x:600,y:1100,elevation:0,kind:'road'},{x:300,y:600,elevation:0,kind:'road'});assert.throws(()=>TrackConnector.close(crossed,400),/Croisement/);
 const world=new g.KartWorld({track:r.track,bots:0});assert.ok(world.arena.decks.every(e=>e instanceof g.Vehicle));
}));

test('closed preview draws the final segment and reserves identical city plots before and after commit',()=>context(g=>{
 const data=draft(),r=TrackConnector.close(data,400),before=JSON.stringify(data),renderer={worldRoot:new THREE.Group(),resources:new Set(),materials:new Map()};
 drawConstructionPreview(renderer,data,r.preview,r.track);const mesh=renderer.worldRoot.children[0],position=mesh.geometry.getAttribute('position');
 assert.equal(position.count,(r.added+1)*6);const end=g.KartTrack.offset(r.track,0,-1);assert.ok(Math.abs(position.getX(position.count-4)-end.x)<.001);
 assert.equal(JSON.stringify(data),before);for(const b of g.CityLayout.plan(r.track).buildings)assert.ok(g.CityLayout.clear(r.track,b,Math.hypot(b.w,b.d)/2,36));
 for(const resource of renderer.resources)resource.dispose();for(const material of renderer.materials.values())material.dispose();
}));

test('editor commits a freshly validated connector once, supports undo/redo and leaves invalid drafts intact',()=>context(()=>{
 const e=Object.create(TrackEditor.prototype),fields=new Map();e.get=id=>{if(!fields.has(id))fields.set(id,{});return fields.get(id);};e.render=()=>{};e.data=draft();e.joinReach=400;e.history=[];e.future=[];const original=JSON.stringify(e.data);
 e.commitJoin();const joined=JSON.stringify(e.data);assert.equal(e.data.closed,true);assert.equal(e.joinMode,false);assert.equal(e.history.length,1);e.undo();assert.equal(JSON.stringify(e.data),original);e.redo();assert.equal(JSON.stringify(e.data),joined);
 e.undo();e.joinReach=80;e.commitJoin();assert.equal(JSON.stringify(e.data),original);assert.equal(e.history.length,0);assert.match(e.get('join-note').textContent,/serré/);
}));

test('the reach control changes the actual preview and invalid or closed joins clear stale geometry',()=>context(()=>{
 const e=Object.create(TrackEditor.prototype),fields=new Map();e.get=id=>{if(!fields.has(id))fields.set(id,{tagName:'BUTTON',setAttribute(k,v){this[k]=v;}});return fields.get(id);};e.data=draft();e.joinMode=true;e.joinReach=400;e.refreshJoin();const length=e.joinResult.length,preview=JSON.stringify(e.piecePreview);e.joinReach=700;e.refreshJoin();assert.ok(e.joinResult.length>length);assert.notEqual(JSON.stringify(e.piecePreview),preview);assert.equal(e.get('piece-add').disabled,true);
 e.joinReach=80;e.refreshJoin();assert.equal(e.joinResult,null);assert.equal(e.piecePreview,null);assert.equal(e.get('join-apply').disabled,true);assert.match(e.get('join-note').textContent,/serré/);e.data.closed=true;e.refreshJoin();assert.equal(e.joinMode,false);assert.equal(e.get('join-toggle').disabled,true);assert.equal(e.get('join-controls').hidden,true);
}));

test('a connected loop is driven by shared Vehicle physics, deterministically and with bounded forces',()=>context(g=>{
 const track=TrackConnector.close(draft(),400).track,options={track,steps:3600,seed:9},a=evaluate(null,options),b=evaluate(null,options);
 assert.equal(a.metrics.laps,1);assert.equal(JSON.stringify(a),JSON.stringify(b));const w=new g.KartWorld({track,bots:0});w.phase='playing';for(let i=0;i<100;i++){w.playerAction={throttle:1,turn:.2,fire:false};w.step();const m=w.player.motionSample;assert.ok(Math.hypot(m.force.x,m.force.y)<=m.maxForce+1e-9);assert.ok(w.player.vel.mag()<=w.player.maxSpeed+1e-9);}
}));
