document.addEventListener('DOMContentLoaded',()=>{
  if(typeof TrainingWeights==='undefined'||typeof TrainingPresentation==='undefined'||typeof GP==='undefined'){
    document.getElementById('device-name').textContent='Page à actualiser';
    const explanation='Un fichier de l’interface n’a pas été chargé. Actualise cette page avec Ctrl + F5 pour récupérer la version complète.';
    document.getElementById('device-detail').textContent=explanation;
    document.getElementById('training-message').textContent=explanation;
    document.getElementById('train-start').disabled=true;
    document.getElementById('train-stop').disabled=true;
    return;
  }
  const form=document.getElementById('training-form'),message=document.getElementById('training-message'),start=document.getElementById('train-start'),stop=document.getElementById('train-stop');
  const preview=document.getElementById('training-preview').getContext('2d');preview.fillStyle='#182522';preview.fillRect(0,0,700,340);preview.fillStyle='#b9c5d0';preview.font='16px Barlow';preview.fillText('La population GPU apparaît après le lancement.',38,170);
  const selection=document.getElementById('training-drivers');let gpuReady=false,busy=false,lastReport='',refreshing=false,stopPending=false,lastStatus={},actionError='',circuitsReady=false,weightsSupported=false,deviceChecking=false,deviceRetryTicks=0;
  const objectiveControl=form.elements.namedItem('objective');
  TrainingWeights.render(objectiveControl.value);
  objectiveControl.onchange=()=>TrainingWeights.render(objectiveControl.value);
  document.getElementById('reset-training-weights').onclick=()=>{TrainingWeights.render(objectiveControl.value);form.dispatchEvent(new Event('change'));};
  GP.names.forEach((name,id)=>{const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.name='driver';check.value=id;check.checked=true;label.append(check,document.createTextNode(name));selection.append(label);});
  const observer=document.getElementById('observed-driver');GP.names.forEach((name,id)=>{const option=document.createElement('option');option.value=id;option.textContent=name;observer.append(option);});
  const draft=typeof PlatformState!=='undefined'?PlatformState.training():{};
  for(const key of ['epochs','population','generations','steps','seed','objective'])if(draft[key]!==undefined){const field=form.elements.namedItem(key);if(field)field.value=draft[key];}
  if(draft.resume!==undefined)form.elements.namedItem('resume').checked=draft.resume;
  TrainingWeights.render(objectiveControl.value);
  if(draft.weights)for(const key of [...TrainingWeights.score,...TrainingWeights.behavior]){const input=document.getElementById('training-weight-'+key);input.value=draft.weights[key];input.oninput();}
  if(typeof PlatformState!=='undefined'){
    const requested=PlatformState.requested(location.search),ids=requested!==null?[requested]:draft.drivers;
    if(Array.isArray(ids))selection.querySelectorAll('input').forEach(input=>input.checked=ids.includes(Number(input.value)));
    observer.value=requested??PlatformState.selected();PlatformState.select(observer.value);
  }
  const redraw=()=>{drawHistory(lastStatus.history);drawPreview(TrainingPresentation.preview(lastStatus.preview,observer.value));};observer.onchange=()=>{if(typeof PlatformState!=='undefined')PlatformState.select(observer.value);redraw();};document.getElementById('training-metric').onchange=redraw;document.getElementById('inspect-sensors').onchange=redraw;
  if(typeof window!=='undefined')window.addEventListener('training3dready',redraw);
  const selectedCount=()=>selection.querySelectorAll('input:checked').length;
  const updateSelection=()=>{const count=selectedCount();document.getElementById('training-selected-count').textContent=`${count} sélectionnés`;const all=document.getElementById('all-drivers');all.checked=count===GP.names.length;all.indeterminate=count>0&&count<GP.names.length;};
  document.getElementById('all-drivers').onchange=event=>{selection.querySelectorAll('input').forEach(c=>c.checked=event.target.checked);updateSelection();};
  selection.addEventListener('change',updateSelection);
  updateSelection();
  const saveDraft=()=>{if(busy||typeof PlatformState==='undefined')return;try{const data=new FormData(form),values={};for(const key of ['epochs','population','generations','steps','seed'])values[key]=Number(data.get(key));values.objective=data.get('objective');values.resume=data.has('resume');values.drivers=data.getAll('driver').map(Number);values.weights=TrainingWeights.read();if(circuitsReady)values.circuits=data.getAll('circuit');else if(draft.circuits)values.circuits=draft.circuits;PlatformState.saveTraining(values);}catch{}};
  form.addEventListener('input',saveDraft);form.addEventListener('change',saveDraft);
  document.getElementById('training-driver-search').oninput=event=>{const q=event.target.value.trim().toLowerCase();selection.querySelectorAll('label').forEach(label=>label.hidden=!label.textContent.toLowerCase().includes(q));};
  document.querySelectorAll('[data-training-view]').forEach(button=>button.onclick=()=>{document.querySelector('.training-workspace').dataset.view=button.dataset.trainingView;document.querySelectorAll('[data-training-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  async function api(path,options={}){
    if(location.protocol==='file:')throw new Error('Ouvre http://127.0.0.1:8765/training.html après avoir lancé gp/training/start.ps1. L’entraînement CUDA nécessite le service local.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const serviceBase=document.querySelector('meta[name="training-api"]')?.content||'';
      const response=await fetch(serviceBase+path,{...options,signal:controller.signal});
      const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
      if(type!=='application/json'&&!type.endsWith('+json'))throw new Error('Cette adresse sert une page web au lieu du service CUDA. Lance gp/training/start.ps1 et ouvre http://127.0.0.1:8765/training.html.');
      let data;try{data=await response.json();}catch{throw new Error('Réponse du service local illisible. Reconnexion automatique en cours.');}
      if(!response.ok)throw new Error(data?.error||`Erreur du service local (${response.status}).`);return data;
    }catch(error){
      if(error.name==='AbortError')throw new Error('Le service local met trop de temps à répondre. Reconnexion automatique en cours.');
      if(error instanceof TypeError)throw new Error('Service local inaccessible. Lance gp/training/start.ps1 ; la page se reconnectera automatiquement.');
      throw error;
    }
    finally{clearTimeout(timer);}
  }
  function drawHistory(history){
    const metric=document.getElementById('training-metric').value,samples=TrainingPresentation.series(history,observer.value,metric),svg=document.getElementById('training-chart');svg.replaceChildren();
    const node=(name,attrs,text)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text)el.textContent=text;svg.append(el);};
    const note=document.getElementById('training-series-note');note.textContent=samples[0]?.cohort||'Validation par pilote sur des observations réservées. Les anciens relevés agrégés ne sont pas attribués à un pilote.';
    if(samples.length<2){node('text',{x:30,y:120,fill:'#bbc7d1','font-size':15},samples.length?'Une mesure disponible ; la suivante tracera la courbe.':'Aucune série individuelle disponible pour ce pilote.');return;}
    const ys=samples.map(p=>p.y),low=Math.min(...ys),high=Math.max(...ys),x0=samples[0].x,x1=samples.at(-1).x;
    const points=samples.map(p=>`${40+(p.x-x0)/Math.max(1,x1-x0)*630},${205-(p.y-low)/Math.max(.00001,high-low)*165}`).join(' ');
    node('line',{x1:40,y1:205,x2:670,y2:205,stroke:'#73808b'});node('polyline',{points,fill:'none',stroke:'#f15a60','stroke-width':2.5});
    node('text',{x:40,y:235,fill:'#bbc7d1','font-size':13},`${metric==='loss'?'Époque':'Génération'} ${x0} → ${x1}`);node('text',{x:40,y:24,fill:'#bbc7d1','font-size':13},`${low.toFixed(5)} – ${high.toFixed(5)}`);
  }
  function drawPreview(frame){
    if(typeof window!=='undefined'&&window.trainingNetwork)window.trainingNetwork.update(observer.value,frame);
    if(typeof window!=='undefined'&&window.training3D)window.training3D.draw(frame,document.getElementById('inspect-sensors').checked);
    if(!frame?.positions||!frame.points?.length){preview.fillStyle='#182522';preview.fillRect(0,0,700,340);preview.fillStyle='#b9c5d0';preview.fillText('Aucun relevé GPU pour le pilote sélectionné.',28,170);document.getElementById('preview-note').textContent='Les positions apparaîtront pendant une évaluation de ce pilote.';return;}
    const canvas=document.getElementById('training-preview'),g=canvas.getContext('2d');
    const xs=frame.points.map(p=>p[0]),ys=frame.points.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys);
    const spanX=Math.max(...xs)-minX,spanY=Math.max(...ys)-minY,scale=Math.min(640/spanX,280/spanY),ox=(700-spanX*scale)/2,oy=(340-spanY*scale)/2;
    const project=p=>[ox+(p[0]-minX)*scale,oy+(p[1]-minY)*scale];
    g.fillStyle='#182522';g.fillRect(0,0,700,340);g.strokeStyle='#5c6768';g.lineWidth=frame.radius*2*scale;g.lineJoin='round';g.beginPath();frame.points.forEach((p,i)=>{const [x,y]=project(p);if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.closePath();g.stroke();
    if(document.getElementById('inspect-sensors').checked&&frame.rays&&frame.rayOrigin){const origin=project(frame.rayOrigin),angles=[-150,-90,-55,-30,-15,0,15,30,55,90,150,180];frame.rays.forEach((value,i)=>{const angle=frame.rayHeading+angles[i]*Math.PI/180,distance=Math.min(220,value*500),end=project([frame.rayOrigin[0]+Math.cos(angle)*distance,frame.rayOrigin[1]+Math.sin(angle)*distance]);g.strokeStyle=value<1?'#ffc97a':'#9fdcc055';g.lineWidth=1;g.beginPath();g.moveTo(...origin);g.lineTo(...end);g.stroke();});}
    frame.positions.forEach((p,i)=>{const [x,y]=project(p);g.save();g.translate(x,y);g.rotate(frame.heading[i]);g.fillStyle=frame.alive[i]?'#f15a60':'#7e8a94';g.fillRect(-4,-2,8,4);if(i===frame.leader){g.strokeStyle='#fff0b8';g.lineWidth=1.5;g.strokeRect(-6,-4,12,8);}g.restore();});
    for(const p of frame.traffic||[]){const [x,y]=project(p);g.fillStyle='#f3c571';g.fillRect(x-4,y-3,8,6);}
    document.getElementById('preview-note').textContent=`${GP.names[frame.driverId]} · ${frame.positions.length} candidats · tick GPU ${frame.tick} / ${frame.steps}. Positions issues du calcul ; candidats gris = sortie de piste.`;
  }
  async function refresh(){
    if(refreshing)return;refreshing=true;
    try{
      const status=await api('/api/status');lastStatus=status;const ids=status.driverIds||[];[...observer.options].forEach(o=>o.disabled=ids.length>0&&!ids.includes(Number(o.value)));if(ids.length&&!ids.includes(Number(observer.value)))observer.value=ids[0];const presentation=TrainingPresentation.describe(status,selectedCount());document.querySelector('.training-overview').dataset.state=status.status;
      document.getElementById('training-weights-active').textContent=status.weights?'Poids du dernier calcul : '+TrainingWeights.summary(status.weights):'Les nouveaux poids seront enregistrés au prochain lancement.';
      document.getElementById('training-state-title').textContent=presentation.title;document.getElementById('training-progress-label').textContent=presentation.stage;document.getElementById('training-progress').value=presentation.progress;
      document.getElementById('training-count').textContent=presentation.drivers;document.getElementById('training-elapsed').textContent=presentation.duration;document.getElementById('training-memory').textContent=presentation.memory;
      busy=status.status==='running';start.disabled=!gpuReady||busy||!weightsSupported;if(!busy)stopPending=false;stop.disabled=!busy||stopPending;
      for(const id of ['score-weights','behavior-weights','reset-training-weights'])document.getElementById(id).disabled=busy;
      objectiveControl.disabled=busy;
      if(status.status==='error'){message.textContent=status.error==='Training process exited. See the local training log.'?'Le dernier calcul s’est interrompu. Les modèles sauvegardés sont conservés ; tu peux les reprendre.':status.error;message.classList.add('error-message');}
      else if(status.status==='running'){message.classList.remove('error-message');message.textContent=stopPending?'Arrêt demandé ; le calcul termine son étape en cours.':status.phase==='starting'?'Préparation du calcul sur la RTX 4060…':status.phase==='warmstart'?`Initialisation GPU : ${status.epoch||0} / ${status.epochs||0}. Modèles indépendants : ${status.driverIds.length}.`:`Sélection et mutations : génération ${status.generation} / ${status.generations} · ${status.circuit}.`;}
      else if(status.status==='completed'){message.classList.remove('error-message');message.textContent=`Entraînement terminé sur ${status.gpu}. ${status.models} modèles exportés ; ouvre le garage pour les utiliser.`;}
      else if(status.status==='interrupted'){message.classList.remove('error-message');message.textContent='Session précédente interrompue. Tu peux reprendre les modèles.';}
      else if(status.status==='stopped'){message.classList.remove('error-message');message.textContent='Entraînement arrêté. Les derniers modèles exportés sont conservés.';}
      else if(status.status==='idle'&&gpuReady){message.classList.remove('error-message');message.textContent='Service connecté. Configure le calcul puis lance-le sur le GPU.';}
      if(!weightsSupported&&gpuReady){message.textContent='Le service doit être relancé pour prendre en charge les curseurs de poids. Aucun calcul ne sera lancé avec des réglages ignorés.';message.classList.add('error-message');}
      if(actionError){message.textContent=actionError;message.classList.add('error-message');}
      redraw();
      document.getElementById('training-phase').textContent=status.phase==='evolution'?'Sélection et mutations sur GPU':status.phase==='warmstart'?'Initialisation par imitation':'Progression réelle';
      const key=`${status.phase}:${status.epoch}:${status.generation}`;
      if(busy&&key!==lastReport){lastReport=key;const row=document.createElement('div'),time=document.createElement('time'),text=document.createElement('span');time.textContent=`${Math.round(status.elapsed||0)} s`;text.textContent=`${status.phase==='warmstart'?'Imitation '+status.epoch:'Génération '+status.generation} · CUDA · ${status.allocatedMB||0} Mo alloués`;row.append(time,text);document.getElementById('training-log').prepend(row);while(document.getElementById('training-log').children.length>120)document.getElementById('training-log').lastChild.remove();}
    }catch(error){gpuReady=false;document.getElementById('device-light').classList.remove('ready');message.textContent=error.message;message.classList.add('error-message');start.disabled=true;}finally{refreshing=false;}
  }
  form.onsubmit=async event=>{
    event.preventDefault();actionError='';if(!weightsSupported){message.textContent='Relance le service local pour activer les poids personnalisés.';return;}const data=new FormData(form),options={};try{options.weights=TrainingWeights.read();}catch(error){message.textContent=error.message;message.classList.add('error-message');return;}for(const key of ['epochs','population','generations','steps','seed'])options[key]=Number(data.get(key));options.drivers=data.getAll('driver').map(Number);options.resume=data.has('resume');options.objective=data.get('objective');if(circuitsReady){options.circuits=data.getAll('circuit');if(!options.circuits.length){message.textContent='Sélectionne au moins un circuit d’évaluation.';return;}}stopPending=false;
    if(!options.drivers.length){message.textContent='Sélectionne au moins un pilote.';return;}
    if(typeof PlatformState!=='undefined')PlatformState.saveTraining(options);
    try{start.disabled=true;message.textContent='Démarrage du calcul CUDA…';await api('/api/train',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(options)});await refresh();}catch(error){actionError=error.message;message.textContent=actionError;message.classList.add('error-message');start.disabled=!gpuReady;}
  };
  stop.onclick=async()=>{actionError='';stopPending=true;stop.disabled=true;try{await api('/api/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});message.textContent='Arrêt demandé à la prochaine étape sûre.';}catch(error){stopPending=false;actionError=error.message;await refresh();message.textContent=actionError;message.classList.add('error-message');}};
  async function loadCircuits(){
    try{const options=await api('/api/training-options'),host=document.getElementById('training-circuits');weightsSupported=options.weightControls===1;host.replaceChildren();const garage=typeof PlatformState!=='undefined'?PlatformState.read('apex-garage'):{};const available=(options.circuits||[]).map(c=>c.id),restored=(draft.circuits||[]).filter(id=>available.includes(id));const preferred=restored.length?restored:(options.circuits||[]).some(c=>c.id===garage.circuit)?[garage.circuit]:null;for(const circuit of options.circuits||[]){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.name='circuit';check.value=circuit.id;check.checked=preferred?preferred.includes(circuit.id):true;label.append(check,document.createTextNode(typeof F1_CIRCUITS!=='undefined'?F1_CIRCUITS.find(c=>c.id===circuit.id)?.location||circuit.name:circuit.name));host.append(label);}circuitsReady=true;}
    catch{document.getElementById('training-circuits').textContent='Circuits indisponibles ; nouvelle tentative à la reconnexion.';}
  }
  async function connectDevice(){
    if(deviceChecking)return;deviceChecking=true;
    try{
      const device=await api('/api/device');if(typeof device.cuda!=='boolean')throw new Error('Service CUDA incompatible. Relance gp/training/start.ps1.');
      gpuReady=device.cuda;document.getElementById('device-name').textContent=device.gpu||'CUDA indisponible';document.getElementById('device-detail').textContent=device.cuda?`${device.memoryGB} Go · CUDA · calcul GPU vérifié`:'Aucun entraînement CPU automatique.';document.getElementById('device-light').classList.toggle('ready',device.cuda);
      if(!circuitsReady||!weightsSupported)await loadCircuits();await refresh();
    }catch(error){gpuReady=false;start.disabled=true;document.getElementById('device-name').textContent='Connexion au service local';document.getElementById('device-detail').textContent=error.message;document.getElementById('device-light').classList.remove('ready');message.textContent=error.message;message.classList.add('error-message');}
    finally{deviceChecking=false;}
  }
  redraw();
  if(typeof ModelRepository!=='undefined')ModelRepository.refresh().then(records=>{if(window.trainingNetwork)window.trainingNetwork.bank=records;redraw();}).catch(()=>{document.getElementById('network-source').textContent='Modèles sauvegardés inaccessibles ; structure du dernier modèle embarqué affichée.';});
  connectDevice();
  setInterval(async()=>{if((!gpuReady||!circuitsReady||!weightsSupported)&&++deviceRetryTicks>=7){deviceRetryTicks=0;await connectDevice();}await refresh();},750);
});
