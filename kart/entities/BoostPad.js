/** A physical trigger on a deck. Presentation uses this same footprint. */
class BoostPad extends Vehicle{
 constructor(id,x,y,elevation,heading,width=120){super(x,y,0,0);this.id=id;this.vel.set(0,0);this.elevation=elevation;this.heading=heading;this.width=width;this.r=40;}
}
