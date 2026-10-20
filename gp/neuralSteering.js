class NeuralSteering {
  static race(car,sim,nearby){
    const inputs=DriverNeuralModel.inputs(car),output=car.neuralModel.predict(inputs);
    const heading=car.vel.mag()>.15?car.vel.heading():car.heading;
    const turn=(output[0]-.5)*2*DriverNeuralModel.TURN;
    let speed=output[1]*9*sim.config.difficulty;
    car.maxForce=.24*(.85+car.driver.profile.braking*.2)*Math.max(.65,car.tires.grip);
    speed*=1-car.damage*.25;
    car.boost=car.state==='ATTACK'&&car.energy>15&&sim.director.flag==='GREEN';
    if(car.boost)speed*=1.085;
    if(car.state==='SAVE_TYRES')speed*=.96;
    if(car.state==='SAVE_ENERGY')speed*=.94;
    if(car.finished)speed=Math.min(speed,3.6);
    if(car.incidentUntil>sim.time)speed=Math.min(speed,1.3);
    if(car.pitRequested&&GP.mod(car.track.pitEntryAlong-GP.mod(car.distance,car.track.totalLength),car.track.totalLength)<190)speed=Math.min(speed,2.05);
    if(sim.director.flag==='YELLOW')speed=Math.min(speed,3.5);
    if(['SC','VSC'].includes(sim.director.flag))speed=Math.min(speed,sim.director.flag==='SC'?2.7:3.4);
    if(sim.safetyEnabled!==false&&car.sensors)speed=RacingSensors.safeSpeed(car,car.sensors,speed,true);
    car.neuralInputs=inputs;car.neuralOutputs=output;
    car.targetSpeed=speed;car.aero=sim.config.rules==='2026'?'NEURAL / ACTIVE AERO':'NEURAL / LEGACY';
    car.curvature=car.track.curvature(car.distance); // Telemetry/tyre load only, never the neural steering direction.
    const desired=createVector(Math.cos(heading+turn),Math.sin(heading+turn)).mult(speed);
    car.target=desired.copy().mult(10).add(car.pos);
    // No call to follow(), track.sample() or RacingSteering.race(). The network is the driving policy.
    return desired.sub(car.vel).limit(car.maxForce);
  }
}
