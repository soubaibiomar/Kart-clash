// Ray/segment intersection adapted from example 9. Helpers are perception, not world entities.
class RacingSensors {
  static intersect(origin,direction,a,b,range){
    const sx=b.x-a.x,sy=b.y-a.y,den=direction.x*sy-direction.y*sx;
    if(Math.abs(den)<1e-9)return null;
    const dx=a.x-origin.x,dy=a.y-origin.y;
    const t=(dx*sy-dy*sx)/den,u=(dx*direction.y-dy*direction.x)/den;
    return t>=0&&t<=range&&u>=0&&u<=1?t:null;
  }
  static scan(car,nearby,range=220){
    range=GP.clamp(Number(range)||220,60,500);
    const heading=car.vel.mag()>.15?car.vel.heading():car.heading;
    const angles=[-150,-90,-55,-30,-15,0,15,30,55,90,150,180];
    if(!car.track.sensorGrid){
      car.track.sensorGrid=new Map();
      for(const wall of car.track.borders||[]){
        for(let x=Math.floor(Math.min(wall.a.x,wall.b.x)/240);x<=Math.floor(Math.max(wall.a.x,wall.b.x)/240);x++)for(let y=Math.floor(Math.min(wall.a.y,wall.b.y)/240);y<=Math.floor(Math.max(wall.a.y,wall.b.y)/240);y++){
          const key=`${x},${y}`;if(!car.track.sensorGrid.has(key))car.track.sensorGrid.set(key,[]);car.track.sensorGrid.get(key).push(wall);
        }
      }
    }
    const candidates=new Set();
    for(let x=Math.floor((car.pos.x-range)/240);x<=Math.floor((car.pos.x+range)/240);x++)for(let y=Math.floor((car.pos.y-range)/240);y<=Math.floor((car.pos.y+range)/240);y++)for(const w of car.track.sensorGrid.get(`${x},${y}`)||[])candidates.add(w);
    const borders=[...candidates];
    const rays=angles.map(degrees=>{
      const angle=heading+degrees*Math.PI/180,dir=createVector(Math.cos(angle),Math.sin(angle));
      let distance=range,kind='clear',hit=null;
      for(const wall of borders){
        // Reject distant geometry before the exact cast.
        if(Math.min(wall.a.x,wall.b.x)>car.pos.x+range||Math.max(wall.a.x,wall.b.x)<car.pos.x-range||Math.min(wall.a.y,wall.b.y)>car.pos.y+range||Math.max(wall.a.y,wall.b.y)<car.pos.y-range)continue;
        const d=this.intersect(car.pos,dir,wall.a,wall.b,range);
        if(d!==null&&d<distance){distance=d;kind='border';}
      }
      for(const other of nearby){
        if(other===car||other.removed||other.inPit!==car.inPit)continue;
        const offset=p5.Vector.sub(other.pos,car.pos),along=offset.dot(dir),radius=Number.isFinite(other.r)?other.r:25;
        const perpendicular=offset.dot(offset)-along*along;
        if(along+radius<0||perpendicular>radius*radius)continue;
        const d=Math.max(0,along-Math.sqrt(Math.max(0,radius*radius-perpendicular)));
        if(d<=distance){distance=d;kind='car';hit=other;}
      }
      return {degrees,dir,distance,kind,hit,point:dir.copy().mult(distance).add(car.pos)};
    });
    const front=rays.find(r=>r.degrees===0),left=rays.find(r=>r.degrees===-90),right=rays.find(r=>r.degrees===90);
    const relative=front.hit?car.vel.copy().sub(front.hit.vel).dot(front.dir):0;
    return {origin:car.pos.copy(),range,rays,front,left,right,closing:Math.max(0,relative),ttc:relative>0?front.distance/(relative*60):Infinity,
      leftOccupied:rays.some(r=>r.degrees<0&&r.kind==='car'&&r.distance<85),rightOccupied:rays.some(r=>r.degrees>0&&r.degrees<180&&r.kind==='car'&&r.distance<85)};
  }
  static safeSpeed(car,scan,requested,includeBorders=false){
    const front=scan.front;if(!front)return requested;
    if(includeBorders&&front.kind==='border')return Math.min(requested,Math.sqrt(2*Math.max(.05,car.maxForce)*Math.max(0,front.distance-car.r-8)));
    if(front.kind!=='car'||!front.hit||front.hit.removed)return requested;
    // Expert mode already negotiates route order/lanes; preserve its hairpin handling.
    // Neural safety uses physical clearance, including traffic a lap behind.
    if(!includeBorders&&front.hit.distance<=car.distance)return requested;
    const stopping=scan.closing*scan.closing/(2*Math.max(.05,car.maxForce))+45;
    if(front.distance>stopping)return requested;
    return Math.min(requested,Math.max(0,includeBorders?front.hit.vel.dot(front.dir)+(front.distance-car.r-8)*.03:front.hit.vel.mag()+(front.distance-28)*.03));
  }
  static correction(car,scan){
    // Braking uses the front fan; lateral clearance changes a desired velocity.
    const direction=car.vel.mag()>.1?car.vel.copy().normalize():createVector(Math.cos(car.heading),Math.sin(car.heading));
    const normal=createVector(-direction.y,direction.x),desired=car.vel.copy();
    let demand=0;
    for(const ray of scan.rays){
      if(ray.kind!=='border'||Math.abs(ray.degrees)>90)continue;
      const clearance=Math.abs(ray.degrees)>=55?32:50;
      if(ray.distance<clearance){const side=ray.degrees===0?((scan.left?.distance||0)>(scan.right?.distance||0)?1:-1):Math.sign(ray.degrees);demand-=side*(1-ray.distance/clearance)*1.5;}
    }
    desired.add(normal.mult(GP.clamp(demand,-1,1)));
    return desired.sub(car.vel).limit(car.maxForce*.35);
  }
  static render(car){
    if(!car.sensors)return;
    strokeWeight(1.2);
    for(const ray of car.sensors.rays){stroke(ray.kind==='car'?'#ffbd4a':ray.kind==='border'?'#f16c79':'#86cbb055');line((car.sensors.origin||car.pos).x,(car.sensors.origin||car.pos).y,ray.point.x,ray.point.y);}
  }
}
