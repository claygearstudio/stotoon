import express from 'express';
import path from 'node:path';
import {ROOT} from './paths.js';
import {openBetaDb} from './beta-local.mjs';
import {handleBeta,maintainBeta} from './beta-service.mjs';
export function installHomepage(app,{storage=path.join(ROOT,'data/private/homepage-beta-v2'),env=process.env,maintenance=true}={}) {
 const db=openBetaDb(storage);
 app.get(/^\/homepage$/,(_,res)=>res.redirect('/homepage/'));
 app.use('/homepage',express.static(path.join(ROOT,'apps/homepage')));
 app.all('/api/homepage/:action',async(req,res,next)=>{try{
  const headers={'Content-Type':'application/json'};if(req.get('origin'))headers.origin=req.get('origin');
  const request=new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:JSON.stringify(req.body??{})})});
  const result=await handleBeta(request,env,db);res.status(result.status).type('application/json').set('Cache-Control','no-store').send(await result.text());
  if(result.status===201&&maintenance)void maintainBeta(env,db).catch(()=>{});
 }catch(e){next(e);}});
 let timer;if(maintenance){void maintainBeta(env,db).catch(()=>{});timer=setInterval(()=>{void maintainBeta(env,db).catch(()=>{});},300000);timer.unref();}
 return {db,close(){clearInterval(timer);db.close();}};
}