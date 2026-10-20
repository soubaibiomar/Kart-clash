import vm from 'node:vm';
import {readFileSync} from 'node:fs';
class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  set(x, y) { if (typeof x === 'object') { this.x = x.x; this.y = x.y; } else { this.x = x; this.y = y; } return this; }
  add(x, y) { if (typeof x === 'object') { this.x += x.x; this.y += x.y; } else { this.x += x; this.y += y; } return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { return this.mult(1 / n); }
  mag() { return Math.hypot(this.x, this.y); }
  normalize() { const length = this.mag(); return length ? this.div(length) : this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  dot(v) { return this.x * v.x + this.y * v.y; }
  heading() { return Math.atan2(this.y, this.x); }
  static sub(a, b) { return a.copy().sub(b); }
  static add(a, b) { return a.copy().add(b); }
  static dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
}

export function setupGP({neural=false}={}){
  const context=vm.createContext({p5:{Vector},createVector:(x,y)=>new Vector(x,y),random:(a,b)=>b===undefined?a*.5:(a+b)*.5,PI:Math.PI,HALF_PI:Math.PI/2,TWO_PI:Math.PI*2,cos:Math.cos,sin:Math.sin,min:Math.min,max:Math.max});
  for(const file of ['path.js','vehicle.js','gp/config.js','gp/circuitData.js','gp/circuit.js','gp/tires.js','gp/sensors.js','gp/manualControl.js','gp/steering.js','gp/driverAgent.js','gp/teamStrategy.js','gp/sportingRules.js','gp/raceDirector.js','gp/neuralModel.js','gp/models/driver-models.js','gp/neuralSteering.js','gp/behaviorManager.js','gp/steeringBehaviors.js','gp/obstacleAvoidanceBehavior.js','gp/trackObstacle.js','gp/serviceVehicle.js','gp/car.js','gp/safetyCar.js','gp/pitCrewMember.js','gp/contacts.js','gp/simulation.js','gp/weekend.js','gp/teamRadio.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
  if(!neural)vm.runInContext("GP.defaults.policy='expert'",context);
  return vm.runInContext('({GP,GrandPrixSimulation,GrandPrixCar,GrandPrixCircuit,Vehicle,TireSet,RaceRandom,RacingSteering,RacingContacts,RacingSensors,ManualControl,F1_CIRCUITS,RaceWeekend,SportingRules,DriverNeuralModel,NeuralSteering,APEX_DRIVER_MODELS,TeamRadio,BehaviorManager,SteeringBehaviors,ObstacleAvoidanceBehavior,TrackObstacle,ServiceVehicle})',context);
}
