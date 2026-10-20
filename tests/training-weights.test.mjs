import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../gp/trainingWeights.js',import.meta.url),'utf8')+';globalThis.Weights=TrainingWeights;',context);
const W=context.Weights;
test('weight profiles have independent values and change score defaults without changing safety defaults',()=>{
  const balanced=W.defaults(),safe=W.defaults('safe'),pace=W.defaults('pace');
  assert.ok(safe.offtrack>balanced.offtrack);assert.ok(pace.progress>balanced.progress);assert.equal(safe.avoidance,balanced.avoidance);
  balanced.progress=9;assert.equal(W.defaults().progress,1);assert.throws(()=>W.defaults('unknown'));
});
test('weight ranges are inclusive, zero disables a force, and invalid or entirely zero scores are rejected',()=>{
  const values={...W.defaults(),progress:3,separation:5,avoidance:0};assert.equal(W.validate(values).avoidance,0);
  for(const bad of [{...values,speed:NaN},{...values,separation:5.01},{...values,progress:-.01},{...values,speed:'1'},{...values,extra:1},{...values,...Object.fromEntries([...W.score].map(k=>[k,0]))}])assert.throws(()=>W.validate(bad));
});
test('form values serialize as numbers with a detached snapshot of all eight weights',()=>{
  const values=W.defaults();context.document={getElementById:id=>({value:String(values[id.replace('training-weight-','')])})};
  values.progress=2.35;values.avoidance=0;const snapshot=W.read();values.progress=.5;
  assert.equal(snapshot.progress,2.35);assert.equal(snapshot.avoidance,0);assert.equal(Object.keys(snapshot).length,8);assert.match(W.summary(snapshot),/2.35/);
});
