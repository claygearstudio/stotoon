import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('apps/studio/lettering.js','utf8');
test('long unspaced Korean and emoji copy wraps without losing characters',()=>{
 const c={};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function wrapCopy'),source.indexOf('function lettering')),c);
 for(const text of ['가'.repeat(45),'🙂'.repeat(28)]){const lines=c.wrapCopy(text,12);assert.ok(lines.every(l=>[...l].length<=12));assert.equal(lines.join(''),text);}
});
test('touch double tap edits the same bubble but scrolling, cancellation and another finger do not',()=>{
 const handlers={},calls=[];const root={addEventListener:(name,fn)=>handlers[name]=fn};const g={dataset:{panel:'6',line:'1'}};
 const c={document:{querySelector:()=>root},openLetter:(...args)=>calls.push(args)};vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf('// Touch double-tap')),c);
 const event=(time,extra={})=>({pointerType:'touch',isPrimary:true,pointerId:1,clientX:10,clientY:10,timeStamp:time,target:{closest:()=>g},...extra});
 const tap=t=>{handlers.pointerdown(event(t));handlers.pointerup(event(t+50));};tap(0);tap(150);assert.deepEqual(calls,[[6,1]]);
 tap(1000);handlers.pointerdown(event(1100));handlers.pointermove(event(1120,{clientX:40}));handlers.pointerup(event(1140));assert.equal(calls.length,1);
 tap(2000);handlers.pointercancel(event(2050));tap(2100);assert.equal(calls.length,1);
 handlers.pointerdown(event(2200,{isPrimary:false,pointerId:2}));tap(2250);assert.equal(calls.length,1);
});
