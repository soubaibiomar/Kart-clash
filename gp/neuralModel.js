// An independent two-layer sigmoid model per driver, as in example 9.
// CUDA training exports these tensors; browser inference has no network dependency.
class DriverNeuralModel {
  static INPUTS=18;
  static HIDDEN=36;
  static TURN=1.2;
  constructor(record){
    if(!record||record.schema!=='apex-driver-v1'||record.inputs!==18||record.hidden!==36||record.outputs!==2)throw new Error('Incompatible driver model');
    for(const [key,length] of [['w1',648],['b1',36],['w2',72],['b2',2]]){
      if(!Array.isArray(record[key])||record[key].length!==length||record[key].some(v=>!Number.isFinite(v)))throw new Error(`Invalid model tensor: ${key}`);
      this[key]=Float32Array.from(record[key]);
    }
    this.driverId=record.driverId;this.metadata={...record.metadata};this.hidden=new Float32Array(36);this.activations=new Float32Array(2);
  }
  static inputs(car){
    if(!car.sensors)throw new Error('Neural driving requires a sensor snapshot');
    return [...car.sensors.rays.map(r=>r.kind==='clear'?1:GP.clamp(r.distance/500,0,1)),
      GP.clamp(car.vel.mag()/9,0,1),GP.clamp(car.tires.grip/1.15,0,1),GP.clamp(car.sensors.closing/9,0,1),
      Number(car.sensors.leftOccupied),Number(car.sensors.rightOccupied),GP.clamp(.5+car.desiredLane/(car.track.radius*2),0,1)];
  }
  predict(inputs){
    if(inputs.length!==18||inputs.some(v=>!Number.isFinite(v)))throw new Error('Invalid neural observations');
    const sigmoid=x=>1/(1+Math.exp(-Math.max(-60,Math.min(60,x))));
    for(let h=0;h<36;h++){let sum=this.b1[h];for(let i=0;i<18;i++)sum+=inputs[i]*this.w1[i*36+h];this.hidden[h]=sigmoid(sum);}
    for(let o=0;o<2;o++){let sum=this.b2[o];for(let h=0;h<36;h++)sum+=this.hidden[h]*this.w2[h*2+o];this.activations[o]=sigmoid(sum);}
    return Array.from(this.activations);
  }
  static forDriver(id){
    const bank=typeof APEX_DRIVER_MODELS==='undefined'?null:APEX_DRIVER_MODELS;
    const record=bank?.models.find(m=>m.driverId===id);
    if(!record)throw new Error(`No trained neural model for driver ${id}. Open Training to create it.`);
    return new DriverNeuralModel(record);
  }
}
