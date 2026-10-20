class TeamStrategyAgent {
  constructor(id,rng){this.id=id;this.threshold=rng.range(.45,.61);this.style=id%3===0?'Two-stop / attack':id%3===1?'One-stop / preserve':'Flexible / react';this.nextDecision=0;}
  update(sim){
    if(sim.phase!=='RACE'||sim.time<this.nextDecision)return;this.nextDecision=sim.time+1;
    for(const car of sim.cars.filter(c=>c.driver.teamId===this.id)){
      if(car.finished||car.retired||car.inPit||car.pitRequested)continue;
      const remaining=sim.config.laps-car.distance/car.track.totalLength;
      if(remaining<.15)continue;
      const wet=sim.environment.preferred();let compound=null,reason='';
      const targetStops=this.id%3===0&&sim.config.laps>=5?2:1;
      if(wet&&car.tires.compound!==wet){compound=wet;reason='weather crossover';}
      else if(!wet&&['I','W'].includes(car.tires.compound)&&sim.environment.wetness<.12){compound='M';reason='drying racing surface';}
      else if(car.tires.wear>this.threshold&&remaining>.55){compound=remaining<2?'S':remaining>3?'H':'M';if(compound===car.tires.compound)compound=compound==='M'?'H':'M';reason=car.front&&car.front.distance-car.distance<180?'undercut attempt':'tyre degradation';}
      else if(targetStops===2&&car.pitStops<2&&remaining>1&&car.distance/sim.track.totalLength>=sim.config.laps*(car.pitStops+1)/3-.25){compound=wet||(remaining<2.5?'S':'M');reason=car.pitStops?'planned second stop':'two-stop attack window';}
      else if(!sim.config.sprint&&sim.config.laps>=3&&!car.usedCompounds.has('I')&&!car.usedCompounds.has('W')&&car.usedCompounds.size<2&&remaining<1.45){compound=car.tires.compound==='H'?'M':'H';reason='mandatory second dry compound';}
      else if(sim.director.flag==='SC'&&car.tires.wear>.22&&remaining>1.4){compound=remaining>3?'H':'M';reason='Safety Car pit window';}
      if(compound&&car.pitStops<3){
        const traffic=sim.cars.filter(other=>other!==car&&!other.inPit&&!other.retired&&Math.abs(GP.delta(other.distance+other.vel.mag()*60*14,650,sim.track.totalLength))<150).length;
        if(this.id%3===2&&traffic>=2&&reason==='tyre degradation'&&remaining>2&&car.tires.wear<this.threshold+.08&&!car.overcutUsed){car.overcutUsed=true;car.overcutUntil=sim.time+3;sim.director.emit('STAY_OUT',`${car.driver.abbr} stays out: the team is avoiding traffic at pit exit.`,car);}
        if(sim.time<(car.overcutUntil||0))continue;
        if(car.availableSets[compound]<=0)compound=Object.keys(car.availableSets).find(c=>car.availableSets[c]>0&&c!==car.tires.compound&&(!wet?!['I','W'].includes(c):['I','W'].includes(c)));
        if(!compound)continue;
        const teammate=sim.cars.find(other=>other!==car&&other.driver.teamId===this.id&&(other.inPit||other.pitRequested));
        if(teammate&&Math.abs(teammate.distance-car.distance)<260)continue;
        car.requestPit(compound,reason,sim);
      }
    }
  }
}
