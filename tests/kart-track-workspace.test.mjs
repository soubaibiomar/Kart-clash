import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createTrackWorkspace,copyTrackWorkspace,sameWorkspaceTrack,TrackWorkspaceTransfer,trackWorkspaceBanner,updateTrackWorkspaceBanner,trackResultActions} from '../kart/track-workspace.js';
import {TrackEditor} from '../kart/track-editor.js';
import {EvolutionPanel} from '../kart/evolution-ui.js';
import {KartInput,gameInputActive} from '../kart/inspection.js';
const {load}=createRequire(import.meta.url)('../kart/node-world.cjs');
function fixture(){const g=load();globalThis.KartTrack=g.KartTrack;const w=new g.KartWorld({track:g.KartTrack.example3D()});w.phase='finished';w.time=42.125;w.player.trackState.passed=w.trackTrial.markers.length;w.player.trackState.finished=true;w.player.contactCount=2;return {g,w,workspace:createTrackWorkspace(w)};}

test('finished manual and neural passages transfer detached geometry and measured summaries without altering physics',()=>{
 try{const {w,workspace}=fixture(),before=JSON.stringify({pos:w.player.pos,vel:w.player.vel,acc:w.player.acc,rng:w.rng.state,track:w.trackTrial.data});assert.equal(workspace.summary.time,42.125);assert.equal(workspace.summary.contacts,2);assert.equal(workspace.summary.complete,true);assert.equal(workspace.summary.controller,'manual');workspace.track.points[0].x++;assert.equal(JSON.stringify({pos:w.player.pos,vel:w.player.vel,acc:w.player.acc,rng:w.rng.state,track:w.trackTrial.data}),before);w.options.autopilot=true;assert.equal(createTrackWorkspace(w).summary.controller,'neural');w.player.trackState.finished=false;w.player.trackState.passed=2;assert.equal(createTrackWorkspace(w).summary.complete,false);w.phase='playing';assert.throws(()=>createTrackWorkspace(w));}finally{delete globalThis.KartTrack;}
});

test('workspace validation rejects inconsistent or damaged results and invalid road data before navigation',()=>{
 try{const {workspace}=fixture();for(const patch of [{time:NaN},{time:-1},{passed:999},{passed:1,complete:true},{total:0},{contacts:-1},{controller:'script-as-user'},{complete:'yes'}])assert.throws(()=>copyTrackWorkspace({...workspace,summary:{...workspace.summary,...patch}}));assert.throws(()=>copyTrackWorkspace({...workspace,track:{...workspace.track,points:[]}}));const empty=copyTrackWorkspace({...workspace,summary:null});assert.equal(empty.summary,null);const cloned=copyTrackWorkspace(workspace);cloned.summary.time=1;cloned.track.points[1].kind='road';assert.equal(workspace.summary.time,42.125);assert.equal(workspace.track.points[1].kind,'bridge');}finally{delete globalThis.KartTrack;}
});

test('one-shot transfer is atomic, destination-specific and discarded after unrelated navigation',()=>{
 try{const {workspace}=fixture(),transfer=new TrackWorkspaceTransfer();transfer.stage(workspace,'tracks');workspace.track.points[0].x++;const taken=transfer.take('tracks');assert.notEqual(taken.track.points[0].x,workspace.track.points[0].x);assert.equal(transfer.take('tracks'),null);transfer.stage(workspace,'evolution');assert.throws(()=>transfer.stage({...workspace,track:null},'tracks'));assert.ok(transfer.take('evolution'));assert.throws(()=>transfer.stage(workspace,'api/start'));transfer.stage(workspace,'tracks');transfer.discardOther('garage');assert.equal(transfer.take('tracks'),null);transfer.stage(workspace,'evolution');transfer.discardOther('evolution');assert.equal(transfer.take('tracks'),null);assert.equal(transfer.take('evolution'),null);}finally{delete globalThis.KartTrack;}
});

test('handoff to the editor prioritizes unsaved road geometry over a same-name stored track and does not save it',()=>{
 try{const {g,workspace}=fixture();let writes=0;const old=g.KartTrack.example3D();old.width=320;g.KartTrack.selected=()=>old;g.KartTrack.save=()=>{writes++;throw Error('Must not save');};class Editor extends TrackEditor{render(){}}const e=new Editor(null,{workspace});assert.equal(e.data.width,workspace.track.width);assert.equal(e.data.name,old.name);assert.equal(e.data.points[2].elevation,160);assert.equal(e.history.length,0);e.data.points[2].elevation=150;assert.equal(workspace.track.points[2].elevation,160);assert.equal(old.width,320);assert.equal(writes,0);}finally{delete globalThis.KartTrack;}
});

test('training resolves the session option by detached geometry instead of saved names or preset namespaces',()=>{
 try{const {g,workspace}=fixture(),panel=Object.create(EvolutionPanel.prototype);g.KartTrack.saved=()=>[{...workspace.track,width:320}];panel.workspace=copyTrackWorkspace(workspace);panel.form={elements:{track:{value:'@session'}}};const selected=panel.track();assert.equal(selected.width,workspace.track.width);selected.points[0].x++;assert.notEqual(panel.workspace.track.points[0].x,selected.points[0].x);panel.form.elements.track.value='missing';assert.equal(panel.track(),undefined);}finally{delete globalThis.KartTrack;}
});

test('editor launches detached drive/training copies without autosaving and drops stale reports after an edit',()=>{
 try{const {workspace}=fixture(),editor=Object.create(TrackEditor.prototype),events=[];editor.data=copyTrackWorkspace(workspace).track;editor.workspace=workspace;editor.save=()=>{throw Error('Must not autosave');};editor.drive=t=>{events.push({type:'drive',track:t});t.points[0].x++;};editor.train=(track,summary)=>events.push({type:'train',track,summary});editor.toast=message=>events.push({error:message});const original=JSON.stringify(editor.data);editor.launch('drive');assert.equal(JSON.stringify(editor.data),original);editor.launch('train');assert.equal(events[1].summary.time,42.125);editor.data.width=180;editor.launch('train');assert.equal(events[2].summary,null);editor.data.points=[];editor.launch('drive');assert.ok(events[3].error);assert.equal(events.filter(e=>e.type==='drive').length,1);}finally{delete globalThis.KartTrack;}
});

test('initial preview stays protected from an old service stream and no launch happens on construction',()=>{
 const previous=globalThis.document;globalThis.document={addEventListener(){}};let connected=0,starts=0;class Panel extends EvolutionPanel{render(){this.previewing=true;}connect(){connected++;}start(){starts++;}}
 let panel;try{panel=new Panel(null,{});assert.equal(panel.previewing,true);assert.equal(connected,1);assert.equal(starts,0);}finally{if(panel){clearInterval(panel.timer);panel.abort.abort();}if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('historic summary hides on geometry/schema changes, remains for a rename, and escapes track names',()=>{
 try{const {workspace}=fixture(),track=workspace.track;assert.equal(sameWorkspaceTrack(workspace,{...track,name:'Renamed'}),true);for(const next of [{...track,width:track.width+20},{...track,closed:!track.closed},{...track,schema:'kart-track-v1'},{...track,points:track.points.map((p,i)=>i?{...p}:{...p,elevation:10})}])assert.equal(sameWorkspaceTrack(workspace,next),false);const banner={hidden:false},host={querySelector:()=>banner};updateTrackWorkspaceBanner(host,workspace,{...track,width:320});assert.equal(banner.hidden,true);updateTrackWorkspaceBanner(host,workspace,track);assert.equal(banner.hidden,false);workspace.track.name='<img src=x onerror=alert(1)>';const markup=trackWorkspaceBanner(workspace,workspace.track);assert.doesNotMatch(markup,/<img/);assert.match(markup,/&lt;img/);assert.match(markup,/0:42.125/);assert.match(markup,/clavier/);assert.match(markup,/séparé des résultats/);assert.equal(trackWorkspaceBanner(null,track),'');assert.match(trackResultActions(),/Préparer son entraînement/);assert.doesNotMatch(trackResultActions(),/api\/start/);}finally{delete globalThis.KartTrack;}
});

test('post-race shortcuts cannot cover the result dialog while countdown and pause controls stay available',()=>{
 const w={phase:'countdown',paused:false};let debug=0,pause=0,camera=0;const input=new KartInput({isPlaying:()=>gameInputActive(w,true),isPaused:()=>w.paused,toggleDebug:()=>debug++,pause:()=>pause++,reset:()=>camera++}),key=key=>({key,target:{closest:()=>null},preventDefault(){}});
 input.keydown(key('d'));assert.equal(debug,1);w.phase='playing';input.keydown(key('ArrowUp'));assert.equal(input.action().throttle,1);input.clear();w.paused=true;input.keydown(key('Escape'));assert.equal(pause,1);input.keydown(key('c'));assert.equal(camera,1);
 w.phase='finished';for(const k of ['d','Escape','c','ArrowUp'])input.keydown(key(k));assert.equal(debug,1);assert.equal(pause,1);assert.equal(camera,1);assert.equal(input.action().throttle,0);assert.equal(gameInputActive(w,false),false);assert.equal(gameInputActive(null,true),false);
});
