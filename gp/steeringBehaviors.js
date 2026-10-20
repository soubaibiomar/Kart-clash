class SteeringBehaviors {
  static velocity(vehicle,direction,speed=vehicle.maxSpeed){return direction.copy().setMag(Math.max(0,speed)).sub(vehicle.vel).limit(vehicle.maxForce);}
  static seek(vehicle,target){return vehicle.seek(target);}
  static flee(vehicle,target){return this.velocity(vehicle,p5.Vector.sub(vehicle.pos,target));}
  static arrive(vehicle,target,{slowRadius=90,stopRadius=0,speed=vehicle.maxSpeed}={}){
    const direction=p5.Vector.sub(target,vehicle.pos),distance=direction.mag();
    return this.velocity(vehicle,direction,distance<=stopRadius?0:speed*Math.min(1,(distance-stopRadius)/Math.max(1,slowRadius-stopRadius)));
  }
  static predict(target,frames=12){return target.vel.copy().mult(Math.max(0,Math.min(30,frames))).add(target.pos);}
  static pursue(vehicle,target,frames=12){return vehicle.seek(this.predict(target,frames));}
  static evade(vehicle,target,frames=12){return this.flee(vehicle,this.predict(target,frames));}
  static neighbors(vehicle,others,radius=120){return others.filter(o=>o!==vehicle&&!o.removed&&p5.Vector.dist(o.pos,vehicle.pos)<=radius);}
  static separation(vehicle,others){return vehicle.separate(others.filter(o=>o!==vehicle&&!o.removed));}
  static alignment(vehicle,others,radius=120){const ns=this.neighbors(vehicle,others,radius);if(!ns.length)return createVector(0,0);const average=createVector(0,0);for(const n of ns)average.add(n.vel);return this.velocity(vehicle,average.div(ns.length));}
  static cohesion(vehicle,others,radius=120){const ns=this.neighbors(vehicle,others,radius);if(!ns.length)return createVector(0,0);const center=createVector(0,0);for(const n of ns)center.add(n.pos);return vehicle.seek(center.div(ns.length));}
  static boundaries(vehicle,area,margin=35){const x=Math.max(area.x+margin,Math.min(area.x+area.width-margin,vehicle.pos.x)),y=Math.max(area.y+margin,Math.min(area.y+area.height-margin,vehicle.pos.y));if(x===vehicle.pos.x&&y===vehicle.pos.y)return createVector(0,0);return vehicle.seek(createVector(x,y));}
  static wander(vehicle,rng){
    // Reuse the supplied implementation, injecting simulation randomness into its angle.
    const range=vehicle.displaceRange;vehicle.wanderTheta+=rng.range(-.16,.16);vehicle.displaceRange=0;
    try{return vehicle.wander();}finally{vehicle.displaceRange=range;}
  }
  static followLeader(vehicle,leader,distance=55,speedCap=Infinity){
    const heading=leader.vel.mag()>.05?leader.vel.copy().normalize():createVector(Math.cos(leader.heading||0),Math.sin(leader.heading||0));
    const front=heading.copy().mult(35).add(leader.pos);
    if(p5.Vector.dist(vehicle.pos,front)<35)return this.evade(vehicle,leader,10);
    return this.arrive(vehicle,heading.mult(-distance).add(leader.pos),{slowRadius:90,speed:Math.min(vehicle.maxSpeed,speedCap,Math.max(.7,leader.vel.mag()+1))});
  }
}
