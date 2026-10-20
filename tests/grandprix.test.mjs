import test from 'node:test';
import assert from 'node:assert/strict';
import {setupGP} from './gp-harness.mjs';
const {GP,GrandPrixSimulation,GrandPrixCar,GrandPrixCircuit,Vehicle,TireSet,RaceRandom,RacingSteering,RacingContacts}=setupGP();
let completedRace,minimumSeparation=Infinity,maximumOutside=0;
function completeRace(){
  if(completedRace)return completedRace;
  const s=new GrandPrixSimulation({drivers:22,laps:3,seed:2026,incidents:0});s.start();
  for(let tick=0;tick<16000&&s.phase!=='COMPLETE';tick++){
    s.step();
    if(s.phase==='RACE'&&tick%3===0){
      for(const car of s.cars)if(!car.inPit&&!car.finished)maximumOutside=Math.max(maximumOutside,s.track.project(car.pos,car.segmentIndex).distance);
      for(let i=0;i<s.cars.length;i++)for(let j=i+1;j<s.cars.length;j++){const a=s.cars[i],b=s.cars[j];if(!a.inPit&&!b.inPit&&!a.finished&&!b.finished)minimumSeparation=Math.min(minimumSeparation,Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y));}
    }
  }
  completedRace=s;return s;
}

test('full grid: 22 unique autonomous Vehicle subclasses and seeded identities',()=>{
  const s=new GrandPrixSimulation();assert.equal(s.cars.length,22);assert.equal(new Set(s.cars.map(c=>c.driver.number)).size,22);
  assert.ok(s.cars.every(c=>c instanceof Vehicle&&c instanceof GrandPrixCar));assert.equal(GrandPrixCar.prototype.update,Vehicle.prototype.update);
  assert.ok(s.safetyCar instanceof Vehicle);assert.ok(s.crew.every(member=>member instanceof Vehicle));assert.equal(new Set(s.cars.map(c=>c.driver.profile.pace)).size,22);
  const other=new GrandPrixSimulation();assert.equal(JSON.stringify(s.cars.map(c=>c.driver)),JSON.stringify(other.cars.map(c=>c.driver)));
});

test('complete 22-car race: formation, lights, actual overtakes, pits and checkered classification',()=>{
  const s=completeRace();assert.equal(s.phase,'COMPLETE');assert.ok(s.cars.every(c=>c.finished));
  assert.ok(s.cars.every(c=>c.formationDone));assert.ok(s.director.events.some(e=>e.type==='LIGHTS_OUT'));
  assert.ok(s.director.passes>=3);assert.ok(s.cars.every(c=>c.pitStops>=1));
  assert.ok(s.cars.every(c=>c.lapTimes.length===3));assert.ok(s.cars.every(c=>c.classified));
  assert.ok(s.order().every((c,i,a)=>i===0||c.finishTime>=a[i-1].finishTime));
});

test('physical racing: no coincident cars or off-track path shortcuts in the full race',()=>{
  completeRace();assert.ok(minimumSeparation>=27,`minimum centre separation ${minimumSeparation}`);assert.ok(maximumOutside<80,`maximum off track ${maximumOutside}`);
});

test('steering is desired velocity minus current velocity, bounded and position-preserving',()=>{
  const s=new GrandPrixSimulation({drivers:2}),c=s.cars[0],before=c.pos.copy();
  const target=c.pos.copy().add({x:100,y:0}),force=RacingSteering.velocity(c,target,5);
  assert.ok(force.mag()<=c.maxForce+1e-10);assert.equal(c.pos.x,before.x);assert.equal(c.pos.y,before.y);
  c.applyForce(force);c.update();assert.ok(c.pos.x>before.x);assert.equal(c.acc.mag(),0);
});

test('corner anticipation reduces target speed and different grip changes pace',()=>{
  const s=new GrandPrixSimulation({drivers:2,incidents:0}),c=s.cars[0];s.phase='RACE';c.tires.grip=1;c.front=null;c.state='RACE';
  const curve=s.track.points.map((_,i)=>({d:s.track.cumulative[i],k:s.track.curvature(s.track.cumulative[i])})).sort((a,b)=>b.k-a.k)[0];
  c.distance=300;c.pos.set(s.track.sample(300).point);c.segmentIndex=s.track.sample(300).index;c.vel.set(s.track.sample(300).tangent.mult(3));RacingSteering.race(c,s,[c]);const straight=c.targetSpeed;
  c.distance=curve.d;c.pos.set(s.track.sample(curve.d).point);c.segmentIndex=s.track.sample(curve.d).index;c.vel.set(s.track.sample(curve.d).tangent.mult(3));RacingSteering.race(c,s,[c]);assert.ok(c.targetSpeed<straight);
  const dry=c.targetSpeed;c.tires.grip=.4;RacingSteering.race(c,s,[c]);assert.ok(c.targetSpeed<dry);
});

test('lap and sector timing use crossings of geometric progress, not ranking scripts',()=>{
  const s=completeRace();assert.ok(s.cars.every(c=>c.lapTimes.every(t=>t>10)));assert.ok(s.cars.some(c=>c.sectors.length===3));
  assert.ok(s.director.fastest.time===Math.min(...s.cars.flatMap(c=>c.lapTimes)));
  assert.ok(s.cars.some(c=>s.order().indexOf(c)+1!==c.driver.grid));
  assert.equal(s.cars.reduce((n,c)=>n+c.overtakes,0),s.director.passes);
  assert.ok(s.director.events.filter(e=>e.type==='OVERTAKE').every(e=>e.flag==='GREEN'));
});

test('pit entry, stationary service and safe exit are actual sequential states',()=>{
  const s=completeRace();for(const car of s.cars){assert.ok(car.pitHistory.every(p=>p.stationary>=2.1));assert.ok(car.usedCompounds.size>=2);assert.ok(Object.values(car.availableSets).every(n=>n>=0));assert.equal(car.penalty,0);}
  for(const type of ['BOX','PIT_ENTRY','PIT_STOP','TYRES','PIT_EXIT'])assert.ok(s.director.events.some(e=>e.type===type),type);
});

test('tyre wear, temperature, cold penalty and rain suitability affect real grip',()=>{
  const s=new GrandPrixSimulation({drivers:2}),car=s.cars[0],soft=new TireSet('S'),hard=new TireSet('H');soft.temperature=hard.temperature=95;
  soft.update(car,s.environment,s.track.totalLength,s.config);hard.update(car,s.environment,s.track.totalLength,s.config);
  assert.ok(soft.wear>hard.wear);assert.equal(soft.age,1);assert.ok(soft.loss>0);
  const warm=new TireSet('M'),cold=new TireSet('M');warm.temperature=95;cold.temperature=45;warm.update(car,s.environment,0,s.config);cold.update(car,s.environment,0,s.config);assert.ok(warm.grip>cold.grip);
  s.environment.wetness=.85;const wet=new TireSet('W'),dry=new TireSet('S');wet.temperature=dry.temperature=95;wet.update(car,s.environment,0,s.config);dry.update(car,s.environment,0,s.config);assert.ok(wet.grip>dry.grip);
});

test('team agents respond independently to weather and cannot use unavailable tyres',()=>{
  const s=new GrandPrixSimulation({drivers:4});s.phase='RACE';s.environment.wetness=.4;s.time=2;
  for(const team of s.teams)team.update(s);assert.ok(s.cars.filter(c=>c.pitRequested).length>=2);assert.ok(s.cars.filter(c=>c.pitRequested).every(c=>c.pitCompound==='I'));
  assert.ok(s.cars.some(c=>!c.pitRequested),'teammates avoid double-stacking');
  const c=s.cars[0];c.pitRequested=false;c.availableSets.S=0;assert.equal(c.requestPit('S','test',s),false);
});

test('fixed-step replay is identical at 1x and 16x, independent of rendering',()=>{
  const options={drivers:8,laps:5,seed:99,formation:false,incidents:.5,weather:'dynamic'};
  const a=new GrandPrixSimulation(options),b=new GrandPrixSimulation(options);a.start();b.start();
  for(let i=0;i<1600;i++)a.advance(1/60,1);for(let i=0;i<100;i++)b.advance(1/60,16);
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()));
  assert.equal(JSON.stringify(a.director.events),JSON.stringify(b.director.events));
  assert.notEqual(new RaceRandom(1).next(),new RaceRandom(2).next());
});

test('pause freezes the simulation and resume does not add hidden elapsed time',()=>{
  const s=new GrandPrixSimulation({drivers:2,formation:false});s.start();s.advance(.1,2);const tick=s.tick;
  s.paused=true;s.advance(.25,16);assert.equal(s.tick,tick);s.paused=false;s.advance(1/60,1);assert.equal(s.tick,tick+1);
});

test('Safety Car interrupts a race, stops attack decisions and restarts without false overtake events',()=>{
  const s=new GrandPrixSimulation({drivers:6,laps:2,formation:false,incidents:0});s.start();for(let i=0;i<1100;i++)s.step();
  const passes=s.director.passes;s.director.neutralize('SC',5);assert.equal(s.director.flag,'SC');assert.ok(s.safetyCar.active);
  for(let i=0;i<280;i++)s.step();assert.equal(s.director.passes,passes);assert.ok(s.cars.filter(c=>!c.finished&&!c.inPit).every(c=>c.state==='SAFETY_CAR'));
  for(let i=0;i<30;i++)s.step();assert.equal(s.director.flag,'GREEN');assert.ok(s.director.events.some(e=>e.type==='GREEN'));
  for(let i=0;i<14000&&s.phase!=='COMPLETE';i++)s.step();assert.equal(s.phase,'COMPLETE');
});

test('penalties change final classification and selected rulesets remain distinct',()=>{
  const s=new GrandPrixSimulation({drivers:2}),[a,b]=s.cars;a.finished=b.finished=true;a.finishTime=10;b.finishTime=12;
  assert.equal(s.order()[0],a);s.director.penalty(a,5,'test infringement');assert.equal(s.order()[0],b);assert.equal(a.finishTime,15);
  assert.equal(new GrandPrixSimulation({rules:'legacy'}).config.rules,'legacy');assert.equal(new GrandPrixSimulation().config.rules,'2026');
});

test('two configurable circuits remain closed and pit distances are continuous',()=>{
  const a=new GrandPrixCircuit('coast'),b=new GrandPrixCircuit('technical');assert.notEqual(a.totalLength,b.totalLength);
  assert.ok(Math.hypot(a.sample(0).point.x-a.sample(a.totalLength).point.x,a.sample(0).point.y-a.sample(a.totalLength).point.y)<1e-8);
  assert.ok(a.boxes.every(d=>d>0&&d<a.pitLength));assert.ok(a.pitLength>a.pitSpan);
});


test('one-stop and two-stop strategies alter results through actual pit time',()=>{
  const s=new GrandPrixSimulation({drivers:8,laps:6,seed:7,formation:false,incidents:0});s.start();
  for(let i=0;i<20000&&s.phase!=='COMPLETE';i++)s.step();assert.equal(s.phase,'COMPLETE');
  assert.ok(s.cars.some(c=>c.pitStops===1));assert.ok(s.cars.some(c=>c.pitStops===2));
  const strategyGain=s.cars.some(a=>s.cars.some(b=>a.driver.profile.pace<b.driver.profile.pace&&a.pitStops<b.pitStops&&a.finishTime<b.finishTime));
  assert.ok(strategyGain,'a slower car can finish ahead by spending less time in the pits');
});

test('actual body contacts produce bounded recovery forces and an event, never a position jump',()=>{
  const s=new GrandPrixSimulation({drivers:2,incidents:0}),[a,b]=s.cars;s.phase='RACE';s.raceStartTick=0;
  const point=s.track.sample(300);a.pos.set(point.point);b.pos.set(point.point.copy().add(point.tangent.copy().mult(10)));a.heading=b.heading=point.tangent.heading();
  const beforeA=a.pos.copy(),beforeB=b.pos.copy();assert.ok(RacingContacts.overlap(a,b));RacingContacts.resolve(s);
  assert.equal(a.pos.x,beforeA.x);assert.equal(b.pos.x,beforeB.x);assert.ok(a.contactForce.mag()<=a.maxForce);assert.ok(a.damage>0);
  assert.ok(s.director.events.some(e=>e.type==='CONTACT'));
});

test('pit work consumes simulation time and formation warms tyres without counting a race lap',()=>{
  const s=new GrandPrixSimulation({drivers:2,incidents:0});s.start();for(let i=0;i<1000;i++)s.step();
  assert.equal(s.phase,'FORMATION');assert.ok(s.cars.every(c=>c.tires.temperature>70&&c.lap===0&&c.tires.age===0));
  assert.ok(s.crew.every(member=>member.vel.mag()===0));
});

test('wet race completes with rain tyres, stable progress and the wet-compound exception',()=>{
  const s=new GrandPrixSimulation({drivers:6,laps:3,seed:42,weather:'wet',formation:false,incidents:0});s.start();
  for(let i=0;i<16000&&s.phase!=='COMPLETE';i++)s.step();assert.equal(s.phase,'COMPLETE');
  assert.ok(s.cars.every(c=>c.usedCompounds.has('W')));assert.ok(s.cars.every(c=>c.penalty===0));assert.ok(s.environment.wetness>.7);
});


test('neutralisation cancels an unconfirmed pass rather than announcing it under a flag',()=>{
  const s=new GrandPrixSimulation({drivers:2}),[a,b]=s.cars;s.phase='RACE';s.time=1;s.tick=60;a.distance=200;b.distance=100;
  s.director.pending.set('pending',{a,b,since:0});s.director.neutralize('VSC',10);s.director.update();
  assert.equal(s.director.passes,0);assert.equal(s.director.pending.size,0);assert.ok(!s.director.events.some(e=>e.type==='OVERTAKE'));
});


test('a secondary VSC request cannot downgrade an active Safety Car',()=>{
  const s=new GrandPrixSimulation({drivers:2});s.phase='RACE';s.director.neutralize('SC',18);s.time=12;
  s.director.neutralize('VSC',12);assert.equal(s.director.flag,'SC');assert.equal(s.director.until,24);assert.ok(s.safetyCar.active);
});
