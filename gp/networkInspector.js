// Interface diagnostics only. Never changes a network or starts inference/training.
class NeuralNetworkPanel {
  static describe(record){
    if(!record)return null;
    const {inputs:i,hidden:h,outputs:o}=record;
    if(![i,h,o].every(n=>Number.isInteger(n)&&n>0&&n<=256))return null;
    const dimensions={w1:i*h,b1:h,w2:h*o,b2:o};
    if(Object.entries(dimensions).some(([key,n])=>!Array.isArray(record[key])||record[key].length!==n||!record[key].every(Number.isFinite)))return null;
    return {sizes:[i,h,o],neurons:i+h+o,connections:i*h+h*o,parameters:i*h+h+h*o+o};
  }
  static layout(info,width=760,height=480){
    const layers=info.sizes.map((count,layer)=>Array.from({length:count},(_,index)=>({layer,index,x:80+layer*(width-160)/2,y:count===1?height/2:44+index*(height-88)/(count-1)})));
    const links=[];for(let l=0;l<layers.length-1;l++)for(const a of layers[l])for(const b of layers[l+1])links.push([a,b]);
    return {layers,links};
  }
  static activity(frame,driverId,info){
    if(!frame||!Number.isInteger(frame.driverId)||frame.driverId<0||frame.driverId!==Number(driverId)||!frame.neural)return null;
    const arrays=['inputs','hidden','outputs'].map(k=>frame.neural[k]);
    if(arrays.some((a,i)=>!Array.isArray(a)||a.length!==info.sizes[i]||a.some(v=>!Number.isFinite(v)||v<0||v>1)))return null;
    return arrays;
  }
  static label(layer,index){
    const inputs=['Rayon −150°','Rayon −90°','Rayon −55°','Rayon −30°','Rayon −15°','Rayon 0°','Rayon 15°','Rayon 30°','Rayon 55°','Rayon 90°','Rayon 150°','Rayon 180°','Vitesse','Adhérence','Vitesse de rapprochement','Trafic à gauche','Trafic à droite','Position latérale demandée'];
    return layer===0?inputs[index]||`Entrée ${index+1}`:layer===1?`Neurone caché ${index+1}`:['Direction','Vitesse désirée'][index]||`Sortie ${index+1}`;
  }
  constructor(){
    this.get=id=>document.getElementById(id);this.canvas=this.get('network-canvas');this.context=this.canvas.getContext('2d');
    this.layer=this.get('network-layer');this.neuron=this.get('network-neuron');
    this.layer.onchange=()=>{this.neuron.value=1;this.draw();};this.neuron.oninput=()=>this.draw();
    this.canvas.onpointermove=e=>{if(!this.graph)return;const rect=this.canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*760/rect.width,y=(e.clientY-rect.top)*480/rect.height;const node=this.graph.layers.flat().find(n=>Math.hypot(n.x-x,n.y-y)<9);if(node){this.layer.value=String(node.layer);this.neuron.max=this.info.sizes[node.layer];this.neuron.value=node.index+1;this.draw();}};
    this.table=this.get('network-roster');
    const bank=typeof APEX_DRIVER_MODELS==='undefined'?[]:APEX_DRIVER_MODELS.models;
    this.bank=bank;this.get('network-bank-count').textContent=`${bank.length} réseaux indépendants enregistrés`;
    for(const record of bank){const info=NeuralNetworkPanel.describe(record);if(!info)continue;const row=document.createElement('tr');row.dataset.driver=record.driverId;
      for(const value of [record.name,info.sizes.join(' → '),info.neurons,info.parameters]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}this.table.append(row);}
    this.update(0,null);
  }
  update(driverId,frame){
    this.driverId=Number(driverId);this.record=this.bank.find(r=>r.driverId===this.driverId);this.info=NeuralNetworkPanel.describe(this.record);
    if(!this.info){this.get('network-source').textContent='Modèle indisponible ou incompatible pour ce pilote.';this.context.clearRect(0,0,this.canvas.width,this.canvas.height);return;}
    this.frame=frame;this.values=NeuralNetworkPanel.activity(frame,this.driverId,this.info);
    this.get('network-name').textContent=this.record.name;
    this.get('network-neurons').textContent=this.info.neurons;this.get('network-connections').textContent=this.info.connections;this.get('network-parameters').textContent=this.info.parameters;
    this.get('network-source').textContent=this.values?`Activations CUDA du candidat en tête · tick ${frame.tick} / ${frame.steps}. Valeurs normalisées de 0 à 1.`:'Structure du modèle enregistré. Aucune activation CUDA disponible pour ce pilote ; les neurones restent neutres.';
    [...this.layer.options].forEach((option,i)=>option.textContent=`${['Entrées','Couche cachée','Sorties'][i]} · ${this.info.sizes[i]} neurones`);
    for(const row of this.table.children)row.classList.toggle('observed',Number(row.dataset.driver)===this.driverId);
    this.draw();
  }
  draw(){
    if(!this.info)return;
    const layer=Number(this.layer.value)||0;this.neuron.max=this.info.sizes[layer];let index=Math.max(0,Math.min(this.info.sizes[layer]-1,Number(this.neuron.value)-1||0));this.neuron.value=index+1;
    const ratio=Math.min(2,window.devicePixelRatio||1);this.canvas.width=760*ratio;this.canvas.height=480*ratio;const g=this.context;g.setTransform(ratio,0,0,ratio,0,0);g.clearRect(0,0,760,480);
    this.graph=NeuralNetworkPanel.layout(this.info);g.strokeStyle='#8a9aaa22';g.lineWidth=.6;g.beginPath();
    for(const [a,b] of this.graph.links){g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);}g.stroke();
    g.strokeStyle='#dcecff80';g.lineWidth=1;g.beginPath();for(const [a,b] of this.graph.links)if(a.layer===layer&&a.index===index||b.layer===layer&&b.index===index){g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);}g.stroke();
    const colors=['#80cfd3','#94baff','#f3c477'];
    for(const nodes of this.graph.layers)for(const n of nodes){const selected=n.layer===layer&&n.index===index,value=this.values?.[n.layer][n.index];g.globalAlpha=value===undefined?.45:.25+value*.75;g.fillStyle=colors[n.layer];g.beginPath();g.arc(n.x,n.y,n.layer===1?3.7:6,0,Math.PI*2);g.fill();if(selected){g.globalAlpha=1;g.strokeStyle='#ffffff';g.lineWidth=1.6;g.beginPath();g.arc(n.x,n.y,8,0,Math.PI*2);g.stroke();}}
    g.globalAlpha=1;g.fillStyle='#d7e0ea';g.font='14px Barlow, sans-serif';g.textAlign='center';for(let l=0;l<3;l++)g.fillText(`${['Entrées','Couche cachée','Sorties'][l]} · ${this.info.sizes[l]}`,this.graph.layers[l][0].x,23);
    const value=this.values?.[layer][index];this.get('network-neuron-detail').textContent=`${NeuralNetworkPanel.label(layer,index)} · ${index+1} / ${this.info.sizes[layer]} · activation ${value===undefined?'indisponible':value.toFixed(4)}`;
    this.canvas.setAttribute('aria-label',`${this.record.name} : ${this.info.sizes.join(', ')} neurones par couche, ${this.info.neurons} au total, ${this.info.parameters} paramètres. ${this.values?'Activations CUDA reçues.':'Structure seule.'}`);
  }
}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{window.trainingNetwork=new NeuralNetworkPanel();});
