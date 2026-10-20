// Small shared workspace; only user choices, never live physics or model weights.
class PlatformState {
  static driver(value){return (typeof value==='number'||typeof value==='string'&&/^\d{1,2}$/.test(value))&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<22?Number(value):null;}
  static read(key,storage=localStorage){try{const value=JSON.parse(storage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
  static selected(storage=localStorage){return this.driver(this.read('apex-selection',storage).driverId)??0;}
  static select(value,storage=localStorage){const id=this.driver(value);if(id===null)throw new Error('Invalid driver');try{storage.setItem('apex-selection',JSON.stringify({driverId:id}));}catch{}if(typeof window!=='undefined')window.dispatchEvent(new Event('apexselection'));return id;}
  static requested(search){const value=new URLSearchParams(search).get('driver');return value!==null&&/^\d{1,2}$/.test(value)?this.driver(value):null;}
  static training(storage=localStorage){try{return this.normalizeTraining(this.read('apex-training',storage));}catch{return {};}}
  static saveTraining(draft,storage=localStorage){
    const copy=this.normalizeTraining(draft);try{storage.setItem('apex-training',JSON.stringify(copy));}catch{}return copy;
  }
  static normalizeTraining(draft){
    const copy={};for(const [key,min,max] of [['epochs',0,10000],['population',4,128],['generations',1,10000],['steps',120,3600],['seed',1,4294967295]]){const n=draft[key];if(!Number.isInteger(n)||n<min||n>max)throw new Error('Invalid training draft');copy[key]=n;}
    if(!['balanced','safe','pace'].includes(draft.objective))throw new Error('Invalid objective');copy.objective=draft.objective;copy.resume=!!draft.resume;
    if(!Array.isArray(draft.drivers)||!draft.drivers.length||draft.drivers.some(id=>!Number.isInteger(id)||this.driver(id)===null))throw new Error('Invalid drivers');copy.drivers=[...new Set(draft.drivers)];
    copy.weights=TrainingWeights.validate(draft.weights);
    if(Array.isArray(draft.circuits))copy.circuits=draft.circuits.filter(id=>typeof id==='string'&&id.length<80);
    return copy;
  }
}
