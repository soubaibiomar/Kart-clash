import {roadCurb} from './track-geometry.js';
import * as THREE from '../gp/vendor/three.module.js';
/** Original carnival presentation; geometry decorates existing world entities. */
export function drawKartCircuit(r,w){
 const track=w.arena.track,a=track.points[0],b=track.points[1],angle=Math.atan2(b.y-a.y,b.x-a.x),gate=new THREE.Group();gate.position.set(a.x,a.elevation||0,a.y);gate.rotation.y=-angle;r.worldRoot.add(gate);const width=KartTrack.widthAt(track,0);
 for(let col=0;col<10;col++)for(let row=0;row<2;row++)r.box(gate,row*12,1,(col-4.5)*width/10,12,2,width/10,(col+row)%2?'#fff8d5':'#263b68');
 for(const side of [-1,1]){r.box(gate,0,95,side*(width/2+20),18,190,18,'#8a57e8');r.box(gate,0,189,side*width/4,18,18,width/2+40,'#ffbb32');}const title=r.label('TURBO CUP','#ffffff');title.position.set(0,214,0);title.scale.set(.7,.7,.7);gate.add(title);
 for(const pad of w.arena.boostPads||[]){const root=new THREE.Group();root.position.set(pad.pos.x,pad.elevation+3,pad.pos.y);root.rotation.y=-pad.heading;const disc=r.mesh(new THREE.CylinderGeometry(pad.r,pad.r,2,24),'#19d7c4',root);disc.material=r.lamp('#19d7c4',.4);const ring=r.mesh(new THREE.TorusGeometry(pad.r,3,8,32),'#ffe76b',root);ring.rotation.x=Math.PI/2;ring.position.y=2;for(const x of [-14,8])for(const side of [-1,1]){const stripe=r.box(root,x,3,side*8,20,2,5,'#fff6b0');stripe.rotation.y=side*.6;}r.worldRoot.add(root);r.entities.set(pad.id,{root});}
 const palette=['#fc5c91','#ffca41','#3acdde','#9971f0'];for(let i=0;i<track.points.length-(track.closed?0:1);i++)for(const side of [-1,1])r.mesh(roadCurb(track,i,side),i%2?'#fff4cf':palette[Math.floor(i/6)%palette.length],r.worldRoot);for(let i=0;i<track.points.length;i+=3){const p=KartTrack.offset(track,i,1),root=new THREE.Group();root.position.set(p.x,p.elevation||0,p.y);r.worldRoot.add(root);r.box(root,0,32,0,4,64,4,'#fff3cf');r.box(root,10,58,0,22,16,3,palette[Math.floor(i/3)%palette.length]);}
}
