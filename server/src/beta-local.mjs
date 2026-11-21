import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
export function openBetaDb(folder){
 fs.mkdirSync(folder,{recursive:true});const sql=new DatabaseSync(path.join(folder,'beta.sqlite'));
 sql.exec(fs.readFileSync(new URL('./beta-schema.sql',import.meta.url),'utf8'));
 return {
  close:()=>sql.close(),
  prepare(query){
   return {bind(...args){
    return {
     async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};},
     async all(){return {results:sql.prepare(query).all(...args)};}
    };
   }};
  }
 };
}
