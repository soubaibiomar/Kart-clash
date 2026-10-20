import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function harness(){
  const nodes=[],requests=[];const param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=type=>{const n={type,frequency:param(),Q:param(),gain:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connections:[],connect(other){this.connections.push(other);return other;},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};nodes.push(n);return n;};
  class Context{constructor(){this.currentTime=1;this.sampleRate=8000;this.destination=node('destination');}async resume(){}async close(){}async decodeAudioData(){return {duration:.1};}createBufferSource(){return node('source');}createBiquadFilter(){return node('filter');}createGain(){return node('gain');}createDynamicsCompressor(){return node('compressor');}createWaveShaper(){return node('shaper');}createOscillator(){return node('oscillator');}createBuffer(_,size){const a=new Float32Array(size);return {getChannelData:()=>a};}}
  const context=vm.createContext({window:{AudioContext:Context},AbortController,Float32Array,setTimeout,clearTimeout,fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({voices:[{language:'en-US'}]}),arrayBuffer:async()=>new ArrayBuffer(10)};}});
  vm.runInContext(readFileSync(new URL('../gp/radioAudio.js',import.meta.url),'utf8')+'\nglobalThis.Audio=RadioAudio;',context);
  const states=[],audio=new context.Audio(s=>states.push(s));return {audio,nodes,requests,states};
}
const flush=()=>new Promise(setImmediate);
test('local speech goes through a bounded radio band, compression, volume and gated squelch',async()=>{
  const h=harness(),play=h.audio.play('Radio check.','en-GB');await flush();
  assert.equal(h.requests.filter(r=>r.url.endsWith('/voice')).length,1);
  const high=h.nodes.find(n=>n.type==='highpass'),low=h.nodes.find(n=>n.type==='lowpass'),compress=h.nodes.find(n=>n.type==='compressor');assert.equal(high.frequency.value,360);assert.equal(low.frequency.value,3100);assert.ok(compress.ratio.value>1);assert.equal(h.audio.master.gain.value,.55);assert.ok(h.states.includes('receiving'));
  const source=h.nodes.find(n=>n.type==='source');source.onended();await play;assert.equal(h.states.at(-1),'idle');assert.equal(h.audio.sources.size,0);
});
test('mute clamps gain; stopping resolves active playback, disconnects nodes and prevents late sound',async()=>{
  const h=harness();h.audio.setVolume(-1);assert.equal(h.audio.volume,0);h.audio.setEffect(2);assert.equal(h.audio.effect,1);
  const play=h.audio.play('Stop test.','en-GB');await flush();assert.equal(h.audio.master.gain.value,0);h.audio.stop();await play;assert.equal(h.audio.sources.size,0);assert.ok(h.nodes.filter(n=>n.type==='source').every(n=>n.stopped));assert.equal(h.audio.master,null);
});
test('unsupported French local voice fails explicitly instead of reading French in an English voice',async()=>{
  const h=harness();await assert.rejects(h.audio.play('Cinq sur cinq.','fr-FR'));assert.equal(h.requests.filter(r=>r.url.endsWith('/voice')).length,0);assert.ok(h.states.includes('fallback'));
});
test('cache avoids another synthesis request and cancellation before health completes starts no source',async()=>{
  const h=harness();let p=h.audio.play('Copy.','en-GB');await flush();h.audio.stop();await p;
  p=h.audio.play('Copy.','en-GB');await flush();h.audio.stop();await p;assert.equal(h.requests.filter(r=>r.url.endsWith('/voice')).length,1);
  const fresh=harness();p=fresh.audio.play('Cancelled.','en-GB');fresh.audio.stop();await p;assert.equal(fresh.nodes.filter(n=>n.type==='source').length,0);
});
test('training progress is stage-specific, clamped, and preserves actual driver counts',()=>{
  const c=vm.createContext({});vm.runInContext(readFileSync(new URL('../gp/trainingState.js',import.meta.url),'utf8')+'\nglobalThis.P=TrainingPresentation;',c);
  let p=c.P.describe({status:'running',phase:'warmstart',epochs:100,epoch:25,driverIds:[0,3],elapsed:61,allocatedMB:28.5});assert.equal(p.progress,.25);assert.equal(p.drivers,2);assert.equal(p.duration,'1 min 1 s');assert.equal(p.memory,'28.5 Mo');
  p=c.P.describe({status:'running',phase:'evolution',generations:12,generation:20});assert.equal(p.progress,1);assert.match(p.stage,/Génération/);assert.equal(c.P.describe({status:'idle'},5).drivers,5);assert.equal(c.P.describe({status:'error'}).running,false);
});
test('training preview selects the requested population and never relabels old first-driver data',()=>{
  const c=vm.createContext({});vm.runInContext(readFileSync(new URL('../gp/trainingState.js',import.meta.url),'utf8')+'\nglobalThis.P=TrainingPresentation;',c);
  const f={driverIds:[4,8],drivers:[{positions:[[1,2]]},{positions:[[9,10]]}],points:[[0,0]]};
  assert.equal(c.P.preview(f,8).positions[0][0],9);assert.equal(c.P.preview(f,3),null);assert.equal(c.P.preview({driverId:4},8),null);
  const history=[{phase:'evolution',driverIds:[4],generation:1,circuit:'a',startFraction:0,fitnesses:[.1]},{phase:'evolution',driverIds:[4],generation:2,circuit:'b',startFraction:0,fitnesses:[.9]},{phase:'evolution',driverIds:[4],generation:3,circuit:'a',startFraction:0,fitnesses:[.2]}];
  const series=c.P.series(history,4,'fitness');assert.equal(series.length,2);assert.equal(series[1].y,.2);assert.equal(c.P.series(history,8,'fitness').length,0);
});
