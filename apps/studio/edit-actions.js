// Real 2D controls and persistent editorial notes; no simulated image generation.
(()=>{
 const init=()=>{
  const flow=window.editorFlow,objects=window.objectEditor;
  if(!flow||!objects)return;
  const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
  const dialog=node('dialog');dialog.id='edit-actions-dialog';dialog.style.cssText='width:min(660px,94vw);max-height:85vh;overflow:auto;padding:24px';document.body.append(dialog);
  const button=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b;};
  const report=text=>{document.querySelector('#flow-status').textContent=text;};
  const open=title=>{const h=node('h2',title);h.id='edit-actions-title';dialog.replaceChildren(h,button('닫기',()=>dialog.close()));dialog.setAttribute('aria-labelledby',h.id);if(!dialog.open)dialog.showModal();};
  const notes=()=>{const value=flow.capture().requests;return Array.isArray(value)?value.filter(n=>n&&typeof n==='object'):[];};
  const store=value=>{flow.setRequests(value);report('수정 메모 변경됨 · 작품 저장을 눌러 보관하세요');};
  let filter='all';
  function list(){
   open('컷별 수정 메모');dialog.append(node('p','작품 저장과 전체 백업에 함께 보관됩니다. 완료 표시는 직접 확인한 작업에만 사용하세요.'));
   const filters=node('div');filters.className='memo-filters';for(const [value,label]of [['all','전체'],['open','검토 대기'],['resolved','확인 완료']]){const b=button(label,()=>{filter=value;list();});b.setAttribute('aria-pressed',String(filter===value));filters.append(b);}dialog.append(filters);const data=notes();if(!data.some(n=>filter==='all'||(n.status==='resolved'?'resolved':'open')===filter))dialog.append(node('p','이 상태의 메모가 없습니다.'));if(!data.length)dialog.append(node('p','등록된 메모가 없습니다. 컷의 수정 작업에서 메모를 남겨보세요.'));
   data.forEach((item,index)=>{if(filter!=='all'&&(item.status==='resolved'?'resolved':'open')!==filter)return;const row=node('article');row.style.cssText='border-top:1px solid #53664a;padding:15px 0';const complete=item.status==='resolved';row.append(node('strong',`${item.panel}컷 · ${complete?'확인 완료':'검토 대기'}`),node('p',String(item.text||'')),button('메모 수정',()=>editMemo(item,index)),button('해당 컷으로 이동',()=>{const panel=Number(item.panel);if(!flow.capture().panels.some(p=>p.id===panel)){report('해당 컷을 찾을 수 없습니다.');return;}dialog.close();screen('edit');pick(panel,true);report(`${panel}컷 수정 메모를 확인하세요`);}),button(complete?'다시 검토하기':'확인 완료로 표시',()=>{const current=notes();if(!current[index])return;current[index]={...current[index],status:complete?'open':'resolved'};store(current);list();}));dialog.append(row);});
  }
  function editMemo(item,index){
   open(`${item.panel}컷 메모 수정`);const input=node('textarea');input.value=String(item.text||'');input.maxLength=2000;input.rows=5;input.style.width='100%';input.setAttribute('aria-label','수정할 메모');const error=node('p');error.setAttribute('role','alert');dialog.append(input,error,button('수정 반영',()=>{const text=input.value.trim();if(!text){error.textContent='메모 내용을 입력하세요.';return;}const data=notes();const at=item.id?data.findIndex(n=>n.id===item.id):index;if(at<0||!data[at]){error.textContent='메모가 변경되었습니다. 목록에서 다시 선택하세요.';return;}data[at]={...data[at],text,updatedAt:new Date().toISOString()};store(data);list();}),button('목록으로 돌아가기',list));input.focus();
  }
  const entry=button('수정 메모',list);entry.id='revision-notes';document.querySelector('.flowbar').append(entry);
  flow.request=text=>{
   const panel=Number(selected);
   open(`${panel}컷 수정 작업`);
   dialog.append(node('p','배치·크기·회전은 선택한 객체에 바로 적용됩니다. 그룹에 속한 객체는 그룹 전체가 함께 변경됩니다. 얼굴·그림체·새 자세 생성 요청은 수정 메모로 보관하세요.'));
   const available=objects.list().filter(([,r])=>Number(r.panel)===panel);
   const choose=node('select');choose.setAttribute('aria-label','수정할 객체');choose.append(new Option('객체를 선택하세요',''));
   available.forEach(([id,r])=>choose.append(new Option(r.name+(r.locked?' · 잠김':''),id)));
   const selection=objects.selection();if(selection.length===1&&available.some(([id])=>id===selection[0]))choose.value=selection[0];
   const label=node('label','수정할 객체');label.append(choose);dialog.append(label);
   const feedback=node('p');feedback.setAttribute('role','status');
   const controls=node('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:16px 0';
   for(const [action,title] of [['left','왼쪽 12 이동'],['right','오른쪽 12 이동'],['up','위로 12 이동'],['down','아래로 12 이동'],['larger','5% 확대'],['smaller','크기 축소'],['rotate','15° 회전'],['flip','좌우 반전']])controls.append(button(title,()=>{
    const id=choose.value,r=objects.snapshot()[id];if(!r||r.deleted){feedback.textContent='먼저 수정할 객체를 선택하세요.';return;}if(r.locked){feedback.textContent='잠긴 객체입니다. 레이어 도구에서 잠금을 해제하세요.';return;}
    objects.select(id,false);const records=objects.snapshot();if(objects.selection().some(k=>records[k]?.locked)){feedback.textContent='선택한 그룹에 잠긴 객체가 있습니다. 잠금을 먼저 해제하세요.';return;}objects.act(action);feedback.textContent=title+' 적용됨 · 상단 실행 취소로 되돌릴 수 있습니다.';report(feedback.textContent+' 작품 저장이 필요합니다.');
   }));dialog.append(controls,feedback);
   const memo=node('textarea');memo.value=String(text||'');memo.maxLength=2000;memo.rows=3;memo.style.width='100%';memo.setAttribute('aria-label','컷 수정 메모');
   dialog.append(node('h3','다음에 확인할 수정 메모'),memo,button('수정 메모 등록',()=>{const value=memo.value.trim();if(!value){feedback.textContent='메모 내용을 입력하세요.';return;}const data=notes();if(data.length>=200){feedback.textContent='메모는 작품당 200개까지 보관할 수 있습니다.';return;}data.push({id:crypto.randomUUID(),panel,text:value,status:'open',createdAt:new Date().toISOString()});store(data);list();}));
  };
  document.querySelectorAll('#edit-tools .textbtn').forEach(b=>{if(b.textContent.includes('캐릭터 기준')){b.textContent='캐릭터 설정 편집 ↗';b.onclick=()=>window.characterSetup?.open();}});
 };
 if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
