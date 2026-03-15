function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  localStorage.setItem('brainify_theme',t);
  document.querySelectorAll('.theme-opt').forEach(e=>e.classList.toggle('active',e.dataset.t===t));
}
document.addEventListener('DOMContentLoaded',function(){
  var s=localStorage.getItem('brainify_theme')||'dark';
  document.querySelectorAll('.theme-opt').forEach(e=>{
    e.classList.toggle('active',e.dataset.t===s);
    e.addEventListener('click',function(){setTheme(this.dataset.t);});
  });
});
