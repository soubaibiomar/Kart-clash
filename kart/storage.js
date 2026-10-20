class KartStorage{

 static read(key,fallback){try{return JSON.parse(localStorage.getItem('kart-clash-'+key))??fallback;}catch{return fallback;}}

 static write(key,value){try{localStorage.setItem('kart-clash-'+key,JSON.stringify(value));return true;}catch{return false;}}

 static object(key){const value=this.read(key,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
 static preferences(){const p=this.object('preferences');return {cameraMode:['chase','close','high'].includes(p.cameraMode)?p.cameraMode:'chase',cameraDistance:Number.isFinite(p.cameraDistance)?KC.clamp(p.cameraDistance,.75,1.5):1,cameraResponse:Number.isFinite(p.cameraResponse)?KC.clamp(p.cameraResponse,.5,2):1,gameplay:p.gameplay==='kart-classic-v1'?'kart-classic-v1':'kart-arcade-v2',mode:p.mode==='core'?'core':'ffa',difficulty:['easy','normal','hard'].includes(p.difficulty)?p.difficulty:'normal',name:typeof p.name==='string'?p.name.slice(0,20):'Toi',character:['robot','fox','frog'].includes(p.character)?p.character:'fox',color:KC.colors.includes(p.color)?p.color:KC.colors[0],bots:Number.isInteger(p.bots)?KC.clamp(p.bots,0,12):7,volume:KC.clamp(Number(p.volume??.35)||0,0,1),mute:!!p.mute,reduced:!!p.reduced,brain:typeof p.brain==='string'?p.brain:'',quality:['auto','low','high'].includes(p.quality)?p.quality:'auto'};}

 static brains(){const raw=this.read('brains',[]);return Array.isArray(raw)?raw.flatMap(m=>{try{return [CombatBrain.validate(m)];}catch{return [];}}).slice(0,24):[];}

 static saveBrain(model){const m=CombatBrain.validate(model),raw=this.read('brains',[]),legacy=Array.isArray(raw)?raw.filter(b=>{try{CombatBrain.validate(b);return false;}catch{return true;}}):[],all=this.brains().filter(b=>b.name!==m.name);if(all.length>=24)throw Error('Limite de 24 cerveaux.');if(!this.write('brains',[...legacy,...all,m]))throw Error('Stockage plein : télécharge le cerveau JSON.');return m;}

}

