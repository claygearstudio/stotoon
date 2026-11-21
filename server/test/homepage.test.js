import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {installHomepage} from '../src/homepage.js';
import {CONSENT_VERSION,handleBeta,maintainBeta} from '../src/beta-service.mjs';
import {openBetaDb} from '../src/beta-local.mjs';
const data={name:'Tester',email:'test@example.com',consent:true,consentVersion:CONSENT_VERSION};
const request=(body=data,route='beta')=>new Request('https://test.example/api/homepage/'+route,{method:'POST',headers:{origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify(body)});
async function fixture(fn){const folder=await fs.mkdtemp(path.join(os.tmpdir(),'beta-'));const db=openBetaDb(folder);try{await fn(db,folder);}finally{db.close();await fs.rm(folder,{recursive:true,force:true});}}
const rows=db=>db.prepare('SELECT * FROM beta_applicants').bind().all();
test('beta API persists, rejects concurrent duplicates, invalid consent and cross-origin; private records stay private',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'beta-http-')),app=express();app.use(express.json());const service=installHomepage(app,{storage:folder,env:{},maintenance:false});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const post=(body,origin=base)=>fetch(base+'/api/homepage/beta',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)});
 try{assert.equal((await post({...data,consent:false})).status,400);assert.equal((await post(data,'https://other.example')).status,403);assert.deepEqual((await Promise.all([post(data),post({...data,email:' TEST@example.com '})])).map(r=>r.status).sort(),[201,409]);assert.equal((await rows(service.db)).results.length,1);assert.equal((await fetch(base+'/api/homepage/beta')).status,404);assert.equal((await fetch(base+'/homepage/')).status,200);assert.equal((await fetch(base+'/homepage/complete.html')).status,200);}finally{await new Promise(r=>server.close(r));service.close();await fs.rm(folder,{recursive:true,force:true});}
});
test('aggregates count accepted signup once, count pageviews without identifiers and survive reopening',()=>fixture(async(db,folder)=>{
 await handleBeta(request(),{},db);await handleBeta(request(),{},db);await handleBeta(request({event:'pageview',email:'ignored'},'visit'),{},db);
 const reopened=openBetaDb(folder);try{const m=(await reopened.prepare('SELECT * FROM beta_metrics').bind().all()).results[0];assert.equal(m.signups,1);assert.equal(m.pageviews,1);assert.deepEqual(Object.keys(m).sort(),['day','mode','pageviews','signups']);}finally{reopened.close();}
}));
test('expiry and beta end purge applicant data while anonymous totals remain',()=>fixture(async db=>{
 await handleBeta(request(),{},db,{now:()=>new Date('2025-01-01T00:00:00Z')});assert.equal((await rows(db)).results[0].expires_at,'2026-01-01T00:00:00.000Z');
 await maintainBeta({},db,{now:()=>new Date('2026-01-01T00:00:00Z')});assert.equal((await rows(db)).results.length,0);assert.equal((await db.prepare('SELECT signups FROM beta_metrics').bind().all()).results[0].signups,1);
}));
const live={BETA_OPEN:'1',OPERATOR_NAME:'Test operator',PRIVACY_EMAIL:'privacy@example.com',PRIVACY_APPROVED:'1',RESEND_API_KEY:'fake-test-key',MAIL_FROM:'test@example.com',NOTIFY_TO:'operator@example.com'};
test('changed beta end with timezone offset purges live records and their pending mail',()=>fixture(async db=>{
 const now=()=>new Date('2026-11-21T00:00:00Z');await handleBeta(request(),live,db,{now});
 await maintainBeta({...live,BETA_END_AT:'2026-11-21T09:00:00+09:00'},db,{now,send:()=>{throw Error('must not send deleted record');}});
 assert.equal((await rows(db)).results.length,0);
}));
test('simultaneous maintenance claims each notification only once',()=>fixture(async db=>{
 const now=()=>new Date('2026-11-21T00:00:00Z');await handleBeta(request(),live,db,{now});let sent=0;
 const send=async()=>{sent++;return Response.json({id:'one'});};
 await Promise.all([maintainBeta(live,db,{now,send}),maintainBeta(live,db,{now,send})]);assert.equal(sent,1);
}));
test('live intake blocks incomplete setup and an ended beta',()=>fixture(async db=>{
 assert.equal((await handleBeta(request(),{BETA_OPEN:'1'},db)).status,503);
 assert.equal((await handleBeta(request(),{...live,BETA_END_AT:'2020-01-01T00:00:00Z'},db)).status,410);
 assert.equal((await handleBeta(request({...data,consentVersion:'old'}),live,db)).status,400);
}));
test('mail failure retains signup, retries with stable idempotency, accepted mail is not resent',()=>fixture(async db=>{
 let date=new Date('2026-11-21T00:00:00Z'),calls=[];await handleBeta(request(),live,db,{now:()=>date});
 const send=async(url,options)=>{calls.push({url,...options});return calls.length===1?new Response('',{status:500}):Response.json({id:'provider-1'});};
 await maintainBeta(live,db,{now:()=>date,send});assert.equal((await rows(db)).results[0].notification,'pending');
 date=new Date(date.getTime()+6*60000);await maintainBeta(live,db,{now:()=>date,send});await maintainBeta(live,db,{now:()=>date,send});
 assert.equal(calls.length,2);assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);assert.equal(calls[0].body,calls[1].body);assert.equal(JSON.parse(calls[0].body).text.includes(data.email),false);assert.equal((await rows(db)).results[0].notification,'accepted');
}));
test('mail retry beyond idempotency window requires review; preview never sends',()=>fixture(async db=>{
 let date=new Date('2026-11-21T00:00:00Z');await handleBeta(request(),live,db,{now:()=>date});let count=0;const send=async()=>{count++;throw Error('timeout');};
 await maintainBeta(live,db,{now:()=>date,send});date=new Date('2026-11-22T00:00:00Z');await maintainBeta(live,db,{now:()=>date,send});assert.equal(count,1);assert.equal((await rows(db)).results[0].notification,'review');
 await handleBeta(request({...data,email:'preview@example.com'}),{},db,{now:()=>date});await maintainBeta(live,db,{now:()=>date,send});assert.equal(count,1);
}));


test('config and submission agree at the exact closing instant and on invalid configuration',()=>fixture(async db=>{
 const now=()=>new Date('2026-11-21T00:00:00Z');
 for(const [end,open,reason,code] of [['2026-11-21T09:00:01+09:00',true,null,201],['2026-11-21T09:00:00+09:00',false,'ended',410],['invalid',false,'setup',503]]){
  const env={...live,BETA_END_AT:end};const cfg=await (await handleBeta(new Request('https://test.example/api/homepage/config'),env,db,{now})).json();
  assert.equal(cfg.open,open);assert.equal(cfg.closedReason,reason);
  assert.equal((await handleBeta(request({...data,email:end==='invalid'?'invalid@example.com':open?'future@example.com':'ended@example.com'}),env,db,{now})).status,code);
 }
 assert.equal((await rows(db)).results.length,1);
}));

test('preview mail opt-in excludes old records, invalid dates and missing credentials; new mail reaches only configured operator',()=>fixture(async db=>{
 const old=()=>new Date('2026-11-21T00:00:00Z'),now=()=>new Date('2026-11-21T00:10:00Z');
 const env={...live,BETA_OPEN:'0',PREVIEW_NOTIFY_AFTER:'2026-11-21T09:05:00+09:00'};
 await handleBeta(request({...data,email:'old@example.com'}),{},db,{now:old});
 for(const bad of [{...env,PREVIEW_NOTIFY_AFTER:'invalid'},{...env,RESEND_API_KEY:''},{...env,PREVIEW_NOTIFY_AFTER:'2027-01-01'}]){
  const cfg=await (await handleBeta(new Request('https://test.example/api/homepage/config'),bad,db,{now})).json();assert.equal(cfg.notificationEnabled,false);
 }
 const result=await (await handleBeta(request(),env,db,{now})).json();assert.equal(result.notificationEnabled,true);assert.equal(result.mode,'preview');
 let calls=[];const send=async(url,options)=>{calls.push(JSON.parse(options.body));return Response.json({id:'preview-provider'});};
 await maintainBeta({...env,PREVIEW_NOTIFY_AFTER:'invalid'},db,{now,send});assert.equal(calls.length,0);
 await maintainBeta(env,db,{now,send});await maintainBeta(env,db,{now,send});assert.equal(calls.length,1);
 assert.deepEqual(calls[0].to,[env.NOTIFY_TO]);assert.match(calls[0].subject,/^\[테스트\]/);assert.ok(calls[0].text.includes(result.id));assert.ok(!calls[0].text.includes(data.email));
 const all=(await rows(db)).results;assert.equal(all.find(r=>r.email==='old@example.com').notification,'pending');assert.equal(all.find(r=>r.id===result.id).notification,'accepted');
}));
