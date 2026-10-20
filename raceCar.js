class RaceCar extends Vehicle {
  constructor(x, y, number = 1, fast = false) {
    super(x, y, fast ? 7 : 3 + (number % 4) * 0.25, 0.35);
    this.number = number;
    this.r = 23;
    this.cruiseSpeed = this.maxSpeed;
    this.borderSteering = new BorderSteering();
    this.obstacleAvoidance = new ObstacleAvoidance();
    this.teamColor = fast ? "#ff434e" : ["#ef485b", "#32d3bf", "#ffb53d", "#7197ff", "#e8edf3"][(number - 1) % 5];
    this.followPathWeight = 2;
  }

  applyBehaviors(vehicles, path, separationWeight = 1.2, obstacles = [], avoidanceWeight = 2) {
    this.maxSpeed=this.cruiseSpeed;
    this.separateWeight = Math.max(0, Math.min(5, separationWeight));
    const force = this.followPathWeight > 0 ? this.follow(path).mult(this.followPathWeight) : createVector(0,0);
    const avoidanceGain=Math.max(0,Math.min(5,avoidanceWeight));
    const avoidance = this.obstacleAvoidance.force(this,obstacles,path,avoidanceGain);
    const separation = this.separationForce(vehicles).mult(this.separateWeight*.2);
    this.maintainTrafficSpacing(vehicles,path);
    // À proximité immédiate du bord, la sécurité prime sur la répulsion.
    if (this.followPathWeight > 0 && this.borderSteering.urgent) {
      this.applyForce(force.limit(this.maxForce));
      return;
    }
    // Un contournement actif doit pouvoir quitter le bord habituellement longé.
    if (this.obstacleAvoidance.threat && avoidanceGain>0) force.div(1+avoidanceGain*2);
    force.add(separation);
    force.add(avoidance.mult(avoidanceGain));
    if (this.wanderWeight > 0) force.add(this.wander().mult(this.wanderWeight));
    // Pas de division par le poids : sans voisin, le curseur ne doit pas
    // diminuer la traction. La séparation reste bornée à un budget de 1×.
    this.applyForce(force.limit(this.maxForce));
  }

  separationForce(vehicles) {
    const force = this.separate(vehicles);
    if (this.vel.mag()>.01) {
      const heading=this.vel.copy().normalize(), longitudinal=force.dot(heading);
      const frontNeighbor=vehicles.some(other=> {
        if (other===this) return false;
        const offset=p5.Vector.sub(other.pos,this.pos);
        return offset.dot(heading)>0 && offset.mag()<this.r*2 && Math.abs(offset.x*heading.y-offset.y*heading.x)<30;
      });
      // Garder la répulsion latérale sans immobiliser toute une file.
      if (longitudinal<0 && !frontNeighbor) force.add(heading.mult(-longitudinal*.85));
    }
    for (const other of vehicles) {
      if (other !== this && p5.Vector.dist(this.pos,other.pos) < .001) {
        force.add(createVector(this.number < other.number ? -this.maxForce : this.maxForce, 0));
      }
    }
    return force.limit(this.maxForce);
  }

  maintainTrafficSpacing(vehicles,track) {
    if (this.separateWeight===0) return;
    let forward=this.vel.copy().normalize();
    if (this.vel.mag()<.05) {
      if (track && typeof track.nearestBorder==="function") {
        forward=track.nearestBorder(this.pos,this.borderSteering.side,this.borderSteering.index).tangent.copy();
      } else forward=createVector(1,0);
    }
    // Le curseur augmente la marge de confort et la distance d'anticipation.
    // La locomotion héritée reste seule responsable de la vitesse effective.
    for (const other of vehicles) {
      if (other===this) continue;
      const offset=p5.Vector.sub(other.pos,this.pos), along=offset.dot(forward);
      const lateral=Math.abs(offset.x*forward.y-offset.y*forward.x);
      const otherHeading=other.vel.mag()>.05 ? other.vel.copy().normalize() : forward;
      const alignment=Math.abs(otherHeading.dot(forward));
      const cross=Math.abs(otherHeading.x*forward.y-otherHeading.y*forward.x);
      // Empreinte orientée : nez et ailerons occupent plus de place en virage.
      const gap=26+20*alignment+14*cross+this.separateWeight*6;
      const width=29+20*cross+14*alignment;
      if (along<=0 || along>gap+90 || lateral>=width) continue;
      const leadSpeed=Math.max(0,other.vel.dot(forward));
      const permitted=Math.max(0,leadSpeed+(along-gap)*.12);
      this.maxSpeed=Math.min(this.maxSpeed,permitted);
    }
  }

  follow(path) {
    return this.borderSteering.force(this,path);
  }

  render() {
    this.obstacleAvoidance.render();
    if (Vehicle.debug && this.followPathWeight > 0) {
      push(); strokeWeight(1);
      for (const sensor of this.borderSteering.sensors) {
        stroke(sensor.hit ? "#ffc36b99" : "#9ce6d144");
        line(sensor.origin.x,sensor.origin.y,sensor.end.x,sensor.end.y);
        if (sensor.hit) { noStroke(); fill("#ffc36b"); ellipse(sensor.end.x,sensor.end.y,4,4); }
      }
      pop();
    }
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading());
    rectMode(CENTER); noStroke(); fill("#00000055"); rect(-1, 2, 39, 25, 6);
    // Quatre pneus et bandes de roulement.
    for (const x of [-10, 10]) {
      for (const y of [-11, 11]) {
        fill("#070c10"); stroke("#64717b"); strokeWeight(0.7); rect(x, y, 10, 7, 2);
        stroke("#a9b0b8"); line(x - 2, y, x + 2, y);
      }
    }
    noStroke(); fill(this.teamColor);
    rect(-18, 0, 5, 26, 1); // aileron arrière
    rect(17, 0, 4, 27, 1); // aileron avant
    rect(-5, 0, 21, 13, 4); // pontons
    triangle(1, -5, 1, 5, 17, 0); // nez
    fill("#ffffffd9"); rect(-18, 0, 2, 20, 1); rect(17, 0, 1, 20, 1);
    fill("#14202d"); ellipse(-1, 0, 9, 8);
    noFill(); stroke("#bacbd8"); strokeWeight(1.2); arc(0, 0, 10, 10, -HALF_PI, HALF_PI);
    noStroke(); fill("#071015"); textAlign(CENTER, CENTER); textSize(6); textStyle(BOLD);
    text(this.number, -10, 0); pop();
  }
}
