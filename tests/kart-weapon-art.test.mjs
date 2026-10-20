import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as THREE from '../gp/vendor/three.module.js';
import {KartRenderer} from '../kart/renderer.js';
import {weaponBody,weaponMount,createOrdnance,updateOrdnance,releaseOrdnance} from '../kart/weapon-art.js';
import {combatEffect,animateCombatEffect,releaseCombatEffect} from '../kart/combat-effects.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
function renderer(){return Object.assign(Object.create(KartRenderer.prototype),{resources:new Set(),materials:new Map(),geometryCache:new Map()});}
const dispose=r=>{for(const v of r.resources)v.dispose();};

test('six original weapon meshes and their kart mounts have finite geometry and identifiable silhouettes',()=>{const r=renderer();for(const kind of ['rocket','homing','mine','rapid','shield','boost']){const m=weaponBody(r,kind),mount=weaponMount(r,kind);assert.equal(m.root.userData.weapon,kind);assert.equal(mount.userData.weapon,kind);assert.ok(m.root.children.length>=3);m.root.traverse(o=>{if(o.geometry)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});assert.ok(mount.scale.x>0&&mount.scale.x<1);}const rocket=weaponBody(r,'rocket'),missile=weaponBody(r,'homing');assert.notEqual(rocket.root.children.length,missile.root.children.length);dispose(r);});

test('mine graphics use the exact detection radius and cached armed state without changing physics',()=>{const g=load(),w=new g.KartWorld({bots:0}),r=renderer(),p=new g.Mine(100,w.player,w),m=createOrdnance(r,p);const before=JSON.stringify(p);assert.equal(m.detectionRing.geometry.parameters.radius,p.detectionRadius);updateOrdnance(r,m,p,w.time,true);assert.equal(JSON.stringify(p),before);const idle=m.detectionRing.material.color.getHex();p.detection.armed=true;updateOrdnance(r,m,p,p.armedAt,true);assert.notEqual(m.detectionRing.material.color.getHex(),idle);assert.equal(m.detectionRing.scale.x,1);assert.equal(m.root.position.y,p.elevation);releaseOrdnance(r,m);dispose(r);});

test('hundreds of spawned and removed mines release instance materials while shared meshes stay bounded',()=>{const g=load(),w=new g.KartWorld({bots:0}),r=renderer(),p=new g.Mine(100,w.player,w);let released=0;const first=createOrdnance(r,p);for(const mat of first.owned)mat.addEventListener('dispose',()=>released++);releaseOrdnance(r,first);const baseline=r.resources.size;for(let i=0;i<300;i++){const m=createOrdnance(r,p);updateOrdnance(r,m,p,1,true);releaseOrdnance(r,m);}assert.equal(released,2);assert.equal(r.resources.size,baseline);assert.ok(r.geometryCache.size<12);dispose(r);});

test('fire and explosion feedback keeps exact world elevation, mine position and simulation-clock lifetime',()=>{const g=load(),w=new g.KartWorld({bots:0}),k=w.player,r=renderer();k.pos.set(100,100);k.heading=0;k.elevation=160;w.time=4;const e=combatEffect(r,{type:'fire',id:k.id,item:'mine',pos:{x:100,y:100,elevation:160}},w);assert.equal(e.root.position.x,65);assert.equal(e.root.position.y,165);assert.equal(animateCombatEffect(e,4),true);const before=e.owned[0].opacity;animateCombatEffect(e,4);assert.equal(e.owned[0].opacity,before);assert.equal(animateCombatEffect(e,4+e.duration),false);releaseCombatEffect(r,e);assert.equal(e.owned.length,0);dispose(r);});

test('effect resources return to their shared baseline and reduced motion removes particle travel',()=>{const r=renderer(),w={time:0,karts:[]},event={type:'impact',item:'rocket',pos:{x:100,y:150,elevation:20}};let baseline;for(let i=0;i<100;i++){const e=combatEffect(r,event,w);animateCombatEffect(e,.2,true);for(const p of e.particles)assert.equal(p.position.length(),0);assert.equal(e.root.position.y,34);releaseCombatEffect(r,e);if(i===0)baseline=r.resources.size;assert.equal(r.resources.size,baseline);}dispose(r);});

test('surface shading respects roughness and metalness and caches equivalent materials',()=>{const r=renderer(),satin=r.material('#92bbdd',.5,.1),metal=r.material('#92bbdd',.25,.7);assert.equal(satin.isMeshStandardMaterial,true);assert.equal(metal.roughness,.25);assert.equal(metal.metalness,.7);assert.equal(r.material('#92bbdd',.5,.1),satin);assert.notEqual(satin,metal);dispose(r);});
