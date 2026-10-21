/** Keyboard policy is shared by the UI and deterministic input tests. */
export function gameInputActive(world,playing){return !!playing&&!!world&&world.phase!=='finished';}
export class KartInput {
 constructor({toggleDebug,pause,reset,isPlaying,isPaused}){Object.assign(this,{toggleDebug,pause,reset,isPlaying,isPaused});this.keys=new Set();}
 keydown(e){
  if(e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input:not([type=checkbox]):not([type=range]),textarea,select,[contenteditable]:not([contenteditable=false])'))return;
  if(!this.isPlaying())return;
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(key==='d'){if(!e.repeat)this.toggleDebug();e.preventDefault();return;}
  if(key==='Escape'){if(!e.repeat)this.pause();e.preventDefault();return;}
  if(key==='c'){if(!e.repeat)this.reset();return;}
  if(this.isPaused())return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift'].includes(key)){this.keys.add(key);e.preventDefault();}
 }
 keyup(e){this.keys.delete(e.key);}
 clear(){this.keys.clear();}
 action(){return {throttle:Number(this.keys.has('ArrowUp'))-Number(this.keys.has('ArrowDown')),turn:Number(this.keys.has('ArrowRight'))-Number(this.keys.has('ArrowLeft')),fire:this.keys.has(' '),drift:this.keys.has('Shift')};}
}
export class KartDebug {
 constructor(){this.enabled=false;this.selected=0;this.layers={sensors:true,motion:true,path:true,neighbors:false,threat:true};}
 toggle(value=!this.enabled){this.enabled=!!value;return this.enabled;}
 entities(w){return [...w.karts,...w.projectiles,...w.mines,...w.arena.pickups,...(w.arena.boostPads||[]),...w.arena.solids,...(w.arena.decks||[]),...(w.trackTrial?.markers||w.challenge?.markers||[]),...(w.teamMode?[w.teamMode.core,...w.teamMode.bases]:[])];}
 entity(w){return this.entities(w).find(k=>String(k.id)===String(this.selected))||w.player;}
 snapshot(w){const k=this.entity(w),m=k.motionSample,p=k.perception;return {
  id:k.id,name:k.name||String(k.id),type:k.constructor.name,inheritance:chain(k),controller:k.controller||(k===w.player?'Clavier':'Entité physique'),goal:k.role?k.role+' · '+(k.intent||''):k.intent||'—',alive:k.alive!==false,
  position:{x:k.pos.x,y:k.pos.y,elevation:k.elevation||0},velocity:{x:k.vel.x,y:k.vel.y},heading:k.heading||0,maxSpeed:k.maxSpeed,maxForce:k.maxForce,
  sample:m?JSON.parse(JSON.stringify(m)):null,planning:k.planningForce?{...k.planningForce}:null,components:k.neural?[]:k.behaviors?.last?.components||[],priority:k.behaviors?.last?.priority||'somme pondérée',
  sensors:p?.rays||[],origin:p?.origin,perceptionTick:p?.tick,range:p?.range,threat:p?.threatSample||null,
  path:k.pathDebug||null,neighbors:k.neighborIds||[],route:(k.route||[]).map(v=>({x:v.x,y:v.y})),neural:k.neural?{shape:[k.neural.config.sensors+21,...k.neural.config.hidden,4],activations:k.neural.activations.map(a=>[...a])}:null
 };}
}
function chain(o){const out=[];for(let p=Object.getPrototypeOf(o);p&&p.constructor.name!=='Object';p=Object.getPrototypeOf(p)){out.push(p.constructor.name);if(p.constructor.name==='Vehicle')break;}return out.join(' → ');}
