import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {EvolutionPanel} from '../kart/evolution-ui.js';
import {AcademyPanel} from '../kart/academy-ui.js';
import {TrackPieces} from '../kart/track-pieces.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');

test('evolution speed slider initializes the effective limit before the first tick, and steering stays bounded',()=>{
 const g=load(),track={schema:'kart-track-v2',name:'Speed fixture',width:320,closed:false,points:[{x:300,y:700,elevation:0,kind:'road'},{x:1000,y:700,elevation:0,kind:'road'},{x:1600,y:700,elevation:0,kind:'road'}]};
 for(const speed of [1.2,4.6,8]){
  const p=new g.EvolutionPopulation(track,{count:4,speed,steps:120});
  for(const k of p.world.karts){assert.equal(k.maxSpeed,speed);assert.equal(k.normal.speed,speed);const before=k.pos.copy(),force=k.actionForce({turn:0,throttle:1});assert.ok(force.mag()<=k.maxForce+1e-9);assert.equal(g.Vector.dist(before,k.pos),0);assert.equal(Math.hypot(k.desiredVelocity.x,k.desiredVelocity.y),speed);}
  for(let i=0;i<30;i++)p.step(Array.from({length:4},()=>[0,1]));
  for(const k of p.world.karts){assert.ok(k.vel.mag()<=speed+1e-9);assert.ok(k.vel.mag()>=speed-.01);assert.ok(k.motionSample.maxSpeed===speed);}
 }
 for(const count of [4,52,100])assert.equal(new g.EvolutionPopulation(track,{count}).world.karts.length,count);
});

test('all evolution slider values reach the start payload, with a pending-start lock and failure recovery',async()=>{
 const g=load();globalThis.EvolutionBrain=g.EvolutionBrain;globalThis.KartTrack=g.KartTrack;
 try{for(const values of [{population:4,speed:1.2,mutationRate:0,mutationStrength:.01,simulationSpeed:1},{population:52,speed:4.6,mutationRate:.5,mutationStrength:.51,simulationSpeed:11},{population:100,speed:8,mutationRate:1,mutationStrength:1,simulationSpeed:20}]){
  const fields=Object.fromEntries(Object.entries({name:'Audit',track:'@flat',sensors:6,range:220,hidden:'12',activation:'tanh',stagnationSeconds:5,generations:1,steps:120,minutes:1,seed:7,...values}).map(([key,value])=>[key,{value:String(value)}])),nodes=new Map(),p=Object.create(EvolutionPanel.prototype);let request,calls=0,reject;
  Object.assign(p,{available:true,abort:new AbortController(),form:{elements:fields,reportValidity:()=>true,querySelectorAll:()=>Object.values(fields)},get(id){if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},api(path,body){calls++;request={path,body};return new Promise((_,no)=>reject=no);}});
  const run=p.start();assert.equal(calls,1);assert.equal(request.path,'/api/start');for(const [key,value] of Object.entries(values)){assert.equal(request.body[key],value);assert.equal(fields[key].disabled,true);}await p.start();assert.equal(calls,1);
  reject(Error('Audit: no training'));await run;assert.equal(p.starting,false);for(const key of Object.keys(values))assert.equal(fields[key].disabled,false);
 }}finally{delete globalThis.EvolutionBrain;delete globalThis.KartTrack;}
});

test('both pace sliders convert percentages to actual limits, reject inverted bounds and disable progression explicitly',()=>{
 const p=Object.create(AcademyPanel.prototype),f={progressive:{checked:true},paceStart:{value:'25'},paceMax:{value:'165'}};p.get=()=>({elements:f});
 for(const [start,max] of [[25,25],[65,95],[100,165]]){f.paceStart.value=String(start);f.paceMax.value=String(max);const pace=p.paceOptions();assert.equal(pace.start,start*.048);assert.equal(pace.maximum,max*.048);assert.equal(pace.step,.4);}
 f.paceStart.value='100';f.paceMax.value='25';assert.throws(()=>p.paceOptions(),/supérieur/);f.progressive.checked=false;assert.equal(p.paceOptions(),null);
});

test('piece sliders change their own geometric dimensions without moving the existing draft',()=>{
 const origin=[{x:600,y:700,elevation:0,kind:'road'}],before=JSON.stringify(origin);
 for(const length of [80,400,900])assert.equal(TrackPieces.append(origin,{length}).at(-1).x,600+length);
 for(const heading of [-180,0,180]){const end=TrackPieces.append(origin,{heading,length:200}).at(-1);assert.ok(Math.abs(end.x-(600+Math.cos(heading*Math.PI/180)*200))<1e-8);}
 for(const radius of [80,290,500]){const end=TrackPieces.append(origin,{kind:'right',radius,angle:90}).at(-1);assert.ok(Math.abs(end.x-600-radius)<1e-8);assert.ok(Math.abs(end.y-700-radius)<1e-8);}
 for(const angle of [15,105,180]){const end=TrackPieces.append(origin,{kind:'left',radius:180,angle}).at(-1);assert.ok(Math.abs(end.x-(600+180*Math.sin(angle*Math.PI/180)))<1e-8);}
 for(const altitude of [0,120,240])assert.equal(TrackPieces.append(origin,{kind:'ramp',length:600,altitude}).at(-1).elevation,altitude);
 for(const bridgeHeight of [60,150,240])assert.equal(TrackPieces.append([{...origin[0],x:100}],{kind:'bridge',ramp:480,span:80,bridgeHeight})[1].elevation,bridgeHeight);
 for(const span of [80,400,700]){const points=TrackPieces.append([{...origin[0],x:100}],{kind:'bridge',ramp:320,span});assert.equal(points[2].x-points[1].x,span);}
 for(const ramp of [120,420,700]){const points=TrackPieces.append([{...origin[0],x:100}],{kind:'bridge',ramp,span:80,bridgeHeight:60});assert.equal(points[1].x-points[0].x,ramp);}
 assert.equal(JSON.stringify(origin),before);
});

test('entity inventory and browser script inventory cover every physical class exactly once',()=>{
 const g=load(),html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),files=readdirSync(new URL('../kart/entities/',import.meta.url)).filter(n=>n.endsWith('.js'));
 assert.equal(files.length,21);
 for(const file of files){const source=readFileSync(new URL('../kart/entities/'+file,import.meta.url),'utf8'),classes=[...source.matchAll(/class\s+(\w+)\s+extends\s+(\w+)/g)];assert.equal(classes.length,1,file);const [,name,parent]=classes[0];assert.ok(g[name].prototype instanceof g.Vehicle,name);assert.equal(Object.getPrototypeOf(g[name].prototype),g[parent].prototype);assert.equal(html.split('kart/entities/'+file).length-1,1,file);}
});
