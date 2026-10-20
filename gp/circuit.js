// Circuit coordinates and scenery, not a moving world entity.
class GrandPrixCircuit extends Path {
  constructor(layout='coast'){
    super();this.radius=80;this.width=GP.WORLD_W;this.height=GP.WORLD_H;
    this.name=layout==='technical'?'ATLAS INTERNATIONAL':'CASABLANCA COAST';
    let anchors=[[.15,.86],[.84,.86],[.91,.74],[.87,.59],[.71,.52],[.86,.36],[.87,.17],[.66,.12],[.58,.29],[.41,.28],[.34,.12],[.16,.14],[.10,.31],[.25,.43],[.41,.52],[.28,.64],[.12,.66],[.09,.77]];
    if(layout==='technical'){anchors[4]=[.64,.51];anchors[8]=[.61,.36];anchors[14]=[.45,.53];}
    const real=typeof F1_CIRCUITS!=='undefined'?F1_CIRCUITS.find(c=>c.id===layout):null;
    this.geographic=!!real;this.meters=real?.meters||0;this.location=real?.location||'';
    let points=anchors.map(([x,y])=>createVector(x*this.width,y*this.height));
    if(real){
      this.name=real.name.toUpperCase();
      const coords=real.coordinates,lat=coords.reduce((n,c)=>n+c[1],0)/coords.length;
      const xy=coords.map(c=>[c[0]*Math.cos(lat*Math.PI/180),-c[1]]),xs=xy.map(c=>c[0]),ys=xy.map(c=>c[1]);
      const minX=Math.min(...xs),minY=Math.min(...ys),spanX=Math.max(...xs)-minX,spanY=Math.max(...ys)-minY;
      const scale=Math.min(2050/spanX,1120/spanY);
      points=xy.map(c=>createVector(120+(2050-spanX*scale)/2+(c[0]-minX)*scale,130+(1120-spanY*scale)/2+(c[1]-minY)*scale));
      points=points.filter((p,i)=>!i||p5.Vector.dist(p,points[i-1])>.05);
      if(p5.Vector.dist(points[0],points.at(-1))<1)points.pop();
      for(const p of points)p.mult(3);this.width=GP.WORLD_W*3;this.height=GP.WORLD_H*3;this.radius=80;
    }
    for(let pass=0;pass<(real?0:3);pass++){
      const next=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];next.push(a.copy().mult(.75).add(b.copy().mult(.25)),a.copy().mult(.25).add(b.copy().mult(.75)));}points=next;
    }
    let origin=0,best=Infinity;
    points.forEach((p,i)=>{const d=Math.hypot(p.x-1200,p.y-this.height*.86);if(d<best){best=d;origin=i;}});
    if(real)origin=0;
    this.points=points.slice(origin).concat(points.slice(0,origin));
    this.lengths=this.points.map((a,i)=>p5.Vector.dist(a,this.points[(i+1)%this.points.length]));
    this.cumulative=[0];for(const length of this.lengths)this.cumulative.push(this.cumulative.at(-1)+length);
    this.totalLength=this.cumulative.at(-1);
    this.segments=this.points.map((a,i)=>{const b=this.points[(i+1)%this.points.length];return {a,b,dx:b.x-a.x,dy:b.y-a.y,length:this.lengths[i]};});
    this.borders=[];
    const left=this.points.map((_,i)=>this.sample(this.cumulative[i],-this.radius).point),right=this.points.map((_,i)=>this.sample(this.cumulative[i],this.radius).point);
    for(const loop of [left,right])for(let i=0;i<loop.length;i++)this.borders.push({a:loop[i],b:loop[(i+1)%loop.length]});
    this.pitEntryAlong=this.totalLength-650;this.pitSpan=1300;
    const entry=this.sample(this.pitEntryAlong).point,exit=this.sample(650).point;
    this.pitPoints=[entry,createVector(entry.x+130,entry.y-165),createVector(exit.x-130,entry.y-165),exit];
    this.pitLengths=this.pitPoints.slice(0,-1).map((p,i)=>p5.Vector.dist(p,this.pitPoints[i+1]));
    this.pitCumulative=[0];for(const l of this.pitLengths)this.pitCumulative.push(this.pitCumulative.at(-1)+l);
    this.pitLength=this.pitCumulative.at(-1);
    if(real){
      // Illustrative pit corridor follows the start/finish area on the outside of the track.
      this.pitEntryAlong=this.totalLength-200;this.pitSpan=650;
      this.pitPoints=Array.from({length:25},(_,i)=>this.sample(this.pitEntryAlong+this.pitSpan*i/24,this.radius+48*Math.sin(Math.PI*i/24)).point);
      this.pitLengths=this.pitPoints.slice(0,-1).map((p,i)=>p5.Vector.dist(p,this.pitPoints[i+1]));this.pitCumulative=[0];
      for(const l of this.pitLengths)this.pitCumulative.push(this.pitCumulative.at(-1)+l);this.pitLength=this.pitCumulative.at(-1);
    }
    this.boxes=GP.teams.map((_,i)=>real?this.pitLength*(.2+i*.055):this.pitCumulative[1]+85+i*68);
  }
  sample(distance,lane=0){
    const along=GP.mod(distance,this.totalLength);let low=0,high=this.lengths.length-1;
    while(low<high){const middle=(low+high)>>1;if(this.cumulative[middle+1]<=along)low=middle+1;else high=middle;}
    const s=this.segments[low],t=(along-this.cumulative[low])/s.length;
    const tangent=createVector(s.dx/s.length,s.dy/s.length),normal=createVector(-tangent.y,tangent.x);
    return {point:createVector(s.a.x+s.dx*t+normal.x*lane,s.a.y+s.dy*t+normal.y*lane),tangent,normal,index:low,along};
  }
  project(position,preferred=null){
    let best=null;
    const indices=preferred===null?this.segments.map((_,i)=>i):Array.from({length:17},(_,k)=>GP.mod(preferred+k-8,this.segments.length));
    for(const i of indices){const s=this.segments[i],t=GP.clamp(((position.x-s.a.x)*s.dx+(position.y-s.a.y)*s.dy)/(s.length*s.length),0,1),x=s.a.x+s.dx*t,y=s.a.y+s.dy*t,d=Math.hypot(position.x-x,position.y-y);if(!best||d<best.distance)best={point:createVector(x,y),index:i,distance:d,along:this.cumulative[i]+s.length*t,lateral:((position.y-y)*s.dx-(position.x-x)*s.dy)/s.length};}
    if(preferred!==null&&best.distance>this.radius*3)return this.project(position);
    return best;
  }
  curvature(along,ahead=75){const a=this.sample(along).tangent,b=this.sample(along+ahead).tangent;return Math.acos(GP.clamp(a.dot(b),-1,1))/ahead;}
  pitSample(distance){
    const along=GP.clamp(distance,0,this.pitLength);let i=0;while(i<this.pitLengths.length-1&&along>this.pitCumulative[i+1])i++;
    const tangent=p5.Vector.sub(this.pitPoints[i+1],this.pitPoints[i]).normalize();
    return {point:tangent.copy().mult(along-this.pitCumulative[i]).add(this.pitPoints[i]),tangent};
  }
  pitProject(pos){let best=null;for(let i=0;i<this.pitLengths.length;i++){const a=this.pitPoints[i],b=this.pitPoints[i+1],v=p5.Vector.sub(b,a),t=GP.clamp(p5.Vector.sub(pos,a).dot(v)/(this.pitLengths[i]**2),0,1),p=v.mult(t).add(a),d=p5.Vector.dist(pos,p);if(!best||d<best.distance)best={distance:d,along:this.pitCumulative[i]+t*this.pitLengths[i]};}return best;}
  paint(g){
    g.background(this.geographic&&['Monaco','Baku','Singapore','Las Vegas'].includes(this.location)?'#303c40':'#233e35');if(!this.geographic){g.stroke('#29483c');g.strokeWeight(42);for(let x=-1500;x<2400;x+=110)g.line(x,0,x+1500,1500);}
    const loop=(color,width,dash=[])=>{g.drawingContext.setLineDash(dash);g.stroke(color);g.strokeWeight(width);g.noFill();g.beginShape();for(const p of this.points)g.vertex(p.x,p.y);g.endShape(CLOSE);g.drawingContext.setLineDash([]);};
    g.strokeJoin(ROUND);if(this.geographic){loop('#172d26',this.radius*2+45);loop('#d7d5c7',this.radius*2+12);loop('#d94c4c',this.radius*2+12,[12,12]);loop('#424b4d',this.radius*2);loop('#3c4547',this.radius*2-10);}else{loop('#172d26',230);loop('#938e74',211);loop('#26352f',186);loop('#e4ded0',174);loop('#cc4e48',174,[16,16]);loop('#3a4346',160);loop('#41494b',150);loop('#3c4547',112);}
    g.stroke('#333f40');g.strokeWeight(48);g.noFill();g.beginShape();for(const p of this.pitPoints)g.vertex(p.x,p.y);g.endShape();
    g.stroke('#ccd0ba');g.strokeWeight(2);g.beginShape();for(const p of this.pitPoints)g.vertex(p.x,p.y-26);g.endShape();
    g.rectMode(CENTER);g.noStroke();this.boxes.forEach((d,i)=>{const p=this.pitSample(d).point;g.fill('#b0bdb5');g.rect(p.x,p.y-62,62,48,3);g.fill(GP.teams[i][2]);g.rect(p.x,p.y-38,62,5);g.fill('#e5e9dc');g.rect(p.x,p.y,36,3);});
    const finish=this.sample(0);g.push();g.translate(finish.point.x,finish.point.y);g.rotate(finish.tangent.heading());g.noStroke();for(let i=0;i<20;i++)for(let j=0;j<3;j++){g.fill((i+j)%2?'#15201f':'#e5e7d8');g.rect(j*8,i*8-76,8,8);}g.pop();
    for(let i=0;i<22;i++){const p=this.sample(-35-Math.floor(i/2)*48,i%2?26:-26);g.push();g.translate(p.point.x,p.point.y);g.rotate(p.tangent.heading());g.noFill();g.stroke('#cbd0bc55');g.strokeWeight(2);g.rect(0,0,38,26);g.pop();}
    g.noStroke();g.textAlign(CENTER,CENTER);g.fill('#d7e1d5');g.textSize(47);g.textStyle(BOLD);g.text(this.geographic?'':'C A S A B L A N C A',1250,730);g.textStyle(NORMAL);g.fill('#82a594');g.textSize(19);g.text(this.geographic?'':'C O A S T A L   G R A N D   P R I X',1250,777);
    g.textSize(16);g.fill('#d3dac6');g.text('PIT LANE  /  80',this.pitPoints[1].x+100,this.pitPoints[1].y-105);
    for(let sector=1;sector<=2;sector++){const p=this.sample(this.totalLength*sector/3);g.push();g.translate(p.point.x,p.point.y);g.rotate(p.tangent.heading());g.stroke('#9ebabe66');g.strokeWeight(2);g.line(0,-80,0,80);g.noStroke();g.fill('#bacdc3');g.textSize(18);g.text(`S${sector+1}`,0,-105);g.pop();}
    if(!this.geographic){g.fill('#182f28');g.rect(1250,1430,780,44);for(let i=0;i<100;i++){g.fill(i%4?'#95aaa0':'#56867a');g.rect(865+i*7.7,1427,5,18);}}else{for(const f of [.15,.4,.7]){const stand=this.sample(this.totalLength*f,this.radius+110);g.push();g.translate(stand.point.x,stand.point.y);g.rotate(stand.tangent.heading());g.fill('#182f28');g.rect(0,0,240,60);for(let i=0;i<38;i++){g.fill(i%3?'#95aaa0':'#56867a');g.rect(-114+i*6,0,4,44);}g.pop();}}
  }
}
