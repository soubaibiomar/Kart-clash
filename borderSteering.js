// Perception et suivi des murs : aucune lecture de la ligne centrale.
class BorderSteering {
  constructor() { this.side = null; this.index = null; this.sensors = []; this.urgent = false; }

  force(car, track) {
    this.urgent = false;
    if (!track || typeof track.nearestBorder !== "function") { this.sensors = []; return createVector(0,0); }
    const closest = track.nearestBorder(car.pos,null,this.index,8);
    const inside=typeof track.contains==="function" ? track.contains(car.pos) : closest.clearance>=0;
    this.urgent = !inside || closest.distance<Math.min(16,track.roadHalfWidth*.45);
    let wall = this.side === null ? closest : track.nearestBorder(car.pos,this.side,this.index);
    // Un décalage intérieur peut se replier dans une épingle très serrée.
    // Longer alors le bord extérieur, dont la direction reste continue.
    const border = track.borders[wall.side === -1 ? 0 : 1];
    if (Array.from({length:9},(_,i)=>border[(wall.index+i)%border.length]).some(edge=>edge.folded || edge.hidden)) {
      wall = track.nearestBorder(car.pos,-wall.side,this.index);
    }
    // Conserver le bord évite les oscillations entre deux murs équidistants.
    if (wall.distance>track.roadHalfWidth*2.5) wall = closest;
    this.side = wall.side;
    this.index = wall.index;
    const availableForce = car.maxForce*.7;
    const lookahead = Math.max(25,car.cruiseSpeed*10);
    const ahead = track.advanceBorder(wall,lookahead);
    const angle = Math.acos(Math.max(-1,Math.min(1,wall.tangent.dot(ahead.tangent))));
    const cornerSpeed = Math.sqrt(availableForce*lookahead/Math.max(.06,angle)*.55);
    car.maxSpeed = Math.max(1.1,Math.min(car.cruiseSpeed,cornerSpeed));
    const heading = car.vel.mag()>.01 ? car.vel.heading() : wall.tangent.heading();
    const range = Math.max(track.roadHalfWidth*2,car.vel.mag()*30);
    this.sensors = [-1.2,-.6,0,.6,1.2].map(angle => {
      const direction = createVector(Math.cos(heading+angle),Math.sin(heading+angle));
      const hit = track.senseBorder(car.pos,direction,range);
      return { origin:car.pos.copy(),end:hit ? hit.point : direction.mult(range).add(car.pos),hit };
    });
    const halfAheadHit = track.senseBorder(car.pos,car.vel,car.vel.mag()*15);
    const front = halfAheadHit || this.sensors[2].hit;
    if (front) car.maxSpeed = Math.min(car.maxSpeed,Math.max(1.1,Math.sqrt(2*availableForce*Math.max(1,front.distance-20))));
    const clearance=Math.min(track.roadHalfWidth*.8,28);
    const next=track.advanceBorder(wall,Math.max(25,car.vel.mag()*12));
    // Une direction parallèle au mur évite un point cible stationnaire dans
    // l'intérieur d'une épingle : le véhicule continue toujours à avancer.
    const desired=wall.tangent.copy().mult(.4).add(next.tangent.copy().mult(.6)).setMag(car.maxSpeed);
    const lateral=Math.max(-car.maxSpeed*.6,Math.min(car.maxSpeed*.6,(clearance-wall.clearance)*.12));
    desired.add(wall.inward.copy().mult(lateral));
    if (this.urgent) {
      const inward=inside ? p5.Vector.sub(car.pos,closest.point).normalize() : closest.inward;
      desired.set(wall.tangent.copy().mult(.7).add(inward).setMag(car.maxSpeed));
      car.maxSpeed=Math.min(car.maxSpeed,1.1);
      this.urgent=true;
    }
    return desired.setMag(car.maxSpeed).sub(car.vel).limit(car.maxForce);
  }
}
