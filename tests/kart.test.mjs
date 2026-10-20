import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{load}=require('../kart/node-world.cjs');
function fixture(bots=1){const g=load(),w=new g.KartWorld({bots});w.phase='playing';w.countdown=0;w.time=10;w.arena.obstacles=[];w.arena.solids=w.arena.boundaries;w.arena.pickups=[];for(const [i,k] of w.karts.entries()){k.pos.set(400+i*150,400);k.heading=0;k.vel.set(0,0);k.protectedUntil=0;if(i)k.plan=()=>({turn:0,throttle:0,fire:false});}return {...g,w,p:w.player,b:w.karts[1]};}
test('all physical types inherit supplied Vehicle; each moving kart integrates once and bounds its force',()=>{
 const {w,p,Vehicle,Rocket,Bullet,HomingMissile,Mine,WeaponCrate,ArenaObstacle,ArenaBoundary,ObjectiveMarker}=fixture();for(const entity of [...w.karts,...w.arena.boundaries,new Rocket(100,p,w),new Bullet(101,p,w),new HomingMissile(102,p,w),new Mine(103,p,w),new WeaponCrate('c',20,20),new ArenaObstacle('o',1,1,20,20),new ArenaBoundary('b',1,1,20,20),new ObjectiveMarker('g',1,1)])assert.ok(entity instanceof Vehicle);
 const base=Vehicle.prototype.update;let count=0;Vehicle.prototype.update=function(){if(this===p)count++;return base.call(this);};const before=p.pos.copy();p.drive(w,{turn:1,throttle:1,fire:false});assert.equal(count,1);assert.ok(p.vel.mag()<=p.maxForce+1e-8);assert.notDeepEqual(p.pos,before);Vehicle.prototype.update=base;
});
test('arcade controls brake before reverse, limit steering and restore exact boosted limits',()=>{
 const {w,p}=fixture(0);p.vel.set(4,0);const before=p.vel.copy();p.applyForce(p.actionForce({throttle:-1,turn:1}));p.update();assert.ok(p.vel.x>0&&p.vel.x<before.x);assert.ok(p.vel.mag()<=p.maxSpeed);assert.ok(Math.abs(p.heading)<.1);
 p.equip('boost');w.weapons.use(p,w);assert.equal(p.maxSpeed,7.68);assert.equal(p.maxForce,.43200000000000005);p.limits(w.time+3);assert.equal(p.maxSpeed,4.8);assert.equal(p.maxForce,.32);
});
test('countdown, fixed ticks, bounded catchup, pause and real-time expiry are consistent',()=>{
 const {KartWorld}=load(),a=new KartWorld({bots:0}),b=new KartWorld({bots:0});for(let i=0;i<240;i++)a.advance(1/60);for(let i=0;i<40;i++)b.advance(.1);assert.ok(Math.abs(a.time-b.time)<1e-8);assert.ok(Math.abs(a.remaining-179)<.02);a.setPaused(true);const time=a.time;a.advance(20);assert.equal(a.time,time);a.setPaused(false);const tick=a.tick;a.advance(200);assert.equal(a.phase,'finished');assert.equal(a.remaining,0);assert.ok(a.tick-tick<=12);
});
test('perception selects nearest valid enemy and bounded wall rays without moving entities',()=>{
 const {w,p,b,KartPerception:K}=fixture(2);const c=w.karts[2];c.pos.set(420,400);b.pos.set(500,400);assert.equal(K.nearest(p,w.karts,k=>k.alive),c);c.alive=false;assert.equal(K.scan(p,w).enemy,b);const pos=p.pos.copy();const rays=K.rays(p,w,7,200);assert.equal(rays.length,7);assert.ok(rays.every(r=>r.distance>=0&&r.distance<=200));assert.deepEqual(pos,p.pos);
});
test('navigation routes around solid cover and every waypoint segment avoids inflated walls',()=>{
 const {KartArena,Vector}=load(),arena=new KartArena(),start=new Vector(100,340),goal=new Vector(700,340);assert.equal(arena.clear(start,goal,20),false);const route=arena.route(start,goal);assert.ok(route.length>1);let previous=start;for(const point of route){assert.ok(arena.clear(previous,point,19));previous=point;}
});
test('AABB contacts remove penetration separately from steering; kart contacts separate coincident centers',()=>{
 const {p,b,KartCollision:C,ArenaObstacle}=fixture();const obstacle=new ArenaObstacle('o',400,400,100,80);p.pos.set(400,400);assert.equal(C.wall(p,obstacle),true);assert.ok(Math.abs(p.pos.x-400)>=69||Math.abs(p.pos.y-400)>=59);p.pos.set(500,500);b.pos.set(500,500);assert.equal(C.pair(p,b),true);assert.ok(Math.hypot(p.pos.x-b.pos.x,p.pos.y-b.pos.y)>=p.r+b.r);
});
test('swept projectiles stop at thin walls before targets and expire without damage',()=>{
 const {w,p,b,KartCollision:C,ArenaObstacle,Rocket}=fixture();assert.ok(C.segment({x:0,y:0},{x:100,y:0},{x:45,y:-2,w:1,h:4})!==null);b.pos.set(520,400);const wall=new ArenaObstacle('thin',470,400,2,100);w.arena.solids=[wall];let r=new Rocket(100,p,w);r.old.set(430,400);r.pos.set(550,400);w.projectiles=[r];w.weapons.resolve(w);assert.equal(b.health,100);assert.equal(w.projectiles.length,0);
 w.arena.solids=[];r=new Rocket(101,p,w);r.old.set(430,400);r.pos.set(550,400);r.expires=w.time;w.projectiles=[r];w.weapons.resolve(w);assert.equal(b.health,100);assert.equal(w.projectiles.length,0);
});
test('elimination credit is awarded once, dead karts cannot fire, shield and spawn protection reject damage',()=>{
 const {w,p,b}=fixture();b.shieldUntil=w.time+1;assert.equal(w.weapons.damage(b,100,p.id,w),false);b.shieldUntil=0;b.protectedUntil=w.time+1;assert.equal(w.weapons.damage(b,100,p.id,w),false);b.protectedUntil=0;w.weapons.damage(b,100,p.id,w);w.weapons.damage(b,100,p.id,w);assert.equal(p.kills,1);assert.equal(b.deaths,1);assert.equal(p.damageDealt,100);b.equip('rapid');assert.equal(w.weapons.use(b,w),false);
});
test('six item rules: finite ammo, rapid interval, mine arm/expiry, shield duration and homing turn bound',()=>{
 const {w,p,b,Mine,HomingMissile}=fixture();p.equip('rapid');assert.equal(w.weapons.use(p,w),true);assert.equal(p.ammo,9);assert.equal(w.weapons.use(p,w),false);w.time+=.12;assert.equal(w.weapons.use(p,w),true);assert.equal(p.ammo,8);w.projectiles=[];
 const mine=new Mine(120,p,w);b.pos.set(mine.pos);w.mines=[mine];w.weapons.resolve(w);assert.equal(b.health,100);w.time=mine.armedAt;w.weapons.resolve(w);assert.equal(b.health,30);assert.equal(w.mines.length,0);
 w.time+=1;p.fireAt=0;p.equip('shield');w.weapons.use(p,w);assert.equal(p.shieldUntil,w.time+6);assert.equal(p.item,null);const missile=new HomingMissile(150,p,w);const before=missile.pos.copy();assert.ok(missile.steer(w).mag()<=missile.maxForce+1e-8);assert.deepEqual(missile.pos,before);b.alive=false;assert.equal(missile.steer(w).mag(),0);
});
test('respawn chooses distant safe spawn, clears combat state and supplies protection',()=>{
 const {w,p,b}=fixture();p.health=1;w.weapons.damage(p,100,b.id,w);const deaths=p.deaths;w.time=p.respawnAt;p.respawn(w);assert.equal(p.health,100);assert.equal(p.deaths,deaths);assert.ok(p.protectedUntil>w.time);assert.ok(w.arena.free(p.pos));assert.ok(Math.hypot(p.pos.x-b.pos.x,p.pos.y-b.pos.y)>500);assert.equal(p.item,null);
});
test('tie-breaking is stable and a new match carries no previous entities or scores',()=>{
 const {w,p,b,KartWorld}=fixture();p.kills=b.kills=2;p.deaths=2;b.deaths=1;assert.equal(w.standings()[0],b);p.deaths=1;p.damageDealt=300;assert.equal(w.standings()[0],p);p.equip('rocket');w.weapons.use(p,w);const next=new KartWorld({bots:1});assert.equal(next.projectiles.length,0);assert.equal(next.player.kills,0);assert.equal(next.events.length,0);
});
test('bots use real collection, pursuit, obstacle avoidance and urgent threat decisions',()=>{
 const {KartWorld,WeaponCrate,Rocket}=load(),w=new KartWorld({bots:1}),bot=w.karts[1];w.phase='playing';w.time=10;bot.pos.set(700,800);bot.heading=0;bot.protectedUntil=0;w.player.pos.set(1100,800);w.arena.pickups=[new WeaponCrate('test',850,800)];bot.plan(w);assert.ok(bot.behaviors.entries.has('seek'));assert.ok(bot.behaviors.entries.has('obstacle-avoidance'));bot.equip('rocket');bot.plan(w);assert.ok(bot.behaviors.entries.has('pursue'));
 const rocket=new Rocket(100,w.player,w);rocket.pos.set(780,800);rocket.vel.set(-10,0);w.projectiles=[rocket];w.tick=bot.id;bot.plan(w);assert.ok(bot.behaviors.entries.has('evade'));for(const b of bot.behaviors.last.components)assert.ok(Number.isFinite(b.force.x));
 w.projectiles=[];bot.health=20;w.player.pos.set(800,800);bot.plan(w);assert.ok(bot.behaviors.entries.has('flee'));
});
test('seeded complete match remains finite, ends and scripted bots achieve combat results',()=>{
 const {KartWorld}=load(),w=new KartWorld({bots:7,seed:2026});for(let i=0;i<11000&&w.phase!=='finished';i++)w.step();assert.equal(w.phase,'finished');assert.ok(w.karts.some(k=>k.kills>0));for(const k of w.karts)assert.ok([k.pos.x,k.pos.y,k.vel.x,k.vel.y].every(Number.isFinite));assert.ok(w.projectiles.length<=128);assert.ok(w.mines.length<=32);
});
test('all seven challenges are playable states with explicit finish, failure, restart and observable composition',()=>{
 const {KartWorld,KC}=load();for(const kind of Object.keys(KC.challenges)){const w=new KartWorld({challenge:kind});w.phase='playing';w.time=10;assert.equal(w.challenge.kind,kind);assert.ok(w.challenge.description());if(kind==='escape'){w.remaining=0;w.challenge.tick(w);assert.equal(w.challenge.result.won,true);}else if(kind==='intercept'){w.challenge.hits=3;w.challenge.tick(w);assert.equal(w.challenge.result.won,true);}else{for(const m of w.challenge.markers){w.player.pos.set(m.pos);w.player.vel.set(0,0);if(kind==='patrol')w.karts[1].pos.set(m.pos);if(['convoy','snake'].includes(kind))w.karts.forEach(k=>k.pos.set(m.pos));for(let i=0;i<40&&!w.challenge.result;i++)w.challenge.tick(w);}assert.equal(w.challenge.result?.won,true,kind);}const fresh=new KartWorld({challenge:kind});assert.equal(fresh.challenge.result,null);}
 const convoy=new KartWorld({challenge:'convoy'});convoy.phase='playing';convoy.time=10;convoy.karts[1].plan(convoy);for(const b of ['leader-following','alignment','cohesion','separation'])assert.ok(convoy.karts[1].behaviors.entries.has(b));const snake=new KartWorld({challenge:'snake'});snake.phase='playing';snake.time=10;snake.karts[2].plan(snake);assert.ok(snake.karts[2].behaviors.entries.has('chained-arrive'));
 const parking=new KartWorld({challenge:'parking'});parking.phase='playing';parking.time=10;parking.karts[1].pos.set(600,240);parking.karts[1].plan(parking);assert.ok(parking.karts[1].behaviors.entries.has('arrive'));
});
test('versioned combat schema validates configurable topologies, bounded actions and serialization without old F1 reuse',()=>{
 const {CombatBrain:B,w,p}=fixture();for(const c of [{sensors:5,range:100,hidden:[4],activation:'relu'},{sensors:17,range:400,hidden:[16,12,8],activation:'tanh'}]){const m=B.random(c,1,'fixture'),brain=new B(JSON.parse(JSON.stringify(m))),input=B.observe(p,w,c),output=brain.predict(input);assert.equal(input.length,c.sensors+21);assert.ok(input.every(v=>v>=-1&&v<=1));assert.equal(output.length,4);assert.ok(output.every(v=>v>=-1&&v<=1));assert.equal(brain.activations.length,c.hidden.length+2);assert.ok(Number.isFinite(brain.action(p,w).turn));}
 for(const c of [{hidden:[]},{hidden:[100]},{sensors:4},{range:99},{activation:'sigmoid'}])assert.throws(()=>B.config(c));assert.throws(()=>new B({schema:'apex-driver-v1'}));const m=B.random();m.layers[0].w[0]=NaN;assert.throws(()=>new B(m));
});
test('new main entry loads only combat UI and preserves the historical F1 entry',()=>{
 const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(page,/Kart Clash/);assert.doesNotMatch(page,/gp\/app.js|gp\/config.js|gp\/models|teamRadio|race3d/);assert.match(page,/vehicle.js/);assert.match(readFileSync(new URL('../apex-lab.html',import.meta.url),'utf8'),/gp\/app.js/);
});
test('preferences and named brains survive round trips while corrupt/quota-limited storage is handled honestly',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},g=load({storage}),S=g.KartStorage;
 S.write('preferences',{bots:9,color:g.KC.colors[2],volume:.6,quality:'low'});assert.equal(S.preferences().bots,9);assert.equal(S.preferences().quality,'low');S.saveBrain(g.CombatBrain.random({},5,'fixture'));assert.equal(S.brains()[0].name,'fixture');const brain=S.brains()[0];brain.layers[0].w[0]=99;assert.notEqual(S.brains()[0].layers[0].w[0],99);
 values.set('kart-clash-preferences','"broken object"');assert.equal(S.preferences().bots,7);values.set('kart-clash-challenges','[]');assert.equal(Object.keys(S.object('challenges')).length,0);values.set('kart-clash-brains','[{"schema":"apex-driver-v1"}]');assert.equal(S.brains().length,0);
 storage.setItem=()=>{throw Error('quota');};assert.throws(()=>S.saveBrain(g.CombatBrain.random({},5,'fixture')),/Stockage/);
});
