/** Surface attachment/contact phase. Horizontal movement still uses inherited Vehicle locomotion. */
class TrackSurface{
 static attach(arena,k){let index=Number.isInteger(k.surfaceIndex)?k.surfaceIndex:0;const n=arena.decks.length,current=arena.decks[index],candidates=[current],s=current.sample(k.pos),near=arena.track.width*.8;
  for(const offset of [-1,1]){const next=index+offset;if(!arena.track.closed&&(next<0||next>=n))continue;const shared=offset<0?current.a:current.b;if(Math.hypot(k.pos.x-shared.x,k.pos.y-shared.y)<=near)candidates.push(arena.decks[(next+n)%n]);}
  let chosen=current,best=s.distance;for(const deck of candidates){const sample=deck.sample(k.pos);if(sample.distance<best-1e-6){chosen=deck;best=sample.distance;}}
  const p=chosen.sample(k.pos);k.surfaceIndex=chosen.index;k.elevation=p.elevation;k.surfaceSlope=(chosen.b.elevation-chosen.a.elevation)/Math.max(1,Math.hypot(chosen.b.x-chosen.a.x,chosen.b.y-chosen.a.y));const length=Math.hypot(chosen.b.x-chosen.a.x,chosen.b.y-chosen.a.y);k.slopeVector={x:(chosen.b.x-chosen.a.x)/length*k.surfaceSlope,y:(chosen.b.y-chosen.a.y)/length*k.surfaceSlope};return {deck:chosen,...p};
 }
 static constrain(arena,k){const p=this.attach(arena,k),limit=arena.track.width/2-k.r;if(p.distance<=limit)return false;const dx=(k.pos.x-p.x)/(p.distance||1),dy=(k.pos.y-p.y)/(p.distance||1);k.pos.set(p.x+dx*limit,p.y+dy*limit);const inward=k.vel.x*dx+k.vel.y*dy;if(inward>0)k.vel.sub(createVector(dx,dy).mult(inward));return true;}
}
