function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  localStorage.setItem('brainify_theme',t);
  document.querySelectorAll('.n-topt').forEach(e=>e.classList.toggle('active',e.dataset.t===t));
}
document.addEventListener('DOMContentLoaded',function(){
  var s=localStorage.getItem('brainify_theme')||'dark';
  setTheme(s);
  document.querySelectorAll('.n-topt').forEach(e=>e.addEventListener('click',function(){setTheme(this.dataset.t)}));
});
