class KartWorld{

 constructor(options={}){this.gameplay=KartGameplay.validate((options.brain?(options.brain.gameplay??KartGameplay.CLASSIC):(options.gameplay??KartGameplay.CLASSIC)));if(options.brain&&options.gameplay&&options.gameplay!==this.gameplay)throw Error('Le profil du modèle doit correspondre à celui du monde.');this.options={bots:7,seed:2026,...options};if(options.mode==='core'&&options.brain)throw Error('Les cerveaux combat v2 sont réservés au mode chacun pour soi.');this.options.bots=KC.clamp(Math.floor(Number(this.options.bots)||0),0,12);if(options.brain||options.mode==='core')this.options.bots=Math.max(1,this.options.bots);this.rng=new KartRandom(this.options.seed);this.arena=options.track?new TrackArena(options.track):new KartArena(options.layout||0);this.time=0;this.tick=0;this.accumulator=0;this.phase='countdown';this.countdown=3;this.remaining=180;this.paused=false;this.nextId=100;this.events=[];this.projectiles=[];this.mines=[];this.weapons=new KartWeapons();this.player=new PlayerKart(options.color||KC.colors[0]);

 const counts={parking:1,slalom:1,intercept:1,escape:3,convoy:3,snake:4,patrol:1};const count=options.track?0:options.challenge?counts[options.challenge]:this.options.bots;this.karts=[this.player,...Array.from({length:count},(_,i)=>new BotKart(i+1))];for(const k of this.karts){k.gameplay=this.gameplay;k.respawn(this);if(k.id===1&&options.brain){k.neural=new CombatBrain(options.brain);k.controller='Neuronal';}}

 if(options.brain&&options.brain.schema!==(options.track?options.track.schema:CombatBrain.SCHEMA))throw Error('Ce cerveau ne correspond pas au mode sélectionné.');this.trackTrial=options.track?new TrackTrial(this):null;if(this.trackTrial){this.trackTrial.assign(this);if(options.brain?.driving)TrackPace.apply(this.player,options.brain);else if(options.trackSpeedLimit!==undefined){TrackPace.apply(this.player,{driving:{schema:'track-pace-v1',maxSpeed:options.trackSpeedLimit}});}if(options.brain){this.player.neural=new CombatBrain(options.brain);this.player.controller='Neuronal';}}this.teamMode=options.mode==='core'&&!options.challenge?new CaptureCore(this):null;this.challenge=options.challenge?new KartChallenge(options.challenge,this):null;if(this.challenge)this.remaining=KC.challenges[options.challenge][2];this.contacts=0;this.playerAction={throttle:0,turn:0,fire:false};this.events=[];}

 emit(type,entity,details={}){this.recorder?.terminal({type,tick:this.tick,id:entity.id});this.events.push({type,time:this.time,pos:{x:entity.pos.x,y:entity.pos.y,elevation:entity.elevation||0},id:entity.id,...details});if(this.events.length>100)this.events.shift();}

 standings(){return [...this.karts].sort((a,b)=>b.kills-a.kills||a.deaths-b.deaths||b.damageDealt-a.damageDealt||a.id-b.id);}

 setPaused(value){this.paused=!!value;if(value)for(const k of this.karts){k.drifting=false;if(k.gameplay===KartGameplay.ARCADE)KartGameplay.reset(k);}this.accumulator=0;this.playerAction={throttle:0,turn:0,fire:false};}

 advance(seconds){if(this.paused||this.phase==='finished')return;const elapsed=Math.max(0,Number.isFinite(seconds)?seconds:0);this.accumulator+=elapsed;let steps=0;while(this.accumulator+1e-9>=KC.DT&&steps<12&&this.phase!=='finished'){this.step();this.accumulator-=KC.DT;steps++;}

 // Bound physics catch-up; clocks still consume all active real time during a stall.

 if(this.accumulator>=KC.DT){const skipped=this.accumulator;this.accumulator=0;this.clocks(skipped);}}

 clocks(dt){if(this.phase==='countdown'){this.countdown-=dt;if(this.countdown<=0){const rest=-this.countdown;this.phase='playing';this.countdown=0;this.time+=rest;this.remaining=Math.max(0,this.remaining-rest);this.emit('go',this.player);}return;}if(this.phase!=='playing')return;this.time+=dt;this.remaining=Math.max(0,this.remaining-dt);if(this.remaining<=1e-8){this.remaining=0;if(this.challenge)this.challenge.tick(this);this.finish();}}

 finish(){if(this.phase==='finished')return;this.phase='finished';this.playerAction={throttle:0,turn:0,fire:false};this.emit('finish',this.player);}

 step(){if(this.paused||this.phase==='finished')return;this.tick++;this.clocks(KC.DT);if(this.phase!=='playing')return;

 this.teamMode?.assign(this);this.trackTrial?.assign(this);let recordedInput=null;if(this.recorder?.active&&this.tick%6===0&&this.player.alive)recordedInput=CombatBrain.observe(this.player,this,this.recorder.data.config);
 for(const k of this.karts){if(this.trackTrial&&k.trackState?.finished)continue;if(!k.alive){if(this.challenge&&k===this.player)continue;if(this.time>=k.respawnAt){k.respawn(this);this.trackTrial?.restore(this,k);}continue;}if(this.arena.decks)TrackSurface.attach(this.arena,k);k.limits(this.time);if(this.challenge&&this.challenge.kind==='escape'&&k.id&&!k.item)k.equip('rapid');if(k===this.player&&!recordedInput)k.perception=KartPerception.scan(k,this);let action=k===this.player?(this.options.autopilot&&k.neural?k.neural.action(k,this):this.playerAction):k.plan(this);if(this.trackTrial&&!['armed','kart'].includes(this.options.raceMode)||this.challenge&&this.challenge.kind!=='escape')action={...action,fire:false};if(this.raceRules)action=this.raceRules.action(k,action,this);k.drive(this,action);}

 this.recorder?.capture(this,recordedInput);
 // Contacts follow locomotion; they are not steering or a replacement motion engine.

 if(this.arena.decks)for(const k of this.karts)if(TrackSurface.constrain(this.arena,k)){this.contacts++;k.contactCount=(k.contactCount||0)+1;}for(let pass=0;pass<2;pass++){for(const k of this.karts.filter(k=>k.alive)){for(const o of this.arena.solidsFor?.(k)||this.arena.solids)if(KartCollision.wall(k,o)&&pass===0){this.contacts++;k.contactCount=(k.contactCount||0)+1;if(this.challenge&&k===this.player&&this.time>=(this.challenge.contactAt||0)){this.challenge.contacts++;this.challenge.contactAt=this.time+.5;}}}for(let i=0;i<this.karts.length;i++)for(let j=i+1;j<this.karts.length;j++)if(this.karts[i].alive&&this.karts[j].alive)KartCollision.pair(this.karts[i],this.karts[j]);}

 if(!this.challenge){for(const k of this.karts.filter(k=>k.alive&&!k.item&&!k.itemRoll))for(const crate of this.arena.pickups)if(crate.available(this.time)&&Math.abs((k.elevation||0)-(crate.elevation||0))<=40&&p5.Vector.dist(k.pos,crate.pos)<=k.r+crate.r){if(this.raceRules)this.raceRules.collect(k,this);else k.equip(this.rng.pick(Object.keys(KC.items)));crate.readyAt=this.time+10;this.emit('pickup',k,{item:k.item});break;}}

 for(const p of this.projectiles)p.tick(this);this.weapons.resolve(this);this.teamMode?.tick(this);this.trackTrial?.tick(this);if(this.challenge){this.challenge.tick(this);if(this.challenge.result)this.finish();}}

}

