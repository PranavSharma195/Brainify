function sw(id,btn){
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.pnav-item').forEach(t=>t.classList.remove('on'));
  document.getElementById('pane-'+id).classList.add('on');
  btn.classList.add('on');
}
function tgl(id,btn){
  var el=document.getElementById(id);
  el.type=el.type==='password'?'text':'password';
  btn.querySelector('.material-symbols-rounded').textContent=el.type==='password'?'visibility':'visibility_off';
}
