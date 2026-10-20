class RaceRadioUI {
  constructor(){
    this.radio=new TeamRadio();this.enabled=false;this.listening=false;this.recognition=null;
    this.queue=[];this.speaking=false;this.speechVersion=0;this.lang='en-GB';
    this.get=id=>document.getElementById(id);
    this.audio=typeof RadioAudio!=='undefined'?new RadioAudio(state=>this.channel(state)):null;
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    this.get('radio-mic').disabled=!Recognition;
    this.status(Recognition?'Radio prête / Radio ready.':'Micro indisponible dans ce navigateur. Utilise le texte / Use text input.');
    this.get('radio-audio').onchange=e=>{this.enabled=e.target.checked;if(!this.enabled)this.silence();else this.audio?.unlock().catch(()=>this.channel('fallback'));};
    this.get('radio-language').onchange=e=>{this.stopMic();this.silence();this.lang=e.target.value;};
    this.get('radio-mic').onclick=()=>this.listening?this.stopMic():this.startMic(Recognition);
    this.get('radio-volume').oninput=e=>this.audio?.setVolume(Number(e.target.value)/100);
    this.get('radio-effect').oninput=e=>this.audio?.setEffect(Number(e.target.value)/100);
    this.get('radio-test').onclick=()=>{this.enabled=true;this.get('radio-audio').checked=true;this.audio?.unlock().catch(()=>{});this.silence();this.say(this.lang==='en-GB'?'Radio check. Loud and clear.':'Test radio. Cinq sur cinq.');};
    document.querySelectorAll('[data-radio-order]').forEach(button=>button.onclick=()=>{this.get('radio-text').value=button.dataset.radioOrder;this.get('radio-action').value='';this.propose();});
    document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.target.closest?.('input,textarea,select,[contenteditable="true"]')){e.preventDefault();this.startMic(Recognition);}});
    document.addEventListener('keyup',e=>{if(e.key.toLowerCase()==='r'&&this.listening)this.recognition?.stop?.();});
    document.querySelector('.team-radio').addEventListener('toggle',e=>{if(!e.currentTarget.open)this.stopMic();});
    this.get('radio-form').onsubmit=e=>{e.preventDefault();this.propose();};
    this.get('radio-confirm').onclick=()=>{try{const order=this.radio.confirm(grandPrix);this.get('radio-proposal').hidden=true;this.status(`Confirmé / Confirmed: ${order.action}`);}catch(e){this.get('radio-proposal').hidden=true;this.status(e.message);}};
    this.get('radio-cancel').onclick=()=>{this.radio.cancel();this.get('radio-proposal').hidden=true;this.status('Annulé / Cancelled.');};
    // Any edit invalidates the earlier proposal; confirmation always matches its displayed snapshot.
    this.get('radio-form').oninput=()=>{this.radio.cancel();this.get('radio-proposal').hidden=true;};
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.stopMic();this.silence();}});
    window.addEventListener('blur',()=>this.stopMic());
    window.addEventListener('pagehide',event=>{this.stopMic();this.silence();if(!event.persisted)this.audio?.dispose();});
  }
  status(text){this.get('radio-status').textContent=text;}
  channel(state){const label={idle:'Canal libre',loading:'Connexion…',receiving:'Réception radio',fallback:'Voix navigateur · sans filtre',transmitting:'Micro · émission'}[state]||state;this.get('radio-channel').textContent=label;this.get('radio-channel').dataset.state=state;}
  propose(){try{
    const order=this.radio.propose(this.get('radio-text').value,grandPrix,broadcast.selected(),this.get('radio-scope').value,this.get('radio-action').value||null,this.get('radio-tyres').value,Number(this.get('radio-duration').value));
    this.get('radio-preview').textContent=`${order.names.join(' + ')} · ${order.action}${order.action==='box'?' / '+order.compound:''} · ${order.duration}s\n“${order.text}”${!order.understood?'\nPhrase libre : vérifie l’action choisie. Un message seul ne change pas la conduite.':''}`;
    this.get('radio-proposal').hidden=false;this.status('Vérifie puis confirme / Review and confirm.');
  }catch(e){this.status(e.message);}}
  startMic(Recognition){
    if(!Recognition||this.listening)return;
    this.silence();const recognition=new Recognition();this.recognition=recognition;
    recognition.lang=this.lang;recognition.continuous=false;recognition.interimResults=false;
    recognition.onresult=e=>{if(this.recognition!==recognition)return;const result=e.results[e.resultIndex];if(!result?.isFinal)return;this.get('radio-text').value=result[0].transcript;this.propose();};
    recognition.onerror=e=>{if(this.recognition===recognition)this.status(`Micro : ${e.error}. Tu peux écrire l’instruction / You can type the instruction.`);};
    recognition.onend=()=>{if(this.recognition!==recognition)return;this.channel('idle');this.listening=false;this.recognition=null;this.get('radio-mic').textContent='Parler · R';this.get('radio-mic').setAttribute('aria-pressed','false');};
    try{recognition.start();this.listening=true;this.channel('transmitting');this.get('radio-mic').textContent='Arrêter';this.get('radio-mic').setAttribute('aria-pressed','true');this.status('Écoute… relâche R pour terminer.');}catch(e){recognition.onend();this.status(e.message);}
  }
  stopMic(){this.channel('idle');const r=this.recognition;this.recognition=null;this.listening=false;r?.abort();this.get('radio-mic').textContent='Parler · R';this.get('radio-mic').setAttribute('aria-pressed','false');}
  silence(){this.currentPriority=0;this.speechVersion++;this.queue=[];this.speaking=false;this.audio?.stop();window.speechSynthesis?.cancel();}
  say(text,priority=0){if(!this.enabled||this.listening||document.hidden)return;
    if(priority===2&&(this.currentPriority||0)<2)this.silence();if(this.queue.length>=3)this.queue.shift();this.queue.push({text,at:Date.now(),priority});this.speakNext();}
  speakNext(){if(this.speaking||!this.queue.length||!this.enabled)return;
    let next=this.queue.shift();while(next&&Date.now()-next.at>6000)next=this.queue.shift();if(!next)return;
    const version=this.speechVersion,text=next.text;this.currentPriority=next.priority;this.speaking=true;
    if(this.audio){this.audio.play(text,this.lang).then(()=>{if(version!==this.speechVersion)return;this.speaking=false;this.speakNext();}).catch(()=>{if(version===this.speechVersion)this.speakBrowser(text,version);});return;}
    this.speakBrowser(text,version);
  }
  speakBrowser(text,version){
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){this.speaking=false;this.channel('fallback');return;}
    const u=new SpeechSynthesisUtterance(text);u.lang=this.lang;u.rate=1.02;u.volume=this.audio?.volume??.55;this.channel('fallback');
    const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith(this.lang.slice(0,2)));if(voice)u.voice=voice;
    u.onend=u.onerror=()=>{if(version!==this.speechVersion)return;this.speaking=false;this.channel('idle');this.speakNext();};speechSynthesis.speak(u);
  }
  update(sim){
    const changed=this.radio.sim!==sim,events=this.radio.sync(sim);
    if(changed){this.stopMic();this.silence();this.get('radio-proposal').hidden=true;this.get('radio-history').replaceChildren();}
    if(sim.paused){if(this.speaking||this.queue.length)this.silence();return;}
    const selected=broadcast.selected();
    if(this.lastTeam!==undefined&&this.lastTeam!==selected.driver.teamId)this.silence();this.lastTeam=selected.driver.teamId;
    this.get('radio-recipient').textContent=`${selected.driver.name} · ${selected.driver.team}`;
    for(const event of events){
      if(event.driver!==null&&sim.cars.find(c=>c.driver.id===event.driver)?.driver.teamId!==selected.driver.teamId)continue;
      const message=this.message(event,sim);if(!message)continue;
      const li=document.createElement('li');li.textContent=`${GP.time(event.time)} · ${message}`;this.get('radio-history').prepend(li);while(this.get('radio-history').children.length>15)this.get('radio-history').lastChild.remove();
      this.get('radio-caption').textContent=message;this.captionUntil=Date.now()+8000;this.get('radio-transmission').hidden=false;
      this.say(message.replace(/^[^:]+:\s*/,''),['RED','SC','VSC','YELLOW','BOX','RADIO'].includes(event.type)?2:0);
    }
    if(Date.now()>(this.captionUntil||0))this.get('radio-transmission').hidden=true;
  }
  message(event,sim){
    const fr=this.lang.startsWith('fr'),car=sim.cars.find(c=>c.driver.id===event.driver);
    const templates={SC:['Voiture de sécurité déployée. Aucun dépassement.','Safety car deployed. No overtaking.'],VSC:['Voiture de sécurité virtuelle. Respectez les écarts.','Virtual safety car. Maintain the gaps.'],RED:['Drapeau rouge. Séance interrompue.','Red flag. Session stopped.'],YELLOW:['Drapeau jaune. Ralentissez.','Yellow flag. Slow down.'],RESTART:['Reprise contrôlée de la séance.','Controlled session restart.'],GREEN:['Drapeau vert. Reprise.','Green flag. Racing resumes.'],BOX:[`Rentrez aux stands pour les pneus ${car?.pitCompound||''}.`,'Box, box. Pit this lap.'],TYRES:['Arrêt terminé. Pneus neufs.','Pit stop complete. Fresh tyres.'],BLUE_FLAG:['Drapeau bleu. Laissez passer.','Blue flags. Give room.'],ATTACK:['Une attaque se prépare.','An overtaking move is developing.'],FINISH:['Drapeau à damier. Course terminée.','Checkered flag. Race complete.'],NEURAL_OFF_TRACK:['Sortie de piste. Le modèle nécessite plus d’entraînement.','Off track. The model needs more training.']};
    if(event.type==='RADIO'){
      const r=event.radio;if(!r)return event.message;
      const replies={message:['Message reçu. Aucun changement de conduite.','Message received. No driving change.'],box:[`Compris. Stands, pneus ${r.compound}.`,`Copy. Box for ${r.compound} tyres.`],attack:['Compris. Attaquer.','Copy. Push.'],defend:['Compris. Défendre.','Copy. Defend.'],'save-tyres':['Compris. Préserver les pneus.','Copy. Preserve tyres.'],'save-energy':['Compris. Économiser l’énergie.','Copy. Save energy.'],normal:['Retour au pilotage normal.','Return to normal driving.'],status:[`Énergie ${r.energy} pour cent. Vie des pneus ${r.tyreLife} pour cent.`,`Energy ${r.energy} percent. Tyre life ${r.tyreLife} percent.`]};
      return `${fr?'Pilote':'Driver'} · ${car?.driver.abbr||''}: ${replies[r.action][fr?0:1]}${r.action==='message'?' '+r.text:''}`;
    }
    if(!templates[event.type])return null;
    return `${car?(fr?'Ingénieur':'Engineer')+' · '+car.driver.abbr:(fr?'Direction de course':'Race control')}: ${templates[event.type][fr?0:1]}`;
  }
}
let raceRadio;
document.addEventListener('DOMContentLoaded',()=>{raceRadio=new RaceRadioUI();});
