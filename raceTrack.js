class RaceTrack extends Path {
  constructor(sceneWidth, sceneHeight) {
    super();
    this.roadHalfWidth = Math.max(22, Math.min(60, sceneWidth * 0.05, sceneHeight * 0.10));
    this.radius = Math.max(5, this.roadHalfWidth - 17);
    this.sceneWidth = sceneWidth;
    this.sceneHeight = sceneHeight;
    const margin = this.roadHalfWidth + 28;
    this.margin = margin;
    this.anchors = [[.14,.92],[.58,.92],[.84,.92],[.91,.79],[.90,.65],
      [.74,.54],[.84,.40],[.90,.29],[.85,.09],[.67,.08],[.61,.23],
      [.49,.24],[.44,.08],[.25,.07],[.12,.13],[.08,.30],[.18,.40],
      [.34,.40],[.41,.53],[.34,.65],[.18,.66],[.09,.78]];
    const count = this.anchors.length;
    // Interpolation fermée : chicanes, épingle, esses et ligne droite des stands.
    for (let i = 0; i < count; i++) {
      for (let step = 0; step < 8; step++) {
        const t = step / 8;
        const p = [-1,0,1,2].map(offset => this.anchors[(i + offset + count) % count]);
        const coordinates = [0,1].map(axis => {
          const [a,b,c,d] = p.map(point => point[axis]);
          return .5 * (2*b + (-a+c)*t + (2*a-5*b+4*c-d)*t*t + (-a+3*b-3*c+d)*t*t*t);
        });
        this.addPoint(margin + coordinates[0] * (sceneWidth - 2*margin),
          margin + coordinates[1] * (sceneHeight - 2*margin));
      }
    }
    this.lengths = this.points.map((point, i) => p5.Vector.dist(point, this.points[(i+1)%this.points.length]));
    this.cumulative = [0];
    for (const length of this.lengths) this.cumulative.push(this.cumulative[this.cumulative.length-1] + length);
    this.totalLength = this.cumulative[this.cumulative.length-1];
    this.buildBorders();
  }

  buildBorders() {
    // Limites physiques de l'asphalte, orientées dans le sens de la course.
    this.borders = [-1, 1].map(side => {
      const points = this.points.map((point, i) => {
        const incoming = p5.Vector.sub(point,this.points[(i-1+this.points.length)%this.points.length]).normalize();
        const outgoing = p5.Vector.sub(this.points[(i+1)%this.points.length],point).normalize();
        const normal = createVector(-incoming.y-outgoing.y,incoming.x+outgoing.x).normalize();
        const scale = this.roadHalfWidth / Math.max(.5,normal.dot(createVector(-outgoing.y,outgoing.x)));
        return normal.mult(side*scale).add(point);
      });
      return points.map((a,index) => {
        const b = points[(index+1)%points.length], tangent = p5.Vector.sub(b,a).normalize();
        const course = p5.Vector.sub(this.points[(index+1)%this.points.length],this.points[index]).normalize();
        return new TrackBorder(a,b,side,index,course);
      });
    });
    // À l'intérieur d'une épingle, des contours décalés peuvent traverser
    // l'asphalte d'un segment voisin. Ces morceaux ne sont pas des murs.
    for (const border of this.borders) for (const edge of border) {
      edge.visibleRanges=[];
      for (let part=0;part<8;part++) {
        const at=(part+.5)/8, x=edge.a.x+(edge.b.x-edge.a.x)*at, y=edge.a.y+(edge.b.y-edge.a.y)*at;
        const buried=this.points.some((a,i)=>{
          const b=this.points[(i+1)%this.points.length],dx=b.x-a.x,dy=b.y-a.y;
          const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
          return Math.hypot(x-a.x-dx*t,y-a.y-dy*t)<this.roadHalfWidth-.75;
        });
        if (!buried) {
          const previous=edge.visibleRanges[edge.visibleRanges.length-1];
          if (previous && previous[1]===part/8) previous[1]=(part+1)/8;
          else edge.visibleRanges.push([part/8,(part+1)/8]);
        }
      }
      edge.hidden=edge.visibleRanges.length===0;
    }
  }

  nearestBorder(position, side = null, preferred = null, span = 4) {
    let nearest = null;
    for (const border of this.borders) for (const edge of border) {
      if (side !== null && edge.side !== side) continue;
      if (edge.folded) continue;
      if (edge.hidden) continue;
      const delta = preferred === null ? 0 : Math.abs(edge.index-preferred);
      if (preferred !== null && Math.min(delta,border.length-delta)>span) continue;
      const projection=p5.Vector.sub(position,edge.a).dot(edge.tangent);
      for (const [from,to] of edge.visibleRanges || [[0,1]]) {
        const t=Math.max(from*edge.length,Math.min(to*edge.length,projection));
        const point = edge.tangent.copy().mult(t).add(edge.a);
        const offset = p5.Vector.sub(position,point), distance = offset.mag();
        if (!nearest || distance<nearest.distance) nearest = { ...edge,point,distance,offset:t,clearance:offset.dot(edge.inward) };
      }
    }
    if (preferred !== null && (!nearest || nearest.distance>this.roadHalfWidth*2.5)) return this.nearestBorder(position,side);
    return nearest;
  }

  contains(position) {
    // Appartenance au ruban par les deux contours, sans ligne centrale.
    // Le nombre d'enroulement reste valable dans les raccords concaves.
    let winding=0;
    for (const border of this.borders) for (const edge of border) {
      const cross=(edge.b.x-edge.a.x)*(position.y-edge.a.y)-(position.x-edge.a.x)*(edge.b.y-edge.a.y);
      const weight=edge.side===-1 ? 1 : -1;
      if (edge.a.y<=position.y && edge.b.y>position.y && cross>0) winding+=weight;
      if (edge.a.y>position.y && edge.b.y<=position.y && cross<0) winding-=weight;
    }
    return winding!==0;
  }

  advanceBorder(edge, distance) {
    const border = this.borders[edge.side === -1 ? 0 : 1];
    let index = edge.index, offset = edge.offset+distance;
    while (offset>border[index].length) {
      offset -= border[index].length;
      index = (index+1)%border.length;
    }
    const next = border[index];
    return { ...next,point:next.tangent.copy().mult(offset).add(next.a),offset };
  }

  senseBorder(origin, direction, range) {
    const ray = direction.copy().normalize(), cross = (a,b) => a.x*b.y-a.y*b.x;
    let hit = null;
    for (const border of this.borders) for (const edge of border) {
      if (edge.folded || edge.hidden) continue;
      const segment = p5.Vector.sub(edge.b,edge.a), denominator = cross(ray,segment);
      if (Math.abs(denominator)<1e-8) continue;
      const delta = p5.Vector.sub(edge.a,origin);
      const distance = cross(delta,segment)/denominator, fraction = cross(delta,ray)/denominator;
      const visible=(edge.visibleRanges || [[0,1]]).some(([a,b])=>fraction>=a && fraction<=b);
      if (distance>=0 && distance<=range && visible && (!hit || distance<hit.distance)) {
        hit = { ...edge,distance,point:ray.copy().mult(distance).add(origin) };
      }
    }
    return hit;
  }

  project(position, preferred = null) {
    const evaluate = indices => {
      let best = null;
      for (const index of indices) {
        const a = this.points[index], b = this.points[(index+1)%this.points.length];
        const segment = p5.Vector.sub(b, a);
        const t = Math.max(0, Math.min(1, p5.Vector.sub(position,a).dot(segment) / (this.lengths[index] ** 2)));
        const point = segment.mult(t).add(a);
        const distance = p5.Vector.dist(position, point);
        if (!best || distance < best.distance) best = { point, index, distance, along: this.cumulative[index]+t*this.lengths[index] };
      }
      return best;
    };
    if (preferred !== null) {
      const local = evaluate(Array.from({length: 17}, (_, k) => (preferred+k-8+this.points.length)%this.points.length));
      if (local.distance <= this.roadHalfWidth * 2) return local;
    }
    return evaluate(this.points.map((_, index) => index));
  }

  sample(distance) {
    const along = ((distance % this.totalLength) + this.totalLength) % this.totalLength;
    let index = 0;
    while (index < this.lengths.length-1 && this.cumulative[index+1] <= along) index++;
    const tangent = p5.Vector.sub(this.points[(index+1)%this.points.length], this.points[index]).normalize();
    return { point: tangent.copy().mult(along-this.cumulative[index]).add(this.points[index]), tangent, index, along };
  }

  drawLoop(colorValue, thickness, dash = []) {
    drawingContext.setLineDash(dash); stroke(colorValue); strokeWeight(thickness); noFill();
    // Des caps plats empêchent les tirets épais de recouvrir les parties blanches.
    drawingContext.lineCap = dash.length ? "butt" : "round";
    beginShape();
    for (const point of this.points) vertex(point.x, point.y);
    endShape(CLOSE); drawingContext.setLineDash([]); drawingContext.lineCap = "round";
  }

  display() {
    background("#365346"); push();
    stroke("#3b5b4a"); strokeWeight(26);
    for (let x = -this.sceneHeight; x < this.sceneWidth; x += 65) line(x, 0, x + this.sceneHeight, this.sceneHeight);
    strokeJoin(ROUND); strokeCap(ROUND);
    const road = this.roadHalfWidth * 2;
    this.drawLoop("#20332a", road + 55);
    this.drawLoop("#afa78c", road + 43);
    this.drawLoop("#aab6ac", road + 25);
    this.drawLoop("#26372e", road + 21);
    this.drawLoop("#ece6dc", road + 12);
    this.drawLoop("#df4b49", road + 12, [13, 13]);
    this.drawLoop("#79838a", road + 2);
    this.drawLoop("#4a5052", road);
    this.drawLoop("#454b4d", road - 5);
    this.drawFacilities();
    this.drawFinishLine();
    noStroke(); fill("#0d2b24aa"); rectMode(CENTER);
    const labelX = this.sceneWidth * .60, labelY = this.sceneHeight * .51;
    rect(labelX, labelY, Math.min(228, this.sceneWidth * 0.4), 78, 8);
    textAlign(CENTER, CENTER); textStyle(BOLD); textSize(this.sceneWidth < 600 ? 16 : 25); fill("#d9e6df");
    text("CASABLANCA", labelX, labelY - 12);
    textStyle(NORMAL); textSize(this.sceneWidth < 600 ? 8 : 10); fill("#7fae98");
    text(this.sceneWidth < 600 ? "GRAND PRIX / STEERING LAB" : "G R A N D   P R I X   /   S T E E R I N G   L A B", labelX, labelY + 12);
    if (debug) {
      stroke("#74e8cf"); strokeWeight(1);
      for (const border of this.borders) for (const edge of border) edge.render();
    }
    pop();
  }

  drawFacilities() {
    if (this.sceneWidth < 650) return;
    const x1 = this.points[0].x, x2 = this.points[8].x;
    const straightY = this.points[0].y-(this.roadHalfWidth-40);
    push();
    // Voie des stands parallèle à la ligne droite, séparée de la piste.
    stroke("#68716e"); strokeWeight(23); line(x1, straightY-66, x2, straightY-66);
    stroke("#ecebdc"); strokeWeight(1); line(x1, straightY-79, x2, straightY-79);
    rectMode(CORNER); noStroke();
    const bayWidth = (x2-x1)/10;
    for (let i=0;i<10;i++) {
      fill(i%2 ? "#c8ceca" : "#b6c2bf"); rect(x1+i*bayWidth, straightY-127, bayWidth-3, 36);
      fill(["#b53a46","#298c84","#b58f3d","#3f6089"][i%4]); rect(x1+i*bayWidth,straightY-94,bayWidth-3,5);
      stroke("#e9e6cf"); strokeWeight(1); line(x1+i*bayWidth,straightY-73,x1+i*bayWidth,straightY-59); noStroke();
    }
    // Tribunes et clôtures hors de la piste.
    const standWidth = Math.min(420, this.sceneWidth*.35);
    const standX = this.sceneWidth*.48-standWidth/2, standY = this.sceneHeight-29;
    fill("#293a37"); rect(standX-5,standY-3,standWidth+10,25,2);
    for (let row=0;row<3;row++) for (let seat=0;seat<Math.floor(standWidth/7);seat++) {
      fill((seat+row)%3 ? "#9caeb0" : "#5c8290"); rect(standX+seat*7,standY+row*6,5,4);
    }
    textAlign(LEFT,CENTER); textSize(9); fill("#e1e4d3");
    text("PIT LANE  /  80",x1,straightY-145);
    // Numéros des principaux virages : annotations de décor.
    for (const anchor of [3,5,8,10,12,15,18,21]) {
      const p=this.points[anchor*8];
      fill("#182d25dd"); rect(p.x-11,p.y-this.roadHalfWidth-28,28,16,3);
      fill("#e3e6d3"); text(`T${String(anchor).padStart(2,"0")}`,p.x-7,p.y-this.roadHalfWidth-20);
    }
    pop();
  }

  drawFinishLine() {
    const start = this.points[0];
    const direction = p5.Vector.sub(this.points[1], start);
    push(); translate(start.x, start.y); rotate(direction.heading()); noStroke(); rectMode(CORNER);
    const tile = 6;
    const rows = Math.floor(this.roadHalfWidth * 2 / tile);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < 3; col++) {
        fill((row + col) % 2 === 0 ? "#f1f4ec" : "#141e24");
        rect(col * tile - 9, row * tile - rows * tile / 2, tile, tile);
      }
    }
    pop();
  }
}
