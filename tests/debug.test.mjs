import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function fixture() {
  const checkbox={checked:false};
  const context=vm.createContext({Vehicle:{debug:false},document:{getElementById:()=>checkbox}});
  vm.runInContext(readFileSync(new URL('../sketch.js',import.meta.url),'utf8'),context);
  return {context,checkbox,press:(options={})=>context.keyPressed({key:'d',target:{closest:()=>null},preventDefault(){},...options})};
}

test('D et Maj+D synchronisent debug et case ; un appui maintenu ne rebascule pas',()=>{
  const {context,checkbox,press}=fixture();
  press();assert.equal(context.Vehicle.debug,true);assert.equal(checkbox.checked,true);
  press({repeat:true});assert.equal(checkbox.checked,true);
  press({key:'D'});assert.equal(context.Vehicle.debug,false);assert.equal(checkbox.checked,false);
  context.setDebug(true);press();assert.equal(checkbox.checked,false);
});

test('D fonctionne avec un curseur ou un bouton focalisé et respecte les champs de texte',()=>{
  const {checkbox,press}=fixture();
  const control={closest:selector=>selector==='input, button, select, textarea' ? {} : null};
  let prevented=false;
  press({target:control,preventDefault(){prevented=true;}});
  assert.equal(checkbox.checked,true);assert.equal(prevented,true);
  press({target:{closest:()=>({})}});assert.equal(checkbox.checked,true);
  press({ctrlKey:true});assert.equal(checkbox.checked,true);
  press({metaKey:true});assert.equal(checkbox.checked,true);
});
