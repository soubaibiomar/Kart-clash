/** Two frozen networks, two independent trials. This service never trains or calls an API. */
export class EvolutionComparison{
 constructor(first,second,{speed,steps=2400,stagnation=300,seed=2026}={}){
  const models=[first,second].map(m=>EvolutionBrain.validate(m)),geometry=t=>JSON.stringify({schema:t.schema,width:t.width,...(t.bounds!==undefined?{bounds:t.bounds}:{}),...(t.cityDensity!==undefined?{cityDensity:t.cityDensity}:{}),closed:t.closed,points:t.points});
  if(geometry(models[0].track)!==geometry(models[1].track))throw Error('Choisis deux modèles du même circuit : géométrie, largeur et hauteurs identiques.');
  const maximum=Math.min(...models.map(m=>m.driving.maxSpeed));speed??=maximum;
  if(!Number.isFinite(speed)||speed<1.2||speed>maximum||!Number.isInteger(steps)||steps<120||steps>7200||!Number.isInteger(stagnation)||stagnation<30||stagnation>1800||!Number.isInteger(seed)||seed<1||seed>2147483647)throw Error('Conditions de comparaison invalides. Le plafond commun ne peut pas dépasser celui des modèles.');
  this.original=models;this.options={speed,steps,stagnation,seed};this.restart();
 }
 restart(){const track=this.original[0].track;this.models=this.original.map(m=>({...m,track,driving:{schema:'track-pace-v1',maxSpeed:this.options.speed}}));this.trials=this.models.map(m=>new EvolutionPopulation(track,{...this.options,count:1,config:m.config,models:[m]}));this.paused=false;this.stopped=false;this.clock=0;this.measures=this.models.map(()=>({speedSum:0,ticks:0,topSpeed:0}));return this;}
 get done(){return this.stopped||this.trials.every(p=>p.done);}
 pause(value){this.paused=!!value;this.clock=0;}
 stop(){this.stopped=true;this.clock=0;}
 step(){if(this.paused||this.done)return this.results();this.trials.forEach((p,i)=>{if(p.done)return;p.neuralStep();const speed=p.world.player.vel.mag()*60,m=this.measures[i];m.speedSum+=speed;m.ticks++;m.topSpeed=Math.max(m.topSpeed,speed);});return this.results();}
 advance(seconds){if(this.paused||this.done)return;this.clock+=Math.min(.1,Math.max(0,Number.isFinite(seconds)?seconds:0));while(this.clock+1e-9>=1/60&&!this.done){this.step();this.clock-=1/60;}}
 frame(index){const p=this.trials[index],m=this.models[index];return {...p.snapshot(),generation:m.metadata?.generation||0,track:m.track,config:m.config,shape:EvolutionBrain.shape(m.config),speedLimit:this.options.speed*60,parents:[0],activations:[p.models[0].activations]};}
 results(){return this.trials.map((p,i)=>{const car=p.snapshot().cars[0],m=this.measures[i];return {name:this.original[i].name,generation:this.original[i].metadata?.generation??null,state:this.stopped&&car.state==='running'?'stopped':car.state,elapsed:car.elapsed,checkpoints:car.checkpoints,fitness:car.fitness,speed:car.speed,topSpeed:m.topSpeed,averageSpeed:m.ticks?m.speedSum/m.ticks:0,limit:this.options.speed*60,modelLimit:this.original[i].driving.maxSpeed*60};});}
 report(){const results=this.results(),bothFinished=results.every(r=>r.state==='finished');return {schema:'kart-comparison-v1',inference:'CPU local',track:JSON.parse(JSON.stringify(this.original[0].track)),conditions:{...this.options,rules:'border-rays-v1'},complete:this.done,results,lapDelta:bothFinished?results[1].elapsed-results[0].elapsed:null};}
}
