(()=>{
const key='stotoon-project-meta-v1',initial={title:'나의 이야기',episode:1,episodeTitle:'첫 번째 이야기'};
let meta={...initial};try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(stored&&typeof stored.title==='string')meta={...initial,...stored};}catch{}
const title=document.createElement('button');title.id='project-title';title.title='작품과 이번 화 제목 수정';document.querySelector('.flowbar').prepend(title);
const modal=document.createElement('dialog');modal.id='project-title-dialog';modal.setAttribute('aria-labelledby','project-title-heading');document.body.append(modal);
function reflect(){title.textContent=`${meta.title} · ${meta.episode}화${meta.episodeTitle?' '+meta.episodeTitle:''}`;const h=document.querySelector('.subbar h2');if(h)h.textContent=title.textContent;}
window.projectMeta={snapshot:()=>({...meta}),filename:()=>`${meta.title}-${meta.episode}화`.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,100),restore:v=>{meta={...initial,...v};reflect();}};
title.onclick=()=>{modal.innerHTML='<h2 id="project-title-heading">작품과 회차 제목</h2><label>작품 제목<input id="meta-title" maxlength="80"></label><label>회차<input id="meta-episode" type="number" min="1" max="9999"></label><label>이번 화 제목<input id="meta-episode-title" maxlength="80"></label><div class="dialog-actions"><button id="meta-cancel">취소</button><button id="meta-save" class="primary">제목 저장</button></div>';
modal.querySelector('#meta-title').value=meta.title;modal.querySelector('#meta-episode').value=meta.episode;modal.querySelector('#meta-episode-title').value=meta.episodeTitle;
modal.querySelector('#meta-cancel').onclick=()=>modal.close();modal.querySelector('#meta-save').onclick=()=>{const name=modal.querySelector('#meta-title').value.trim(),episode=Number(modal.querySelector('#meta-episode').value);if(!name||!Number.isInteger(episode)||episode<1||episode>9999){note('제목과 회차를 확인해 주세요');return;}meta={title:name,episode,episodeTitle:modal.querySelector('#meta-episode-title').value.trim()};try{localStorage.setItem(key,JSON.stringify(meta));}catch{}reflect();document.dispatchEvent(new Event('editor-change'));window.editorFlow.save();modal.close();note('제목 저장됨');};modal.showModal();};reflect();
const isMac=/Mac|iPhone|iPad/.test(navigator.platform),modifier=isMac?'⌘':'Ctrl';
const help=document.createElement('button');help.id='shortcut-help';help.textContent='단축키';help.title=isMac?'Mac 단축키':'키보드 단축키';document.querySelector('.flowbar').append(help);
const shortcuts=document.createElement('dialog');document.body.append(shortcuts);help.onclick=()=>{shortcuts.innerHTML=`<h2>${isMac?'Mac':'Windows'} 단축키</h2><dl><dt>실행 취소</dt><dd>${modifier} + Z</dd><dt>다시 실행</dt><dd>${modifier} + Shift + Z</dd><dt>여러 레이어 선택</dt><dd>Shift + 클릭</dd><dt>말풍선 수정</dt><dd>말풍선 더블클릭</dd></dl><p>글을 입력하는 동안에는 입력창의 실행 취소가 동작해요</p><button>닫기</button>`;shortcuts.querySelector('button').onclick=()=>shortcuts.close();shortcuts.showModal();};
const oldNote=note;note=t=>oldNote(String(t).replace(/\s*2D 편집 예시입니다\.?/g,'').replace(/[.,]$/,''));
document.querySelector('#toast').setAttribute('role','status');
})();
