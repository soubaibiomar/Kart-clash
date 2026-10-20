class WeaponCrate extends Vehicle{constructor(id,x,y){super(x,y,0,0);this.vel.set(0,0);this.id=id;this.r=27;this.readyAt=0;}available(time){return time>=this.readyAt;}}
