import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EvolutionComparison} from '../kart/evolution-comparison.js';
import {ComparisonPanel} from '../kart/comparison-panel.js';
import {EvolutionPanel} from '../kart/evolution-ui.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
function context(fn){const g=load();for(const key of ['EvolutionBrain','EvolutionPopulation','KartTrack'])globalThis[key]=g[key];try{return fn(g);}finally{for(const key of ['EvolutionBrain','EvolutionPopulation','KartTrack'])delete globalThis[key];}}
function model(g,{name='A',throttle=1,cap=4.8,hidden=[4],sensors=6}={}){const config=g.EvolutionBrain.config({hidden,sensors}),shape=g.EvolutionBrain.shape(config),track={schema:'kart-track-v2',name:'Straight fixture',width:200,closed:false,points:[300,1000,1600].map(x=>({x,y:700,elevation:0,kind:'road'}))};const layers=shape.slice(1).map((n,i)=>({w:Array(shape[i]*n).fill(0),b:Array(n).fill(0)}));layers.at(-1).b[1]=throttle;return {name,schema:'kart-evolution-v1',normalization:'border-rays-v1',config,track,driving:{schema:'track-pace-v1',maxSpeed:cap},layers};}
const finish=c=>{for(let i=0;i<7200&&!c.done;i++)c.step();return c.report();};

test('two networks use equal conditions, retain independent Vehicle locomotion and cannot exceed the common speed',()=>context(g=>{
 const a=model(g,{cap:3}),b=model(g,{name:'B',cap:5,hidden:[8,4],sensors:9}),copy=JSON.stringify([a,b]),c=new EvolutionComparison(a,b);assert.equal(c.options.speed,3);let updates=0,applications=0;const update=g.Vehicle.prototype.update,apply=g.Vehicle.prototype.applyForce;g.Vehicle.prototype.update=function(){updates++;return update.call(this);};g.Vehicle.prototype.applyForce=function(v){applications++;return apply.call(this,v);};
 for(let i=0;i<60;i++){c.step();for(const p of c.trials){const k=p.world.player;assert.ok(k instanceof g.Vehicle);assert.ok(k.vel.mag()<=3+1e-9);assert.ok(Math.hypot(k.motionSample.force.x,k.motionSample.force.y)<=k.maxForce+1e-9);}}
 assert.equal(updates,120);assert.equal(applications,120);assert.equal(JSON.stringify([a,b]),copy);assert.notEqual(c.trials[0].world,c.trials[1].world);assert.equal(c.results()[0].limit,180);assert.equal(c.results()[1].modelLimit,300);
}));

test('different circuit names are allowed but geometry, schema and excessive speed are rejected explicitly',()=>context(g=>{
 const a=model(g),b=model(g,{name:'B'});b.track.name='Another label';assert.doesNotThrow(()=>new EvolutionComparison(a,b));b.track.width=220;assert.throws(()=>new EvolutionComparison(a,b),/même circuit/);b.track.width=200;b.track.points[1].elevation=20;assert.throws(()=>new EvolutionComparison(a,b),/même circuit/);
 for(const options of [{speed:4.9},{speed:0},{speed:NaN},{steps:119},{steps:7201},{stagnation:29},{stagnation:1801},{seed:0},{seed:1.5}])assert.throws(()=>new EvolutionComparison(a,a,options));assert.throws(()=>new EvolutionComparison(g.CombatBrain.random(),a));
}));

test('finished laps report real timing differences and repeated trials are deterministic',()=>context(g=>{
 const a=model(g,{throttle:.2}),b=model(g,{name:'B',throttle:4}),c=new EvolutionComparison(a,b),first=finish(c);assert.ok(first.complete);assert.ok(first.results.every(r=>r.state==='finished'));assert.ok(first.lapDelta<0);assert.ok(first.results[1].averageSpeed>first.results[0].averageSpeed);assert.ok(first.results.every(r=>r.topSpeed<=r.limit+1e-6));first.results.forEach((r,i)=>assert.equal(r.elapsed,c.trials[i].world.tick/60));assert.equal(JSON.stringify(finish(new EvolutionComparison(a,b))),JSON.stringify(first));
}));

test('failure and manual stop cannot produce a fictitious lap delta, and reports are detached',()=>context(g=>{
 const a=model(g,{throttle:-100}),b=model(g,{name:'B'}),c=new EvolutionComparison(a,b),report=finish(c);assert.equal(report.results[0].state,'stalled');assert.equal(report.results[1].state,'finished');assert.equal(report.lapDelta,null);report.track.points[0].x=999;assert.equal(c.original[0].track.points[0].x,300);
 const short=new EvolutionComparison(b,b,{steps:120});finish(short);assert.ok(short.results().every(r=>r.state==='budget'));assert.equal(short.report().lapDelta,null);const manual=new EvolutionComparison(b,b);manual.step();manual.stop();const tick=manual.trials[0].world.tick;manual.step();assert.equal(manual.trials[0].world.tick,tick);assert.equal(manual.results()[0].state,'stopped');assert.equal(manual.report().lapDelta,null);
}));

test('pause and bounded clock preserve identical simulation steps; restart freezes the selected model weights',()=>context(g=>{
 const a=model(g),c=new EvolutionComparison(a,a),d=new EvolutionComparison(a,a);for(let i=0;i<60;i++)c.advance(1/60);for(let i=0;i<15;i++)d.advance(4/60);assert.equal(JSON.stringify(c.report()),JSON.stringify(d.report()));c.pause(true);const frozen=JSON.stringify(c.report());c.advance(1000);assert.equal(JSON.stringify(c.report()),frozen);c.pause(false);c.advance(Infinity);assert.equal(JSON.stringify(c.report()),frozen);c.advance(1/60);assert.ok(c.trials[0].world.tick>d.trials[0].world.tick);
 a.layers.at(-1).b[1]=-100;c.restart();assert.equal(c.trials[0].world.tick,0);c.advance(1/60);assert.ok(c.trials[0].world.player.vel.mag()>0);assert.equal(c.trials[0].models[0].layers.at(-1).b[1],1);assert.ok(c.frame(0).activations[0].length>0);assert.equal(c.frame(0).shape[0],6);
}));

test('panel refuses launches while GPU service is busy and preserves an earlier comparison on invalid selection',()=>context(g=>{
 const p=Object.create(ComparisonPanel.prototype);p.busy=()=>true;p.comparison=null;assert.equal(p.start(),false);p.busy=()=>false;const old={done:true},fields=new Map();p.comparison=old;p.get=id=>{if(!fields.has(id))fields.set(id,{value:id==='compare-steps'?'2400':id==='compare-seed'?'2026':'5'});return fields.get(id);};p.selected=()=>model(g);assert.equal(p.start(),false);assert.equal(p.comparison,old);assert.match(p.get('compare-status').textContent,/invalides/);
}));

test('completed champion revisions keep a detached previous network without overwriting model storage',async()=>{
 const g=load();globalThis.EvolutionBrain=g.EvolutionBrain;try{const p=Object.create(EvolutionPanel.prototype),nodes=new Map();let revision=1,refreshes=0;const a=model(g),b=model(g,{name:'B',throttle:.2});Object.assign(p,{available:true,abort:new AbortController(),controls(){},get(id){if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},saved:()=>[],comparison:{refresh(){refreshes++;}},api:async path=>path==='/api/status'?{algorithm:'track-evolution-v1',phase:'complete',message:'Done',brain:'fixture',brainRevision:revision,tick:0}:revision===1?a:b});await p.poll();assert.equal(p.previousModel,undefined);p.lastPoll=0;revision=2;await p.poll();assert.equal(p.previousModel.name,'A');assert.equal(p.model.name,'B');a.layers[0].w[0]=9;assert.equal(p.previousModel.layers[0].w[0],0);assert.equal(p.comparisonChoices().length,2);assert.equal(refreshes,2);}finally{delete globalThis.EvolutionBrain;}
});

test('JSON import validates before replacement, bounds file size and does not save or train the network',async()=>{
 const g=load();globalThis.EvolutionBrain=g.EvolutionBrain;try{const p=Object.create(ComparisonPanel.prototype),fields=new Map(),original=model(g);Object.assign(p,{busy:()=>false,imported:{a:original},get(id){if(!fields.has(id))fields.set(id,{});return fields.get(id);},refresh(){},selectionChanged(){}});await p.importModel('a',{size:5,text:async()=>'{bad'});assert.equal(p.imported.a,original);let reads=0;await p.importModel('a',{size:2_000_001,text:async()=>{reads++;return '';}});assert.equal(reads,0);assert.equal(p.imported.a,original);const next=model(g,{name:'B'});await p.importModel('a',{size:100,text:async()=>JSON.stringify(next)});assert.equal(p.imported.a.name,'B');assert.equal(p.get('compare-a').value,'import-a');next.layers[0].w[0]=99;assert.equal(p.imported.a.layers[0].w[0],0);p.busy=()=>true;await p.importModel('a',{size:1,text:async()=>{reads++;return '{}';}});assert.equal(reads,0);}finally{delete globalThis.EvolutionBrain;}
});
