import test from 'node:test';
import assert from 'node:assert/strict';
import {setupGP} from './gp-harness.mjs';
const {GP,GrandPrixSimulation,GrandPrixCircuit,F1_CIRCUITS,RacingSensors,ManualControl,RaceWeekend,SportingRules}=setupGP();

test('2026 identity: 22 real drivers, verified unique numbers and stable interpreted styles',()=>{
  const s=new GrandPrixSimulation();assert.equal(new Set(GP.numbers).size,22);
  assert.equal(GP.names[4],'Max Verstappen');assert.equal(GP.numbers[4],3);assert.equal(GP.numbers[0],1);
  assert.ok(s.cars.every(c=>c.driver.style&&c.driver.team===GP.teams[c.driver.teamId][0]));
  assert.equal(s.cars.find(c=>c.driver.id===4).driver.profile.braking,.98);
});
test('24 complete geographic layouts close, retain finite segments and support continuous local projection',()=>{
  assert.equal(F1_CIRCUITS.length,24);
  for(const source of F1_CIRCUITS){const t=new GrandPrixCircuit(source.id);assert.ok(t.geographic,source.name);assert.ok(t.points.length>20);assert.ok(t.lengths.every(l=>l>0));
    assert.ok(t.totalLength>1000);assert.equal(t.borders.length,t.points.length*2);
    const a=t.sample(0).point,b=t.sample(t.totalLength).point;assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-6);
    const q=t.sample(t.totalLength*.4);assert.ok(t.project(q.point,q.index).distance<1e-6);
    assert.ok(t.boxes.every(d=>d>0&&d<t.pitLength));
  }
});
test('ray casts: inclusive segment endpoints and range, parallel and behind misses',()=>{
  const v=(x,y)=>({x,y});assert.equal(RacingSensors.intersect(v(0,0),v(1,0),v(10,0),v(10,10),10),10);
  assert.equal(RacingSensors.intersect(v(0,0),v(1,0),v(10,-2),v(10,2),9),null);
  assert.equal(RacingSensors.intersect(v(0,0),v(1,0),v(-10,-2),v(-10,2),50),null);
  assert.equal(RacingSensors.intersect(v(0,0),v(1,0),v(0,2),v(10,2),50),null);
});
test('perception: nearest car, rear and lateral fan, bounded correction, no movement during scan',()=>{
  const s=new GrandPrixSimulation({drivers:3}),[a,b,c]=s.cars;a.pos.set(1000,1000);a.vel.set(3,0);a.heading=0;b.pos.set(1080,1000);b.vel.set(1,0);c.pos.set(1180,1000);
  const before=a.pos.copy(),scan=RacingSensors.scan(a,[a,b,c],220);assert.equal(scan.front.hit,b);assert.equal(scan.front.distance,80-b.r);assert.ok(scan.ttc<1);
  assert.equal(scan.rays.length,12);assert.ok(scan.rays.some(r=>r.degrees===180));assert.ok(RacingSensors.correction(a,scan).mag()<=a.maxForce*.35+1e-9);assert.deepEqual(a.pos,before);
  const far=RacingSensors.scan(a,[a,c],60);assert.equal(far.front.hit,null);
});
test('keyboard input: throttle, braking, both layouts, neutralisation cap and bounded forces',()=>{
  const s=new GrandPrixSimulation({drivers:2}),c=s.cars[0],m=new ManualControl();c.vel.set(3,0);c.heading=0;
  m.keys.add('z');assert.equal(m.axis().throttle,1);assert.ok(m.force(c,s).x>0);
  m.clear();m.keys.add('ArrowDown');assert.ok(m.force(c,s).x<0);assert.ok(m.force(c,s).mag()<=c.maxForce);
  m.clear();m.keys.add('q');assert.equal(m.axis().turn,-1);m.keys.add('d');assert.equal(m.axis().turn,0);
  s.director.flag='VSC';c.vel.set(7,0);m.force(c,s);assert.ok(c.targetSpeed<=3.4);m.clear();assert.equal(m.keys.size,0);
});
test('classic and sprint schedules and official base durations; next session is guarded',()=>{
  const classic=new RaceWeekend({format:'classic',sessionScale:1});assert.equal(classic.sim.config.sessionDuration,3600);assert.equal(classic.next(),false);
  assert.deepEqual(Array.from(classic.sessions),['FP1','FP2','FP3','Q1','Q2','Q3','RACE']);
  const sprint=new RaceWeekend({format:'sprint'});assert.deepEqual(Array.from(sprint.sessions),['FP1','SQ1','SQ2','SQ3','SPRINT','Q1','Q2','Q3','RACE']);
});
test('qualifying: 22 to 16 to 10; session times reset and race grid follows Q3/Q2/Q1 groups',()=>{
  const w=new RaceWeekend({format:'classic',drivers:22});w.index=3;w.sim=w.createSession();
  const groups=[];
  for(let stage=1;stage<=3;stage++){
    w.sim.cars.forEach((c,i)=>{c.bestLap=60+i;c.finished=true;});w.sim.phase='COMPLETE';groups.unshift(w.sim.order().map(c=>c.driver.id));
    assert.ok(w.next());if(stage<3){assert.equal(w.sim.cars.length,stage===1?16:10);assert.ok(w.sim.cars.every(c=>!Number.isFinite(c.bestLap)));}
  }
  assert.equal(w.name,'RACE');assert.equal(w.sim.cars.length,22);assert.deepEqual(Array.from(w.raceGrid.slice(0,10)),Array.from(groups[0]));
  assert.deepEqual(Array.from(w.sim.order().map(c=>c.driver.id)),Array.from(w.raceGrid));
});
test('timed practice measures physical laps, completes current flying lap, and pause freezes clock',()=>{
  const s=new GrandPrixSimulation({drivers:2,timedSession:true,sessionName:'FP1',sessionDuration:12,incidents:0,formation:false});s.start();s.advance(.2);s.paused=true;const t=s.tick;s.advance(.2);assert.equal(s.tick,t);s.paused=false;
  for(let i=0;i<10000&&s.phase!=='COMPLETE';i++)s.step();assert.equal(s.phase,'COMPLETE');assert.ok(s.raceTime>=12);assert.ok(s.cars.every(c=>Number.isFinite(c.bestLap)&&c.lapTimes.length>0));
});
test('red flag: cars physically return, frozen session clock, early resume refused, safe release',()=>{
  const s=new GrandPrixSimulation({drivers:2,formation:false,incidents:0});s.start();for(let i=0;i<700;i++)s.step();
  assert.equal(s.director.redFlag(),true);const clock=s.raceTime;assert.equal(s.director.resumeRed(),false);
  for(let i=0;i<12000&&s.cars.some(c=>c.state!=='RED_HOLD');i++)s.step();
  assert.equal(s.phase,'SUSPENDED');assert.equal(s.raceTime,clock);assert.ok(s.cars.every(c=>c.state==='RED_HOLD'));
  assert.equal(s.director.resumeRed(),true);assert.equal(s.director.flag,'SC');assert.equal(s.phase,'RACE');s.step();assert.ok(s.raceTime-clock<.02);assert.ok(s.cars.every(c=>Number.isFinite(c.distance)));for(let i=0;i<1500;i++)s.step();assert.ok(s.cars.every(c=>Number.isFinite(c.distance)&&Number.isFinite(c.pos.x)));assert.ok(s.cars.some(c=>!c.inPit));
});
test('yellow/SC priority and incident range configuration, zero random incidents',()=>{
  const s=new GrandPrixSimulation({drivers:2,formation:false,incidents:0});s.start();for(let i=0;i<400;i++)s.step();assert.ok(s.director.yellow());s.director.neutralize('SC');assert.equal(s.director.yellow(),false);assert.equal(s.director.flag,'SC');
  assert.equal(new GrandPrixSimulation({incidents:99}).config.incidents,5);assert.equal(new GrandPrixSimulation({incidents:-1}).config.incidents,0);
});
test('sporting rules: normal/sprint points, inclusive 107%, wet exception, 90% classification, DSQ',()=>{
  assert.equal(SportingRules.points(1),25);assert.equal(SportingRules.points(1,true),8);assert.equal(SportingRules.points(11),0);
  assert.ok(SportingRules.qualifying107(107,100));assert.equal(SportingRules.qualifying107(107.01,100),false);assert.ok(SportingRules.qualifying107(120,100,true));
  assert.ok(SportingRules.classified({lap:9},10));assert.equal(SportingRules.classified({lap:8},10),false);
  const s=new GrandPrixSimulation(),c=s.cars[0];SportingRules.disqualify(s,c,'test');assert.equal(c.state,'DSQ');assert.equal(SportingRules.classified(c,0),false);
});


test('every geographic circuit completes a four-car race without projection stalls',()=>{
  for(const source of F1_CIRCUITS){
    const s=new GrandPrixSimulation({drivers:4,laps:1,circuit:source.id,formation:false,incidents:0});s.start();
    for(let i=0;i<18000&&s.phase!=='COMPLETE';i++)s.step();
    assert.equal(s.phase,'COMPLETE',source.location);assert.ok(s.cars.every(c=>c.finished),source.location);
  }
});
test('new sensors slow only approaching forward traffic and refresh without consuming randomness',()=>{
  const s=new GrandPrixSimulation({drivers:2}),[a,b]=s.cars;a.pos.set(1000,1000);a.vel.set(6,0);a.heading=0;a.distance=0;b.distance=100;b.pos.set(1050,1000);b.vel.set(1,0);
  const state=s.rng.state,scan=RacingSensors.scan(a,[a,b],220);assert.ok(RacingSensors.safeSpeed(a,scan,7)<7);assert.equal(s.rng.state,state);
  b.distance=-100;assert.equal(RacingSensors.safeSpeed(a,scan,7),7);
});
test('official Q3 clock is 13 minutes and equal times use earliest achievement',()=>{
  const w=new RaceWeekend({format:'classic',sessionScale:1});w.index=5;w.sim=w.createSession();assert.equal(w.sim.config.sessionDuration,780);
  const a=w.sim.cars[0],b=w.sim.cars[1];a.bestLap=60;b.bestLap=60;a.bestSetAt=80;b.bestSetAt=70;assert.equal(w.sim.order()[0],b);
});


test('full Sprint weekend uses real session results and independent Sprint/Grand Prix grids',()=>{
  const w=new RaceWeekend({format:'sprint',sessionScale:.01,drivers:4,laps:3,circuit:'it-1922',formation:false,incidents:0});
  const seen=[];
  while(true){const s=w.sim;s.start();for(let i=0;i<18000&&s.phase!=='COMPLETE';i++)s.step();assert.equal(s.phase,'COMPLETE',w.name);seen.push(w.name);
    if(w.name==='SPRINT'){assert.equal(s.config.sprint,true);assert.equal(s.order()[0].points,8);}
    if(w.name==='RACE'){assert.equal(s.order()[0].points,25);break;}assert.ok(w.next());
  }
  assert.equal(seen.length,9);assert.equal(new Set(w.raceGrid).size,4);assert.equal(new Set(w.sprintGrid).size,4);
});
test('official distance and Sprint exemption are separate from a custom short demonstration',()=>{
  const w=new RaceWeekend({format:'race',officialDistance:true,circuit:'it-1922'});assert.equal(w.config.laps,53);
  const m=new RaceWeekend({format:'race',officialDistance:true,circuit:'mc-1929'});assert.ok(m.config.laps>=75&&m.config.laps<=80);
  const s=new GrandPrixSimulation({laps:10,sprint:true});assert.equal(SportingRules.compoundRequired(s,s.cars[0]),false);
});
test('incident multiplier zero disables random failures; actual severe contacts trigger red',()=>{
  const s=new GrandPrixSimulation({drivers:2,formation:false,incidents:0});s.start();for(let i=0;i<400;i++)s.step();s.rng.next=()=>0;for(let i=0;i<180;i++)s.step();assert.ok(s.cars.every(c=>!c.retired));
  s.config.incidents=5;for(let i=0;i<60&&s.phase!=='COMPLETE';i++)s.step();assert.ok(s.director.events.some(e=>e.type==='DNF'));
  const collision=new GrandPrixSimulation({drivers:2,formation:false,incidents:1});collision.phase='RACE';
  const [a,b]=collision.cars;a.pos.set(1000,1000);b.pos.set(1020,1000);a.vel.set(8,0);b.vel.set(-8,0);a.heading=0;b.heading=Math.PI;
  const {RacingContacts}=setupGP();RacingContacts.resolve(collision);assert.equal(collision.phase,'SUSPENDED');assert.equal(collision.director.flag,'RED');
});
test('lapped cars finish on their next crossing after the leader and retain lap-based classification',()=>{
  const s=new GrandPrixSimulation({drivers:2,laps:5,formation:false,incidents:0});s.phase='RACE';s.raceStartTick=0;s.chequered=true;
  const c=s.cars[0],t=s.track;c.lap=2;c.distance=t.totalLength*3-1;c.wrapped=t.totalLength-1;c.pos.set(t.sample(t.totalLength*.001).point);c.segmentIndex=0;c.vel.set(2,0);c.usedCompounds.add('H');c.usedCompounds.add('M');
  const previous=c.pos.copy();c.postStep(s,previous);assert.equal(c.finished,true);assert.equal(c.lap,3);
});
