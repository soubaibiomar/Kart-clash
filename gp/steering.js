class RacingSteering {
  static velocity(car,target,speed){
    return p5.Vector.sub(target,car.pos).setMag(Math.max(0,speed)).sub(car.vel).limit(car.maxForce);
  }
  static race(car,sim,nearby){
    const track=car.track,p=car.driver.profile;
    if(sim.safetyCar.active&&!sim.safetyCar.inPit&&p5.Vector.dist(sim.safetyCar.pos,car.pos)<300)nearby=[...nearby,sim.safetyCar];
    const sample=track.sample(car.distance),curve=Math.max(track.curvature(car.distance,70),track.curvature(car.distance+55,85)*.95,track.curvature(car.distance+120,80)*.75);
    car.curvature=curve;
    const grip=car.tires.grip;
    car.maxForce=.24*(.85+p.braking*.2)*Math.max(.65,grip);
    let speed=7.2*p.pace*sim.config.difficulty*Math.sqrt(grip);
    if(sim.config.timedSession){const session=sim.config.sessionName||'FP1';speed*=session.startsWith('FP')?(session==='FP2'?.91:session==='FP3'?.98:.94):1+p.qualifying*.035;}
    speed*=1-car.damage*.25;
    speed*=1+Math.sin(sim.raceTime*(.6+p.adaptability*.3)+car.driver.id*13)*(1-p.consistency)*.04;
    const laneLimit=Math.min(track.radius-24,GP.clamp((1/Math.max(.001,curve)-45)*.45,18,42));
    car.desiredLane=GP.clamp(car.desiredLane,-laneLimit,laneLimit);
    const effectiveCurve=curve/Math.max(.4,1-Math.abs(car.lane)*curve);
    speed=Math.min(speed,Math.sqrt(.19*grip/Math.max(.003,effectiveCurve))*(.90+p.cornering*.12));
    const gap=car.front?car.front.distance-car.distance:Infinity;
    car.aero=sim.config.rules==='2026'?(curve<.0025?'LOW DRAG':'HIGH DOWNFORCE'):(gap<350&&curve<.0025&&car.lap>=1?'DRS':'CLOSED');
    if(gap>35&&gap<320&&car.front&&Math.abs(car.lane-car.front.lane)<16&&curve<.003)speed*=1.035;
    car.boost=car.state==='ATTACK'&&car.energy>15&&gap<Math.min(350,Math.max(100,car.vel.mag()*60))&&sim.director.flag==='GREEN';
    if(car.boost)speed*=sim.config.rules==='2026'?1.085:1.04;
    if(car.state==='SAVE_TYRES')speed*=.96;
    if(car.state==='SAVE_ENERGY')speed*=.94;
    if(car.finished)speed=Math.min(speed,3.6);
    if(car.blueFlag)speed*=.94;
    if(car.incidentUntil>sim.time){speed=Math.min(speed,1.3);car.desiredLane=GP.clamp(car.desiredLane+car.mistakeSide*20,-50,50);}
    if(car.pitRequested&&GP.mod(track.pitEntryAlong-GP.mod(car.distance,track.totalLength),track.totalLength)<190)speed=Math.min(speed,2.05);
    if(sim.director.flag==='YELLOW')speed=Math.min(speed,3.5);
    if(sim.director.flag==='VSC'||sim.director.flag==='SC')speed=Math.min(speed,sim.director.flag==='SC'?2.7:3.4);
    if(car.neutralPredecessor&&sim.director.flag!=='GREEN'){
      const previous=sim.cars.find(c=>c.driver.id===car.neutralPredecessor.id);
      if(previous&&!previous.inPit&&!previous.retired){const free=previous.distance-car.distance-85;speed=Math.min(speed,Math.max(0,previous.vel.mag()+free*.025));}
    }
    // Predict the occupied corridor, allowing a pass only after lateral separation.
    for(const other of nearby){
      if(other===car||other.inPit!==car.inPit)continue;
      const offset=p5.Vector.sub(other.pos,car.pos),along=offset.dot(sample.tangent),lateral=Math.abs(offset.dot(sample.normal));
      const closing=Math.max(0,car.vel.dot(sample.tangent)-other.vel.dot(sample.tangent));
      const braking=48+closing*closing/(2*car.maxForce);
      if(other.distance>car.distance&&along>0&&along<braking+90&&lateral<40){speed=Math.min(speed,Math.max(0,other.vel.mag()+(along-55)*.035));}
      const routeGap=other.distance-car.distance;
      const safetyGap=64/Math.max(.5,1-Math.abs(car.lane)*curve);
      if(routeGap>0&&routeGap<braking+160&&(Math.abs(car.lane-other.lane)<40||lateral<40))speed=Math.min(speed,Math.max(0,other.vel.mag()+(routeGap-safetyGap)*.032));
      if(Math.abs(routeGap)<65&&Math.abs(car.desiredLane-other.lane)<32&&Math.abs(car.lane-other.lane)>=30)car.desiredLane=car.lane;
    }
    if(car.sensors)speed=RacingSensors.safeSpeed(car,car.sensors,speed);
    const projection=track.project(car.pos,car.segmentIndex);
    if(projection.distance>track.radius-17){car.state='RECOVER';car.desiredLane=0;speed=Math.min(speed,1.8);}
    car.lane+=GP.clamp(car.desiredLane-car.lane,-.32,.32);
    const lookahead=Math.max(28,car.vel.mag()*8);
    const target=track.sample(car.distance+lookahead,car.lane).point;
    car.target=target;car.targetSpeed=speed;
    let force=RacingSteering.velocity(car,target,speed);
    const separation=car.separate(nearby).mult(.25);
    force.add(separation);
    if(car.sensors&&projection.distance>track.radius-25)force.add(RacingSensors.correction(car,car.sensors));
    return force.limit(car.maxForce);
  }
  static pit(car,sim){
    car.maxForce=.27;
    const track=car.track,progress=track.pitProject(car.pos).along;
    car.pitProgress=Math.max(car.pitProgress,progress);
    const box=track.boxes[car.driver.teamId];
    let target,speed=1.75;
    if(car.state==='PIT_IN'){
      target=track.pitSample(Math.min(box,progress+32)).point;
      speed=Math.min(speed,Math.max(0,(box-progress)*.045));
      if(Math.abs(box-progress)<9&&car.vel.mag()<.22){car.beginStop(sim);speed=0;}
    }else if(car.state==='PIT_STOP'){
      target=car.pos.copy();speed=0;
      if(sim.time>=car.serviceUntil){car.completeStop(sim);}
    }else{
      target=track.pitSample(progress+35).point;
      const exit=track.pitSample(track.pitLength).point;
      const unsafe=sim.cars.some(other=>other!==car&&!other.inPit&&!other.retired&&p5.Vector.dist(other.pos,exit)<70);
      if(track.pitLength-progress<100&&unsafe)speed=0;
      if(p5.Vector.dist(car.pos,exit)<18&&!unsafe){car.state='RACE';car.inPit=false;car.pitRequested=false;car.segmentIndex=track.project(car.pos).index;car.wrapped=track.project(car.pos).along;sim.director.emit('PIT_EXIT',`${car.driver.abbr} rejoins on ${GP.compounds[car.tires.compound].name.toLowerCase()} tyres.`,car);}
    }
    if(car.state!=='PIT_STOP')for(const other of sim.cars){
      if(other===car||!other.inPit)continue;
      const gap=track.pitProject(other.pos).along-progress;
      if(gap>0&&gap<90)speed=Math.min(speed,Math.max(0,other.vel.mag()+(gap-45)*.045));
    }
    car.target=target;car.targetSpeed=speed;
    return RacingSteering.velocity(car,target,speed);
  }
}
