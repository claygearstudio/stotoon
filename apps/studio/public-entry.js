(()=>{
const notify=(message,percent,extra={})=>parent.postMessage({type:'stotoon-ready',message,percent,...extra},location.origin);
const home=document.createElement('a');home.href='/homepage/';home.target='_top';home.className='workspace-home';home.innerHTML='<img src="/homepage/assets/logo.svg" width="132" height="32" alt="stotoon"><span>홈페이지 ↗</span>';home.title='홈페이지로 돌아가기';document.querySelector('header .brand')?.remove();home.setAttribute('aria-label','홈페이지로 돌아가기');document.querySelector('header').prepend(home);
document.querySelector('.subbar a').remove();
const status=document.querySelector('#flow-status');status.textContent='브라우저 저장 · 원고 → 컷·레이어 → 배치와 저장';
const flow=window.editorFlow;flow.request=()=>note('AI 생성은 연결하지 않았습니다. 인물·대사·레이어를 직접 편집하거나 수정 메모를 남겨 주세요.');
async function ready(){
try{notify('이야기와 컷 구성 준비 완료 · 이미지 확인 중',15);const urls=[...new Set([...document.querySelectorAll('img[src],image[href]')].map(e=>new URL(e.getAttribute('src')||e.getAttribute('href'),location.href).href))];let completed=0;let failures=0;
await Promise.all(urls.map(url=>new Promise(resolve=>{const im=new Image();im.onload=()=>{completed++;notify(`이미지·레이어 ${completed} / ${urls.length} 준비`,15+Math.round(completed/urls.length*80));resolve()};im.onerror=()=>{failures++;resolve()};im.src=url;})));
if(failures)throw Error('일부 이미지를 불러오지 못했습니다. 다시 시도해 주세요.');screen(new URLSearchParams(location.search).get('entry')==='edit'?'edit':'story');notify('작업실 준비 완료',100,{ready:true});
}catch(error){notify(error.message,0,{error:true})}}
ready();
})();
