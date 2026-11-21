import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function fixture(){
 const clone=v=>JSON.parse(JSON.stringify(v));
 let objects={'1:scene-draco.png:1':{x:0,y:0,scale:1,angle:0,flip:1,opacity:1,order:1}},saved=null,message='';
 const buttons={},events={};
 const context={window:{},objectEditor:{snapshot:()=>clone(objects),restore:v=>objects=clone(v),selection:()=>[]},document:{querySelector:id=>buttons[id]??={disabled:false},addEventListener:(k,f)=>events[k]=f},localStorage:{getItem:()=>saved,setItem:(_,v)=>saved=v},setTimeout:f=>f(),note:v=>message=v};
 vm.runInNewContext(readFileSync('apps/homepage/workspace-history.js','utf8'),context);
 return {move(){objects['1:scene-draco.png:1'].x=130;objects['1:scene-draco.png:1'].scale=1.2;events['editor-change']();},click:id=>buttons['#'+id].onclick(),state:()=>clone(objects),data:()=>saved,inject:v=>saved=v,message:()=>message};
}
test('public workspace undo, redo and saved position/scale survive reset and reload',()=>{
 const f=fixture();f.move();const edited=f.state();f.click('undo');assert.equal(f.state()['1:scene-draco.png:1'].x,0);f.click('redo');assert.deepEqual(f.state(),edited);f.click('save');f.click('reset');f.click('load');assert.equal(f.state()['1:scene-draco.png:1'].x,130);assert.equal(f.state()['1:scene-draco.png:1'].scale,1.2);
 const fresh=fixture();fresh.inject(f.data());fresh.click('load');assert.equal(fresh.state()['1:scene-draco.png:1'].x,130);
});
test('public workspace rejects invalid saved transforms and ignores injected asset URLs',()=>{
 const f=fixture();f.move();f.click('save');const data=JSON.parse(f.data());data.objects['1:scene-draco.png:1'].assetUrl='https://example.com/remote.png';f.inject(JSON.stringify(data));f.click('load');assert.equal(f.state()['1:scene-draco.png:1'].assetUrl,undefined);
 const before=f.state();data.objects['1:scene-draco.png:1'].scale=-2;f.inject(JSON.stringify(data));f.click('load');assert.deepEqual(f.state(),before);assert.match(f.message(),/올바르지/);
});
