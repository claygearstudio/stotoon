(()=>{
const purpose={story:'이야기를 만들고 컷 구성을 확인하세요',edit:'컷과 레이어를 선택해 다듬으세요',layout:'읽는 흐름을 확인하고 내보내세요'};
function tidy(){const mode=document.querySelector('#nav-story').classList.contains('active')?'story':document.querySelector('#workspace').classList.contains('layoutmode')?'layout':'edit';const title=document.querySelector('#stage-purpose');if(title.textContent!==purpose[mode])title.textContent=purpose[mode];}
new MutationObserver(tidy).observe(document.querySelector('.production-orientation'),{childList:true,subtree:true});tidy();
const status=document.querySelector('#flow-status');if(status.textContent.includes('AI 생성은 예시'))status.textContent='대화·생성은 예시 · 편집 내용은 저장 가능';
})();
