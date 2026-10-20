class ManualControl {
  constructor(){this.id=null;this.keys=new Set();this.enabled=false;}
  clear(){this.keys.clear();}
  axis(){return {throttle:Number(this.keys.has('ArrowUp')||this.keys.has('w')||this.keys.has('z')),
    brake:Number(this.keys.has('ArrowDown')||this.keys.has('s')),
    turn:Number(this.keys.has('ArrowRight')||this.keys.has('d'))-Number(this.keys.has('ArrowLeft')||this.keys.has('a')||this.keys.has('q'))};}
  force(car,sim){
    const axis=this.axis(),speed=car.vel.mag(),angle=car.heading+axis.turn*(.055/(1+speed*.12));
    let desired=GP.clamp(speed+axis.throttle*.12-axis.brake*.35-(axis.throttle?0:.018),0,8.5*Math.sqrt(car.tires.grip));
    if(sim.director.flag==='YELLOW')desired=Math.min(desired,3.5);
    if(['SC','VSC'].includes(sim.director.flag))desired=Math.min(desired,sim.director.flag==='SC'?2.7:3.4);
    car.targetSpeed=desired;car.state='PLAYER';car.boost=false;
    return createVector(Math.cos(angle),Math.sin(angle)).mult(desired).sub(car.vel).limit(car.maxForce);
  }
}
