function togglePwd() {
  var e = document.getElementById('pwd');
  e.type = e.type === 'password' ? 'text' : 'password';
  document.getElementById('eye-icon').textContent =
    e.type === 'password' ? 'visibility' : 'visibility_off';
}
function checkStrength(v) {
  var fill = document.getElementById('strengthFill');
  var txt  = document.getElementById('strengthText');
  var score = 0;
  if (v.length >= 8) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  var colors = ['#ef4444','#f97316','#f59e0b','#22c55e'];
  var labels = ['Weak','Fair','Good','Strong'];
  fill.style.width = (score * 25) + '%';
  fill.style.background = colors[score-1] || 'var(--line)';
  txt.textContent = score > 0 ? labels[score-1] : '';
  txt.style.color = colors[score-1] || 'var(--muted)';
}
