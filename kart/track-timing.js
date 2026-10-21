import {TrackGhostRecording,readTrackGhosts} from './track-ghost.js';

/** Optional manual-session telemetry. Reads ordered gates; never steers a kart. */

export function trackTimingKey(track,gameplay,maxSpeed,maxForce){

 return JSON.stringify({version:1,gameplay,maxSpeed,maxForce,width:track.width,...(track.bounds!==undefined?{bounds:track.bounds}:{}),...(track.cityDensity!==undefined?{cityDensity:track.cityDensity}:{}),closed:!!track.closed,points:track.points.map(p=>[p.x,p.y,p.elevation||0,p.kind||'road',...(p.width!==undefined?[p.width]:[])])});

}


export function sectorGates(track){

 const lengths=[];let distance=0;const count=track.points.length-(track.closed?0:1);

 for(let i=0;i<count;i++){const a=track.points[i],b=track.points[(i+1)%track.points.length];distance+=Math.hypot(b.x-a.x,b.y-a.y,(b.elevation||0)-(a.elevation||0));lengths.push(distance);}

 const sectors=Math.min(3,count),ends=[];for(let i=1;i<sectors;i++){const found=lengths.findIndex(d=>d>=distance*i/sectors)+1;ends.push(Math.min(count-(sectors-i),Math.max((ends.at(-1)||0)+1,found)));}ends.push(count);return ends;

}


export function formatTrackTime(seconds){

 if(!Number.isFinite(seconds)||seconds<0)return '—';const ms=Math.round(seconds*1000);return `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;

}


function validRecord(r){return r?.schema==='kart-track-time-v1'&&typeof r.key==='string'&&r.key.length<=30000&&Array.isArray(r.gates)&&r.gates.length>=1&&r.gates.length<=240&&r.gates.every((t,i)=>Number.isFinite(t)&&t>0&&t<=86400&&(!i||t>=r.gates[i-1]))&&r.time===r.gates.at(-1);}


export class TrackRunTiming{

 constructor(w,{read=()=>[],write=()=>false,readGhosts=()=>[],writeGhosts=()=>false}={}){

  if(!w.trackTrial||w.options.autopilot||w.options.brain)throw Error('Le chronomètre personnel est réservé à la conduite au clavier.');

  const k=w.player;this.player=k.id;this.key=trackTimingKey(w.trackTrial.data,w.gameplay,k.maxSpeed,k.maxForce);this.count=w.trackTrial.markers.length-(w.trackTrial.data.closed?0:1);this.ends=sectorGates(w.trackTrial.data);this.gates=[];this.write=write;this.read=read;this.invalid=false;this.finalTime=null;this.committed=null;

  this.reference=this.records().find(r=>r.key===this.key&&r.gates.length===this.count)||null;

  this.readGhosts=readGhosts;this.writeGhosts=writeGhosts;this.recording=new TrackGhostRecording(k);this.ghostReference=this.reference?readTrackGhosts(readGhosts).find(r=>r.key===this.key&&r.time===this.reference.time)||null:null;

 }

 sample(w){if(!w.paused&&w.phase==='playing')this.recording.capture(w.time,w.player,this.finalTime!==null);}

 records(){try{const raw=this.read();return Array.isArray(raw)?raw.slice(0,24).filter(validRecord).map(r=>({...r,gates:[...r.gates]})):[];}catch{return [];}}

 crossing(w,k){

  if(k.id!==this.player||this.finalTime!==null||this.invalid)return;

  const passed=k.trackState.passed;if(passed===this.gates.length)return;

  if(passed!==this.gates.length+1||passed>this.count||!Number.isFinite(w.time)||w.time<=0||w.time<(this.gates.at(-1)||0)){this.invalid=true;return;}

  this.gates.push(w.time);if(k.trackState.finished&&passed===this.count)this.finalTime=w.time;

 }

 snapshot(w){

  const elapsed=this.finalTime??Math.max(0,w.time),sectorTimes=this.ends.map((end,i)=>this.gates[end-1]===undefined?null:this.gates[end-1]-(i?this.gates[this.ends[i-1]-1]:0)),passed=this.gates.length,reference=this.reference;

  const delta=passed&&reference?this.gates[passed-1]-reference.gates[passed-1]:null;

  return {elapsed,sectorTimes,ends:[...this.ends],passed,total:this.count,complete:this.finalTime!==null,invalid:this.invalid,best:reference?.time??null,delta,paused:!!w.paused,phase:w.phase};

 }

 commit(){

  if(this.committed)return this.committed;

  if(this.invalid||this.finalTime===null)return {status:'incomplete',saved:false};

  const records=this.records(),current=records.find(r=>r.key===this.key&&r.gates.length===this.count),best=current?.time??Infinity;

  if(this.finalTime>=best)return this.committed={status:'slower',saved:false,best};

  const record={schema:'kart-track-time-v1',key:this.key,time:this.finalTime,gates:[...this.gates]};let saved=false;try{saved=this.write([record,...records.filter(r=>r.key!==this.key)].slice(0,24))===true;}catch{}

  let ghostSaved=false;const ghost=saved?this.recording.export(this.key,this.finalTime):null;

  if(ghost)try{ghostSaved=this.writeGhosts([ghost,...readTrackGhosts(this.readGhosts).filter(r=>r.key!==this.key)].slice(0,3))===true;}catch{}

  return this.committed={status:saved?'record':'unavailable',saved,ghostSaved,best:saved?this.finalTime:(Number.isFinite(best)?best:null)};

 }

}
