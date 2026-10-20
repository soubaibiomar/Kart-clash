import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Adaptateur mathématique p5 pour exécuter les vraies classes sans navigateur.
class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  set(x, y) { if (typeof x === 'object') { this.x = x.x; this.y = x.y; } else { this.x = x; this.y = y; } return this; }
  add(x, y) { if (typeof x === 'object') { this.x += x.x; this.y += x.y; } else { this.x += x; this.y += y; } return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { return this.mult(1 / n); }
  mag() { return Math.hypot(this.x, this.y); }
  normalize() { const length = this.mag(); return length ? this.div(length) : this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  dot(v) { return this.x * v.x + this.y * v.y; }
  heading() { return Math.atan2(this.y, this.x); }
  static sub(a, b) { return a.copy().sub(b); }
  static add(a, b) { return a.copy().add(b); }
  static dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
}

function environment() {
  const calls = [];
  const context = vm.createContext({
    p5: { Vector }, createVector: (x, y) => new Vector(x, y),
    random: (a, b) => b === undefined ? a / 2 : (a + b) / 2,
    PI: Math.PI, HALF_PI: Math.PI / 2, TWO_PI: Math.PI * 2,
    cos: Math.cos, sin: Math.sin, min: Math.min, max: Math.max,
    width: 1200, height: 800, debug: false,
    CENTER: 'center', CORNER: 'corner', ROUND: 'round', CLOSE: 'close', BOLD: 'bold', NORMAL: 'normal',
    drawingContext: { setLineDash: () => {} }
  });
  for (const name of ['push','pop','translate','rotate','rectMode','fill','noFill','stroke','noStroke','strokeWeight','rect','line','ellipse','arc','triangle','text','textAlign','textSize','textStyle','background','strokeJoin','strokeCap','beginShape','vertex','endShape']) {
    context[name] = (...args) => calls.push({ name, args });
  }
  for (const name of ['path.js','vehicle.js','trackBorder.js','roadObstacle.js','obstacleAvoidance.js','borderSteering.js','raceCar.js','wanderCar.js','raceTrack.js','raceSimulation.js']) {
    vm.runInContext(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'), context, { filename: name });
  }
  vm.runInContext('this.classes = {Vehicle, RaceCar, WanderCar, Path, RaceTrack, RaceSimulation, TrackBorder, RoadObstacle, ObstacleAvoidance}', context);
  return { ...context.classes, calls, setBounds:(w,h)=>{context.width=w;context.height=h;} };
}

test('F1 et promenade héritent des classes fournies, locomotion réutilisée', () => {
  const { Vehicle, RaceCar, WanderCar, RaceTrack, Path } = environment();
  assert.ok(new RaceCar(0, 0) instanceof Vehicle);
  assert.ok(new WanderCar(0, 0, 1) instanceof RaceCar);
  assert.ok(new RaceTrack(1200, 800) instanceof Path);
  assert.equal(RaceCar.prototype.update, Vehicle.prototype.update);
  assert.equal(RaceCar.prototype.seek, Vehicle.prototype.seek);
  assert.notEqual(RaceCar.prototype.follow, Vehicle.prototype.follow);
  assert.equal(RaceCar.prototype.separate, Vehicle.prototype.separate);
});

test('séparation à zéro désactivée, proche répulsif, loin sans effet', () => {
  const { RaceCar } = environment();
  const car = new RaceCar(100, 100), neighbor = new RaceCar(110, 100);
  car.vel.set(0, 0); car.follow = () => new Vector();
  car.applyBehaviors([car, neighbor], null, 0);
  assert.equal(car.acc.mag(), 0);
  car.applyBehaviors([car, neighbor], null, 0.2);
  const weak = car.acc.mag();
  assert.ok(car.acc.x < 0);
  car.acc.set(0, 0);
  car.applyBehaviors([car, neighbor], null, 1);
  assert.ok(car.acc.mag() > weak);
  neighbor.pos.set(500, 100); car.acc.set(0, 0);
  car.applyBehaviors([car, neighbor], null, 5);
  assert.equal(car.acc.mag(), 0);
});

test('composition pondérée et limite de force totale aux bornes du curseur', () => {
  const { RaceCar } = environment();
  const car = new RaceCar(0, 0);
  car.follow = () => new Vector(0.1, 0);
  car.separate = () => new Vector(0, 0.1);
  car.applyBehaviors([], null, 1);
  assert.ok(Math.abs(car.acc.x - 0.2) < 1e-9);
  assert.ok(Math.abs(car.acc.y - 0.02) < 1e-9);
  for (const weight of [-1, 0, 5, 100]) {
    car.acc.set(0, 0); car.applyBehaviors([], null, weight);
    assert.ok(car.acc.mag() <= car.maxForce + 1e-9);
    assert.ok(car.separateWeight >= 0 && car.separateWeight <= 5);
  }
});

test('rendu F1 orienté selon la vitesse et quatre pneus', () => {
  const { RaceCar, calls } = environment();
  const car = new RaceCar(100, 100); car.vel.set(0, 3); car.render();
  assert.ok(calls.some(c => c.name === 'rotate' && Math.abs(c.args[0] - Math.PI / 2) < 1e-9));
  assert.equal(calls.filter(c => c.name === 'rect' && c.args[2] === 10 && c.args[3] === 7).length, 4);
  assert.ok(calls.some(c => c.name === 'triangle'));
});

test('circuit fermé, segments non dégénérés et route dans le canvas', () => {
  const { RaceTrack } = environment();
  for (const [w, h] of [[1200,800], [390,600]]) {
    const track = new RaceTrack(w, h);
    assert.equal(track.points.length, 176);
    track.points.forEach((point, i) => {
      assert.ok(Vector.dist(point, track.points[(i + 1) % track.points.length]) > 0);
      assert.ok(point.x > track.roadHalfWidth && point.x < w - track.roadHalfWidth);
      assert.ok(point.y > track.roadHalfWidth && point.y < h - track.roadHalfWidth);
    });
  }
});

test('anticipation traverse les segments et boucle sans saut', () => {
  const { RaceTrack } = environment();
  const track = new RaceTrack(1200,800);
  const first = track.sample(0);
  const next = track.sample(track.lengths[0]+10);
  assert.ok(next.index > first.index);
  assert.ok(Vector.dist(track.sample(track.totalLength+15).point,track.sample(15).point)<1e-8);
  const projection=track.project(track.points[30]);
  assert.ok(projection.distance<1e-8);
  assert.ok(Number.isFinite(track.sample(projection.along+70).point.x));
});

test('le curseur reste progressif quand la voiture est déjà sur la route', () => {
  const { RaceCar } = environment();
  const car=new RaceCar(100,100), other=new RaceCar(110,100,2);
  car.follow=()=>new Vector(); car.vel.set(0,0);
  car.applyBehaviors([car,other],null,1); const low=car.acc.mag();
  car.acc.set(0,0); car.applyBehaviors([car,other],null,5);
  assert.ok(car.acc.mag()>low*1.5);
  assert.ok(car.acc.mag()<=car.maxForce);
  car.acc.set(0,0); other.pos.set(car.pos);
  car.applyBehaviors([car,other],null,1);
  assert.ok(car.acc.x<0);
});

test('voitures rapides ralentissent avant les virages et gardent la locomotion', () => {
  const { RaceCar, RaceTrack }=environment();
  const track=new RaceTrack(1200,800);
  const car=new RaceCar(0,0,1,true);
  let lowest=7,highest=0;
  for(let i=0;i<track.points.length;i++) {
    const sample=track.sample(track.cumulative[i]);
    car.pos.set(sample.point);car.vel.set(sample.tangent.copy().mult(7));car.borderSteering.side=null;
    car.follow(track);lowest=Math.min(lowest,car.maxSpeed);highest=Math.max(highest,car.maxSpeed);
  }
  assert.ok(lowest<4);
  assert.ok(highest>lowest+1);
});

test('le tracé ne se croise pas et possède des changements de courbure', () => {
  const { RaceTrack }=environment();
  const track=new RaceTrack(1200,800), points=track.points;
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  let left=0,right=0;
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length],c=points[(i+2)%points.length];
    if(cross(a,b,c)>0)left++;else right++;
    for(let j=i+2;j<points.length;j++) {
      if(i===0&&j===points.length-1)continue;
      const d=points[j],e=points[(j+1)%points.length];
      assert.ok(!(cross(a,b,d)*cross(a,b,e)<0&&cross(d,e,a)*cross(d,e,b)<0));
    }
  }
  assert.ok(left>10&&right>10);
});

test('un véhicule rapide termine les virages sans sortir du ruban de piste', () => {
  const { RaceSimulation }=environment();
  const scene=new RaceSimulation(1200,800);
  scene.track.display=()=>{};scene.cars=[];
  const start=scene.track.sample(0);
  const fast=scene.addCar(start.point.x,start.point.y,'fast');fast.render=()=>{};
  for(let frame=0;frame<2000;frame++) {
    scene.frame();
    assert.ok(scene.track.project(fast.pos).distance<scene.track.roadHalfWidth);
  }
});

test('16 voitures sur le circuit, ajouts rapides/verts et plafond', () => {
  const { RaceSimulation, WanderCar } = environment();
  const scene = new RaceSimulation(1200, 800);
  assert.equal(scene.cars.length, 16);
  assert.equal(scene.addCar(10, 10, 'fast').maxSpeed, 7);
  const green = scene.addCar(20, 20, 'wander');
  assert.ok(green instanceof WanderCar);
  assert.equal(green.wanderWeight, 1);
  while (scene.cars.length < 80) scene.addCar(10, 10);
  assert.equal(scene.addCar(10, 10), null);
  scene.separationWeight = 4; scene.reset();
  assert.equal(scene.cars.length, 16);
  assert.equal(scene.separationWeight, 4);
});

test('simulation déterministe prolongée, forces et vitesses finies', () => {
  const { RaceSimulation } = environment();
  const scene = new RaceSimulation(1200, 800);
  scene.track.display = () => {};
  for (const car of scene.cars) car.render = () => {};
  for (let frame = 0; frame < 600; frame++) {
    scene.separationWeight = frame < 300 ? 0 : 5;
    scene.frame();
    for (const car of scene.cars) {
      assert.ok(Number.isFinite(car.pos.x) && Number.isFinite(car.pos.y));
      assert.ok(car.vel.mag() <= car.maxSpeed + 1e-9);
      assert.equal(car.acc.mag(), 0);
    }
  }
  assert.equal(scene.cars.length, 16);
});


function straightRoad(RaceTrack) {
  const track = new RaceTrack(1200,800);
  track.roadHalfWidth = 40;
  track.contains=point=>point.y>=0 && point.y<=track.roadHalfWidth*2;
  track.borders = [0,80].map((y,i) => [{ a:new Vector(-100,y),b:new Vector(1000,y),
    tangent:new Vector(1,0),inward:new Vector(0,i ? -1 : 1),length:1100,side:i ? 1 : -1,index:0 }]);
  return track;
}

test('capteurs : bord le plus proche, portée inclusive et rayons parallèles', () => {
  const { RaceTrack } = environment(), track=straightRoad(RaceTrack);
  const origin = new Vector(100,40);
  const hit=track.senseBorder(origin,new Vector(0,-1),40);
  assert.equal(hit.distance,40);
  assert.equal(hit.point.y,0);
  assert.equal(hit.inward.y,1);
  assert.equal(track.senseBorder(origin,new Vector(0,-1),39.9),null);
  assert.equal(track.senseBorder(origin,new Vector(1,0),100),null);
  assert.equal(track.senseBorder(new Vector(100,-10),new Vector(0,1),100).distance,10);
  assert.equal(track.nearestBorder(new Vector(100,-10)).clearance,-10);
});

test('le pilotage ne consulte jamais la ligne centrale ; capteurs sans déplacement direct', () => {
  const { RaceCar, RaceTrack } = environment(), track=new RaceTrack(1200,800);
  const start=track.sample(0), car=new RaceCar(start.point.x,start.point.y);
  car.vel.set(start.tangent.copy().mult(car.maxSpeed));
  track.project=track.sample=()=>{throw new Error('Lecture interdite de la ligne centrale');};
  const before=car.pos.copy(), force=car.follow(track);
  assert.equal(Vector.dist(car.pos,before),0);
  assert.ok(force.mag()<=car.maxForce+1e-9);
  assert.equal(car.borderSteering.sensors.length,5);
  assert.ok(car.borderSteering.sensors.some(sensor=>sensor.hit));
  for(const sensor of car.borderSteering.sensors) if(sensor.hit) {
    assert.ok(track.nearestBorder(sensor.end).distance<1e-7);
  }
});

test('près d’un bord, correction vers l’intérieur et priorité sur la séparation', () => {
  const { RaceCar,RaceTrack }=environment(), track=straightRoad(RaceTrack);
  const car=new RaceCar(100,5), neighbor=new RaceCar(100,12,2);
  car.vel.set(2,-2);
  car.applyBehaviors([car,neighbor],track,5);
  assert.ok(car.borderSteering.urgent);
  assert.ok(car.acc.y>0);
  assert.ok(car.acc.mag()<=car.maxForce+1e-9);
  car.pos.set(100,75);car.vel.set(2,2);car.acc.set(0,0);
  car.applyBehaviors([car],track,5);
  assert.ok(car.acc.y<0);
});

test('hors piste, retour par steering et reprise de la vitesse de croisière', () => {
  const { RaceCar,RaceTrack }=environment(), track=straightRoad(RaceTrack);
  const car=new RaceCar(100,-30); car.vel.set(0,0);
  let entered=false;
  for(let frame=0;frame<120;frame++) {
    const previous=car.pos.copy();car.applyBehaviors([car],track,1.2);
    assert.equal(Vector.dist(car.pos,previous),0);
    car.update();
    if(car.pos.y>20) entered=true;
  }
  assert.ok(entered);
  assert.ok(car.pos.y>0 && car.pos.y<80);
  assert.equal(car.maxSpeed,car.cruiseSpeed);
});

test('la séparation maximale ne pousse pas une voiture rapide hors piste', () => {
  const { RaceSimulation }=environment(), scene=new RaceSimulation(1200,800);
  scene.track.display=()=>{}; scene.cars=[]; scene.separationWeight=5;
  const start=scene.track.sample(0), car=scene.addCar(start.point.x,start.point.y,'fast');
  car.render=()=>{};
  for(let frame=0;frame<2500;frame++) {
    scene.frame();
    assert.ok(scene.track.project(car.pos).distance<scene.track.roadHalfWidth,`sortie à l’image ${frame}`);
  }
});


test('toutes les entités physiques héritent de Vehicle : voitures, obstacles et bordures', () => {
  const {Vehicle,RaceCar,WanderCar,RoadObstacle,TrackBorder,RaceTrack}=environment();
  for(const entity of [new RaceCar(0,0),new WanderCar(0,0,1),new RoadObstacle(0,0)]) assert.ok(entity instanceof Vehicle);
  const track=new RaceTrack(1200,800);
  assert.equal(track.borders.flat().length,352);
  for(const border of track.borders.flat()) {
    assert.ok(border instanceof Vehicle && border instanceof TrackBorder);
    assert.equal(border.vel.mag(),0);
  }
  const obstacle=new RoadObstacle(10,20); obstacle.update();
  assert.equal(obstacle.pos.x,10); assert.equal(obstacle.pos.y,20);
});

test('évitement exemple 6 : vide, loin, hors couloir, proche et obstacle entre les sondes', () => {
  const {RaceCar,RoadObstacle}=environment(), car=new RaceCar(0,0);
  car.vel.set(3,0);
  const behavior=car.obstacleAvoidance;
  assert.equal(behavior.force(car,[]).mag(),0);
  assert.equal(behavior.force(car,[new RoadObstacle(500,0)]).mag(),0);
  assert.equal(behavior.force(car,[new RoadObstacle(20,50)]).mag(),0);
  const obstacle=new RoadObstacle(70,0,5), force=behavior.force(car,[obstacle]);
  assert.equal(behavior.probes[1].x,45); assert.equal(behavior.probes[2].x,90);
  assert.ok(force.y>0); assert.ok(force.mag()<=car.maxForce+1e-9);
  assert.equal(car.pos.x,0); assert.equal(car.pos.y,0);
  const offAxis=new RoadObstacle(10,100), close=new RoadObstacle(60,5);
  behavior.plan=null;
  behavior.force(car,[offAxis,close,obstacle]);
  assert.equal(behavior.threat,close);
});

test('curseur évitement : zéro désactive, progression et force totale bornée', () => {
  const {RaceCar,RoadObstacle}=environment(), car=new RaceCar(0,0);
  car.vel.set(3,0); car.follow=()=>new Vector();car.separationForce=()=>new Vector();
  const obstacle=new RoadObstacle(70,0,5);
  car.applyBehaviors([car],null,0,[obstacle],0);
  assert.equal(car.acc.mag(),0);
  car.applyBehaviors([car],null,0,[obstacle],.2);const low=car.acc.mag();
  car.acc.set(0,0);car.applyBehaviors([car],null,0,[obstacle],1);
  assert.ok(car.acc.mag()>low);assert.ok(car.acc.y>0);
  car.acc.set(0,0);car.applyBehaviors([car],null,5,[obstacle],5);
  assert.ok(car.acc.mag()<=car.maxForce+1e-9);
});

test('séparation : aucun ralentissement sans voisin et répulsion latérale progressive', () => {
  const {RaceCar}=environment(), car=new RaceCar(0,0), other=new RaceCar(0,15,2);
  car.vel.set(3,0);car.follow=()=>new Vector(.05,0);
  car.applyBehaviors([car],null,0); const baseline=car.acc.copy();
  car.acc.set(0,0);car.applyBehaviors([car],null,5);
  assert.equal(Vector.dist(car.acc,baseline),0);
  car.acc.set(0,0);car.applyBehaviors([car,other],null,1);const weak=Math.abs(car.acc.y);
  car.acc.set(0,0);car.applyBehaviors([car,other],null,5);
  assert.ok(Math.abs(car.acc.y)>weak*3);
  assert.ok(car.acc.x>0);
});

test('bouton obstacles : ajout, superposition refusée, redimensionnement et reset', () => {
  const {RaceSimulation,RoadObstacle}=environment(), scene=new RaceSimulation(1200,800);
  assert.equal(scene.obstacles.length,0);
  assert.ok(scene.addObstacle(100,100) instanceof RoadObstacle);
  assert.equal(scene.addObstacle(100,100),null);
  scene.resize(600,400);
  assert.equal(scene.obstacles[0].pos.x,50);assert.equal(scene.obstacles[0].pos.y,50);
  scene.avoidanceWeight=4;scene.reset();assert.equal(scene.obstacles.length,0);assert.equal(scene.avoidanceWeight,4);
});

test('circulation continue en format écran large, sans blocage aux épingles ou à la fermeture', () => {
  const {RaceSimulation,setBounds}=environment(), scene=new RaceSimulation(1920,815);
  setBounds(1920,815);
  scene.track.display=()=>{};scene.cars=[];
  const point=scene.track.sample(0).point, car=scene.addCar(point.x,point.y,'fast');car.render=()=>{};
  let completed=false, previous=car.borderSteering.index, seenFar=false;
  for(let frame=0;frame<5000;frame++) {
    scene.frame();
    const index=car.borderSteering.index;
    if(index>130)seenFar=true;
    if(seenFar && previous>160 && index<10)completed=true;
    previous=index;
    assert.ok(scene.track.project(car.pos).distance<scene.track.roadHalfWidth,JSON.stringify({frame,index,pos:car.pos,speed:car.vel.mag(),clear:scene.track.nearestBorder(car.pos,null,index).clearance,urgent:car.borderSteering.urgent}));
  }
  assert.ok(completed,'la voiture doit effectuer un tour complet');
});


test('une F1 contourne un obstacle sur la ligne droite puis poursuit sa course', () => {
  const {RaceSimulation,setBounds}=environment(), scene=new RaceSimulation(1920,815);
  setBounds(1920,815);scene.cars=[];scene.obstacles=[];scene.track.display=()=>{};
  const start=scene.track.sample(200).point, car=scene.addCar(start.x,start.y);car.render=()=>{};
  const obstacle=scene.addObstacle(start.x+160,start.y);obstacle.render=()=>{};
  scene.avoidanceWeight=3;
  let minDistance=Infinity,passed=false;
  for(let frame=0;frame<260;frame++) {
    scene.frame();
    minDistance=Math.min(minDistance,Vector.dist(car.pos,obstacle.pos));
    if(car.pos.x>obstacle.pos.x+45)passed=true;
    assert.ok(scene.track.project(car.pos).distance<scene.track.roadHalfWidth);
  }
  assert.ok(passed);assert.ok(minDistance>obstacle.r+12);
});


test('une voiture rapide ralentit derrière une voiture lente ; le curseur augmente l’espacement', () => {
  const {RaceCar,RaceTrack}=environment(), track=straightRoad(RaceTrack);
  const run=weight=>{
    const lead=new RaceCar(230,40,1), follower=new RaceCar(100,40,2,true);
    lead.cruiseSpeed=2;lead.maxSpeed=2;lead.vel.set(2,0);follower.vel.set(7,0);
    for(let frame=0;frame<180;frame++) {
      lead.applyBehaviors([lead,follower],track,weight);
      follower.applyBehaviors([lead,follower],track,weight);
      lead.update();follower.update();
      assert.ok(lead.pos.x-follower.pos.x>=40,`chevauchement à ${frame}`);
    }
    assert.ok(follower.vel.mag()>1);
    return lead.pos.x-follower.pos.x;
  };
  const normal=run(1.2),strong=run(5);
  assert.ok(strong>normal+15);
});

test('arrêt derrière un voisin immobile et reprise après libération de la voie', () => {
  const {RaceCar,RaceTrack}=environment(), track=straightRoad(RaceTrack);
  const lead=new RaceCar(230,40,1), follower=new RaceCar(100,40,2,true);
  lead.vel.set(0,0);follower.vel.set(7,0);
  for(let i=0;i<120;i++) {
    follower.applyBehaviors([lead,follower],track,1.2);follower.update();
    assert.ok(lead.pos.x-follower.pos.x>=40);
  }
  assert.ok(follower.vel.mag()<.1);
  lead.maxSpeed=lead.cruiseSpeed=3;lead.vel.set(3,0);
  for(let i=0;i<100;i++) {
    follower.applyBehaviors([lead,follower],track,1.2);lead.update();follower.update();
  }
  assert.ok(follower.vel.mag()>1);
  assert.ok(lead.pos.x-follower.pos.x>=40);
});

test('séparation zéro laisse les véhicules libres, la vitesse temporaire est restaurée', () => {
  const {RaceCar,RaceTrack}=environment(), track=straightRoad(RaceTrack);
  const lead=new RaceCar(140,40,1), follower=new RaceCar(100,40,2,true);lead.vel.set(0,0);
  follower.applyBehaviors([lead,follower],track,5);
  assert.equal(follower.maxSpeed,0);
  follower.acc.set(0,0);follower.applyBehaviors([lead,follower],track,0);
  assert.equal(follower.maxSpeed,follower.cruiseSpeed);
});


test('piste plus large : 120 px sur ordinateur et bordures cohérentes avec l’asphalte', () => {
  const {RaceTrack}=environment();
  const track=new RaceTrack(1920,815);
  assert.equal(track.roadHalfWidth*2,120);
  const point=track.sample(200).point;
  assert.ok(Math.abs(track.nearestBorder(point,-1).distance-60)<1);
  assert.ok(Math.abs(track.nearestBorder(point,1).distance-60)<1);
  assert.ok(new RaceTrack(390,600).roadHalfWidth*2>=44);
});

function wideRoad(RaceTrack) {
  const track=straightRoad(RaceTrack);track.roadHalfWidth=60;
  const edge=track.borders[1][0];edge.a.y=edge.b.y=120;
  return track;
}

test('obstacle près d’un bord : contournement vers l’espace libre, côté conservé', () => {
  const {RaceCar,RaceTrack,RoadObstacle}=environment(),track=wideRoad(RaceTrack);
  const car=new RaceCar(100,28),obstacle=new RoadObstacle(180,28,11);car.vel.set(3,0);
  car.obstacleAvoidance.force(car,[obstacle],track);
  const plan=car.obstacleAvoidance.plan;
  assert.ok(plan);assert.equal(plan.side,1);
  assert.ok(plan.entry.y>obstacle.pos.y);
  car.vel.set(2,-.2);car.obstacleAvoidance.force(car,[obstacle],track);
  assert.equal(car.obstacleAvoidance.plan,plan);
  car.pos.set(240,60);car.vel.set(3,0);car.obstacleAvoidance.force(car,[obstacle],track);
  assert.equal(car.obstacleAvoidance.plan,null);
});

test('aucun passage disponible : arrêt stable, puis reprise lorsque l’obstacle est retiré', () => {
  const {RaceCar,RaceTrack,RoadObstacle}=environment(),track=wideRoad(RaceTrack);
  const car=new RaceCar(100,60),obstacle=new RoadObstacle(180,60,45);car.vel.set(3,0);
  for(let frame=0;frame<15;frame++) {
    car.applyBehaviors([car],track,1.2,[obstacle],2);car.update();
    assert.equal(car.maxSpeed,0);
    assert.equal(car.pos.x,100);
    assert.equal(car.obstacleAvoidance.blocked,true);
  }
  car.applyBehaviors([car],track,1.2,[],2);car.update();
  assert.ok(car.maxSpeed>0);assert.ok(car.vel.mag()>0);
  car.acc.set(0,0);car.applyBehaviors([car],track,0,[obstacle],0);
  assert.equal(car.obstacleAvoidance.blocked,false);
  assert.ok(car.maxSpeed>0);
});

test('contournement réel d’un obstacle sur la voie, sans contact ni changement de côté', () => {
  const {RaceCar,RaceTrack,RoadObstacle}=environment(),track=wideRoad(RaceTrack);
  const car=new RaceCar(100,28),obstacle=new RoadObstacle(260,28,11);car.vel.set(3,0);
  let detected=false,side=null,passed=false,minimum=Infinity;
  for(let frame=0;frame<260;frame++) {
    car.applyBehaviors([car],track,0,[obstacle],2);car.update();
    const plan=car.obstacleAvoidance.plan;
    if(plan) {detected=true;if(side===null)side=plan.side;assert.equal(plan.side,side);}
    minimum=Math.min(minimum,Vector.dist(car.pos,obstacle.pos));
    assert.ok(car.pos.y>=14 && car.pos.y<=106);
    if(car.pos.x>obstacle.pos.x+50)passed=true;
  }
  assert.ok(detected);assert.ok(passed);assert.ok(minimum>obstacle.r+14);
});


test('une bordure recouverte par l’asphalte ne ferme pas le passage dans une épingle élargie', () => {
  const {RaceTrack,RaceCar,RoadObstacle}=environment(),track=new RaceTrack(1920,815);
  const inside=new Vector(1485.29,378.31),outside=new Vector(1460.13,310.84);
  track.project=track.sample=()=>{throw new Error('aucune lecture de ligne centrale pendant la perception');};
  assert.equal(track.contains(inside),true);assert.equal(track.contains(outside),false);
  assert.ok(track.nearestBorder(inside,null,45,12).distance>50);
  assert.ok(track.borders.flat().some(edge=>edge.hidden));
  const car=new RaceCar(1365,395);car.vel.set(2.6,-.5);car.borderSteering.index=41;
  const obstacle=new RoadObstacle(1472.714,344.579,11);
  const plan=car.obstacleAvoidance.choosePassage(car,obstacle,[obstacle],track);
  assert.ok(plan,'l’intérieur de l’épingle offre un passage');
  assert.ok(track.contains(plan.entry));assert.ok(track.contains(plan.exit));
});
