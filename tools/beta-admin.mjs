// Local-only CLI. Cloud D1 management uses the account's own dashboard/CLI.
import fs from 'node:fs/promises';
import path from 'node:path';
import {openBetaDb} from '../server/src/beta-local.mjs';
import {maintainBeta} from '../server/src/beta-service.mjs';
const [action,arg]=process.argv.slice(2),db=openBetaDb(path.resolve('data/private/homepage-beta-v2'));
try{
 if(action==='stats')console.log(JSON.stringify((await db.prepare('SELECT * FROM beta_metrics ORDER BY day DESC').bind().all()).results,null,2));
 else if(action==='list')console.log(JSON.stringify((await db.prepare('SELECT id,name,email,created_at,expires_at,mode,notification FROM beta_applicants ORDER BY created_at DESC').bind().all()).results,null,2));
 else if(action==='maintenance')console.log(await maintainBeta(process.env,db));
 else if(action==='delete'&&arg){const found=(await db.prepare('SELECT id FROM beta_applicants WHERE id=?').bind(arg).all()).results;if(!process.argv.includes('--apply'))console.log({matching:found.length,note:'삭제하려면 같은 명령에 --apply 추가'});else console.log(await db.prepare('DELETE FROM beta_applicants WHERE id=?').bind(arg).run());}
 else if(action==='csv'&&arg){const rows=(await db.prepare('SELECT * FROM beta_applicants ORDER BY created_at').bind().all()).results;const keys=['id','name','email','purpose','message','created_at','expires_at','mode','notification'];const quote=v=>'"'+String(v??'').replace(/^\s*[=+@\-]|^[\t\r\n]/,"'$&").replaceAll('"','""')+'"';await fs.writeFile(arg,'\uFEFF'+[keys.join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n'),{flag:'wx',mode:0o600});console.log('CSV 저장 완료. 보관 기간에 맞춰 이 사본도 삭제하세요.');}
 else throw Error('사용법: node tools/beta-admin.mjs stats|list|maintenance|csv 경로|delete 접수ID [--apply]');
}finally{db.close();}
