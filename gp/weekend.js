// Session control owns entry lists and classification; lap times come from moving cars.
class RaceWeekend {
  constructor(config={}){
    this.config={...GP.defaults,...config};this.format=this.config.format;
    const circuit=typeof F1_CIRCUITS!=='undefined'?F1_CIRCUITS.find(c=>c.id===this.config.circuit):null;
    if(this.config.officialDistance&&circuit)this.config.laps=Math.ceil((circuit.location==='Monaco'?260000:305000)/circuit.meters);
    this.sessions=this.format==='sprint'?['FP1','SQ1','SQ2','SQ3','SPRINT','Q1','Q2','Q3','RACE']:
      this.format==='classic'?['FP1','FP2','FP3','Q1','Q2','Q3','RACE']:['RACE'];
    this.index=0;this.history=[];this.eligible=null;this.qualifyingGroups=[];this.raceGrid=null;this.sprintGrid=null;
    this.sim=this.createSession();
  }
  get name(){return this.sessions[this.index];}
  createSession(){
    const name=this.name,qualifying=/^S?Q/.test(name),practice=name.startsWith('FP'),timed=practice||qualifying;
    const minutes=practice?60:({Q1:18,Q2:15,Q3:13,SQ1:12,SQ2:10,SQ3:8}[name]||0);
    const scale=GP.clamp(Number(this.config.sessionScale)||.05,.01,1);
    const config={...this.config,sessionName:name,timedSession:timed,sessionDuration:minutes*60*scale,
      formation:timed?false:this.config.formation,laps:name==='SPRINT'?(this.config.officialDistance?Math.ceil(100000/(typeof F1_CIRCUITS!=='undefined'?F1_CIRCUITS.find(c=>c.id===this.config.circuit)?.meters||5000:5000)):Math.max(1,Math.round(this.config.laps/3))):this.config.laps,
      entryIds:qualifying&&this.eligible?this.eligible:undefined,gridIds:name==='RACE'?this.raceGrid:name==='SPRINT'?this.sprintGrid:undefined,
      sprint:name==='SPRINT'};
    return new GrandPrixSimulation(config);
  }
  next(){
    if(this.sim.phase!=='COMPLETE'||this.index===this.sessions.length-1)return false;
    const name=this.name,order=this.sim.order(),result=order.map(c=>({id:c.driver.id,name:c.driver.name,best:c.bestLap,position:order.indexOf(c)+1,points:c.points||0,review:!!c.qualifyingReview}));
    if(name==='Q1'||name==='SQ1'){const fastest=order[0]?.bestLap;for(const c of order)c.qualifyingReview=!SportingRules.qualifying107(c.bestLap,fastest,this.sim.wetRace);}
    this.history.push({name,result});
    if(/^S?Q/.test(name)){
      const stage=Number(name.at(-1));
      if(stage<3){
        const capacity=stage===1?16:10;
        const promoted=order.slice(0,Math.min(capacity,Math.max(2,order.length-(order.length>10?6:0))));
        this.qualifyingGroups.unshift(order.slice(promoted.length).map(c=>c.driver.id));this.eligible=promoted.map(c=>c.driver.id);
      }else{
        const grid=[...order.map(c=>c.driver.id),...this.qualifyingGroups.flat()];
        if(name.startsWith('SQ'))this.sprintGrid=grid;else this.raceGrid=grid;
        this.eligible=null;this.qualifyingGroups=[];
      }
    }
    this.index++;this.sim=this.createSession();return true;
  }
}
