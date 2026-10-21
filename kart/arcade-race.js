/** Grand Prix rules only. Motion remains Kart.drive -> Vehicle.update. */
export function raceItem(rank,count,rng){
 const behind=count>1?(rank-1)/(count-1):0;
 const pool=behind<.34?['mine','mine','shield','rocket','boost']:behind<.67?['rocket','homing','shield','boost','boost']:['homing','homing','boost','boost','shield'];
 return rng.pick(pool);
}
export class ArcadeRace{
 constructor(){this.launch=new Map();this.launchResolved=false;this.padOccupants=new Map();}
 before(w){
  if(w.phase!=='countdown'||w.paused)return;
  for(const k of w.karts){const down=k===w.player?(Number(w.playerAction.throttle)||0)>.5:w.countdown<=.6,old=this.launch.get(k.id)||{down:false,ready:false};if(down&&!old.down)old.ready=w.countdown<=.7&&w.countdown>.05;if(!down)old.ready=false;old.down=down;this.launch.set(k.id,old);}
 }
 action(k,input,w){return w.time<(k.spinUntil||0)?{throttle:0,turn:.9,fire:false,drift:false}:input;}
 collect(k,w){if(k.item||k.itemRoll)return false;const rank=w.standings().indexOf(k)+1;k.itemRoll={until:w.time+.8,kind:raceItem(rank,w.karts.length,w.rng)};return true;}
 hit(k,amount,owner,w){if(w.time<(k.raceHitUntil||0))return false;k.spinUntil=w.time+.85;k.raceHitUntil=w.time+1.8;k.drifting=false;KartGameplay.reset(k);k.itemRoll=null;w.emit('hit',k,{owner,damage:0});w.emit('spin',k);return true;}
 after(w){
  if(w.phase!=='playing')return;
  if(!this.launchResolved){this.launchResolved=true;for(const k of w.karts)if(this.launch.get(k.id)?.ready){k.boostUntil=Math.max(k.boostUntil,w.time+1.2);w.emit('launch-boost',k);}}
  for(const k of w.karts){if(!k.alive||k.trackState.finished)continue;if(k.itemRoll&&w.time>=k.itemRoll.until){k.equip(k.itemRoll.kind);k.itemRoll=null;w.emit('item-ready',k,{item:k.item});}
   const occupied=this.padOccupants.get(k.id)||new Set(),next=new Set();for(const pad of w.arena.boostPads||[]){const same=Math.abs((k.elevation||0)-pad.elevation)<=30,inside=same&&p5.Vector.dist(k.pos,pad.pos)<=k.r+pad.r;if(inside)next.add(pad.id);if(!same||occupied.has(pad.id)||w.time<(k.spinUntil||0))continue;if(KartCollision.circleSweep(k.motionSample?.origin||k.pos,k.pos,pad.pos,k.r+pad.r)===null)continue;k.boostUntil=Math.max(k.boostUntil,w.time+1);w.emit('pad-boost',k);}
   this.padOccupants.set(k.id,next);
  }
 }
}
