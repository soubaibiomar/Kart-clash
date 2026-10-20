class DriverAgent {
  constructor(driver){this.driver=driver;this.nextDecision=0;this.holdUntil=0;this.attackSide=0;this.opponent=null;}
  decide(car,sim,nearby){
    if(this.radioOrder&&sim.time>=this.radioOrder.until){this.radioOrder=null;this.nextDecision=0;}
    if(car.inPit||car.retired||car.finished||sim.time<this.nextDecision)return;
    const p=this.driver.profile;this.nextDecision=sim.time+(.18+p.reaction*.35)/(p.adaptability+.5);
    const rivals=nearby.filter(other=>other!==car&&!other.retired&&!other.finished&&!other.inPit);
    const disabled=nearby.find(other=>other!==car&&other.retired&&p5.Vector.sub(other.pos,car.pos).dot(car.track.sample(car.distance).tangent)>0&&p5.Vector.dist(other.pos,car.pos)<200);
    if(disabled){car.state='RECOVER';car.desiredLane=disabled.lane>=0?-42:42;return;}
    car.blueFlag=false;
    const lapping=rivals.find(other=>other.lap>car.lap&&p5.Vector.dist(other.pos,car.pos)<180);
    if(lapping){car.blueFlag=true;car.desiredLane=(this.driver.id%2?1:-1)*42;car.state='FOLLOW';sim.director.emit('BLUE_FLAG',`${car.driver.abbr}: blue flags, give ${lapping.driver.abbr} room.`,car,15);return;}
    car.front=rivals.filter(other=>other.distance>car.distance&&other.distance-car.distance<400).sort((a,b)=>a.distance-b.distance)[0]||null;
    car.rear=rivals.filter(other=>other.distance<car.distance&&car.distance-other.distance<240).sort((a,b)=>b.distance-a.distance)[0]||null;
    if(sim.director.flag!=='GREEN'){car.state='SAFETY_CAR';car.desiredLane=0;return;}
    if(sim.time-car.lastProgressTime>8){car.state='RECOVER';car.desiredLane=car.lane>=0?-42:42;return;}
    if(this.radioOrder){
      car.state=this.radioOrder.state;
      // Keep sensed occupied lanes authoritative; a radio order cannot authorize a collision.
      car.desiredLane=(this.driver.id%2?1:-1)*19;
      if(car.state==='ATTACK'&&car.front){const side=car.lane<=car.front.lane?-1:1;if(!(side<0?car.sensors?.leftOccupied:car.sensors?.rightOccupied))car.desiredLane=side*42;}
      if(car.state==='DEFEND'&&car.rear)car.desiredLane=car.rear.desiredLane*.45;
      return;
    }
    const front=car.front,gap=front?front.distance-car.distance:Infinity;
    const remaining=sim.config.laps-car.distance/car.track.totalLength;
    if(this.opponent&&this.opponent.distance<car.distance-60){this.opponent=null;this.holdUntil=0;}
    if(car.state==='ATTACK'&&this.opponent&&(sim.time<this.holdUntil||Math.abs(this.opponent.distance-car.distance)<75)){car.desiredLane=this.attackSide*42;return;}
    const advantage=front?(p.pace*car.tires.grip-front.driver.profile.pace*front.tires.grip):0;
    if(front&&gap<240&&gap>15&&car.energy>18&&car.tires.grip>.45&&(advantage>-.04*p.risk||remaining<1.3)&&p.aggression>.64){
      const a=car.track.sample(car.distance).tangent,b=car.track.sample(car.distance+100).tangent;
      const turn=a.x*b.y-a.y*b.x;
      let side=Math.abs(turn)>.1?Math.sign(turn):(car.lane<=front.lane?-1:1);
      const blocked=sign=>(sign<0?car.sensors?.leftOccupied:car.sensors?.rightOccupied)||rivals.some(other=>Math.abs(other.distance-car.distance)<120&&Math.abs(other.lane-sign*42)<30);
      if(blocked(side))side=-side;
      if(!blocked(side)){
        if(this.opponent!==front){sim.director.emit('ATTACK',`${car.driver.abbr} attacks ${front.driver.abbr} — ${Math.abs(turn)>.1?'a move into the braking zone':'building speed in the slipstream'}.`,car,8);car.attempts++;}
        this.attackSide=side;this.opponent=front;this.holdUntil=sim.time+2+p.overtaking*2;
        car.state='ATTACK';car.desiredLane=side*42;return;
      }
    }
    if(car.rear&&car.rear.state==='ATTACK'&&car.distance-car.rear.distance<140&&p.defense>.75){car.state='DEFEND';car.desiredLane=car.rear.desiredLane*.45;return;}
    if(car.tires.wear>.5&&!car.pitRequested){car.state='SAVE_TYRES';}
    else if(car.energy<18){car.state='SAVE_ENERGY';}
    else car.state=gap<150?'FOLLOW':'RACE';
    car.desiredLane=(this.driver.id%2?1:-1)*(19+(1-p.cornering)*6);
  }
}
