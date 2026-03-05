function chkStr(v){
  var s=0;
  if(v.length>=8) s++;
  if(/[A-Z]/.test(v)) s++;
  if(/[0-9]/.test(v)) s++;
  if(/[^A-Za-z0-9]/.test(v)) s++;
  var colors=['#EE5555','#EE9A22','#E8B830','#1AD080'];
  var labels=['Weak','Fair','Good','Strong'];
  var c=s>0?colors[s-1]:'';
  var lbl=document.getElementById('pw-label');
  for(var i=1;i<=4;i++){
    var seg=document.getElementById('s'+i);
    seg.style.background=i<=s?c:'';
  }
  if(v.length===0){lbl.textContent='';lbl.style.color='';}
  else{lbl.textContent=labels[Math.max(0,s-1)];lbl.style.color=c;}
}
