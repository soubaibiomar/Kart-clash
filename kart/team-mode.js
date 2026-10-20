class CaptureCore {
 constructor(w){this.bases=[new TeamBase(0,160,700),new TeamBase(1,1640,700)];this.core=new Core();this.scores=[0,0];this.target=3;for(const k of w.karts){k.team=k.id%2;k.color=k.team===0?'#45bffa':'#ff806d';}this.assign(w);}
 assign(w){const carrier=w.karts.find(k=>k.id===this.core.carrier&&k.alive);
  for(const k of w.karts){k.leader=null;k.missionGoal=null;k.intercept=null;k.role='';}
  for(let team=0;team<2;team++){
   const allies=w.karts.filter(k=>k.team===team&&k.alive).sort((a,b)=>p5.Vector.dist(a.pos,this.core.pos)-p5.Vector.dist(b.pos,this.core.pos)||a.id-b.id);
   allies.forEach((k,i)=>{
    if(k===carrier){k.role='Porteur';k.missionGoal=this.bases[team].pos;}
    else if(carrier?.team===team){k.role=i===allies.length-1&&allies.length>2?'Défenseur':'Escorte';if(k.role==='Escorte')k.leader=carrier;else k.missionGoal=this.bases[team].pos;}
    else if(carrier){k.role=i===allies.length-1&&allies.length>2?'Défenseur':'Intercepteur';if(k.role==='Intercepteur')k.intercept=carrier;else k.missionGoal=this.bases[team].pos;}
    else{k.role=i===0?'Collecteur':i===allies.length-1&&allies.length>2?'Défenseur':'Escorte';if(k.role==='Escorte')k.leader=allies[0];else k.missionGoal=k.role==='Collecteur'?this.core.pos:this.bases[team].pos;}
   });
  }
 }
 tick(w){const core=this.core,carrier=w.karts.find(k=>k.id===core.carrier);
  if(carrier){core.pos.set(carrier.pos);if(!carrier.alive)core.drop(w);else if(p5.Vector.dist(carrier.pos,this.bases[carrier.team].pos)<=this.bases[carrier.team].r){this.scores[carrier.team]++;carrier.deliveries=(carrier.deliveries||0)+1;w.emit('core-score',carrier,{team:carrier.team});core.reset(w);if(this.scores[carrier.team]>=this.target)w.finish();}}
  else if(w.time>=core.readyAt){const k=KartPerception.nearest(core,w.karts,k=>k.alive,core.r+25);if(k){core.attach(k);w.emit('core-take',k);}}
 }
 winner(){return this.scores[0]===this.scores[1]?null:this.scores[0]>this.scores[1]?0:1;}
}
