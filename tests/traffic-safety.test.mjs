import test from 'node:test';
import assert from 'node:assert/strict';
import {setupGP} from './gp-harness.mjs';
function fixture(){const api=setupGP({neural:true}),sim=new api.GrandPrixSimulation({drivers:2,incidents:0,formation:false}),car=sim.cars[0],other=sim.cars[1];car.pos.set(0,0);car.vel.set(6,0);car.heading=0;car.track={borders:[],radius:100,curvature:()=>0,totalLength:10000,pitEntryAlong:9000};other.pos.set(65,0);other.vel.set(0,0);return {...api,sim,car,other};}
test('traffic rays use actual radii, ignore removed cars and brake for lapped traffic',()=>{
 const {RacingSensors:S,car,other}=fixture();other.r=10;other.distance=-100;car.distance=500;
 let scan=S.scan(car,[car,other]);assert.equal(scan.front.distance,55);assert.ok(S.safeSpeed(car,scan,8,true)<2);
 other.r=25;scan=S.scan(car,[car,other]);assert.equal(scan.front.distance,40);other.removed=true;assert.equal(S.scan(car,[car,other]).front.kind,'clear');other.removed=false;other.inPit=true;assert.equal(S.scan(car,[car,other]).front.kind,'clear');
});
test('head-on border correction chooses the open side and remains force bounded without moving the car',()=>{
 const {RacingSensors:S,car}=fixture(),pos=car.pos.copy(),ray={degrees:0,kind:'border',distance:10},scan={rays:[ray],left:{distance:200},right:{distance:20}};
 let force=S.correction(car,scan);assert.ok(force.y<0);assert.ok(force.mag()<=car.maxForce*.35+1e-9);assert.deepEqual(car.pos,pos);
 scan.left.distance=10;force=S.correction(car,scan);assert.ok(force.y>0);ray.distance=50;assert.equal(S.correction(car,scan).mag(),0);
});
test('neural desired speed respects braking clearance; disabling safety leaves the policy in control',()=>{
 const {RacingSensors:S,NeuralSteering:N,car,sim}=fixture();car.neuralModel.predict=()=>[.5,1];car.damage=0;car.sensors=S.scan(car,[]);car.sensors.front.kind='border';car.sensors.front.distance=car.r+8;
 let force=N.race(car,sim,[]);assert.equal(car.targetSpeed,0);assert.ok(force.x<0);assert.ok(force.mag()<=car.maxForce+1e-9);
 sim.safetyEnabled=false;N.race(car,sim,[]);assert.ok(car.targetSpeed>8);
 sim.safetyEnabled=true;car.sensors.front.distance=500;assert.equal(S.safeSpeed(car,car.sensors,3,true),3);
});
