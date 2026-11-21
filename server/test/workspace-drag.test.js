import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function fixture(locked=false) {
 const source=readFileSync('apps/homepage/workspace-objects.js','utf8');
 const handlers={},hitHandlers={},flushes=[],notifications=[];
 let captured=false;
 const owner={setPointerCapture(){captured=true},hasPointerCapture(){return captured},releasePointerCapture(){captured=false},contains(){return true}};
 const hit={style:{},closest:()=>owner,parentNode:{getScreenCTM:()=>({inverse:()=>({})})},addEventListener:(k,f)=>hitHandlers[k]=f};
 const context=vm.createContext({document:{addEventListener:(k,f)=>handlers[k]=f},window:{projectHistory:{flush:label=>flushes.push(label)}},setTimeout(){},DOMPoint:class {constructor(x,y){this.x=x;this.y=y}matrixTransform(){return {x:this.x/2,y:this.y/2}}},locked,notifications});
 vm.runInContext(`const copy=x=>JSON.parse(JSON.stringify(x));let undo=[],selection=[],records={a:{x:5,y:7,locked}};function choose(id){selection=[id]}function apply(notify=true){notifications.push(notify)};${source.slice(source.indexOf('let objectDrag='),source.indexOf('function linked('))}globalThis.bind=bindObjectDrag;globalThis.inspect=()=>({records,undo,objectDrag});`,context);
 context.bind(hit,'a');
 const event=(x,y,id=1)=>({button:0,pointerId:id,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
 return {down:(x,y)=>hitHandlers.pointerdown(event(x,y)),move:(x,y,id)=>handlers.pointermove(event(x,y,id)),end:()=>handlers.pointerup(event(0,0)),cancel:()=>handlers.pointercancel(event(0,0)),state:()=>context.inspect(),flushes,notifications};
}
test('workspace drag converts screen coordinates and commits one undo for many moves',()=>{
 const f=fixture();f.down(100,100);f.move(120,110);f.move(160,140);
 assert.equal(f.state().records.a.x,35);assert.equal(f.state().records.a.y,27);
 assert.deepEqual(f.notifications,[false,false]);f.end();
 assert.equal(f.state().undo.length,1);assert.equal(f.state().undo[0].a.x,5);
 assert.equal(f.flushes.at(-1),'레이어 드래그');
});
test('workspace drag cancel restores exact position without undo entry',()=>{
 const f=fixture();f.down(0,0);f.move(80,40);f.cancel();assert.equal(f.state().records.a.x,5);assert.equal(f.state().records.a.y,7);assert.equal(f.state().undo.length,0);
});
test('locked workspace layer cannot start a drag',()=>{
 const f=fixture(true);f.down(0,0);f.move(80,40);f.end();assert.equal(f.state().records.a.x,5);assert.equal(f.state().undo.length,0);
});
test('a second pointer and a click do not move the layer or create history',()=>{
 const f=fixture();f.down(0,0);f.move(80,40,2);f.move(1,1);f.end();assert.equal(f.state().records.a.x,5);assert.equal(f.state().undo.length,0);
});

