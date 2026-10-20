let grandPrix,broadcast,weekend;
let debug=false;
let modelLoadRevision=0;
function createGrandPrix(options={}){
  const finish=()=>{
  let saved={};try{saved=JSON.parse(localStorage.getItem('apex-garage')||'{}');}catch{}
  weekend=new RaceWeekend({format:'race',circuit:'it-1922',...saved,...options,policy:'neural'});
  try{localStorage.setItem('apex-garage',JSON.stringify(weekend.config));}catch{}
  mountSession();
  };
  if(typeof ModelRepository==='undefined'){finish();return;}
  const revision=++modelLoadRevision,previous=grandPrix,wasPaused=previous?.paused;if(previous)previous.paused=true;
  const controls=['start-race','take-control','restart-race','box-driver','configure'];for(const id of controls)document.getElementById(id).disabled=true;
  return ModelRepository.refresh().then(()=>{if(revision!==modelLoadRevision)return;finish();for(const id of controls)document.getElementById(id).disabled=false;broadcast.refresh();}).catch(error=>{if(revision!==modelLoadRevision)return;if(previous)previous.paused=wasPaused;document.getElementById('overlay-title').textContent='Modèles indisponibles';document.getElementById('overlay-detail').textContent=error.message+' Ouvre le garage pour actualiser les modèles.';if(previous)for(const id of controls)document.getElementById(id).disabled=false;});
}
function mountSession(){
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  if(broadcast)broadcast.renderer.destroy();
  document.getElementById('timing-list').replaceChildren();
  grandPrix=weekend.sim;broadcast=new GrandPrixBroadcast(grandPrix);if(typeof PlatformState!=='undefined'){const id=PlatformState.requested(location.search)??PlatformState.selected();if(grandPrix.cars.some(c=>c.driver.id===id))broadcast.selectedId=id;}broadcast.renderer.scale=Math.min(width/grandPrix.track.width,height/grandPrix.track.height)*.98;broadcast.refresh();
  broadcast.renderer.mode=document.getElementById('camera-mode').value;
  document.getElementById('incident-risk').value=grandPrix.config.incidents;
  document.getElementById('incident-value').value=`${grandPrix.config.incidents.toFixed(2)}×`;
  document.getElementById('sensor-range').value=grandPrix.config.sensorRange;
  document.getElementById('sensor-value').value=`${grandPrix.config.sensorRange} px`;
  document.getElementById('take-control').setAttribute('aria-pressed','false');
  broadcast.refresh();
}
function setup(){
  pixelDensity(Math.min(2,window.devicePixelRatio||1));const host=document.getElementById('gp-canvas');
  const canvas=createCanvas(host.clientWidth,host.clientHeight);canvas.parent(host);canvas.elt.tabIndex=0;canvas.elt.setAttribute('aria-label','Interactive Grand Prix circuit. Click a car to follow its driver.');
  const circuits=document.querySelector('[name="circuit"]');
  for(const c of F1_CIRCUITS){const option=document.createElement('option');option.value=c.id;option.textContent=`${c.location} · ${c.name}`;circuits.append(option);}circuits.value='it-1922';
  createGrandPrix();
  // CSS and dialog layout can settle after p5's initial setup.
  new ResizeObserver(()=>{if(host.clientWidth!==width||host.clientHeight!==height)resizeCanvas(host.clientWidth,host.clientHeight);}).observe(host);
  document.getElementById('start-race').onclick=()=>{if(grandPrix.phase==='GRID')grandPrix.start();else if(grandPrix.phase==='COMPLETE')createGrandPrix(weekend.config);else grandPrix.paused=!grandPrix.paused;broadcast.refresh();};
  document.getElementById('restart-race').onclick=()=>createGrandPrix(weekend.config);
  document.getElementById('configure').onclick=()=>{const form=document.getElementById('setup-form');for(const [name,value] of Object.entries(weekend.config)){const control=form.elements.namedItem(name);if(control){if(control.type==='checkbox')control.checked=!!value;else control.value=String(value);}}document.getElementById('setup-dialog').showModal();};
  document.getElementById('setup-form').onsubmit=event=>{
    event.preventDefault();const data=new FormData(event.currentTarget),config={};
    for(const [key,value] of data)config[key]=['drivers','laps','seed','wear','difficulty','incidents','sessionScale'].includes(key)?Number(value):value;
    config.formation=data.has('formation');config.officialDistance=data.has('officialDistance');document.getElementById('setup-dialog').close();createGrandPrix(config);
  };
  document.getElementById('camera-mode').onchange=event=>broadcast.renderer.mode=event.target.value;
  document.getElementById('open-log').onclick=()=>broadcast.showLog();document.getElementById('show-results').onclick=()=>broadcast.showResults();
  document.getElementById('box-driver').onclick=()=>{broadcast.selected().requestPit(document.getElementById('pit-compound').value,'engineer instruction',grandPrix);broadcast.refresh();};
  document.getElementById('deploy-sc').onclick=()=>grandPrix.director.neutralize('SC',18);document.getElementById('deploy-vsc').onclick=()=>grandPrix.director.neutralize('VSC',12);
  document.getElementById('next-session').onclick=()=>{if(weekend.next())mountSession();};
  document.getElementById('deploy-yellow').onclick=()=>{grandPrix.director.yellow();broadcast.refresh();};
  document.getElementById('deploy-red').onclick=()=>{grandPrix.director.redFlag();broadcast.refresh();};
  document.getElementById('resume-red').onclick=()=>{grandPrix.director.resumeRed();broadcast.refresh();};
  document.getElementById('incident-risk').oninput=e=>{grandPrix.config.incidents=Number(e.target.value);weekend.config.incidents=grandPrix.config.incidents;document.getElementById('incident-value').value=`${grandPrix.config.incidents.toFixed(2)}×`;};
  document.getElementById('sensor-range').oninput=e=>{grandPrix.config.sensorRange=Number(e.target.value);weekend.config.sensorRange=grandPrix.config.sensorRange;document.getElementById('sensor-value').value=`${grandPrix.config.sensorRange} px`;};
  document.getElementById('take-control').onclick=()=>{grandPrix.manual.enabled=!grandPrix.manual.enabled;grandPrix.manual.id=broadcast.selectedId;grandPrix.manual.clear();if(grandPrix.manual.enabled){document.getElementById('sim-speed').value='1';document.querySelector('#gp-canvas canvas:not(.race-3d)').focus();}broadcast.refresh();};
  window.addEventListener('blur',()=>grandPrix?.manual.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)grandPrix?.manual.clear();});
  document.addEventListener('keyup',event=>grandPrix?.manual.keys.delete(event.key.length===1?event.key.toLowerCase():event.key));
  document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>document.getElementById(button.dataset.close).close());
  document.addEventListener('keydown',event=>{
    if(!grandPrix)return;
    if(event.ctrlKey||event.altKey||event.metaKey||event.target.closest?.('input,select,textarea,[contenteditable="true"]'))return;
    const key=event.key.length===1?event.key.toLowerCase():event.key;
    if(grandPrix.manual.enabled&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','z','q'].includes(key)){grandPrix.manual.keys.add(key);event.preventDefault();return;}
    if(event.repeat)return;
    if(event.key==='Escape'){grandPrix.manual.enabled=false;grandPrix.manual.clear();broadcast.refresh();}
    if(event.key.toLowerCase()==='d'){const control=document.getElementById('gp-debug');control.checked=!control.checked;event.preventDefault();}
    if(event.code==='Space'&&grandPrix.phase!=='GRID'){grandPrix.paused=!grandPrix.paused;event.preventDefault();broadcast.refresh();}
  });
}
function draw(){if(!grandPrix)return;grandPrix.advance(Math.min(deltaTime/1000,.2),grandPrix.manual.enabled?1:Number(document.getElementById('sim-speed').value));broadcast.render();if(typeof raceRadio!=='undefined'&&raceRadio)raceRadio.update(grandPrix);if(typeof behaviorPanel!=='undefined'&&behaviorPanel)behaviorPanel.update(grandPrix,broadcast.selected());}
function windowResized(){const host=document.getElementById('gp-canvas');resizeCanvas(host.clientWidth,host.clientHeight);}
function mousePressed(event){if(!grandPrix||event.target.tagName!=='CANVAS')return;if(grandPrix.obstaclePlacement){const r=broadcast.renderer,point=window.apex3D&&!window.apex3D.failed?window.apex3D.worldPoint(mouseX,mouseY):createVector((mouseX-width/2)/r.scale+r.x,(mouseY-height/2)/r.scale+r.y);const obstacle=grandPrix.addObstacle(point);if(typeof behaviorPanel!=='undefined'&&behaviorPanel)behaviorPanel.status(obstacle?'Obstacle ajouté.':'Choisis un point sur la piste ; limite de 20 obstacles.');return;}if(broadcast.renderer.mode==='paddock'&&grandPrix.serviceVehicles.length){const r=broadcast.renderer,p=window.apex3D&&!window.apex3D.failed?window.apex3D.worldPoint(mouseX,mouseY):{x:(mouseX-width/2)/r.scale+r.x,y:(mouseY-height/2)/r.scale+r.y};if(p)grandPrix.observedService=grandPrix.serviceVehicles.reduce((a,c)=>Math.hypot(c.pos.x-p.x,c.pos.y-p.y)<Math.hypot(a.pos.x-p.x,a.pos.y-p.y)?c:a);return;}broadcast.selectedId=(window.apex3D&&!window.apex3D.failed?window.apex3D.pick(mouseX,mouseY,grandPrix):null)?.driver.id??broadcast.renderer.pick(mouseX,mouseY).driver.id;if(broadcast.renderer.mode!=='chase'){document.getElementById('camera-mode').value='driver';broadcast.renderer.mode='driver';}event.target.focus({preventScroll:true});broadcast.refresh();}
