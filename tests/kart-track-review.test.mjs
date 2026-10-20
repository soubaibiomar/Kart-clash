import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as THREE from '../gp/vendor/three.module.js';
import {reviewTrack} from '../kart/track-review.js';
import {trackReviewMarkup,TrackReviewView} from '../kart/track-review-view.js';
import {constructionPointFrame} from '../kart/construction-view.js';
import {TrackBuilderView} from '../kart/track-builder-view.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
const flat=(points,closed=false,width=160)=>({schema:'kart-track-v2',name:'Review fixture',width,closed,points:points.map(p=>({elevation:0,kind:'road',...p}))});
function globals(fn){const g=load();globalThis.KartTrack=g.KartTrack;try{fn(g);}finally{delete globalThis.KartTrack;}}

test('road review sums actual 3D lengths, tunnel spans and grade without changing route or RNG',()=>globals(g=>{
 const track=flat([{x:300,y:700,kind:'bridge'},{x:600,y:700,elevation:120,kind:'tunnel'},{x:900,y:700,elevation:120,kind:'bridge'},{x:1200,y:700}]),before=JSON.stringify(track),w=new g.KartWorld({track}),state=w.rng.state,r=reviewTrack(track);assert.equal(r.valid,true);assert.ok(Math.abs(r.length-(2*Math.hypot(300,120)+300))<1e-9);assert.equal(r.tunnelLength,300);assert.equal(r.maxGrade,.4);assert.equal(r.climb,120);assert.equal(r.descent,120);assert.equal(r.minHeight,0);assert.equal(r.maxHeight,120);assert.equal(r.bends,0);assert.equal(r.attention,2);assert.equal(JSON.stringify(track),before);assert.equal(w.rng.state,state);
}));

test('local bend radius and sign are measured geometrically with inclusive warning thresholds',()=>globals(()=>{
 const track=flat([{x:300,y:700},{x:500,y:700},{x:500,y:900}]),r=reviewTrack(track),bend=r.features[0];assert.equal(r.bends,1);assert.equal(bend.index,1);assert.equal(bend.angle,90);assert.equal(bend.direction,'droite');assert.ok(Math.abs(bend.radius-Math.sqrt(2)*100)<1e-9);assert.equal(bend.attention,true);assert.equal(bend.sharp,true);
 const circle=flat([-50,0,50].map(a=>({x:900+180*Math.cos(a*Math.PI/180),y:700+180*Math.sin(a*Math.PI/180)}))),radius=reviewTrack(circle).features[0].radius;const equality=reviewTrack({...circle,width:2*(radius-25)});assert.equal(equality.features[0].attention,true);assert.equal(equality.features[0].sharp,false);const narrower=reviewTrack({...circle,width:2*(radius-25)-.01});assert.equal(narrower.features[0].attention,false);
 const angular=angle=>reviewTrack(flat([-angle,0,angle].map(a=>({x:900+180*Math.cos(a*Math.PI/180),y:700+180*Math.sin(a*Math.PI/180)}))));assert.equal(angular(60).features[0].sharp,true);assert.equal(angular(59.99).features[0].attention,false);
 const left=reviewTrack(flat([{x:300,y:700},{x:500,y:700},{x:500,y:500}]));assert.equal(left.features[0].direction,'gauche');const straight=reviewTrack(flat([{x:300,y:700},{x:500,y:700},{x:900,y:700}]));assert.equal(straight.bends,0);assert.equal(straight.features.length,0);
}));

test('closed-loop geometry includes the closing edge and closing corner while open endpoints are excluded',()=>globals(()=>{
 const track=flat([{x:300,y:300},{x:900,y:300},{x:900,y:900},{x:300,y:900}],true),closed=reviewTrack(track),open=reviewTrack({...track,closed:false});assert.equal(closed.length,2400);assert.equal(open.length,1800);assert.equal(closed.bends,4);assert.equal(open.bends,2);assert.ok(closed.features.some(f=>f.index===3));assert.ok(closed.features.some(f=>f.index===0));assert.ok(open.features.every(f=>f.index!==0&&f.index!==3));
}));

test('empty/invalid drafts remain explicit and flat legacy duplicates do not produce nonfinite diagnostics',()=>globals(()=>{
 const empty=reviewTrack(flat([]));assert.equal(empty.valid,false);assert.match(empty.error,/trois points/);assert.equal(empty.features.length,0);const invalid=reviewTrack(flat([{x:300,y:700},{x:500,y:700,elevation:240},{x:900,y:700}]));assert.equal(invalid.valid,false);assert.match(invalid.error,/Pente/);
 const legacy={schema:'kart-track-v1',name:'Legacy',width:160,closed:true,points:[{x:300,y:300},{x:900,y:300},{x:900,y:900},{x:300,y:300}]},review=reviewTrack(legacy);assert.equal(review.valid,true);assert.equal(review.maxGrade,0);assert.ok(Number.isFinite(review.length));assert.ok(review.features.every(f=>Number.isFinite(f.radius)));
}));

test('grade threshold is inclusive and displayed locations are bounded, spaced and deterministic',()=>globals(g=>{
 const exact=reviewTrack(flat([{x:300,y:700},{x:600,y:700,elevation:105},{x:1000,y:700,elevation:105}]));assert.equal(exact.features[0].grade,.35);assert.equal(exact.features[0].attention,true);
 const track=g.CityTracks.get('@city-skyway'),a=reviewTrack(track),b=reviewTrack(track);assert.deepEqual(a,b);assert.ok(a.focus.length<=6);for(let i=0;i<a.focus.length;i++)for(let j=i+1;j<a.focus.length;j++){const p=track.points[a.focus[i].index],q=track.points[a.focus[j].index];assert.ok(Math.hypot(p.x-q.x,p.y-q.y,p.elevation-q.elevation)>=track.width);}assert.equal(a.attention,new Set(a.features.filter(f=>f.attention).map(f=>f.index)).size);
}));

test('review output distinguishes geometric advice from training and only editor output includes focus commands',()=>globals(()=>{
 const r=reviewTrack(flat([{x:300,y:700},{x:500,y:700},{x:500,y:900}])),editor=trackReviewMarkup(r,true),academy=trackReviewMarkup(r,false);assert.match(editor,/data-review-point="1"/);assert.doesNotMatch(academy,/data-review-point=/);assert.match(editor,/ne prédit pas une collision/);assert.match(academy,/sans essai de conduite/);assert.equal((editor.match(/data-review-point=/g)||[]).length,r.focus.length);const invalid=trackReviewMarkup({valid:false,error:'<img src=x>'});assert.doesNotMatch(invalid,/<img/);assert.match(invalid,/&lt;img/);
}));

test('3D point framing targets the exact vertex including the last closed corner, without extra Vehicle updates',()=>globals(g=>{
 const track=flat([{x:300,y:300},{x:900,y:300,elevation:120},{x:900,y:900},{x:300,y:900}],true),copy=JSON.stringify(track),frame=constructionPointFrame(track,3);assert.equal(frame.x,300);assert.equal(frame.z,900);assert.equal(frame.y,18);assert.ok(Math.abs(frame.angle-Math.PI/2)<1e-9);assert.equal(constructionPointFrame(track,1).y,138);for(const index of [-1,4,1.5])assert.throws(()=>constructionPointFrame(track,index));
 const view=Object.create(TrackBuilderView.prototype);let draws=0,updates=0;g.Vehicle.prototype.update=()=>updates++;Object.assign(view,{getData:()=>track,cityVisible:false,target:new THREE.Vector3(),draw(){draws++;}});view.focusPoint(3);assert.equal(draws,1);assert.equal(updates,0);assert.equal(view.selected,3);assert.deepEqual(view.target.toArray(),[300,18,900]);const previous=view.target.clone();assert.throws(()=>view.focusPoint(99));assert.equal(view.target.distanceTo(previous),0);assert.equal(JSON.stringify(track),copy);
}));

test('review refresh preserves expanded exploration, skips unchanged geometry and notices invalid names',()=>globals(()=>{
 let writes=0,markup='';const details={open:false},host={classList:{add(){}},querySelector:selector=>selector==='details'?details:null,querySelectorAll:()=>[],set innerHTML(value){writes++;markup=value;details.open=false;}};
 const track=flat([{x:300,y:700},{x:500,y:700},{x:500,y:900}]),view=new TrackReviewView(host);view.update(track);assert.equal(writes,1);details.open=true;view.update(track);assert.equal(writes,1);assert.equal(details.open,true);view.update({...track,width:180});assert.equal(writes,2);assert.equal(details.open,true);view.update({...track,width:180,name:''});assert.equal(view.review.valid,false);assert.doesNotMatch(markup,/data-review-point=/);
}));
