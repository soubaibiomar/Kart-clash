// Composition only: the owning Vehicle applies this force and integrates movement.
class BehaviorManager {
  constructor(vehicle,{strategy='weighted'}={}){if(!['weighted','priority'].includes(strategy))throw new Error('Unknown composition strategy');this.vehicle=vehicle;this.entries=new Map();this.strategy=strategy;this.last={components:[],force:{x:0,y:0}};}
  add(behavior,weight=1){
    if(!behavior?.name||typeof behavior.calculate!=='function')throw new TypeError('A behavior needs a name and calculate(context)');
    if(this.entries.has(behavior.name))throw new Error('Behavior already registered');
    this.entries.set(behavior.name,{...behavior,weight:this.validWeight(weight),enabled:behavior.enabled!==false});return this;
  }
  validWeight(weight){if(!Number.isFinite(weight)||weight<0||weight>10)throw new RangeError('Weight must be between 0 and 10');return weight;}
  remove(name){return this.entries.delete(name);}
  getBehavior(name){return this.entries.get(name);}
  activate(name){const b=this.entries.get(name);if(!b)throw new Error('Unknown behavior');b.enabled=true;return this;}
  deactivate(name){const b=this.entries.get(name);if(!b)throw new Error('Unknown behavior');b.enabled=false;return this;}
  changeWeight(name,weight){const b=this.entries.get(name);if(!b)throw new Error('Unknown behavior');b.weight=this.validWeight(weight);return this;}
  getSteeringForce(context={}){
    let sum=createVector(0,0),priority=-Infinity;const components=[];
    for(const b of this.entries.values()){
      if(!b.enabled||b.weight===0||b.when&&!b.when(context))continue;
      const raw=b.calculate(context);if(!raw||!Number.isFinite(raw.x)||!Number.isFinite(raw.y))throw new TypeError(`Invalid force from ${b.name}`);
      const force=raw.copy().limit(this.vehicle.maxForce).mult(b.weight),level=b.priority||0;
      components.push({name:b.name,weight:b.weight,priority:level,force:{x:force.x,y:force.y}});
      if(this.strategy==='priority'&&force.mag()>1e-9){if(level>priority){sum.set(0,0);priority=level;}if(level===priority)sum.add(force);}
      else if(this.strategy!=='priority')sum.add(force);
    }
    sum.limit(this.vehicle.maxForce);this.last={components,force:{x:sum.x,y:sum.y}};return sum;
  }
  exportSettings(){return [...this.entries.values()].map(b=>({name:b.name,weight:b.weight,enabled:b.enabled}));}
  importSettings(settings){
    if(!Array.isArray(settings))throw new TypeError('Behavior settings must be an array');
    for(const s of settings){if(!this.entries.has(s.name)||typeof s.enabled!=='boolean')throw new Error('Invalid behavior settings');this.validWeight(s.weight);}
    for(const s of settings){this.changeWeight(s.name,s.weight);this.entries.get(s.name).enabled=s.enabled;}return this;
  }
}
