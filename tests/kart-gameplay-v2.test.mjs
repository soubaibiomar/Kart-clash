import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {prepareSession} from '../kart/session.js';
import {weaponDisplayState} from '../kart/weapon-display.js';
import {raceGuideState} from '../kart/race-guide.js';
import {TrainingTrial} from '../kart/training-trial.js';
const require=createRequire(import.meta.url),{load}=require('../kart/node-world.cjs'),{evaluate}=require('../kart/academy/evaluate.cjs');
function fixture(){const g=load(),w=new g.KartWorld({bots:0,gameplay:g.KartGameplay.ARCADE});w.phase='playing';w.countdown=0;w.arena.solids=[];w.arena.obstacles=[];w.arena.pickups=[];w.player.pos.set(800,700);w.player.heading=0;w.player.protectedUntil=0;return {g,w,k:w.player};}
const step=(w,action,n=1)=>{w.playerAction={turn:0,throttle:0,fire:false,drift:false,...action};for(let i=0;i<n;i++)w.step();};

test('arcade brakes to a stop before reverse, smooths steering, and retains bounded inherited locomotion',()=>{
 const {g,w,k}=fixture();let calls=0;const original=g.Vehicle.prototype.update;g.Vehicle.prototype.update=function(){calls++;return original.call(this);};k.vel.set(4.8,0);const speeds=[];
 for(let i=0;i<45;i++){step(w,{throttle:-1});speeds.push(k.vel.x);assert.ok(k.vel.mag()<=k.maxSpeed+1e-9);assert.ok(Math.hypot(k.motionSample.force.x,k.motionSample.force.y)<=k.motionSample.maxForce+1e-9);}
 assert.equal(calls,45);assert.ok(speeds.slice(0,15).every(s=>s>=0));assert.ok(speeds.some(s=>s===0));assert.ok(speeds.at(-1)<0);assert.ok(k.vel.mag()<=k.maxSpeed*.4+1e-9);
 k.turn=0;step(w,{throttle:1,turn:1});assert.ok(k.turn>0&&k.turn<1);assert.equal(raceGuideState(w).arcade,true);
});

test('a sustained valid drift earns one short turbo only on release, with exact expiry and no repeated award',()=>{
 const {w,k}=fixture();k.vel.set(4.8,0);step(w,{throttle:1,turn:.5,drift:true},65);assert.ok(k.driftReady);assert.ok(k.driftCharge>=.8);const chargedGrip=k.grip;step(w,{throttle:1,turn:.5,drift:false});assert.equal(w.events.filter(e=>e.type==='drift-boost').length,1);assert.ok(Math.abs(k.boostUntil-w.time-.75)<1e-9);assert.equal(k.maxSpeed,k.normal.speed*1.6);assert.ok(k.grip<chargedGrip&&k.grip>.16);assert.equal(k.driftCharge,0);step(w,{throttle:1},3);assert.equal(w.events.filter(e=>e.type==='drift-boost').length,1);k.limits(k.boostUntil);assert.equal(k.maxSpeed,k.normal.speed);assert.equal(k.maxForce,k.normal.force);
});

test('stationary drift, short taps, lost speed, pause and respawn cannot farm a turbo',()=>{
 const {w,k}=fixture();step(w,{drift:true,turn:1},100);step(w,{});assert.equal(k.boostUntil,0);k.vel.set(4.8,0);step(w,{throttle:1,turn:.5,drift:true},15);step(w,{throttle:1,turn:.5});assert.equal(k.boostUntil,0);
 k.vel.set(4.8,0);step(w,{throttle:1,turn:.5,drift:true},65);assert.ok(k.driftReady);w.setPaused(true);const tick=w.tick;w.step();assert.equal(w.tick,tick);assert.equal(k.driftCharge,0);w.setPaused(false);step(w,{throttle:1});assert.equal(k.boostUntil,0);k.driftCharge=1;k.driftReady=true;k.respawn(w);assert.equal(k.driftCharge,0);assert.equal(k.driftReady,false);
});

test('classic models retain their rules and tensors; new profiles are explicit and reject mismatches',()=>{
 const g=load(),old=g.CombatBrain.random(),copy=JSON.stringify(old),modern=g.CombatBrain.random({},1,'Modern',g.KartGameplay.ARCADE);assert.equal(g.CombatBrain.validate(modern).gameplay,g.KartGameplay.ARCADE);assert.equal(JSON.stringify(g.CombatBrain.validate(old)),copy);assert.throws(()=>g.CombatBrain.validate({...modern,gameplay:'unknown'}));assert.throws(()=>new g.KartWorld({brain:old,gameplay:g.KartGameplay.ARCADE}));assert.equal(new g.KartWorld({brain:old}).gameplay,g.KartGameplay.CLASSIC);
 globalThis.KartWorld=g.KartWorld;try{const prefs=g.KartStorage.preferences();const manual=prepareSession(prefs);assert.equal(manual.world.gameplay,g.KartGameplay.ARCADE);const legacy=prepareSession({...prefs,brain:old.name},{brains:[old]});assert.equal(legacy.world.gameplay,g.KartGameplay.CLASSIC);}finally{delete globalThis.KartWorld;}
 assert.deepEqual(g.CombatBrain.shape(modern.config),g.CombatBrain.shape(old.config));
});

test('arcade ammunition, damage, cooldown, shield timers and HUD use the same item definitions',()=>{
 const {g,w,k}=fixture();k.equip('rocket');assert.equal(k.ammo,2);const catalog=g.KartGameplay.catalog(w.gameplay),hud=weaponDisplayState(k,w,catalog);assert.equal(hud.maxAmmo,2);assert.match(hud.hint,/55 dégâts/);assert.ok(w.weapons.use(k,w));assert.equal(k.ammo,1);assert.equal(w.projectiles[0].damage,55);assert.equal(k.fireInterval,.5);assert.equal(w.weapons.use(k,w),false);w.time=k.fireAt;assert.ok(w.weapons.use(k,w));assert.equal(k.item,null);
 k.equip('rapid');w.time=k.fireAt;assert.ok(w.weapons.use(k,w));assert.equal(w.projectiles.at(-1).damage,12);assert.equal(k.fireInterval,.10);k.equip('shield');w.time=k.fireAt;assert.ok(w.weapons.use(k,w));assert.equal(k.shieldUntil-w.time,4.5);
 const old=new g.KartWorld({bots:0});old.player.equip('rocket');assert.equal(old.player.ammo,1);assert.equal(g.KartGameplay.item(old.gameplay,'rocket').damage,60);
});

test('mine warning obeys arming, inclusive range, height, cover and expiry without mutating the world',()=>{
 const {g,w,k}=fixture();k.pos.set(300,700);const mine=new g.Mine(100,k,w);mine.pos.set(375,700);w.mines=[mine];assert.equal(mine.armedAt,1);assert.equal(w.weapons.constructor.warning(k,w),null);w.time=1;assert.equal(w.weapons.constructor.warning(k,w).kind,'mine');const before=JSON.stringify(mine);w.weapons.constructor.warning(k,w);assert.equal(JSON.stringify(mine),before);mine.pos.x=375.001;assert.equal(w.weapons.constructor.warning(k,w),null);mine.pos.x=350;mine.elevation=31;assert.equal(w.weapons.constructor.warning(k,w),null);mine.elevation=0;w.arena.solids=[new g.ArenaObstacle('cover',325,700,10,50)];assert.equal(w.weapons.constructor.warning(k,w),null);w.arena.solids=[];w.time=mine.expires;assert.equal(w.weapons.constructor.warning(k,w),null);
});

test('shared evaluation identifies the profile and repeats modern physics deterministically',()=>{
 const g=load(),options={steps:120,seed:7,gameplay:g.KartGameplay.ARCADE},a=evaluate(null,options),b=evaluate(null,options);assert.equal(a.metrics.gameplay,g.KartGameplay.ARCADE);assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(evaluate(null,{steps:120}).metrics.gameplay,g.KartGameplay.CLASSIC);const model=g.CombatBrain.random({},1,'Modern',g.KartGameplay.ARCADE);assert.throws(()=>evaluate(model,{steps:120,gameplay:g.KartGameplay.CLASSIC}),/profil/);
});

test('live model updates never keep an old ruleset when the profile changes',()=>{
 const g=load();for(const key of ['KartWorld','CombatBrain','TrackPace'])globalThis[key]=g[key];try{const model=g.CombatBrain.random();Object.assign(model,{track:g.KartTrack.example3D(),schema:'kart-track-v2',normalization:'track-deck-v2'});const trial=new TrainingTrial();trial.setModel(model);const before=trial.world;trial.setModel({...model,gameplay:g.KartGameplay.ARCADE});assert.notEqual(trial.world,before);assert.equal(trial.world.gameplay,g.KartGameplay.ARCADE);assert.equal(trial.world.player.gameplay,g.KartGameplay.ARCADE);}finally{for(const key of ['KartWorld','CombatBrain','TrackPace'])delete globalThis[key];}
});
