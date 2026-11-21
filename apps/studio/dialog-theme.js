(()=>{
 const css=document.createElement('link');css.rel='stylesheet';css.href='/studio/dialog-theme.css';document.head.append(css);
 let sequence=0;
 function decorate(){for(const dialog of document.querySelectorAll('dialog')){
  const title=dialog.querySelector('h2');if(title){if(!title.id)title.id='workspace-dialog-title-'+(++sequence);dialog.setAttribute('aria-labelledby',title.id);}
  const heading=dialog.querySelector(':scope>h2'),close=dialog.querySelector(':scope>button');
  if(heading&&close&&/^(닫기|닫기 ×|×)$/.test(close.textContent.trim())){const row=document.createElement('div');row.className='dialog-heading';heading.before(row);row.append(heading,close);close.setAttribute('aria-label','닫기');}
 }}
 decorate();new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&!e.altKey){e.preventDefault();e.stopImmediatePropagation();if(document.querySelector('dialog[open]'))return;document.querySelector('#flow-save')?.click();}},true);
})();
