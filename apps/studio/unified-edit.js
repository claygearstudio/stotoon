/* One project history and one character setup shared by story and editing. */
(()=>{
const $=s=>document.querySelector(s),clone=x=>JSON.parse(JSON.stringify(x));
const bar=$('.flowbar');const buttons=document.createElement('div');buttons.className='project-history';buttons.innerHTML='<button id="project-undo" disabled title="실행 취소 · Ctrl+Z">↶ 실행 취소</button><button id="project-redo" disabled title="다시 실행 · Ctrl+Shift+Z">↷ 다시 실행</button><span id="history-status" aria-live="polite"></span>';bar.insertBefore(buttons,$('#flow-save'));
let past=[],future=[],last=null,busy=false,timer;const limit=40;
const capture=()=>{const v=editorFlow.capture();delete v.time;return v};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function update(){ $('#project-undo').disabled=!past.length;$('#project-redo').disabled=!future.length;$('#project-undo').title=past.length?'실행 취소: '+past.at(-1).label+' · Ctrl+Z':'되돌릴 변경 없음';$('#project-redo').title=future.length?'다시 실행: '+future.at(-1).label+' · Ctrl+Shift+Z':'다시 실행할 변경 없음'; }
function commit(label='편집'){clearTimeout(timer);if(busy||!last)return;const now=capture();if(!equal(now,last)){past.push({before:last,after:now,label});if(past.length>limit)past.shift();future=[];last=now;$('#history-status').textContent=label;$('#flow-status').textContent='변경됨 · 버전 저장으로 전체 작업 보관';update()}}
function queue(label,delay=0){if(busy||!last)return;clearTimeout(timer);timer=setTimeout(()=>commit(label),delay)}
function travel(redo){if(busy)return;commit();const stack=redo?future:past;if(!stack.length)return;const item=stack.pop();(redo?past:future).push(item);busy=true;const ids=objectEditor.selection();const scroll=$('.canvas').scrollTop;editorFlow.restoreForHistory(clone(redo?item.after:item.before));setTimeout(()=>{if(ids.length){objectEditor.clear();for(const id of ids)objectEditor.select(id,true)}$('.canvas').scrollTop=scroll;last=capture();busy=false;$('#history-status').textContent=(redo?'다시 실행 · ':'실행 취소 · ')+item.label;update()},0)}
$('#project-undo').onclick=()=>travel(false);$('#project-redo').onclick=()=>travel(true);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.closest('.project-history'))return;if(b.matches('#layer-undo,#auto-undo,[data-oact="undo"]')){e.preventDefault();e.stopImmediatePropagation();travel(false);return}queue(b.textContent.trim().slice(0,24)||'편집');},true);
document.addEventListener('input',e=>{if(e.target.closest('#character-setup'))return;queue(e.target.id==='story-document'?'작품 노트 수정':'입력 수정',500)});
document.addEventListener('change',e=>{if(!e.target.closest('#character-setup'))queue('설정 변경')});
document.addEventListener('pointerup',()=>queue('배치 변경'));
document.addEventListener('drop',()=>queue('레이어 순서 변경'));
document.addEventListener('editor-change',()=>queue('객체 편집'));
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;if(e.target.matches('input,textarea,[contenteditable=true]'))return;const k=e.key.toLowerCase();if(k==='z'||k==='y'){e.preventDefault();travel(k==='y'||e.shiftKey)}});
document.addEventListener('project-restored',()=>{busy=true;clearTimeout(timer);setTimeout(()=>{past=[];future=[];last=capture();busy=false;$('#history-status').textContent='버전 불러옴 · 새 편집 이력';update()},0)});
window.projectHistory={flush:commit,undo:()=>travel(false),redo:()=>travel(true)};
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{last=capture();update()},0));

const defaults=[{id:'draco',name:'말포이',image:'/studio/assets/01/art-draco.webp',appearance:'백금색 긴 머리 · 초록 계열 의상 · 기존 얼굴과 그림체 유지',voice:'체면을 중시하고 짧게 받아친다.',locked:true},{id:'granger',name:'그레인저',image:'/studio/assets/01/art-granger.webp',appearance:'갈색 곱슬머리 · 붉은 계열 의상 · 기존 얼굴과 그림체 유지',voice:'관찰과 근거를 중시하고 틀린 말을 정정한다.',locked:true}];
const dialog=document.createElement('section');dialog.id='character-setup';dialog.setAttribute('aria-labelledby','character-title');let destination='edit',inlineActive=false;
function mountCharacters(){if(!inlineActive)return;const host=$('#story .story-result');if(host&&!host.contains(dialog)){host.classList.add('characters-visible');host.append(dialog);}}
dialog.showModal=()=>{inlineActive=true;mountCharacters();$('#project-characters').setAttribute('aria-pressed','true');};
dialog.close=()=>{inlineActive=false;dialog.remove();$('#story .story-result')?.classList.remove('characters-visible');$('#project-characters').setAttribute('aria-pressed','false');};
new MutationObserver(mountCharacters).observe($('#story'),{childList:true});
document.addEventListener('project-restored',()=>{if(inlineActive){dialog.close();openCharacters(destination);}});
function openCharacters(next='edit'){
 if(inlineActive){screen('story');mountCharacters();return;}screen('story');commit();destination=next;const s=storyWorkspace.snapshot(),profiles=s.characterProfiles||defaults;
 dialog.innerHTML=`<div class="row"><h2 id="character-title">작품 캐릭터 기준</h2><button id="character-close" aria-label="캐릭터 설정 닫기">닫기 ×</button></div><p class="character-scope">이 작품 전체에서 함께 사용할 기준 · ${comicPanels.length}컷</p><div class="character-grid">${profiles.map((p,i)=>`<section class="character-card"><img src="${esc(p.image)}" alt="${esc(p.name)} 기준 이미지"><div><h3>${esc(p.name)}</h3><label for="char-look-${i}">유지할 외형·의상</label><textarea id="char-look-${i}" maxlength="1000">${esc(p.appearance)}</textarea><label for="char-voice-${i}">성격·말투</label><textarea id="char-voice-${i}" maxlength="1000">${esc(p.voice)}</textarea><label class="character-lock"><input id="char-lock-${i}" type="checkbox" ${p.locked?'checked':''}> 외형 고정 기준으로 사용</label></div></section>`).join('')}</div><label for="character-notes">원고의 인물·관계 설정</label><textarea id="character-notes">${esc(s.fields.characters)}</textarea><p class="muted">기준은 이야기와 컷 편집에서 함께 사용합니다. 기존 그림은 그대로이며, 변경한 기준으로 다시 그리는 작업은 별도로 요청합니다.</p><div class="character-footer"><button id="character-cancel">취소</button><button id="character-apply">기준 저장</button></div>`;
 dialog.showModal();
 $('#character-close').onclick=$('#character-cancel').onclick=()=>dialog.close();
 const apply=go=>{const nextProfiles=profiles.map((p,i)=>({...p,appearance:$('#char-look-'+i).value.trim(),voice:$('#char-voice-'+i).value.trim(),locked:$('#char-lock-'+i).checked}));if(nextProfiles.some(p=>!p.appearance||!p.voice)){note('외형과 성격·말투 기준을 입력해 주세요.');return}const notes=$('#character-notes').value.trim();storyWorkspace.setProfiles(nextProfiles);storyWorkspace.apply('characters',notes);commit('캐릭터 기준 변경');editorFlow.save();if(go){if(destination==='handoff')editorFlow.handoff();else{screen('edit');$('#hint').textContent='작품 캐릭터 기준을 저장했습니다. 수정할 컷이나 인물을 선택하세요.'}}else note('캐릭터 기준 저장됨');};
 $('#character-apply').onclick=()=>apply(false);dialog.showModal();
}
window.characterSetup={open:openCharacters};
const characterButton=document.createElement('button');characterButton.id='project-characters';characterButton.textContent='캐릭터 기준';characterButton.onclick=()=>openCharacters('edit');bar.insertBefore(characterButton,buttons);
// All former character entry points lead to the same project-level editor.
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;const text=b.textContent.trim();if(b.matches('#story-preview')){e.preventDefault();e.stopImmediatePropagation();openCharacters('handoff');return}if(b.matches('[data-field-tab="characters"]')||['캐릭터','캐릭터 기준 보기 ↗','캐릭터 설정 보기','인물·말투 기준 ↗'].includes(text)){e.preventDefault();e.stopImmediatePropagation();openCharacters('edit');}},true);
// The former separate wizard is now a guide into the same story/character workspace.
$('#journey-start').onclick=()=>{$('#story-help').showModal()};
})();
