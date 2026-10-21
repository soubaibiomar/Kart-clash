import {formatTrackTime} from './track-timing.js';

/** Validated, detached navigation context. Never writes a saved track or starts a job. */
export function copyTrackWorkspace(value){
 const track=KartTrack.validate(value?.track);let summary=null;
 if(value.summary!=null){const s=value.summary,total=track.points.length-(track.closed?0:1);
  if(!Number.isFinite(s.time)||s.time<0||s.time>86400||!Number.isInteger(s.passed)||s.passed<0||s.passed>total||s.total!==total||!Number.isInteger(s.contacts)||s.contacts<0||typeof s.complete!=='boolean'||s.complete&&s.passed!==total||!['manual','neural'].includes(s.controller))throw Error('Bilan de circuit invalide.');
  summary={time:s.time,passed:s.passed,total,contacts:s.contacts,complete:s.complete,controller:s.controller};
 }
 return {track,summary};
}
export function createTrackWorkspace(w){
 if(!w.trackTrial||w.phase!=='finished')throw Error('Le parcours doit être terminé avant de transmettre son bilan.');
 if((w.options.raceLaps||1)>1)return copyTrackWorkspace({track:w.trackTrial.data});
 const s=w.player.trackState,t=w.trackTrial.data;
 return copyTrackWorkspace({track:t,summary:{time:w.time,passed:s.passed,total:t.points.length-(t.closed?0:1),contacts:w.player.contactCount||0,complete:!!s.finished,controller:w.options.autopilot?'neural':'manual'}});
}
export class TrackWorkspaceTransfer{
 stage(workspace,destination){if(!['tracks','evolution'].includes(destination))throw Error('Destination de circuit invalide.');const value=copyTrackWorkspace(workspace);this.pending={destination,value};}
 take(destination){const p=this.pending;this.pending=null;return p?.destination===destination?copyTrackWorkspace(p.value):null;}
 discardOther(destination){if(this.pending?.destination!==destination)this.pending=null;}
}
export function sameWorkspaceTrack(workspace,track){
 if(!workspace||!track)return false;
 const key=t=>JSON.stringify({schema:t.schema,width:t.width,...(t.bounds!==undefined?{bounds:t.bounds}:{}),...(t.cityDensity!==undefined?{cityDensity:t.cityDensity}:{}),closed:t.closed,points:t.points.map(p=>[p.x,p.y,p.elevation||0,p.kind||'road',...(p.width!==undefined?[p.width]:[])])});
 try{return key(KartTrack.validate(workspace.track))===key(KartTrack.validate(track));}catch{return false;}
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function trackWorkspaceBanner(workspace,track){
 if(!workspace?.summary)return '';const s=workspace.summary;
 return `<section class="track-session-context" data-track-session aria-label="Bilan du dernier parcours" ${sameWorkspaceTrack(workspace,track)?'':'hidden'}><div><span>Ton dernier parcours · ${s.controller==='neural'?'pilote neuronal':'clavier'}</span><strong>${escape(workspace.track.name)}</strong></div><dl><div><dt>Temps actif</dt><dd>${formatTrackTime(s.time)}</dd></div><div><dt>${s.complete?'Terminé':'Inachevé'}</dt><dd>${s.passed} / ${s.total} balises</dd></div><div><dt>Contacts</dt><dd>${s.contacts}</dd></div></dl><p>Ce bilan décrit le passage effectué. Il reste séparé des résultats d’apprentissage. Copie de session : enregistre le circuit dans l’éditeur pour le conserver.</p></section>`;
}
export function updateTrackWorkspaceBanner(host,workspace,track){const banner=host?.querySelector?.('[data-track-session]');if(banner)banner.hidden=!sameWorkspaceTrack(workspace,track);}
export function trackResultActions(){return '<section class="track-result-actions" aria-label="Continuer avec ce circuit"><button id="result-edit-track">Modifier ce circuit</button><button id="result-train-track">Préparer son entraînement</button><small>Tu retrouves le tracé exact. L’entraînement démarrera seulement à ta demande.</small></section>';}
