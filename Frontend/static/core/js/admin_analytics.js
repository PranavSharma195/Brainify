Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = '#1e2d47';
Chart.defaults.font.family = "'DM Sans', sans-serif";

const scansLabels = window.__bfy_days;
const scansCounts = window.__bfy_counts;
const sevLabels   = window.__bfy_sev_labels;
const sevCounts   = window.__bfy_sev_counts;
const typeLabels  = window.__bfy_type_labels;
const typeCounts  = window.__bfy_type_counts;
const userDays    = window.__bfy_user_days;
const userCounts  = window.__bfy_user_counts;

const SEV_COLORS = {
  'Normal':'#22c55e','Mild':'#60a5fa','Moderate':'#f59e0b',
  'Severe':'#f97316','Critical':'#ef4444'
};
const TYPE_COLORS = ['#3b82f6','#22d3ee','#a78bfa','#f59e0b','#64748b'];

// Scans over time
new Chart(document.getElementById('scansChart'),{
  type:'bar',
  data:{labels:scansLabels,datasets:[{
    label:'Scans',data:scansCounts,
    backgroundColor:'rgba(59,130,246,0.25)',
    borderColor:'#3b82f6',borderWidth:2,borderRadius:6,
    hoverBackgroundColor:'rgba(59,130,246,0.45)'
  }]},
  options:{responsive:true,plugins:{legend:{display:false}},
    scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'#1e2d47'}}}}
});

// Severity donut
new Chart(document.getElementById('sevChart'),{
  type:'doughnut',
  data:{labels:sevLabels,datasets:[{
    data:sevCounts,
    backgroundColor:sevLabels.map(l=>SEV_COLORS[l]||'#64748b'),
    borderWidth:2,borderColor:'#111827',hoverOffset:8
  }]},
  options:{responsive:true,cutout:'70%',plugins:{legend:{display:false}}}
});

// Users chart
new Chart(document.getElementById('usersChart'),{
  type:'line',
  data:{labels:userDays,datasets:[{
    label:'New Users',data:userCounts,
    borderColor:'#22d3ee',backgroundColor:'rgba(34,211,238,0.1)',
    borderWidth:2,fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#22d3ee'
  }]},
  options:{responsive:true,plugins:{legend:{display:false}},
    scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'#1e2d47'}}}}
});

// Scan type pie
new Chart(document.getElementById('typeChart'),{
  type:'doughnut',
  data:{labels:typeLabels,datasets:[{
    data:typeCounts,backgroundColor:TYPE_COLORS,borderWidth:2,borderColor:'#111827',hoverOffset:6
  }]},
  options:{responsive:true,plugins:{legend:{position:'bottom',labels:{boxWidth:10,padding:10,font:{size:11}}}}}
});

// Status bar chart — build from page data
const statusData = {
  labels:['Completed','Processing','Failed','Pending'],
  datasets:[{
    data:[window.__bfy_completed,0,window.__bfy_total_scans-window.__bfy_completed,0],
    backgroundColor:['#22c55e','#f59e0b','#ef4444','#64748b'],
    borderRadius:6,borderWidth:0
  }]
};
new Chart(document.getElementById('statusChart'),{
  type:'bar',data:statusData,
  options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},
    scales:{x:{beginAtZero:true,grid:{color:'#1e2d47'}},y:{grid:{display:false}}}}
});

// Performance radar
new Chart(document.getElementById('perfChart'),{
  type:'bar',
  data:{
    labels:['Dice Score','IoU Score','Accuracy (÷100)'],
    datasets:[{
      label:'Average',
      data:[window.__bfy_avg_dice,window.__bfy_avg_iou,window.__bfy_avg_acc/100],
      backgroundColor:['rgba(59,130,246,0.4)','rgba(34,211,238,0.4)','rgba(167,139,250,0.4)'],
      borderColor:['#3b82f6','#22d3ee','#a78bfa'],borderWidth:2,borderRadius:8
    }]
  },
  options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},
    scales:{x:{min:0,max:1,grid:{color:'#1e2d47'}},y:{grid:{display:false}}}}
});
