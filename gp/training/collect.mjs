// Expert warm-start only. The final driving model receives sensor observations, not a path.
import {setupGP} from '../../tests/gp-harness.mjs';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import vm from 'node:vm';
const {GrandPrixSimulation,GP}=setupGP();
// Reuse exactly the browser feature mapping without importing a separate formula.
const context=vm.createContext({GP,Float32Array});
vm.runInContext(readFileSync(new URL('../neuralModel.js',import.meta.url),'utf8'),context);
const Model=vm.runInContext('DriverNeuralModel',context);
const circuits=process.argv.slice(2).length?process.argv.slice(2):['coast','technical','it-1922','gb-1948','mc-1929','be-1925','us-2022','es-2026'];
const samples=Array.from({length:22},()=>[]),tracks=[];
for(const [index,circuit] of circuits.entries()){
  const sim=new GrandPrixSimulation({drivers:22,laps:3,formation:false,incidents:0,circuit,seed:2026,policy:'expert',weather:index%3===2?'rain':'sunny'});
  sim.start();
  const geometry={id:circuit,name:sim.track.name,radius:sim.track.radius,length:sim.track.totalLength,
    points:sim.track.points.map(p=>[p.x,p.y]),borders:sim.track.borders.map(w=>[w.a.x,w.a.y,w.b.x,w.b.y])};tracks.push(geometry);
  for(let tick=0;tick<6500&&sim.phase!=='COMPLETE';tick++){
    sim.step();
    if(sim.phase!=='RACE'||tick%6!==0)continue;
    for(const c of sim.cars){
      if(c.inPit||c.retired||c.finished||!c.sensors||!c.target||c.targetSpeed<.15)continue;
      const heading=c.vel.mag()>.15?c.vel.heading():c.heading;
      const angle=Math.atan2(c.target.y-c.pos.y,c.target.x-c.pos.x)-heading;
      const turn=Math.atan2(Math.sin(angle),Math.cos(angle));
      samples[c.driver.id].push([...Model.inputs(c),GP.clamp(.5+turn/(2*Model.TURN),.005,.995),GP.clamp(c.targetSpeed/9,.005,.995)]);
    }
  }
  console.log(JSON.stringify({circuit,phase:sim.phase,samples:samples.reduce((n,a)=>n+a.length,0)}));
}
const root=new URL('./data/',import.meta.url);mkdirSync(root,{recursive:true});
writeFileSync(new URL('observations.json',root),JSON.stringify({schema:'apex-observations-v1',inputs:18,hidden:36,turn:1.2,names:GP.names,styles:GP.styles,tracks,samples}));
