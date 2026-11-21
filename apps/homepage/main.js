const form=document.querySelector('#beta-form'),status=document.querySelector('#form-status'),submit=form.querySelector('button');submit.disabled=true;
const retry=document.createElement('button');retry.type='button';retry.className='button';retry.textContent='연결 다시 확인';retry.hidden=true;status.after(retry);
let config=null,loading=false;
async function requestJson(url,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(url,{...options,signal:controller.signal});let result;
 try{result=await response.json();}catch{throw Error('서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
 if(!response.ok){const error=Error(result.error||'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');error.status=response.status;throw error;}return result;
 }catch(error){if(error.name==='AbortError'||error.name==='TypeError')throw Error('연결이 지연되거나 끊겼습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.');throw error;}finally{clearTimeout(timer);}
}
const custom=document.createElement('label');custom.textContent='이용 목적 직접 입력 (선택)';const other=document.createElement('input');other.name='purposeOther';other.maxLength=100;custom.append(other);form.elements.purpose.closest('label').after(custom);custom.hidden=true;
form.elements.purpose.addEventListener('change',()=>{custom.hidden=form.elements.purpose.value!=='기타';});
const consent=form.querySelector('.consent span');consent.replaceChildren(document.createTextNode('베타 신청을 위한 개인정보 수집·이용에 동의합니다. '));const link=document.createElement('a');link.href='/homepage/privacy.html';link.target='_blank';link.rel='noopener noreferrer';link.textContent='처리방침·수집 안내 (새 탭)';consent.append(link);
function showConfig(cfg){
 submit.disabled=!cfg.open;submit.textContent=cfg.closedReason==='ended'?'모집 종료':cfg.mode==='live'?'베타 신청하기':'베타 신청 테스트';
 status.textContent=cfg.mode==='live'?'신청 정보는 비공개로 보관합니다.':'검토 모드입니다. 가상의 정보로 테스트해 주세요. 실제 알림 메일은 발송하지 않습니다.';
 if(!cfg.open)status.textContent=cfg.closedReason==='ended'?'베타 모집이 종료되었습니다.':'베타 신청 준비 중입니다.';
 document.querySelectorAll('.preview-label').forEach(e=>e.textContent=cfg.closedReason==='ended'?'BETA CLOSED':cfg.mode==='live'?(cfg.open?'BETA OPEN':'BETA 준비 중'):'LOCAL PREVIEW · 실제 모집 전');
 if(cfg.mode==='live')document.querySelector('.signup p').textContent=cfg.open?'스토툰의 첫 사용자가 되어 주세요.':cfg.closedReason==='ended'?'베타 모집이 마감되었습니다.':'베타 참여를 준비하고 있습니다.';
}
async function loadConfig(){
 if(loading)return;loading=true;retry.hidden=true;submit.disabled=true;status.textContent='신청 가능 여부를 확인하고 있습니다…';
 try{const cfg=await requestJson('/api/homepage/config');if(typeof cfg.open!=='boolean'||!['preview','live'].includes(cfg.mode)||typeof cfg.consentVersion!=='string')throw Error('신청 설정을 확인하지 못했습니다. 연결을 다시 확인해 주세요.');config=cfg;showConfig(cfg);}
 catch(error){config=null;status.textContent=error.message;retry.hidden=false;}
 finally{loading=false;}
}
retry.addEventListener('click',loadConfig);loadConfig();
fetch('/api/homepage/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'pageview'})}).catch(()=>{});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity()||submit.disabled||!config?.open)return;submit.disabled=true;form.setAttribute('aria-busy','true');status.textContent='신청 정보를 저장하고 있습니다…';
 try{const data=Object.fromEntries(new FormData(form));if(data.purpose==='기타'&&data.purposeOther.trim())data.purpose=data.purposeOther.trim();delete data.purposeOther;data.consent=form.elements.consent.checked;data.consentVersion=config.consentVersion;
 const result=await requestJson('/api/homepage/beta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 form.reset();custom.hidden=true;location.href='/homepage/complete.html?mode='+encodeURIComponent(result.mode);
 }catch(error){status.textContent=error.message;
 if(error.status===410||error.status===503){config.open=false;retry.hidden=false;submit.textContent=error.status===410?'모집 종료':'신청 준비 중';}
 else if(error.status===409){status.textContent+=' 이전 제출 중 연결이 끊겼다면 이미 저장되었을 수 있습니다. 다른 이메일로 다시 신청할 필요는 없습니다.';}
 submit.disabled=!config.open;
 }finally{form.removeAttribute('aria-busy');}
});
