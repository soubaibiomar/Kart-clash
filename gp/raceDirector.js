class RaceDirector {
  constructor(sim){this.sim=sim;this.flag='GREEN';this.until=0;this.events=[];this.cooldowns=new Map();this.fastest=null;this.passes=0;this.pending=new Map();this.lastOrder=[];}
  emit(type,message,car=null,cooldown=0){
    const key=`${type}:${car?car.driver.id:''}`;
    if(this.sim.time<(this.cooldowns.get(key)||0))return;
    this.cooldowns.set(key,this.sim.time+cooldown);
    const event={tick:this.sim.tick,time:this.sim.raceTime,type,message,driver:car?car.driver.id:null,flag:this.flag};
    this.events.push(event);if(this.events.length>400)this.events.shift();
    this.sim.lastEvent=event;
  }
  neutralize(type='SC',duration=18){
    if(this.sim.phase!=='RACE')return;
    if(this.flag==='SC'&&type==='VSC'){this.until=Math.max(this.until,this.sim.time+duration);return;}
    this.flag=type;this.until=this.sim.time+duration;
    const order=this.sim.order();order.forEach((car,i)=>car.neutralPredecessor=i?{id:order[i-1].driver.id}:null);
    this.emit(type,`${type==='SC'?'Safety Car deployed':'Virtual Safety Car'} — no overtaking. Preserve the gaps.`);
    if(type==='SC')this.sim.safetyCar.deploy();
  }
  yellow(duration=8){if(this.sim.phase!=='RACE'||['SC','VSC','RED'].includes(this.flag))return false;this.flag='YELLOW';this.until=this.sim.time+duration;const order=this.sim.order();order.forEach((c,i)=>c.neutralPredecessor=i?{id:order[i-1].driver.id}:null);this.pending.clear();this.emit('YELLOW','Yellow flags: reduce speed, no overtaking.');return true;}
  redFlag(reason='Race-control intervention'){
    const s=this.sim;if(s.phase!=='RACE')return false;
    this.flag='RED';this.until=Infinity;this.pending.clear();s.phase='SUSPENDED';s.redStart=s.tick;s.redRaceTime=s.raceTime;
    s.safetyCar.recall();for(const c of s.cars){c.redProgress=0;c.redInPit=c.inPit;c.state=c.retired?'DNF':'RED_RETURN';}
    this.emit('RED',`Red flag: ${reason}. Return slowly to the pit lane.`);return true;
  }
  redForce(car){
    if(car.retired)return car.vel.copy().mult(-1).limit(car.maxForce);
    const t=car.track;
    if(!car.redInPit){
      const toEntry=GP.mod(t.pitEntryAlong-GP.mod(car.distance,t.totalLength),t.totalLength);
      if(toEntry<40){car.redInPit=true;car.inPit=true;car.redProgress=0;car.pitBase=Math.round((car.distance-t.pitEntryAlong)/t.totalLength)*t.totalLength+t.pitEntryAlong;}
      else return RacingSteering.velocity(car,t.sample(car.distance+32,0).point,Math.min(2.1,Math.sqrt(.15/Math.max(.003,t.curvature(car.distance)))));
    }
    const progress=t.pitProject(car.pos).along;car.redProgress=Math.max(car.redProgress,progress);
    const stop=t.pitLength*(.13+car.driver.teamId*.065),remaining=stop-progress;
    const sample=t.pitSample(Math.min(stop,progress+25)),side=car.driver.id%2?18:-18;
    const target=sample.point.add(createVector(-sample.tangent.y,sample.tangent.x).mult(side));
    const distance=p5.Vector.dist(car.pos,target),speed=Math.max(0,Math.min(1.4,Math.max(remaining,distance)*.035));
    if(remaining<10&&distance<8&&car.vel.mag()<.2)car.state='RED_HOLD';
    return RacingSteering.velocity(car,target,speed);
  }
  resumeRed(){
    const s=this.sim;if(s.phase!=='SUSPENDED'||s.cars.some(c=>!c.retired&&c.state!=='RED_HOLD'))return false;
    s.raceStartTick+=s.tick-s.redStart;s.phase='RACE';s.raceTime=s.redRaceTime;
    for(const c of s.cars){if(!c.retired){c.state='PIT_OUT';c.inPit=true;c.pitProgress=c.track.pitProject(c.pos).along;c.pitBase=c.distance-c.pitProgress/c.track.pitLength*c.track.pitSpan;}c.redInPit=false;}
    this.flag='GREEN';this.emit('RESTART','Session resumes with a controlled rolling release.');if(!s.config.timedSession)this.neutralize('SC',15);return true;
  }
  penalty(car,seconds,reason){car.penalty+=seconds;if(car.finished)car.finishTime+=seconds;this.emit('PENALTY',`${car.driver.abbr}: ${seconds}s penalty — ${reason}.`,car);}
  lap(car,lapTime){
    if(!this.fastest||lapTime<this.fastest.time){this.fastest={id:car.driver.id,name:car.driver.abbr,time:lapTime};this.emit('FASTEST_LAP',`${car.driver.abbr} sets the fastest lap: ${GP.time(lapTime)}.`,car);}
  }
  update(){
    const sim=this.sim;
    if(this.flag!=='GREEN'&&this.flag!=='RED'&&sim.time>=this.until){this.flag='GREEN';for(const car of sim.cars)car.neutralPredecessor=null;sim.safetyCar.recall();this.emit('GREEN','Green flag. Racing resumes.');}
    if(sim.tick%15!==0||sim.phase!=='RACE')return;
    const order=sim.order().filter(c=>!c.retired&&!c.finished),ids=order.map(c=>c.driver.id);
    if(this.flag!=='GREEN'){this.pending.clear();this.lastOrder=ids;return;}
    for(let i=0;i<order.length;i++)for(let j=i+1;j<Math.min(order.length,i+4);j++){
      const a=order[i],b=order[j],oldA=this.lastOrder.indexOf(a.driver.id),oldB=this.lastOrder.indexOf(b.driver.id),key=`${a.driver.id}:${b.driver.id}`;
      if(oldA>oldB&&oldB>=0&&!a.inPit&&!b.inPit&&this.flag==='GREEN'&&a.distance-b.distance<170)this.pending.set(key,{a,b,since:sim.time});
    }
    for(const [key,pass] of this.pending){
      if(pass.a.distance<pass.b.distance||pass.a.inPit||pass.b.inPit){this.pending.delete(key);continue;}
      if(pass.a.distance-pass.b.distance>42&&sim.time-pass.since>.4){this.passes++;pass.a.overtakes++;this.emit('OVERTAKE',`${pass.a.driver.abbr} passes ${pass.b.driver.abbr} for P${sim.order().indexOf(pass.a)+1}.`,pass.a,3);this.pending.delete(key);}
    }
    this.lastOrder=ids;
  }
}
