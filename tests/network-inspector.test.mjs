import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx=vm.createContext({});vm.runInContext(readFileSync(new URL('../gp/networkInspector.js',import.meta.url),'utf8')+';globalThis.Panel=NeuralNetworkPanel;',ctx);const P=ctx.Panel;
const record=()=>({inputs:18,hidden:36,outputs:2,w1:Array(648).fill(.1),b1:Array(36).fill(0),w2:Array(72).fill(.2),b2:[0,0]});
test('network counts come from validated tensors and include biases only as parameters',()=>{
  const info=P.describe(record());assert.equal(info.neurons,56);assert.equal(info.connections,720);assert.equal(info.parameters,758);
  for(const r of [null,{...record(),hidden:0},{...record(),b1:[]},{...record(),w1:Array(648).fill(NaN)}])assert.equal(P.describe(r),null);
});
test('network layout contains every neuron and connection without mutating the model',()=>{
  const r=record(),before=JSON.stringify(r),layout=P.layout(P.describe(r));assert.equal(layout.layers.flat().length,56);assert.equal(layout.links.length,720);assert.equal(layout.layers[1].length,36);
  assert.ok(layout.layers.flat().every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));assert.equal(JSON.stringify(r),before);
});
test('activations must belong to the selected driver and contain complete finite normalized values',()=>{
  const info=P.describe(record()),frame={driverId:4,neural:{inputs:Array(18).fill(.2),hidden:Array(36).fill(.4),outputs:[0,1]}};
  assert.ok(P.activity(frame,4,info));assert.equal(P.activity(frame,5,info),null);assert.equal(P.activity({driverId:4},4,info),null);
  assert.equal(P.activity({...frame,driverId:null},0,info),null);
  for(const values of [[NaN,1],[-.1,1],[0,1.1],[0]])assert.equal(P.activity({...frame,neural:{...frame.neural,outputs:values}},4,info),null);
});
test('neuron inspection distinguishes sensors, hidden neurons and driving outputs',()=>{
  assert.match(P.label(0,12),/Vitesse/);assert.match(P.label(1,35),/36/);assert.equal(P.label(2,0),'Direction');assert.equal(P.label(2,1),'Vitesse désirée');
});
