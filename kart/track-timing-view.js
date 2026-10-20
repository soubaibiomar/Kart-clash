import {formatTrackTime} from './track-timing.js';

/** DOM instrumentation, separate from the track's physical gates and driving. */
export class TrackTimingView{
 constructor(host,timing,{onGhost=()=>{}}={}){
  this.host=host;this.timing=timing;
  host.innerHTML='<div class="track-clock-heading"><span>Contre-la-montre</span><span data-clock-state></span></div><time class="track-clock-time" aria-label="Temps du parcours">0:00.000</time><div class="track-clock-best">Record local <time>—</time></div><div class="track-clock-sectors" aria-label="Temps des secteurs">'+timing.ends.map((_,i)=>`<div><span>S${i+1}</span><time>—</time></div>`).join('')+'</div><div class="track-clock-delta" data-delta><span>Écart à la dernière balise</span><strong>—</strong></div><small data-clock-note>Les secteurs suivent les balises du circuit.</small>';
  const toggle=document.createElement('button');toggle.className='ghost-toggle';toggle.type='button';toggle.textContent=timing.ghostReference?'Fantôme du record':'Fantôme au prochain record';toggle.disabled=!timing.ghostReference;toggle.setAttribute('aria-pressed',String(!!timing.ghostReference));toggle.onclick=()=>{const enabled=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=enabled?'Fantôme du record':'Fantôme masqué';onGhost(enabled);};host.append(toggle);
  this.time=host.querySelector('.track-clock-time');this.best=host.querySelector('.track-clock-best time');this.sectors=[...host.querySelectorAll('.track-clock-sectors time')];this.state=host.querySelector('[data-clock-state]');this.delta=host.querySelector('[data-delta]');this.note=host.querySelector('[data-clock-note]');
 }
 update(w){
  const s=this.timing.snapshot(w);this.time.textContent=formatTrackTime(s.elapsed);this.best.textContent=formatTrackTime(s.best);this.state.textContent=s.invalid?'Invalide':s.complete?'Terminé':s.paused?'En pause':s.phase==='countdown'?'Départ arrêté':s.phase==='finished'?'Inachevé':`${s.passed} / ${s.total}`;
  this.sectors.forEach((el,i)=>{el.textContent=formatTrackTime(s.sectorTimes[i]);el.parentElement.dataset.complete=String(s.sectorTimes[i]!==null);});
  this.delta.querySelector('strong').textContent=s.delta===null?'—':`${s.delta<0?'−':'+'}${Math.abs(s.delta).toFixed(3)} s`;this.delta.dataset.pace=s.delta===null?'none':s.delta<=0?'ahead':'behind';
  this.note.textContent=s.invalid?'Ce passage ne peut pas devenir un record.':s.best===null?'Termine le parcours pour établir ton premier record.':'Même tracé, même profil et mêmes limites de conduite.';
 }
}

export function timingResultHtml(timing,w){
 const s=timing.snapshot(w),result=timing.commit();const note={record:'Nouveau record local enregistré.',slower:'Record local conservé.',unavailable:'Parcours terminé, mais le stockage local est indisponible.',incomplete:'Parcours inachevé : aucun record enregistré.'}[result.status];
 return `<section class="track-time-result" aria-label="Chronométrage du parcours"><div><span>Temps du parcours</span><strong>${formatTrackTime(s.elapsed)}</strong></div><ol>${s.sectorTimes.map((t,i)=>`<li>S${i+1} <time>${formatTrackTime(t)}</time></li>`).join('')}</ol><p>${note}</p>${result.best!=null?`<small>Record local · ${formatTrackTime(result.best)}</small>`:''}${result.ghostSaved?'<small>Fantôme enregistré · visible au prochain départ.</small>':result.status==='record'?'<small>Relecture non conservée ; le temps reste enregistré.</small>':''}</section>`;
}
