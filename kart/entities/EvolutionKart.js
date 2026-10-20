/** Border-only neural steering. Kart still owns applyForce and the single Vehicle update. */
class EvolutionKart extends Kart{
 constructor(index,speed=4.8){super(index,'Candidat '+(index+1),KC.colors[index%KC.colors.length]);this.normal.speed=speed;this.limits(0);this.controller='Réseau de bordures';this.protectedUntil=0;this.spawnSerial=1;this.evolution={state:'running',lastGate:0,fitness:0};}
 actionForce(action){const angle=this.heading+KC.clamp(action.turn,-1,1)*Math.PI,speed=(KC.clamp(action.throttle,-1,1)+1)*.5*this.maxSpeed,desired=createVector(Math.cos(angle),Math.sin(angle)).mult(speed);this.turn=action.turn;this.desiredVelocity={x:desired.x,y:desired.y};return desired.sub(this.vel).limit(this.maxForce);}
 drive(w,action){super.drive(w,{...action,fire:false,drift:false});if(this.vel.mag()>1e-8)this.heading=this.vel.heading();}
}
