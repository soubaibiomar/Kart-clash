import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{load}=require('../kart/node-world.cjs');
const {KartInput,KartDebug}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../kart/inspection.js',import.meta.url),'utf8')).toString('base64'));
function event(key,extra={}){return {key,repeat:false,target:{closest:()=>false},preventDefault(){},...extra};}
test('plain D toggles once, never steers, works paused, preserves typing and shortcuts',()=>{
 let enabled=false,paused=false,toggles=0;const input=new KartInput({toggleDebug:()=>{enabled=!enabled;toggles++;},pause:()=>paused=!paused,reset:()=>{},isPlaying:()=>true,isPaused:()=>paused});
 input.keydown(event('d'));input.keydown(event('d',{repeat:true}));assert.equal(enabled,true);assert.equal(toggles,1);assert.equal(input.action().turn,0);
 paused=true;input.keydown(event('D'));assert.equal(enabled,false);
 for(const e of [event('d',{ctrlKey:true}),event('d',{metaKey:true}),event('d',{altKey:true}),event('d',{target:{closest:()=>true}})])input.keydown(e);assert.equal(toggles,2);
 paused=false;input.keydown(event('ArrowRight'));assert.equal(input.action().turn,1);input.clear();assert.equal(input.action().turn,0);
});
test('cached sensor origins and actual applied forces remain exact after locomotion',()=>{
 const g=load(),w=new g.KartWorld({bots:1});w.phase='playing';w.playerAction={throttle:1,turn:.5,fire:false};w.step();const d=new KartDebug(),s=d.snapshot(w),k=w.player;
 assert.deepEqual(s.sample.force,{...k.motionSample.force});assert.ok(Math.hypot(s.sample.force.x,s.sample.force.y)<=k.maxForce+1e-9);
 assert.equal(s.sensors[0].origin.x,s.sample.origin.x);assert.equal(s.sensors[0].origin.y,s.sample.origin.y);assert.notEqual(s.position.x,s.sample.origin.x);
 for(const r of s.sensors)assert.ok(Math.abs(Math.hypot(r.hit.x-r.origin.x,r.hit.y-r.origin.y)-r.distance)<1e-6);
});
test('inspection never performs perception, inference, steering, RNG or updates; deterministic worlds agree',()=>{
 const g=load(),a=new g.KartWorld({bots:2,seed:44}),b=new g.KartWorld({bots:2,seed:44}),d=new KartDebug();a.phase=b.phase='playing';d.selected=1;d.toggle();
 for(let i=0;i<180;i++){a.step();b.step();d.snapshot(a);d.layers.path=!d.layers.path;}
 assert.equal(JSON.stringify(a.karts.map(k=>[k.pos,k.vel,k.health,k.kills])),JSON.stringify(b.karts.map(k=>[k.pos,k.vel,k.health,k.kills])));
 a.karts[1].plan=()=>{throw Error('extra plan');};g.KartPerception.scan=()=>{throw Error('extra scan');};a.rng.range=()=>{throw Error('extra RNG');};assert.doesNotThrow(()=>d.snapshot(a));
});
test('Reynolds path projects predicted position onto a segment and seeks ahead with bounded force',()=>{
 const g=load(),w=new g.KartWorld({bots:1}),k=w.karts[1];k.pos.set(100,100);k.vel.set(3,0);const path=[new g.Vector(300,100)];const f=g.KartBehaviors.path(k,path),d=k.pathDebug;
 assert.equal(d.predicted.x,130);assert.equal(d.projection.x,130);assert.equal(d.target.x,165);assert.equal(d.radius,28);assert.ok(f.mag()<=k.maxForce+1e-9);
});
test('static avoidance is evaluated once per plan and urgent force is what diagnostics report',()=>{
 const g=load(),w=new g.KartWorld({bots:1}),k=w.karts[1];k.perception=g.KartPerception.scan(k,w);let calls=0;g.KartBehaviors.avoid=()=>{calls++;return new g.Vector(.1,.2);};const f=g.KartBehaviors.plan(k,w);
 assert.equal(calls,1);assert.deepEqual({...k.planningForce},{x:f.x,y:f.y});assert.deepEqual({...k.behaviors.last.force},{x:f.x,y:f.y});assert.equal(k.behaviors.last.priority,'obstacle-avoidance');
});
test('customization preferences are validated and cannot inject simulation objects',()=>{
 const storage={getItem:()=>JSON.stringify({name:'a'.repeat(50),character:'invalid',bots:99})};const g=load({storage}),p=g.KartStorage.preferences();assert.equal(p.name.length,20);assert.equal(p.character,'fox');assert.equal(p.bots,12);
});
test('projectile diagnostics cache the actual bounded locomotion force without an extra tick',()=>{
 const g=load(),w=new g.KartWorld({bots:1});w.phase='playing';const p=new g.HomingMissile(100,w.player,w);const start=p.pos.copy();p.tick(w);assert.equal(p.motionSample.origin.x,start.x);assert.ok(Math.hypot(p.motionSample.force.x,p.motionSample.force.y)<=p.maxForce+1e-9);assert.notEqual(p.pos.x,start.x);
});
test('Academy comparison renders measured values and treats imported metadata as untrusted',async()=>{
 const {AcademyPanel}=await import('../kart/academy-ui.js');const panel=Object.create(AcademyPanel.prototype),host={innerHTML:''};panel.get=()=>host;
 panel.comparison({scenarios:[{kills:'<img src=x onerror=alert(1)>',damage:80,damageTaken:12,deaths:0,visited:4,collisionRate:.02}],baseline:[{}]});assert.ok(!host.innerHTML.includes('<img'));assert.ok(host.innerHTML.includes('80 / 12'));assert.ok(host.innerHTML.includes('0.020'));assert.ok(host.innerHTML.includes('Bot de référence'));
});
