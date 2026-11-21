import fs from 'node:fs/promises';
import path from 'node:path';
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function publicOptions({siteUrl='',videoUrl='',credit='',indexable=false}={}){
 let origin='';if(siteUrl){const u=new URL(siteUrl);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('공개 주소는 경로 없는 HTTPS 기본 주소여야 합니다.');origin=u.origin;}
 let videoId='';if(videoUrl){const u=new URL(videoUrl);if(u.protocol!=='https:'||u.username||u.password||!['www.youtube.com','youtube.com','youtu.be'].includes(u.hostname))throw Error('공식 YouTube HTTPS 링크를 입력하세요.');videoId=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');if(!/^[\w-]{11}$/.test(videoId||''))throw Error('올바른 YouTube 영상 ID가 필요합니다.');}
 if(indexable&&(!origin||!credit||!videoId))throw Error('검색 공개 전 공개 주소·저작권 표기·시연 영상을 확정하세요.');
 return {origin,videoId,credit,indexable};
}
export async function packageBeta({output='deploy/beta/public',...input}={}){
 const cfg=publicOptions(input),target=path.join(output,'homepage');
 const allowed=new Set(['index.html','robots.txt','sitemap.xml','_headers',...['index.html','style.css','studio.css','public.css','studio.js','main.js','privacy.html','privacy.js','complete.html','video.js'].map(n=>'homepage/'+n),...['art.png','editor.png','share.png'].map(n=>'homepage/assets/'+n)]);
 async function check(dir,prefix=''){for(const item of await fs.readdir(dir,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})){const rel=prefix+item.name;if(item.isSymbolicLink())throw Error('배포 폴더의 링크는 허용하지 않습니다: '+rel);if(item.isDirectory())await check(path.join(dir,item.name),rel+'/');else if(!allowed.has(rel))throw Error('배포 허용 목록 밖 파일이 있습니다: '+rel);}}
 await check(output);await fs.mkdir(target,{recursive:true});
 for(const name of ['style.css','studio.css','public.css','studio.js','main.js','privacy.html','privacy.js','complete.html'])await fs.copyFile(path.join('apps/homepage',name),path.join(target,name));
 await fs.mkdir(path.join(target,'assets'),{recursive:true});for(const name of ['art.png','editor.png','share.png'])await fs.copyFile(path.join('apps/homepage/assets',name),path.join(target,'assets',name));
 // Use system fonts in the standalone site; never reference private /files assets.
 let css=await fs.readFile(path.join(target,'style.css'),'utf8');css=css.replace(/@font-face\{[^}]*\}/g,'');await fs.writeFile(path.join(target,'style.css'),css);
 let html=await fs.readFile('apps/homepage/public.html','utf8');
 const title='스토툰 · 이야기를 만화로, 베타 참여 안내',description='스토툰의 원고·컷·레이어 편집 흐름을 살펴보고 베타 참여를 신청하세요. 서비스 기능과 개발 방향을 소개합니다.';
 html=html.replace(/<title>[^<]*<\/title>/,`<title>${title}</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${description}">`);
 const canonical=cfg.origin?cfg.origin+'/homepage/':'';
 const seo=`<meta name="robots" content="${cfg.indexable?'index,follow':'noindex,nofollow'}"><meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="스토툰"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta name="twitter:card" content="summary_large_image">${canonical?`<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(cfg.origin)}/homepage/assets/share.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`:''}`;
 html=html.replace('<!-- SEO_SLOT -->',seo).replace('<!-- CREDIT_SLOT -->',escape(cfg.credit||'검토용 작품 예시 · 공개 사용 및 저작권 표기는 최종 확인 전입니다.'));
 const demo=cfg.videoId?`<p>외부 영상은 버튼을 누른 뒤 불러옵니다.</p><button class="button" id="load-demo" data-video="${cfg.videoId}">시연 영상 재생</button><div id="demo-frame"></div><a class="demo-link" href="https://www.youtube.com/watch?v=${cfg.videoId}" target="_blank" rel="noopener noreferrer">YouTube에서 영상 보기 ↗</a><script src="/homepage/video.js" defer></script>`:'<div class="demo-placeholder"><p>시연 영상을 준비하고 있습니다.</p><p>공개 전 실제 작업 흐름을 담은 30~60초 영상을 반영합니다.</p></div>';
 html=html.replace('<!-- DEMO_SLOT -->',demo);await fs.writeFile(path.join(target,'index.html'),html);
 await fs.copyFile('apps/homepage/video.js',path.join(target,'video.js'));
 const noindex='<meta name="robots" content="noindex,nofollow">';
 for(const name of ['privacy.html','complete.html']){const f=path.join(target,name);let s=await fs.readFile(f,'utf8');s=s.replace('<title>',noindex+'<title>');await fs.writeFile(f,s);}
 await fs.writeFile(path.join(output,'index.html'),'<!doctype html><meta charset="utf-8">'+noindex+'<meta http-equiv="refresh" content="0;url=/homepage/"><a href="/homepage/">스토툰 홈페이지</a>');
 await fs.writeFile(path.join(output,'robots.txt'),cfg.indexable?`User-agent: *\nAllow: /homepage/\nDisallow: /api/\nDisallow: /homepage/complete.html\nSitemap: ${cfg.origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
 await fs.writeFile(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${cfg.indexable?`<url><loc>${escape(canonical)}</loc></url>`:''}</urlset>`);
 await fs.writeFile(path.join(output,'_headers'),'/homepage/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n');
 return cfg;
}
