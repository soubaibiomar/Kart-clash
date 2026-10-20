import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script id="boot-guard">([\s\S]*?)<\/script>/)[1];
function fixture({ready=false,game=false,protocol='http:'}={}){
 const listeners={},panel={hidden:true,children:[],replaceChildren(){this.children=[];},append(...items){this.children.push(...items);}};
 let reloads=0,available=ready;
 const window={kartGame:game,addEventListener:(key,fn)=>listeners[key]=fn};
 const document={getElementById:()=>available?panel:null,createElement:()=>({}),addEventListener:(key,fn)=>listeners[key]=fn};
 vm.runInNewContext(source,{window,document,location:{protocol,reload:()=>reloads++}});
 return {listeners,panel,ready:()=>available=true,reloads:()=>reloads};
}
test('asset failure before DOM becomes a recoverable error with a working retry',()=>{
 const f=fixture();f.listeners.error({target:{tagName:'SCRIPT'}});f.ready();f.listeners.DOMContentLoaded();
 assert.equal(f.panel.hidden,false);assert.equal(f.panel.children.length,2);f.panel.children[1].onclick();assert.equal(f.reloads(),1);
});
test('late stylesheet failure is reported; ordinary errors, running game and file guidance stay intact',()=>{
 const f=fixture({ready:true});f.listeners.error({target:{tagName:'LINK'}});assert.equal(f.panel.children.length,2);
 for(const options of [{ready:true,game:true},{ready:true,protocol:'file:'}]){const x=fixture(options);x.listeners.error({target:{tagName:'SCRIPT'}});assert.equal(x.panel.children.length,0);}
 const x=fixture({ready:true});x.listeners.error({target:{}});x.listeners.DOMContentLoaded();assert.equal(x.panel.children.length,0);
});
