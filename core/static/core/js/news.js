var ALL=[], SEEN_IDS=new Set(), FILTER='all';
var NOTIF_ON=window.__bfy_notif_on;
var toastTimer=null, firstLoad=true, countdown=90;
var cdEl=document.getElementById('countdown');

// Source configs
var REDDIT_SUBS=['braintumor','glioblastoma','braincancer','neuro_oncology','neurology','neuroscience'];
var BRAIN_SUBS=new Set(['braintumor','glioblastoma','braincancer','neuro_oncology']);

var KEYWORDS=['brain tumor','brain tumour','glioblastoma','glioma','meningioma','astrocytoma',
  'medulloblastoma','gbm','craniotomy','brain cancer','brain metastasis','oligodendroglioma',
  'who grade','idh mutation','pituitary tumor','acoustic neuroma','brain lesion','brain mass',
  'intracranial','brain hemorrhage','brain bleed','subdural hematoma','brain aneurysm',
  'hydrocephalus','brain cyst','brain edema','brain stroke','cerebral stroke','ischemic stroke',
  'brain mri','brain surgery','neurosurgery','seizure','epilepsy','neuro-oncology',
  'ms brain','white matter','brain research','cns tumor','brain abnormal','neurological',
  'cranial','temozolomide','bevacizumab','radiation brain','immunotherapy brain'];

function isRelevant(text, isBrainSub){
  if(isBrainSub) return true;
  var t=text.toLowerCase();
  return KEYWORDS.some(function(k){return t.includes(k);});
}
function getTag(text){
  var t=text.toLowerCase();
  if(t.includes('trial')||t.includes('clinical phase')) return 'clinical';
  if(t.includes('stroke')||t.includes('hemorrhage')||t.includes('bleed')||t.includes('aneurysm')||t.includes('vascular')) return 'stroke';
  if(t.includes('treatment')||t.includes('therapy')||t.includes('surgery')||t.includes('radiation')||t.includes('chemo')||t.includes('temozolomide')) return 'treatment';
  if(t.includes('diagnos')||t.includes('mri')||t.includes('biopsy')||t.includes('imaging')||t.includes('scan')) return 'diagnosis';
  if(t.includes('glioblastoma')||t.includes('gbm')||t.includes('glioma')||t.includes('tumor')||t.includes('tumour')||t.includes('cancer')||t.includes('meningioma')) return 'tumor';
  return 'research';
}
var TL={research:'Research',treatment:'Treatment',diagnosis:'Diagnosis',tumor:'Tumor',clinical:'Clinical Trial',stroke:'Stroke'};
var TC={research:'t-r',treatment:'t-t',diagnosis:'t-d',tumor:'t-g',clinical:'t-c',stroke:'t-s'};

function timeAgo(utc){
  var s=Math.floor(Date.now()/1000)-utc;
  if(s<30) return 'Just now';
  if(s<60) return s+'s ago';
  if(s<3600) return Math.floor(s/60)+'m ago';
  if(s<7200) return '1h '+Math.floor((s-3600)/60)+'m ago';
  if(s<86400) return Math.floor(s/3600)+'h ago';
  if(s<172800) return 'Yesterday';
  return Math.floor(s/86400)+'d ago';
}
function dateKey(utc){
  var d=new Date(utc*1000),td=new Date(),yd=new Date();
  yd.setDate(td.getDate()-1);
  if(d.toDateString()===td.toDateString()) return 'Today';
  if(d.toDateString()===yd.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
}
function fmt(n){return n>999?(n/1000).toFixed(1)+'k':String(n||0);}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function stripHtml(s){return String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();}

// ═══════════════════════════════════════════════════════
// SOURCE 1: REDDIT (direct browser fetch)
// ═══════════════════════════════════════════════════════
async function fetchReddit(){
  var posts=[], counts=0;
  var fetches=REDDIT_SUBS.map(async function(sub){
    try{
      var r=await fetch('https://www.reddit.com/r/'+sub+'/new.json?limit=50&raw_json=1',{headers:{'Accept':'application/json'},cache:'no-store'});
      if(!r.ok) return;
      var d=await r.json();
      (d.data&&d.data.children||[]).forEach(function(c){
        var p=c.data;
        if(!p) return;
        var isBrain=BRAIN_SUBS.has(sub);
        var txt=(p.title||'')+' '+(p.selftext||'');
        if(!isRelevant(txt,isBrain)) return;
        counts++;
        posts.push({
          id:'r_'+p.id, title:p.title||'', snippet:(p.selftext||'').slice(0,280),
          source:'Community', sourceBadge:'sb-reddit', sourceIcon:'forum',
          url:'https://reddit.com'+p.permalink, permalink:p.permalink,
          ups:p.ups||0, comments:p.num_comments||0,
          created_utc:parseInt(p.created_utc)||0,
          type:'reddit', subname:'Community Discussion',
        });
      });
    }catch(e){}
  });
  await Promise.allSettled(fetches);
  document.getElementById('src-reddit').textContent=counts+' articles';
  return posts;
}

// ═══════════════════════════════════════════════════════
// SOURCE 2: PubMed via NCBI E-utilities (public, no key)
// ═══════════════════════════════════════════════════════
async function fetchPubMed(){
  var posts=[], queries=['brain+tumor+glioblastoma','brain+tumor+treatment+2025','glioma+clinical+trial','brain+cancer+immunotherapy'];
  try{
    // Search for recent IDs
    var idSets=await Promise.allSettled(queries.map(async function(q){
      var r=await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term='+q+'&retmax=8&sort=date&retmode=json&usehistory=n',{cache:'no-store'});
      if(!r.ok) return [];
      var d=await r.json();
      return (d.esearchresult&&d.esearchresult.idlist)||[];
    }));
    var allIds=[]; var seen={};
    idSets.forEach(function(r){if(r.status==='fulfilled') r.value.forEach(function(id){if(!seen[id]){seen[id]=1;allIds.push(id);}});});
    if(!allIds.length) return [];

    // Fetch summaries
    var sumResp=await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id='+allIds.slice(0,20).join(',')+'&retmode=json',{cache:'no-store'});
    if(!sumResp.ok) return [];
    var sumData=await sumResp.json();
    var result=sumData.result||{};

    Object.keys(result).forEach(function(id){
      if(id==='uids') return;
      var a=result[id];
      if(!a.title) return;
      // Parse date
      var dStr=a.pubdate||a.epubdate||'';
      var utc=dStr?Math.floor(new Date(dStr).getTime()/1000):Math.floor(Date.now()/1000)-86400;
      var authors=(a.authors||[]).slice(0,2).map(function(x){return x.name;}).join(', ');
      posts.push({
        id:'pm_'+id, title:stripHtml(a.title),
        snippet:(authors?'Authors: '+authors+'. ':'')+((a.source||'')+' '+dStr).trim(),
        source:'Research', sourceBadge:'sb-pubmed', sourceIcon:'science',
        url:'https://pubmed.ncbi.nlm.nih.gov/'+id+'/',
        permalink:'', ups:0, comments:0, created_utc:utc,
        type:'external', subname:'Research Paper',
      });
    });
    document.getElementById('src-pubmed').textContent=posts.length+' papers';
  }catch(e){document.getElementById('src-pubmed').textContent='unavailable';}
  return posts;
}

// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// CORS PROXY HELPER — tries 3 proxies in order
// ═══════════════════════════════════════════════════════
async function proxyFetch(url){
  var proxies=[
    'https://api.allorigins.win/get?url='+encodeURIComponent(url),
    'https://corsproxy.io/?'+encodeURIComponent(url),
    'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(url),
  ];
  for(var i=0;i<proxies.length;i++){
    try{
      var r=await fetch(proxies[i],{cache:'no-store'});
      if(!r.ok) continue;
      var d=await r.json();
      var content=d.contents||d.body||'';
      if(typeof content==='string'&&content.length>100) return content;
    }catch(e){}
  }
  return '';
}
function parseRSS(xml){
  var items=[];
  var raw=xml.match(/<item[^>]*>([\s\S]*?)<\/item>/g)||[];
  raw.forEach(function(item){
    function g(tag){
      var m=item.match(new RegExp('<'+tag+'[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/'+tag+'>','i'));
      return m?m[1].trim():'';
    }
    var title=stripHtml(g('title'));
    var link=(g('link')||g('guid')).trim();
    var desc=stripHtml(g('description')||g('summary')||'');
    var pubDate=g('pubDate')||g('published')||g('updated')||'';
    if(title) items.push({title:title,link:link,desc:desc,pubDate:pubDate});
  });
  return items;
}

// ═══════════════════════════════════════════════════════
// SOURCE 3: Google News RSS
// ═══════════════════════════════════════════════════════
async function fetchGoogleNews(){
  var posts=[], seen={};
  var queries=['brain+tumor','glioblastoma','brain+cancer+research','brain+surgery'];
  try{
    var fetches=queries.map(async function(q){
      var rssUrl='https://news.google.com/rss/search?q='+q+'&hl=en-US&gl=US&ceid=US:en';
      var xml=await proxyFetch(rssUrl);
      if(!xml) return [];
      return parseRSS(xml).slice(0,8).filter(function(i){
        return isRelevant(i.title+' '+i.desc,false);
      }).map(function(i){
        var utc=i.pubDate?Math.floor(new Date(i.pubDate).getTime()/1000):Math.floor(Date.now()/1000)-3600;
        var uid='gn_'+(i.title+i.link).replace(/[^a-z0-9]/gi,'').slice(0,30);
        return {id:uid,title:i.title,snippet:i.desc.slice(0,280),source:'Medical News',
          sourceBadge:'sb-gnews',sourceIcon:'newspaper',url:i.link,permalink:'',ups:0,
          comments:0,created_utc:utc,type:'external',subname:'Medical News'};
      });
    });
    var results=await Promise.allSettled(fetches);
    results.forEach(function(r){
      if(r.status==='fulfilled') r.value.forEach(function(p){if(!seen[p.id]){seen[p.id]=1;posts.push(p);}});
    });
    document.getElementById('src-gnews').textContent=posts.length+' articles';
  }catch(e){document.getElementById('src-gnews').textContent='unavailable';}
  return posts;
}

// ═══════════════════════════════════════════════════════
// SOURCE 4: ScienceDaily RSS
// ═══════════════════════════════════════════════════════
async function fetchScienceDaily(){
  var posts=[], seen={};
  var feeds=[
    'https://www.sciencedaily.com/rss/health_medicine/brain_tumors.xml',
    'https://www.sciencedaily.com/rss/mind_brain/brain_cancer.xml',
  ];
  try{
    var fetches=feeds.map(async function(feedUrl){
      var xml=await proxyFetch(feedUrl);
      if(!xml) return [];
      return parseRSS(xml).slice(0,12).map(function(i){
        var utc=i.pubDate?Math.floor(new Date(i.pubDate).getTime()/1000):Math.floor(Date.now()/1000)-7200;
        var uid='sd_'+(i.title+i.link).replace(/[^a-z0-9]/gi,'').slice(0,30);
        return {id:uid,title:i.title,snippet:i.desc.slice(0,280),source:'Science Report',
          sourceBadge:'sb-science',sourceIcon:'biotech',url:i.link,permalink:'',ups:0,
          comments:0,created_utc:utc,type:'external',subname:'Science Report'};
      });
    });
    var results=await Promise.allSettled(fetches);
    results.forEach(function(r){
      if(r.status==='fulfilled') r.value.forEach(function(p){if(!seen[p.id]){seen[p.id]=1;posts.push(p);}});
    });
    document.getElementById('src-science').textContent=posts.length+' articles';
  }catch(e){document.getElementById('src-science').textContent='unavailable';}
  return posts;
}

// SOURCE 5: ClinicalTrials.gov API (public, no key)
// ═══════════════════════════════════════════════════════
async function fetchClinicalTrials(){
  var posts=[];
  try{
    var url='https://clinicaltrials.gov/api/v2/studies?query.cond=brain+tumor+OR+glioblastoma+OR+glioma&filter.overallStatus=RECRUITING&pageSize=15&sort=LastUpdatePostDate:desc&fields=NCTId,BriefTitle,BriefSummary,LastUpdatePostDate,OverallStatus,Phase,Condition';
    var r=await fetch(url,{headers:{'Accept':'application/json'},cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    var d=await r.json();
    (d.studies||[]).forEach(function(s){
      var proto=s.protocolSection||{};
      var id=proto.identificationModule||{};
      var desc=proto.descriptionModule||{};
      var status=proto.statusModule||{};
      var design=proto.designModule||{};
      var title=id.briefTitle||'';
      var nctId=id.nctId||'';
      var summary=(desc.briefSummary||'').slice(0,280);
      var dateStr=status.lastUpdatePostDateStruct&&status.lastUpdatePostDateStruct.date||'';
      var phase=(design.phases||[]).join(', ')||'';
      var utc=dateStr?Math.floor(new Date(dateStr).getTime()/1000):Math.floor(Date.now()/1000)-86400;
      if(!title) return;
      posts.push({
        id:'ct_'+nctId,
        title:'['+((phase||'Trial'))+'] '+title,
        snippet:'Recruiting · '+summary,
        source:'Clinical Trial', sourceBadge:'sb-trials', sourceIcon:'vaccines',
        url:'https://clinicaltrials.gov/study/'+nctId,
        permalink:'', ups:0, comments:0, created_utc:utc,
        type:'external', subname:'Clinical Trial',
      });
    });
    document.getElementById('src-trials').textContent=posts.length+' trials';
  }catch(e){document.getElementById('src-trials').textContent='unavailable';}
  return posts;
}

// ═══════════════════════════════════════════════════════
// MAIN LOAD
// ═══════════════════════════════════════════════════════
function mergeAndRender(newPosts, sourceLabel){
  // Merge into ALL, deduplicate, re-sort, re-render
  var seen={};
  ALL.forEach(function(p){seen[p.id]=1;});
  var added=[];
  newPosts.forEach(function(p){
    if(!seen[p.id]){seen[p.id]=1; ALL.push(p); added.push(p);}
  });
  ALL.sort(function(a,b){return b.created_utc-a.created_utc;});

  // Stats
  var today=new Date(); today.setHours(0,0,0,0);
  var todayCt=ALL.filter(function(p){return new Date(p.created_utc*1000)>=today;}).length;
  document.getElementById('stat-total').textContent=ALL.length;
  document.getElementById('stat-new').textContent=todayCt;
  var newest=ALL.length>0?ALL[0]:null;
  document.getElementById('last-upd').textContent=
    ALL.length+' articles · Newest: '+(newest?timeAgo(newest.created_utc):'—')+' · '+new Date().toLocaleTimeString();

  // Toasts: show 5-6 on first load, then new ones on refresh
  if(NOTIF_ON){
    var unseen=added.filter(function(p){return !SEEN_IDS.has(p.id);});
    if(firstLoad){
      // Show 5-6 toasts staggered on page load
      unseen.slice(0,6).forEach(function(p,i){
        setTimeout(function(){ showToast(p); }, 1200 + i*3500);
      });
    } else if(unseen.length>0){
      unseen.slice(0,3).forEach(function(p,i){
        setTimeout(function(){ showToast(p); }, i*3500);
      });
    }
  }
  added.forEach(function(p){SEEN_IDS.add(p.id);});
  renderFeed();
}

async function loadFeed(){
  var btn=document.getElementById('rbtn');
  btn.classList.add('spinning');
  ALL=[];
  document.getElementById('feed').innerHTML='<div class="feed-load"><div class="spin"></div><div style="font-size:13px;margin-top:6px">Loading news...</div></div>';
  document.getElementById('last-upd').textContent='Connecting to Brainify News...';

  // Reset source counts
  ['reddit','pubmed','gnews','science','trials'].forEach(function(s){
    var el=document.getElementById('src-'+s); if(el) el.textContent='...';
  });

  // Load community discussions first — fastest source
  fetchReddit().then(function(posts){
    if(posts.length>0){ mergeAndRender(posts,'community'); }
  });

  // Load other sources in parallel
  fetchPubMed().then(function(posts){ if(posts.length>0) mergeAndRender(posts,'research'); });
  fetchGoogleNews().then(function(posts){ if(posts.length>0) mergeAndRender(posts,'news'); });
  fetchScienceDaily().then(function(posts){ if(posts.length>0) mergeAndRender(posts,'science'); });
  fetchClinicalTrials().then(function(posts){ if(posts.length>0) mergeAndRender(posts,'trials'); });

  // After 12s, finalise regardless
  setTimeout(function(){
    if(firstLoad) firstLoad=false;
    countdown=90;
    btn.classList.remove('spinning');
    if(ALL.length===0){
      document.getElementById('feed').innerHTML=
        '<div class="feed-load">'+
        '<span class="material-symbols-rounded" style="font-size:36px;color:#334155">wifi_off</span>'+
        '<div style="font-size:14px;font-weight:700;color:var(--text);margin-top:8px">Could not load articles</div>'+
        '<div style="font-size:13px;color:var(--muted);margin-top:6px;text-align:center;max-width:360px">All sources failed to respond. This is usually caused by an ad-blocker or network restriction blocking external API requests.<br><br>Try: disable uBlock/Adblock for this page, or open Reddit.com to confirm it works.</div>'+
        '<button onclick="manualRefresh()" style="margin-top:16px;padding:9px 20px;background:#2b6cee;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">Try Again</button>'+
        '</div>';
      document.getElementById('last-upd').textContent='⚠ Could not reach news sources';
    }
  }, 12000);
}

// ═══════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════
function renderFeed(){
  var filtered=ALL.filter(function(p){return FILTER==='all'||getTag(p.title+' '+p.snippet)===FILTER;});
  if(!filtered.length){
    document.getElementById('feed').innerHTML='<div class="feed-load"><span class="material-symbols-rounded" style="font-size:36px;color:#334155">article</span><div style="font-size:13px;margin-top:8px">No articles for this filter</div></div>';
    return;
  }
  var groups={},order=[];
  filtered.forEach(function(p){
    var dk=dateKey(p.created_utc);
    if(!groups[dk]){groups[dk]=[];order.push(dk);}
    groups[dk].push(p);
  });
  var html='';
  order.forEach(function(dk){
    html+='<div class="ds">'+esc(dk)+'</div>';
    groups[dk].forEach(function(p){
      var tag=getTag(p.title+' '+p.snippet);
      var isReddit=p.type==='reddit';
      var actionBtn=isReddit
        ?'<button class="ac-btn" onclick="openComments(\''+esc(p.id)+'\',\''+esc(p.subname)+'\',\''+esc(p.permalink)+'\')"><span class="material-symbols-rounded">forum</span>Discussion ('+fmt(p.comments)+')</button>'
        :'<a class="ac-btn" href="'+esc(p.url)+'" target="_blank" rel="noopener"><span class="material-symbols-rounded">open_in_new</span>Read Full</a>';
      html+='<div class="ac" id="a-'+p.id+'"><div class="ac-in">'+
        '<div class="ac-meta">'+
          '<span class="ac-sub"><span class="material-symbols-rounded">'+p.sourceIcon+'</span>'+esc(p.subname)+'</span>'+
          '<span class="src-badge '+p.sourceBadge+'">'+esc(p.source)+'</span>'+
          '<span class="ac-tag '+(TC[tag]||'t-r')+'">'+(TL[tag]||'Research')+'</span>'+
          '<span class="ac-time">'+timeAgo(p.created_utc)+'</span>'+
        '</div>'+
        '<div class="ac-title">'+esc(p.title)+'</div>'+
        (p.snippet?'<div class="ac-body">'+esc(p.snippet)+'</div>':'')+
        '<div class="ac-foot">'+
          (isReddit?'<span class="ac-stat"><span class="material-symbols-rounded">thumb_up</span>'+fmt(p.ups)+'</span>':'<span></span>')+
          actionBtn+
        '</div>'+
      '</div></div>';
    });
  });
  document.getElementById('feed').innerHTML=html;
}

function setFilter(f,btn){FILTER=f;document.querySelectorAll('.fp').forEach(function(b){b.classList.remove('on');});btn.classList.add('on');renderFeed();}

// Reddit comments drawer
async function openComments(postId,sub,permalink){
  document.getElementById('cdBack').classList.add('open');
  document.getElementById('cdPanel').classList.add('open');
  document.body.style.overflow='hidden';
  var post=ALL.find(function(p){return p.id===postId;});
  document.getElementById('cd-sub').textContent='Community Discussion';
  document.getElementById('cd-title').textContent=post?post.title:'';
  var body=document.getElementById('cd-body');
  body.innerHTML='<div class="feed-load"><div class="spin"></div><div style="font-size:13px">Loading comments...</div></div>';
  try{
    var r=await fetch('https://www.reddit.com'+permalink+'.json?limit=50&raw_json=1',{headers:{'Accept':'application/json'}});
    var data=await r.json();
    var pd=data[0].data.children[0].data;
    var cmts=data[1].data.children.filter(function(c){return c.kind==='t1';});
    var h='';
    if(pd.selftext) h+='<div class="cd-post">'+esc(pd.selftext.slice(0,2000))+'</div>';
    h+='<div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">'+cmts.length+' Comments</div>';
    if(!cmts.length) h+='<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">No comments yet</div>';
    else cmts.forEach(function(c){
      var cd=c.data;
      if(!cd.body||cd.body==='[deleted]') return;
      h+='<div class="cmt"><div class="cmt-top"><span class="cmt-author">'+esc(cd.author)+'</span><span class="cmt-score"><span class="material-symbols-rounded">thumb_up</span>'+fmt(cd.ups)+'</span><span class="cmt-age">'+timeAgo(cd.created_utc)+'</span></div><div class="cmt-txt">'+esc((cd.body||'').slice(0,800))+'</div></div>';
    });
    body.innerHTML=h;
  }catch(e){
    body.innerHTML='<div class="feed-load" style="color:#f87171"><span class="material-symbols-rounded" style="font-size:30px">error</span><div style="font-size:13px;margin-top:8px">Could not load</div></div>';
  }
}
function closeComments(){document.getElementById('cdBack').classList.remove('open');document.getElementById('cdPanel').classList.remove('open');document.body.style.overflow='';}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeComments();});

// Toast — per-source color
var SRC_COLORS={'Community':'linear-gradient(135deg,#2b6cee,#1d4ed8)','Research':'linear-gradient(135deg,#2b6cee,#1d4ed8)','Medical News':'linear-gradient(135deg,#2b6cee,#1d4ed8)','Science Report':'linear-gradient(135deg,#2b6cee,#1d4ed8)','Clinical Trial':'linear-gradient(135deg,#7c3aed,#9b85f0)'};
var SRC_ICONS={'Community':'forum','Research':'science','Medical News':'newspaper','Science Report':'biotech','Clinical Trial':'vaccines'};
var toastQueue=[];
function showToast(post){
  document.getElementById('nt-title').textContent=String(post.title||'').slice(0,80);
  document.getElementById('nt-body').textContent=post.source+' · '+timeAgo(post.created_utc);
  var lbl=document.getElementById('nt-src-label');
  lbl.innerHTML='<div class="lp-dot" style="width:6px;height:6px"></div>'+esc(post.source);
  lbl.style.color='#6c8ef5';
  var ico=document.getElementById('nt-ico');
  ico.style.background=SRC_COLORS[post.source]||'linear-gradient(135deg,#2b6cee,#1d4ed8)';
  ico.innerHTML='<span class="material-symbols-rounded" style="font-size:20px;color:#fff;font-variation-settings:\'FILL\' 1">'+(SRC_ICONS[post.source]||'neurology')+'</span>';
  document.getElementById('nt').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(hideToast,7000);
}
function hideToast(){document.getElementById('nt').classList.remove('show');}
function scrollToNew(){hideToast();var el=document.querySelector('.ac.is-new');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});}

function toggleNotif(el){
  NOTIF_ON=el.checked;
  document.getElementById('tog-sub').textContent=NOTIF_ON?'On — popup on new article':'Off';
  fetch(window.__bfy_toggle_notif_url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':window.__bfy_csrf},body:JSON.stringify({enabled:NOTIF_ON})});
}
function manualRefresh(){countdown=90;loadFeed();}

setInterval(function(){
  countdown--;
  if(countdown<=0){countdown=90;loadFeed();}
  var m=Math.floor(countdown/60),s=countdown%60;
  if(cdEl){cdEl.textContent=m+':'+(s<10?'0':'')+s;cdEl.style.color=countdown<=15?'#f87171':'#3ecf6e';}
},1000);

loadFeed();
