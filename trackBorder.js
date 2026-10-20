class TrackBorder extends Vehicle {
  constructor(a,b,side,index,course) {
    super((a.x+b.x)/2,(a.y+b.y)/2,0,0);
    this.vel.set(0,0);
    this.a=a; this.b=b; this.side=side; this.index=index;
    this.tangent=p5.Vector.sub(b,a).normalize();
    this.inward=createVector(this.tangent.y*side,-this.tangent.x*side);
    this.length=p5.Vector.dist(a,b);
    this.folded=this.tangent.dot(course)<0;
  }
  render() {
    if (this.folded) return;
    for (const [from,to] of this.visibleRanges || [[0,1]]) {
      line(this.a.x+(this.b.x-this.a.x)*from,this.a.y+(this.b.y-this.a.y)*from,
        this.a.x+(this.b.x-this.a.x)*to,this.a.y+(this.b.y-this.a.y)*to);
    }
  }
}
