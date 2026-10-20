import {visibleOpponent} from './arcade-view.js';

/** Tactical information and a pickup compass, read-only and independent of AI commands. */
export function raceGuideState(w){
 const k=w.player,available=!w.trackTrial&&!w.challenge&&k.alive&&!(k.item&&k.ammo>0),crates=available?w.arena.pickups.filter(c=>c.available(w.time)):[];let nearest=null,distance=Infinity;
 for(const c of crates){const d=Math.hypot(c.pos.x-k.pos.x,c.pos.y-k.pos.y);if(d<distance){nearest=c;distance=d;}}
 return {arcade:w.gameplay==='kart-arcade-v2',charge:Math.min(1,(k.driftCharge||0)/.8),ready:!!k.driftReady,braking:!!k.braking,reverse:k.vel.x*Math.cos(k.heading)+k.vel.y*Math.sin(k.heading)<-.12,speed:Math.round(k.vel.mag()*60),pace:Math.min(1,k.vel.mag()/Math.max(.01,k.maxSpeed)),drift:!!k.drifting,boost:w.time<k.boostUntil,alive:k.alive,goal:nearest?{distance:Math.round(distance),angle:Math.atan2(nearest.pos.y-k.pos.y,nearest.pos.x-k.pos.x)-k.heading}:null,opponents:w.karts.filter(o=>visibleOpponent(o,k,w))};
}
export class RaceGuide{
 constructor(host){this.host=host;host.innerHTML='<div class="guide-instruments"><span class="guide-speed"><b>0</b> px/s</span><span class="guide-drive">PRÊT</span><meter min="0" max="1" value="0" aria-label="Vitesse relative au plafond"></meter></div><div class="guide-charge" hidden><span></span><meter min="0" max="1" value="0" aria-label="Charge de turbo de dérapage"></meter></div><canvas width="200" height="156" aria-label="Mini-carte du circuit, des caisses et des adversaires visibles"></canvas><div class="guide-goal"><i aria-hidden="true">↑</i><span></span></div>';this.canvas=host.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.speed=host.querySelector('b');this.mode=host.querySelector('.guide-drive');this.meter=host.querySelector('meter');this.goal=host.querySelector('.guide-goal');}
 update(w){const s=raceGuideState(w);this.speed.textContent=s.speed;this.mode.textContent=w.phase==='countdown'?'PRÊT':!s.alive?'RETOUR EN PISTE':s.boost?'TURBO':s.drift?'DÉRAPAGE':s.braking?'FREINAGE':s.reverse?'MARCHE ARRIÈRE':'EN PISTE';this.host.dataset.mode=s.boost?'boost':s.drift?'drift':'drive';this.meter.value=s.pace;this.goal.hidden=!s.goal;if(s.goal){this.goal.querySelector('i').style.transform='rotate('+s.goal.angle+'rad)';this.goal.querySelector('span').textContent='Caisse disponible · '+s.goal.distance+' px';}const charge=this.host.querySelector('.guide-charge');charge.hidden=!s.arcade;charge.querySelector('span').textContent=s.ready?'TURBO PRÊT · relâche Maj':'Drift → turbo · '+Math.round(s.charge*100)+' %';charge.querySelector('meter').value=s.charge;this.map(w,s);}
 map(w,state){const ctx=this.ctx,sx=200/1800,sy=156/1400;ctx.clearRect(0,0,200,156);ctx.fillStyle='#111c25';ctx.fillRect(0,0,200,156);const track=w.arena.track;
  if(track){ctx.strokeStyle='#66747c';ctx.lineWidth=Math.max(3,track.width*sx);ctx.lineJoin='round';ctx.beginPath();track.points.forEach((p,i)=>i?ctx.lineTo(p.x*sx,p.y*sy):ctx.moveTo(p.x*sx,p.y*sy));if(track.closed)ctx.closePath();ctx.stroke();}
  else{ctx.fillStyle='#53616a';for(const o of w.arena.obstacles)ctx.fillRect((o.pos.x-o.w/2)*sx,(o.pos.y-o.h/2)*sy,o.w*sx,o.h*sy);}
  for(const c of w.arena.pickups)if(c.available(w.time)){ctx.fillStyle='#e4bd59';ctx.fillRect(c.pos.x*sx-2,c.pos.y*sy-2,4,4);}
  for(const k of state.opponents){ctx.fillStyle=k.team===w.player.team?'#79c4dd':'#eb897d';ctx.beginPath();ctx.arc(k.pos.x*sx,k.pos.y*sy,2.8,0,Math.PI*2);ctx.fill();}
  const k=w.player;ctx.save();ctx.translate(k.pos.x*sx,k.pos.y*sy);ctx.rotate(k.heading);ctx.fillStyle='#f2f6ee';ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-4);ctx.lineTo(-2,0);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.restore();
 }
}
