/** A drivable deck (with optional tunnel roof), owned by the shared world. */
class TrackSegment extends Vehicle{
 constructor(index,a,b,width){super((a.x+b.x)/2,(a.y+b.y)/2,0,0);this.vel.set(0,0);this.id='deck-'+index;this.index=index;this.a={...a};this.b={...b};this.width=width;this.elevation=(a.elevation+b.elevation)/2;this.kind=a.kind||'road';this.r=width/2;}
 sample(p){const dx=this.b.x-this.a.x,dy=this.b.y-this.a.y,t=KC.clamp(((p.x-this.a.x)*dx+(p.y-this.a.y)*dy)/(dx*dx+dy*dy),0,1),x=this.a.x+dx*t,y=this.a.y+dy*t;return {x,y,t,elevation:this.a.elevation+(this.b.elevation-this.a.elevation)*t,distance:Math.hypot(p.x-x,p.y-y)};}
}
