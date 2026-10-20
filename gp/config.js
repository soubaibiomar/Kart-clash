const GP = {
  DT:1/60, WORLD_W:2400, WORLD_H:1500,
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  mod:(x,n)=>((x%n)+n)%n,
  delta:(a,b,n)=>((a-b+n*1.5)%n)-n/2,
  defaults:{drivers:22,laps:6,seed:2026,weather:'sunny',wear:1.35,difficulty:1,incidents:.35,circuit:'coast',grid:'qualifying',rules:'2026',formation:true,sensorRange:220,format:'race',sessionScale:.05,season:'2026',policy:'neural'},
  teams:[['McLaren','MCL','#ff9c32'],['Ferrari','FER','#f34b59'],['Red Bull Racing','RBR','#5e8fff'],['Mercedes','MER','#55d7bd'],['Aston Martin','AMR','#4db5a0'],['Williams','WIL','#56a7ff'],['Haas','HAA','#e4e7e9'],['Alpine','ALP','#ec8cc8'],['Racing Bulls','RBU','#8d9eff'],['Audi','AUD','#ee5a52'],['Cadillac','CAD','#bfc6c9']],
  names:['Lando Norris','Oscar Piastri','Charles Leclerc','Lewis Hamilton','Max Verstappen','Isack Hadjar','George Russell','Kimi Antonelli','Fernando Alonso','Lance Stroll','Carlos Sainz','Alexander Albon','Esteban Ocon','Oliver Bearman','Pierre Gasly','Franco Colapinto','Liam Lawson','Arvid Lindblad','Nico Hulkenberg','Gabriel Bortoleto','Sergio Perez','Valtteri Bottas'],
  numbers:[1,81,16,44,3,6,63,12,14,18,55,23,31,87,10,43,30,41,27,5,11,77],
  // Editorial gameplay interpretations. These are not official ratings or measured telemetry.
  styles:[['Balanced attack',.82,.89,.90],['Smooth precision',.76,.94,.92],['Qualifying attack',.91,.87,.85],['Tyre preservation',.82,.94,.96],['Late braking',.98,.92,.89],['Committed turn-in',.87,.83,.80],['Precise braking',.86,.92,.88],['Fast adaptation',.88,.84,.82],['Tactical defense',.86,.94,.96],['Wet confidence',.77,.82,.82],['Strategic consistency',.80,.94,.94],['Smooth momentum',.79,.91,.90],['Firm defense',.89,.87,.86],['Attacking rookie',.90,.83,.82],['Balanced pace',.83,.90,.88],['Assertive attack',.90,.82,.81],['Committed racing',.90,.83,.83],['Learning quickly',.86,.79,.80],['Measured precision',.77,.94,.90],['Smooth inputs',.80,.87,.86],['Long-stint management',.80,.91,.97],['Clean consistency',.76,.95,.93]],
  compounds:{S:{name:'Soft',color:'#ff5d68',grip:1.10,wear:.16},M:{name:'Medium',color:'#f2d14d',grip:1.02,wear:.105},H:{name:'Hard',color:'#e1e7e7',grip:.96,wear:.073},I:{name:'Intermediate',color:'#5bd28a',grip:1,wear:.11},W:{name:'Wet',color:'#5cafff',grip:1,wear:.13}},
  time:seconds=>Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${(seconds%60).toFixed(3).padStart(6,'0')}`:'—'
};
class RaceRandom {
  constructor(seed){this.state=(Number(seed)>>>0)||1;}
  next(){let x=this.state;x^=x<<13;x^=x>>>17;x^=x<<5;this.state=x>>>0;return this.state/4294967296;}
  range(a,b){return a+(b-a)*this.next();}
}
function createGrid(config,rng){
  let grid=Array.from({length:22},(_,i)=>{
    const team=Math.floor(i/2),t=GP.teams[team],skill=()=>rng.range(.62,.98);
    const p={pace:rng.range(.90,1.08)+(10-team)*.003,qualifying:skill(),consistency:skill(),aggression:skill(),defense:skill(),overtaking:skill(),braking:skill(),cornering:skill(),reaction:rng.range(.18,.48),risk:skill(),management:skill(),wet:skill(),adaptability:skill(),mistakes:rng.range(.002,.008),reliability:rng.range(.96,.999)};
    const style=GP.styles[i];p.aggression=style[1];p.consistency=style[2];p.management=style[3];p.braking=i===4?.98:i===6?.95:p.braking;p.defense=i===8?.98:p.defense;
    return {id:i,number:GP.numbers[i],style:style[0],name:GP.names[i],abbr:GP.names[i].split(' ').at(-1).slice(0,3).toUpperCase(),team:t[0],teamId:team,color:t[2],profile:p,quali:p.pace+p.qualifying*.08+rng.range(-.025,.025)};
  }).sort((a,b)=>b.quali-a.quali);
  grid=grid.filter(d=>config.entryIds?config.entryIds.includes(d.id):d.id<config.drivers);
  if(config.gridIds)grid.sort((a,b)=>config.gridIds.indexOf(a.id)-config.gridIds.indexOf(b.id));
  if(config.grid==='reverse')grid.reverse();
  return grid.map((driver,i)=>({...driver,grid:i+1}));
}
