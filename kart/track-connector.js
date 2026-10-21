/** Editor geometry only. A connector never supplies steering or moves a kart. */
export class TrackConnector{
 static close(track,reach=240){
  if(track.closed)throw Error('La boucle est déjà fermée.');
  if(!Number.isFinite(reach)||reach<80||reach>700)throw Error('Amplitude du raccord : 80–700.');
  const source=KartTrack.upgrade(track),points=source.points.map(p=>({...p}));
  if(points.length<3)throw Error('Place au moins trois points avant de préparer le raccord.');
  if(points.length>=239)throw Error('Pas assez de place dans la limite de 240 points pour ajouter un raccord.');
  const first=points[0],second=points[1],last=points.at(-1),before=points.at(-2),gap=Math.hypot(first.x-last.x,first.y-last.y);
  if(gap<8)throw Error('Les extrémités sont déjà jointes : utilise Fermer la boucle.');
  const unit=(a,b)=>{const d=Math.hypot(b.x-a.x,b.y-a.y);if(d<8)throw Error('Deux points sont trop proches.');return {x:(b.x-a.x)/d,y:(b.y-a.y)/d};};
  const entry=unit(before,last),exit=unit(first,second),lead=16;
  const a={x:last.x+entry.x*lead,y:last.y+entry.y*lead},d={x:first.x-exit.x*lead,y:first.y-exit.y*lead};
  const b={x:a.x+entry.x*reach,y:a.y+entry.y*reach},c={x:d.x-exit.x*reach,y:d.y-exit.y*reach};
  // Dense cubic samples are resampled by distance; the two short end segments retain exact tangents.
  const dense=[a];for(let i=1;i<=256;i++){const t=i/256,u=1-t;dense.push({x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y});}
  const distances=[0];for(let i=1;i<dense.length;i++)distances.push(distances.at(-1)+Math.hypot(dense[i].x-dense[i-1].x,dense[i].y-dense[i-1].y));
  const length=distances.at(-1);if(length<16)throw Error('Pas assez de place pour un raccord courbe.');
  const count=Math.max(1,Math.ceil(length/32)),added=[];let cursor=1;
  for(let i=0;i<=count;i++){
   const s=length*i/count;while(cursor<distances.length-1&&distances[cursor]<s)cursor++;
   const lo=cursor-1,f=(s-distances[lo])/(distances[cursor]-distances[lo]||1),height=last.elevation+(first.elevation-last.elevation)*(lead+s)/(length+2*lead);
   added.push({...((first.width!==undefined||last.width!==undefined)?{width:(last.width??source.width)+((first.width??source.width)-(last.width??source.width))*(lead+s)/(length+2*lead)}:{}),x:dense[lo].x+(dense[cursor].x-dense[lo].x)*f,y:dense[lo].y+(dense[cursor].y-dense[lo].y)*f,elevation:height,kind:height>0||last.elevation>0||first.elevation>0?'bridge':'road'});
  }
  const kind=added[0].kind;points.at(-1).kind=kind;
  const result=KartTrack.validate({...source,closed:true,points:[...points,...added]});
  // Reject a folded or excessively tight new bend before creating a road wider than its radius.
  for(let i=points.length-1;i<result.points.length;i++){
   const p=result.points[(i-1+result.points.length)%result.points.length],q=result.points[i],r=result.points[(i+1)%result.points.length];
   const u=Math.hypot(q.x-p.x,q.y-p.y),v=Math.hypot(r.x-q.x,r.y-q.y),chord=Math.hypot(r.x-p.x,r.y-p.y),cross=Math.abs((q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x));
   if(chord<8||cross>1e-6&&u*v*chord/(2*cross)<KartTrack.widthAt(result,i)/2+25)throw Error('Raccord trop serré pour cette largeur : augmente son amplitude ou déplace une extrémité.');
  }
  const preview=[{...result.points[points.length-1]},...added.map(p=>({...p})),{...result.points[0]}];
  return {track:result,preview,length:length+2*lead,added:added.length};
 }
}
