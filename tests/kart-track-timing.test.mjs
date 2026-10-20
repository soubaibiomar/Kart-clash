import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {TrackRunTiming,sectorGates,trackTimingKey,formatTrackTime} from '../kart/track-timing.js';
import {timingResultHtml} from '../kart/track-timing-view.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
function fixture(options={}){const g=load(),w=new g.KartWorld({track:g.KartTrack.example(),...options});return {g,w,t:new TrackRunTiming(w)};}
function finish(t,w,scale=1){for(let i=1;i<=t.count;i++){w.time=i*scale;w.player.trackState.passed=i;w.player.trackState.finished=i===t.count;t.crossing(w,w.player);}w.phase='finished';}

test('sector boundaries follow cumulative 3D road distance and always end at the actual arrival gate',()=>{
 const track={closed:false,points:[{x:0,y:0},{x:10,y:0},{x:110,y:0},{x:120,y:0},{x:320,y:0}]};assert.deepEqual(sectorGates(track),[2,3,4]);
 assert.deepEqual(sectorGates({closed:false,points:track.points.slice(0,3)}),[1,2]);assert.deepEqual(sectorGates({closed:true,points:track.points.slice(0,3)}),[1,2,3]);
 for(const closed of [false,true]){const ends=sectorGates({...track,closed});assert.equal(ends.length,3);assert.equal(ends.at(-1),track.points.length-(closed?0:1));assert.ok(ends.every((n,i)=>n>0&&(!i||n>ends[i-1])));}
 const flat={closed:false,points:[{x:0,y:0},{x:100,y:0},{x:200,y:0},{x:300,y:0},{x:400,y:0},{x:500,y:0}]},steep=structuredClone(flat);steep.points[1].elevation=1000;assert.notDeepEqual(sectorGates(flat),sectorGates(steep));
});

test('record identity ignores display names but separates geometry, altitude, road kind, profile and speed/force limits',()=>{
 const {w}=fixture(),track=w.trackTrial.data,key=trackTimingKey(track,'kart-classic-v1',4.8,.2);assert.equal(trackTimingKey({...track,name:'Renamed'},'kart-classic-v1',4.8,.2),key);
 for(const t of [{...track,width:track.width+1},{...track,closed:!track.closed},{...track,points:track.points.map((p,i)=>i?{...p}:{...p,x:p.x+1})},{...track,points:track.points.map((p,i)=>i?{...p}:{...p,elevation:1})},{...track,points:track.points.map((p,i)=>i?{...p}:{...p,kind:'tunnel'})}])assert.notEqual(trackTimingKey(t,'kart-classic-v1',4.8,.2),key);
 assert.notEqual(trackTimingKey(track,'kart-arcade-v2',4.8,.2),key);assert.notEqual(trackTimingKey(track,'kart-classic-v1',4,.2),key);assert.notEqual(trackTimingKey(track,'kart-classic-v1',4.8,.1),key);
});

test('clock starts after countdown, freezes with world pause, records inclusive ordered gates and rejects duplicates/skips',()=>{
 const {w,t}=fixture();assert.equal(t.snapshot(w).elapsed,0);w.advance(1);assert.equal(t.snapshot(w).elapsed,0);w.phase='playing';w.time=1;w.setPaused(true);w.advance(20);assert.equal(t.snapshot(w).elapsed,1);w.setPaused(false);
 w.player.trackState.passed=1;t.crossing(w,w.player);t.crossing(w,w.player);assert.deepEqual(t.gates,[1]);t.crossing(w,{id:99,trackState:{passed:2}});assert.equal(t.gates.length,1);assert.equal(t.snapshot(w).delta,null);
 w.player.trackState.passed=3;t.crossing(w,w.player);assert.equal(t.snapshot(w).invalid,true);assert.equal(t.commit().status,'incomplete');
 const second=fixture();second.w.time=NaN;second.w.player.trackState.passed=1;second.t.crossing(second.w,second.w.player);assert.equal(second.t.invalid,true);
});

test('completed time and sectors stay fixed, compare at actual gates and save only a faster complete passage',()=>{
 const {w}=fixture();let stored=[],writes=0;const store={read:()=>stored,write:value=>{stored=structuredClone(value);writes++;return true;}},a=new TrackRunTiming(w,store);finish(a,w,2);const initial=a.snapshot(w);assert.equal(initial.elapsed,a.count*2);assert.ok(Math.abs(initial.sectorTimes.reduce((sum,n)=>sum+n,0)-initial.elapsed)<1e-9);assert.equal(writes,0);assert.equal(a.commit().status,'record');assert.equal(writes,1);a.commit();assert.equal(writes,1);w.time=100;assert.equal(a.snapshot(w).elapsed,initial.elapsed);
 const b=new TrackRunTiming(fixture().w,store),bworld=fixture().w;bworld.time=1;bworld.player.trackState.passed=1;b.crossing(bworld,bworld.player);assert.equal(b.snapshot(bworld).delta,-1);assert.equal(b.snapshot(bworld).best,a.count*2);finish(b,bworld,1);assert.equal(b.commit().status,'record');assert.equal(stored[0].time,a.count);
 const cworld=fixture().w,c=new TrackRunTiming(cworld,store);finish(c,cworld,3);assert.equal(c.commit().status,'slower');assert.equal(writes,2);assert.equal(stored[0].time,a.count);
});

test('timeout/incomplete runs cannot write and damaged, unavailable or concurrent storage cannot fabricate a personal best',()=>{
 const {w}=fixture();let writes=0;const t=new TrackRunTiming(w,{read:()=>[null,{schema:'kart-track-time-v1',time:1,gates:[NaN]}],write:()=>{writes++;return true;}});w.phase='finished';w.time=180;assert.equal(t.commit().status,'incomplete');assert.equal(writes,0);
 const blocked=new TrackRunTiming(fixture().w,{read:()=>{throw Error('Blocked');},write:()=>{throw Error('Quota');}}),bw=fixture().w;finish(blocked,bw);assert.equal(blocked.commit().status,'unavailable');assert.equal(blocked.commit().saved,false);
 let store=[];const cw=fixture().w,c=new TrackRunTiming(cw,{read:()=>store,write:r=>{store=r;return true;}});finish(c,cw,2);store=[{schema:'kart-track-time-v1',key:c.key,time:c.count,gates:Array.from({length:c.count},(_,i)=>i+1)}];assert.equal(c.commit().status,'slower');assert.equal(store[0].time,c.count);
});

test('record storage is detached and bounded; neural sessions cannot create manual records',()=>{
 const {w}=fixture(),base=new TrackRunTiming(w),record={schema:'kart-track-time-v1',key:base.key,time:7,gates:[1,2,3,4,5,6,7]},t=new TrackRunTiming(w,{read:()=>[record]});record.gates[0]=999;assert.equal(t.reference.gates[0],1);
 let stored=Array.from({length:24},(_,i)=>({schema:'kart-track-time-v1',key:'track-'+i,time:1,gates:[1]}));const current=new TrackRunTiming(w,{read:()=>stored,write:r=>{stored=r;return true;}});finish(current,w);current.commit();assert.equal(stored.length,24);assert.equal(stored[0].key,current.key);assert.equal(stored[1].key,'track-0');
 w.options.autopilot=true;assert.throws(()=>new TrackRunTiming(w));w.options.autopilot=false;w.options.brain={};assert.throws(()=>new TrackRunTiming(w));
});

test('optional clock observes real shared physics at each crossing without changing steering, RNG or completion',()=>{
 const g=load(),track=g.KartTrack.example(),plain=new g.KartWorld({track,bots:0,seed:9}),observed=new g.KartWorld({track,bots:0,seed:9}),t=new TrackRunTiming(observed);observed.trackTrial.timing=t;
 for(const w of [plain,observed]){w.phase='playing';w.countdown=0;w.player.plan=g.BotKart.prototype.plan;}
 const update=g.Vehicle.prototype.update;let calls=0;g.Vehicle.prototype.update=function(){calls++;return update.call(this);};
 for(let i=0;i<2400&&plain.phase!=='finished';i++){for(const w of [plain,observed]){w.trackTrial.assign(w);w.playerAction=w.player.plan(w);w.step();}assert.equal(JSON.stringify(observed.player.motionSample),JSON.stringify(plain.player.motionSample));assert.equal(JSON.stringify(observed.player.pos),JSON.stringify(plain.player.pos));}
 assert.equal(plain.player.trackState.finished,true);assert.equal(observed.player.trackState.finished,true);assert.equal(observed.time,plain.time);assert.equal(t.finalTime,observed.time);assert.equal(t.gates.length,track.points.length);assert.equal(observed.rng.state,plain.rng.state);assert.equal(calls,plain.tick*2);assert.ok(t.gates.every((n,i)=>!i||n>t.gates[i-1]));
});

test('time formatting carries rounded milliseconds; result reports missing sectors and storage failure honestly',()=>{
 assert.equal(formatTrackTime(59.9998),'1:00.000');assert.equal(formatTrackTime(60.016666),'1:00.017');for(const n of [NaN,Infinity,-1,null])assert.equal(formatTrackTime(n),'—');
 const {t,w}=fixture(),incomplete=timingResultHtml(t,w);assert.match(incomplete,/inachevé/);assert.match(incomplete,/aucun record/);finish(t,w);const blocked=timingResultHtml(t,w);assert.match(blocked,/stockage local est indisponible/);assert.doesNotMatch(blocked,/record local enregistré/);
});
