class KartChallenge{

 constructor(kind,w){if(!KC.challenges[kind])throw Error('Unknown challenge');this.kind=kind;this.index=0;this.hold=0;this.contacts=0;this.hits=0;this.result=null;this.started=0;const points=kind==='slalom'?[[550,200],[1050,200],[1510,650],[1040,900],[650,1220]]:kind==='parking'?[[650,250],[1100,850],[700,1220]]:kind==='patrol'?[[700,200],[1560,650],[1100,1220],[180,650]]:[[1550,1200]];

 if(kind==='escape')w.karts.slice(1).forEach(k=>k.team='hunters');this.markers=['escape','intercept'].includes(kind)?[]:points.map((p,i)=>new ObjectiveMarker('objective'+i,...p));const player=w.player;player.team='player';

 if(['convoy','snake'].includes(kind)){w.karts.slice(1).forEach((k,i)=>{k.team='player';k.leader=kind==='snake'?w.karts[i]:player;k.snake=kind==='snake';k.pos.set(player.pos.x+30*(i+1),player.pos.y+65*(i+1));});}

 if(['parking','slalom','patrol','intercept'].includes(kind)){const bot=w.karts[1];bot.patrol=kind!=='intercept';bot.precision=kind==='parking';bot.team='guide';bot.pos.set(220,220);if(kind!=='intercept')bot.missionGoal=this.markers[0].pos;else bot.equip('shield');}

 }

 description(){return KC.challenges[this.kind][1];}

 tick(w){if(this.result)return;const p=w.player,bot=w.karts[1],marker=this.markers[this.index];if(!p.alive){this.result={won:false,reason:'Kart éliminé. Recommence pour améliorer ton trajet.'};return;}

 if(this.kind==='escape'){if(w.remaining<=0)this.result={won:true,reason:'45 secondes de survie !'};return;}

 if(this.kind==='intercept'){if(bot&&p5.Vector.dist(p.pos,bot.pos)<p.r+bot.r+4&&w.time>(this.nextHit||0)){this.hits++;this.nextHit=w.time+3;w.emit('pickup',p);}if(this.hits>=3)this.result={won:true,reason:'Trois interceptions réussies.'};}

 else if(['convoy','snake'].includes(this.kind)){if(p5.Vector.dist(p.pos,marker.pos)<100&&w.karts.slice(1).every(k=>p5.Vector.dist(k.pos,marker.pos)<250))this.result={won:true,reason:'Toute l’équipe est arrivée.'};}

 else{const close=marker&&p5.Vector.dist(p.pos,marker.pos)<marker.r;let pass=close;if(this.kind==='parking'){this.hold=close&&p.vel.mag()<.4?this.hold+KC.DT:0;pass=this.hold>=.6;}if(this.kind==='patrol')pass=close&&p5.Vector.dist(bot.pos,marker.pos)<140;

 if(pass){marker.reached=true;this.index++;this.hold=0;w.emit('pickup',p);if(this.index>=this.markers.length)this.result={won:true,reason:'Parcours terminé !'};else if(bot&&['parking','slalom','patrol'].includes(this.kind))bot.missionGoal=this.markers[this.index].pos;}}

 if(this.kind==='slalom'&&this.contacts>=8)this.result={won:false,reason:'Huit contacts. Ralentis avant les virages.'};

 if(w.remaining<=0&&!this.result)this.result={won:false,reason:'Temps écoulé.'};

 }

}

