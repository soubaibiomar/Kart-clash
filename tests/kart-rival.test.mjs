import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
test('drift requires forward speed and turning, retains slip, bounds force/speed and restores on release/respawn/pause',()=>{
 const g=load(),w=new g.KartWorld({bots:0}),k=w.player;k.heading=0;k.vel.set(1.9,0);k.actionForce({throttle:1,turn:1,drift:true});assert.equal(k.drifting,false);
 k.heading=0;k.vel.set(4,1);const f=k.actionForce({throttle:1,turn:1,drift:true});assert.equal(k.drifting,true);assert.ok(f.mag()<=k.maxForce);assert.ok(Math.hypot(k.desiredVelocity.x,k.desiredVelocity.y)<=k.maxSpeed+1e-9);
 const original=g.Vehicle.prototype.update;let calls=0;g.Vehicle.prototype.update=function(){calls++;return original.call(this);};k.drive(w,{throttle:1,turn:.5,drift:true});assert.equal(calls,1);
 k.actionForce({turn:1,drift:false});assert.equal(k.drifting,false);assert.equal(k.maxSpeed,k.normal.speed);assert.equal(k.maxForce,k.normal.force);
 k.drifting=true;w.setPaused(true);assert.equal(k.drifting,false);k.drifting=true;k.respawn(w);assert.equal(k.drifting,false);
});
test('core and bases inherit Vehicle; collection, lethal drop, delivery, win, pause and replay are explicit',()=>{
 const g=load(),w=new g.KartWorld({bots:3,mode:'core'}),t=w.teamMode;kick(w);assert.ok(t.core instanceof g.Vehicle);assert.ok(t.bases.every(b=>b instanceof g.Vehicle));
 w.player.pos.set(t.core.pos);t.tick(w);assert.equal(t.core.carrier,0);w.player.protectedUntil=0;w.weapons.damage(w.player,100,1,w);t.tick(w);assert.equal(t.core.carrier,null);assert.equal(t.scores[0],0);
 w.player.respawn(w);for(let i=0;i<3;i++){w.time+=3;w.player.pos.set(t.core.pos);t.tick(w);assert.equal(t.core.carrier,0);w.player.pos.set(t.bases[0].pos);t.tick(w);assert.equal(t.scores[0],i+1);}
 assert.equal(w.phase,'finished');assert.equal(t.winner(),0);const fresh=new g.KartWorld({mode:'core',bots:3});assert.equal(fresh.teamMode.core.carrier,null);assert.equal(fresh.teamMode.scores.join(','),'0,0');fresh.setPaused(true);const before=JSON.stringify(fresh.teamMode);fresh.advance(100);assert.equal(JSON.stringify(fresh.teamMode),before);
});
function kick(w){w.phase='playing';w.countdown=0;w.time=4;}
test('team roles use leader/flock and pursuit, allies cannot damage and neural team incompatibility is explicit',()=>{
 const g=load(),w=new g.KartWorld({mode:'core',bots:7});kick(w);const t=w.teamMode;t.core.attach(w.player);t.assign(w);assert.equal(w.player.role,'Porteur');const escort=w.karts.find(k=>k.role==='Escorte');escort.lastProgress=w.time;escort.plan(w);assert.ok(escort.behaviors.entries.has('leader-following'));assert.ok(escort.behaviors.entries.has('alignment'));assert.ok(w.karts.some(k=>k.role==='Intercepteur'));assert.ok(w.karts.some(k=>k.role==='Défenseur'));
 w.player.protectedUntil=0;assert.equal(w.weapons.damage(w.player,100,2,w),false);assert.equal(w.player.health,100);assert.throws(()=>new g.KartWorld({mode:'core',brain:g.CombatBrain.random()}));
});
test('recording captures actual applied actions only in active live ticks and rejects incompatible datasets',()=>{
 const g=load(),w=new g.KartWorld({bots:0});w.recorder=new g.KartDemonstration(w);w.advance(1);assert.equal(w.recorder.data.samples.length,0);kick(w);w.playerAction={throttle:.7,turn:.2,fire:false,drift:true};for(let i=0;i<180;i++)w.step();assert.equal(w.recorder.data.samples.length,30);assert.equal(w.recorder.data.samples[0].action.join(','),'.2,.7,-1,1'.replace(/(^|,)\./g,'$10.'));
 w.setPaused(true);w.advance(10);assert.equal(w.recorder.data.samples.length,30);const d=w.recorder.stop();assert.doesNotThrow(()=>g.KartDemonstration.validate(d));for(const key of ['simulation','actionSchema','observationSchema']){const bad=JSON.parse(JSON.stringify(d));bad[key]='old';assert.throws(()=>g.KartDemonstration.validate(bad));}const bad=JSON.parse(JSON.stringify(d));bad.samples[0].input[0]=NaN;assert.throws(()=>g.KartDemonstration.validate(bad));assert.throws(()=>g.KartDemonstration.validate(d,{sensors:5,range:100}));
});
test('recording is bounded, excludes unrelated data and does not change seeded results',()=>{
 const g=load(),a=new g.KartWorld({bots:2,seed:17}),b=new g.KartWorld({bots:2,seed:17});kick(a);kick(b);a.recorder=new g.KartDemonstration(a);for(let i=0;i<240;i++){a.step();b.step();}assert.equal(JSON.stringify(a.karts.map(k=>[k.pos,k.vel,k.health])),JSON.stringify(b.karts.map(k=>[k.pos,k.vel,k.health])));const input=Array(30).fill(0);a.recorder.data.samples=[];for(let i=0;i<1900;i++){a.tick++;a.recorder.capture(a,input);}assert.equal(a.recorder.data.samples.length,1800);assert.equal(a.recorder.active,false);assert.equal(a.recorder.data.name,undefined);
});
test('v2 outputs include drift, rejects v1 without rewriting it, and selects only one rival',()=>{
 const g=load(),model=g.CombatBrain.random(),b=new g.CombatBrain(model);assert.equal(b.predict(Array(30).fill(0)).length,4);const old=JSON.parse(JSON.stringify(model));old.schema='kart-combat-v1';assert.throws(()=>g.CombatBrain.validate(old));assert.equal(old.schema,'kart-combat-v1');const w=new g.KartWorld({bots:7,brain:model});assert.equal(w.karts.filter(k=>k.neural).length,1);assert.equal(new g.KartWorld({bots:0,brain:model}).karts.filter(k=>k.neural).length,1);
});
test('difficulty changes actual reaction, aiming and prediction; no enemy through solid cover',()=>{
 const g=load();const profiles=[];for(const difficulty of ['easy','normal','hard']){const w=new g.KartWorld({bots:1,difficulty});kick(w);const k=w.karts[1];k.pos.set(430,220);w.player.pos.set(430,460);k.plan(w);assert.equal(k.perception.enemy,null);profiles.push(k.tuning);}assert.ok(profiles[0].reaction>profiles[2].reaction);assert.ok(profiles[0].prediction<profiles[2].prediction);assert.ok(profiles[0].aim<profiles[2].aim);
});
test('saving a v2 rival preserves incompatible legacy brains and recording deletion is local',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},g=load({storage});
 const old={schema:'kart-combat-v1',name:'keep me',layers:[]};storage.setItem('kart-clash-brains',JSON.stringify([old]));g.KartStorage.saveBrain(g.CombatBrain.random({},1,'new'));const raw=JSON.parse(storage.getItem('kart-clash-brains'));assert.deepEqual(raw[0],old);assert.equal(g.KartStorage.brains().length,1);
 storage.setItem('kart-clash-demonstration','{}');g.KartDemonstration.remove();assert.equal(storage.getItem('kart-clash-demonstration'),null);assert.equal(JSON.parse(storage.getItem('kart-clash-brains')).length,2);
});
