class TrackSupport extends ArenaObstacle{
 constructor(id,x,y,height){super(id,x,y,16,16,height,'track-support');this.elevation=0;}
 blocks(k){return (k.elevation||0)<this.height-12;}
}
