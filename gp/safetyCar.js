class SafetyCar extends Vehicle {
  constructor(track){const p=track.pitSample(track.boxes.at(-1)+40);super(p.point.x,p.point.y,10,.25);this.vel.set(0,0);this.track=track;this.active=false;this.mode='PIT';this.along=0;this.inPit=true;this.isSafetyCar=true;this.behaviors=new BehaviorManager(this);this.behaviors.add({name:'path-following',calculate:c=>RacingSteering.velocity(this,c.target,c.speed)});}
  deploy(){this.active=true;this.returning=false;if(this.mode==='ENTER')this.mode='PIT';}
  recall(){this.returning=true;}
  step(){
    if(!this.active)return;
    let target,speed=2.6;
    if(this.mode==='ENTER'){
      const progress=this.track.pitProject(this.pos).along,box=this.track.boxes.at(-1)+40;
      target=this.track.pitSample(Math.min(box,progress+30)).point;speed=Math.min(1.7,Math.max(0,(box-progress)*.06));
      if(Math.abs(box-progress)<8&&this.vel.mag()<.2)this.active=false;
    }else
    if(this.mode==='PIT'){
      const p=this.track.pitProject(this.pos);target=this.track.pitSample(p.along+35).point;
      if(p.along>this.track.pitLength-18){this.mode='TRACK';this.inPit=false;this.along=this.track.project(this.pos).along;}
    }else{
      this.along=this.track.project(this.pos).along;target=this.track.sample(this.along+Math.max(35,this.vel.mag()*8)).point;
      if(this.returning){speed=Math.min(7.5,Math.sqrt(.2/Math.max(.003,this.track.curvature(this.along))));const toEntry=GP.mod(this.track.pitEntryAlong-this.along,this.track.totalLength);if(toEntry<160)speed=Math.min(speed,2);if(toEntry<45){this.mode='ENTER';this.inPit=true;}}
    }
    this.applyForce(this.behaviors.getSteeringForce({target,speed}));super.update();
  }
  render(){if(!this.active)return;push();translate(this.pos.x,this.pos.y);rotate(this.vel.heading());rectMode(CENTER);noStroke();fill('#edda59');rect(0,0,47,25,7);fill('#172f31');rect(1,0,22,18,3);fill('#ffd55b');rect(0,0,3,20);pop();}
}
