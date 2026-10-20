document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('garage-form'),select=document.getElementById('garage-circuit');
  for(const c of F1_CIRCUITS){const option=document.createElement('option');option.value=c.id;option.textContent=`${c.location} — ${c.name}`;select.append(option);}
  let config={circuit:'it-1922',format:'race',formation:false};
  try{config={...config,...JSON.parse(localStorage.getItem('apex-garage')||'{}')};}catch{}
  for(const [key,value] of Object.entries(config)){const field=form.elements.namedItem(key);if(field){if(field.type==='checkbox')field.checked=!!value;else field.value=value;}}
  let bank=typeof APEX_DRIVER_MODELS==='undefined'?[]:APEX_DRIVER_MODELS.models;const modelStates=new Map();
  const roster=document.getElementById('garage-roster');
  GP.names.forEach((name,id)=>{
    const model=bank.find(m=>m.driverId===id),row=document.createElement('button');row.type='button';row.className='garage-driver';row.setAttribute('aria-label',`Afficher la monoplace de ${name}`);row.onclick=()=>{const preview=document.getElementById('preview-driver');preview.value=id;preview.dispatchEvent(new Event('change'));document.getElementById('garage-3d').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};row.style.setProperty('--team',GP.teams[Math.floor(id/2)][2]);
    const number=document.createElement('span');number.className='driver-number';number.textContent=GP.numbers[id];
    const info=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=name;detail.textContent=`${GP.teams[Math.floor(id/2)][0]} · ${GP.styles[id][0]}`;info.append(title,detail);
    const state=document.createElement('div');state.className='model-state';const label=document.createElement('b'),meta=document.createElement('span');
    label.textContent=model?`Modèle indépendant · G${model.metadata.generation}`:'Modèle à entraîner';meta.textContent=model?`${model.metadata.device.toUpperCase()} · ${model.metadata.epochs} étapes initiales`:'Ouvrir Entraînement';state.title=model?.metadata.modelId||'';state.append(label,meta);row.append(number,info,state);roster.append(row);
    modelStates.set(id,{label,meta,state});
  });
  form.onsubmit=event=>{
    event.preventDefault();const data=new FormData(form),options={};
    for(const [name,value] of data)options[name]=['laps','drivers','incidents','wear','seed','sessionScale'].includes(name)?Number(value):value;
    options.formation=data.has('formation');options.officialDistance=data.has('officialDistance');options.policy='neural';localStorage.setItem('apex-garage',JSON.stringify(options));location.href='apex-lab.html';
  };
  const preview=document.getElementById('preview-driver');
  preview.addEventListener('change',()=>{if(typeof PlatformState!=='undefined')PlatformState.select(Number(preview.value));});
  if(typeof PlatformState!=='undefined'){preview.value=PlatformState.requested(location.search)??PlatformState.selected();preview.dispatchEvent(new Event('change'));}
  const refreshModels=async()=>{const status=document.getElementById('garage-model-status');try{bank=await ModelRepository.refresh();for(const [id,ui] of modelStates){const model=bank.find(m=>m.driverId===id);ui.label.textContent=model?`Modèle indépendant · G${model.metadata.generation}`:'Modèle à entraîner';ui.meta.textContent=model?`${model.metadata.device.toUpperCase()} · ${model.metadata.epochs} étapes initiales`:'Ouvrir Entraînement';ui.state.title=model?.metadata.modelId||'';}status.textContent='Modèles sauvegardés chargés. La prochaine course utilisera ces versions.';}catch(error){status.textContent=error.message;}};
  document.getElementById('refresh-garage-models').onclick=refreshModels;refreshModels();
});
