// Presentation only: all counts and timers are read from the shared combat world.
const visuals={
 rocket:{color:'#ff9972',category:'Projectile',action:'Tirer',hint:'Droit devant · 60 dégâts',art:'<path fill="#ffb64f" d="M43 79 36 105 52 94 59 105 63 79Z"/><path fill="#fff4ac" d="m48 80-2 18 9-9 4 7 0-16Z"/><path fill="#ef5364" d="m38 56-16 22v14l21-9h26l21 9V78L74 56Z"/><path fill="#b8d6e4" d="M38 77V41q0-18 18-31 18 13 18 31v36q-18 9-36 0Z"/><path fill="#fff" stroke="none" d="M43 41q0-15 13-25v63l-13-4Z"/><path fill="#ef5364" d="M38 41q0-18 18-31 18 13 18 31Z"/><circle fill="#2a6c95" cx="56" cy="53" r="10"/><path stroke="#fff" stroke-width="3" d="m51 51 5-4"/>'},
 homing:{color:'#fca8df',category:'Guidage',action:'Lancer',hint:'Poursuit un rival · 45 dégâts',art:'<circle cx="56" cy="56" r="40" fill="none" stroke="#c5a8e4" stroke-dasharray="5 6"/><path stroke="#ffcae9" d="M56 4v15m0 74v15M4 56h15m74 0h15"/><g transform="rotate(35 56 56)"><path fill="#bd5fcf" d="m41 58-14 23v12l19-8h20l19 8V81L71 58Z"/><path fill="#f8c7ea" d="M41 80V38l15-25 15 25v42Z"/><path fill="#dc679f" d="m41 38 15-25 15 25Z"/><path fill="#5fe5dd" d="M46 45h20v15H46Z"/><path fill="#fff" stroke="none" d="M47 65h6v12h-6Z"/></g>'},
 mine:{color:'#b8ef84',category:'Piège',action:'Déposer',hint:'Détection de proximité · 70 dégâts',art:'<ellipse cx="56" cy="85" rx="43" ry="13" fill="#183844" opacity=".35" stroke="none"/><path fill="#597f65" d="M18 65q3-27 38-27t38 27v13q-38 23-76 0Z"/><ellipse cx="56" cy="64" rx="38" ry="18" fill="#a8c987"/><path fill="#ffcd52" d="m27 72 12 4v11l-12-4Zm22 6h13v12H49Zm23-2 12-4v11l-12 4Z"/><path fill="#e76155" d="M46 39V28q10-7 20 0v11Z"/><ellipse fill="#ffdb80" cx="56" cy="27" rx="10" ry="5"/><path stroke="#f9f1bb" stroke-width="3" d="M56 10V4m-18 13-5-5m41 5 5-5"/>'},
 rapid:{color:'#ffdc78',category:'Rafale',action:'Maintenir pour tirer',hint:'10 balles · 15 dégâts par impact',art:'<path fill="#d3883f" d="m27 66 4 28h18l4-28Z"/><path fill="#e6b943" d="M17 40h26l15 13v23H17Z"/><path fill="#b9ccd4" d="M39 32h51v14H39Zm0 21h51v14H39Z"/><path fill="#6c889b" d="M36 28h18v44H36Z"/><path fill="#384e65" d="M80 27h15v46H80Z"/><ellipse cx="94" cy="38" rx="8" ry="10" fill="#15364d"/><ellipse cx="94" cy="61" rx="8" ry="10" fill="#15364d"/><path stroke="#fff2c6" d="M23 50v14m20-29v29"/><path fill="#f4c458" d="M58 78h13v21H58Z"/><path fill="#faed9c" d="m58 78 6-9 7 9Z"/>'},
 shield:{color:'#81e8ff',category:'Protection',action:'Activer',hint:'Ignore les dégâts · 6 secondes',art:'<circle cx="56" cy="55" r="46" fill="none" stroke="#69bcd3" stroke-dasharray="12 8"/><path fill="#338fbc" d="m56 12 34 13v31q0 26-34 43Q22 82 22 56V25Z"/><path fill="#8be2ec" d="m56 22 24 10v24q0 19-24 32Q32 75 32 56V32Z"/><path fill="#c6ffff" stroke="none" d="M56 24v61Q34 73 34 56V34Z"/><path fill="none" stroke="#28608b" stroke-width="7" d="m41 54 10 10 22-25"/>'},
 boost:{color:'#cbb2ff',category:'Vitesse',action:'Activer',hint:'Vitesse ×1,6 · 3 secondes',art:'<path fill="none" stroke="#d2bcff" d="M12 39h14M6 55h14m-9 16h15"/><path fill="#f29a62" d="m71 79-3 25 13-8 9 5 2-24Z"/><g transform="rotate(20 59 52)"><path fill="#ab82d8" d="M36 29q23-12 46 0v48q-23 14-46 0Z"/><ellipse fill="#dbcaff" cx="59" cy="29" rx="23" ry="9"/><path fill="#6d83a2" d="M46 15h26v12H46Z"/><path fill="#ffe68c" d="M61 36 44 61h13l-1 17 19-29H61Z"/></g>'},
 empty:{color:'#b3ccdf',category:'Emplacement libre',action:'',hint:'Ramasse une caisse dans l’arène',art:'<path fill="#dba14b" d="M20 35 56 17l36 18v45L56 99 20 80Z"/><path fill="#ffd979" d="m20 35 36 18 36-18-36-18Z"/><path fill="#efbc60" d="M56 53v46l36-19V35Z"/><path stroke="#916b39" d="m38 26 37 18v18M38 44v43"/><path fill="none" stroke="#fff8db" stroke-width="6" d="M65 65q0-7 7-7t6 7q0 4-6 8v3m0 7v1"/>'}
};
const clamp=n=>Math.max(0,Math.min(1,n));

export function weaponDisplayState(k,w,items){
 const kind=k.alive&&Object.hasOwn(visuals,k.item)&&Object.hasOwn(items,k.item)&&Number.isInteger(k.ammo)&&k.ammo>0?k.item:'empty';
 const v=visuals[kind],def=items[kind],ammo=def?Math.max(0,Math.min(def.ammo,Math.floor(k.ammo))):0;
 const remaining=Math.max(0,(k.fireAt||0)-w.time);
 const saturated=kind==='mine'?w.mines.length>=32:['rocket','homing','rapid'].includes(kind)&&w.projectiles.length>=128;
 const status=w.weapons?.availability(k,w)||(!k.alive?'respawn':w.paused?'paused':w.phase!=='playing'?'waiting':kind==='empty'?'empty':saturated?'full':remaining>0?'cooldown':'ready');
 const label={respawn:'Réapparition',paused:'En pause',waiting:w.phase==='finished'?'Manche terminée':'Départ imminent',empty:'À récupérer',full:'Arène saturée',blocked:'Pas de place derrière',cooldown:'Recharge',ready:'Prêt à utiliser'}[status];
 const effects=k.alive?['shield','boost'].flatMap(id=>{const seconds=Math.max(0,(k[id==='shield'?'shieldUntil':'boostUntil']||0)-w.time);return seconds>0?[{kind:id,name:items[id].name,seconds,fraction:clamp(seconds/items[id].duration),color:visuals[id].color}]:[];}):[];
 const hint=kind==='rapid'?`${def.ammo} balles · ${def.damage} dégâts par impact`:def?.damage?v.hint.replace(/\d+ dégâts/,def.damage+' dégâts'):def?.duration?v.hint.replace(/\d+ secondes/,def.duration+' secondes'):v.hint;
 return {kind,...v,hint,name:def?def.name:'Trouve ton prochain atout',ammo,maxAmmo:def?.ammo||0,status,label,remaining,readiness:clamp(1-remaining/(k.fireInterval||(kind==='rapid'?.12:.45))),effects};
}

export function weaponIllustration(kind){
 const art=(visuals[kind]||visuals.empty).art;
 return `<svg viewBox="0 0 112 112" aria-hidden="true" focusable="false" fill="none" stroke="#18364d" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${art}</svg>`;
}

export class WeaponDisplay{
 constructor(host,{reduced=false}={}){
  this.host=host;host.classList.add('weapon-panel');host.dataset.reduced=String(reduced);
  host.innerHTML=`<div class="weapon-top"><span>TON ÉQUIPEMENT</span><span class="weapon-status"></span></div><div class="weapon-body"><div class="weapon-art"></div><div class="weapon-copy"><span class="weapon-category"></span><h2 class="weapon-name"></h2><div class="weapon-ammo"><strong></strong><span></span></div><div class="weapon-pips" aria-hidden="true">${'<i></i>'.repeat(10)}</div><p class="weapon-hint"></p></div></div><div class="weapon-command"><kbd>Espace</kbd><span></span></div><div class="weapon-reload" role="progressbar" aria-label="Disponibilité de l’arme" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="weapon-effects"></div><span class="weapon-announcement" role="status" aria-live="polite" aria-atomic="true"></span>`;
  this.find=s=>host.querySelector(s);this.parts={};for(const key of ['status','category','name','hint','ammo','pips','reload','effects','art','command','announcement'])this.parts[key]=this.find('.weapon-'+key);
 }
 update(k,w,items){
  const s=weaponDisplayState(k,w,items),p=this.parts;
  if(this.kind!==s.kind){p.art.innerHTML=weaponIllustration(s.kind);this.host.style.setProperty('--weapon-color',s.color);this.host.dataset.weapon=s.kind;this.kind=s.kind;}
  this.host.dataset.state=s.status;
  p.status.textContent=s.label;p.category.textContent=s.category;p.name.textContent=s.name;p.hint.textContent=s.hint;
  p.ammo.hidden=s.kind==='empty';p.ammo.querySelector('strong').textContent=s.ammo;p.ammo.querySelector('span').textContent=s.kind==='rapid'?`/ ${s.maxAmmo} balles`:'utilisation';
  p.pips.hidden=s.kind!=='rapid';[...p.pips.children].forEach((el,i)=>el.classList.toggle('loaded',i<s.ammo));
  p.command.hidden=s.kind==='empty';p.command.querySelector('span').textContent=s.status==='cooldown'?`Recharge · ${s.remaining.toFixed(1).replace('.',',')} s`:s.status==='ready'?s.action:s.label;
  p.reload.hidden=s.status!=='cooldown';p.reload.setAttribute('aria-valuenow',String(Math.round(s.readiness*100)));p.reload.firstElementChild.style.width=(s.readiness*100)+'%';
  // Keep timer DOM stable between HUD ticks; screen readers announce equipment changes only.
  const effectKey=s.effects.map(e=>e.kind).join(',');
  if(effectKey!==this.effectKey){p.effects.innerHTML=s.effects.map(e=>`<div class="weapon-effect" data-effect="${e.kind}" style="--effect-color:${e.color}"><div><span>${e.name} actif</span><time></time></div><div class="weapon-effect-meter" role="progressbar" aria-label="Durée du ${e.name.toLowerCase()}" aria-valuemin="0" aria-valuemax="100"><i></i></div></div>`).join('');this.effectKey=effectKey;}
  s.effects.forEach((e,i)=>{const el=p.effects.children[i];el.querySelector('time').textContent=e.seconds.toFixed(1).replace('.',',')+' s';const bar=el.querySelector('[role=progressbar]');bar.setAttribute('aria-valuenow',String(Math.round(e.fraction*100)));bar.firstElementChild.style.width=e.fraction*100+'%';});
  const announcement=s.kind+':'+(s.status==='respawn');if(announcement!==this.announcement){p.announcement.textContent=s.status==='respawn'?'Kart éliminé. Réapparition en cours.':s.kind==='empty'?'Emplacement libre. Ramasse une caisse.':`${s.name} équipé. ${s.ammo} ${s.kind==='rapid'?'balles':'utilisation'}. Espace pour utiliser.`;this.announcement=announcement;}
  return s;
 }
}
