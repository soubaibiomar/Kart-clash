/** Recorded presentation poses, never actions for a live or neural controller. */
export const GHOST_LIMIT=1802;
export function validateTrackGhost(value){
 if(value?.schema!=='kart-track-ghost-v1'||typeof value.key!=='string'||value.key.length>30000||!Number.isFinite(value.time)||value.time<=0||value.time>180||!Array.isArray(value.frames)||value.frames.length<2||value.frames.length>GHOST_LIMIT)throw Error('Relecture de circuit invalide.');
 let bounds={width:1800,height:1400};try{const b=JSON.parse(value.key).bounds;if(b&&Number.isFinite(b.width)&&b.width>=1800&&b.width<=5400&&Number.isFinite(b.height)&&b.height>=1400&&b.height<=4200)bounds=b;}catch{}
 const frames=value.frames.map((f,i)=>{if(!Array.isArray(f)||f.length!==7||!f.every(Number.isFinite)||f[0]<0||f[0]>value.time||(i&&f[0]<=value.frames[i-1][0])||f[1]<-100||f[1]>bounds.width+100||f[2]<-100||f[2]>bounds.height+100||f[3]<-20||f[3]>260||Math.abs(f[4])>1e6||Math.abs(f[5])>1||Math.abs(f[6])>1)throw Error('Pose de relecture invalide.');return [...f];});
 if(frames[0][0]!==0||frames.at(-1)[0]!==value.time)throw Error('Relecture incomplète.');return {schema:value.schema,key:value.key,time:value.time,frames};
}
export function readTrackGhosts(read){try{const values=read();return Array.isArray(values)?values.slice(0,3).flatMap(v=>{try{return [validateTrackGhost(v)];}catch{return [];}}):[];}catch{return [];}}
export class TrackGhostRecording{
 constructor(k){this.frames=[];this.invalid=false;this.capture(0,k);}
 capture(time,k,final=false){
  if(this.invalid||time<0||time>180)return;
  const last=this.frames.at(-1);if(last&&time<=last[0])return;if(last&&!final&&time-last[0]<.1-1e-8)return;
  if(this.frames.length>=GHOST_LIMIT){this.invalid=true;return;}
  const f=[time,k.pos.x,k.pos.y,k.elevation||0,k.heading,k.slopeVector?.x||0,k.slopeVector?.y||0];if(!f.every(Number.isFinite)){this.invalid=true;return;}this.frames.push(f);
 }
 export(key,time){if(this.invalid)return null;try{return validateTrackGhost({schema:'kart-track-ghost-v1',key,time,frames:this.frames});}catch{return null;}}
}
/** Binary search + shortest-angle interpolation of measured samples only. */
export function trackGhostPose(record,time){
 if(!record||!Number.isFinite(time)||time<0||time>record.time)return null;
 const f=record.frames;let lo=0,hi=f.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(f[mid][0]<=time)lo=mid;else hi=mid;}
 const a=f[lo],b=f[hi],mix=Math.max(0,Math.min(1,(time-a[0])/(b[0]-a[0]))),v=i=>a[i]+(b[i]-a[i])*mix;
 return {x:v(1),y:v(2),elevation:v(3),heading:a[4]+Math.atan2(Math.sin(b[4]-a[4]),Math.cos(b[4]-a[4]))*mix,slopeVector:{x:v(5),y:v(6)}};
}
