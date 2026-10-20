// Interface/decision service. Never moves an entity or bypasses its driving policy.
class TeamRadio {
  static actions = ['message','box','attack','defend','save-tyres','save-energy','normal','status'];
  static parse(text){
    const s=String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ');
    // Ambiguity and negation require an explicit action choice, never a guessed order.
    if(/\b(pas|non|not|never|don t|ne|sans|instead|plutot)\b/.test(s))return {action:'message',compound:null,understood:false};
    const rules=[['box',/\b(box|pit|pits|stands?|pneus? tendres?|soft|medium|hard|intermediates?|wet)\b/],['attack',/\b(attaque[rz]?|attaquer|attack|push|accelerer)\b/],['defend',/\b(defends?|defendre|defendez|defense|defend)\b/],['save-tyres',/\b(economise[rz]?|preserve[rz]?|save|saving|conserve)\b.*\b(pneus?|tyres?|tires?)\b/],['save-energy',/\b(economise[rz]?|preserve[rz]?|save|saving|conserve)\b.*\b(energie|energy|battery|batterie)\b/],['normal',/\b(normal|normale|normalement|reset)\b/],['status',/\b(status|etat|bilan|rapport|report)\b/]];
    let matches=rules.filter(([,pattern])=>pattern.test(s)).map(([action])=>action);
    // A tyre-saving request is not a tyre-change request.
    if(matches.includes('save-tyres'))matches=matches.filter(a=>a!=='box');
    const compounds=[['S',/\b(soft|softs|tendres?)\b/],['M',/\b(medium|mediums|moyens?)\b/],['H',/\b(hard|hards|durs?)\b/],['I',/\b(intermediate|intermediates|intermediaires?)\b/],['W',/\b(wet|wets|pluie)\b/]].filter(([,p])=>p.test(s)).map(([c])=>c);
    const understood=matches.length===1&&compounds.length<=1;
    return {action:understood?matches[0]:'message',compound:compounds.length===1?compounds[0]:null,understood};
  }
  constructor(){this.pending=null;this.seen=new WeakSet();this.sim=null;}
  sync(sim){if(this.sim!==sim){this.sim=sim;this.pending=null;this.seen=new WeakSet();for(const e of sim.director.events)this.seen.add(e);return [];}
    return sim.director.events.filter(e=>{if(this.seen.has(e))return false;this.seen.add(e);return true;});}
  propose(text,sim,selected,scope='car',action=null,compound='M',duration=30){
    if(!String(text).trim())throw new Error('Écris ou dicte une instruction / Enter an instruction.');
    const parsed=TeamRadio.parse(text),chosen=action||parsed.action;
    if(!TeamRadio.actions.includes(chosen))throw new Error('Action inconnue / Unknown action.');
    const cars=scope==='team'?sim.cars.filter(c=>c.driver.teamId===selected.driver.teamId):[selected];
    this.pending={sim,text:String(text).trim().slice(0,500),action:chosen,compound:action?compound:parsed.compound||compound,ids:cars.map(c=>c.driver.id),names:cars.map(c=>c.driver.name),duration:Math.max(5,Math.min(120,Number(duration)||30)),understood:parsed.understood};
    return this.pending;
  }
  confirm(sim){
    const order=this.pending;this.pending=null;
    if(!order||order.sim!==sim)throw new Error('Proposition expirée / Proposal expired.');
    const cars=order.ids.map(id=>sim.cars.find(c=>c.driver.id===id));
    if(cars.some(c=>!c||c.retired||c.finished))throw new Error('Voiture indisponible / Car unavailable.');
    if(order.action==='box'&&cars.some(c=>c.inPit||!(c.availableSets[order.compound]>0)))throw new Error('Pneus ou voiture indisponibles / Tyres or car unavailable.');
    for(const car of cars){
      if(order.action==='box')car.requestPit(order.compound,'confirmed team radio',sim);
      else if(order.action==='normal'){car.brain.radioOrder=null;car.brain.holdUntil=0;car.brain.opponent=null;car.brain.nextDecision=0;}
      else if(['attack','defend','save-tyres','save-energy'].includes(order.action)){
        car.brain.radioOrder={state:{attack:'ATTACK',defend:'DEFEND','save-tyres':'SAVE_TYRES','save-energy':'SAVE_ENERGY'}[order.action],until:sim.time+order.duration};car.brain.nextDecision=0;car.brain.holdUntil=0;car.brain.opponent=null;
      }
      const reply=order.action==='status'?`${car.driver.abbr}: energy ${Math.round(car.energy)}%, tyre life ${Math.round((1-car.tires.wear)*100)}%.`:order.action==='message'?`${car.driver.abbr}: message received; no driving change.`:`${car.driver.abbr}: confirmed ${order.action}${order.action==='box'?' / '+order.compound:''}.`;
      sim.director.emit('RADIO',`${order.text} → ${reply}`,car);
      sim.lastEvent.radio={text:order.text,action:order.action,compound:order.compound,energy:Math.round(car.energy),tyreLife:Math.round((1-car.tires.wear)*100)};
    }
    return order;
  }
  cancel(){this.pending=null;}
}
