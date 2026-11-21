export const CONSENT_VERSION='beta-20261121';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const previewAfter=env=>Number.isFinite(Date.parse(env.PREVIEW_NOTIFY_AFTER))?new Date(env.PREVIEW_NOTIFY_AFTER).toISOString():'';
const notificationEnabled=(env,date,live)=>!!(env.RESEND_API_KEY&&env.MAIL_FROM&&env.NOTIFY_TO&&(live||(previewAfter(env)&&previewAfter(env)<=date.toISOString())));
export function settings(env={},date=new Date()){
 const live=env.BETA_OPEN==='1';
 const ready=!!(env.OPERATOR_NAME&&env.PRIVACY_EMAIL&&env.PRIVACY_APPROVED==='1'&&env.RESEND_API_KEY&&env.MAIL_FROM&&env.NOTIFY_TO);
 const end=env.BETA_END_AT?Date.parse(env.BETA_END_AT):null;
 const invalidEnd=end!==null&&!Number.isFinite(end),ended=end!==null&&!invalidEnd&&end<=date.getTime();
 return {mode:live?'live':'preview',notificationEnabled:notificationEnabled(env,date,live),open:(!live||ready)&&!invalidEnd&&!ended,closedReason:invalidEnd?'setup':ended?'ended':live&&!ready?'setup':null,ready,operator:env.OPERATOR_NAME||'운영 주체 확인 중',contact:env.PRIVACY_EMAIL||'',consentVersion:CONSENT_VERSION,betaEnd:env.BETA_END_AT||null};
}
export async function handleBeta(request,env,db,{now=()=>new Date()}={}){
 const date=now(),url=new URL(request.url),cfg=settings(env,date),route=url.pathname;
 if(route==='/api/homepage/config'&&request.method==='GET')return json(cfg);
 if(!['/api/homepage/beta','/api/homepage/visit'].includes(route)||request.method!=='POST')return json({error:'찾을 수 없습니다.'},404);
 if(request.headers.get('origin')!==url.origin)return json({error:'같은 홈페이지에서 신청해 주세요.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON 요청이 필요합니다.'},415);
 const text=await request.text();if(text.length>6000)return json({error:'입력 내용이 너무 깁니다.'},413);
 let b;try{b=JSON.parse(text);}catch{return json({error:'입력 형식을 확인해 주세요.'},400);}
 if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'입력 형식을 확인해 주세요.'},400);
 const stamp=date.toISOString();
 if(route.endsWith('/visit')){
  if(b.event!=='pageview')return json({error:'지원하지 않는 측정입니다.'},400);
  await db.prepare('INSERT INTO beta_metrics(day,mode,pageviews) VALUES(?,?,1) ON CONFLICT(day,mode) DO UPDATE SET pageviews=pageviews+1').bind(stamp.slice(0,10),cfg.mode).run();
  return json({ok:true});
 }
 if(cfg.closedReason==='ended')return json({error:'베타 모집이 종료되었습니다.'},410);
 if(!cfg.open)return json({error:'베타 신청 준비 중입니다. 잠시 후 다시 확인해 주세요.'},503);
 const str=k=>typeof b[k]==='string'?b[k].trim():'';
 const name=str('name'),email=str('email').toLowerCase(),purpose=str('purpose'),message=str('message');
 if(!name||name.length>60||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||purpose.length>100||message.length>1000||b.consent!==true||b.consentVersion!==CONSENT_VERSION||str('website'))return json({error:'이름·이메일·개인정보 동의와 입력 내용을 확인해 주세요.'},400);
 const expiry=new Date(date);expiry.setUTCFullYear(expiry.getUTCFullYear()+1);
 const expires=cfg.betaEnd&&Date.parse(cfg.betaEnd)<expiry.getTime()?new Date(cfg.betaEnd).toISOString():expiry.toISOString();
 const id=crypto.randomUUID();
 // Expired data never blocks a fresh application; metrics contain no applicant data.
 await db.prepare('DELETE FROM beta_applicants WHERE expires_at<=?').bind(stamp).run();
 const result=await db.prepare('INSERT OR IGNORE INTO beta_applicants(id,email,name,purpose,message,consent_version,created_at,expires_at,mode) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,email,name,purpose,message,CONSENT_VERSION,stamp,expires,cfg.mode).run();
 if(!result.meta.changes)return json({error:'이 이메일로 이미 신청하셨습니다.'},409);
 return json({ok:true,id,mode:cfg.mode,notificationEnabled:cfg.notificationEnabled},201);
}
export async function maintainBeta(env,db,{now=()=>new Date(),send=fetch}={}){
 const stamp=now().toISOString();
 const end=Number.isFinite(Date.parse(env.BETA_END_AT))?new Date(env.BETA_END_AT).toISOString():'';
 const deleted=await db.prepare('DELETE FROM beta_applicants WHERE expires_at<=? OR (?<>\'\' AND mode=\'live\' AND ?<=?)').bind(stamp,end,end,stamp).run();
 if(!env.RESEND_API_KEY||!env.MAIL_FROM||!env.NOTIFY_TO)return {deleted:deleted.meta.changes,sent:0,mail:'not-configured'};
 // A retry never crosses the provider's 24-hour idempotency window.
 const cutoff=new Date(now().getTime()-23*3600000).toISOString(),retryBefore=new Date(now().getTime()-5*60000).toISOString();
 // Preview notifications require explicit opt-in; never send the old preview backlog.
 const after=previewAfter(env),eligible="(mode='live' OR (mode='preview' AND ?<>'' AND created_at>=?))";
 await db.prepare(`UPDATE beta_applicants SET notification='review' WHERE ${eligible} AND notification IN ('pending','sending') AND first_attempt<?`).bind(after,after,cutoff).run();
 const rows=(await db.prepare(`SELECT * FROM beta_applicants WHERE ${eligible} AND notification IN ('pending','sending') AND (last_attempt IS NULL OR last_attempt<?) ORDER BY created_at LIMIT 10`).bind(after,after,retryBefore).all()).results;
 let sent=0;
 for(const row of rows){
  const claim=await db.prepare("UPDATE beta_applicants SET notification='sending',attempts=attempts+1,first_attempt=COALESCE(first_attempt,?),last_attempt=? WHERE id=? AND notification IN ('pending','sending') AND (last_attempt IS NULL OR last_attempt<?)").bind(stamp,stamp,row.id,retryBefore).run();
  if(!claim.meta.changes)continue;
  try{
   const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`beta/${row.id}`},signal:AbortSignal.timeout(10000),body:JSON.stringify({from:env.MAIL_FROM,to:[env.NOTIFY_TO],subject:(row.mode==='preview'?'[테스트] ':'')+'스토툰 베타 신청이 접수되었습니다',text:`새 신청이 저장되었습니다.\n접수번호: ${row.id}\n접수 시각: ${row.created_at}\n신청자 정보는 비공개 저장소에서 확인해 주세요.`})});
   if(!response.ok)throw Error('mail rejected');const data=await response.json();if(!data.id)throw Error('missing id');
   await db.prepare("UPDATE beta_applicants SET notification='accepted',provider_id=? WHERE id=?").bind(data.id,row.id).run();sent++;
  }catch{
   await db.prepare("UPDATE beta_applicants SET notification='pending' WHERE id=?").bind(row.id).run();
  }
 }
 return {deleted:deleted.meta.changes,sent};
}
