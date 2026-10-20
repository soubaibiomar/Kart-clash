// Combat v1: configurable dense tanh/ReLU layers; outputs always tanh [turn, throttle, fire].

class CombatBrain{

 static SCHEMA='kart-combat-v2';

 static config(value={}){const c={sensors:9,range:220,hidden:[24,16],activation:'tanh',...value};if(!Number.isInteger(c.sensors)||c.sensors<5||c.sensors>17||!Number.isFinite(c.range)||c.range<100||c.range>400||!Array.isArray(c.hidden)||c.hidden.length<1||c.hidden.length>3||c.hidden.some(n=>!Number.isInteger(n)||n<4||n>64)||!['tanh','relu'].includes(c.activation))throw Error('Topologie invalide : 5–17 capteurs, 100–400 px, 1–3 couches de 4–64 neurones.');return {...c,hidden:[...c.hidden]};}

 static shape(c){return [c.sensors+21,...c.hidden,4];}

 static validate(m){if(m?.gameplay!==undefined)KartGameplay.validate(m.gameplay);if(!m||!((m.schema===this.SCHEMA&&m.normalization==='local-v1')||(m.schema==='kart-track-v1'&&m.normalization==='track-local-v1')||(m.schema==='kart-track-v2'&&m.normalization==='track-deck-v2')))throw Error('Cerveau incompatible. Version v2 requise (drift). Les anciens fichiers restent conservés.');if(m.schema.startsWith('kart-track-')&&KartTrack.validate(m.track).schema!==m.schema)throw Error('Le circuit ne correspond pas au cerveau.');if(m.driving!==undefined){if(!m.track)throw Error('Profil réservé aux circuits.');TrackPace.validate(m.driving);}const c=this.config(m.config),shape=this.shape(c);if(!Array.isArray(m.layers)||m.layers.length!==shape.length-1)throw Error('Couches incompatibles.');m.layers.forEach((l,i)=>{if(!Array.isArray(l.w)||l.w.length!==shape[i]*shape[i+1]||!Array.isArray(l.b)||l.b.length!==shape[i+1]||[...l.w,...l.b].some(n=>!Number.isFinite(n)||Math.abs(n)>100))throw Error('Poids ou biais invalides.');});if(typeof m.name!=='string'||m.name.length<1||m.name.length>60)throw Error('Nom du cerveau invalide.');return JSON.parse(JSON.stringify({...m,config:c}));}

 constructor(model){Object.assign(this,CombatBrain.validate(model));this.activations=[];}

 static observe(k,w,config={}){const c=this.config(config),p=KartPerception.scan(k,w,c.sensors,c.range),rays=p.rays,f=createVector(Math.cos(k.heading),Math.sin(k.heading)),side=createVector(-f.y,f.x),rel=(o,velocity=false)=>{if(!o)return [0,0,0];const v=velocity?p5.Vector.sub(o.vel,k.vel):p5.Vector.sub(o.pos,k.pos);return [KC.clamp(v.dot(f)/(velocity?10:700),-1,1),KC.clamp(v.dot(side)/(velocity?10:700),-1,1),1];};

 if(w.trackTrial)p.pickup=w.trackTrial.target(k);k.perception=p;const types=Object.keys(KC.items),out=[...rays.map(r=>r.distance/c.range),k.vel.dot(f)/8,Math.sin(k.heading),Math.cos(k.heading),...rel(p.enemy),...rel(p.enemy,true).slice(0,2),...rel(p.threat),...rel(p.pickup),k.health/100,(types.indexOf(k.item)+1)/6,k.ammo/10,KC.clamp(k.fireAt-w.time,0,1),Number(w.time<k.shieldUntil),Number(w.time<k.boostUntil),Number(w.time<k.protectedUntil)];if(out.length!==c.sensors+21)throw Error('Observation shape');return out.map(n=>KC.clamp(Number.isFinite(n)?n:0,-1,1));}

 predict(input){const shape=CombatBrain.shape(this.config);if(input.length!==shape[0]||input.some(n=>!Number.isFinite(n)||n< -1||n>1))throw Error('Observations invalides.');let a=[...input];this.activations=[a];for(let i=0;i<this.layers.length;i++){const l=this.layers[i],last=i===this.layers.length-1,b=l.b.map((bias,j)=>{let x=bias;for(let k=0;k<a.length;k++)x+=a[k]*l.w[k*l.b.length+j];return last||this.config.activation==='tanh'?Math.tanh(x):Math.max(0,x);});a=b;this.activations.push(a);}return a;}

 action(k,w){const a=this.predict(CombatBrain.observe(k,w,this.config));return {turn:a[0],throttle:a[1],fire:a[2]>.25,drift:a[3]>.25};}

 static random(config,seed=1,name='Nouveau cerveau',gameplay){if(gameplay!==undefined)KartGameplay.validate(gameplay);const c=this.config(config),shape=this.shape(c),rng=new KartRandom(seed);return {...(gameplay?{gameplay}:{}),schema:this.SCHEMA,normalization:'local-v1',name,config:c,layers:shape.slice(1).map((n,i)=>({w:Array.from({length:shape[i]*n},()=>rng.range(-.15,.15)),b:Array(n).fill(0)})),metadata:{trained:false,seed}};}

}

