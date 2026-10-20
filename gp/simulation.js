class NearbyGrid {
  constructor(cars){this.cells=new Map();for(const c of cars){const key=`${Math.floor(c.pos.x/240)},${Math.floor(c.pos.y/240)}`;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(c);}}
  near(car){const x=Math.floor(car.pos.x/240),y=Math.floor(car.pos.y/240),result=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)result.push(...(this.cells.get(`${x+dx},${y+dy}`)||[]));return result;}
}
class GrandPrixSimulation {
  constructor(options={}){
    this.config={...GP.defaults,...options};
    this.config.drivers=Math.round(GP.clamp(Number(this.config.drivers)||22,2,22));this.config.laps=Math.round(GP.clamp(Number(this.config.laps)||6,1,100));
    for(const [key,min,max] of [['wear',.1,4],['difficulty',.7,1.3],['incidents',0,5]])this.config[key]=GP.clamp(Number(this.config[key])||0,min,max);
    this.config.sensorRange=GP.clamp(Number(this.config.sensorRange)||220,60,500);
    this.rng=new RaceRandom(this.config.seed);this.track=new GrandPrixCircuit(this.config.circuit);
    this.tick=0;this.time=0;this.raceTime=0;this.raceStartTick=null;this.phase='GRID';this.phaseStart=0;this.paused=false;this.accumulator=0;
    this.environment=new RaceEnvironment(this.config,this.rng);this.wetRace=this.environment.wetness>.12;
    this.director=new RaceDirector(this);this.teams=GP.teams.map((_,i)=>new TeamStrategyAgent(i,this.rng));
    this.cars=createGrid(this.config,this.rng).map((d,i)=>new GrandPrixCar(d,this.track,this.environment.preferred()||(i%3===0?'S':i%3===1?'M':'H'),this.config.policy==='neural'));
    this.safetyCar=new SafetyCar(this.track);this.lastEvent=null;this.finalLapAnnounced=false;
    this.crew=GP.teams.flatMap((_,team)=>Array.from({length:4},(_,slot)=>new PitCrewMember(team,slot,this.track)));
    this.manual=new ManualControl();this.sessionEnd=null;this.sessionDeadline=null;this.redStart=null;
    this.activeBoxes=new Map();
    this.obstacles=[];this.serviceVehicles=[];this.serviceScenario='off';this.safetyEnabled=true;this.serviceRng=new RaceRandom((this.config.seed^0x51a7)>>>0);this.serviceAccumulator=0;this.servicePaused=false;
    this.director.emit('GRID',`${this.cars.length} drivers. ${this.config.laps} laps. ${this.track.name}.`);
  }
  start(){if(this.phase!=='GRID')return;if(this.config.timedSession){this.phase='RACE';this.phaseStart=this.time;this.raceStartTick=this.tick;this.sessionDeadline=this.config.sessionDuration;for(const c of this.cars){c.state='RACE';c.lastProgressTime=this.time;}this.director.emit('SESSION_START',`${this.config.sessionName}: timed running begins.`);return;}this.phase=this.config.formation?'FORMATION':'LIGHTS';this.phaseStart=this.time;this.director.emit(this.phase,this.config.formation?'Formation lap. Bring the tyres into the window.':'The grid is ready. Watch the lights.');}
  addObstacle(position,radius=18){
    if(this.obstacles.length>=20||!Number.isFinite(position?.x)||!Number.isFinite(position?.y))return null;
    position=createVector(position.x,position.y);radius=GP.clamp(Number(radius)||18,8,30);if(this.track.project(position).distance>this.track.radius-radius)return null;
    const obstacle=new TrackObstacle(position.x,position.y,radius);this.obstacles.push(obstacle);return obstacle;
  }
  setServiceScenario(mode){
    if(!['off','wander','flock','leader','pursue-evade'].includes(mode))throw new Error('Unknown service scenario');
    if(!this.serviceVehicles.length&&mode!=='off'){
      let center={x:this.track.width*.1,y:this.track.height*.1};
      for(const x of [.15,.35,.65,.85])for(const y of [.15,.35,.65,.85]){const point=createVector(this.track.width*x,this.track.height*y);if(this.track.project(point).distance>this.track.radius+180)center=point;}
      this.serviceArea={x:center.x-100,y:center.y-80,width:200,height:160};
      this.serviceVehicles=Array.from({length:4},(_,i)=>new ServiceVehicle(center.x+(i%2?25:-25),center.y+(i<2?-20:20),i));
    }
    this.serviceScenario=mode;
    if(mode==='off')this.serviceAccumulator=0;
  }
  advanceServices(seconds,speed=1){
    if(this.paused||this.servicePaused||this.serviceScenario==='off')return 0;
    this.serviceAccumulator+=GP.clamp(Number(seconds)||0,0,.25)*GP.clamp(Number(speed)||1,1,16);let steps=0;
    while(this.serviceAccumulator+1e-10>=GP.DT){this.serviceAccumulator-=GP.DT;for(const vehicle of this.serviceVehicles)vehicle.step(this,this.serviceVehicles);steps++;}return steps;
  }
  advance(seconds,speed=1){
    if(this.paused)return 0;if(this.phase==='GRID'||this.phase==='COMPLETE'){this.advanceServices(seconds,speed);return 0;}
    this.accumulator+=GP.clamp(Number(seconds)||0,0,.25)*GP.clamp(Number(speed)||1,1,16);let steps=0;
    while(this.accumulator+1e-10>=GP.DT){this.accumulator-=GP.DT;this.step();steps++;if(this.phase==='COMPLETE')break;}return steps;
  }
  order(){return [...this.cars].sort((a,b)=>{
    if(this.config.timedSession)return a.bestLap-b.bestLap||(a.bestSetAt??Infinity)-(b.bestSetAt??Infinity)||a.driver.grid-b.driver.grid;
    if(a.finished&&b.finished)return b.lap-a.lap||a.finishTime-b.finishTime;
    if(a.finished!==b.finished)return a.finished?-1:1;
    if(a.retired!==b.retired)return a.retired?1:-1;
    return b.distance-a.distance||a.driver.grid-b.driver.grid;
  });}
  step(){
    if(this.paused||this.phase==='GRID'||this.phase==='COMPLETE')return;
    this.tick++;this.time=this.tick*GP.DT;if(this.phase==='SUSPENDED')this.raceTime=this.redRaceTime;else if(this.raceStartTick!==null)this.raceTime=(this.tick-this.raceStartTick)*GP.DT;
    if(this.phase==='FORMATION'&&this.cars.every(c=>c.formationDone)){
      this.phase='LIGHTS';this.phaseStart=this.time;
      for(const car of this.cars){car.distance=car.gridDistance;car.wrapped=this.track.project(car.pos).along;car.state='GRID';}
      this.director.emit('LIGHTS','Five lights. The race starts on lights out.');
    }
    if(this.phase==='LIGHTS'&&this.time-this.phaseStart>=6){
      this.phase='RACE';this.raceStartTick=this.tick;this.raceTime=0;
      for(const car of this.cars){car.state='RACE';car.brain.nextDecision=this.time;car.lastProgressTime=this.time;}
      this.director.emit('LIGHTS_OUT','Lights out! The Grand Prix is under way.');
    }
    if(this.phase==='RACE'){
      this.environment.update(this);this.wetRace ||= this.environment.wetness>.12;for(const team of this.teams)team.update(this);
      // Probabilities use only the seeded simulation clock, never rendering frames.
      if(this.tick%60===0&&this.config.incidents>0){for(const car of this.cars){
        if(car.retired||car.finished||car.inPit)continue;
        const risk=car.driver.profile.mistakes*this.config.incidents*(car.state==='ATTACK'?1.8:.35)*(1+car.tires.wear*2+this.environment.wetness)*car.driver.profile.risk*(1-car.driver.profile.consistency*.4);
        if(this.rng.next()<risk&&car.curvature>.003){
          car.incidentUntil=this.time+2;car.mistakeSide=this.rng.next()<.5?-1:1;
          const neutralized=this.director.flag==='SC'||this.director.flag==='VSC';
          if(!neutralized){this.director.flag='YELLOW';this.director.until=this.time+4;}
          this.director.emit(neutralized?'INCIDENT':'YELLOW',`${car.driver.abbr} runs wide — ${neutralized?'neutralisation remains in effect':'yellow flag, slow through the incident'}.`,car);
        }
        if(this.rng.next()<(1-car.driver.profile.reliability)*.012*this.config.incidents){car.retired=true;car.state='DNF';car.recoveryAt=this.time+20;this.director.emit('DNF',`${car.driver.abbr} retires with a mechanical problem.`,car);this.director.neutralize('VSC',10);}
      }}
    }
    for(const c of this.cars)if(c.retired&&c.recoveryAt&&this.time>=c.recoveryAt)c.removed=true;
    const grid=new NearbyGrid(this.cars.filter(c=>!c.removed));
    const positions=this.cars.map(c=>c.pos.copy());
    for(const car of this.cars){const force=car.force(this,grid.near(car));if(car.contactForce){force.add(car.contactForce);car.behaviors.last.components.push({name:'contact',weight:1,force:{x:car.contactForce.x,y:car.contactForce.y}});car.contactForce=null;}force.limit(car.maxForce);car.behaviors.last.applied={x:force.x,y:force.y};car.applyForce(force);}
    for(let i=0;i<this.cars.length;i++){const car=this.cars[i];car.update();car.postStep(this,positions[i]);}
    RacingContacts.resolve(this);
    this.activeBoxes=new Map(this.cars.filter(c=>c.state==='PIT_STOP').map(c=>[c.driver.teamId,c]));
    for(const member of this.crew)member.step(this);
    this.safetyCar.step();this.director.update();
    for(const obstacle of this.obstacles)obstacle.update();
    if(this.serviceScenario!=='off'&&!this.servicePaused)for(const vehicle of this.serviceVehicles)vehicle.step(this,this.serviceVehicles);
    if(this.phase==='RACE'&&this.config.timedSession){
      if(this.raceTime>=this.sessionDeadline&&!this.sessionEnd){this.sessionEnd=new Map(this.cars.filter(c=>!c.retired).map(c=>[c.driver.id,c.lap]));this.director.emit('SESSION_CLOCK','Clock expired. Finish the flying lap.');}
      if(this.sessionEnd)for(const car of this.cars){if(!car.retired&&(car.lap>(this.sessionEnd.get(car.driver.id)??car.lap)||this.raceTime>=this.sessionDeadline+120)){car.finished=true;car.state='SESSION_DONE';}}
      if(this.cars.every(c=>c.finished||c.retired)){this.phase='COMPLETE';this.results=this.order();if(['Q1','SQ1'].includes(this.config.sessionName)){const fastest=this.results[0]?.bestLap;for(const c of this.results)c.qualifyingReview=!SportingRules.qualifying107(c.bestLap,fastest,this.wetRace);}this.director.emit('SESSION_END',`${this.config.sessionName} complete. Classification uses valid flying laps.`);}
      return;
    }
    if(this.phase==='RACE'){
      const leader=this.order()[0];
      if(!this.finalLapAnnounced&&leader.lap>=this.config.laps-1){this.finalLapAnnounced=true;this.director.emit('FINAL_LAP',`Final lap. ${leader.driver.abbr} leads the Grand Prix.`);}
      if(this.cars.every(c=>c.finished||c.retired)){
        this.phase='COMPLETE';this.results=this.order();const winner=this.results.find(c=>c.finished);
        for(const car of this.results)car.classified=SportingRules.classified(car,winner?.lap||0);
        this.results.forEach((car,i)=>car.points=car.classified?SportingRules.points(i+1,this.config.sprint):0);
        this.director.emit('WINNER',winner?`${winner.driver.name} wins for ${winner.driver.team}!`:'Race ended without a classified finisher.');
      }
    }
  }
  snapshot(){return {tick:this.tick,phase:this.phase,flag:this.director.flag,rng:this.rng.state,cars:this.cars.map(c=>({id:c.driver.id,x:+c.pos.x.toFixed(5),y:+c.pos.y.toFixed(5),distance:+c.distance.toFixed(5),lap:c.lap,wear:+c.tires.wear.toFixed(6),state:c.state,pits:c.pitStops,finished:c.finished,penalty:c.penalty}))};}
}
