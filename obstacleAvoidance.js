// Anticipation de l'exemple 6 : ahead = vitesse × 30, ahead2 = vitesse × 15.
// Le contournement conserve son côté jusqu'au dépassement du danger.
class ObstacleAvoidance {
  constructor() {
    this.probes=[]; this.threat=null; this.plan=null; this.blocked=false; this.waiting=null;
  }

  force(car,obstacles,track=null,weight=1) {
    const ahead=car.vel.copy().mult(30);
    this.probes=[car.pos.copy(),ahead.copy().mult(.5).add(car.pos),ahead.add(car.pos)];
    this.threat=null;this.blocked=false;
    if (weight<=0) {this.plan=null;this.waiting=null;return createVector(0,0);}
    if (this.plan) {
      const offset=p5.Vector.sub(car.pos,this.plan.obstacle.pos);
      if (!obstacles.includes(this.plan.obstacle) || offset.dot(this.plan.forward)>this.plan.obstacle.r+30) this.plan=null;
    }
    const detected=obstacles.includes(this.waiting) ? this.waiting : this.detect(car,obstacles);
    if (!this.plan && detected) this.plan=this.choosePassage(car,detected,obstacles,track);
    this.threat=this.plan ? this.plan.obstacle : detected;
    if (!this.threat) return createVector(0,0);
    // Un passage trop étroit impose l'arrêt avant le danger, pas une traversée.
    if (!this.plan) {
      this.waiting=this.threat;this.blocked=true;car.maxSpeed=0;
      return car.vel.copy().mult(-1).limit(car.maxForce);
    }
    this.waiting=null;
    const plan=this.plan, relative=p5.Vector.sub(car.pos,plan.obstacle.pos);
    if (p5.Vector.dist(car.pos,plan.entry)<16 ||
        (relative.dot(plan.forward)>-plan.obstacle.r-25 && relative.dot(plan.normal)*plan.side>plan.clearance*.75)) plan.passing=true;
    const destination=plan.passing ? plan.exit : plan.entry;
    car.maxSpeed=Math.min(car.maxSpeed,2.2);
    return car.seek(destination);
  }

  detect(car,obstacles) {
    const segment=p5.Vector.sub(this.probes[2],car.pos), length2=segment.dot(segment);
    const forward=car.vel.mag()>.01 ? car.vel.copy().normalize() : createVector(1,0);
    let selected=null, first=Infinity;
    for (const obstacle of obstacles) {
      const delta=p5.Vector.sub(obstacle.pos,car.pos);
      if (delta.dot(forward)<-obstacle.r-20) continue;
      const fraction=length2 ? Math.max(0,Math.min(1,delta.dot(segment)/length2)) : 0;
      const point=segment.copy().mult(fraction).add(car.pos);
      if (p5.Vector.dist(point,obstacle.pos)<=obstacle.r+20 && fraction<first) {
        selected=obstacle;first=fraction;
      }
    }
    return selected;
  }

  choosePassage(car,obstacle,obstacles,track) {
    const heading=car.vel.mag()>.01 ? car.vel.copy().normalize() : createVector(1,0);
    const obstacleEdge=track && typeof track.nearestBorder==="function"
      ? track.nearestBorder(obstacle.pos,null,car.borderSteering.index,12) : null;
    const directions=obstacleEdge ? [obstacleEdge.tangent.copy(),heading] : [heading];
    const clearance=obstacle.r+25;
    let best=null;
    for (const forward of directions) for (const side of [1,-1]) {
      const normal=createVector(-forward.y,forward.x);
      const flank=normal.copy().mult(side*clearance).add(obstacle.pos);
      const entry=forward.copy().mult(-obstacle.r-30).add(flank);
      const exit=forward.copy().mult(obstacle.r+35).add(flank);
      let room=Infinity;
      if (track && typeof track.nearestBorder==="function") {
        room=Math.min(...[entry,flank,exit].map(point=>{
          const edge=track.nearestBorder(point,null,obstacleEdge.index,12);
          return typeof track.contains==="function" ? (track.contains(point) ? edge.distance : -edge.distance) : edge.clearance;
        }));
        if (room<16) continue;
      }
      if (obstacles.some(other=>other!==obstacle && [entry,flank,exit].some(point=>p5.Vector.dist(point,other.pos)<other.r+20))) continue;
      const cost=p5.Vector.dist(car.pos,entry)-(Number.isFinite(room) ? Math.min(room,60)*.4 : 0);
      if (!best || cost<best.cost) best={obstacle,forward,normal,clearance,side,entry,exit,cost,passing:false};
    }
    return best;
  }

  render() {
    if (!Vehicle.debug || this.probes.length<3) return;
    push();stroke(this.threat ? "#ff8c54" : "#a6d6ef88");strokeWeight(1);
    line(this.probes[0].x,this.probes[0].y,this.probes[2].x,this.probes[2].y);
    noStroke();fill("#ff8c54");
    for (const point of this.probes.slice(1)) ellipse(point.x,point.y,4,4);
    if (this.plan) {
      fill("#ffd174");
      const point=this.plan.passing ? this.plan.exit : this.plan.entry;
      ellipse(point.x,point.y,7,7);
    }
    pop();
  }
}
