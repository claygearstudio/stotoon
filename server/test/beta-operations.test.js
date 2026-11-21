import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openBetaDb} from '../src/beta-local.mjs';
import {handleBeta,CONSENT_VERSION} from '../src/beta-service.mjs';
import worker from '../../deploy/beta/worker.mjs';
const now=()=>new Date('2026-11-21T12:00:00Z');
const request=email=>new Request('https://test.example/api/homepage/beta',{method:'POST',headers:{origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify({name:'Test',email,consent:true,consentVersion:CONSENT_VERSION})});
async function fixture(fn){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'beta-ops-')),db=openBetaDb(dir);try{await fn(db);}finally{db.close();await fs.rm(dir,{recursive:true,force:true});}}
test('daily cap is atomic, duplicates stay 409 and next UTC day reopens',()=>fixture(async db=>{
 const env={DAILY_SIGNUP_LIMIT:'2'};
 const statuses=await Promise.all(['a','b','c'].map(async n=>(await handleBeta(request(n+'@example.com'),env,db,{now})).status));
 assert.deepEqual(statuses.sort(),[201,201,429]);
 assert.equal((await handleBeta(request('a@example.com'),env,db,{now})).status,409);
 assert.equal((await handleBeta(request('next@example.com'),env,db,{now:()=>new Date('2026-11-22T00:00:00Z')})).status,201);
}));
test('body byte limit rejects chunked input before database access',async()=>{
 const r=request('test@example.com');const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(6001));c.close();}});
 const response=await handleBeta(new Request(r.url,{method:'POST',headers:r.headers,body,duplex:'half'}),{},{});
 assert.equal(response.status,413);
});
test('edge throttling blocks DB/mail work and fails closed when binding fails',async()=>{
 let calls=0;const env={REQUEST_LIMITER:{limit:async()=>({success:false})},DB:{prepare(){calls++;throw Error('must not query');}}};
 const response=await worker.fetch(request('test@example.com'),env,{waitUntil(){throw Error('must not send');}});
 assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');assert.equal(calls,0);
 assert.equal((await worker.fetch(request('test@example.com'),{},{waitUntil(){}})).status,503);
});
test('scheduled job deletes only expired fixture, keeps anonymous totals and records completion',()=>fixture(async db=>{
 await handleBeta(request('expired@example.com'),{},db,{now:()=>new Date('2020-01-01')});
 await handleBeta(request('current@example.com'),{},db);
 // Reinsert expired fixture because ordinary submission also expires old rows.
 await handleBeta(request('expired@example.com'),{},db,{now:()=>new Date('2020-01-01')});
 const work=[];await worker.scheduled({}, {DB:db}, {waitUntil:p=>work.push(p)});await Promise.all(work);
 const rows=(await db.prepare('SELECT email FROM beta_applicants').bind().all()).results;assert.deepEqual(rows.map(r=>r.email),['current@example.com']);
 const health=(await db.prepare('SELECT * FROM beta_maintenance').bind().all()).results[0];assert.equal(health.job,'scheduled');assert.equal(health.deleted,1);assert.equal(health.sent,0);assert.ok(Date.parse(health.completed_at));
}));
