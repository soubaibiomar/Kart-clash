class TrackArena extends KartArena {
 constructor(data){super();this.track=KartTrack.validate(data);Object.assign(this,KartTrack.dimensions(this.track));if(this.track.schema==='kart-track-v2'){this.build3D();return;}this.pickups=[];this.obstacles=[];const cell=40,rows=35,cols=45;
 // Merge blocked grid runs vertically. These exact rectangles drive sensing, collisions and rendering.
 const active=new Map();for(let y=0;y<rows;y++){const runs=[];let start=null;for(let x=0;x<=cols;x++){const blocked=x<cols&&!KartTrack.onRoad({x:(x+.5)*cell,y:(y+.5)*cell},this.track);if(blocked&&start===null)start=x;if(!blocked&&start!==null){runs.push([start,x]);start=null;}}const keys=new Set();for(const [a,b] of runs){const key=a+':'+b;keys.add(key);const old=active.get(key);if(old&&old.last===y-1){old.entity.h+=cell;old.entity.pos.y+=cell/2;old.last=y;}else{const entity=new ArenaObstacle('track-wall-'+this.obstacles.length,(a+b)*cell/2,(y+.5)*cell,(b-a)*cell,cell,22);entity.kind='track-wall';this.obstacles.push(entity);active.set(key,{entity,last:y});}}for(const key of active.keys())if(!keys.has(key))active.delete(key);}
 this.solids=[...this.obstacles,...this.boundaries];this.spawns=[createVector(this.track.points[0].x,this.track.points[0].y)];if(!this.free(this.spawns[0],25))throw Error('Départ trop proche du bord : élargis ou déplace le tracé.');
 }
 build3D(){this.pickups=[];this.obstacles=[];const points=this.track.points,count=points.length-(this.track.closed?0:1);this.decks=[];
  const offset=(i,side)=>KartTrack.offset(this.track,i,side);
  for(let i=0;i<count;i++){const j=(i+1)%points.length,deck=new TrackSegment(i,points[i],points[j],this.track.width);this.decks.push(deck);for(const side of [-1,1])this.obstacles.push(new TrackRail('rail-'+i+'-'+side,offset(i,side),offset(j,side)));}
  this.supports=KartTrack.supportSpecs(this.track).map((s,i)=>new TrackSupport('support-'+i,s.x,s.y,s.height));this.obstacles.push(...this.supports);this.city=CityLayout.plan(this.track);this.buildings=this.city.buildings.map(s=>new CityBuilding(s));this.fixtures=this.city.fixtures.map(s=>new StreetFixture(s));this.obstacles.push(...this.buildings,...this.fixtures);this.solids=this.obstacles;this.spawns=[createVector(points[0].x,points[0].y)];
 }
 solidsFor(k){return this.decks?this.solids.filter(o=>o.blocks(k)):this.solids;}
 route(start,goal){return this.decks?[goal.copy()]:super.route(start,goal);}
}
