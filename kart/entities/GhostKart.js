/** Vehicle-derived display of a recorded Kart. Never added to a simulation world. */
class GhostKart extends Kart{
 constructor(){super('track-ghost','Fantôme du record','#a1e1ed');this.controller='Relecture du record · sans collision';this.maxSpeed=0;this.maxForce=0;this.normal={speed:0,force:0};this.spawnSerial=1;this.playbackVisible=false;}
 present(pose){this.playbackVisible=!!pose;if(!pose)return;this.pos.set(pose.x,pose.y);this.heading=pose.heading;this.elevation=pose.elevation;this.slopeVector={...pose.slopeVector};}
}
