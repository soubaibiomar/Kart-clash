/** Editable construction geometry. Never drives a car or writes saved tracks. */
export class TrackPieces{
 static append(points,options={}){
  const o={kind:'straight',length:240,radius:180,angle:90,altitude:0,heading:0,bridgeHeight:140,span:240,ramp:320,...options};
  if(!['straight','left','right','ramp','bridge','tunnel'].includes(o.kind))throw Error('Choisis une portion.');
  for(const [key,min,max] of [['length',80,900],['radius',80,500],['angle',15,180],['altitude',0,240],['heading',-180,180],['bridgeHeight',60,240],['span',80,700],['ramp',120,700]])if(!Number.isFinite(o[key])||o[key]<min||o[key]>max)throw Error('Réglage invalide : '+key);
  const out=points.map(p=>({...p}));if(!out.length)out.push({x:300,y:700,elevation:0,kind:'road'});
  const last=out.at(-1),previous=out.at(-2),h=previous?Math.atan2(last.y-previous.y,last.x-previous.x):o.heading*Math.PI/180;
  const kind=o.kind==='tunnel'?'tunnel':o.kind==='bridge'||o.kind==='ramp'||last.elevation>0||o.altitude>0?'bridge':'road';last.kind=kind;
  if(o.kind==='left'||o.kind==='right'){
   const sign=o.kind==='left'?-1:1,r=o.radius,cx=last.x-Math.sin(h)*r*sign,cy=last.y+Math.cos(h)*r*sign,count=Math.ceil(o.angle/15);
   // Intersections of adjacent tangents give exact entry/exit headings, including after reload.
   const step=o.angle*Math.PI/180/count;
   for(let i=1;i<=count;i++){const fraction=(i-.5)/count,a=h-sign*Math.PI/2+sign*step*(i-.5),distance=r/Math.cos(step/2);out.push({x:cx+Math.cos(a)*distance,y:cy+Math.sin(a)*distance,elevation:last.elevation+(o.altitude-last.elevation)*fraction,kind});}
   const end=h-sign*Math.PI/2+sign*o.angle*Math.PI/180;out.push({x:cx+Math.cos(end)*r,y:cy+Math.sin(end)*r,elevation:o.altitude,kind});
  }else if(o.kind==='bridge'){
   if(o.bridgeHeight<last.elevation)throw Error('Le sommet du pont doit dépasser la hauteur de départ.');
   for(const [d,elevation] of [[o.ramp,o.bridgeHeight],[o.ramp+o.span,o.bridgeHeight],[2*o.ramp+o.span,last.elevation]])out.push({x:last.x+Math.cos(h)*d,y:last.y+Math.sin(h)*d,elevation,kind:'bridge'});
  }else out.push({x:last.x+Math.cos(h)*o.length,y:last.y+Math.sin(h)*o.length,elevation:o.altitude,kind});
  if(out.length>240)throw Error('Limite de 240 points atteinte.');
  for(const p of out)if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<80||p.x>1720||p.y<80||p.y>1320)throw Error('La portion sort du terrain : raccourcis-la, change de virage ou déplace le départ.');
  for(let i=Math.max(1,points.length);i<out.length;i++){const a=out[i-1],b=out[i],d=Math.hypot(b.x-a.x,b.y-a.y);if(d<8)throw Error('Deux points sont trop proches.');if(Math.abs(b.elevation-a.elevation)>d*.5+1e-6)throw Error('Rampe trop courte : allonge-la ou réduis sa hauteur (pente maximale 50 %).');}
  return out;
 }
}
