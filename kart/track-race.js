import {ArcadeRace} from './arcade-race.js';
/** Shared-world races reuse EvolutionKart steering and KartWorld integration. */
export function sameRaceTrack(a,b){const key=t=>{const v=KartTrack.validate(t);delete v.name;return JSON.stringify(v);};return key(a)===key(b);}
export function validateRaceModels(track,models){
 const data=KartTrack.validate(track);
 if(!Array.isArray(models)||models.length>6)throw Error('Choisis au maximum six pilotes IA.');
 return models.map(m=>{const model=EvolutionBrain.validate(m);if(!sameRaceTrack(data,model.track))throw Error('Chaque pilote doit avoir été enregistré pour cette géométrie de circuit.');return model;});
}
export function raceGrid(track,count){
 const t=KartTrack.validate(track),a=t.points[0],b=t.points[1],length=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x),rows=Math.ceil(count/2);
 if(!Number.isInteger(count)||count<1||count>7||length<Math.max(80,(rows-1)*64+60))throw Error('Départ trop court pour cette grille. Réduis les pilotes IA ou allonge la première portion droite.');
 return Array.from({length:count},(_,i)=>{const along=Math.floor(i/2)*64+8,side=count===1?0:(i%2?30:-30);return {x:a.x+Math.cos(angle)*along-Math.sin(angle)*side,y:a.y+Math.sin(angle)*along+Math.cos(angle)*side,elevation:(a.elevation||0)+((b.elevation||0)-(a.elevation||0))*along/length,heading:angle};});
}
export function createTrackRace(options,models){
 const track=KartTrack.validate(options.track),validated=validateRaceModels(track,models),mode=options.raceMode??'classic',bots=options.raceBots??0,laps=options.raceLaps??1;
 if(!['classic','armed','time','kart'].includes(mode)||!Number.isInteger(bots)||bots<0||bots>6||bots+validated.length>6||!Number.isInteger(laps)||laps<1||laps>5||(!track.closed&&laps!==1)||mode==='time'&&(bots||validated.length||laps!==1))throw Error('Course : 0–6 adversaires, 1–5 tours (un seul sur parcours ouvert ou contre-la-montre).');
 if(['armed','kart'].includes(mode)&&validated.length)throw Error('Les modèles à deux sorties restent réservés aux courses sans armes. Choisis des adversaires scriptés pour le combat.');
 const grid=raceGrid(track,validated.length+bots+1);
 // The world is a controller, not a visible entity. Visible rivals remain EvolutionKart -> Kart -> Vehicle.
 class TrackRaceWorld extends KartWorld{
  standings(){return [...this.karts].sort((a,b)=>{const x=a.trackState,y=b.trackState;if(x.finished||y.finished)return Number(y.finished)-Number(x.finished)||(a.raceFinishedAt??Infinity)-(b.raceFinishedAt??Infinity)||a.id-b.id;return y.passed-x.passed||p5.Vector.dist(a.pos,this.trackTrial.target(a).pos)-p5.Vector.dist(b.pos,this.trackTrial.target(b).pos)||a.id-b.id;});}
  step(){if(this.paused||this.phase==='finished')return;this.raceRules?.before(this);super.step();this.raceRules?.after(this);for(const k of this.karts)if(k.trackState.finished&&k.raceFinishedAt===undefined)k.raceFinishedAt=this.time;}
 }
 const world=new TrackRaceWorld({...options,gameplay:mode==='kart'?KartGameplay.ARCADE:options.gameplay,track,bots:0,brain:null,raceMode:mode,raceBots:bots,raceLaps:laps,trackRivals:validated});
 for(const [i,m] of validated.entries()){const k=new EvolutionKart(i+1,m.driving.maxSpeed);k.name=m.name;k.neural=new EvolutionBrain(m);k.gameplay=KartGameplay.CLASSIC;k.plan=w=>{const [turn,throttle]=k.neural.predict(EvolutionBrain.observe(k,w,k.neural.config));return {turn,throttle,fire:false,drift:false};};world.karts.push(k);}
 for(let i=0;i<bots;i++){const k=new BotKart(validated.length+i+1);k.gameplay=world.gameplay;k.respawn(world);k.name='Rival scripté '+(i+1);world.karts.push(k);}
 world.remaining=mode==='time'?180:Math.max(180,Math.min(1200,Math.ceil(track.points.reduce((sum,a,i)=>{if(!track.closed&&i===track.points.length-1)return sum;const b=track.points[(i+1)%track.points.length];return sum+Math.hypot(b.x-a.x,b.y-a.y);},0)*laps/100)));
 if(['armed','kart'].includes(mode))for(const deck of world.arena.decks||[]){const length=Math.hypot(deck.b.x-deck.a.x,deck.b.y-deck.a.y);for(let distance=180;distance<length-60;distance+=420){const t=distance/length,p=deck.sample({x:deck.a.x+(deck.b.x-deck.a.x)*t,y:deck.a.y+(deck.b.y-deck.a.y)*t}),crate=new WeaponCrate('race-crate-'+world.arena.pickups.length,p.x,p.y);crate.elevation=p.elevation;const probe={pos:crate.pos.copy(),vel:new p5.Vector(0,0),r:crate.r};if(!(world.arena.solidsFor?.(crate)||world.arena.solids).some(o=>KartCollision.wall(probe,o)))world.arena.pickups.push(crate);}}
 if(mode==='kart'){world.raceRules=new ArcadeRace();world.arena.boostPads=[];for(const deck of world.arena.decks||[]){const length=Math.hypot(deck.b.x-deck.a.x,deck.b.y-deck.a.y);if(length<400||deck.kind==='tunnel')continue;const t=.55,p=deck.sample({x:deck.a.x+(deck.b.x-deck.a.x)*t,y:deck.a.y+(deck.b.y-deck.a.y)*t}),heading=Math.atan2(deck.b.y-deck.a.y,deck.b.x-deck.a.x);world.arena.boostPads.push(new BoostPad('boost-pad-'+deck.index,p.x,p.y,p.elevation,heading,Math.min(150,p.width-40)));}}
 world.trackTrial=new TrackTrial(world);
 world.karts.forEach((k,i)=>{const pose=grid[i];k.pos.set(pose.x,pose.y);k.elevation=pose.elevation;k.heading=pose.heading;k.surfaceIndex=0;k.spawned=true;k.protectedUntil=0;k.progressPoint=k.pos.copy();});
 for(const k of world.karts){const probe={pos:k.pos.copy(),vel:k.vel.copy(),r:k.r};for(const obstacle of world.arena.solidsFor?.(k)||world.arena.solids)if(KartCollision.wall(probe,obstacle))throw Error('La grille touche un bord ou un obstacle. Élargis le départ ou réduis le nombre de pilotes.');}
 world.events=[];return world;
}
