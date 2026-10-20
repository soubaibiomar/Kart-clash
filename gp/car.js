class GrandPrixCar extends Vehicle {
  constructor(driver,track,compound,neural=false){
    const offset=-35-Math.floor((driver.grid-1)/2)*48-((driver.grid-1)%2)*7,lane=driver.grid%2?-26:26;
    const start=track.sample(offset,lane);super(start.point.x,start.point.y,12,.24);this.vel.set(0,0);
    this.driver=driver;this.track=track;this.brain=new DriverAgent(driver);this.neuralModel=neural?DriverNeuralModel.forDriver(driver.id):null;this.r=21;
    this.gridDistance=offset;this.gridLane=lane;this.distance=offset;this.wrapped=GP.mod(offset,track.totalLength);this.segmentIndex=start.index;
    this.lane=lane;this.desiredLane=lane;this.state='GRID';this.curvature=0;this.targetSpeed=0;this.heading=start.tangent.heading();
    this.tires=new TireSet(compound);this.usedCompounds=new Set([compound]);this.energy=100;
    this.initialCompound=compound;this.lapValid=true;
    this.availableSets={S:2,M:2,H:2,I:2,W:2};this.availableSets[compound]--;
    this.pitRequested=false;this.pitCompound='H';this.inPit=false;this.pitProgress=0;this.pitStops=0;this.pitHistory=[];this.pitPenalty=false;
    this.lap=0;this.lapTimes=[];this.lapClock=null;this.sectorClock=0;this.sectors=[];this.bestLap=Infinity;
    this.overtakes=0;this.attempts=0;this.penalty=0;this.warnings=0;this.finished=false;this.retired=false;this.finishTime=null;
    this.damage=0;this.contactForce=null;this.contactCooldown=0;
    this.incidentUntil=0;this.mistakeSide=1;this.formationDone=false;this.lastProgress=offset;this.lastProgressTime=0;this.telemetry=[];
    this.behaviors=new BehaviorManager(this);this.avoidance=new ObstacleAvoidanceBehavior();
    for(const name of ['grid','red-flag','retired','formation','reaction','pit','manual','expert','neural','leader-following'])this.behaviors.add({name,when:c=>c.mode===name,calculate:c=>c.calculate()},1);
    this.behaviors.add({name:'separation',when:c=>c.sim.safetyEnabled!==false&&['neural','leader-following'].includes(c.mode),calculate:c=>SteeringBehaviors.separation(this,c.nearby.filter(o=>o.inPit===this.inPit))},.45);
    this.behaviors.add({name:'avoidance',when:c=>c.sim.safetyEnabled!==false&&['neural','expert','leader-following'].includes(c.mode),calculate:c=>this.avoidance.calculate(this,c.mode==='expert'?(c.sim.obstacles||[]):[...c.nearby,...(c.sim.obstacles||[])],c.sim.config.sensorRange)},1.6);
    this.behaviors.add({name:'border-clearance',when:c=>c.sim.safetyEnabled!==false&&['neural','leader-following'].includes(c.mode),calculate:()=>this.sensors?RacingSensors.correction(this,this.sensors):createVector(0,0)},.8);
    const weights=this.neuralModel?.metadata.weights;
    for(const [key,name] of [['separation','separation'],['avoidance','avoidance'],['borders','border-clearance']])if(Number.isFinite(weights?.[key])&&weights[key]>=0&&weights[key]<=5)this.behaviors.changeWeight(name,weights[key]);
  }
  requestPit(compound,reason,sim){
    if(this.inPit||this.finished||this.retired||!GP.compounds[compound]||this.availableSets[compound]<=0)return false;
    this.pitRequested=true;this.pitCompound=compound;
    sim.director.emit('BOX',`${this.driver.abbr}: box for ${GP.compounds[compound].name.toLowerCase()} tyres — ${reason}.`,this);
    return true;
  }
  beginStop(sim){
    this.state='PIT_STOP';const team=sim.teams[this.driver.teamId];
    const occupied=sim.cars.find(c=>c!==this&&c.driver.teamId===this.driver.teamId&&c.state==='PIT_STOP');
    this.serviceDuration=2.1+sim.rng.range(0,.85)+(sim.rng.next()<.035?sim.rng.range(.7,2.5):0);
    this.serviceUntil=sim.time+this.serviceDuration+(occupied?Math.max(0,occupied.serviceUntil-sim.time):0);
    this.serviceStart=sim.time;
    sim.director.emit('PIT_STOP',`${this.driver.abbr} is in the ${this.driver.team} box. ${team.style}.`,this);
  }
  completeStop(sim){
    this.overcutUsed=false;this.overcutUntil=0;
    this.availableSets[this.pitCompound]--;
    this.tires=new TireSet(this.pitCompound);this.usedCompounds.add(this.pitCompound);this.pitStops++;
    this.pitHistory.push({lap:this.lap,compound:this.pitCompound,stationary:sim.time-this.serviceStart});
    this.state='PIT_OUT';sim.director.emit('TYRES',`${this.driver.abbr}: ${this.pitHistory.at(-1).stationary.toFixed(2)}s stop, fresh ${GP.compounds[this.pitCompound].name.toLowerCase()} tyres.`,this);
  }
  steer(mode,calculate,sim,nearby){this.behaviorMode=mode;return this.behaviors.getSteeringForce({mode,calculate,sim,nearby});}
  force(sim,nearby){
    if(sim.director.flag==='RED')return this.steer('red-flag',()=>sim.director.redForce(this),sim,nearby);
    if(this.retired)return this.steer('retired',()=>this.vel.copy().mult(-1).limit(this.maxForce),sim,nearby);
    if(sim.phase==='GRID'||sim.phase==='LIGHTS')return this.steer('grid',()=>this.vel.copy().mult(-1).limit(this.maxForce),sim,nearby);
    if(sim.phase==='FORMATION'){
      this.state='FORMATION';this.maxForce=.22;
      const remaining=this.gridDistance+this.track.totalLength-this.distance;
      const target=remaining<80?this.track.sample(this.gridDistance,this.gridLane).point:this.track.sample(this.distance+38,this.gridLane).point;
      let speed=Math.min(3.6,Math.sqrt(.18/Math.max(.003,this.track.curvature(this.distance))));
      if(remaining<100)speed=Math.min(speed,Math.max(0,remaining*.035));
      if(remaining<9&&this.vel.mag()<.25)this.formationDone=true;
      if(this.formationDone)speed=0;
      return this.steer('formation',()=>RacingSteering.velocity(this,target,speed),sim,nearby);
    }
    if(sim.raceTime<this.driver.profile.reaction)return this.steer('reaction',()=>this.vel.copy().mult(-1).limit(this.maxForce),sim,nearby);
    if(this.inPit)return this.steer('pit',()=>RacingSteering.pit(this,sim),sim,nearby);
    if(this.pitRequested){
      const toEntry=GP.mod(this.track.pitEntryAlong-GP.mod(this.distance,this.track.totalLength),this.track.totalLength);
      if(toEntry<55){
        this.inPit=true;this.state='PIT_IN';this.pitProgress=0;this.pitPenalty=false;
        this.pitBase=Math.round((this.distance-this.track.pitEntryAlong)/this.track.totalLength)*this.track.totalLength+this.track.pitEntryAlong;
        sim.director.emit('PIT_ENTRY',`${this.driver.abbr} enters the pit lane.`,this);
        return this.steer('pit',()=>RacingSteering.pit(this,sim),sim,nearby);
      }
    }
    if(!this.sensors||sim.tick%6===this.driver.id%6)this.sensors=RacingSensors.scan(this,[...nearby,...(sim.obstacles||[])],sim.config.sensorRange);
    if(sim.manual?.enabled&&sim.manual.id===this.driver.id&&!this.finished)return this.steer('manual',()=>sim.manual.force(this,sim),sim,nearby);
    this.brain.decide(this,sim,nearby);
    if(sim.config.policy==='neural'&&sim.director.flag==='SC'){const leader=sim.cars.find(c=>c.driver.id===this.neutralPredecessor?.id&&!c.retired&&!c.inPit)||(sim.safetyCar.active&&!sim.safetyCar.inPit?sim.safetyCar:null);if(leader)return this.steer('leader-following',()=>SteeringBehaviors.followLeader(this,leader,85,2.7),sim,nearby);}
    const neural=sim.config.policy==='neural';return this.steer(neural?'neural':'expert',()=>neural?NeuralSteering.race(this,sim,nearby):RacingSteering.race(this,sim,nearby),sim,nearby);
  }
  postStep(sim,oldPosition){
    const before=this.distance;
    if(this.inPit){
      const progress=this.track.pitProject(this.pos).along;
      const mapped=this.pitBase+progress/this.track.pitLength*this.track.pitSpan;
      this.distance+=GP.clamp(mapped-this.distance,0,this.vel.mag()*1.5+2);
      this.speedingTicks=this.state!=='PIT_STOP'&&progress>95&&this.vel.mag()>1.95?(this.speedingTicks||0)+1:0;
      if(this.speedingTicks>30&&!this.pitPenalty){this.pitPenalty=true;sim.director.penalty(this,5,'pit-lane speeding');}
    }else{
      const projection=this.track.project(this.pos,this.segmentIndex);this.segmentIndex=projection.index;
      const delta=GP.delta(projection.along,GP.mod(this.distance,this.track.totalLength),this.track.totalLength);
      this.distance+=GP.clamp(delta,-1,this.vel.mag()*2+2);
      this.wrapped=projection.along;
      if(projection.distance>this.track.radius+8&&sim.time>(this.nextWarning||0)&&sim.phase==='RACE'){
        this.warnings++;this.nextWarning=sim.time+5;sim.director.emit('TRACK_LIMITS',`${this.driver.abbr}: track-limit warning ${this.warnings}.`,this,5);
        this.lapValid=false;
        if(this.warnings%4===0)sim.director.penalty(this,5,'repeated track limits');
      }
    }
    if(sim.config.policy==='neural'&&sim.phase==='RACE'&&!this.inPit&&!this.finished&&!this.retired){const outside=this.track.project(this.pos,this.segmentIndex).distance>this.track.radius+this.r;this.offTrackTicks=outside?(this.offTrackTicks||0)+1:0;if(this.offTrackTicks>120||sim.time-this.lastProgressTime>25){this.retired=true;this.state='DNF';this.recoveryAt=sim.time+10;sim.director.emit('NEURAL_OFF_TRACK',`${this.driver.abbr}: off track. This model needs more training.`,this);}}
    if(this.vel.mag()>.1){const angle=this.vel.heading();this.heading+=Math.atan2(Math.sin(angle-this.heading),Math.cos(angle-this.heading))*.25;}
    if(sim.phase==='FORMATION'||sim.phase==='LIGHTS')this.tires.update(this,sim.environment,0,sim.config);
    if(sim.phase!=='RACE')return;
    const moved=p5.Vector.dist(oldPosition,this.pos);
    this.tires.update(this,sim.environment,moved,sim.config);
    this.energy=GP.clamp(this.energy+(this.boost?-9.5:this.curvature>.006?5:2.2)*GP.DT,0,100);
    if(this.distance-before>.05){this.lastProgressTime=sim.time;}
    if(this.finished||this.retired)return;
    if(before<0&&this.distance>=0){this.lapClock=sim.raceTime;this.sectorClock=sim.raceTime;}
    const oldSector=Math.floor(Math.max(0,before)/(this.track.totalLength/3)),sector=Math.floor(Math.max(0,this.distance)/(this.track.totalLength/3));
    if(sector>oldSector){this.sectors.push(sim.raceTime-this.sectorClock);this.sectorClock=sim.raceTime;if(this.sectors.length>3)this.sectors.shift();}
    const completed=Math.max(0,Math.floor(this.distance/this.track.totalLength));
    const crossed=completed>this.lap;
    if(crossed){
      const duration=sim.raceTime-(this.lapClock??0);this.lap=completed;this.lapTimes.push(duration);this.lapClock=sim.raceTime;
      if(this.lapValid){if(duration<this.bestLap){this.bestLap=duration;this.bestSetAt=sim.raceTime;}sim.director.lap(this,duration);}this.lapValid=true;
    }
    if(!sim.config.timedSession&&(this.lap>=sim.config.laps||sim.chequered&&crossed)&&!this.inPit){
      if(SportingRules.compoundRequired(sim,this)&&this.usedCompounds.size<2){SportingRules.disqualify(sim,this,'second dry compound not used');return;}
      sim.chequered=true;this.finished=true;this.state='FINISHED';this.finishTime=sim.raceTime+this.penalty;sim.director.emit('FINISH',`${this.driver.abbr} takes the checkered flag.`,this);
    }
    if(sim.tick%60===0){const leader=sim.order()[0];this.telemetry.push({t:sim.raceTime,speed:this.vel.mag()*45,wear:this.tires.wear,energy:this.energy,gap:Math.max(0,(leader.distance-this.distance)/Math.max(100,leader.vel.mag()*60))});if(this.telemetry.length>600)this.telemetry.shift();}
  }
  render(selected=false,debug=false){
    if(this.removed)return;
    if(debug&&selected)RacingSensors.render(this);
    if(debug&&this.target){stroke('#b7e6d155');strokeWeight(1);line(this.pos.x,this.pos.y,this.target.x,this.target.y);noFill();ellipse(this.target.x,this.target.y,8,8);}
    push();translate(this.pos.x,this.pos.y);rotate(this.heading);rectMode(CENTER);noStroke();
    if(selected){noFill();stroke('#eff7bf');strokeWeight(2);ellipse(0,0,62,62);noStroke();}
    fill('#00000066');rect(2,3,43,29,7);
    for(const x of [-11,11])for(const y of [-12,12]){fill('#070b0d');rect(x,y,11,7,2);fill(GP.compounds[this.tires.compound].color);rect(x,y,1.5,6);}
    fill(this.retired?'#657275':this.driver.color);rect(-19,0,5,28,1);rect(19,0,4,29,1);rect(-5,0,24,14,4);triangle(3,-5,3,5,18,0);
    fill('#dbe8e5');rect(-19,0,2,22);rect(19,0,1,23);fill('#142425');ellipse(-1,0,10,9);noFill();stroke('#d5e2db');strokeWeight(1.2);arc(1,0,11,11,-HALF_PI,HALF_PI);
    noStroke();fill('#101917');textAlign(CENTER,CENTER);textStyle(BOLD);textSize(8);text(this.driver.number,-10,0);pop();
  }
}
