class RacingContacts {
  static overlap(a,b){
    const dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y;if(dx*dx+dy*dy>3600)return false;
    const ax=Math.cos(a.heading),ay=Math.sin(a.heading),bx=Math.cos(b.heading),by=Math.sin(b.heading);
    for(const [x,y] of [[ax,ay],[-ay,ax],[bx,by],[-by,bx]]){
      const ra=20*Math.abs(ax*x+ay*y)+14*Math.abs(-ay*x+ax*y),rb=20*Math.abs(bx*x+by*y)+14*Math.abs(-by*x+bx*y);
      if(Math.abs(dx*x+dy*y)>=ra+rb)return false;
    }
    return true;
  }
  static resolve(sim){
    if(sim.phase!=='RACE')return;
    for(let i=0;i<sim.cars.length;i++)for(let j=i+1;j<sim.cars.length;j++){
      const a=sim.cars[i],b=sim.cars[j];if(a.inPit||b.inPit||a.finished||b.finished||a.retired||b.retired||!this.overlap(a,b))continue;
      const away=p5.Vector.sub(a.pos,b.pos);if(away.mag()<.001)away.set(i%2?1:-1,0);away.normalize();
      a.contactForce=away.copy().mult(a.maxForce);b.contactForce=away.copy().mult(-b.maxForce);
      if(sim.time<Math.max(a.contactCooldown,b.contactCooldown))continue;
      const severity=Math.max(0,-p5.Vector.sub(a.vel,b.vel).dot(away));
      for(const car of [a,b]){car.damage=GP.clamp(car.damage+.01+severity*.007,0,.6);car.contactCooldown=sim.time+3;car.incidentUntil=sim.time+1;}
      a.mistakeSide=Math.sign(away.dot(sim.track.sample(a.distance).normal))||1;b.mistakeSide=-a.mistakeSide;
      sim.director.emit('CONTACT',`Contact between ${a.driver.abbr} and ${b.driver.abbr}. Both drivers recover.`,a,3);
      if(severity>5.5&&sim.config.incidents>0){for(const car of [a,b]){car.retired=true;car.state='DNF';car.recoveryAt=sim.time+25;}sim.director.redFlag('Multiple-car collision');}
      else if(severity>3.5)sim.director.neutralize('SC',12);
    }
  }
}
