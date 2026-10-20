class KartPerception{

 static nearest(k,entities,predicate=()=>true,range=Infinity){let best=null,distance=range;for(const o of entities){if(o===k||!predicate(o))continue;const d=p5.Vector.dist(k.pos,o.pos);if(d<=distance&&(d<distance||best===null||String(o.id)<String(best.id))){best=o;distance=d;}}return best;}

 static rays(k,world,count=9,range=220){const rays=[];for(let i=0;i<count;i++){const angle=k.heading+(i/(count-1)*2-1)*Math.PI,dir=createVector(Math.cos(angle),Math.sin(angle)),end=dir.copy().mult(range).add(k.pos);let distance=range;for(const o of world.arena.solidsFor?.(k)||world.arena.solids){const hit=KartCollision.segment(k.pos,end,KartCollision.box(o),k.r);if(hit!==null)distance=Math.min(distance,hit*range);}rays.push({distance,angle,dir,origin:{x:k.pos.x,y:k.pos.y},hit:{x:k.pos.x+dir.x*distance,y:k.pos.y+dir.y*distance},range});}return rays;}

 static scan(k,w,count=9,range=220){const enemy=this.nearest(k,w.karts,o=>o.alive&&o.team!==k.team&&w.arena.clear(k.pos,o.pos,0),700),pickup=this.nearest(k,w.arena.pickups,o=>o.available(w.time),700),threat=this.nearest(k,w.projectiles,o=>o.owner!==k.id&&w.arena.clear(k.pos,o.pos,0)&&p5.Vector.sub(k.pos,o.pos).dot(o.vel)>0,260);return {enemy,pickup,threat,origin:{x:k.pos.x,y:k.pos.y},tick:w.tick,range:700,threatSample:threat?{id:threat.id,x:threat.pos.x,y:threat.pos.y,predicted:{x:threat.pos.x+threat.vel.x*9,y:threat.pos.y+threat.vel.y*9}}:null,rays:this.rays(k,w,count,range)};}

}

