(()=>{
const frame=document.querySelector('#editor'),status=document.querySelector('#status'),bar=document.querySelector('#progress'),retry=document.querySelector('#retry');
if(new URLSearchParams(location.search).get('entry')==='edit')frame.src='editor.html?entry=edit';
let timer=setTimeout(()=>{status.textContent='준비가 오래 걸리고 있습니다. 연결을 확인한 뒤 다시 시도해 주세요.';retry.hidden=false;},45000);
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow)return;const m=event.data;if(m?.type!=='stotoon-ready')return;status.textContent=m.message;bar.value=m.percent||0;if(m.error){clearTimeout(timer);retry.hidden=false;}if(m.ready){clearTimeout(timer);document.body.classList.add('ready');frame.removeAttribute('aria-hidden');document.title='스토툰 · 작업실';}});
retry.onclick=()=>location.reload();
})();
