import {drawCity,urbanMaterial,cityBatch} from './city-art.js';
import {drawTrackDecks} from './track-geometry.js';
/** Scenic surfaces decorate existing Vehicle colliders; they do not add invisible collisions. */
export function drawArcadeArena(r,w){const g=r.worldRoot;
 if(w.arena.decks){drawCity(r,w.arena.track,{buildings:w.arena.buildings,fixtures:w.arena.fixtures,arcade:w.options.raceMode==='kart'});drawTrackDecks(r,w.arena.track,{supports:w.arena.supports});return;}r.box(g,900,-18,700,3400,24,2900,'#71825c');const ground=r.box(g,900,-2,700,1800,6,1400,'#667985');ground.material=urbanMaterial(r,'#667985',true);if(ground.material.map){ground.material.map.repeat.set(36,28);ground.material.map.anisotropy=4;ground.material.bumpMap?.repeat.copy(ground.material.map.repeat);}
 if(!w.trackTrial){
  for(const [x,z,width,depth] of [[900,18,1800,36],[900,1382,1800,36],[18,700,36,1400],[1782,700,36,1400]])r.box(g,x,2,z,width,3,depth,'#f4e9c2');
  for(let i=0;i<12;i++){r.box(g,110+i*140,3,85,55,1,4,'#dce7ef');r.box(g,110+i*140,3,1315,55,1,4,'#dce7ef');}
  for(const o of w.arena.obstacles){r.rounded(g,o.pos.x,2,o.pos.y,o.w+28,3,o.h+28,'#849071',10);}
 }
 for(const o of w.arena.solids){if(o.kind==='track-wall'){r.box(g,o.pos.x,o.height/2,o.pos.y,o.w,o.height,o.h,'#80bd49');continue;}
  const boundary=o.kind==='boundary',palette=['#9b6351','#527a83','#a99563','#746e80','#527b6d','#93676d'],index=Number(o.id.replace('cover',''))||0,color=boundary?'#4f9acb':palette[index%6];
  r.rounded(g,o.pos.x,o.height/2,o.pos.y,o.w,o.height,o.h,color,boundary?3:7);
  r.box(g,o.pos.x,o.height+2,o.pos.y,o.w+2,4,o.h+2,boundary?'#f5f3dc':'#e8e4ce');
  if(!boundary){for(const sign of [-1,1]){r.box(g,o.pos.x,o.height*.35,o.pos.y+sign*(o.h/2+.5),o.w-16,9,2,'#fff2c9');}r.rounded(g,o.pos.x,o.height+7,o.pos.y,Math.max(20,o.w-24),7,Math.max(20,o.h-24),color,5);}
 }
 const detail=cityBatch(r,g);for(const o of w.arena.obstacles){if(o.kind==='track-wall')continue;for(let x=-o.w/2+12;x<o.w/2-8;x+=28)for(const side of [-1,1])detail.box(o.pos.x+x,o.height*.48,o.pos.y+side*(o.h/2+1),3,o.height*.76,2,'#68757b');}detail.flush();
 // Distant scenery lives outside the playable boundary and establishes a bright outdoor stadium.
 for(let i=0;i<12;i++){const x=-400+i*250,z=i%2?-360:1770;r.mesh(new r.THREE.ConeGeometry(180+(i%3)*45,280+(i%4)*55,6),'#657b64',g,x,45,z);}
 for(const z of [-160,1560]){r.box(g,900,25,z,1900,25,160,'#d2c5a5');r.box(g,900,46,z-25,1900,16,95,'#ecd9b1');r.box(g,900,62,z-48,1900,16,40,'#faf0cf');for(let i=0;i<8;i++){r.box(g,120+i*220,85,z-45,100,26,15,i%2?'#63b8db':'#ee9d65');}}
 for(const x of [-130,1930])for(const z of [100,1200]){r.box(g,x,100,z,8,200,8,'#e6e9de');r.box(g,x,205,z,85,20,16,'#fdf1ad');}
 const sign=r.label('KART CLASH','#fff2b6');sign.position.set(900,105,-2);g.add(sign);
}
