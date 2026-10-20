class KartWeapons{

 static allied(owner,id,w){const source=w.karts.find(k=>k.id===owner);return !!w.teamMode&&id!==owner&&!!source&&w.karts.some(k=>k.id===id&&k.team===source.team);}
 static clearAt(w,entity,a,b,r=0){return !(w.arena.solidsFor?.(entity)||w.arena.solids).some(o=>KartCollision.segment(a,b,KartCollision.box(o),r)!==null);}
 static minePosition(k){return createVector(k.pos.x-Math.cos(k.heading)*35,k.pos.y-Math.sin(k.heading)*35);}
 static warning(k,w){if(!k.alive||w.phase!=='playing')return null;const distance=e=>Math.hypot(e.pos.x-k.pos.x,e.pos.y-k.pos.y),sameLevel=e=>Math.abs((e.elevation||0)-(k.elevation||0))<=30;
  const missile=w.projectiles.find(p=>!p.removed&&w.time<p.expires&&p.kind==='homing'&&p.target===k.id&&sameLevel(p)&&distance(p)<=350);if(missile)return {kind:'homing',distance:distance(missile),text:'MISSILE EN APPROCHE · cherche un abri'};
  const mines=w.mines.filter(m=>!m.removed&&w.time>=m.armedAt&&w.time<m.expires&&sameLevel(m)&&!KartWeapons.allied(m.owner,k.id,w)&&distance(m)<=75&&KartWeapons.clearAt(w,k,k.pos,m.pos)).sort((a,b)=>distance(a)-distance(b));return mines.length?{kind:'mine',distance:distance(mines[0]),text:'MINE ARMÉE À PROXIMITÉ · évite le cercle rouge'}:null;
 }
 availability(k,w){if(!k.alive)return 'respawn';if(w.paused)return 'paused';if(w.phase!=='playing')return 'waiting';if(!Object.hasOwn(KC.items,k.item)||!Number.isInteger(k.ammo)||k.ammo<=0)return 'empty';if((k.item==='mine'&&w.mines.length>=32)||(['rocket','homing','rapid'].includes(k.item)&&w.projectiles.length>=128))return 'full';if(w.time<k.fireAt)return 'cooldown';if(k.item==='mine'&&!KartWeapons.clearAt(w,k,k.pos,KartWeapons.minePosition(k),17))return 'blocked';return 'ready';}

 use(k,w){if(this.availability(k,w)!=='ready')return false;const kind=k.item,def=KartGameplay.item(w.gameplay,kind);

 if(!['shield','boost'].includes(kind))k.shots++;k.protectedUntil=Math.min(k.protectedUntil,w.time);k.fireInterval=def.cooldown??(kind==='rapid'?.12:.45);k.fireAt=w.time+k.fireInterval;

 if(kind==='shield'){k.shieldUntil=w.time+def.duration;w.emit('shield',k);}else if(kind==='boost'){k.boostUntil=w.time+def.duration;k.limits(w.time);w.emit('boost',k);}else if(kind==='mine'){w.mines.push(new Mine(w.nextId++,k,w));w.emit('fire',k,{item:kind});}else{const Class=kind==='rocket'?Rocket:kind==='homing'?HomingMissile:Bullet;w.projectiles.push(new Class(w.nextId++,k,w));w.emit('fire',k,{item:kind});}

 if(--k.ammo<=0){k.item=null;k.ammo=0;}return true;

 }

 damage(target,amount,owner,w,source=null){if(w.paused||!Number.isFinite(amount)||amount<=0||!target.alive||w.phase!=='playing'||w.time<target.protectedUntil||KartWeapons.allied(owner,target.id,w))return false;if(w.time<target.shieldUntil){w.emit('blocked',target);return false;}const dealt=Math.min(target.health,amount),attacker=w.karts.find(k=>k.id===owner);target.health-=dealt;target.damageTaken+=dealt;if(attacker&&attacker!==target){attacker.damageDealt+=dealt;attacker.hits++;}w.emit('hit',target,{owner,damage:dealt,source:source?{x:source.x,y:source.y}:attacker?{x:attacker.pos.x,y:attacker.pos.y}:null});

 if(target.health<=0){target.drifting=false;KartGameplay.reset(target);target.alive=false;target.deaths++;target.respawnAt=w.time+2;target.vel.set(0,0);target.acc.set(0,0);target.item=null;target.ammo=0;if(attacker&&attacker!==target)attacker.kills++;w.emit('elimination',target,{owner});}return true;

 }

 resolve(w){if(w.paused||w.phase!=='playing')return;for(const p of w.projectiles){if(p.removed||w.time>=p.expires){p.removed=true;continue;}let at=Infinity,target=null;for(const o of w.arena.solidsFor?.(p)||w.arena.solids){const t=KartCollision.segment(p.old,p.pos,KartCollision.box(o),p.r);if(t!==null&&t<at){at=t;target=null;}}for(const k of w.karts){if(!k.alive||k.id===p.owner||KartWeapons.allied(p.owner,k.id,w)||Math.abs((k.elevation||0)-(p.elevation||0))>30)continue;const t=KartCollision.circleSweep(p.old,p.pos,k.pos,k.r+p.r);if(t!==null&&t<at){at=t;target=k;}}if(at!==Infinity){p.removed=true;const point=p.old.copy().add(p5.Vector.sub(p.pos,p.old).mult(at));w.emit('impact',{pos:point,elevation:p.elevation||0},{item:p.kind});if(target)this.damage(target,p.damage,p.owner,w,p.old);}}

 for(const m of w.mines){if(w.time>=m.expires){m.removed=true;continue;}const target=m.detect(w);if(target){m.removed=true;this.damage(target,m.damage??KC.items.mine.damage,m.owner,w,m.pos);w.emit('impact',m,{item:'mine'});}}

 w.projectiles=w.projectiles.filter(p=>!p.removed);w.mines=w.mines.filter(m=>!m.removed);

 }

}

