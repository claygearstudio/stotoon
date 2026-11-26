import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('hidden, deleted, transparent and outside-canvas objects cannot be selected from layer lists',()=>{
 const source=readFileSync('apps/studio/object-tools.js','utf8');
 const fn=source.match(/function isVisible\(id\)\{[^\n]+/)[0];
 const record={},rect={width:20,height:30,left:10,right:30,top:10,bottom:40};
 const nodes=new Map([['a',{hit:{getBoundingClientRect:()=>rect},img:{ownerSVGElement:{getBoundingClientRect:()=>({left:0,right:100,top:0,bottom:100})}}}]]);
 const ctx={records:{a:record},nodes};vm.createContext(ctx);vm.runInContext(fn,ctx);
 assert.equal(ctx.isVisible('a'),true);
 for(const prop of ['hidden','deleted']){record[prop]=true;assert.equal(ctx.isVisible('a'),false);delete record[prop];}
 record.opacity=0;assert.equal(ctx.isVisible('a'),false);record.opacity=1;
 rect.left=101;rect.right=121;assert.equal(ctx.isVisible('a'),false);
 assert.equal(ctx.isVisible('missing'),false);
});
