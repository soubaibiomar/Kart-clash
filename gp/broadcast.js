class BroadcastRenderer {
  constructor(sim){this.sim=sim;this.background=createGraphics(GP.WORLD_W,GP.WORLD_H);this.background.pixelDensity(1);this.background.scale(GP.WORLD_W/sim.track.width);sim.track.paint(this.background);this.x=sim.track.width/2;this.y=sim.track.height/2;this.scale=1;this.mode='overview';}
  focus(selected){
    const sim=this.sim,order=sim.order();let car=selected;
    if(this.mode==='paddock'&&sim.serviceVehicles.length)car=sim.observedService||sim.serviceVehicles[0];
    if(this.mode==='leader')car=order[0];
    if(this.mode==='battle'){
      let best=Infinity;for(let i=1;i<order.length;i++){const gap=order[i-1].distance-order[i].distance;if(gap>0&&gap<best&&!order[i].inPit&&!order[i].finished){best=gap;car=order[i];}}
    }
    return car;
  }
  draw(selected,debug){
    const sim=this.sim;
    background('#17271f');const base=Math.min(width/sim.track.width,height/sim.track.height)*.98,car=this.focus(selected),overview=this.mode==='overview';
    const desired=this.mode==='paddock'&&sim.serviceArea?Math.min(width/(sim.serviceArea.width*1.5),height/(sim.serviceArea.height*1.8)):overview?base:Math.max(base*2.7,sim.track.geographic?.55:0);this.scale+=(desired-this.scale)*.12;
    const target=this.mode==='paddock'&&sim.serviceArea?{x:sim.serviceArea.x+sim.serviceArea.width/2,y:sim.serviceArea.y+sim.serviceArea.height/2}:overview?{x:sim.track.width/2,y:sim.track.height/2}:car.pos;
    this.x+=(target.x-this.x)*.10;this.y+=(target.y-this.y)*.10;
    push();translate(width/2,height/2);scale(this.scale);translate(-this.x,-this.y);
    image(this.background,0,0,sim.track.width,sim.track.height);
    if(this.sim.environment.wetness>.05){noStroke();fill(116,164,198,this.sim.environment.wetness*29);rect(0,0,GP.WORLD_W,GP.WORLD_H);stroke(186,216,225,35*this.sim.environment.wetness);strokeWeight(1);for(let i=0;i<90;i++){const x=GP.mod(i*317+this.sim.tick*2,GP.WORLD_W),y=GP.mod(i*193+this.sim.tick*7,GP.WORLD_H);line(x,y,x-8,y+20);}}
    for(const obstacle of this.sim.obstacles)obstacle.render();if(this.sim.serviceScenario!=='off')for(const vehicle of this.sim.serviceVehicles)vehicle.render();
    for(const c of this.sim.cars)c.render(c===selected,debug);this.sim.safetyCar.render();for(const member of this.sim.crew)member.render();
    const labels=new Set([selected,...this.sim.order().slice(0,3)]);
    for(const c of labels){noStroke();fill('#0a1715e8');rectMode(CENTER);rect(c.pos.x,c.pos.y-39,49/this.scale,17/this.scale,2);fill(c.driver.color);textAlign(CENTER,CENTER);textStyle(BOLD);textSize(9/this.scale);text(c.driver.abbr,c.pos.x,c.pos.y-39);}
    pop();
    if(window.apex3D&&!window.apex3D.failed)window.apex3D.draw(sim,this,selected,debug);
  }
  pick(x,y){const px=(x-width/2)/this.scale+this.x,py=(y-height/2)/this.scale+this.y;return this.sim.cars.reduce((best,c)=>Math.hypot(c.pos.x-px,c.pos.y-py)<Math.hypot(best.pos.x-px,best.pos.y-py)?c:best,this.sim.cars[0]);}
  destroy(){this.background.remove();}
}
class GrandPrixBroadcast {
  constructor(sim){this.sim=sim;this.selectedId=sim.cars[0].driver.id;this.lastEventTick=-1;this.toastUntil=0;this.resultsShown=false;this.refreshClock=0;this.renderer=new BroadcastRenderer(sim);}
  selected(){return this.sim.cars.find(c=>c.driver.id===this.selectedId)||this.sim.order()[0];}
  text(id,value){const element=document.getElementById(id);if(element.textContent!==String(value))element.textContent=value;}
  render(){this.renderer.draw(this.selected(),document.getElementById('gp-debug').checked);if(performance.now()>this.refreshClock){this.refreshClock=performance.now()+120;this.refresh();}}
  refresh(){
    if(typeof PlatformState!=='undefined'&&this.sharedDriver!==this.selected().driver.id){this.sharedDriver=this.selected().driver.id;PlatformState.select(this.sharedDriver);}
    const stage=document.querySelector('.stage');if(stage)stage.dataset.camera=this.renderer.mode;
    document.querySelectorAll('[data-camera]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.camera===this.renderer.mode)));
    const s=this.sim,order=s.order(),car=this.selected(),phase=s.phase;
    this.text('meeting-name',s.track.name);this.text('circuit-title',s.track.geographic?s.track.location.toUpperCase()+'\nGRAND PRIX':s.config.circuit==='technical'?'THE ATLAS\nGRAND PRIX':'THE COASTAL\nGRAND PRIX');
    this.text('flag-pill',phase==='GRID'?'GRID READY':phase==='RACE'?s.director.flag:phase==='COMPLETE'?'CHECKERED FLAG':phase);
    document.getElementById('flag-pill').style.color=s.director.flag==='GREEN'?'#d8ed9c':'#ffcf65';
    this.text('session-note',phase==='GRID'?`${s.cars.length} drivers. One checkered flag.`:phase==='FORMATION'?'Tyres warming. Formation lap in progress.':phase==='RACE'?`${order[0].driver.abbr} leads · ${s.director.passes} completed overtakes`:'The Grand Prix, live.');
    this.refreshWeekend();
    this.text('weather-status',`${s.environment.mode.toUpperCase()} · TRACK ${Math.round(s.environment.trackTemp)}° · WET ${Math.round(s.environment.wetness*100)}%`);
    this.text('race-clock',GP.time(s.raceTime));this.text('seed-status',`SEED ${s.config.seed}`);
    this.text('timing-lap',s.config.timedSession?`${s.config.sessionName} · BEST LAP`:`LAP ${phase==='GRID'||phase==='FORMATION'||phase==='LIGHTS'?'—':Math.min(s.config.laps,order[0].lap+1)} / ${s.config.laps}`);
    this.text('camera-caption',`${document.getElementById('camera-mode').selectedOptions[0].text.toUpperCase()} · LIVE`);
    const list=document.getElementById('timing-list');
    if(list.children.length!==s.cars.length){list.replaceChildren(...s.cars.map(()=>{const row=document.createElement('button');row.className='timing-row';row.setAttribute('role','listitem');row.innerHTML='<span class="position"></span><i class="team-stripe"></i><span class="driver-abbr"></span><span class="interval"></span><span class="tyre-dot"></span>';row.onclick=()=>{this.selectedId=Number(row.dataset.driver);document.getElementById('camera-mode').value='driver';this.renderer.mode='driver';this.refresh();};return row;}));}
    order.forEach((c,i)=>{
      const row=list.children[i],gap=i?(order[0].distance-c.distance)/Math.max(100,order[0].vel.mag()*60):0;
      row.dataset.driver=c.driver.id;row.classList.toggle('selected',c===car);row.style.setProperty('--team',c.driver.color);
      row.children[0].textContent=i+1;row.children[1].style.background=c.driver.color;row.children[2].textContent=c.driver.abbr;
      row.children[3].textContent=(phase==='GRID'||phase==='LIGHTS')?(i?'GRID':'POLE'):s.config.timedSession?GP.time(c.bestLap):c.disqualified?'DSQ':c.retired?'DNF':c.finished?'FIN':c.inPit?'PIT':`${i?`+${gap.toFixed(1)}`:'LEAD'} ·${c.tires.age.toFixed(1)}L`;
      row.children[4].textContent=c.tires.compound;row.children[4].style.color=GP.compounds[c.tires.compound].color;
      row.title=`${c.driver.name} · ${c.driver.team} · ${c.state} · tyres ${c.tires.age.toFixed(1)} laps`;
    });
    const fastest=s.director.fastest;this.text('fastest-lap',fastest?`${fastest.name}  ${GP.time(fastest.time)}`:'Waiting for the first flying lap');
    this.text('selected-number',`#${car.driver.number}`);this.text('selected-position',`P${order.indexOf(car)+1}`);this.text('selected-name',car.driver.name);this.text('selected-team',car.driver.team);this.text('selected-state',car.retired?'DNF':car.state.replaceAll('_',' '));
    this.text('selected-speed',Math.round(car.vel.mag()*45));this.text('selected-tyre',car.tires.compound);document.getElementById('selected-tyre').style.color=GP.compounds[car.tires.compound].color;
    this.text('selected-age',`${car.tires.age.toFixed(1)} LAPS · ${Math.round(car.tires.temperature)}°`);this.text('selected-stops',car.pitStops);
    this.text('tyre-life',`${Math.round((1-car.tires.wear)*100)}%`);this.text('energy-life',`${Math.round(car.energy)}%`);
    document.getElementById('tyre-meter').style.width=`${(1-car.tires.wear)*100}%`;document.getElementById('tyre-meter').style.background=car.tires.wear>.65?'#f27969':car.tires.wear>.4?'#efcf6a':'#d8ed9c';document.getElementById('energy-meter').style.width=`${car.energy}%`;
    this.text('aero-status',`${car.aero||'HIGH DOWNFORCE'}${car.boost?' · OVERTAKE ENERGY':''}`);
    this.text('selected-sector',car.sectors.map((t,i)=>`S${i+1} ${t.toFixed(2)}`).join('  ')||'SECTOR TIMING —');
    this.text('strategy-note',car.pitRequested?`BOX REQUESTED · ${GP.compounds[car.pitCompound].name.toUpperCase()}`:`${car.driver.style} · ${s.teams[car.driver.teamId].style} · Tyre management ${Math.round(car.driver.profile.management*100)}%`);
    document.getElementById('box-driver').disabled=phase!=='RACE'||car.inPit||car.finished||car.retired;
    document.getElementById('deploy-sc').disabled=phase!=='RACE';document.getElementById('deploy-vsc').disabled=phase!=='RACE';
    this.text('battle-count',`${s.director.passes} OVERTAKES`);
    const start=document.getElementById('start-race');start.textContent=phase==='GRID'?`Start ${s.config.sessionName||'Grand Prix'}`:phase==='COMPLETE'?'Restart weekend':s.paused?'Resume':'Pause';
    if(s.lastEvent&&s.lastEvent.tick!==this.lastEventTick){
      const event=s.lastEvent;this.lastEventTick=event.tick;this.text('commentary-text',event.message);
      if(['RED','RESTART','SESSION_END','OVERTAKE','PIT_STOP','FASTEST_LAP','YELLOW','VSC','SC','FINAL_LAP','WINNER','LIGHTS_OUT','WEATHER'].includes(event.type)){this.toastUntil=performance.now()+2200;this.text('overlay-kicker',event.type.replaceAll('_',' '));this.text('overlay-title',event.type==='LIGHTS_OUT'?'LIGHTS OUT.':event.type==='WINNER'?'RACE WINNER.':event.type==='OVERTAKE'?'POSITION TAKEN.':event.type.replaceAll('_',' '));this.text('overlay-detail',event.message);}
    }
    const overlay=document.getElementById('broadcast-overlay'),lights=document.getElementById('light-sequence');
    lights.replaceChildren();overlay.classList.toggle('grid-ready',phase==='GRID');
    if(phase==='GRID'){this.text('overlay-kicker','AUTONOMOUS RACING');this.text('overlay-title','THE GRID IS SET.');this.text('overlay-detail',s.config.timedSession?`${s.cars.length} drivers · ${GP.time(s.config.sessionDuration)} of track time · Start when ready.`:`${s.cars.length} drivers. ${s.config.laps} laps. Start when ready.`);}
    if(phase==='LIGHTS'){
      const count=Math.min(5,Math.floor(s.time-s.phaseStart)+1);for(let i=0;i<5;i++){const light=document.createElement('i');light.className=`start-light${i<count?' on':''}`;lights.append(light);}
      this.text('overlay-kicker','THE START');this.text('overlay-title','WATCH THE LIGHTS.');this.text('overlay-detail','Individual reaction times. No two launches alike.');
    }
    overlay.classList.toggle('inactive',phase!=='GRID'&&phase!=='LIGHTS'&&performance.now()>this.toastUntil);
    document.getElementById('show-results').hidden=phase!=='COMPLETE';
    if(phase==='COMPLETE'&&!this.resultsShown){this.resultsShown=true;this.showResults();}
  }
  refreshWeekend(){
    if(typeof weekend==='undefined'||!weekend)return;
    const s=this.sim,manual=s.manual,car=this.selected(),name=weekend.name;
    const strip=document.getElementById('weekend-sessions');
    if(strip.children.length!==weekend.sessions.length){strip.replaceChildren(...weekend.sessions.map(label=>{const span=document.createElement('span');span.textContent=label;return span;}));}
    [...strip.children].forEach((span,i)=>{span.classList.toggle('current',i===weekend.index);span.classList.toggle('done',i<weekend.index);if(i===weekend.index)span.setAttribute('aria-current','step');else span.removeAttribute('aria-current');});
    document.getElementById('next-session').disabled=s.phase!=='COMPLETE'||weekend.index===weekend.sessions.length-1;
    this.text('session-remaining',s.config.timedSession?`${name} · ${GP.time(Math.max(0,(s.sessionDeadline??s.config.sessionDuration)-s.raceTime))} remaining`:`${name} · ${s.phase==='SUSPENDED'?'SUSPENDED':s.config.laps+' laps'}`);
    document.getElementById('deploy-red').disabled=s.phase!=='RACE';document.getElementById('deploy-yellow').disabled=s.phase!=='RACE';
    document.getElementById('resume-red').disabled=s.phase!=='SUSPENDED'||s.cars.some(c=>!c.retired&&c.state!=='RED_HOLD');
    const take=document.getElementById('take-control');take.disabled=car.finished||car.retired||s.phase==='SUSPENDED';take.setAttribute('aria-pressed',String(manual.enabled));
    if(manual.enabled)manual.id=car.driver.id;
    take.textContent=manual.enabled?`Release ${car.driver.abbr}`:`Drive ${car.driver.abbr}`;
    this.text('keyboard-help',manual.enabled?`DRIVING ${car.driver.name} · Up / W / Z accelerate · Down / S brake · Left Right / A D / Q D steer · Escape returns to AI · select another driver to switch cars · 1x speed`:'Spectator mode · Select a driver, then Drive to take control. D shows the selected car’s sensors.');
    const flag=document.getElementById('flag-pill');flag.dataset.flag=s.director.flag;if(s.director.flag==='RED')flag.style.color='#ff7480';
    if(s.config.timedSession)this.text('session-note',`${name} · ${s.cars.length} drivers · valid flying laps`);
  }
  showLog(){
    document.getElementById('event-log').replaceChildren(...[...this.sim.director.events].reverse().map(e=>{const row=document.createElement('div');row.className='log-row';const time=document.createElement('time'),type=document.createElement('b'),message=document.createElement('span');time.textContent=GP.time(e.time);type.textContent=e.type.replaceAll('_',' ');message.textContent=e.message;row.append(time,type,message);return row;}));document.getElementById('log-dialog').showModal();
  }
  showResults(){
    const s=this.sim,order=s.order(),winner=order.find(c=>c.finished);this.text('winner-name',s.config.timedSession?`${s.config.sessionName} classification`:winner?`${winner.driver.name} wins the Grand Prix.`:'Race classification');
    document.getElementById('podium').innerHTML=order.filter(c=>c.finished&&!s.config.timedSession).slice(0,3).map((c,i)=>`<div class="podium-place" style="--team:${c.driver.color}"><b>0${i+1}</b><strong>${c.driver.name}</strong><span>${c.driver.team}</span></div>`).join('');
    this.text('results-summary',`${s.config.laps} laps · ${s.director.passes} completed overtakes · ${s.cars.reduce((n,c)=>n+c.pitStops,0)} pit stops · Fastest lap ${s.director.fastest?`${s.director.fastest.name} ${GP.time(s.director.fastest.time)}`:'—'} · Seed ${s.config.seed}`);
    document.getElementById('classification').innerHTML=order.map((c,i)=>`<tr><td>${i+1}</td><td>${c.driver.name}<small>${c.driver.team}${c.qualifyingReview?' · 107% review':''}${c.penalty?` · +${c.penalty}s penalty`:''}</small></td><td>${s.config.timedSession?GP.time(c.bestLap):c.disqualified?'DSQ':c.retired?'DNF':GP.time(c.finishTime)}</td><td>${c.driver.grid-i-1>0?'+':''}${c.driver.grid-i-1}</td><td>${c.pitStops} / ${[c.initialCompound,...c.pitHistory.map(p=>p.compound)].join(' → ')}</td><td>${c.points||0}</td></tr>`).join('');
    const times=this.selected().lapTimes,max=Math.max(...times,1),min=Math.min(...times,max-1),points=times.map((t,i)=>`${25+i*620/Math.max(1,times.length-1)},${105-(t-min)/Math.max(1,max-min)*75}`).join(' ');
    document.getElementById('lap-chart').innerHTML=`<svg viewBox="0 0 680 130" role="img" aria-label="Actual lap times"><line x1="25" y1="105" x2="650" y2="105" stroke="#ffffff22"/><polyline points="${points}" fill="none" stroke="#d8ed9c" stroke-width="2"/><text x="25" y="123" fill="#819a86" font-size="9">LAP 1</text><text x="590" y="123" fill="#819a86" font-size="9">${times.length} LAPS</text><text x="25" y="15" fill="#819a86" font-size="9">${GP.time(min)} – ${GP.time(max)}</text></svg>`;
    const history=this.selected().telemetry;
    if(history.length>1){
      const top=Math.max(1,...history.map(p=>p.gap)),line=history.map((p,i)=>`${25+i*620/(history.length-1)},${105-p.gap/top*80}`).join(' ');
      document.getElementById('lap-chart').insertAdjacentHTML('beforeend',`<p class="rules-note">Recorded estimated gap to the leader · ${this.selected().driver.abbr}</p><svg viewBox="0 0 680 130" role="img" aria-label="Recorded gap to the leader"><polyline points="${line}" fill="none" stroke="#6ba6ff" stroke-width="2"/><text x="25" y="123" fill="#819a86" font-size="9">RACE START</text><text x="25" y="15" fill="#819a86" font-size="9">0 – ${top.toFixed(1)} SECONDS</text></svg>`);
    }
    const dialog=document.getElementById('results-dialog');if(!dialog.open)dialog.showModal();
  }
}
