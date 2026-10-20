/** Oriented guardrail with the same sloping base as its road segment. */
class TrackRail extends Vehicle{
 constructor(id,a,b){super((a.x+b.x)/2,(a.y+b.y)/2,0,0);this.vel.set(0,0);this.id=id;this.a=a;this.b=b;this.rail=true;this.kind='track-rail';this.w=Math.hypot(b.x-a.x,b.y-a.y);this.h=8;this.height=22;this.elevation=(a.elevation+b.elevation)/2;this.r=4;this.solid=true;}
 elevationAt(p){const dx=this.b.x-this.a.x,dy=this.b.y-this.a.y,t=KC.clamp(((p.x-this.a.x)*dx+(p.y-this.a.y)*dy)/(dx*dx+dy*dy||1),0,1);return this.a.elevation+(this.b.elevation-this.a.elevation)*t;}
 blocks(k){return Math.abs((k.elevation||0)-this.elevationAt(k.pos))<50;}
}
