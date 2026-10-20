import {driveSound} from './drive-sound.js';
// Original synthesized effects, bounded voices and a bounded engine/tyre mix.

export class KartAudio{

 constructor(){this.sources=new Set();this.enabled=false;this.volume=.35;}

 async unlock(){if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.context=new Audio();this.master=this.context.createGain();this.master.connect(this.context.destination);this.engine=this.context.createOscillator();this.engine.type='sawtooth';this.engineGain=this.context.createGain();const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=480;this.engineFilter=filter;this.engine.connect(filter);filter.connect(this.engineGain);this.engineGain.connect(this.master);this.engineGain.gain.value=0;this.engine.start();this.undertone=this.layer('triangle');this.skid=this.layer('triangle');}await this.context.resume();this.enabled=true;this.apply();}

 layer(type){const oscillator=this.context.createOscillator(),gain=this.context.createGain();oscillator.type=type;gain.gain.value=0;oscillator.connect(gain);gain.connect(this.master);oscillator.start();return {oscillator,gain};}
 configure(p){this.volume=p.mute?0:p.volume;this.apply();}

 apply(){if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.03);}

 suspend(){this.enabled=false;this.apply();if(this.engineGain)this.engineGain.gain.setTargetAtTime(0,this.context.currentTime,.02);for(const layer of [this.undertone,this.skid])layer?.gain.gain.setTargetAtTime(0,this.context.currentTime,.02);this.clear();}

 clear(){for(const s of this.sources){try{s.stop();}catch{}s.disconnect();}this.sources.clear();}

 cue(type,pan=0,level=1){if(!this.context||!this.enabled||this.volume===0||this.sources.size>=12)return;const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();const presets={drift:[900,180,.35,'sawtooth'],'core-take':[500,900,.2,'sine'],'core-drop':[500,180,.3,'triangle'],'core-score':[500,1400,.5,'sine'],fire:[230,60,.13,'square'],rocket:[180,38,.24,'sawtooth'],homing:[420,130,.26,'triangle'],rapid:[260,100,.07,'square'],mine:[100,60,.2,'triangle'],hit:[90,35,.12,'square'],impact:[110,25,.25,'sawtooth'],elimination:[100,20,.4,'sawtooth'],pickup:[500,1100,.18,'sine'],shield:[330,700,.3,'sine'],blocked:[800,380,.12,'triangle'],boost:[150,750,.5,'sawtooth'],count:[500,500,.1,'sine'],go:[700,1100,.3,'sine'],finish:[600,180,.7,'triangle']};const [a,b,d,wave]=presets[type]||presets.pickup;o.type=wave;o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+d);g.gain.setValueAtTime(.14*Math.max(.05,Math.min(1,level)),t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(this.master);g.userDataPan=p;}else g.connect(this.master);this.sources.add(o);o.onended=()=>{this.sources.delete(o);o.disconnect();g.disconnect();g.userDataPan?.disconnect();};o.start();o.stop(t+d);}

 update(k,playing){if(!this.context)return;const t=this.context.currentTime,s=driveSound(k,playing,this.enabled);this.engineFilter?.frequency.setTargetAtTime(s.filter,t,.08);this.engine.frequency.setTargetAtTime(s.frequency,t,.08);this.engineGain.gain.setTargetAtTime(s.gain,t,.08);for(const [layer,frequency,gain] of [[this.undertone,s.undertone,s.undertoneGain],[this.skid,s.skid,s.skidGain]])if(layer){layer.oscillator.frequency.setTargetAtTime(frequency,t,.08);layer.gain.gain.setTargetAtTime(gain,t,.04);}}

 dispose(){this.clear();this.engine?.stop();for(const layer of [this.undertone,this.skid]){layer?.oscillator.stop();layer?.oscillator.disconnect();layer?.gain.disconnect();}this.context?.close();}

}

