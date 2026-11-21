// A dedicated grip uses Pointer Events so touch scrolling and layer movement do not compete.
(()=>{
 const install=()=>{
 const box=document.querySelector('#cut-layers'),rail=document.querySelector('.rail');if(!box)return;
 let drag=null;
 const identify=row=>row?.dataset.layerId||row?.closest('.layer-group')?.querySelector('[data-layer-id]')?.dataset.layerId;
 const clear=()=>box.querySelectorAll('.drop-before,.drop-after,.dragging').forEach(n=>n.classList.remove('drop-before','drop-after','dragging'));
 const finish=(event,commit)=>{if(!drag||event.pointerId!==drag.pointer)return;const d=drag;drag=null;clear();if(box.hasPointerCapture(event.pointerId))box.releasePointerCapture(event.pointerId);if(commit&&d.target&&d.moved){const ok=window.objectEditor.reorder(d.id,d.target,d.after);if(ok)document.querySelector('#flow-status').textContent='레이어 순서 변경 · 실행 취소로 되돌릴 수 있습니다';}};
 box.addEventListener('pointerdown',e=>{
  const grip=e.target.closest('.layer-grip');if(!grip||e.button!==0||drag)return;
  const row=grip.closest('.layer-entry'),id=identify(row),records=Object.fromEntries(objectEditor.list()),r=records[id];if(!r)return;
  const members=Object.values(records).filter(v=>r.group?v.group===r.group:v===r);
  if(members.some(v=>v.locked)){document.querySelector('#flow-status').textContent='잠금을 해제한 뒤 순서를 바꾸세요';return;}
  e.preventDefault();drag={id,pointer:e.pointerId,y:e.clientY,moved:false,target:null};box.setPointerCapture(e.pointerId);row.classList.add('dragging');
 });
 box.addEventListener('dragstart',e=>{if(drag)e.preventDefault();},true);
 box.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;e.preventDefault();drag.moved ||= Math.abs(e.clientY-drag.y)>6;
  clear();const rect=box.getBoundingClientRect();if(e.clientY<rect.top+32)box.scrollTop-=14;else if(e.clientY>rect.bottom-32)box.scrollTop+=14;
  const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('.layer-entry');drag.target=row&&box.contains(row)?identify(row):null;
  if(!drag.target||drag.target===drag.id){drag.target=null;return;}
  drag.after=e.clientY>row.getBoundingClientRect().top+row.offsetHeight/2;row.classList.add(drag.after?'drop-after':'drop-before');
 });
 box.addEventListener('pointerup',e=>finish(e,true));box.addEventListener('pointercancel',e=>finish(e,false));box.addEventListener('lostpointercapture',e=>finish(e,false));
 function controls(){
  const heading=box.querySelector('h3');if(!heading||heading.querySelector('.layer-close'))return;
  const close=document.createElement('button');close.className='layer-close';close.textContent='닫기';close.setAttribute('aria-label','레이어 창 닫기');close.onclick=()=>{rail.classList.remove('layer-drawer');document.querySelector('#layers-toggle').setAttribute('aria-expanded','false');};heading.append(close);
  const actions=document.createElement('div');actions.className='layer-order-actions';
  for(const [step,label] of [[-1,'한 칸 앞으로'],[1,'한 칸 뒤로']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{
   const id=objectEditor.selection()[0],list=objectEditor.list(),r=list.find(([k])=>k===id)?.[1];if(!r){document.querySelector('#flow-status').textContent='이동할 그림 레이어를 먼저 선택하세요';return;}
   const ordered=list.filter(([,v])=>v.panel===r.panel).sort((a,b)=>b[1].order-a[1].order);const members=ordered.filter(([k,v])=>r.group?v.group===r.group:k===id);const edge=step<0?members[0]:members.at(-1);const target=ordered[ordered.indexOf(edge)+step];if(target)objectEditor.reorder(id,target[0],step>0);
  };actions.append(b);}heading.after(actions);
 }
 new MutationObserver(controls).observe(box,{childList:true,subtree:true});controls();
 };
 if(document.readyState==='complete')install();else window.addEventListener('load',install,{once:true});
})();
