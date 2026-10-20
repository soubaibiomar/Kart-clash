class Kart extends Vehicle{

 constructor(id,name,color){super(0,0,4.8,.32);this.vel.set(0,0);this.id=id;this.name=name;this.color=color;this.r=25;this.normal={speed:4.8,force:.32};this.heading=0;this.alive=true;this.spawned=false;this.health=100;this.kills=0;this.deaths=0;this.damageDealt=0;this.damageTaken=0;this.shots=0;this.hits=0;this.team=id;this.protectedUntil=0;this.shieldUntil=0;this.boostUntil=0;this.fireAt=0;this.item=null;this.ammo=0;this.behaviors=new BehaviorManager(this);this.route=[];this.goalUntil=0;this.patrolIndex=0;this.lastProgress=0;this.progressPoint=this.pos.copy();this.drifting=false;this.turn=0;this.travel=0;this.lastAction={throttle:0,turn:0,fire:false};}

 respawn(w){KartGameplay.reset(this);this.drifting=false;this.pos.set(w.arena.spawn(w,this));this.vel.set(0,0);this.acc.set(0,0);this.heading=Math.atan2(KC.H/2-this.pos.y,KC.W/2-this.pos.x);this.alive=true;this.spawned=true;this.health=100;this.item=null;this.ammo=0;this.shieldUntil=0;this.boostUntil=0;this.maxSpeed=this.normal.speed;this.maxForce=this.normal.force;this.protectedUntil=w.time+3;this.route=[];this.progressPoint=this.pos.copy();this.lastProgress=w.time;this.spawnSerial=(this.spawnSerial||0)+1;w.emit('respawn',this);}

 equip(item){if(!KC.items[item])throw Error('Unknown item');this.item=item;this.ammo=KartGameplay.item(this.gameplay,item).ammo;}

 limits(time){this.maxSpeed=this.normal.speed*(time<this.boostUntil?1.6:1);this.maxForce=this.normal.force*(time<this.boostUntil?1.35:1);}

 actionForce(action){if(this.gameplay===KartGameplay.ARCADE)return KartGameplay.force(this,action);const throttle=KC.clamp(Number(action.throttle)||0,-1,1),turn=KC.clamp(Number(action.turn)||0,-1,1),forward=createVector(Math.cos(this.heading),Math.sin(this.heading)),signed=this.vel.dot(forward);this.turn=turn;

 const next=KC.clamp(signed+throttle*(signed*throttle<0?.38:.28)-(Math.abs(throttle)<.01?signed*.07:0),-this.maxSpeed*.5,this.maxSpeed);const reversing=next<-.1,rate=(.012+.060*Math.min(1,this.vel.mag()/1.8))/(1+this.vel.mag()*.10);this.drifting=!!action.drift&&signed>=2&&Math.abs(turn)>.15;this.heading=KC.angle(this.heading+turn*rate*(this.drifting?1.35:1)*(reversing?-1:1));

 const axis=createVector(Math.cos(this.heading),Math.sin(this.heading)),side=createVector(-axis.y,axis.x),lateral=this.vel.dot(side);const desired=axis.mult(next).add(side.mult(lateral*(this.drifting?.94:.25))).limit(this.maxSpeed);this.desiredVelocity={x:desired.x,y:desired.y};return desired.sub(this.vel).limit(this.maxForce);}

 drive(w,action){this.controlTime=w.time;this.lastAction={throttle:KC.clamp(action.throttle,-1,1),turn:KC.clamp(action.turn,-1,1),fire:!!action.fire,drift:!!action.drift};const force=this.actionForce(this.lastAction);this.motionSample={tick:w.tick,origin:{x:this.pos.x,y:this.pos.y},velocity:{x:this.vel.x,y:this.vel.y},heading:this.heading,desired:{...this.desiredVelocity},force:{x:force.x,y:force.y},action:{...this.lastAction},maxSpeed:this.maxSpeed,maxForce:this.maxForce};this.applyForce(force);const old=this.pos.copy();super.update();this.travel+=p5.Vector.dist(old,this.pos);KartGameplay.afterDrive(this,w,action);if(action.fire)w.weapons.use(this,w);}

}

