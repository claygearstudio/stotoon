import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('studio opens only after trusted editor readiness and exposes retry on failure',()=>{
 let listener,ready=false,timeout;
 const frame={contentWindow:{},removeAttribute(){}};
 const nodes={'#editor':frame,'#status':{},'#progress':{},'#retry':{hidden:true}};
 const context={document:{querySelector:k=>nodes[k],body:{classList:{add:()=>ready=true}}},window:{addEventListener:(_,f)=>listener=f},location:{origin:'https://site.test',reload(){}},setTimeout:f=>{timeout=f;return 1},clearTimeout(){}};
 vm.runInNewContext(readFileSync('apps/studio/loading.js','utf8'),context);
 const event={source:frame.contentWindow,origin:'https://site.test',data:{type:'stotoon-ready',percent:55,message:'images'}};
 listener({...event,origin:'https://other.test',data:{...event.data,ready:true}});assert.equal(ready,false);
 listener(event);assert.equal(nodes['#progress'].value,55);assert.equal(ready,false);
 timeout();assert.equal(nodes['#retry'].hidden,false);
 listener({...event,data:{...event.data,ready:true,percent:100}});assert.equal(ready,true);
});
