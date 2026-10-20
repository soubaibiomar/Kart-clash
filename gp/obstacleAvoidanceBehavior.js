class ObstacleAvoidanceBehavior {
  constructor(){this.threat=null;this.side=1;this.last=null;}
  calculate(vehicle,obstacles,range=220){
    const direction=vehicle.vel.mag()>.1?vehicle.vel.copy().normalize():createVector(Math.cos(vehicle.heading||0),Math.sin(vehicle.heading||0));
    const lookahead=Math.max(40,Math.min(range,45+vehicle.vel.mag()*18));let nearest=null;
    for(const other of obstacles){
      if(other===vehicle||other.removed||other.inPit!==vehicle.inPit)continue;
      const future=other.pos.copy().add(other.vel.copy().mult(8)),offset=p5.Vector.sub(future,vehicle.pos),along=offset.dot(direction),radius=vehicle.r+other.r+6;
      if(other.vel.mag()>.1&&vehicle.vel.copy().sub(other.vel).dot(direction)<=0&&p5.Vector.dist(other.pos,vehicle.pos)>radius)continue;
      if(along<-radius||along>lookahead+radius)continue;
      const point=direction.copy().mult(Math.max(0,Math.min(lookahead,along))).add(vehicle.pos),clearance=p5.Vector.dist(point,future);
      if(clearance<=radius&&(!nearest||along<nearest.along))nearest={other,future,along,point,radius};
    }
    if(!nearest){this.threat=null;this.last=null;return createVector(0,0);}
    const normal=createVector(-direction.y,direction.x);
    if(this.threat!==nearest.other){this.threat=nearest.other;const lateral=p5.Vector.sub(vehicle.pos,nearest.future).dot(normal);this.side=Math.abs(lateral)>.5?Math.sign(lateral):(vehicle.driver?.id??vehicle.slot??0)%2?1:-1;}
    const desired=direction.copy().mult(Math.max(0,vehicle.vel.mag()*.35)).add(normal.mult(this.side*Math.min(vehicle.maxSpeed,3)));
    this.last={ahead:direction.copy().mult(lookahead).add(vehicle.pos),threat:nearest.future.copy(),side:this.side};
    return desired.sub(vehicle.vel).limit(vehicle.maxForce);
  }
}
