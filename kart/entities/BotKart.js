class BotKart extends Kart{
 constructor(id){super(id,KC.names[id],KC.colors[id]);this.controller='Scripté';}
 plan(w){if(this.neural){this.controller='Neuronal';return this.neural.action(this,w);}
 this.tuning=({easy:{reaction:12,aim:.12,prediction:3,recovery:3},normal:{reaction:6,aim:.2,prediction:8,recovery:2},hard:{reaction:3,aim:.28,prediction:12,recovery:1.5}})[w.options.difficulty]||{reaction:6,aim:.2,prediction:8,recovery:2};if(!this.perception||w.tick%this.tuning.reaction===this.id%this.tuning.reaction)this.perception=KartPerception.scan(this,w);this.pathDebug=null;this.planningForce=null;if(w.time-this.lastProgress>this.tuning.recovery){if(p5.Vector.dist(this.pos,this.progressPoint)<45){this.goalUntil=0;this.route=[];this.recoveryUntil=w.time+.8;this.recoverySide=this.id%2?1:-1;}this.progressPoint=this.pos.copy();this.lastProgress=w.time;}
 if(w.time<(this.recoveryUntil||0))return {throttle:-.8,turn:this.recoverySide,fire:false};
 const force=KartBehaviors.plan(this,w),desired=this.vel.copy().add(force.copy().mult(10)),angle=desired.mag()>.01?KC.angle(desired.heading()-this.heading):0;const enemy=this.perception.enemy,clear=enemy&&w.arena.clear(this.pos,enemy.pos,2),aim=enemy?Math.abs(KC.angle(p5.Vector.sub(enemy.pos,this.pos).heading()-this.heading)):Infinity;
 return {throttle:desired.mag()<.3?0:Math.abs(angle)>1.3?.25:w.arena.decks&&Math.abs(angle)>.5?.55:1,turn:KC.clamp(angle*2,-1,1),drift:w.options.difficulty==='hard'&&Math.abs(angle)>.4&&Math.abs(angle)<1.1&&this.vel.mag()>3,fire:!!this.item&&(this.item==='shield'?this.health<75:this.item==='boost'?Math.abs(angle)<.3:this.item==='mine'?!!enemy&&p5.Vector.dist(enemy.pos,this.pos)<180:clear&&aim<(this.item==='homing'?.7:this.tuning.aim)&&p5.Vector.dist(enemy.pos,this.pos)<650)};
 }
}
