// Actual speech PCM -> Web Audio radio processing. Browser speech fallback is explicitly unfiltered.
class RadioAudio {
  constructor(onState=()=>{}){this.onState=onState;this.context=null;this.version=0;this.sources=new Set();this.nodes=[];this.volume=.55;this.effect=.75;this.cache=new Map();}
  async unlock(){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Web Audio indisponible');if(!this.context)this.context=new Context();await this.context.resume();if(!this.health)this.health=fetch('http://127.0.0.1:8766/health').then(r=>r.json()).then(d=>this.languages=d.voices?.map(v=>v.language.slice(0,2))).catch(()=>{});}
  setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.02);}
  setEffect(value){this.effect=Math.max(0,Math.min(1,Number(value)||0));}
  stop(){this.version++;this.abort?.abort();clearTimeout(this.tailTimer);this.resolve?.();this.resolve=null;for(const source of this.sources){source.onended=null;try{source.stop();}catch{}source.disconnect();}this.sources.clear();for(const node of this.nodes)node.disconnect();this.nodes=[];this.master=null;this.onState('idle');}
  async play(text,language){
    this.stop();const version=this.version;await this.unlock();if(version!==this.version)return;
    this.abort=new AbortController();this.onState('loading');
    try{
      await this.health;if(version!==this.version)return;if(this.languages&&!this.languages.includes(language.slice(0,2)))throw new Error('Voix Windows absente pour cette langue');const controller=this.abort;
      const key=language+':'+text;let buffer=this.cache.get(key);
      if(!buffer){const response=await fetch('http://127.0.0.1:8766/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,400),language}),signal:controller.signal});if(!response.ok)throw new Error('Voix locale indisponible');buffer=await this.context.decodeAudioData(await response.arrayBuffer());if(version!==this.version)return;this.cache.set(key,buffer);if(this.cache.size>24)this.cache.delete(this.cache.keys().next().value);}
      if(version!==this.version)return;
      const ctx=this.context,source=ctx.createBufferSource(),high=ctx.createBiquadFilter(),low=ctx.createBiquadFilter(),compress=ctx.createDynamicsCompressor(),master=ctx.createGain(),wet=ctx.createGain(),dry=ctx.createGain(),drive=ctx.createWaveShaper();
      high.type='highpass';high.frequency.value=360;low.type='lowpass';low.frequency.value=3100;low.Q.value=.65;
      compress.threshold.value=-24;compress.knee.value=12;compress.ratio.value=5;compress.attack.value=.004;compress.release.value=.12;
      drive.curve=Float32Array.from({length:1024},(_,i)=>Math.tanh((i/511.5-1)*1.6)/Math.tanh(1.6));
      wet.gain.value=this.effect;dry.gain.value=1-this.effect;master.gain.value=this.volume;this.master=master;
      source.buffer=buffer;source.connect(high).connect(low).connect(compress).connect(drive).connect(wet).connect(master);source.connect(dry).connect(master);master.connect(ctx.destination);
      this.nodes=[high,low,compress,master,wet,dry,drive];this.sources.add(source);
      const start=ctx.currentTime+.07,end=start+buffer.duration;
      // Squelch opens/closes only for a transmission. No permanent hiss or looping soundtrack.
      if(this.effect>0){const noise=ctx.createBuffer(1,Math.ceil((buffer.duration+.14)*ctx.sampleRate),ctx.sampleRate),samples=noise.getChannelData(0);let seed=1729;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=(seed/4294967296*2-1);}
        const hiss=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();hiss.buffer=noise;filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.5;gain.gain.setValueAtTime(.00001,start-.05);gain.gain.linearRampToValueAtTime(.012*this.effect,start);gain.gain.setValueAtTime(.012*this.effect,end);gain.gain.linearRampToValueAtTime(.00001,end+.06);hiss.connect(filter).connect(gain).connect(master);this.nodes.push(filter,gain);this.sources.add(hiss);hiss.start(start-.05);hiss.stop(end+.07);
        for(const [at,hz] of [[start-.05,900],[end+.01,700]]){const beep=ctx.createOscillator(),level=ctx.createGain();beep.frequency.value=hz;level.gain.setValueAtTime(.00001,at);level.gain.linearRampToValueAtTime(.045*this.effect,at+.008);level.gain.exponentialRampToValueAtTime(.00001,at+.045);beep.connect(level).connect(master);this.nodes.push(level);this.sources.add(beep);beep.start(at);beep.stop(at+.05);}
      }
      this.onState('receiving');await new Promise(resolve=>{source.onended=()=>{this.tailTimer=setTimeout(resolve,90);};this.resolve=resolve;source.start(start);});
      if(version===this.version){this.onState('idle');for(const node of this.nodes)node.disconnect();this.nodes=[];this.sources.clear();this.master=null;}
    }catch(error){if(version!==this.version||error.name==='AbortError')return;this.onState('fallback');throw error;}
  }
  dispose(){this.stop();this.context?.close();}
}
