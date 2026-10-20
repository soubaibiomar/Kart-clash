class TrackObstacle extends Vehicle {
  constructor(x,y,radius=18){super(x,y,0,0);this.vel.set(0,0);this.r=radius;this.inPit=false;this.distance=Infinity;this.kind='obstacle';this.behaviors=new BehaviorManager(this);}
  render(){push();translate(this.pos.x,this.pos.y);noStroke();fill('#e99645');ellipse(0,0,this.r*2,this.r*2);fill('#fff1ce');ellipse(0,0,this.r,this.r);pop();}
}
