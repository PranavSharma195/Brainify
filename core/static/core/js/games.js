/* ═══════════════════════════════════════════════════════════════
   BRAINIFY GAMES  —  games.js
═══════════════════════════════════════════════════════════════ */
'use strict';

let currentGame  = null;
let currentScore = 0;
let currentLevel = 1;
let localBests   = window.GAME_SCORES  || {};
let localHistory = window.GAME_HISTORY || {};
let gameTimers   = [];

const GAME_NAMES = {
  memory_match:'Memory Match', simon_says:'Simon Says',
  number_memory:'Number Memory', grid_pattern:'Grid Pattern',
  word_flash:'Word Flash', speed_match:'Speed Match', color_order:'Color Order',
};

/* ── Build lobby cards ── */
(function buildLobby() {
  const defs = [
    { id:'memory_match',  name:'Memory Match',   desc:'Flip cards and match brain-themed emoji pairs. Grid grows bigger every level.',         levels:10, icon:'grid_on',     clr:'var(--blue)',   bg:'rgba(96,144,255,.13)' },
    { id:'simon_says',    name:'Simon Says',      desc:'Watch the color buttons light up in sequence, then repeat it exactly. One slip = game over.', levels:12, icon:'touch_app',   clr:'var(--purple)', bg:'rgba(160,112,255,.13)' },
    { id:'number_memory', name:'Number Memory',   desc:'A number flashes on screen, then disappears. Type it back exactly — digits increase each level.', levels:10, icon:'tag',         clr:'var(--green)',  bg:'rgba(40,223,160,.1)' },
    { id:'grid_pattern',  name:'Grid Pattern',    desc:'A set of cells lights up briefly. Memorize the exact positions and reproduce the pattern.',  levels:10, icon:'apps',        clr:'var(--amber)',  bg:'rgba(240,156,56,.12)' },
    { id:'word_flash',    name:'Word Flash',      desc:'A brain or medical term appears for a split second. Choose it from a growing set of options.', levels:10, icon:'text_fields', clr:'var(--teal)',   bg:'rgba(48,212,200,.12)' },
    { id:'speed_match',   name:'Speed Match',     desc:'Does the current card match the previous one? React before time runs out — it gets faster.', levels:10, icon:'bolt',        clr:'var(--rose)',   bg:'rgba(240,96,160,.12)' },
    { id:'color_order',   name:'Color Order',     desc:'Colored circles appear one by one. Watch the order carefully, then click them in the same sequence.', levels:10, icon:'palette',     clr:'var(--coral)',  bg:'rgba(255,138,112,.12)' },
  ];

  const grid = document.getElementById('games-grid');
  if (!grid) return;

  defs.forEach(d => {
    const best    = localBests[d.id];
    const history = localHistory[d.id] || [];
    const bestScore = best ? best.score : 0;
    const bestLevel = best ? best.level : 0;
    const histHtml  = history.length
      ? `<div class="gc-history">
           <span class="gh-pill-lbl">Recent:</span>
           ${history.map(h => `<span class="gh-pill" title="Lvl ${h.level} · ${h.date}">${h.score}</span>`).join('')}
         </div>`
      : `<div class="gc-history"><span class="gh-pill-lbl" style="color:var(--dim)">No games played yet</span></div>`;

    grid.innerHTML += `
      <div class="game-card" id="lobby-${d.id}" onclick="openGame('${d.id}')">
        <div class="gc-top">
          <div class="gc-icon" style="background:${d.bg}">
            <span class="material-symbols-rounded" style="color:${d.clr};font-size:26px">${d.icon}</span>
          </div>
          <div class="gc-title">
            <div class="gc-name">${d.name}</div>
            <span class="gc-badge">${d.levels} Levels</span>
          </div>
        </div>
        <div class="gc-desc">${d.desc}</div>
        <div class="gc-stats">
          <div class="gc-stat">
            <div class="gc-stat-val" id="hs-${d.id}" style="color:var(--amber)">${bestScore > 0 ? bestScore : '—'}</div>
            <div class="gc-stat-lbl">Best Score</div>
          </div>
          <div class="gc-stat">
            <div class="gc-stat-val" style="color:var(--accent)">${bestLevel > 0 ? bestLevel : '—'}</div>
            <div class="gc-stat-lbl">Best Level</div>
          </div>
          <div class="gc-stat">
            <div class="gc-stat-val" style="color:var(--soft)">${history.length}</div>
            <div class="gc-stat-lbl">Sessions</div>
          </div>
        </div>
        ${histHtml}
        <div class="gc-play">
          <span class="material-symbols-rounded">play_arrow</span>
          Play Now
        </div>
      </div>`;
  });
})();

/* ── Open / Close / Restart ── */
function openGame(game) {
  currentGame = game; currentScore = 0; currentLevel = 1;
  document.getElementById('gameOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('go-game-name').textContent = GAME_NAMES[game] || game;
  updateTopBar();
  document.querySelectorAll('.game-container').forEach(el => el.style.display = 'none');
  const c = document.getElementById('game-' + game);
  if (c) c.style.display = 'block';
  startGame(game);
}
function closeGame() {
  clearAllTimers(); currentGame = null;
  document.getElementById('gameOverlay').style.display = 'none';
  document.body.style.overflow = '';
}
function restartGame() {
  if (!currentGame) return;
  clearAllTimers(); currentScore = 0; currentLevel = 1; updateTopBar();
  document.querySelectorAll('.game-container').forEach(el => el.style.display = 'none');
  const c = document.getElementById('game-' + currentGame);
  if (c) c.style.display = 'block';
  startGame(currentGame);
}
function startGame(g) {
  const map = {
    memory_match: initMemoryMatch, simon_says: initSimon,
    number_memory: initNumberMemory, grid_pattern: initGridPattern,
    word_flash: initWordFlash, speed_match: initSpeedMatch, color_order: initColorOrder,
  };
  if (map[g]) map[g]();
}
function updateTopBar() {
  document.getElementById('go-level').textContent = currentLevel;
  document.getElementById('go-score').textContent = currentScore;
  document.getElementById('go-best').textContent  = localBests[currentGame] ? localBests[currentGame].score : 0;
}

/* ── Timers ── */
function clearAllTimers() { gameTimers.forEach(id => { clearTimeout(id); clearInterval(id); }); gameTimers = []; }
function gt(fn, ms) { const id = setTimeout(fn, ms);  gameTimers.push(id); return id; }
function gi(fn, ms) { const id = setInterval(fn, ms); gameTimers.push(id); return id; }

/* ── Manual save from top bar ── */
function saveCurrentProgress() {
  if (!currentGame || currentScore === 0) return;
  const btn = document.getElementById('go-save-btn');
  if (btn) { btn.style.opacity = '0.5'; btn.disabled = true; }
  saveScore(currentGame, currentScore, currentLevel).then(() => {
    if (btn) {
      btn.innerHTML = '<span class="material-symbols-rounded">check</span>Saved!';
      setTimeout(() => {
        btn.innerHTML = '<span class="material-symbols-rounded">save</span>Save';
        btn.style.opacity = ''; btn.disabled = false;
      }, 1800);
    }
  });
}

/* ── Score saving ── */
async function saveScore(game, score, level) {
  try {
    const r = await fetch(window.SAVE_SCORE_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json','X-CSRFToken':window.CSRF_TOKEN},
      body: JSON.stringify({game, score, level}),
    });
    const d = await r.json();
    if (d.ok) {
      localBests[game] = {score: d.high_score, level: d.best_level};
      updateTopBar();
      const hs = document.getElementById('hs-' + game);
      if (hs) hs.textContent = d.high_score;
      // Add score pill to lobby history
      const card = document.getElementById('lobby-' + game);
      if (card) {
        let histRow = card.querySelector('.gc-history');
        if (!histRow) { histRow = document.createElement('div'); histRow.className = 'gc-history'; card.insertBefore(histRow, card.querySelector('.gc-play')); }
        // Remove "no games" placeholder
        const placeholder = histRow.querySelector('.gh-pill-lbl');
        if (placeholder && placeholder.style.color) placeholder.remove();
        if (!histRow.querySelector('.gh-pill-lbl')) {
          const lbl = document.createElement('span'); lbl.className = 'gh-pill-lbl'; lbl.textContent = 'Recent:';
          histRow.prepend(lbl);
        }
        const pill = document.createElement('span');
        pill.className = 'gh-pill'; pill.textContent = score; pill.title = `Level ${level}`;
        const lbl = histRow.querySelector('.gh-pill-lbl');
        if (lbl) lbl.after(pill); else histRow.prepend(pill);
        const pills = histRow.querySelectorAll('.gh-pill');
        if (pills.length > 5) pills[pills.length - 1].remove();
        // Update sessions count
        const stats = card.querySelectorAll('.gc-stat-val');
        if (stats[2]) stats[2].textContent = parseInt(stats[2].textContent || '0') + 1;
      }
    }
  } catch (_) {}
}

/* ── Game Over ── */
function showGameOver(container, score, level) {
  clearAllTimers();
  const prev = localBests[currentGame] ? localBests[currentGame].score : 0;
  const isNew = score > prev;
  saveScore(currentGame, score, level);
  container.innerHTML = `
    <div class="game-over-card">
      <h2>Game Over</h2>
      <div class="go-score ${isNew ? 'new-best' : ''}">${score}</div>
      <div class="go-sub">Level reached: <strong>${level}</strong>${isNew ? '<br>🏆 New personal best!' : ''}</div>
      <div class="game-btn-row">
        <button class="game-btn primary" onclick="restartGame()">Play Again</button>
        <button class="game-btn ghost"   onclick="closeGame()">Back to Lobby</button>
      </div>
    </div>`;
}
function levelUp(container, cb) {
  currentLevel++; updateTopBar();
  container.innerHTML = `<div class="level-up-card"><div class="lu-num">Level ${currentLevel}!</div><div class="lu-sub">Get ready for the next round…</div></div>`;
  gt(cb, 1500);
}


/* ═══════════════════════════════════════════════════════
   GAME 1 — MEMORY MATCH
═══════════════════════════════════════════════════════ */
const MM_EMOJIS = ['🧠','🔬','💊','🩺','🩻','🫀','🫁','🦷','👁','🧬','⚗️','🔭','📡','🧪','🩹','💉','🏥','🔋','🧫','📊'];

function mmGridSize(level) {
  return [[2,3],[2,3],[4,3],[4,3],[4,4],[4,4],[5,4],[5,4],[6,5],[6,5]][Math.min(level-1,9)];
}
function initMemoryMatch() {
  const container = document.getElementById('game-memory_match');
  const [cols, rows] = mmGridSize(currentLevel);
  const pairs = (cols * rows) / 2;
  const cards = shuffle([...MM_EMOJIS.slice(0, pairs), ...MM_EMOJIS.slice(0, pairs)]);
  let flipped = [], matched = 0, moves = 0, locked = false;

  // Cell size shrinks as grid grows
  const cell = Math.max(56, Math.min(86, Math.floor(680 / cols) - 12));

  container.innerHTML = `
    <div class="game-status-bar">
      <div class="gsb-item"><div class="gsb-val" id="mm-moves">0</div><div class="gsb-lbl">Moves</div></div>
      <div class="gsb-item"><div class="gsb-val" id="mm-pairs">${pairs}</div><div class="gsb-lbl">Pairs Left</div></div>
      <div class="gsb-item"><div class="gsb-val">${cols}×${rows}</div><div class="gsb-lbl">Grid</div></div>
    </div>
    <div class="game-msg" id="mm-msg">Find all ${pairs} matching pairs!</div>
    <div class="memory-grid" id="mm-grid" style="grid-template-columns:repeat(${cols},${cell}px)"></div>`;

  const grid = document.getElementById('mm-grid');
  cards.forEach(emoji => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.style.width = card.style.height = cell + 'px';
    card.dataset.emoji = emoji;
    card.innerHTML = `
      <div class="mem-card-inner">
        <div class="mem-card-front"><span class="material-symbols-rounded">question_mark</span></div>
        <div class="mem-card-back" style="font-size:${Math.floor(cell*0.45)}px">${emoji}</div>
      </div>`;
    card.addEventListener('click', () => {
      if (locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
      card.classList.add('flipped'); flipped.push(card);
      if (flipped.length === 2) {
        locked = true; moves++;
        const mo = document.getElementById('mm-moves'); if (mo) mo.textContent = moves;
        if (flipped[0].dataset.emoji === flipped[1].dataset.emoji) {
          flipped.forEach(c => c.classList.add('matched')); matched++;
          const pl = document.getElementById('mm-pairs'); if (pl) pl.textContent = pairs - matched;
          const msg = document.getElementById('mm-msg');
          if (msg) { msg.textContent = matched===pairs ? '🎉 All pairs found!' : `✓ Match! ${pairs-matched} left`; msg.className = 'game-msg success'; }
          flipped = []; locked = false;
          if (matched === pairs) {
            const pts = Math.max(20, (pairs * 60) - (moves * 4)) * currentLevel;
            currentScore += pts; updateTopBar();
            if (currentLevel >= 10) gt(() => showGameOver(container, currentScore, currentLevel), 700);
            else gt(() => levelUp(container, initMemoryMatch), 700);
          }
        } else {
          const msg = document.getElementById('mm-msg');
          if (msg) { msg.textContent = '✗ No match — try again'; msg.className = 'game-msg error'; }
          gt(() => {
            flipped.forEach(c => c.classList.remove('flipped')); flipped = []; locked = false;
            const m2 = document.getElementById('mm-msg');
            if (m2) { m2.textContent = `Find all ${pairs} matching pairs!`; m2.className = 'game-msg'; }
          }, 950);
        }
      }
    });
    grid.appendChild(card);
  });
}


/* ═══════════════════════════════════════════════════════
   GAME 2 — SIMON SAYS
═══════════════════════════════════════════════════════ */
const SIMON_COLORS = ['red','blue','green','yellow'];
let simonSeq = [], simonPlayer = 0;

function initSimon() {
  const container = document.getElementById('game-simon_says');
  simonSeq = []; simonPlayer = 0;
  container.innerHTML = `
    <div class="game-msg" id="simon-msg">Press Start to begin</div>
    <div class="simon-seq-display" id="simon-seq-row"></div>
    <div class="simon-board">
      <button class="simon-btn" id="sb-red"    data-c="red"    disabled>Red</button>
      <button class="simon-btn" id="sb-blue"   data-c="blue"   disabled>Blue</button>
      <button class="simon-btn" id="sb-green"  data-c="green"  disabled>Green</button>
      <button class="simon-btn" id="sb-yellow" data-c="yellow" disabled>Yellow</button>
    </div>
    <div class="game-btn-row"><button class="game-btn primary" id="simon-start-btn" onclick="simonStart()">Start Game</button></div>`;
}
function simonStart() {
  simonSeq = []; simonPlayer = 0;
  const b = document.getElementById('simon-start-btn'); if (b) b.style.display = 'none';
  simonNextRound();
}
function simonNextRound() {
  simonPlayer = 0;
  simonSeq.push(SIMON_COLORS[Math.floor(Math.random()*4)]);
  // Update sequence pips
  const row = document.getElementById('simon-seq-row');
  if (row) {
    row.innerHTML = simonSeq.map((c,i) => {
      const colMap = {red:'#c0392b',blue:'#2980b9',green:'#27ae60',yellow:'#f1c40f'};
      return `<div class="simon-seq-pip" id="spip-${i}" style="background:${colMap[c]};opacity:.3;border-color:${colMap[c]}"></div>`;
    }).join('');
  }
  const msg = document.getElementById('simon-msg');
  if (msg) msg.textContent = `Watch the sequence (${simonSeq.length} steps)…`;
  setSimonEnabled(false);
  simonPlay(0);
}
function simonPlay(i) {
  if (i >= simonSeq.length) {
    gt(() => {
      setSimonEnabled(true);
      const m = document.getElementById('simon-msg');
      if (m) { m.textContent = 'Your turn — repeat the sequence!'; m.className = 'game-msg'; }
    }, 450);
    return;
  }
  const btn = document.getElementById('sb-' + simonSeq[i]);
  const pip = document.getElementById('spip-' + i);
  gt(() => {
    if (btn) btn.classList.add('active');
    if (pip) pip.style.opacity = '1';
    gt(() => { if (btn) btn.classList.remove('active'); simonPlay(i+1); }, 520);
  }, 650);
}
function setSimonEnabled(en) {
  SIMON_COLORS.forEach(c => {
    const b = document.getElementById('sb-' + c);
    if (b) { b.disabled = !en; if (en) b.onclick = () => simonClick(c); }
  });
}
function simonClick(color) {
  const container = document.getElementById('game-simon_says');
  const btn = document.getElementById('sb-' + color);
  if (btn) { btn.classList.add('active'); gt(() => btn.classList.remove('active'), 200); }
  if (color !== simonSeq[simonPlayer]) {
    setSimonEnabled(false);
    const msg = document.getElementById('simon-msg');
    if (msg) { msg.textContent = `✗ Wrong! The sequence was ${simonSeq.length} steps.`; msg.className = 'game-msg error'; }
    gt(() => showGameOver(container, currentScore, simonSeq.length), 1000);
    return;
  }
  simonPlayer++;
  if (simonPlayer === simonSeq.length) {
    setSimonEnabled(false);
    currentScore += simonSeq.length * 20; currentLevel = simonSeq.length; updateTopBar();
    if (currentLevel >= 12) { gt(() => showGameOver(container, currentScore, currentLevel), 500); return; }
    const msg = document.getElementById('simon-msg');
    if (msg) { msg.textContent = `✓ Correct! +${simonSeq.length * 20} pts`; msg.className = 'game-msg success'; }
    gt(simonNextRound, 1300);
  }
}


/* ═══════════════════════════════════════════════════════
   GAME 3 — NUMBER MEMORY
═══════════════════════════════════════════════════════ */
let nmNum = '', nmLives = 3, nmCdId = null;

function initNumberMemory() {
  const container = document.getElementById('game-number_memory');
  nmLives = 3; currentScore = 0; currentLevel = 1; updateTopBar();
  nmRound(container);
}
function nmRound(container) {
  const digits = currentLevel + 2;
  const showMs = Math.max(1000, 3400 - currentLevel * 220);
  nmNum = Array.from({length:digits}, () => Math.floor(Math.random()*10)).join('');
  container.innerHTML = `
    <div class="game-status-bar">
      <div class="gsb-item"><div class="gsb-val">${currentLevel}</div><div class="gsb-lbl">Level</div></div>
      <div class="gsb-item"><div class="gsb-val">${digits}</div><div class="gsb-lbl">Digits</div></div>
      <div class="gsb-item"><div class="gsb-val num-lives-row" id="nm-lives">${'❤️'.repeat(nmLives)}</div><div class="gsb-lbl">Lives</div></div>
    </div>
    <div class="num-countdown" id="nm-cd"></div>
    <div class="num-display" id="nm-disp">${nmNum}</div>
    <div class="game-msg" id="nm-msg">Memorise this number!</div>`;
  let rem = Math.ceil(showMs / 1000);
  const cd = document.getElementById('nm-cd'); if (cd) cd.textContent = rem;
  nmCdId = gi(() => {
    rem--;
    const c = document.getElementById('nm-cd'); if (c) c.textContent = rem > 0 ? rem : '';
    if (rem <= 0) { clearInterval(nmCdId); nmHide(container); }
  }, 1000);
}
function nmHide(container) {
  const d = document.getElementById('nm-disp');
  if (d) { d.textContent = '?????'; d.className = 'num-display hidden'; }
  const m = document.getElementById('nm-msg'); if (m) m.textContent = 'Type the number you saw:';
  const wrap = document.createElement('div'); wrap.className = 'num-input-wrap';
  wrap.innerHTML = `
    <input class="num-input" id="nm-inp" type="text" inputmode="numeric" maxlength="15" autofocus placeholder="…">
    <div class="game-btn-row"><button class="game-btn primary" onclick="nmSubmit()">Submit</button></div>`;
  container.appendChild(wrap);
  const inp = document.getElementById('nm-inp');
  if (inp) inp.addEventListener('keydown', e => { if (e.key==='Enter') nmSubmit(); });
}
function nmSubmit() {
  const inp = document.getElementById('nm-inp'); if (!inp) return;
  const container = document.getElementById('game-number_memory');
  const m = document.getElementById('nm-msg');
  if (inp.value.trim() === nmNum) {
    const pts = nmNum.length * 25 * currentLevel; currentScore += pts; updateTopBar();
    if (m) { m.textContent = `✓ Correct! +${pts} pts`; m.className = 'game-msg success'; }
    if (currentLevel >= 10) gt(() => showGameOver(container, currentScore, currentLevel), 900);
    else { currentLevel++; updateTopBar(); gt(() => nmRound(container), 1300); }
  } else {
    nmLives--;
    const ll = document.getElementById('nm-lives'); if (ll) ll.textContent = '❤️'.repeat(Math.max(0, nmLives));
    if (m) { m.textContent = `✗ Correct was: ${nmNum}  (${nmLives} lives left)`; m.className = 'game-msg error'; }
    if (nmLives <= 0) gt(() => showGameOver(container, currentScore, currentLevel), 1000);
    else gt(() => nmRound(container), 1500);
  }
}


/* ═══════════════════════════════════════════════════════
   GAME 4 — GRID PATTERN
═══════════════════════════════════════════════════════ */
let gpPat = [], gpSel = [], gpActive = false;

function initGridPattern() {
  const container = document.getElementById('game-grid_pattern');
  const size = Math.min(2 + currentLevel, 7);
  const lit  = Math.min(2 + currentLevel, size*size - 1);
  const showMs = Math.max(800, 2600 - currentLevel * 200);
  gpSel = []; gpActive = false;
  gpPat = shuffle(Array.from({length:size*size},(_,i)=>i)).slice(0, lit);

  container.innerHTML = `
    <div class="game-status-bar">
      <div class="gsb-item"><div class="gsb-val">${currentLevel}</div><div class="gsb-lbl">Level</div></div>
      <div class="gsb-item"><div class="gsb-val">${size}×${size}</div><div class="gsb-lbl">Grid</div></div>
      <div class="gsb-item"><div class="gsb-val">${lit}</div><div class="gsb-lbl">Lit Cells</div></div>
    </div>
    <div class="game-msg" id="gp-msg">🔦 Memorise the lit cells!</div>
    <div class="pattern-grid" id="gp-grid" style="grid-template-columns:repeat(${size},64px)"></div>
    <div id="gp-row" style="display:none">
      <div style="text-align:center;font-size:12.5px;color:var(--muted);margin-bottom:8px">Click the ${lit} cells you saw, then submit.</div>
      <div class="game-btn-row"><button class="game-btn primary" onclick="gpCheck()">Check Pattern</button></div>
    </div>`;

  const grid = document.getElementById('gp-grid');
  for (let i = 0; i < size*size; i++) {
    const cell = document.createElement('div');
    cell.className = 'pg-cell'; cell.dataset.idx = i; grid.appendChild(cell);
  }
  gpPat.forEach(idx => grid.children[idx].classList.add('lit'));

  gt(() => {
    gpPat.forEach(idx => grid.children[idx].classList.remove('lit'));
    const msg = document.getElementById('gp-msg'); if (msg) msg.textContent = `Select the ${lit} cells you saw.`;
    document.getElementById('gp-row').style.display = 'block';
    gpActive = true;
    for (let i = 0; i < size*size; i++) {
      grid.children[i].addEventListener('click', () => {
        if (!gpActive) return;
        const idx = parseInt(grid.children[i].dataset.idx);
        if (grid.children[i].classList.contains('selected')) {
          grid.children[i].classList.remove('selected'); gpSel = gpSel.filter(x=>x!==idx);
        } else {
          if (gpSel.length >= lit) return;
          grid.children[i].classList.add('selected'); gpSel.push(idx);
        }
      });
    }
  }, showMs);
}
function gpCheck() {
  const container = document.getElementById('game-grid_pattern');
  const grid = document.getElementById('gp-grid'); if (!grid) return;
  const size = Math.min(2 + currentLevel, 7);
  gpActive = false;
  const ok = gpPat.slice().sort().join(',') === gpSel.slice().sort().join(',');
  for (let i = 0; i < size*size; i++) {
    const c = grid.children[i], inP = gpPat.includes(i), inS = gpSel.includes(i);
    if (inP && inS) c.classList.add('correct');
    else if (!inP && inS) c.classList.add('wrong');
    else if (inP && !inS) c.classList.add('lit');
  }
  const msg = document.getElementById('gp-msg');
  if (ok) {
    if (msg) { msg.textContent = '✓ Perfect pattern!'; msg.className = 'game-msg success'; }
    currentScore += gpPat.length * 35 * currentLevel; updateTopBar();
    if (currentLevel >= 10) gt(() => showGameOver(container, currentScore, currentLevel), 1000);
    else gt(() => levelUp(container, initGridPattern), 1000);
  } else {
    if (msg) { msg.textContent = '✗ Wrong pattern — highlighted cells were the answer'; msg.className = 'game-msg error'; }
    gt(() => showGameOver(container, currentScore, currentLevel), 1400);
  }
}


/* ═══════════════════════════════════════════════════════
   GAME 5 — WORD FLASH
═══════════════════════════════════════════════════════ */
const WF_WORDS = ['Amygdala','Cerebrum','Synapse','Cortex','Axon','Dendrite','Myelin',
  'Hippocampus','Cerebellum','Thalamus','Hypothalamus','Brainstem','Neuron','Glia',
  'Sulcus','Gyrus','Ventricle','Parietal','Frontal','Occipital','Temporal','Limbic',
  'Meninges','Medulla','Pons','Astrocyte','Microglia','Interneuron','Receptor','Reflex',
  'Corpus Callosum','Basal Ganglia','Dura Mater','Schwann Cell','Oligodendrocyte',
  'Serotonin','Dopamine','Acetylcholine','Glutamate','GABA','Noradrenaline'];
let wfLives = 3, wfRound = 0, wfWord = '';

function initWordFlash() {
  const container = document.getElementById('game-word_flash');
  wfLives = 3; wfRound = 0; currentScore = 0; currentLevel = 1; updateTopBar();
  wfNext(container);
}
function wfNext(container) {
  wfRound++;
  if (wfRound > 10) {
    currentLevel++; wfRound = 1;
    if (currentLevel > 10) { showGameOver(container, currentScore, 10); return; }
    updateTopBar();
  }
  const showMs  = Math.max(600, 3200 - currentLevel * 230);
  const choices = Math.min(2 + Math.floor(currentLevel / 2), 6);
  wfWord = WF_WORDS[Math.floor(Math.random() * WF_WORDS.length)];
  let opts = [wfWord];
  while (opts.length < choices) {
    const w = WF_WORDS[Math.floor(Math.random() * WF_WORDS.length)];
    if (!opts.includes(w)) opts.push(w);
  }
  opts = shuffle(opts);
  container.innerHTML = `
    <div class="game-status-bar">
      <div class="gsb-item"><div class="gsb-val">${currentLevel}</div><div class="gsb-lbl">Level</div></div>
      <div class="gsb-item"><div class="gsb-val">${wfRound}/10</div><div class="gsb-lbl">Round</div></div>
      <div class="gsb-item"><div class="gsb-val">${'❤️'.repeat(wfLives)}</div><div class="gsb-lbl">Lives</div></div>
    </div>
    <div class="word-display" id="wf-disp">${wfWord}</div>
    <div class="word-timer-bar"><div class="word-timer-fill" id="wf-bar" style="width:100%"></div></div>
    <div class="game-msg" id="wf-msg">Remember this word!</div>
    <div class="word-choices" id="wf-choices" style="display:none">
      ${opts.map(w => `<button class="word-choice-btn" onclick="wfPick(this,'${w.replace(/'/g,"&#39;")}')">${w}</button>`).join('')}
    </div>`;
  const bar = document.getElementById('wf-bar');
  if (bar) gt(() => { bar.style.transition = `width ${showMs}ms linear`; bar.style.width = '0%'; }, 30);
  gt(() => {
    const d = document.getElementById('wf-disp'); if (d) d.textContent = '?';
    const ch = document.getElementById('wf-choices'); if (ch) ch.style.display = 'grid';
    const m = document.getElementById('wf-msg'); if (m) m.textContent = 'Which word did you see?';
  }, showMs);
}
function wfPick(btn, word) {
  const container = document.getElementById('game-word_flash');
  document.querySelectorAll('.word-choice-btn').forEach(b => b.disabled = true);
  const m = document.getElementById('wf-msg');
  if (word === wfWord) {
    btn.classList.add('correct');
    currentScore += 60 * currentLevel; updateTopBar();
    if (m) { m.textContent = `✓ Correct! +${60 * currentLevel} pts`; m.className = 'game-msg success'; }
    gt(() => wfNext(container), 1000);
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.word-choice-btn').forEach(b => { if (b.textContent === wfWord) b.classList.add('correct'); });
    wfLives--;
    if (m) { m.textContent = `✗ It was "${wfWord}" — ${wfLives} lives left`; m.className = 'game-msg error'; }
    if (wfLives <= 0) gt(() => showGameOver(container, currentScore, currentLevel), 1100);
    else gt(() => wfNext(container), 1300);
  }
}


/* ═══════════════════════════════════════════════════════
   GAME 6 — SPEED MATCH
═══════════════════════════════════════════════════════ */
const SM_SYM = ['🧠','🔬','💊','🩺','🩻','🫀','🫁','🦷','👁','🧬','⚗️','🔭'];
let smPrev = '', smLives = 3, smIdx = 0, smCards = [], smAnswered = false;

function initSpeedMatch() {
  const container = document.getElementById('game-speed_match');
  smLives = 3; smIdx = 0; smPrev = ''; smAnswered = false;
  currentScore = 0; currentLevel = 1; updateTopBar();
  smBuild(container);
}
function smConfig(level) { return {count: 9+level, holdMs: Math.max(550, 2100-level*130)}; }
function smBuild(container) {
  const {count, holdMs} = smConfig(currentLevel);
  smCards = Array.from({length:count}, () => SM_SYM[Math.floor(Math.random()*SM_SYM.length)]);
  smIdx = 0; smPrev = ''; smAnswered = false; smLives = 3;
  container.innerHTML = `
    <div class="game-status-bar">
      <div class="gsb-item"><div class="gsb-val">${currentLevel}</div><div class="gsb-lbl">Level</div></div>
      <div class="gsb-item"><div class="gsb-val" id="sm-cnt">1/${count}</div><div class="gsb-lbl">Card</div></div>
      <div class="gsb-item"><div class="gsb-val" id="sm-hrt">${'❤️'.repeat(smLives)}</div><div class="gsb-lbl">Lives</div></div>
    </div>
    <div class="speed-layout">
      <div class="speed-prev-section">
        <div class="speed-prev-box">
          <div class="speed-box-lbl">Previous card</div>
          <div class="speed-box-sym" id="sm-prev">—</div>
        </div>
        <div style="font-size:28px;color:var(--muted);align-self:center">→</div>
        <div class="speed-prev-box">
          <div class="speed-box-lbl">Current card</div>
          <div class="speed-box-sym" id="sm-card">?</div>
        </div>
      </div>
      <div class="game-msg" id="sm-msg">Does it match the previous card?</div>
      <div class="speed-btns">
        <button class="speed-match-btn yes" id="sm-yes" onclick="smAns(true)"  disabled>MATCH ✓</button>
        <button class="speed-match-btn no"  id="sm-no"  onclick="smAns(false)" disabled>NO MATCH ✗</button>
      </div>
      <div class="speed-progress" id="sm-prog">
        ${smCards.map((_,i) => `<div class="speed-pip" id="smpip-${i}"></div>`).join('')}
      </div>
    </div>`;
  gt(() => smShow(container, holdMs), 300);
}
function smShow(container, holdMs) {
  if (smIdx >= smCards.length) {
    currentScore += smCards.length * 25 * currentLevel; updateTopBar();
    if (currentLevel >= 10) { showGameOver(container, currentScore, currentLevel); return; }
    const m = document.getElementById('sm-msg');
    if (m) { m.textContent = `Round clear! +${smCards.length*25*currentLevel} pts`; m.className = 'game-msg success'; }
    gt(() => { currentLevel++; smBuild(container); }, 1300);
    return;
  }
  smAnswered = false;
  const sym = smCards[smIdx];
  const card = document.getElementById('sm-card');
  const prev = document.getElementById('sm-prev');
  const cnt  = document.getElementById('sm-cnt');
  if (card) { card.textContent = sym; card.className = 'speed-box-sym flash'; gt(() => { if(card) card.className = 'speed-box-sym'; }, 220); }
  if (prev) prev.textContent = smPrev || '—';
  if (cnt)  cnt.textContent  = `${smIdx+1}/${smCards.length}`;
  setSmBtns(true);
  gt(() => { if (!smAnswered) smAns(null); }, holdMs);
}
function setSmBtns(en) { ['sm-yes','sm-no'].forEach(id => { const b=document.getElementById(id); if(b) b.disabled=!en; }); }
function smAns(isMatch) {
  if (smAnswered) return;
  smAnswered = true; setSmBtns(false);
  const container = document.getElementById('game-speed_match');
  const sym = smCards[smIdx];
  const shouldMatch = smPrev !== '' && smPrev === sym;
  const correct = isMatch !== null && isMatch === shouldMatch;
  const pip = document.getElementById('smpip-' + smIdx);
  if (pip) pip.classList.add(correct ? 'correct' : 'wrong');
  const m = document.getElementById('sm-msg');
  if (!correct) {
    smLives--;
    const hh = document.getElementById('sm-hrt'); if (hh) hh.textContent = '❤️'.repeat(Math.max(0,smLives));
    if (m) { m.textContent = isMatch===null ? '⏱ Too slow!' : '✗ Wrong!'; m.className = 'game-msg error'; }
    if (smLives <= 0) { gt(() => showGameOver(container, currentScore, currentLevel), 800); return; }
  } else {
    if (m) { m.textContent = '✓ Correct!'; m.className = 'game-msg success'; }
  }
  smPrev = sym; smIdx++;
  const {holdMs} = smConfig(currentLevel);
  gt(() => smShow(container, holdMs), 420);
}


/* ═══════════════════════════════════════════════════════
   GAME 7 — COLOR ORDER
═══════════════════════════════════════════════════════ */
const CO = [
  {id:'co-red',    bg:'#c0392b',label:'Red'},   {id:'co-blue',   bg:'#1a5276',label:'Blue'},
  {id:'co-green',  bg:'#1e8449',label:'Green'},  {id:'co-yellow', bg:'#b7950b',label:'Yellow'},
  {id:'co-purple', bg:'#6c3483',label:'Purple'}, {id:'co-teal',   bg:'#117a65',label:'Teal'},
  {id:'co-orange', bg:'#ca6f1e',label:'Orange'},
];
let coSeq = [], coPlayer = 0, coEnabled = false;

function initColorOrder() {
  const container = document.getElementById('game-color_order');
  coPlayer = 0; coEnabled = false; currentScore = 0; currentLevel = 1; updateTopBar();
  coRender(container);
}
function coRender(container) {
  const length = Math.min(2 + currentLevel, 12);
  const numC   = Math.min(3 + Math.floor(currentLevel/2), 7);
  const showMs = Math.max(380, 1300 - currentLevel * 80);
  const pal    = CO.slice(0, numC);
  coSeq = Array.from({length}, () => pal[Math.floor(Math.random()*pal.length)]);
  coPlayer = 0; coEnabled = false;
  container.innerHTML = `
    <div class="game-status-bar">
      <div class="gsb-item"><div class="gsb-val">${currentLevel}</div><div class="gsb-lbl">Level</div></div>
      <div class="gsb-item"><div class="gsb-val">${length}</div><div class="gsb-lbl">Sequence</div></div>
      <div class="gsb-item"><div class="gsb-val">${numC}</div><div class="gsb-lbl">Colors</div></div>
    </div>
    <div class="game-msg" id="co-msg">Watch the order carefully…</div>
    <div class="color-order-seq" id="co-seq">
      ${coSeq.map((c,i)=>`<div class="cos-pip" id="cop-${i}" style="background:${c.bg};border-color:${c.bg};opacity:.25"></div>`).join('')}
    </div>
    <div class="color-stage" id="co-stage">
      ${pal.map(c=>`<div class="color-circle" id="${c.id}" style="background:${c.bg}" onclick="coPick('${c.id}')">${c.label}</div>`).join('')}
    </div>`;
  setCoEnabled(false);
  coPlay(0, showMs);
}
function coPlay(i, showMs) {
  if (i >= coSeq.length) { gt(() => { setCoEnabled(true); const m=document.getElementById('co-msg'); if(m)m.textContent='Now click in the same order!'; }, 450); return; }
  const pip    = document.getElementById('cop-' + i);
  const circle = document.getElementById(coSeq[i].id);
  gt(() => {
    if (circle) circle.classList.add('active');
    if (pip)    pip.style.opacity = '1';
    gt(() => { if (circle) circle.classList.remove('active'); coPlay(i+1, showMs); }, showMs * 0.65);
  }, showMs * 0.35 + i * (showMs + 80));
}
function setCoEnabled(en) {
  coEnabled = en;
  document.querySelectorAll('.color-circle').forEach(c => {
    c.style.cursor = en ? 'pointer' : 'default';
    c.style.pointerEvents = en ? 'auto' : 'none';
    c.style.opacity = en ? '1' : '.5';
  });
}
function coPick(cid) {
  if (!coEnabled) return;
  const container = document.getElementById('game-color_order');
  const expected  = coSeq[coPlayer];
  const circle    = document.getElementById(cid);
  if (cid === expected.id) {
    if (circle) { circle.classList.add('correct'); gt(() => circle.classList.remove('correct'), 300); }
    const pip = document.getElementById('cop-' + coPlayer); if (pip) pip.style.borderColor = '#fff';
    coPlayer++;
    if (coPlayer === coSeq.length) {
      setCoEnabled(false);
      const pts = coSeq.length * 28 * currentLevel; currentScore += pts; updateTopBar();
      const m = document.getElementById('co-msg'); if (m) { m.textContent = `✓ Perfect! +${pts} pts`; m.className = 'game-msg success'; }
      if (currentLevel >= 10) gt(() => showGameOver(container, currentScore, currentLevel), 1000);
      else gt(() => levelUp(container, initColorOrder), 1000);
    }
  } else {
    setCoEnabled(false);
    if (circle) circle.classList.add('wrong');
    const m = document.getElementById('co-msg'); if (m) { m.textContent = `✗ Wrong! Expected: ${expected.label}`; m.className = 'game-msg error'; }
    gt(() => showGameOver(container, currentScore, currentLevel), 1100);
  }
}


/* ── Utility ── */
function shuffle(arr) {
  for (let i = arr.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]] = [arr[j],arr[i]]; }
  return arr;
}
