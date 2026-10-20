import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupGP} from './gp-harness.mjs';
const {GrandPrixSimulation,DriverNeuralModel,NeuralSteering,APEX_DRIVER_MODELS,RacingSteering,Vehicle}=setupGP({neural:true});

test('22 drivers own different trained CUDA models; repeated instances never share mutable weights',()=>{
  const s=new GrandPrixSimulation({drivers:22});assert.equal(s.config.policy,'neural');
  assert.equal(new Set(s.cars.map(c=>c.neuralModel.metadata.sha256)).size,22);
  for(const c of s.cars){assert.equal(c.neuralModel.driverId,c.driver.id);assert.equal(c.neuralModel.metadata.device,'cuda');assert.ok(c instanceof Vehicle);}
  const a=DriverNeuralModel.forDriver(4),b=DriverNeuralModel.forDriver(4),old=b.w1[0];a.w1[0]+=1;assert.equal(b.w1[0],old);
});
test('MLP performs both sigmoid layers and rejects incompatible or nonfinite model files',()=>{
  const record={schema:'apex-driver-v1',driverId:0,inputs:18,hidden:36,outputs:2,w1:Array(648).fill(0),b1:Array(36).fill(0),w2:Array(72).fill(0),b2:[0,Math.log(3)],metadata:{}};
  const model=new DriverNeuralModel(record),out=model.predict(Array(18).fill(1));assert.ok(Math.abs(out[0]-.5)<1e-6);assert.ok(Math.abs(out[1]-.75)<1e-6);
  assert.throws(()=>model.predict(Array(17).fill(0)));assert.throws(()=>model.predict(Array(18).fill(NaN)));
  assert.throws(()=>new DriverNeuralModel({...record,hidden:12}));assert.throws(()=>new DriverNeuralModel({...record,w1:[NaN]}));
  assert.throws(()=>DriverNeuralModel.forDriver(999));
});
test('neural race policy controls desired direction/speed without calling geometric autopilot',()=>{
  const s=new GrandPrixSimulation({drivers:2,formation:false,incidents:0}),c=s.cars[0];s.start();for(let i=0;i<430;i++)s.step();
  assert.ok(c.neuralInputs&&c.neuralOutputs);assert.equal(c.neuralInputs.length,18);
  const pos=c.pos.copy(),expert=RacingSteering.race,sample=c.track.sample;
  RacingSteering.race=()=>{throw new Error('Expert autopilot called');};
  // curvature is telemetry, so replace it too; no hidden path direction is permitted.
  c.track.curvature=()=>0;c.track.sample=()=>{throw new Error('Path target used');};
  try{const force=NeuralSteering.race(c,s,s.cars);assert.ok(force.mag()<=c.maxForce+1e-9);assert.deepEqual(c.pos,pos);}
  finally{RacingSteering.race=expert;c.track.sample=sample;}
});
test('keyboard and session procedures take explicit priority over neural racing',()=>{
  const s=new GrandPrixSimulation({drivers:2,formation:false,incidents:0}),c=s.cars[0];
  const old=c.neuralModel.predict;c.neuralModel.predict=()=>{throw new Error('Network must not override grid/manual');};
  c.force(s,s.cars);s.phase='RACE';s.raceTime=5;s.manual.enabled=true;s.manual.id=c.driver.id;s.manual.keys.add('ArrowUp');
  assert.ok(c.force(s,s.cars).mag()<=c.maxForce+1e-9);c.neuralModel.predict=old;
});
test('platform has distinct race/garage/training screens and no automatic training POST',()=>{
  const race=readFileSync(new URL('../apex-lab.html',import.meta.url),'utf8'),garage=readFileSync(new URL('../garage.html',import.meta.url),'utf8'),training=readFileSync(new URL('../training.html',import.meta.url),'utf8');
  assert.ok(race.includes('game.css'));assert.ok(garage.includes('garage-form'));assert.ok(training.includes('training-form'));
  const ui=readFileSync(new URL('../gp/training-ui.js',import.meta.url),'utf8');assert.ok(ui.includes('form.onsubmit'));assert.ok(ui.includes("api('/api/train'"));assert.ok(ui.includes('options.resume'));
  assert.equal(APEX_DRIVER_MODELS.models.length,22);
});


test('an untrained policy that stays off-track retires after the threshold without an autopilot rescue',()=>{
  const s=new GrandPrixSimulation({drivers:2,formation:false,incidents:0}),c=s.cars[0];s.phase='RACE';s.raceTime=1;c.pos.set(-1000,-1000);c.vel.set(0,0);
  for(let i=0;i<120;i++){s.time+=1/60;c.postStep(s,c.pos.copy());}assert.equal(c.retired,false);
  s.time+=1/60;c.postStep(s,c.pos.copy());assert.equal(c.retired,true);assert.equal(c.state,'DNF');
  assert.ok(s.director.events.some(e=>e.type==='NEURAL_OFF_TRACK'));assert.equal(c.pos.x,-1000);
});
