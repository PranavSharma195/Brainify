var MODE='report', MESSAGES=[], IS_LOADING=false, ACTIVE_ID=null;
var INIT = window.__bfy_user_initial;
var CSRF=window.__bfy_csrf;
var API_URL=window.__bfy_chatbot_url;
var LS_KEY=window.__bfy_ls_key;

// ── LOCALSTORAGE HISTORY ──────────────────────────────────────
function lsGet(){try{return JSON.parse(localStorage.getItem(LS_KEY)||'[]');}catch(e){return[];}}
function lsSave(list){try{localStorage.setItem(LS_KEY,JSON.stringify(list.slice(0,30)));}catch(e){}}

function saveChat(firstMsg){
  var list=lsGet();
  if(ACTIVE_ID){
    var i=list.findIndex(function(h){return h.id===ACTIVE_ID;});
    if(i>-1){list[i].messages=MESSAGES.slice();list[i].report=getReport();lsSave(list);}
    return;
  }
  ACTIVE_ID=Date.now();
  list.unshift({id:ACTIVE_ID,mode:MODE,title:(firstMsg||'Chat').slice(0,50),messages:MESSAGES.slice(),report:getReport(),ts:Date.now()});
  lsSave(list);
  renderHistory();
}

function renderHistory(){
  var list=lsGet();
  var el=document.getElementById('history-list');
  if(!list.length){el.innerHTML='<div style="font-size:12px;color:var(--dim);padding:6px 10px;font-style:italic">No saved chats yet</div>';return;}
  var icons={report:'description',research:'biotech'};
  el.innerHTML=list.map(function(h){
    var s=Math.floor((Date.now()-h.ts)/1000);
    var age=s<60?'now':s<3600?Math.floor(s/60)+'m':s<86400?Math.floor(s/3600)+'h':Math.floor(s/86400)+'d';
    return '<div class="hist-item'+(h.id===ACTIVE_ID?' active':'')+'" onclick="loadChat('+h.id+')">'+
      '<span class="material-symbols-rounded">'+(icons[h.mode]||'chat')+'</span>'+
      '<span class="hist-label">'+esc(h.title)+'</span>'+
      '<span class="hist-time">'+age+'</span></div>';
  }).join('');
}

function loadChat(id){
  var entry=lsGet().find(function(h){return h.id===id;});
  if(!entry) return;
  ACTIVE_ID=id; MESSAGES=entry.messages.slice(); MODE=entry.mode;
  setModeUI(MODE);
  var ri=document.getElementById('report-input');
  if(ri){ri.value=entry.report||'';onReportInput();}
  var c=document.getElementById('chat-msgs');
  c.innerHTML='';
  MESSAGES.forEach(function(m){appendMsg(m.role==='assistant'?'ai':m.role,m.content);});
  renderHistory();
}

// ── MODE ──────────────────────────────────────────────────────
function switchMode(m){MODE=m;newChat();setModeUI(m);}
function setModeUI(mode){
  MODE=mode;
  document.getElementById('mc-report').classList.toggle('active',mode==='report');
  document.getElementById('mc-research').classList.toggle('active',mode==='research');
  document.getElementById('cmi-dot').className='cmi-dot '+mode;
  document.getElementById('cmi-title').textContent=mode==='report'?'MRI Report Explainer':'Research Assistant';
  document.getElementById('cmi-sub').textContent=mode==='report'?'Expand the section below and paste your report':'Ask about brain tumors, treatments & research';
  document.getElementById('send-btn').className='send-btn '+mode;
  var ra=document.getElementById('report-area');
  if(ra) ra.style.display=mode==='report'?'block':'none';
}

// ── REPORT PANEL ─────────────────────────────────────────────
var rOpen=false;
function toggleReport(){
  rOpen=!rOpen;
  document.getElementById('rbody').classList.toggle('open',rOpen);
  document.getElementById('rex').classList.toggle('open',rOpen);
}
function getReport(){var el=document.getElementById('report-input');return el?el.value.trim():'';}
function onReportInput(){
  var t=getReport();
  var b=document.getElementById('rhas');var c=document.getElementById('rcount');
  if(b) b.style.display=t.length>20?'inline-flex':'none';
  if(c) c.textContent=t.length>0?t.length+' chars':'';
}

// ── WELCOME ───────────────────────────────────────────────────
var STARTERS={
  report:['Explain the key findings in plain English','What does "ring-enhancing lesion" mean?','Are these findings serious or urgent?','What are the typical next steps?'],
  research:['What is glioblastoma and its treatment options?','Explain WHO Grade IV brain tumor prognosis','What clinical trials exist for GBM in 2025?','Difference between IDH-mutant and IDH-wildtype?'],
};
function showWelcome(){
  var icons={report:'description',research:'biotech'};
  var titles={report:'MRI Report Explainer',research:'Research Assistant'};
  var subs={
    report:'Paste your radiology report in the section below, then ask me anything about it.',
    research:'Ask me anything about brain tumors, treatments, clinical trials, and the latest research.',
  };
  var st=STARTERS[MODE].map(function(s){return '<button class="starter" onclick="useStarter(this.textContent.trim())">'+esc(s)+'</button>';}).join('');
  document.getElementById('chat-msgs').innerHTML=
    '<div class="chat-welcome">'+
      '<div class="wlc-icon '+MODE+'"><span class="material-symbols-rounded">'+icons[MODE]+'</span></div>'+
      '<div class="wlc-title">'+titles[MODE]+'</div>'+
      '<div class="wlc-sub">'+subs[MODE]+'</div>'+
      '<div class="starter-grid">'+st+'</div>'+
    '</div>';
}
function useStarter(t){document.getElementById('msg-input').value=t;sendMessage();}

// ── SEND ──────────────────────────────────────────────────────
async function sendMessage(){
  if(IS_LOADING) return;
  var input=document.getElementById('msg-input');
  var text=input.value.trim();
  if(!text) return;
  var report=getReport();
  var wlc=document.querySelector('.chat-welcome');
  if(wlc) wlc.remove();
  input.value=''; autoResize(input);
  MESSAGES.push({role:'user',content:text});
  appendMsg('user',text);
  var tid='tp'+Date.now();
  appendTyping(tid);
  IS_LOADING=true;
  document.getElementById('send-btn').disabled=true;
  try{
    var resp=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','X-CSRFToken':CSRF},
      body:JSON.stringify({mode:MODE,messages:MESSAGES,report:report}),
    });
    removeTyping(tid);
    var data=await resp.json();
    if(data.ok){
      MESSAGES.push({role:'assistant',content:data.reply});
      appendMsg('ai',data.reply);
      document.getElementById('setup-notice').style.display='none';
      saveChat(text);
      renderHistory();
    } else {
      if(resp.status===401) document.getElementById('setup-notice').style.display='flex';
      appendError(data.error||'Something went wrong');
    }
  } catch(e){
    removeTyping(tid);
    appendError('Network error — could not reach server');
  }
  IS_LOADING=false;
  document.getElementById('send-btn').disabled=false;
  scrollB();
}

// ── RENDER ────────────────────────────────────────────────────
function appendMsg(role,content){
  var c=document.getElementById('chat-msgs');
  var d=document.createElement('div');
  d.className='msg '+role+(role==='ai'?' '+MODE:'');
  var av=role==='user'?INIT:'<span class="material-symbols-rounded" style="font-size:17px;color:#fff;font-variation-settings:\'FILL\' 1">'+(MODE==='report'?'description':'biotech')+'</span>';
  d.innerHTML='<div class="msg-av">'+av+'</div><div class="msg-bubble">'+(role==='ai'?md(content):esc(content))+'</div>';
  c.appendChild(d); scrollB();
}
function appendError(msg){
  var c=document.getElementById('chat-msgs');
  var d=document.createElement('div');
  d.style.cssText='background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);border-radius:12px;padding:13px 16px;font-size:13px;color:#fca5a5;display:flex;align-items:flex-start;gap:9px;margin:4px 0';
  d.innerHTML='<span class="material-symbols-rounded" style="font-size:17px;flex-shrink:0;margin-top:1px">error</span><span>'+esc(msg)+'</span>';
  c.appendChild(d); scrollB();
}
function appendTyping(id){
  var c=document.getElementById('chat-msgs');
  var d=document.createElement('div');
  d.className='msg ai '+MODE; d.id=id;
  var ic=MODE==='report'?'description':'biotech';
  d.innerHTML='<div class="msg-av"><span class="material-symbols-rounded" style="font-size:17px;color:#fff;font-variation-settings:\'FILL\' 1">'+ic+'</span></div><div class="msg-bubble"><div class="typing-bubble"><span></span><span></span><span></span></div></div>';
  c.appendChild(d); scrollB();
}
function removeTyping(id){var el=document.getElementById(id);if(el)el.remove();}
function scrollB(){var c=document.getElementById('chat-msgs');c.scrollTop=c.scrollHeight;}

// ── MARKDOWN ─────────────────────────────────────────────────
function md(text){
  var h=esc(text);
  h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  h=h.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  h=h.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/\*(.+?)\*/g,'<em>$1</em>');
  h=h.replace(/`([^`]+)`/g,'<code>$1</code>');
  h=h.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');
  h=h.replace(/^---+$/gm,'<hr>');
  h=h.replace(/((?:^[•\-\*] .+\n?)+)/gm,function(m){return '<ul>'+m.trim().split('\n').map(function(l){return '<li>'+l.replace(/^[•\-\*] /,'')+'</li>';}).join('')+'</ul>';});
  h=h.replace(/((?:^\d+\. .+\n?)+)/gm,function(m){return '<ol>'+m.trim().split('\n').map(function(l){return '<li>'+l.replace(/^\d+\. /,'')+'</li>';}).join('')+'</ol>';});
  h=h.split(/\n{2,}/).map(function(b){if(/^<(h[1-3]|ul|ol|blockquote|hr)/.test(b.trim()))return b;return '<p>'+b.replace(/\n/g,'<br>')+'</p>';}).join('');
  return h;
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── CONTROLS ─────────────────────────────────────────────────
function newChat(){
  MESSAGES=[];ACTIVE_ID=null;
  var ri=document.getElementById('report-input');if(ri){ri.value='';onReportInput();}
  document.getElementById('msg-input').value='';
  document.getElementById('setup-notice').style.display='none';
  showWelcome();renderHistory();
}
function clearChat(){
  if(ACTIVE_ID){var list=lsGet().filter(function(h){return h.id!==ACTIVE_ID;});lsSave(list);}
  newChat();
}
function handleKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px';}

// ── INIT ─────────────────────────────────────────────────────
setModeUI('report');
showWelcome();
renderHistory();
