class ServiceVehicle extends Vehicle {
  constructor(x,y,slot){super(x,y,2,.1);this.vel.set(0,0);this.r=9;this.slot=slot;this.kind='service';this.inPit=true;this.heading=0;this.wanderRadius=18;this.distanceCercle=35;
    this.behaviors=new BehaviorManager(this);this.behaviors.add({name:'mission',when:c=>c.sim.serviceScenario!=='flock',calculate:c=>this.mission(c.sim,c.others)},1)
      .add({name:'alignment',when:c=>c.sim.serviceScenario==='flock',calculate:c=>SteeringBehaviors.alignment(this,c.others)},.7)
      .add({name:'cohesion',when:c=>c.sim.serviceScenario==='flock',calculate:c=>SteeringBehaviors.cohesion(this,c.others)},.4)
      .add({name:'wander',when:c=>c.sim.serviceScenario==='flock',calculate:c=>SteeringBehaviors.wander(this,c.sim.serviceRng)},.2)
      .add({name:'separation',calculate:c=>SteeringBehaviors.separation(this,c.others)},1.2).add({name:'boundaries',calculate:c=>SteeringBehaviors.boundaries(this,c.sim.serviceArea)},2);
  }
  mission(sim,others){
    if(sim.serviceScenario==='leader'&&this.slot>0)return SteeringBehaviors.followLeader(this,others[0],35+this.slot*18);
    if(sim.serviceScenario==='pursue-evade'){
      if(this.slot>0)return SteeringBehaviors.pursue(this,others[0],12);
      const nearest=others.filter(o=>o!==this).sort((a,b)=>p5.Vector.dist(a.pos,this.pos)-p5.Vector.dist(b.pos,this.pos))[0];
      if(nearest&&p5.Vector.dist(nearest.pos,this.pos)<=110)return SteeringBehaviors.evade(this,nearest,12);
    }
    return SteeringBehaviors.wander(this,sim.serviceRng);
  }
  step(sim,others){this.applyForce(this.behaviors.getSteeringForce({sim,others}));super.update();if(this.vel.mag()>.05)this.heading=this.vel.heading();}
  render(){push();translate(this.pos.x,this.pos.y);rotate(this.heading);rectMode(CENTER);noStroke();fill(this.slot===0?'#ffcc77':'#94d7b7');rect(0,0,22,13,3);fill('#20302c');rect(4,0,6,10,1);pop();}
}
