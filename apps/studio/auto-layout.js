import {planLayout,validateLayout,balloonTail,GENRES,ROLES,VERSION} from '/webtoon-layout.mjs';
const key='stotoon:auto-layout:run-stotoon-ui-20261030:v1';
const original=lettering, originalPick=pick;
const seeds=['establish','detail','detail','setup','payoff','dialogue','dialogue','action','emotion','dialogue','reaction'];
const defaults={enabled:false,genre:'romance',pace:1,roles:Object.fromEntries(comicPanels.map((p,i)=>[p.id,seeds[i]||'dialogue'])),locked:{}};
let state=structuredClone(defaults),undo=[],lastPlan;
const originalPanels=structuredClone(comicPanels);
try{const s=JSON.parse(localStorage.getItem(key));if(s?.version===VERSION&&(s.ids===comicPanels.map(p=>p.id).join(',')||s.ids==='1,2,3,4,5,6,7,8,9,10')&&GENRES[s.state?.genre])state={...defaults,...s.state,roles:{...defaults.roles,...s.state.roles,...(s.ids==='1,2,3,4,5,6,7,8,9,10'?{10:'dialogue',11:'reaction'}:{})}};}catch{}
const host=document.createElement('section');host.id='auto-layout-tools';host.innerHTML=`<h3>장르별 자동 조판</h3><label class="field" for="auto-genre">이야기의 장르</label><select id="auto-genre">${Object.entries(GENRES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select><label class="field" for="auto-pace">읽는 호흡</label><select id="auto-pace"><option value="0.75">빠르게</option><option value="1">기본</option><option value="1.3">여유 있게</option></select><button class="primary wide" id="auto-apply">자동 조판 적용</button><div class="object-tools-grid"><button id="auto-undo">조판 실행 취소</button><button id="auto-original">기존 수동 조판</button></div><details><summary>선택한 컷 조정</summary><label class="field" for="auto-panel">컷</label><select id="auto-panel">${comicPanels.map(p=>`<option value="${p.id}">${p.id}컷</option>`).join('')}</select><label class="field" for="auto-role">이 컷의 역할</label><select id="auto-role">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><button class="wide" id="auto-lock">이 컷 배치 잠그기</button><p id="auto-reason" class="muted"></p></details><p id="auto-status" role="status" class="muted"></p><details><summary>검토 항목과 참고 기준</summary><ul id="auto-warnings"></ul><p class="muted">장르·컷 역할·대사량으로 배치합니다. 원본 그림을 늘리거나 새로 자르지 않습니다. 문맥과 이미지의 의미를 자동 판독하는 AI는 아닙니다.</p><a href="../run-auto-layout-research-20261031/index.html" target="_blank">참고 작품·설계 근거 보기 ↗</a></details>`;
document.querySelector('#layout-tools').prepend(host);
const legacy=document.createElement('details');legacy.innerHTML='<summary>수동 간격·내보내기</summary>';
for(const node of [...document.querySelector('#layout-tools').childNodes])if(node!==host)legacy.append(node);
document.querySelector('#layout-tools').append(legacy);
const close=document.createElement('button');close.textContent='미리보기 보기';close.className='wide';close.onclick=()=>document.body.classList.remove('inspector-open');host.append(close);
const shortcut=document.createElement('button');shortcut.textContent='자동 조판';shortcut.onclick=()=>{screen('layout');document.body.classList.add('inspector-open');host.scrollIntoView({block:'start'});};document.querySelector('.subbar').append(shortcut);
function inputs(){return comicPanels.map(p=>({id:p.id,role:state.roles[p.id],sceneId:'corridor',aspect:p.w/p.artH,lines:p.lines.map(l=>{const a=speakerAnchor(p,l,0);return {...l,speakerX:a?a[0]/720:null};}),edgeSafe:false,locked:!!state.locked[p.id],lockedLayout:state.locked[p.id]}));}
function getPlan(){return planLayout(inputs(),{genre:state.genre,pace:state.pace,viewportWidth:Math.min(500,document.querySelector('#panels').clientWidth-24),viewportHeight:window.innerHeight-180});}
function save(){try{localStorage.setItem(key,JSON.stringify({version:VERSION,ids:comicPanels.map(p=>p.id).join(','),state}));return true;}catch{return false;}}
function checkpoint(){undo.push(structuredClone(state));if(undo.length>20)undo.shift();}
function updateControls(){
 document.querySelector('#auto-genre').value=state.genre;document.querySelector('#auto-pace').value=String(state.pace);
 const id=+document.querySelector('#auto-panel').value;document.querySelector('#auto-role').value=state.roles[id]||'dialogue';
 document.querySelector('#auto-lock').textContent=state.locked[id]?'이 컷 잠금 해제':'이 컷 배치 잠그기';document.querySelector('#auto-undo').disabled=!undo.length;
 document.querySelector('#auto-reason').textContent=lastPlan?.panels.find(p=>p.id===id)?.reason.join(' · ')||'컷 역할을 정한 뒤 자동 조판을 적용하세요.';
}
function apply(){
 lastPlan=getPlan();const check=validateLayout(lastPlan);if(!check.valid){note('조판 범위 검사 실패: 기존 화면을 유지합니다.');return;}
 // Keep actual edited image nodes so object transforms/opacity and WeakMap edits survive relayout.
 const images=new Map();document.querySelectorAll('#panels article').forEach(p=>p.querySelectorAll('image').forEach((img,i)=>images.set(`${p.dataset.id}:${i}`,img)));
 comicPanels.forEach((p,i)=>{const v=state.enabled?lastPlan.panels[i]:originalPanels[i];Object.assign(p,{width:v.width,gap:v.gap,shape:v.shape,align:v.align});});
 renderComic();document.querySelectorAll('#panels article').forEach(p=>{p.style.paddingTop=state.enabled?lastPlan.panels.find(v=>v.id===+p.dataset.id).before+'px':'0px';p.querySelectorAll('image').forEach((img,i)=>{const old=images.get(`${p.dataset.id}:${i}`);if(old){delete old.dataset.objectBound;img.replaceWith(old);}});});
 originalPick(selected,false);if(document.querySelector('#workspace').classList.contains('layoutmode'))document.querySelector('#selected-title').textContent='읽는 흐름을 마무리해요';document.querySelector('#gap').disabled=state.enabled;const saved=save();document.querySelector('#auto-status').textContent=(state.enabled?`${GENRES[state.genre].label} · ${comicPanels.length}컷 적용`:'기존 수동 조판')+(saved?' · 이 브라우저에 저장됨':' · 브라우저 저장 실패');
 document.querySelector('#auto-warnings').innerHTML=lastPlan.warnings.length?lastPlan.warnings.map(w=>`<li>${w.id}컷: ${esc(w.message)}</li>`).join(''):'<li>글 영역 넘침·글끼리 겹침 검사 통과. 그림 품질 검수는 별도입니다.</li>';
 updateControls();
}
lettering=function(p){
 if(!state.enabled)return original(p);
 const q=getPlan().panels.find(x=>x.id===p.id);
 const edge=q.shape==='slant'?`<polygon points="0,${q.top+18} 720,${q.top} 720,${q.top+q.artHeight-18} 0,${q.top+q.artHeight}"/>`:`<rect x="0" y="${q.top}" width="720" height="${q.artHeight}"/>`;
 let svg=`<svg viewBox="0 0 720 ${q.height}" aria-label="${p.id}컷 그림과 분리된 대사"><defs><clipPath id="auto-edge-${p.id}">${edge}</clipPath><linearGradient id="auto-fade-${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="94%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient><mask id="auto-mask-${p.id}"><rect x="0" y="${q.top}" width="720" height="${q.artHeight}" fill="url(#auto-fade-${p.id})"/></mask></defs><g clip-path="url(#auto-edge-${p.id})" ${q.shape==='soft'?`mask="url(#auto-mask-${p.id})"`:''}>${sceneArt(p,q.top,q.artHeight)}</g>`;
 if(q.shape==='frame')svg+=`<rect x="1" y="${q.top}" width="718" height="${q.artHeight}" fill="none" stroke="#3b3b3b" stroke-width="1.5" pointer-events="none"/>`;
 for(const t of q.text){const l=p.lines[t.index],x=t.x,y=t.y,font=q.fontSize;if(l.hidden)continue;
  if(t.mode==='speech'){
   const anchor=speakerAnchor(p,l,q.top);let tail='';
   const geometry=balloonTail(t,anchor,q.text);
   if(geometry){const {base,end}=geometry;tail=`<path d="M${base[0].join(',')} L${end.join(',')} L${base[1].join(',')}" fill="white" stroke="#252525" stroke-width="2"/>`;}

   svg+=`<g class="auto-bubble" data-line="${t.index}" data-panel="${p.id}"><title>${esc(l.speaker||'화자 미정')} 대사</title>${tail}<ellipse cx="${x}" cy="${y}" rx="${t.w/2}" ry="${t.h/2}" fill="white" stroke="#252525" stroke-width="2"/>`;
  }else svg+='<g>';
  svg+=`<text text-anchor="middle" x="${x}" y="${y-(t.lines.length-1)*font*.625+font*.34}" style="font-family:p,'Malgun Gothic',sans-serif;font-size:${font}px;fill:#222">${t.lines.map((text,i)=>`<tspan x="${x}" dy="${i?font*1.25:0}">${esc(text)}</tspan>`).join('')}</text></g>`;
 }
 return svg+'</svg>';
};
document.querySelector('#auto-apply').onclick=()=>{checkpoint();state.genre=document.querySelector('#auto-genre').value;state.pace=+document.querySelector('#auto-pace').value;state.enabled=true;apply();};
document.querySelector('#auto-original').onclick=()=>{checkpoint();state.enabled=false;apply();};
document.querySelector('#auto-undo').onclick=()=>{if(undo.length){state=undo.pop();apply();}};
document.querySelector('#auto-panel').onchange=updateControls;
document.querySelector('#auto-role').onchange=e=>{checkpoint();const id=+document.querySelector('#auto-panel').value;state.roles[id]=e.target.value;if(state.enabled)apply();else{save();updateControls();}};
document.querySelector('#auto-lock').onclick=()=>{const id=+document.querySelector('#auto-panel').value;checkpoint();if(state.locked[id])delete state.locked[id];else state.locked[id]=structuredClone(getPlan().panels.find(p=>p.id===id));if(state.enabled)apply();else{save();updateControls();}};
document.querySelector('#panels').addEventListener('click',e=>{const b=e.target.closest('.auto-bubble');if(b){pick(+b.dataset.panel,false);document.body.classList.add('inspector-open');document.querySelector('#tool-content').innerHTML=letterEditor(+b.dataset.panel);document.querySelector('#line-choice').value=b.dataset.line;loadLine();screen('edit');}});
pick=function(i,s){originalPick(i,s);document.querySelector('#auto-panel').value=String(i);updateControls();};
if(state.enabled)apply();else updateControls();

window.autoLayoutEditor={snapshot:()=>structuredClone(state),restore:v=>{if(!v)return;state=structuredClone(v);apply();document.querySelector("#auto-genre").value=state.genre;document.querySelector("#auto-pace").value=state.pace;}};
