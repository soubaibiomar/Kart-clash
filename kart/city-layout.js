/** Deterministic roadside parcels shared by physics, game and editor. No world RNG. */
class CityLayout {
 static distance(track,p){let best=Infinity;for(let i=0;i<track.points.length-(track.closed?0:1);i++)best=Math.min(best,KartTrack.distance(p,track.points[i],track.points[(i+1)%track.points.length]));return best;}
 static clear(track,p,r,margin=28){return this.distance(track,p)>track.width/2+r+margin;}
 static plan(track){const buildings=[],fixtures=[];if(track.points.length<2)return {buildings,fixtures};
  const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
  const overlaps=(a,b,gap=12)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.y-b.y)<(a.d+b.d)/2+gap;
  const add=spec=>{if(buildings.length>=240||!this.clear(track,spec,Math.hypot(spec.w,spec.d)/2,36)||buildings.some(b=>overlaps(spec,b)))return false;buildings.push(spec);return true;};
  // Frontages follow distance along the player's road, on both sides. Splitting a
  // straight into extra editor points must not create piles of buildings at joints.
  const count=track.points.length-(track.closed?0:1),segments=[];let total=0;
  for(let i=0;i<count;i++){const a=track.points[i],b=track.points[(i+1)%track.points.length],length=Math.hypot(b.x-a.x,b.y-a.y);if(length>1e-6){segments.push({a,b,length,start:total,index:i});total+=length;}}
  const spacing=Math.max(124,total/180);let index=0;
  for(let at=62,sample=0;at<total;at+=spacing,sample++){
   while(index<segments.length-1&&at>=segments[index].start+segments[index].length)index++;
   const s=segments[index],t=(at-s.start)/s.length,dx=(s.b.x-s.a.x)/s.length,dy=(s.b.y-s.a.y)/s.length,road={x:s.a.x+dx*s.length*t,y:s.a.y+dy*s.length*t};
   for(const side of [-1,1]){
    const seed=hash(Math.round(road.x)+side,Math.round(road.y)),w=76+Math.floor(seed*35),d=72+Math.floor(hash(road.y+side,road.x+7)*38),r=Math.hypot(w,d)/2;
    // Reserve the entire projected route at every height, including tunnel mouths
    // and bridge supports. Try small setbacks at corners; never move the road.
    for(const setback of [38,58,82]){const offset=track.width/2+r+setback,x=road.x-dy*offset*side,y=road.y+dx*offset*side;
     if(add({id:'city-front-'+sample+'-'+side,x,y,w,d,height:85+Math.floor(hash(road.x+2,road.y+6)*150),style:Math.floor(seed*4),seed,frontage:{x:road.x,y:road.y,side,segment:s.index}}))break;
    }
   }
  }
  // Fill the rest of each block only after its street-facing row has been placed.
  for(let row=0;row<11;row++)for(let col=0;col<14;col++){
   const seed=hash(col+1,row+1),x=-180+col*165+(seed-.5)*24,y=-160+row*165+(hash(row+4,col+3)-.5)*24,w=74+Math.floor(seed*42),d=70+Math.floor(hash(col+7,row+9)*44);
   add({id:'city-building-'+row+'-'+col,x,y,w,d,height:65+Math.floor(hash(col+2,row+6)*190),style:(row+col)%4,seed});
  }
  for(let i=0;i<count;i++){
   const a=track.points[i],b=track.points[(i+1)%track.points.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<100||a.kind==='tunnel'||(a.elevation||0)>1||(b.elevation||0)>1)continue;
   for(let d=75;d<length;d+=220)for(const side of [-1,1]){const offset=track.width/2+25,x=a.x+dx*d/length-dy/length*offset*side,y=a.y+dy*d/length+dx/length*offset*side;
    if(!this.clear(track,{x,y},5,12)||fixtures.some(f=>Math.hypot(f.x-x,f.y-y)<85)||buildings.some(o=>Math.hypot(o.x-x,o.y-y)<Math.hypot(o.w,o.d)/2+14))continue;
    fixtures.push({id:'city-lamp-'+fixtures.length,x,y,heading:Math.atan2(dy,dx)+side*Math.PI/2,kind:'lamp',height:100,w:6,d:6});
   }
  }
  for(let i=0;i<buildings.length;i+=3){const b=buildings[i],x=b.x+b.w/2+25,y=b.y;if(this.clear(track,{x,y},18,24)&&!buildings.some(o=>o!==b&&Math.hypot(o.x-x,o.y-y)<Math.hypot(o.w,o.d)/2+20))fixtures.push({id:'city-tree-'+i,x,y,heading:0,kind:'tree',height:57,w:16,d:16});}
  return {buildings,fixtures};
 }
}
