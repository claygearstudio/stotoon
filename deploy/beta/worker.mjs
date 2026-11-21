import {handleBeta,maintainBeta} from '../../server/src/beta-service.mjs';
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/homepage/')){
   try{
    if(request.method==='POST'){
     const {success}=await env.REQUEST_LIMITER.limit({key:url.pathname+':'+(request.headers.get('CF-Connecting-IP')||'unknown')});
     if(!success)return Response.json({error:'요청이 많습니다. 1분 후 다시 시도해 주세요. 입력 내용은 유지됩니다.'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
    }
    const response=await handleBeta(request,env,env.DB);if(response.status===201)ctx.waitUntil(maintainBeta(env,env.DB));return response;
   }
   catch{return Response.json({error:'잠시 후 다시 시도해 주세요.'},{status:503,headers:{'Cache-Control':'no-store'}});}
  }
  return env.ASSETS.fetch(request);
 },
 async scheduled(event,env,ctx){ctx.waitUntil((async()=>{
  const result=await maintainBeta(env,env.DB);
  await env.DB.prepare('INSERT INTO beta_maintenance(job,completed_at,deleted,sent) VALUES(?,?,?,?) ON CONFLICT(job) DO UPDATE SET completed_at=excluded.completed_at,deleted=excluded.deleted,sent=excluded.sent').bind('scheduled',new Date().toISOString(),result.deleted,result.sent).run();
 })());}
};
