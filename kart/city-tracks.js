/** Curated city routes; geometry only, never a steering controller. */
class CityTracks {
 static roadRun(id='@city-skyway'){const source=this.get(id),points=[];for(let i=0;i<source.points.length;i++){const a=source.points[i],b=source.points[(i+1)%source.points.length];points.push({...a,width:140});if(Math.hypot(b.x-a.x,b.y-a.y)>340)for(const t of [.3,.7])points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,elevation:a.elevation+(b.elevation-a.elevation)*t,kind:a.kind,width:320});}return KartTrack.validate({...source,name:'Avenues et passages · route dynamique',width:240,cityDensity:.25,points});}
 static grandTour(id='@city-skyway'){const source=this.roadRun(id),points=source.points.map(p=>({...p,x:p.x*2.5,y:p.y*2.5}));let start=0;for(let i=1;i<points.length;i++)if(Math.hypot(points[(i+1)%points.length].x-points[i].x,points[(i+1)%points.length].y-points[i].y)>Math.hypot(points[(start+1)%points.length].x-points[start].x,points[(start+1)%points.length].y-points[start].y))start=i;return KartTrack.validate({...source,name:id==='@city-skyway'?'Grand Tour · métropole XL':id==='@city-docks'?'Grand Tour · docks XL':'Grand Tour · centre-ville XL',bounds:{width:4500,height:3500},points:[...points.slice(start),...points.slice(0,start)]});}
 static carnival(){const t=this.grandTour();return KartTrack.validate({...t,name:'Carnaval Turbo · Grand Prix',width:260,cityDensity:.08,points:t.points.map(p=>({...p,width:Math.max(220,p.width??260)}))});}
 static catalog(){return [{id:'@city-downtown',name:'Centre-ville · les douze virages',description:'Boulevards, rues résidentielles et virages arrondis.'},{id:'@city-docks',name:'Les docks · parcours technique',description:'Quartier portuaire, chicanes et grandes traversées.'},{id:'@city-skyway',name:'Métropole · viaduc et tunnel',description:'Viaduc urbain, rampes et passage couvert.'}];}
 static get(id='@city-downtown'){
  let corners=[[260,220],[1540,220],[1540,580],[1160,580],[1160,940],[1540,940],[1540,1200],[260,1200],[260,860],[700,860],[700,520],[260,520]];
  if(id==='@city-docks')corners=[[260,240],[1400,240],[1540,430],[1320,650],[1540,870],[1400,1180],[950,1180],[950,920],[560,920],[560,1180],[260,1180],[260,680],[700,680],[700,440],[260,440]];
  if(!this.catalog().some(t=>t.id===id))throw Error('Circuit urbain inconnu.');
  const raised=id==='@city-skyway',nodes=corners.map(([x,y],i)=>({x,y,elevation:raised&&i>=2&&i<=4?140:0,kind:raised&&i>=1&&i<=4?'bridge':raised&&i===9?'tunnel':'road'}));
  const points=[];
  for(let i=0;i<nodes.length;i++){
   const a=nodes[(i-1+nodes.length)%nodes.length],b=nodes[i],c=nodes[(i+1)%nodes.length],incoming=Math.hypot(a.x-b.x,a.y-b.y),outgoing=Math.hypot(c.x-b.x,c.y-b.y),trim=Math.min(140,incoming*.45,outgoing*.45),ix=(b.x-a.x)/incoming,iy=(b.y-a.y)/incoming,ox=(c.x-b.x)/outgoing,oy=(c.y-b.y)/outgoing,turn=Math.atan2(ix*oy-iy*ox,ix*ox+iy*oy),radius=trim/Math.tan(Math.abs(turn)/2),sign=Math.sign(turn),start={x:b.x-ix*trim,y:b.y-iy*trim,elevation:b.elevation+(a.elevation-b.elevation)*trim/incoming},endHeight=b.elevation+(c.elevation-b.elevation)*trim/outgoing,cx=start.x-iy*radius*sign,cy=start.y+ix*radius*sign,angle=Math.atan2(start.y-cy,start.x-cx);
   for(let j=0;j<=4;j++){const t=j/4,theta=angle+turn*t;points.push({x:cx+Math.cos(theta)*radius,y:cy+Math.sin(theta)*radius,elevation:start.elevation+(endHeight-start.elevation)*t,kind:b.kind});}
  }
  return KartTrack.validate({schema:'kart-track-v2',name:this.catalog().find(t=>t.id===id).name,width:140,closed:true,points});
 }
}
