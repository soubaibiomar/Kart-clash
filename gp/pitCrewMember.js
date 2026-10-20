class PitCrewMember extends Vehicle {
  constructor(team,slot,track){
    const box=track.pitSample(track.boxes[team]).point;
    const home=createVector(box.x+(slot%2?12:-12),box.y-60-Math.floor(slot/2)*12);
    super(home.x,home.y,1.4,.18);this.vel.set(0,0);this.home=home;this.team=team;this.slot=slot;this.behaviors=new BehaviorManager(this);this.behaviors.add({name:'arrive',calculate:c=>RacingSteering.velocity(this,c.goal,Math.min(1.4,p5.Vector.dist(this.pos,c.goal)*.1))});
  }
  step(sim){
    const car=sim.activeBoxes.get(this.team);
    if(!car&&p5.Vector.dist(this.pos,this.home)<.05&&this.vel.mag()<.01)return;
    const goal=car?createVector(car.pos.x+(this.slot%2?11:-11),car.pos.y+(this.slot<2?-22:22)):this.home;
    this.applyForce(this.behaviors.getSteeringForce({goal}));super.update();
  }
  render(){push();translate(this.pos.x,this.pos.y);noStroke();fill(GP.teams[this.team][2]);rectMode(CENTER);rect(0,0,5,8,2);fill('#e0e4d8');ellipse(0,-5,5,5);pop();}
}
