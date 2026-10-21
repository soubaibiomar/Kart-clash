import {createTrackRace} from './track-race.js';
/** Validate a complete session before the current UI/world is released. */
export function prepareSession(preferences,{track=null,brain=null,challenge=null,brains=[],trackRivals=[],race=null}={}){
 if(!Array.isArray(trackRivals))throw Error('Liste de pilotes IA invalide.');
 const selected=track?brain:challenge?null:brains.find(b=>b.name===preferences.brain);
 if(!track&&!challenge&&preferences.brain&&!selected)throw Error('Ce cerveau est absent ou incompatible. Choisis un autre contrôleur.');
 const options={gameplay:selected?(selected.gameplay||'kart-classic-v1'):(preferences.gameplay||'kart-arcade-v2'),track,autopilot:!!track&&!!selected,mode:challenge||track?'ffa':preferences.mode,difficulty:preferences.difficulty,bots:preferences.bots,color:preferences.color,seed:2026,challenge,brain:selected};
 if(options.mode==='core'&&selected)throw Error('Choisis des bots scriptés pour le mode en équipe.');
 if(options.mode==='core')options.bots=Math.max(1,options.bots);
 if(race){if(race.mode==='kart')options.gameplay=KartGameplay.ARCADE;if(!track||brain||challenge)throw Error('Choisis un circuit manuel pour ces modes.');Object.assign(options,{raceMode:race.mode,raceBots:race.bots,raceLaps:race.laps,trackRivals});return {options,world:createTrackRace(options,trackRivals)};}
 if(trackRivals.length){if(!track||brain||challenge)throw Error('Les pilotes de circuit exigent une course manuelle sur leur circuit.');options.trackRivals=trackRivals;return {options,world:createTrackRace(options,trackRivals)};}
 return {options,world:new KartWorld(options)};
}
