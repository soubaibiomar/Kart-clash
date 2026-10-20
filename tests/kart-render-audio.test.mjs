import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../gp/vendor/three.module.js';
import {KartRenderer} from '../kart/renderer.js';
import {KartAudio} from '../kart/audio.js';

test('hundreds of repeated projectile/effect shapes share geometry and materials rather than accumulating GPU allocations',()=>{
 const render=Object.create(KartRenderer.prototype);render.resources=new Set();render.materials=new Map();render.geometryCache=new Map();const parent=new THREE.Group();for(let i=0;i<500;i++)render.mesh(new THREE.ConeGeometry(8,26,8),'#ffcf4e',parent);assert.equal(render.geometryCache.size,1);assert.equal(render.materials.size,1);assert.equal(render.resources.size,2);assert.equal(new Set(parent.children.map(m=>m.geometry)).size,1);for(const r of render.resources)r.dispose();
});
test('audio requires gesture initialization, caps concurrent cues and clears sources on pause/restart/disposal',async()=>{
 const previous=globalThis.window;let closed=0,started=0;const parameter=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){}});const node=()=>({gain:parameter(),frequency:parameter(),connect(){},disconnect(){},start(){started++;},stop(){this.onended?.();}});
 class Context{constructor(){this.currentTime=0;this.destination={};}createGain(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}async resume(){}close(){closed++;}}
 globalThis.window={AudioContext:Context};try{const audio=new KartAudio();audio.cue('fire');assert.equal(started,0);await audio.unlock();for(let i=0;i<50;i++)audio.cue('fire');assert.ok(audio.sources.size<=12);audio.configure({mute:true,volume:1});const count=started;audio.cue('pickup');assert.equal(started,count);audio.suspend();assert.equal(audio.sources.size,0);assert.equal(audio.enabled,false);audio.dispose();assert.equal(closed,1);}finally{globalThis.window=previous;}
});

test('stereo cues clamp direction and release panner nodes with the source',async()=>{const previous=globalThis.window,pans=[];const parameter=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>({gain:parameter(),frequency:parameter(),connect(){},disconnect(){this.disconnected=true;},start(){},stop(){this.onended?.();}});class Context{constructor(){this.currentTime=0;this.destination={};}createGain(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}createStereoPanner(){const n=node();n.pan=parameter();pans.push(n);return n;}async resume(){}close(){}}globalThis.window={AudioContext:Context};try{const a=new KartAudio();await a.unlock();a.cue('rocket',3);a.cue('hit',-4);assert.deepEqual(pans.map(p=>p.pan.value),[1,-1]);a.clear();assert.ok(pans.every(p=>p.disconnected));assert.equal(a.sources.size,0);a.dispose();}finally{globalThis.window=previous;}});
