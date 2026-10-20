import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {setupGP} from './gp-harness.mjs';
const source=file=>readFileSync(new URL('../gp/'+file,import.meta.url),'utf8');
function workspace(){const context=vm.createContext({URLSearchParams});for(const file of ['trainingWeights.js','platformState.js','modelRepository.js','neuralModel.js'])vm.runInContext(source(file),context);return vm.runInContext('({PlatformState,TrainingWeights,ModelRepository,DriverNeuralModel})',context);}
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test('shared driver selection validates IDs, URL choices and damaged storage',()=>{
 const {PlatformState:S}=workspace(),store=storage();assert.equal(S.selected(store),0);S.select(21,store);assert.equal(S.selected(store),21);assert.equal(S.requested('?driver=4'),4);
 for(const value of [true,false,null,undefined,'','1.0','-1',22,2.5,NaN])assert.equal(S.driver(value),null);
 for(const query of ['?driver=22','?driver=1.2','?driver=-1',''])assert.equal(S.requested(query),null);
 store.setItem('apex-selection','{broken');assert.equal(S.selected(store),0);assert.throws(()=>S.select(22,store));
});
test('training draft preserves both categories of weights with isolated validated snapshots',()=>{
 const {PlatformState:S,TrainingWeights:W}=workspace(),store=storage(),draft={epochs:0,population:4,generations:1,steps:120,seed:1,objective:'safe',resume:true,drivers:[4,4,7],circuits:['it-1922'],weights:W.defaults('safe')};
 S.saveTraining(draft,store);draft.weights.borders=5;draft.drivers.push(8);const restored=S.training(store);assert.equal(restored.weights.borders,.8);assert.equal(restored.drivers.join(','),'4,7');restored.weights.borders=0;assert.equal(S.training(store).weights.borders,.8);
 for(const change of [{population:0},{objective:'invalid'},{drivers:[]},{weights:{}}])assert.throws(()=>S.saveTraining({...draft,...change},store));
 store.setItem('apex-training',JSON.stringify({objective:'broken'}));assert.equal(Object.keys(S.training(store)).length,0);
});
test('repository publishes fresh models atomically and existing instances retain their tensors',async()=>{
 const {ModelRepository:R,DriverNeuralModel:M}=workspace();const record=JSON.parse(readFileSync(new URL('../gp/models/driver-00.json',import.meta.url),'utf8')),bank={models:[record]},active=new M(record),prior=active.w1[0];
 const fresh=structuredClone(record);fresh.metadata.modelId='new-export';fresh.w1[0]+=1;
 const manifest={schema:'apex-bank-v1',models:[{driverId:0,file:'driver-00.json',modelId:'new-export'}]};
 const fetcher=async(path,options)=>{assert.equal(options.cache,'no-store');return {ok:true,json:async()=>path.endsWith('manifest.json')?manifest:fresh};};
 await R.refresh(bank,fetcher);assert.equal(bank.models[0].metadata.modelId,'new-export');assert.equal(active.w1[0],prior);assert.notEqual(new M(bank.models[0]).w1[0],prior);
 const published=bank.models;fresh.driverId=1;await assert.rejects(R.refresh(bank,fetcher),/identity/);assert.equal(bank.models,published);
 manifest.models.push(manifest.models[0]);await assert.rejects(R.refresh(bank,fetcher),/manifest/);manifest.models=[{driverId:0,file:'../bad.json'}];await assert.rejects(R.refresh(bank,fetcher),/manifest/);
 await assert.rejects(R.refresh(bank,async()=>({ok:false})),/Impossible/);assert.equal(bank.models,published);
});
test('saved model safety weights reach each race car without overwriting legacy defaults',()=>{
 const {GrandPrixSimulation,APEX_DRIVER_MODELS}=setupGP({neural:true});APEX_DRIVER_MODELS.models[0].metadata.weights={separation:2,avoidance:0,borders:3};APEX_DRIVER_MODELS.models[1].metadata.weights={separation:-1,avoidance:NaN,borders:6};
 const sim=new GrandPrixSimulation({drivers:2}),a=sim.cars.find(c=>c.driver.id===0),b=sim.cars.find(c=>c.driver.id===1);
 assert.equal(a.behaviors.getBehavior('separation').weight,2);assert.equal(a.behaviors.getBehavior('avoidance').weight,0);assert.equal(a.behaviors.getBehavior('border-clearance').weight,3);
 assert.equal(b.behaviors.getBehavior('separation').weight,.45);assert.equal(b.behaviors.getBehavior('avoidance').weight,1.6);assert.equal(b.behaviors.getBehavior('border-clearance').weight,.8);
});
