var isDark=document.documentElement.getAttribute('data-theme')==='dark';
Chart.defaults.color=isDark?'#555A7A':'#8898C8';
Chart.defaults.borderColor=isDark?'#252838':'#D8E0F0';
Chart.defaults.font.family="'Inter',system-ui,sans-serif";
new Chart(document.getElementById('act'),{type:'bar',data:{labels:window.__bfy_days,datasets:[{label:'Scans',data:window.__bfy_counts,backgroundColor:isDark?'rgba(107,159,255,0.15)':'rgba(59,110,240,0.1)',borderColor:isDark?'#6B9FFF':'#3B6EF0',borderWidth:2,borderRadius:6,hoverBackgroundColor:isDark?'rgba(107,159,255,0.3)':'rgba(59,110,240,0.2)'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:isDark?'#2E313A':'#E8ECF4'},ticks:{stepSize:1}}}}});
if(window.__bfy_sev && window.__bfy_sev.length > 0){
var sl=window.__bfy_sev.map(function(x){return x.severity.charAt(0).toUpperCase()+x.severity.slice(1)});
var sc=window.__bfy_sev.map(function(x){return x.n});
var clr={Normal:'#3DC87A',Mild:'#6B9FFF',Moderate:'#F0A030',Severe:'#F08030',Critical:'#F06060'};
new Chart(document.getElementById('sev'),{type:'doughnut',data:{labels:sl,datasets:[{data:sc,backgroundColor:sl.map(function(l){return clr[l]||'#4A5060'}),borderWidth:2,borderColor:isDark?'#161922':'#fff',hoverOffset:6}]},options:{responsive:true,cutout:'68%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,padding:10,font:{size:11}}}}}});
}
