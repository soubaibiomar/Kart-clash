// Shared gameplay, contacts, weapons, observations and inference. No racing models.

const {load}=require('../node-world.cjs');

function evaluate(model,{seed=2026,steps=900,layout=0,demos=false,config={},track=null,speedLimit,gameplay}={}){

 if(model&&gameplay!==undefined&&gameplay!==(model.gameplay||'kart-classic-v1'))throw Error('Le profil du modèle doit correspondre à celui de l’évaluation.');
 if(track)return evaluateTrack(model,{seed,steps,demos,config,track,speedLimit,gameplay});
 const g=load(),w=new g.KartWorld({bots:3,seed,layout,gameplay:model?(model.gameplay||g.KartGameplay.CLASSIC):gameplay});w.phase='playing';w.countdown=0;w.player.plan=g.BotKart.prototype.plan;w.player.controller='Scripté';const candidate=w.karts[1];if(model)candidate.neural=new g.CombatBrain(model);const samples=[];let idle=0,survival=0,visits=new Set();

 for(let i=0;i<steps;i++){w.playerAction=w.player.plan(w);const input=demos&&i%6===0&&candidate.alive?g.CombatBrain.observe(candidate,w,config):null;if(candidate.alive){survival++;if(candidate.vel.mag()<.3)idle++;visits.add(Math.floor(candidate.pos.x/150)+','+Math.floor(candidate.pos.y/150));}w.step();if(input){const a=candidate.lastAction;samples.push({input,action:[a.turn,a.throttle,a.fire?1:-1,a.drift?1:-1]});}}

 const contacts=candidate.contactCount||0,circling=candidate.travel>400&&visits.size<4?1:0,fitness=candidate.kills*10+candidate.damageDealt*.04+survival/60*.01+visits.size*.002-candidate.deaths*5-candidate.damageTaken*.02-Math.max(0,candidate.shots-candidate.hits)*.02-contacts*.02-idle/60*.01-circling*.5;

 const metrics={gameplay:w.gameplay,fitness,kills:candidate.kills,damage:candidate.damageDealt,deaths:candidate.deaths,damageTaken:candidate.damageTaken,shots:candidate.shots,hits:candidate.hits,contacts,survival:survival/60,completion:candidate.alive?1:0,visited:visits.size,collisionRate:contacts/Math.max(1,steps),idleSeconds:idle/60,distance:candidate.travel};const preview={tick:w.tick,layout,karts:w.karts.map(k=>({id:k.id,x:k.pos.x,y:k.pos.y,alive:k.alive,candidate:k===candidate})),obstacles:w.arena.obstacles.map(o=>({x:o.pos.x,y:o.pos.y,w:o.w,h:o.h}))};

 return {metrics,preview,activations:candidate.neural?.activations,samples};

}

function evaluateTrack(model,{seed,steps,demos,config,track,speedLimit,gameplay}){
 const g=load(),w=new g.KartWorld({track,bots:0,seed,brain:model,gameplay:model?(model.gameplay||g.KartGameplay.CLASSIC):gameplay,autopilot:!!model,trackSpeedLimit:speedLimit});w.phase='playing';w.countdown=0;const k=w.player;k.heading+=new g.KartRandom(seed).range(-.25,.25);k.plan=g.BotKart.prototype.plan;const samples=[];let idle=0,totalSpeed=0,topSpeed=0;
 for(let i=0;i<steps&&w.phase!=='finished';i++){w.trackTrial.assign(w);const input=demos&&i%6===0?g.CombatBrain.observe(k,w,config):null;w.playerAction=model?{throttle:0,turn:0}:k.plan(w);if(k.vel.mag()<.3)idle++;w.step();const actualSpeed=k.vel.mag();totalSpeed+=actualSpeed;topSpeed=Math.max(topSpeed,actualSpeed);if(input){const a=k.lastAction;samples.push({input,action:[a.turn,a.throttle,-1,a.drift?1:-1]});}}
 const s=k.trackState,contacts=k.contactCount||0,target=w.trackTrial.target(k),previous=w.trackTrial.markers[(s.next-1+w.trackTrial.markers.length)%w.trackTrial.markers.length],length=g.Vector.dist(previous.pos,target.pos),approach=Math.max(0,1-g.Vector.dist(k.pos,target.pos)/Math.max(1,length));
 const metrics={gameplay:w.gameplay,fitness:s.passed*10+s.laps*100+approach*5+(s.finished?25*Math.max(0,1-w.tick/steps):0)-contacts*.2-idle/60*.1,fitnessVersion:'track-laptime-v1',averageSpeed:totalSpeed/Math.max(1,w.tick)*60,topSpeed:topSpeed*60,speedLimit:k.normal.speed*60,lapTime:s.finished?w.time:null,kills:0,damage:0,deaths:0,damageTaken:0,shots:0,hits:0,contacts,collisionRate:contacts/Math.max(1,w.tick),survival:w.time,completion:s.finished?1:0,visited:s.passed,checkpoints:s.passed,laps:s.laps,idleSeconds:idle/60,distance:k.travel};
 return {metrics,preview:{tick:w.tick,layout:0,trackName:w.trackTrial.data.name,track:w.trackTrial.data,karts:[{id:0,x:k.pos.x,y:k.pos.y,elevation:k.elevation||0,alive:true,candidate:true}],obstacles:w.arena.obstacles.map(o=>({x:o.pos.x,y:o.pos.y,w:o.w,h:o.h}))},activations:k.neural?.activations,samples};
}
module.exports={evaluate};

if(require.main===module){let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{input+=chunk;if(input.length>16e6)process.exit(2);});process.stdin.on('end',()=>{try{const request=JSON.parse(input),results=request.models?request.models.map(model=>evaluate(model,request.options)):evaluate(request.model,request.options);process.stdout.write(JSON.stringify(results));}catch(error){process.stderr.write(error.stack);process.exitCode=1;}});}

