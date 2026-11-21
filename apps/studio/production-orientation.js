/* Production planning is separate from the prepared artwork fixture. */
(()=>{
const $=s=>document.querySelector(s), FREE=10;
const plan=()=>storyWorkspace.snapshot().productionPlan||{};
const length=p=>p.min?(p.max>p.min?`${p.min}~${p.max}컷`:`${p.min}컷`):'대화로 정하기';
const mode=()=>$('#nav-story').classList.contains('active')?'story':$('#workspace').classList.contains('layoutmode')?'layout':'edit';
const bar=document.createElement('section');bar.className='production-orientation';bar.setAttribute('aria-label','작업 단계와 제작 분량');
bar.innerHTML='<div class="orientation-task"><strong id="stage-purpose"></strong><span id="stage-description"></span></div><div class="orientation-count"><strong id="panel-progress"></strong><span id="production-target"></span></div><button id="production-open">제작 분량 정하기</button><button id="stage-next" class="primary"></button>';
$('.flowbar').after(bar);
const dialog=document.createElement('dialog');dialog.id='production-dialog';dialog.setAttribute('aria-labelledby','production-title');document.body.append(dialog);
function close(){dialog.close()}
function open(candidate){
 const p=candidate||plan();
 dialog.innerHTML=`<div class="row"><h2 id="production-title">이야기와 함께 제작 분량 정하기</h2><button id="production-close" aria-label="제작 분량 닫기">닫기 ×</button></div><p>이야기에서 어디까지 보여줄지 상의한 뒤, 원하는 컷 수나 범위를 정합니다.</p><div class="plan-policy"><b>무료 기본 ${FREE}컷</b><span>임시 요금제안 · ${FREE}컷 초과 분량은 추가 이용 필요 · 가격 미정</span></div><form id="production-form"><div class="plan-fields"><label>목표 최소 컷 수<input id="production-min" type="number" min="1" max="999" step="1" required value="${p.min||''}" placeholder="예: 8"></label><label>목표 최대 컷 수<input id="production-max" type="number" min="1" max="999" step="1" value="${p.max||''}" placeholder="같으면 비워두세요"></label></div><label for="production-scope">이번 분량에 담을 이야기 · 시작과 끝</label><textarea id="production-scope" maxlength="1500" placeholder="어느 장면에서 시작하고 어디에서 마칠까요?">${esc(p.scope||'')}</textarea><p id="production-cost" class="plan-cost" aria-live="polite"></p><p>현재 준비된 작화는 <b>별도 체험 예제 ${comicPanels.length}컷</b>입니다. 목표 분량을 바꿔도 이 예제의 그림 수는 바뀌지 않습니다.</p><div class="flow-footer"><button type="button" id="production-cancel">취소</button><button type="submit" class="primary">이 분량으로 계획 저장</button></div></form>`;
 $('#production-close').onclick=close;$('#production-cancel').onclick=close;
 function quote(){const a=+$('#production-min').value,b=+$('#production-max').value||a;$('#production-cost').textContent=!a?'목표 컷 수를 입력하거나 이야기 대화에서 분량을 상의하세요.':b<a?'최대 컷 수는 최소 컷 수 이상이어야 합니다.':b>FREE?`목표 최대 ${b}컷 · 무료 ${FREE}컷 + 추가 이용 ${b-FREE}컷 (아직 결제·생성되지 않음)`:`목표 ${a===b?a:a+'~'+b}컷 · 무료 기본 한도 안에서 계획`}
 $('#production-min').oninput=quote;$('#production-max').oninput=quote;quote();
 $('#production-form').onsubmit=e=>{e.preventDefault();const min=+$('#production-min').value,max=+$('#production-max').value||min;if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min||max>999)return;
 storyWorkspace.setProductionPlan({min,max,scope:$('#production-scope').value.trim(),freeLimit:FREE,policy:'tentative',status:max>FREE?'additional-access-required':'within-free-limit'});close();update();note('제작 계획을 저장했습니다. 전체 버전 저장·JSON에도 포함됩니다.');if(max>FREE)access();};
 if(!dialog.open)dialog.showModal();
}
function access(){const p=plan();dialog.innerHTML=`<div class="row"><h2 id="production-title">추가 분량 이용 안내</h2><button id="production-close" aria-label="제작 분량 닫기">닫기 ×</button></div><div class="plan-policy"><b>목표 ${length(p)}</b><span>무료 기본 ${FREE}컷 · 추가 분량 ${Math.max(0,(p.max||0)-FREE)}컷</span></div><p>기본 한도를 넘는 제작은 추가 이용권으로 여는 흐름입니다. 무료 컷 수 10컷은 임시안이며, 유료 가격·이용권 조건은 아직 정하지 않았습니다.</p><p class="plan-cost">이 체험 화면에서는 결제하거나 새 작화를 생성하지 않습니다. 기존 ${comicPanels.length}컷 예제는 계속 둘러볼 수 있습니다.</p><div class="flow-footer"><button id="production-revise">분량 다시 상의하기</button><button id="production-example">기존 예제 둘러보기</button><button disabled>추가 이용권 · 가격 미정</button></div>`;$('#production-close').onclick=close;$('#production-revise').onclick=()=>open();$('#production-example').onclick=()=>{close();editorFlow.handoff()};if(!dialog.open)dialog.showModal();}
function update(){const m=mode(),n=comicPanels.length,p=plan();
 $('#panel-progress').textContent=m==='story'?`체험 예제 · 전체 ${n}컷`:`예제 전체 ${n}컷 · 현재 ${String(selected).padStart(2,'0')}컷`;
 $('#production-target').textContent=`제작 목표 ${length(p)} · 무료 ${FREE}컷`+(p.max>FREE?` · 추가 ${p.max-FREE}컷 필요`:'');
 const info={story:['1 · 이야기와 제작 분량 정하기','대화 → 인물·원고·목표 컷 수 확인 → 컷 구성','컷 구성 확인 →'],edit:['2 · 컷과 레이어 다듬기','왼쪽에서 컷·레이어 선택 → 오른쪽 도구로 수정 → 버전 저장','읽기 화면으로 →'],layout:['3 · 읽기와 내보내기','세로 흐름·여백 확인 → 버전 저장 → 프로젝트 JSON 내려받기','내보내기 선택 →']}[m];
 $('#stage-purpose').textContent=info[0];$('#stage-description').textContent=info[1];$('#stage-next').textContent=info[2];$('#production-open').textContent=p.min?'제작 분량·이용 안내':'제작 분량 정하기';
 $('.tag').textContent=`체험 예제 ${n}컷`;$('.rail h3').textContent=`예제 컷 목록 · 총 ${n}컷`;
 if(m!=='story')$('#selected-title').textContent=m==='layout'?`전체 ${n}컷 읽기 · 선택 ${selected}컷`:`전체 ${n}컷 중 ${String(selected).padStart(2,'0')}컷 편집`;
}
$('#production-open').onclick=()=>open();$('#stage-next').onclick=()=>{const m=mode();if(m==='story'){if(!plan().min){open();return;}$('#story-preview').click()}else if(m==='edit')screen('layout');else editorFlow.exportView()};
const oldScreen=screen;screen=function(s){oldScreen(s);update()};const oldPick=pick;pick=function(i,s){oldPick(i,s);update()};
function patchStory(){const root=$('#story');let entry=$('#story-production');if(!entry){entry=document.createElement('button');entry.id='story-production';entry.onclick=()=>open();root.querySelector('.story-head')?.append(entry)}if(entry){const label=`제작 목표 ${length(plan())} · 무료 ${FREE}컷`;if(entry.textContent!==label)entry.textContent=label;}
 const outline=root.querySelector('[data-field-tab="outline"]');if(outline&&outline.textContent!=='예제 컷 흐름')outline.textContent='예제 컷 흐름';root.querySelectorAll('.story-footer .muted').forEach(e=>{if(/^1화 · \d+컷$/.test(e.textContent))e.textContent=`체험 예제 · ${comicPanels.length}컷`});
 const preview=$('#story-preview');if(preview&&!preview.dataset.productionGate){preview.dataset.productionGate='true';const original=preview.onclick;preview.onclick=e=>{if(!plan().min){open();return;}if(plan().max>FREE){access();return;}original?.call(preview,e)}}
 const send=$('#flow-send');if(send&&!send.dataset.production){send.dataset.production='true';const original=send.onclick;send.onclick=e=>{const input=$('#story-input').value;const match=input.match(/(\d{1,3})\s*(?:[~∼～-]\s*(\d{1,3}))?\s*컷/);original?.call(send,e);if(match){const min=+match[1],max=+(match[2]||match[1]);if(min>0&&max>=min)open({min,max,scope:input});}else if(/몇\s*컷|컷\s*수|제작\s*분량|분량.*정/.test(input))open();}}
}
new MutationObserver(()=>{patchStory();update()}).observe($('#story'),{childList:true,subtree:true});
document.addEventListener('production-plan-changed',update);document.addEventListener('project-restored',update);document.addEventListener('DOMContentLoaded',()=>{patchStory();screen('story')});
window.productionPlanning={open,access,snapshot:plan};patchStory();update();
})();
