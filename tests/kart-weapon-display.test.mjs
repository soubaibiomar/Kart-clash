import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {weaponDisplayState,weaponIllustration} from '../kart/weapon-display.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
const fixture=()=>{const g=load(),w=new g.KartWorld({bots:0});w.phase='playing';w.time=10;return {g,w,k:w.player,state:()=>weaponDisplayState(w.player,w,g.KC.items)};};

test('all six equipped items show their actual name, quantity, distinct art and readiness',()=>{const {g,k,state}=fixture(),art=new Set();for(const [id,def] of Object.entries(g.KC.items)){k.equip(id);const s=state();assert.equal(s.kind,id);assert.equal(s.name,def.name);assert.equal(s.ammo,def.ammo);assert.equal(s.maxAmmo,def.ammo);assert.equal(s.status,'ready');art.add(weaponIllustration(id));}assert.equal(art.size,6);assert.ok(!weaponIllustration('<script>').includes('<script>'));});

test('rapid ammunition and cooldown follow real fire rules including the exact ready threshold',()=>{const {w,k,state}=fixture();k.equip('rapid');assert.equal(w.weapons.use(k,w),true);let s=state();assert.equal(s.ammo,9);assert.equal(s.status,'cooldown');assert.ok(s.readiness<1e-10);w.time=k.fireAt-.06;s=state();assert.ok(Math.abs(s.readiness-.5)<1e-10);w.time=k.fireAt;assert.equal(state().status,'ready');assert.equal(state().readiness,1);for(let n=0;n<9;n++){w.time=k.fireAt;w.weapons.use(k,w);}assert.equal(state().kind,'empty');assert.equal(state().maxAmmo,0);});

test('using a one-shot weapon frees its slot and does not invent remaining ammunition',()=>{for(const kind of ['rocket','homing','mine']){const {w,k,state}=fixture();k.equip(kind);w.weapons.use(k,w);assert.equal(state().kind,'empty');assert.equal(state().ammo,0);}});

test('shield and turbo timers coexist with newly equipped weapons and end at the exact expiry',()=>{const {w,k,state}=fixture();k.equip('shield');w.weapons.use(k,w);w.time=k.fireAt;k.equip('boost');w.weapons.use(k,w);k.equip('rocket');const before=JSON.stringify({time:w.time,item:k.item,shield:k.shieldUntil,boost:k.boostUntil,ammo:k.ammo});let s=state();assert.equal(s.kind,'rocket');assert.deepEqual(s.effects.map(e=>e.kind),['shield','boost']);assert.ok(s.effects.every(e=>e.seconds>0&&e.fraction>0&&e.fraction<=1));assert.equal(JSON.stringify({time:w.time,item:k.item,shield:k.shieldUntil,boost:k.boostUntil,ammo:k.ammo}),before);w.time=k.boostUntil;s=state();assert.deepEqual(s.effects.map(e=>e.kind),['shield']);w.time=k.shieldUntil;assert.equal(state().effects.length,0);});

test('countdown, elimination, pause and finish never advertise a usable weapon',()=>{const {w,k,state}=fixture();k.equip('rocket');for(const phase of ['countdown','finished']){w.phase=phase;assert.equal(state().status,'waiting');}w.phase='playing';w.paused=true;assert.equal(state().status,'paused');w.paused=false;k.alive=false;k.shieldUntil=99;assert.equal(state().status,'respawn');assert.equal(state().kind,'empty');assert.equal(state().effects.length,0);});

test('capacity blocked weapons are distinguished from ready utility items',()=>{const {w,k,state}=fixture();w.projectiles=Array(128).fill({});w.mines=Array(32).fill({});for(const kind of ['rocket','homing','rapid','mine']){k.equip(kind);assert.equal(state().status,'full');assert.equal(w.weapons.use(k,w),false);}for(const kind of ['shield','boost']){k.equip(kind);assert.equal(state().status,'ready');}w.projectiles.pop();k.equip('rocket');assert.equal(state().status,'ready');});

test('malformed or depleted equipment is treated as an empty slot without leaking arbitrary markup',()=>{const {k,state}=fixture();k.item='<svg onload=bad>';k.ammo=8;assert.equal(state().kind,'empty');k.equip('rapid');k.ammo=-1;assert.equal(state().kind,'empty');k.ammo=100;assert.equal(state().ammo,10);});
