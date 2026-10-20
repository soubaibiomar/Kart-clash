/** Original synthesized engine/tyre mix derived from current driving state. */
export function driveSound(k,playing,enabled=true){
 const speed=Math.min(13,Math.max(0,k.vel.mag())),throttle=Math.abs(k.lastAction?.throttle||0),active=enabled&&playing&&k.alive;
 return {frequency:52+speed*16+throttle*12,filter:300+speed*90,gain:active?.014+speed*.002:0,undertone:26+speed*8,undertoneGain:active?.008+throttle*.004:0,skid:540+speed*35,skidGain:active&&k.drifting?Math.min(.018,speed*.003):0};
}
