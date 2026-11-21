import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const source=await fs.readFile('apps/homepage/main.js','utf8');
const cfg={mode:'preview',open:true,consentVersion:'test'};
const flush=()=>new Promise(r=>setImmediate(r));
function harness(fetcher){
 const created=[];function element(){return {hidden:false,disabled:false,textContent:'',value:'',handlers:{},children:[],addEventListener(t,f){this.handlers[t]=f;},append(x){this.children.push(x);},after(){},replaceChildren(...x){this.children=x;},setAttribute(){},removeAttribute(){}};}
 const submit=element(),status=element(),consent=element(),label=element(),badge=element(),intro=element(),form=element();
 form.elements={purpose:{value:'',closest:()=>label,addEventListener(){}},consent:{checked:true}};form.reportValidity=()=>true;form.reset=()=>{form.resetCalled=true;};form.querySelector=s=>s==='button'?submit:consent;
 const timers=new Map();let i=0;
 const context={document:{querySelector:s=>s==='#beta-form'?form:s==='#form-status'?status:intro,querySelectorAll:()=>[badge],createElement:()=>{const e=element();created.push(e);return e;},createTextNode:t=>t},fetch:fetcher,AbortController,setTimeout:f=>{timers.set(++i,f);return i;},clearTimeout:id=>timers.delete(id),location:{href:''},FormData:class{*[Symbol.iterator](){yield ['name','Preserved'];yield ['email','qa@example.com'];yield ['purpose',''];yield ['purposeOther',''];}},encodeURIComponent};
 vm.runInNewContext(source,context);return {submit,status,form,retry:created[0],created,context,timers,send:()=>form.handlers.submit({preventDefault(){}})};
}
const response=(body,status=200)=>({ok:status<400,status,json:async()=>body});
test('configuration failure can retry without reload and privacy opens separately',async()=>{
 let count=0;const h=harness(async url=>url.endsWith('/visit')?response({}):++count===1?Promise.reject(new TypeError('offline')):response(cfg));await flush();
 assert.equal(h.submit.disabled,true);assert.equal(h.retry.hidden,false);await h.retry.handlers.click();assert.equal(h.submit.disabled,false);assert.equal(h.retry.hidden,true);assert.equal(h.created.find(x=>x.target==='_blank').rel,'noopener noreferrer');
});
test('timed out submission preserves input, allows retry, and explains already saved duplicate',async()=>{
 let count=0;const h=harness(async(url,options)=>{
 if(url.endsWith('/config'))return response(cfg);if(url.endsWith('/visit'))return response({});
 if(++count===1)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const e=new Error();e.name='AbortError';reject(e);}));return response({error:'이미 신청하셨습니다.'},409);
 });await flush();const sending=h.send();assert.equal(h.submit.disabled,true);for(const timer of h.timers.values())timer();await sending;
 assert.equal(h.form.resetCalled,undefined);assert.equal(h.context.location.href,'');assert.equal(h.submit.disabled,false);assert.match(h.status.textContent,/입력 내용은 유지/);
 await h.send();assert.match(h.status.textContent,/이미 저장되었을 수/);assert.equal(h.form.resetCalled,undefined);
});
test('closed config and a closure during submission keep the form disabled',async()=>{
 const h=harness(async url=>response(url.endsWith('/config')?cfg:{error:'모집 종료'},410));await flush();
 // Configuration HTTP error blocks submission until a valid response.
 assert.equal(h.submit.disabled,true);
 const closed=harness(async url=>response(url.endsWith('/config')?{...cfg,open:false,closedReason:'ended'}:{}));await flush();assert.equal(closed.submit.disabled,true);assert.equal(closed.submit.textContent,'모집 종료');
 const changed=harness(async url=>url.endsWith('/config')?response(cfg):url.endsWith('/beta')?response({error:'모집 종료'},410):response({}));await flush();await changed.send();assert.equal(changed.submit.disabled,true);assert.equal(changed.retry.hidden,false);assert.equal(changed.form.resetCalled,undefined);
});

test('preview notification status and completion reflect the server result',async()=>{
 for(const enabled of [false,true]){
  const h=harness(async url=>response(url.endsWith('/config')?{...cfg,open:true,notificationEnabled:enabled}:url.endsWith('/beta')?{mode:'preview',notificationEnabled:enabled}:{}));
  await flush();assert.match(h.status.textContent,enabled?/테스트 알림을 보냅니다/:/발송하지 않습니다/);
  await h.send();assert.equal(h.context.location.href,'/homepage/complete.html?mode=preview'+(enabled?'&notify=1':''));assert.equal(h.form.resetCalled,true);
 }
});
