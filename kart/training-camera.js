/** Fit a complete track inside the viewport; presentation only. */
export function trainingCamera(track,aspect=1){
 const points=track.points,min=key=>Math.min(...points.map(p=>p[key]||0)),max=key=>Math.max(...points.map(p=>p[key]||0));
 const x=(min('x')+max('x'))/2,z=(min('y')+max('y'))/2,y=(min('elevation')+max('elevation'))/2;
 const radius=Math.hypot((max('x')-min('x'))/2+track.width/2,(max('y')-min('y'))/2+track.width/2,(max('elevation')-min('elevation'))/2+60);
 const half=Math.min(24*Math.PI/180,Math.atan(Math.tan(24*Math.PI/180)*Math.max(.1,aspect))),distance=radius/Math.sin(half)*1.05,pitch=1.08,angle=-.8;
 return {look:{x,y,z},position:{x:x+Math.cos(angle)*Math.cos(pitch)*distance,y:y+Math.sin(pitch)*distance,z:z+Math.sin(angle)*Math.cos(pitch)*distance},distance,radius,fov:48};
}
