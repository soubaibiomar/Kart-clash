/** Geometry diagnostics only: never a racing line, speed command or learned result. */
export function reviewTrack(data){
 let track;try{track=KartTrack.validate(data);}catch(error){return {valid:false,error:(data?.points?.length||0)<3?'Ajoute au moins trois points pour lire le tracé.':error.message,features:[],points:data?.points?.length||0};}
 const p=track.points,n=p.length,count=n-(track.closed?0:1),features=[];let length=0,tunnelLength=0,maxGrade=0,climb=0,descent=0,bends=0;
 for(let i=0;i<count;i++){
  const a=p[i],b=p[(i+1)%n],horizontal=Math.hypot(b.x-a.x,b.y-a.y),delta=(b.elevation||0)-(a.elevation||0),distance=Math.hypot(horizontal,delta),grade=horizontal>0?Math.abs(delta)/horizontal:0;
  length+=distance;if(a.kind==='tunnel')tunnelLength+=distance;maxGrade=Math.max(maxGrade,grade);climb+=Math.max(0,delta);descent+=Math.max(0,-delta);
  if(grade>=.35-1e-9)features.push({kind:'slope',index:i,grade,direction:delta>=0?'montée':'descente',attention:true,score:grade/.35});
 }
 for(let i=track.closed?0:1;i<(track.closed?n:n-1);i++){
  const a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],ux=b.x-a.x,uy=b.y-a.y,vx=c.x-b.x,vy=c.y-b.y,cross=ux*vy-uy*vx,dot=ux*vx+uy*vy,angle=Math.atan2(cross,dot),degrees=Math.abs(angle)*180/Math.PI;
  if(degrees<5-1e-9)continue;bends++;
  const radius=Math.abs(cross)>1e-9?Math.hypot(ux,uy)*Math.hypot(vx,vy)*Math.hypot(c.x-a.x,c.y-a.y)/(2*Math.abs(cross)):0,threshold=KartTrack.widthAt(track,i)/2+25,sharp=degrees>=60-1e-9,attention=radius<=threshold+1e-9||sharp;
  features.push({kind:'bend',index:i,angle:degrees,direction:angle>=0?'droite':'gauche',radius,sharp,attention,score:attention?Math.max(threshold/Math.max(1,radius),degrees/60):degrees/180});
 }
 features.sort((a,b)=>Number(b.attention)-Number(a.attention)||b.score-a.score||a.index-b.index||a.kind.localeCompare(b.kind));
 // Spread the small visible list along the road; preserve all counts separately.
 const focus=[];for(const feature of features){const at=p[feature.index];if(focus.some(f=>{const q=p[f.index];return Math.hypot(at.x-q.x,at.y-q.y,(at.elevation||0)-(q.elevation||0))<track.width;}))continue;focus.push(feature);if(focus.length===6)break;}
 return {valid:true,points:n,length,tunnelLength,maxGrade,climb,descent,bends,minHeight:Math.min(...p.map(v=>v.elevation||0)),maxHeight:Math.max(...p.map(v=>v.elevation||0)),attention:new Set(features.filter(f=>f.attention).map(f=>f.index)).size,features,focus};
}
