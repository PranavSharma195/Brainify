const scansRaw = window.__bfy_scans_14;
const sevRaw   = window.__bfy_severity_data;
const typeRaw  = window.__bfy_scantype_data;

const defaults = {
  color:'#8fa3bf',
  font:{family:"'DM Mono', monospace", size:11},
};
Chart.defaults.color = defaults.color;
Chart.defaults.font  = defaults.font;

const gridColor = 'rgba(30,48,80,0.8)';
const tooltipOpts = {
  backgroundColor:'#111c2e', borderColor:'#1e3050', borderWidth:1,
  titleColor:'#e8f0fe', bodyColor:'#8fa3bf', padding:10,
};

// Scans over time
new Chart(document.getElementById('scansChart'), {
  type:'bar',
  data:{
    labels: scansRaw.map(d=>d.date),
    datasets:[{
      label:'Scans',
      data: scansRaw.map(d=>d.count),
      backgroundColor:'rgba(59,130,246,0.3)',
      borderColor:'rgba(59,130,246,0.8)',
      borderWidth:2, borderRadius:6, hoverBackgroundColor:'rgba(59,130,246,0.5)',
    }]
  },
  options:{
    responsive:true, plugins:{legend:{display:false}, tooltip:tooltipOpts},
    scales:{
      x:{grid:{color:gridColor}, ticks:{maxRotation:45}},
      y:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}},
    }
  }
});

// Severity doughnut
const sevColors = {normal:'#22c55e',mild:'#3b82f6',moderate:'#f59e0b',severe:'#ef4444',critical:'#dc2626',undefined:'#475569'};
new Chart(document.getElementById('severityChart'), {
  type:'doughnut',
  data:{
    labels: sevRaw.map(d=>d.severity ? d.severity.charAt(0).toUpperCase()+d.severity.slice(1) : 'Unknown'),
    datasets:[{
      data: sevRaw.map(d=>d.count),
      backgroundColor: sevRaw.map(d=>sevColors[d.severity]||'#475569'),
      borderColor:'#111c2e', borderWidth:3, hoverOffset:8,
    }]
  },
  options:{
    responsive:true, cutout:'65%',
    plugins:{
      legend:{position:'right', labels:{padding:14, boxWidth:12}},
      tooltip:tooltipOpts,
    }
  }
});

// Scan types bar
const typeColors=['#3b82f6','#06b6d4','#8b5cf6','#10b981','#f59e0b'];
new Chart(document.getElementById('scanTypeChart'), {
  type:'bar',
  data:{
    labels: typeRaw.map(d=>d.scan_type),
    datasets:[{
      label:'Count',
      data: typeRaw.map(d=>d.count),
      backgroundColor: typeRaw.map((_,i)=>typeColors[i%typeColors.length]+'55'),
      borderColor:     typeRaw.map((_,i)=>typeColors[i%typeColors.length]),
      borderWidth:2, borderRadius:8,
    }]
  },
  options:{
    responsive:true, plugins:{legend:{display:false}, tooltip:tooltipOpts},
    scales:{
      x:{grid:{display:false}},
      y:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}},
    }
  }
});

// Top users
const topUsersData = window.__bfy_top_users;
new Chart(document.getElementById('topUsersChart'), {
  type:'horizontalBar'||'bar',
  data:{
    labels: topUsersData.map(d=>d.name),
    datasets:[{
      label:'Scans',
      data: topUsersData.map(d=>d.count),
      backgroundColor:'rgba(139,92,246,0.3)',
      borderColor:'rgba(139,92,246,0.8)',
      borderWidth:2, borderRadius:6,
    }]
  },
  options:{
    indexAxis:'y', responsive:true,
    plugins:{legend:{display:false}, tooltip:tooltipOpts},
    scales:{
      x:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}},
      y:{grid:{display:false}},
    }
  }
});
