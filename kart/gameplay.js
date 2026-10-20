/** Versioned driving/weapon rules shared by the browser and exact JS evaluator. */
class KartGameplay{
 static CLASSIC='kart-classic-v1';
 static ARCADE='kart-arcade-v2';
 static validate(value=this.CLASSIC){if(![this.CLASSIC,this.ARCADE].includes(value))throw Error('Profil de gameplay incompatible.');return value;}
 static item(profile,kind){const original=KC.items[kind];if(!original)return null;if(profile!==this.ARCADE)return original;const changes={rocket:{ammo:2,damage:55,cooldown:.5},homing:{damage:40,cooldown:.65},rapid:{damage:12,cooldown:.10},mine:{damage:65,armDelay:1},shield:{duration:4.5},boost:{duration:2.5}};return {...original,...changes[kind]};}
 static catalog(profile){return Object.fromEntries(Object.keys(KC.items).map(kind=>[kind,this.item(profile,kind)]));}
 static description(profile,kind){const d=this.item(profile,kind);return {rocket:`${d.damage} dégâts · ${d.ammo} tir(s) · ${d.life} s de vol.`,homing:`${d.damage} dégâts · poursuite limitée · ${d.life} s de vol.`,mine:`${d.damage} dégâts · armée après ${d.armDelay??.8} s · rayon 46 px · expire à ${d.life} s. Après armement, elle peut toucher son propriétaire.`,rapid:`${d.ammo} balles de ${d.damage} dégâts · intervalle ${d.cooldown??.12} s · vol ${d.life} s.`,shield:`Ignore les dégâts pendant ${d.duration} s. Une nouvelle activation remplace la durée.`,boost:`Vitesse ×1,6 et force ×1,35 pendant ${d.duration} s. Remplace la durée ; retour exact aux limites normales.`}[kind];}
 static reset(k){k.driftCharge=0;k.driftReady=false;k.driftHeld=false;k.reverseReadyAt=0;k.grip=.16;k.braking=false;}
 static force(k,action){
  const throttle=KC.clamp(Number(action.throttle)||0,-1,1),requestedTurn=KC.clamp(Number(action.turn)||0,-1,1),forward=createVector(Math.cos(k.heading),Math.sin(k.heading)),signed=k.vel.dot(forward),speed=k.vel.mag(),time=k.controlTime||0;
  k.turn+=(requestedTurn-k.turn)*.24;k.braking=throttle*signed<-.12;
  let next;
  if(throttle<0&&signed>.12){k.reverseReadyAt=time+.18;next=Math.max(0,signed-.5*Math.abs(throttle));}
  else if(throttle<0&&time<k.reverseReadyAt)next=0;
  else next=signed+throttle*(k.braking?.45:.24)-(Math.abs(throttle)<.01?signed*.045:0);
  next=KC.clamp(next,-k.maxSpeed*.4,k.maxSpeed);
  k.drifting=!!action.drift&&signed>=2&&Math.abs(k.turn)>.2&&throttle>=0;
  k.grip=(k.grip??.16)+((k.drifting?.9:.16)-(k.grip??.16))*.2;
  const rate=(.004+.068*Math.min(1,speed/2))/(1+speed*.12),reversing=next<-.1;
  k.heading=KC.angle(k.heading+k.turn*rate*(k.drifting?1.22:1)*(reversing?-1:1));
  const axis=createVector(Math.cos(k.heading),Math.sin(k.heading)),side=createVector(-axis.y,axis.x),desired=axis.mult(next).add(side.mult(k.vel.dot(side)*k.grip)).limit(k.maxSpeed);
  k.desiredVelocity={x:desired.x,y:desired.y};return desired.sub(k.vel).limit(k.maxForce);
 }
 static afterDrive(k,w,action){
  if(k.gameplay!==this.ARCADE)return;
  if(k.drifting){k.driftCharge=Math.min(1.6,(k.driftCharge||0)+KC.DT);k.driftReady=k.driftCharge+1e-9>=.8;}
  else{if(!action.drift&&k.driftHeld&&k.driftReady){k.boostUntil=Math.max(k.boostUntil,w.time+.75);k.limits(w.time);w.emit('drift-boost',k);}k.driftCharge=0;k.driftReady=false;}
  k.driftHeld=!!action.drift;
 }
}
