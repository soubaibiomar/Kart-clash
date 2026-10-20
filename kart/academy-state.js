/** Local UI state only; choosing/importing a model never writes saved circuits. */
export function modelTrackChoice(model,choices){
 if(!model.track)return {value:'',track:null};
 const track=KartTrack.validate(model.track),signature=t=>JSON.stringify(KartTrack.validate(t));
 const match=choices.find(c=>c.track&&signature(c.track)===signature(track));
 return {value:match?.value||'@model',track};
}
export function academyBusy(panel){return !!(panel.active||panel.starting||panel.evaluating);}

export const savedTrackValue=track=>'saved:'+encodeURIComponent(track.name);
