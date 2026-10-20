// Supported sporting rules. This is deliberately not a claim of complete FIA compliance.
class SportingRules {
  static points(position,sprint=false){return (sprint?[8,7,6,5,4,3,2,1]:[25,18,15,12,10,8,6,4,2,1])[position-1]||0;}
  static compoundRequired(sim,car){return !sim.config.sprint&&sim.config.laps>=3&&!car.usedCompounds.has('I')&&!car.usedCompounds.has('W');}
  static classified(car,winnerLaps){return !car.disqualified&&car.lap>=Math.floor(winnerLaps*.9);}
  static qualifying107(best,fastest,wet=false){return wet||Number.isFinite(best)&&best<=fastest*1.07+1e-9;}
  static disqualify(sim,car,reason){car.disqualified=true;car.retired=true;car.finished=false;car.state='DSQ';car.finishTime=Infinity;sim.director.emit('DSQ',`${car.driver.abbr}: disqualified — ${reason}.`,car);}
}
