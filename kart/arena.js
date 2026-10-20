class KartArena{

 constructor(layout=0){this.width=KC.W;this.height=KC.H;const specs=[[430,340,260,100,70],[1280,330,180,220,85],[850,650,280,140,65],[350,950,160,230,75],[1280,1030,300,100,70],[850,1130,90,160,45]];this.obstacles=specs.map((s,i)=>new ArenaObstacle('cover'+i,...s));if(layout%2)this.obstacles[2].pos.y+=100;

 this.boundaries=[new ArenaBoundary('north',900,-20,1840,40),new ArenaBoundary('south',900,1420,1840,40),new ArenaBoundary('west',-20,700,40,1400),new ArenaBoundary('east',1820,700,40,1400)];this.solids=[...this.obstacles,...this.boundaries];

 this.spawns=[[150,150],[900,130],[1630,150],[1650,700],[1650,1250],[950,1300],[150,1250],[130,650],[800,400],[1150,800]].map(p=>createVector(...p));this.pickups=[[280,200],[720,200],[1490,480],[1560,1150],[1050,1190],[570,1100],[160,800],[1060,480],[680,850],[1100,850]].map((p,i)=>new WeaponCrate('crate'+i,...p));this.cell=70;

 }

 clear(a,b,r=0){return !this.solids.some(o=>KartCollision.segment(a,b,KartCollision.box(o),r)!==null);}

 free(p,r=24){return p.x>=r&&p.x<=KC.W-r&&p.y>=r&&p.y<=KC.H-r&&!this.obstacles.some(o=>p.x>=o.pos.x-o.w/2-r&&p.x<=o.pos.x+o.w/2+r&&p.y>=o.pos.y-o.h/2-r&&p.y<=o.pos.y+o.h/2+r);}

 // A* selects waypoints. Vehicles still reach them using local steering and contacts.

 route(start,goal){if(this.clear(start,goal,25))return [goal.copy()];const cell=this.cell,cols=Math.ceil(KC.W/cell),rows=Math.ceil(KC.H/cell),point=i=>createVector((i%cols+.5)*cell,(Math.floor(i/cols)+.5)*cell),index=p=>KC.clamp(Math.floor(p.x/cell),0,cols-1)+KC.clamp(Math.floor(p.y/cell),0,rows-1)*cols;

 const end=index(goal),first=index(start),open=[first],cost=new Map([[first,0]]),from=new Map(),closed=new Set();let found=null;

 for(let count=0;open.length&&count<650;count++){open.sort((a,b)=>(cost.get(a)+p5.Vector.dist(point(a),goal)/cell)-(cost.get(b)+p5.Vector.dist(point(b),goal)/cell));const at=open.shift();if(closed.has(at))continue;closed.add(at);if(at===end||this.clear(point(at),goal,25)){found=at;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=at%cols+dx,y=Math.floor(at/cols)+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const n=y*cols+x,p=point(n);if(!this.free(p)||!this.clear(point(at),p,23))continue;const c=cost.get(at)+1;if(c<(cost.get(n)??Infinity)){cost.set(n,c);from.set(n,at);open.push(n);}}}

 if(found===null)return [];const path=[goal.copy()];for(let at=found;at!==first&&at!==undefined;at=from.get(at))path.unshift(point(at));return path;

 }

 spawn(world,k){const threats=world.karts.filter(o=>o!==k&&o.alive&&o.spawned);return [...this.spawns].sort((a,b)=>{const score=p=>Math.min(1000,...threats.map(o=>p5.Vector.dist(p,o.pos)))+Math.min(200,...world.projectiles.map(o=>p5.Vector.dist(p,o.pos)));return score(b)-score(a);})[0].copy();}

}

