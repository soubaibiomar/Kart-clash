import test from 'node:test';
import assert from 'node:assert/strict';
import {setupGP} from './gp-harness.mjs';
const {Vehicle,BehaviorManager,SteeringBehaviors:B,ObstacleAvoidanceBehavior,GrandPrixSimulation,TrackObstacle,ServiceVehicle,RaceRandom}=setupGP({neural:true});
const vector=(x,y)=>new Vehicle(0,0,1,1).pos.set(x,y);
const vehicle=(x=0,y=0)=>{const v=new Vehicle(x,y,4,.2);v.vel.set(0,0);return v;};
test('manager composes bounded copies without moving or applying forces; zero weight/deactivation skips evaluation',()=>{
  const v=vehicle(),m=new BehaviorManager(v),raw=vector(.2,0);let calls=0;
  m.add({name:'a',calculate:()=>raw},2).add({name:'b',calculate:()=>{calls++;return vector(0,.2);}},0);
  const f=m.getSteeringForce();assert.ok(f.mag()<=v.maxForce+1e-9);assert.equal(raw.x,.2);assert.equal(v.acc.mag(),0);assert.equal(v.pos.mag(),0);assert.equal(calls,0);
  m.deactivate('a');assert.equal(m.getSteeringForce().mag(),0);m.activate('a').changeWeight('a',.5);assert.equal(m.getSteeringForce().x,.1);m.remove('a');assert.equal(m.getBehavior('a'),undefined);
});
test('priority composition selects highest nonzero group; settings validate atomically',()=>{
  const v=vehicle(),m=new BehaviorManager(v,{strategy:'priority'});m.add({name:'drive',priority:0,calculate:()=>vector(.2,0)}).add({name:'danger',priority:10,calculate:()=>vector(0,-.2)});
  assert.equal(m.getSteeringForce().x,0);const settings=m.exportSettings();assert.throws(()=>m.importSettings([{name:'drive',weight:.5,enabled:false},{name:'bad',weight:1,enabled:true}]));assert.equal(m.getBehavior('drive').weight,1);
  m.importSettings(settings);assert.throws(()=>m.changeWeight('drive',NaN));assert.throws(()=>m.changeWeight('drive',-1));assert.throws(()=>m.add({name:'drive',calculate:()=>vector(0,0)}));
  m.add({name:'bad',calculate:()=>({x:NaN,y:0})});assert.throws(()=>m.getSteeringForce());
});
test('seek/flee reverse desired velocity, arrive brakes at its inclusive stop radius',()=>{
  const v=vehicle();v.vel.set(1,1);const p=vector(10,0),before=p.copy();const flee=B.flee(v,p);assert.ok(flee.x<0&&flee.y<0);assert.notEqual(flee.y,-B.seek(v,p).y);assert.deepEqual(p,before);
  v.vel.set(1,0);assert.equal(B.arrive(v,vector(5,0),{stopRadius:5}).x,-.2);assert.ok(B.arrive(v,vector(1000,0)).x>0);assert.ok(B.arrive(v,v.pos).mag()<=v.maxForce);
});
test('pursue/evade anticipate a moving target without changing its state; horizon is bounded',()=>{
  const v=vehicle(),target=vehicle(20,0);target.vel.set(0,2);const before=target.pos.copy();assert.ok(B.pursue(v,target,10).y>0);assert.ok(B.evade(v,target,10).y<0);assert.deepEqual(target.pos,before);assert.equal(B.predict(target,100).y,60);
});
test('flocking has independent forces, excludes self and distant neighbors, and includes the radius threshold',()=>{
  const v=vehicle(),other=vehicle(120,0);other.vel.set(0,2);assert.ok(B.alignment(v,[v,other],120).y>0);assert.ok(B.cohesion(v,[other],120).x>0);assert.equal(B.cohesion(v,[other],119).mag(),0);assert.equal(B.alignment(v,[]).mag(),0);
  other.pos.set(10,0);assert.ok(B.separation(v,[other]).x<0);other.pos.set(1000,0);assert.equal(B.separation(v,[other]).mag(),0);
});
test('wander is deterministic with an injected RNG; boundaries only react near the boundary',()=>{
  const a=vehicle(),b=vehicle(),ra=new RaceRandom(42),rb=new RaceRandom(42);
  for(let i=0;i<20;i++){assert.deepEqual(B.wander(a,ra),B.wander(b,rb));assert.equal(a.pos.mag(),0);}
  const area={x:0,y:0,width:200,height:200};a.pos.set(100,100);assert.equal(B.boundaries(a,area).mag(),0);a.pos.set(0,100);assert.ok(B.boundaries(a,area).x>0);
});
test('obstacle avoidance detects the forward corridor and overlap, retains passing side, ignores distant/nonclosing traffic',()=>{
  const v=vehicle();v.r=10;v.inPit=false;v.vel.set(3,0);const o=new TrackObstacle(45,0,12),avoid=new ObstacleAvoidanceBehavior();
  const f=avoid.calculate(v,[o]);assert.ok(f.mag()>0&&f.mag()<=v.maxForce+1e-9);const side=avoid.side;o.pos.y=.1;avoid.calculate(v,[o]);assert.equal(avoid.side,side);
  o.pos.set(1000,0);assert.equal(avoid.calculate(v,[o]).mag(),0);o.pos.set(0,0);assert.ok(avoid.calculate(v,[o]).mag()>0);
  const other=vehicle(100,0);other.r=10;other.inPit=false;other.vel.set(3,0);assert.equal(avoid.calculate(v,[other]).mag(),0);
});
test('composed seek and avoidance pass a stationary obstacle through inherited locomotion',()=>{
  const v=vehicle(),obstacle=new TrackObstacle(100,0,12),avoid=new ObstacleAvoidanceBehavior(),manager=new BehaviorManager(v);v.r=10;v.inPit=false;v.vel.set(2,0);
  manager.add({name:'seek',calculate:()=>B.arrive(v,vector(300,0))},1).add({name:'avoid',calculate:()=>avoid.calculate(v,[obstacle])},2.5);
  let closest=Infinity;for(let i=0;i<180;i++){v.applyForce(manager.getSteeringForce());v.update();closest=Math.min(closest,Math.hypot(v.pos.x-100,v.pos.y));}
  assert.ok(closest>=v.r+obstacle.r,`Clearance ${closest}`);assert.ok(v.pos.x>240);
});
test('every physical entity inherits Vehicle and owns a manager; obstacle placement is limited and stationary',()=>{
  const sim=new GrandPrixSimulation({drivers:2});sim.setServiceScenario('wander');const p=sim.track.sample(500).point;
  const obstacle=sim.addObstacle({x:p.x,y:p.y});assert.ok(obstacle);for(const entity of [...sim.cars,sim.safetyCar,...sim.crew,...sim.serviceVehicles,obstacle]){assert.ok(entity instanceof Vehicle);assert.ok(entity.behaviors instanceof BehaviorManager);}
  const before=obstacle.pos.copy();obstacle.update();assert.deepEqual(obstacle.pos,before);assert.equal(sim.addObstacle({x:NaN,y:0}),null);
  for(let i=1;i<20;i++)sim.addObstacle(p);assert.equal(sim.addObstacle(p),null);
});
test('all service scenarios preserve population, produce finite forces and stay reproducible without consuming race RNG',()=>{
  const a=new GrandPrixSimulation({drivers:2,seed:42}),b=new GrandPrixSimulation({drivers:2,seed:42});a.setServiceScenario('wander');b.setServiceScenario('wander');const population=[...a.serviceVehicles],state=a.rng.state;
  for(const mode of ['wander','flock','leader','pursue-evade']){a.setServiceScenario(mode);b.setServiceScenario(mode);for(let tick=0;tick<80;tick++){for(const c of a.serviceVehicles)c.step(a,a.serviceVehicles);for(const c of b.serviceVehicles)c.step(b,b.serviceVehicles);}}
  assert.deepEqual(a.serviceVehicles.map(c=>[c.pos.x,c.pos.y]),b.serviceVehicles.map(c=>[c.pos.x,c.pos.y]));assert.equal(a.rng.state,state);assert.ok(a.serviceVehicles.every(c=>Number.isFinite(c.pos.x)&&c.acc.mag()===0));assert.equal(a.serviceVehicles[0],population[0]);a.setServiceScenario('off');assert.equal(a.serviceVehicles[0],population[0]);
});
test('neural racing composes visible safety forces while manual/grid/pit modes keep priority',()=>{
  const sim=new GrandPrixSimulation({drivers:2,formation:false}),c=sim.cars[0];c.force(sim,sim.cars);assert.deepEqual([...c.behaviors.last.components].map(b=>b.name),['grid']);
  sim.phase='RACE';sim.raceTime=5;c.vel.set(2,0);c.neuralModel.predict=()=>[.5,.5];const force=c.force(sim,sim.cars);assert.ok(force.mag()<=c.maxForce+1e-9);assert.ok(c.behaviors.last.components.some(b=>b.name==='neural'));assert.ok(c.behaviors.last.components.some(b=>b.name==='separation'));
  sim.manual.enabled=true;sim.manual.id=c.driver.id;c.force(sim,sim.cars);assert.deepEqual([...c.behaviors.last.components].map(b=>b.name),['manual']);sim.manual.enabled=false;
  sim.safetyEnabled=false;c.force(sim,sim.cars);assert.deepEqual([...c.behaviors.last.components].map(b=>b.name),['neural']);
});
test('demo clock runs on the grid, freezes cleanly, and is independent of frame segmentation',()=>{
  const a=new GrandPrixSimulation({drivers:2,seed:42}),b=new GrandPrixSimulation({drivers:2,seed:42});a.setServiceScenario('wander');b.setServiceScenario('wander');
  for(let i=0;i<60;i++)a.advance(1/60);for(let i=0;i<30;i++)b.advance(1/30);
  assert.deepEqual(a.serviceVehicles.map(v=>[v.pos.x,v.pos.y]),b.serviceVehicles.map(v=>[v.pos.x,v.pos.y]));assert.equal(a.tick,0);assert.equal(a.raceTime,0);
  a.servicePaused=true;const pos=a.serviceVehicles[0].pos.copy();a.advance(.2);assert.deepEqual(a.serviceVehicles[0].pos,pos);a.servicePaused=false;a.setServiceScenario('off');a.advance(.2);assert.deepEqual(a.serviceVehicles[0].pos,pos);
});
