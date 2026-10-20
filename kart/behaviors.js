class KartBehaviors{

 // Project the predicted position onto the current segment, then seek ahead inside its corridor.
 static path(k,path){
   if(k.pathArray!==path){k.pathArray=path;k.pathStart=k.pos.copy();k.pathEnd=null;}
   while(path.length>1&&p5.Vector.dist(k.pos,path[0])<45){k.pathStart=path.shift().copy();}
   if(!path.length){k.pathDebug=null;return createVector(0,0);}
   if(k.pathEnd!==path[0]){k.pathStart=k.pathStart||k.pos.copy();k.pathEnd=path[0];}
   const a=k.pathStart,b=path[0],segment=p5.Vector.sub(b,a),length=segment.mag(),unit=length>1e-6?segment.copy().div(length):createVector(0,0),predicted=k.pos.copy().add(k.vel.copy().mult(10));
   const along=KC.clamp(p5.Vector.sub(predicted,a).dot(unit),0,length),projection=a.copy().add(unit.copy().mult(along)),target=a.copy().add(unit.copy().mult(Math.min(length,along+35))),radius=28;
   k.pathDebug={origin:{x:k.pos.x,y:k.pos.y},a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},predicted:{x:predicted.x,y:predicted.y},projection:{x:projection.x,y:projection.y},target:{x:target.x,y:target.y},radius,offPath:p5.Vector.dist(predicted,projection)>radius};
   if(!k.pathDebug.offPath&&p5.Vector.dist(k.pos,b)>80)return SteeringBehaviors.velocity(k,unit,k.maxSpeed);
   return SteeringBehaviors.arrive(k,target,{slowRadius:path.length===1?70:20,stopRadius:8});
 }

 static avoid(k,w){const scan=k.perception?.rays||KartPerception.rays(k,w),danger=scan.filter(r=>Math.abs(KC.angle(r.angle-k.heading))<(w.arena.decks?1.1:1.6)&&r.distance<(w.arena.decks?Math.min(70,w.arena.track.width*.32):90));if(!danger.length)return createVector(0,0);if(w.arena.decks)return this.roadAvoid(k,danger,scan);const left=scan.filter(r=>KC.angle(r.angle-k.heading)<0).reduce((s,r)=>s+r.distance,0),right=scan.filter(r=>KC.angle(r.angle-k.heading)>0).reduce((s,r)=>s+r.distance,0);return SteeringBehaviors.velocity(k,createVector(Math.cos(k.heading+(left>right?-1:1)*1.2),Math.sin(k.heading+(left>right?-1:1)*1.2)),k.maxSpeed*.7);}

 static roadAvoid(k,danger,scan){const nearest=[...danger].sort((a,b)=>a.distance-b.distance)[0],angle=KC.angle(nearest.angle-k.heading),left=scan.filter(r=>{const a=KC.angle(r.angle-k.heading);return a<0&&a>=-Math.PI/2;}).reduce((s,r)=>s+r.distance,0),right=scan.filter(r=>{const a=KC.angle(r.angle-k.heading);return a>0&&a<=Math.PI/2;}).reduce((s,r)=>s+r.distance,0),side=Math.abs(angle)>.1?-Math.sign(angle):left>right?-1:1;return SteeringBehaviors.velocity(k,createVector(Math.cos(k.heading+side*.8),Math.sin(k.heading+side*.8)),k.maxSpeed*.65);}

 static predictive(k,others){const threat=KartPerception.nearest(k,others,o=>o.alive&&p5.Vector.dist(SteeringBehaviors.predict(k,12),SteeringBehaviors.predict(o,12))<65,140);return threat?SteeringBehaviors.evade(k,threat,12):createVector(0,0);}

 static bounds(k){return SteeringBehaviors.boundaries(k,{x:0,y:0,width:KC.W,height:KC.H},70);}

 static plan(k,w){const manager=k.behaviors;const avoidance=this.avoid(k,w);manager.entries.clear();const add=(name,calculate,weight=1,priority=0)=>manager.add({name,calculate,priority},weight);manager.strategy='weighted';const p=k.perception,neighbors=w.karts.filter(o=>o.alive&&o!==k);

 if(p.threat&&p5.Vector.dist(k.pos,p.threat.pos)<140){add('evade',()=>SteeringBehaviors.evade(k,p.threat,9),2);k.intent='Esquive';}

 else if(k.health<30&&p.enemy&&p5.Vector.dist(k.pos,p.enemy.pos)<180){add('flee',()=>SteeringBehaviors.flee(k,p.enemy.pos),1.4);k.intent='Retraite';}

 else if(w.teamMode?.core.carrier===k.id&&p.enemy&&p5.Vector.dist(k.pos,p.enemy.pos)<160){add('evade-carrier',()=>SteeringBehaviors.evade(k,p.enemy,8),1.1);add('delivery',()=>SteeringBehaviors.arrive(k,w.teamMode.bases[k.team].pos,{slowRadius:100,stopRadius:40}),1);k.intent='Protéger le noyau';}
 else if(k.intercept&&p.enemy===k.intercept){add('intercept',()=>SteeringBehaviors.pursue(k,k.intercept,12));k.intent='Interception';}
 else if(k.intercept){const goal=k.intercept.pos;if(!k.route.length||w.time>(k.teamRouteAt||0)){k.route=w.arena.route(k.pos,goal);k.teamRouteAt=w.time+1;}add('path-following',()=>this.path(k,k.route));k.intent='Rejoindre le porteur signalé';}
 else if(k.leader?.alive){const allies=neighbors.filter(o=>o.team===k.team);add(k.snake?'chained-arrive':'leader-following',()=>k.snake?SteeringBehaviors.arrive(k,SteeringBehaviors.predict(k.leader,-0),{slowRadius:100,stopRadius:58}):SteeringBehaviors.followLeader(k,k.leader,78));if(!k.snake){add('alignment',()=>SteeringBehaviors.alignment(k,allies,200),.25);add('cohesion',()=>SteeringBehaviors.cohesion(k,allies,250),.18);}k.intent='Convoi';}

 else if(k.missionGoal){if(!k.route.length||p5.Vector.dist(k.route.at(-1),k.missionGoal)>60)k.route=w.arena.route(k.pos,k.missionGoal);if(k.precision&&w.arena.clear(k.pos,k.missionGoal,25)){const near=p5.Vector.dist(k.pos,k.missionGoal)<150;add(near?'arrive':'seek',()=>near?SteeringBehaviors.arrive(k,k.missionGoal,{slowRadius:150,stopRadius:40}):k.seek(k.missionGoal));}else add('path-following',()=>this.path(k,k.route));if(k.patrol&&!k.precision)add('wander',()=>SteeringBehaviors.wander(k,w.rng),.18);k.intent=k.role||'Balise';}

 else if(k.patrol){if(!k.route.length||p5.Vector.dist(k.pos,k.route.at(-1))<60)k.route=w.arena.route(k.pos,w.arena.spawns[(k.patrolIndex++||0)%w.arena.spawns.length]);add('path-following',()=>this.path(k,k.route));add('wander',()=>SteeringBehaviors.wander(k,w.rng),.12);k.intent='Patrouille';}

 else{let goal=!k.item&&p.pickup?p.pickup:p.enemy;k.intent=!k.item?'Caisse':'Poursuite';if(!goal||w.time>k.goalUntil||k.goalId!==goal.id){k.goalId=goal?.id;k.goalUntil=w.time+7;k.route=goal?w.arena.route(k.pos,goal.pos):[];}

 if(goal&&w.arena.clear(k.pos,goal.pos,25)){add(goal===p.enemy?'pursue':'seek',()=>goal===p.enemy?SteeringBehaviors.pursue(k,goal,k.tuning?.prediction??8):SteeringBehaviors.arrive(k,goal.pos,{slowRadius:60,stopRadius:0}));}

 else if(k.route.length)add('path-following',()=>this.path(k,k.route));else{add('wander',()=>SteeringBehaviors.wander(k,w.rng));k.intent='Exploration';}}

 add('obstacle-avoidance',()=>avoidance,2.4);add('predictive-avoidance',()=>this.predictive(k,neighbors),.35);add('separation',()=>SteeringBehaviors.separation(k,neighbors),.7);add('boundaries',()=>this.bounds(k),2);

 let force=manager.getSteeringForce({});if(avoidance.mag()>0){manager.last.priority='obstacle-avoidance';force=avoidance.copy().limit(k.maxForce);}manager.last.force={x:force.x,y:force.y};k.planningForce={x:force.x,y:force.y};k.neighborIds=neighbors.filter(o=>p5.Vector.dist(k.pos,o.pos)<250).map(o=>({id:o.id,x:o.pos.x,y:o.pos.y}));return force;

 }

}

