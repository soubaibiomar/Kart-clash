class TireSet {
  constructor(compound='M'){this.compound=compound;this.wear=0;this.age=0;this.temperature=55;this.grip=.8;this.overheated=false;this.loss=0;}
  update(car,environment,distance,config){
    const spec=GP.compounds[this.compound],p=car.driver.profile,load=car.curvature*110,wet=environment.wetness;
    this.age+=Math.max(0,distance)/car.track.totalLength;
    const style=(1.35-p.management*.45)*(car.state==='ATTACK'?1.18:car.state==='SAVE_TYRES'?.78:1);
    const mismatch=this.compound==='I'?Math.abs(wet-.4):this.compound==='W'?Math.abs(wet-.85):wet;
    this.wear=GP.clamp(this.wear+Math.max(0,distance)/car.track.totalLength*spec.wear*config.wear*style*(1+Math.min(1,load)*.22+mismatch*.35),0,1);
    const target=environment.trackTemp+45+car.vel.mag()*4+load*7;
    this.temperature+=(target-this.temperature)*GP.DT*.12;
    this.overheated=this.temperature>115;this.loss=this.wear*.24+Math.max(0,this.wear-.65)*.7;
    const warm=GP.clamp(1-Math.abs(this.temperature-95)*.004,.65,1);
    const weather=this.compound==='I'?GP.clamp(1.05-Math.abs(wet-.42)*1.1,.48,1):this.compound==='W'?GP.clamp(1.05-Math.abs(wet-.86)*.9,.45,1):GP.clamp(1-wet*.85,.25,1);
    this.grip=GP.clamp(spec.grip*warm*weather*(1-this.loss)*(1+wet*(p.wet-.7)*.3),.25,1.15);
  }
}
class RaceEnvironment {
  constructor(config,rng){this.mode=config.weather==='dynamic'?'cloudy':config.weather;this.dynamic=config.weather==='dynamic';this.wetness=this.mode==='wet'?.8:this.mode==='rain'?.35:0;this.trackTemp=34;this.nextChange=45+rng.range(0,45);this.forecast=this.dynamic?'Rain possible':'Stable conditions';}
  update(sim){
    if(this.dynamic&&sim.raceTime>this.nextChange){this.mode=['cloudy','rain','wet','drying'][sim.rng.next()*4|0];this.nextChange=sim.raceTime+40+sim.rng.range(0,70);sim.director.emit('WEATHER',`Weather changing: ${this.mode}. Strategy windows are open.`);}
    const target=this.mode==='wet'?.9:this.mode==='rain'?.45:0;
    this.wetness+=GP.clamp(target-this.wetness,-GP.DT*.006,GP.DT*.012);
    this.trackTemp+=((this.wetness>0.1?25:37)-this.trackTemp)*GP.DT*.015;
    if(this.wetness>.12)sim.wetRace=true;
  }
  preferred(){return this.wetness>.65?'W':this.wetness>.18?'I':null;}
}
