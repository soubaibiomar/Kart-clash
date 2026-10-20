// Persistent physical worker; stdout is a JSON-lines protocol, never a log channel.
const readline=require('node:readline'),{load}=require('../node-world.cjs');let population;
const g=load();readline.createInterface({input:process.stdin}).on('line',line=>{try{const r=JSON.parse(line);if(r.command==='init')population=new g.EvolutionPopulation(r.track,r.options);else if(r.command==='step')population.step(r.actions);else throw Error('Unknown command');process.stdout.write(JSON.stringify(population.snapshot())+'\n');}catch(e){process.stdout.write(JSON.stringify({error:e.message})+'\n');}});
