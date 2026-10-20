import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {setupGP} from './gp-harness.mjs';
const {TeamRadio,GrandPrixSimulation,NeuralSteering}=setupGP({neural:true});
const make=()=>new GrandPrixSimulation({drivers:22,formation:false,incidents:0});

test('FR/EN phrases, accents, tyre compounds and free text have explicit meanings',()=>{
  for(const [text,action,compound] of [['Box this lap on soft tyres','box','S'],['Rentre aux stands pneus durs','box','H'],['Économise les pneus','save-tyres',null],['Save energy please','save-energy',null],['Défendre','defend',null],['Attack now','attack',null],['Rapport voiture','status',null],['Pilotage normal','normal',null]]){
    const p=TeamRadio.parse(text);assert.equal(p.action,action,text);assert.equal(p.compound,compound);assert.ok(p.understood);
  }
  for(const text of ['Ne rentre pas aux stands','Do not attack','Attack and defend','Box on soft or hard','Bonjour mon ingénieur'])assert.equal(TeamRadio.parse(text).action,'message',text);
});
test('proposal never applies before confirmation; selection stays locked and consumption is one-shot',()=>{
  const s=make(),r=new TeamRadio(),c=s.cars[0];r.propose('Box on soft',s,c);
  assert.equal(c.pitRequested,false);assert.equal(r.pending.ids[0],c.driver.id);
  r.confirm(s);assert.equal(c.pitRequested,true);assert.equal(c.pitCompound,'S');assert.equal(s.cars[1].pitRequested,false);assert.throws(()=>r.confirm(s));
});
test('free text is recorded without driving effects; user can choose its action explicitly',()=>{
  const s=make(),r=new TeamRadio(),c=s.cars[0];r.propose('Allez les gars, plan delta',s,c);r.confirm(s);assert.equal(c.brain.radioOrder,undefined);assert.equal(c.pitRequested,false);
  r.propose('Plan delta',s,c,'car','save-energy','M',30);r.confirm(s);assert.equal(c.brain.radioOrder.state,'SAVE_ENERGY');assert.equal(c.brain.radioOrder.until,30);
});
test('team orders cover only teammates and validate all tyre sets before any pit request',()=>{
  const s=make(),r=new TeamRadio(),c=s.cars[0],mate=s.cars.find(o=>o!==c&&o.driver.teamId===c.driver.teamId);
  r.propose('Box on hard',s,c,'team');mate.availableSets.H=0;assert.throws(()=>r.confirm(s));assert.equal(c.pitRequested,false);
  mate.availableSets.H=1;r.propose('Box on hard',s,c,'team');r.confirm(s);assert.ok(c.pitRequested&&mate.pitRequested);assert.equal(s.cars.filter(o=>o.pitRequested).length,2);
});
test('cancel, session change and unavailable cars cannot execute pending orders',()=>{
  const s=make(),r=new TeamRadio();r.propose('Attack',s,s.cars[0]);r.cancel();assert.throws(()=>r.confirm(s));
  r.propose('Attack',s,s.cars[0]);assert.throws(()=>r.confirm(make()));
  r.propose('Attack',s,s.cars[0]);s.cars[0].retired=true;assert.throws(()=>r.confirm(s));
  assert.throws(()=>r.propose('',s,s.cars[1]));assert.throws(()=>r.propose('hello',s,s.cars[1],'car','invalid'));
});
test('tactical duration, normal restoration and safety flag priority',()=>{
  const s=make(),c=s.cars[0],r=new TeamRadio();s.time=1;c.lastProgressTime=1;
  r.propose('Save tyres',s,c,'car',null,'M',5);r.confirm(s);c.brain.decide(c,s,[]);assert.equal(c.state,'SAVE_TYRES');
  s.director.flag='YELLOW';s.time=2;c.brain.nextDecision=0;c.brain.decide(c,s,[]);assert.equal(c.state,'SAFETY_CAR');
  s.director.flag='GREEN';s.time=6;c.brain.nextDecision=99;c.brain.decide(c,s,[]);assert.equal(c.brain.radioOrder,null);assert.notEqual(c.state,'SAVE_TYRES');
  r.propose('Attack',s,c);r.confirm(s);r.propose('normal',s,c);r.confirm(s);assert.equal(c.brain.radioOrder,null);
});
test('neural policy conserves energy/tyres and bounds force; caution speed overrides attack',()=>{
  const s=make(),c=s.cars[0];c.neuralModel.predict=()=>[.5,1];c.vel.set(2,0);c.sensors={rays:[]};
  c.state='RACE';NeuralSteering.race(c,s,[]);const baseline=c.targetSpeed;
  c.state='SAVE_ENERGY';const f=NeuralSteering.race(c,s,[]);assert.ok(c.targetSpeed<baseline);assert.ok(f.mag()<=c.maxForce+1e-9);assert.equal(c.boost,false);
  c.state='SAVE_TYRES';NeuralSteering.race(c,s,[]);assert.ok(c.targetSpeed<baseline);
  c.state='ATTACK';s.director.flag='YELLOW';NeuralSteering.race(c,s,[]);assert.ok(c.targetSpeed<=3.5);assert.equal(c.boost,false);
});
test('radio event cursor never repeats events and resets at a new session',()=>{
  const s=make(),r=new TeamRadio();s.director.emit('BOX','old');assert.equal(r.sync(s).length,0);
  s.director.emit('YELLOW','new');assert.equal(r.sync(s).length,1);assert.equal(r.sync(s).length,0);
  for(let i=0;i<405;i++){s.director.emit('RADIO',String(i));r.sync(s);}assert.equal(r.sync(s).length,0);assert.equal(r.sync(make()).length,0);
});

function uiHarness(){
  const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{value:'',dataset:{},hidden:false,children:[],textContent:'',setAttribute(k,v){this[k]=v;},prepend(li){this.children.unshift(li);},get lastChild(){return {remove:()=>this.children.pop()};}});return elements.get(id);};
  const spoken=[],listeners={};let cancelled=0;
  const synth={getVoices:()=>[],speak:u=>spoken.push(u),cancel:()=>cancelled++};
  class Recognition{start(){}abort(){this.aborted=true;}result(text){this.onresult({resultIndex:0,results:[{0:{transcript:text},isFinal:true}]});}}
  const sim=make(),selected=sim.cars[0];
  const doc={hidden:false,getElementById:element,createElement:()=>({}),querySelector:()=>({addEventListener:()=>{}}),querySelectorAll:()=>[],addEventListener:(k,v)=>listeners[k]=v};
  const window={SpeechRecognition:Recognition,speechSynthesis:synth,SpeechSynthesisUtterance:class{},addEventListener:()=>{}};
  const context=vm.createContext({window,document:doc,speechSynthesis:synth,SpeechSynthesisUtterance:window.SpeechSynthesisUtterance,TeamRadio,grandPrix:sim,broadcast:{selected:()=>selected}});
  vm.runInContext(readFileSync(new URL('../gp/radio-ui.js',import.meta.url),'utf8')+'\nglobalThis.UI=RaceRadioUI;',context);
  const ui=new context.UI();element('radio-scope').value='car';element('radio-tyres').value='M';element('radio-duration').value='30';return {ui,sim,element,spoken,Recognition,get cancelled(){return cancelled;}};
}
test('voice result only proposes; stop ignores late transcripts; edits invalidate confirmation',()=>{
  const h=uiHarness();h.ui.startMic(h.Recognition);const recognition=h.ui.recognition;recognition.result('Box on soft');
  assert.equal(h.sim.cars[0].pitRequested,false);assert.ok(h.ui.radio.pending);h.element('radio-form').oninput();assert.equal(h.ui.radio.pending,null);
  h.ui.stopMic();recognition.result('Attack');assert.equal(h.ui.radio.pending,null);assert.ok(recognition.aborted);
});
test('speech requires opt-in, bounded queue, and cancellation blocks stale callbacks',()=>{
  const h=uiHarness();h.ui.say('muted');assert.equal(h.spoken.length,0);h.ui.enabled=true;
  h.ui.say('first');for(let i=0;i<20;i++)h.ui.say(String(i));assert.equal(h.ui.queue.length,3);assert.equal(h.spoken.length,1);
  h.ui.silence();h.spoken[0].onend();assert.equal(h.spoken.length,1);assert.equal(h.ui.queue.length,0);assert.ok(h.cancelled);
  h.ui.startMic(h.Recognition);h.ui.say('no echo');assert.equal(h.spoken.length,1);
});
test('urgent radio interrupts routine speech, preserves urgent order and expires stale chatter',()=>{
  const h=uiHarness();h.ui.enabled=true;h.ui.say('routine');h.ui.say('yellow flag',2);assert.equal(h.spoken.length,2);h.ui.say('box box',2);assert.equal(h.ui.queue.length,1);
  h.spoken[1].onend();assert.equal(h.spoken.length,3);h.ui.say('old chatter');h.ui.queue[0].at=Date.now()-7000;h.spoken[2].onend();assert.equal(h.spoken.length,3);assert.equal(h.ui.queue.length,0);
});
