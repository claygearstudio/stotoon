import {handleBeta,maintainBeta} from '../../server/src/beta-service.mjs';
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/homepage/')){
   try{const response=await handleBeta(request,env,env.DB);if(response.status===201)ctx.waitUntil(maintainBeta(env,env.DB));return response;}
   catch{return Response.json({error:'잠시 후 다시 시도해 주세요.'},{status:503});}
  }
  return env.ASSETS.fetch(request);
 },
 async scheduled(event,env,ctx){ctx.waitUntil(maintainBeta(env,env.DB));}
};
