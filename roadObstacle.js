class RoadObstacle extends Vehicle {
  constructor(x,y,radius=10) {
    super(x,y,0,0);
    this.vel.set(0,0); this.r=radius;
  }
  render() {
    push(); translate(this.pos.x,this.pos.y); noStroke();
    fill("#00000066"); ellipse(2,3,this.r*2+5,this.r*2+5);
    fill("#e87832"); ellipse(0,0,this.r*2,this.r*2);
    fill("#ffdda2"); ellipse(0,0,this.r*1.35,this.r*1.35);
    fill("#d65b27"); ellipse(0,0,this.r*.7,this.r*.7);
    pop();
  }
}
