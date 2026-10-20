/** Presentation only: never reads RNG, plans agents or changes the simulation. */
export function cameraProfile(speed=0,boost=false,reduced=false){const pace=Math.min(1,Math.max(0,speed)/4.8);return {distance:reduced?240:222+pace*20,height:reduced?135:106+pace*9,look:reduced?48:48+pace*25,fov:reduced?54:56+pace*5+(boost?4:0)};}
export function kartPresentation(k,time){return {lean:k.drifting?k.turn*.11:k.turn*.045,protected:time<k.protectedUntil,shield:time<k.shieldUntil,boost:time<k.boostUntil};}
export function visibleOpponent(k,player,w){return k!==player&&k.alive&&Math.hypot(k.pos.x-player.pos.x,k.pos.y-player.pos.y)<=650&&w.arena.clear(player.pos,k.pos,0);}
