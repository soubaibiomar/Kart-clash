/** Independent, read-only inference trial. Never invokes the training API. */
export class TrainingTrial{
 constructor(){this.world=null;this.model=null;this.paused=false;}
 preview(track){this.model=null;this.world=track?new KartWorld({track,bots:0,seed:2026}):null;return this.world;}
 setModel(model){CombatBrain.validate(model);if(!model.track)return this.preview(null);const same=this.world&&JSON.stringify(this.world.arena.track)===JSON.stringify(model.track)&&this.world.phase!=='finished'&&this.world.gameplay===(model.gameplay||'kart-classic-v1');this.model=model;if(!same)this.world=new KartWorld({track:model.track,brain:model,autopilot:true,bots:0,seed:2026});else{this.world.player.neural=new CombatBrain(model);this.world.options.autopilot=true;TrackPace.apply(this.world.player,model);this.world.player.controller='Neuronal';}this.world.phase='playing';this.world.countdown=0;this.world.setPaused(this.paused);return this.world;}
 restart(){if(!this.model)return;const model=this.model;this.world=null;return this.setModel(model);}
 pause(value){this.paused=!!value;this.world?.setPaused(value);}
 advance(dt){if(this.model&&!this.paused)this.world.advance(Math.min(.1,Math.max(0,dt)));}
 telemetry(){const w=this.world;if(!w||!this.model)return null;const k=w.player;return {speed:k.vel.mag()*60,limit:k.normal.speed*60,time:w.time,contacts:k.contactCount||0,checkpoints:k.trackState.passed,finished:k.trackState.finished,generation:this.model.metadata?.generation||0};}
}
