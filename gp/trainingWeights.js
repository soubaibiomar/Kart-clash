class TrainingWeights {
  static score=['progress','survival','offtrack','smoothness','speed'];
  static behavior=['separation','avoidance','borders'];
  static labels={progress:'Progression',survival:'Survie sur la piste',offtrack:'Pénalité de sortie',smoothness:'Régularité des commandes',speed:'Vitesse',separation:'Séparation du trafic',avoidance:'Évitement du trafic',borders:'Éloignement des bordures'};
  static defaults(objective='balanced'){
    const presets={balanced:{progress:1,survival:.08,offtrack:.12,smoothness:.04,speed:0},safe:{progress:.8,survival:.25,offtrack:.4,smoothness:.1,speed:0},pace:{progress:1.25,survival:.06,offtrack:.16,smoothness:.03,speed:.05}};
    if(!presets[objective])throw new Error('Objectif inconnu');
    return {...presets[objective],separation:.45,avoidance:1.6,borders:.8};
  }
  static validate(values){
    const keys=[...this.score,...this.behavior];
    if(!values||Object.keys(values).length!==keys.length)throw new Error('Réglages des poids incomplets.');
    const copy={};for(const key of keys){const v=values[key],max=this.behavior.includes(key)?5:3;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw new Error(`Poids invalide : ${this.labels[key]}.`);copy[key]=v;}
    if(!this.score.some(k=>copy[k]>0))throw new Error('Garde au moins un poids de score supérieur à zéro.');
    return copy;
  }
  static read(){return this.validate(Object.fromEntries([...this.score,...this.behavior].map(k=>[k,Number(document.getElementById('training-weight-'+k).value)])));}
  static render(objective){
    const values=this.defaults(objective);
    for(const [id,keys] of [['score-weights',this.score],['behavior-weights',this.behavior]]){
      const host=document.getElementById(id);host.replaceChildren();
      for(const key of keys){const label=document.createElement('label'),name=document.createElement('span'),output=document.createElement('output'),slider=document.createElement('input');
        name.textContent=this.labels[key];slider.type='range';slider.id='training-weight-'+key;slider.min=0;slider.max=this.behavior.includes(key)?5:3;slider.step=.01;slider.value=values[key];
        slider.setAttribute('aria-label',this.labels[key]);output.setAttribute('for',slider.id);output.textContent=values[key].toFixed(2);slider.oninput=()=>output.textContent=Number(slider.value).toFixed(2);
        label.append(name,output,slider);host.append(label);
      }
    }
  }
  static summary(values){return [...this.score,...this.behavior].filter(k=>Number.isFinite(values?.[k])).map(k=>`${this.labels[k]} ${values[k].toFixed(2)}`).join(' · ');}
}
