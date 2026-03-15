var sel=null, fi=document.getElementById('fi'), db=document.getElementById('db');
fi.onchange=function(){if(fi.files[0])pick(fi.files[0])};
db.addEventListener('dragover',function(e){e.preventDefault();db.classList.add('over')});
db.addEventListener('dragleave',function(){db.classList.remove('over')});
db.addEventListener('drop',function(e){e.preventDefault();db.classList.remove('over');if(e.dataTransfer.files[0])pick(e.dataTransfer.files[0])});
function pick(f){sel=f;db.classList.add('got');document.getElementById('dbIcon').textContent='check_circle';document.getElementById('fi-name').textContent=f.name+' ('+(f.size/1024/1024).toFixed(1)+' MB)';document.getElementById('fi-info').classList.add('show')}
function adv(i){if(i>0){var p=document.getElementById('s'+(i-1));if(p){p.classList.remove('go');p.classList.add('done')}}var c=document.getElementById('s'+i);if(c)c.classList.add('go')}
function go(){
  if(!sel){alert('Please select an MRI file first.');return}
  var n=document.getElementById('pname').value.trim();
  if(!n){alert('Please enter the patient name.');document.getElementById('pname').focus();return}
  var fd=new FormData();
  fd.append('scan_file',sel);fd.append('patient_name',n);
  fd.append('patient_id',document.getElementById('pid').value);
  fd.append('patient_age',document.getElementById('page').value);
  fd.append('patient_gender',document.getElementById('pgender').value);
  fd.append('scan_type',document.getElementById('scantype').value);
  fd.append('priority',document.getElementById('priority').value);
  fd.append('notes',document.getElementById('pnotes').value);
  document.getElementById('ov').classList.add('on');
  document.getElementById('sub').disabled=true;
  var i=0;adv(0);
  var t=setInterval(function(){i++;if(i<=5)adv(i);else clearInterval(t)},2800);
  fetch(window.__bfy_upload_url,{method:'POST',body:fd,headers:{'X-CSRFToken':window.__bfy_csrf}})
  .then(function(r){if(!r.headers.get('content-type')||r.headers.get('content-type').indexOf('json')===-1)return r.text().then(function(){throw new Error('Server error — check terminal')});return r.json()})
  .then(function(d){clearInterval(t);if(d.success){window.location.href='/analysis/'+d.scan_id+'/';}else{document.getElementById('ov').classList.remove('on');document.getElementById('sub').disabled=false;alert('Error: '+(d.error||'Upload failed'))}})
  .catch(function(e){clearInterval(t);document.getElementById('ov').classList.remove('on');document.getElementById('sub').disabled=false;alert(e.message)});
}
