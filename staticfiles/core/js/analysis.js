function sw(idx,btn){
  document.querySelectorAll('.view-pane').forEach(v=>v.classList.remove('on'));
  document.querySelectorAll('.vtab').forEach(t=>t.classList.remove('on'));
  var p=document.getElementById('v'+idx);
  if(p)p.classList.add('on');
  btn.classList.add('on');
}
function saveNotes(){
  var notes=document.getElementById('notesTA').value;
  fetch(window.__bfy_save_notes_url,{
    method:'POST',
    body:JSON.stringify({notes:notes}),
    headers:{'Content-Type':'application/json','X-CSRFToken':window.__bfy_csrf}
  }).then(r=>r.json()).then(d=>{
    if(d.success){
      var el=document.getElementById('saved-ok');
      el.style.display='flex';
      setTimeout(()=>el.style.display='none',2500);
    }
  });
}
