import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('a missing cached dependency produces recovery instructions rather than a silent GPU check',()=>{
  const elements=new Map(),callbacks={};const get=id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);};
  const context=vm.createContext({document:{addEventListener:(name,fn)=>callbacks[name]=fn,getElementById:get}});
  vm.runInContext(readFileSync(new URL('../gp/training-ui.js',import.meta.url),'utf8'),context);
  assert.doesNotThrow(()=>callbacks.DOMContentLoaded());assert.equal(get('device-name').textContent,'Page à actualiser');
  assert.match(get('training-message').textContent,/Ctrl \+ F5/);assert.equal(get('train-start').disabled,true);assert.equal(get('train-stop').disabled,true);
});

test('failed stop stays visible across polling and permits retry without launching training',async()=>{
  const elements=new Map(),requests=[],callbacks={};let poll;
  const make=()=>({value:'',children:[],dataset:{},disabled:false,textContent:'',classList:{add(){},remove(){},toggle(){}},get options(){return this.children;},append(...items){this.children.push(...items);},prepend(x){this.children.unshift(x);},replaceChildren(...items){this.children=items;},setAttribute(){},addEventListener(){},querySelectorAll(){return [];},getContext(){return {fillRect(){},fillText(){}};}});
  const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id);};
  const document={getElementById:get,createElement:make,createTextNode:text=>({textContent:text}),createElementNS:make,querySelector:selector=>selector==='meta[name="training-api"]'?{content:'http://127.0.0.1:8767'}:make(),querySelectorAll:()=>[],addEventListener:(name,callback)=>callbacks[name]=callback};
  get('training-form').elements={namedItem:()=>({value:'balanced'})};get('observed-driver').value='0';get('training-metric').value='loss';
  const context=vm.createContext({document,GP:{names:['Driver A']},location:{protocol:'http:'},AbortController,setTimeout,clearTimeout,setInterval:fn=>poll=fn,fetch:async(rawUrl)=>{requests.push(rawUrl);const url=rawUrl.replace('http://127.0.0.1:8767','');return {ok:url!=='/api/stop',headers:{get:()=> 'application/json'},json:async()=>url==='/api/device'?{cuda:true,gpu:'RTX test',memoryGB:8}:url==='/api/stop'?{error:'Stop failed'}:{status:'running',phase:'evolution',driverIds:[0],generation:1,generations:2}};}});
  vm.runInContext(readFileSync(new URL('../gp/trainingState.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../gp/trainingWeights.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../gp/training-ui.js',import.meta.url),'utf8'),context);callbacks.DOMContentLoaded();await new Promise(setImmediate);
  await get('train-stop').onclick();await poll();
  assert.equal(get('training-message').textContent,'Stop failed');assert.equal(get('train-stop').disabled,false);assert.equal(requests.filter(p=>p.endsWith('/api/train')).length,0);assert.ok(requests.every(p=>p.startsWith('http://127.0.0.1:8767/api/')));
});

for(const failure of ['html','invalid-json','offline','timeout'])test(`training connection recovers from ${failure} without reloading or starting a job`,async()=>{
  const elements=new Map(),requests=[],callbacks={};let poll,available=false,htmlParsed=false;
  const make=()=>({value:'',children:[],dataset:{},disabled:false,textContent:'',classList:{add(){},remove(){},toggle(){}},get options(){return this.children;},append(...items){this.children.push(...items);},prepend(x){this.children.unshift(x);},replaceChildren(...items){this.children=items;},setAttribute(){},addEventListener(){},querySelectorAll(){return [];},getContext(){return {fillRect(){},fillText(){}};}});
  const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id);};
  const document={getElementById:get,createElement:make,createTextNode:text=>({textContent:text}),createElementNS:make,querySelector:()=>make(),querySelectorAll:()=>[],addEventListener:(name,callback)=>callbacks[name]=callback};
  get('training-form').elements={namedItem:()=>({value:'balanced'})};get('observed-driver').value='0';get('training-metric').value='loss';
  const context=vm.createContext({document,GP:{names:['Driver A']},location:{protocol:'http:'},AbortController,TypeError,setTimeout,clearTimeout,setInterval:fn=>poll=fn,fetch:async url=>{
    requests.push(url);
    if(!available&&failure==='offline')throw new TypeError('Failed to fetch');
    if(!available&&failure==='timeout'){const error=new Error('aborted');error.name='AbortError';throw error;}
    return {ok:true,status:200,headers:{get:()=>!available&&failure==='html'?'text/html':'application/json'},json:async()=>{
      if(!available){htmlParsed=failure==='html';throw new SyntaxError('Unexpected token <');}
      return url==='/api/device'?{cuda:true,gpu:'RTX recovered',memoryGB:8}:url==='/api/training-options'?{circuits:[{id:'test',name:'Test'}],weightControls:1}:{status:'idle'};
    }};
  }});
  vm.runInContext(readFileSync(new URL('../gp/trainingState.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../gp/trainingWeights.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../gp/training-ui.js',import.meta.url),'utf8'),context);callbacks.DOMContentLoaded();await new Promise(setImmediate);
  assert.equal(get('train-start').disabled,true);assert.doesNotMatch(get('training-message').textContent,/Unexpected token|DOCTYPE/);assert.equal(htmlParsed,false);
  if(failure==='html')assert.match(get('training-message').textContent,/start.ps1/);
  available=true;for(let i=0;i<7;i++)await poll();await new Promise(setImmediate);
  assert.equal(get('device-name').textContent,'RTX recovered');assert.equal(get('train-start').disabled,false);assert.match(get('training-message').textContent,/Service connecté/);
  assert.equal(get('training-circuits').children.length,1);assert.equal(requests.filter(p=>p==='/api/train').length,0);
});
