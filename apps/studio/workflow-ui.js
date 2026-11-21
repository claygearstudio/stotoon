/* Navigation and presentation improvements; generation remains an explicit demo. */
(()=>{
const $=s=>document.querySelector(s);
$('#journey-start').textContent='사용 예시';
$('#journey-start').title='예시 작품으로 전체 과정을 살펴봅니다';
$('#nav-layout').innerHTML='<b>3</b> 읽기·내보내기';
$('#flow-save').textContent='버전 저장';
$('#flow-save').title='이야기·캐릭터·대사·레이어·조판을 이 브라우저에 함께 저장';
$('#flow-status').textContent='프로젝트 버전은 수동 저장 · AI 생성은 예시';
$('.tag').textContent=comicPanels.length+'컷 · 1화';
$('.rail h3').textContent='컷 목록 · '+comicPanels.length+'컷';
$('.subbar .muted').childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace('10컷',comicPanels.length+'컷')});
const originalScreen=screen;
screen=function(mode){originalScreen(mode);$('#next').textContent=mode==='layout'?'← 편집으로 돌아가기':'읽기 미리보기 →';if(mode==='layout'){$('#selected-title').textContent='읽기·내보내기';$('#hint').textContent='독자가 보는 화면 · 여백과 대사 흐름을 확인하세요'} };
const exportButton=document.createElement('button');exportButton.id='read-export';exportButton.className='primary';exportButton.textContent='내보내기 선택 →';exportButton.onclick=()=>editorFlow.exportView();$('.inspector').append(exportButton);document.addEventListener('DOMContentLoaded',()=>{if(!$('#read-export'))$('.inspector').append(exportButton);$('#next').textContent='읽기 미리보기 →';document.querySelectorAll('.subbar .muted').forEach(el=>el.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replaceAll('10컷',comicPanels.length+'컷')}));});
function scope(){const host=$('#tool-content');if(!host)return;let n=host.querySelector('.scope-note');if(!n){n=document.createElement('p');n.className='scope-note';host.prepend(n)}const text='적용 범위 · '+selected+'컷'+(objectEditor.selection().length?' / 선택한 '+objectEditor.selection().length+'개 객체':'');if(n.textContent!==text)n.textContent=text;}
new MutationObserver(scope).observe($('#tool-content'),{childList:true});scope();
function storyLabels(){const auto=$('#story-auto'),manual=$('#story-manual');if(auto)auto.title='작품 노트만 자동 저장합니다. 컷 편집과 조판은 상단 버전 저장을 사용하세요.';if(manual&&manual.textContent!=='노트 저장')manual.textContent='노트 저장';const input=$('#story-input');if(input&&!input.dataset.shortcut){input.dataset.shortcut='true';input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('#flow-send')?.click()}});input.title='Ctrl+Enter로 보내기';}}
new MutationObserver(storyLabels).observe($('#story'),{childList:true,subtree:true});storyLabels();
let pending=false;function markPending(){if(pending)return;pending=true;$('#flow-status').textContent='편집 중 · 버전 저장으로 전체 작업 보관';}
document.addEventListener('input',e=>{if(e.target.closest('#tool-content,#layout-tools'))markPending()});
document.addEventListener('click',e=>{if(e.target.closest('[data-oact],.layer-control,#auto-apply,#auto-original,#auto-lock,#list-group,#list-ungroup'))markPending();if(e.target.closest('#flow-save'))pending=false;});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();editorFlow.save();pending=false}});
})();
