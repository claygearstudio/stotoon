// Public workspace adapter. Uses the same object editing engine as the local workspace.
const continuityData={assets:{'scene-draco.png':{size:[1024,1536],box:[246,17,810,1518]}}};
let selected=1;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function note(text){document.querySelector('#status').textContent=text;}
function pick(id){selected=id;}
function renderComic(){document.querySelector('#panels').innerHTML='<section class="panel" data-id="1"><svg viewBox="0 0 1448 1086" role="img" aria-label="배경과 개별 인물 레이어를 편집하는 장면"><image data-layer="scene-background.png" href="/homepage/assets/scene-background.png" width="1448" height="1086"/><image data-layer="scene-draco.png" href="/homepage/assets/scene-draco.png" x="370" y="0" width="724" height="1086"/></svg></section>';}
window.editorFlow={request:()=>note('이 작업실에서는 배치와 크기를 직접 편집할 수 있습니다. AI 수정 요청은 연결하지 않았습니다.')};
renderComic();
