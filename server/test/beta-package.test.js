import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {packageBeta,publicOptions} from '../../tools/beta-package.mjs';
async function fixture(fn){const output=await fs.mkdtemp(path.join(os.tmpdir(),'beta-public-'));try{await fn(output);}finally{await fs.rm(output,{recursive:true,force:true});}}
test('standalone public build has no private runtime dependencies or dead local links',()=>fixture(async output=>{
 await packageBeta({output});const html=await fs.readFile(path.join(output,'homepage/index.html'),'utf8');
 assert.match(html,/noindex,nofollow/);assert.doesNotMatch(html,/\/files\/|\/create\?|<details|SEO_SLOT|DEMO_SLOT|CREDIT_SLOT/);assert.match(html,/시연 영상을 준비/);
 for(const [,url]of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(url.startsWith('#'))assert.ok(html.includes(`id="${url.slice(1)}"`),url);else if(url.startsWith('/'))await fs.access(path.join(output,url.endsWith('/')?url+'index.html':url));}
 for(const name of ['style.css','studio.css','public.css']){const css=await fs.readFile(path.join(output,'homepage',name),'utf8');assert.doesNotMatch(css,/\/files\//);}
 assert.equal(await fs.readFile(path.join(output,'robots.txt'),'utf8'),'User-agent: *\nDisallow: /\n');
 assert.equal((html.match(/class="faq-item"/g)||[]).length,5);
}));
test('search release uses one HTTPS canonical, escaped credit and click-to-load video',()=>fixture(async output=>{
 await packageBeta({output,siteUrl:'https://beta.example.com',credit:'Example <owner>',videoUrl:'https://www.youtube.com/watch?v=abcdefghijk',indexable:true});
 const html=await fs.readFile(path.join(output,'homepage/index.html'),'utf8');assert.match(html,/content="index,follow"/);assert.match(html,/https:\/\/beta.example.com\/homepage\/assets\/share.png/);assert.match(html,/Example &lt;owner&gt;/);assert.match(html,/data-video="abcdefghijk"/);assert.doesNotMatch(html,/<iframe/);
 assert.match(await fs.readFile(path.join(output,'sitemap.xml'),'utf8'),/<loc>https:\/\/beta.example.com\/homepage\/<\/loc>/);
 const png=await fs.readFile(path.join(output,'homepage/assets/share.png'));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
}));
test('unconfirmed search release and unsafe asset configuration are rejected',()=>{
 for(const config of [{indexable:true},{siteUrl:'http://example.com'},{siteUrl:'https://example.com/path'},{videoUrl:'https://evil.example/watch?v=abcdefghijk'},{videoUrl:'https://youtube.com/watch?v=bad'}])assert.throws(()=>publicOptions(config));
});
test('packaging refuses stray secrets instead of silently publishing stale files',()=>fixture(async output=>{
 await fs.writeFile(path.join(output,'.env'),'fake-secret');await assert.rejects(packageBeta({output}),/허용 목록/);assert.equal(await fs.readFile(path.join(output,'.env'),'utf8'),'fake-secret');
}));
