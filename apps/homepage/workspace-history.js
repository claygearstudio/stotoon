(()=>{
const key='stotoon-public-workspace-v1',clone=v=>JSON.parse(JSON.stringify(v));
let last=objectEditor.snapshot(),past=[],future=[],restoring=false;
const initial=clone(last),undo=document.querySelector('#undo'),redo=document.querySelector('#redo');
const buttons=()=>{undo.disabled=!past.length;redo.disabled=!future.length;};
function commit(label='레이어 편집'){if(restoring)return;const next=objectEditor.snapshot();if(JSON.stringify(next)===JSON.stringify(last))return;past.push(clone(last));if(past.length>40)past.shift();future=[];last=clone(next);buttons();note(label+' · 저장 버튼으로 보관하세요.');}
function restore(value){restoring=true;objectEditor.restore(value);document.querySelector('#selected-title').textContent='레이어 선택';last=clone(value);setTimeout(()=>{restoring=false;buttons();},0);}
window.projectHistory={flush:commit};
document.addEventListener('editor-change',()=>commit());
undo.onclick=()=>{if(!past.length)return;future.push(clone(last));restore(past.pop());note('실행 취소했습니다.');};
redo.onclick=()=>{if(!future.length)return;past.push(clone(last));restore(future.pop());note('다시 실행했습니다.');};
document.querySelector('#save').onclick=()=>{try{localStorage.setItem(key,JSON.stringify({schema:1,objects:objectEditor.snapshot()}));note('이 브라우저에 저장했습니다.');}catch{note('저장 공간을 사용할 수 없습니다. 브라우저 설정을 확인하세요.');}};
document.querySelector('#load').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(!saved){note('이 브라우저에 저장된 작품이 없습니다.');return;}if(saved.schema!==1||!saved.objects||Object.keys(saved.objects).sort().join()!==Object.keys(initial).sort().join())throw Error();const clean=clone(initial);for(const id of Object.keys(initial)){const r=saved.objects[id];for(const k of ['x','y','scale','angle','flip','opacity','order']){if(typeof r[k]!=='number'||!Number.isFinite(r[k])||Math.abs(r[k])>100000)throw Error();clean[id][k]=r[k];}if(r.scale<=0||r.opacity<0||r.opacity>1)throw Error();for(const k of ['hidden','locked','deleted'])clean[id][k]=Boolean(r[k]);}past.push(clone(last));future=[];restore(clean);note('저장된 레이어 위치와 크기를 불러왔습니다.');}catch{note('저장 데이터가 올바르지 않아 불러오지 않았습니다.');}};
document.querySelector('#reset').onclick=()=>{past.push(clone(last));future=[];restore(initial);note('처음 배치로 되돌렸습니다. 실행 취소할 수 있습니다.');};
document.querySelector('#select-person').onclick=()=>objectEditor.select(Object.keys(initial).find(id=>id.includes('draco')));
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?redo:undo).click();}return;}const a={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(a&&objectEditor.selection().length){e.preventDefault();objectEditor.act(a);}});
})();
