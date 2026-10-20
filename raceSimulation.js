class RaceSimulation {
  constructor(sceneWidth, sceneHeight) {
    this.track = new RaceTrack(sceneWidth, sceneHeight);
    this.separationWeight = 1.2;
    this.avoidanceWeight = 2;
    this.obstacles = [];
    this.cars = [];
    this.nextNumber = 1;
    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.cars = [];
    this.nextNumber = 1;
    for (let i = 0; i < 16; i++) {
      const sample = this.track.sample(i * this.track.totalLength / 16);
      const car = this.addCar(sample.point.x, sample.point.y);
      car.vel.set(sample.tangent.copy().setMag(car.maxSpeed));
    }
  }

  addCar(x, y, type = "normal") {
    if (this.cars.length >= 80) return null;
    const car = type === "wander" ? new WanderCar(x, y, this.nextNumber++)
      : new RaceCar(x, y, this.nextNumber++, type === "fast");
    this.cars.push(car);
    if (type !== "wander") {
      const projected = this.track.project(car.pos);
      car.borderSteering.index = projected.index;
      car.vel.set(this.track.sample(projected.along).tangent.mult(car.maxSpeed));
    }
    return car;
  }

  frame() {
    this.track.display();
    for (const obstacle of this.obstacles) obstacle.render();
    for (const car of this.cars) car.applyBehaviors(this.cars, this.track, this.separationWeight,this.obstacles,this.avoidanceWeight);
    for (const car of this.cars) {
      car.update(); // locomotion héritée de Vehicle
      car.edges();
      car.render();
    }
  }

  resize(sceneWidth, sceneHeight) {
    const previous = this.track;
    this.track = new RaceTrack(sceneWidth, sceneHeight);
    for (const obstacle of this.obstacles) obstacle.pos.set(obstacle.pos.x*sceneWidth/previous.sceneWidth,obstacle.pos.y*sceneHeight/previous.sceneHeight);
    for (const car of this.cars) {
      car.pos.set(car.pos.x*sceneWidth/previous.sceneWidth,car.pos.y*sceneHeight/previous.sceneHeight);
      car.borderSteering.side = null;
      car.borderSteering.index = null;
      car.obstacleAvoidance.plan=null;
      car.obstacleAvoidance.waiting=null;
    }
  }

  addObstacle(x,y) {
    if (this.obstacles.length>=30) return null;
    const radius=Math.max(5,Math.min(11,this.track.roadHalfWidth*.28));
    if (this.obstacles.some(o=>p5.Vector.dist(o.pos,createVector(x,y))<o.r+radius+10)) return null;
    const obstacle=new RoadObstacle(x,y,radius);
    this.obstacles.push(obstacle);
    return obstacle;
  }
}
