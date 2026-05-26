/* BGTA shared application logic */
const AdminSession = (function () {
  const HASH = 'acb4c5c1cc223899f6846527d50a9237f7957612323f66e54f760aeed9c7ad6f';
  let _on = false, _iv = null, _t = 1800;
  async function h(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function tick() {
    _t--;
    const m = String(Math.floor(_t / 60)).padStart(2, '0'), s = String(_t % 60).padStart(2, '0');
    const el = document.getElementById('adminTimer');
    if (el) el.textContent = `AUTO-LOCK: ${m}:${s}`;
    if (_t <= 0) window.lockAdmin();
  }
  return {
    async unlock(pw) { const ok = (await h(pw)) === HASH; if (ok) { _on = true; _t = 1800; clearInterval(_iv); _iv = setInterval(tick, 1000); } return ok; },
    lock() { _on = false; clearInterval(_iv); _iv = null; },
    reset() { if (_on) _t = 1800; },
    get on() { return _on; }
  };
})();

let currentFilter = 'all', currentWeekFilter = null, _capTarget = null;
const lineups = {};
const POSITIONS = ['#1 Singles', '#2 Singles', '#3 Singles', '#1 Doubles', '#2 Doubles', '#3 Doubles'];
const news = [
  { emoji: '🏆', tag: 'Tournament', title: 'Spring Classic Tournament – Coming Soon', date: '2026', text: 'Stay tuned for our inaugural Spring Classic. Open to all registered teams.' },
  { emoji: '🎾', tag: 'Clinic', title: 'Register Your Team to Get Started', date: '2026', text: 'Captains: sign in and register your team. Add players, set your lineup, and get on the schedule.' },
  { emoji: '📣', tag: 'Welcome', title: 'Welcome to Bramblett Tennis League', date: '2026', text: 'This is your home for league management — schedules, standings, lineups, and more.' }
];

function teams() { return LeagueStore.teams; }
function matches() { return LeagueStore.matches; }
function standings() { return LeagueStore.standings; }

function normalizePlayer(p) {
  if (typeof p === 'string') {
    const isCaptain = p.includes('(C)');
    return { name: p.replace(' (C)', '').trim(), isCaptain, ecRank: null, rankPicked: null, lane: '' };
  }
  return {
    name: p.name,
    isCaptain: !!p.isCaptain,
    ecRank: p.ecRank ?? null,
    rankPicked: p.rankPicked ?? null,
    lane: p.lane || ''
  };
}
function playerName(p) { return normalizePlayer(p).name; }
function playerIsCaptain(p, idx) {
  const n = normalizePlayer(p);
  return n.isCaptain || idx === 0;
}
function playerRankLabel(p, idx) {
  const n = normalizePlayer(p);
  return n.rankPicked != null ? n.rankPicked : idx + 1;
}

function boot() {
  LeagueStore.load();
  if (!teams().length) LeagueStore.reseedSeason3();
  bindGlobalEvents();
  restoreNavUser();
  const regModal = document.getElementById('registerTeamModal');
  if (regModal) regModal.addEventListener('mousedown', () => {
    const user = LeagueStore.current;
    if (user) {
      const ci = document.getElementById('rtCaptain'); if (ci && !ci.value) ci.value = user.name;
      const ei = document.getElementById('rtEmail'); if (ei && !ei.value) ei.value = user.email || '';
    }
  });
  if (window.BGTA_PAGE_INIT) BGTA_PAGE_INIT();
  setTimeout(setupReveal, 80);
}

function bindGlobalEvents() {
  ['click', 'keydown', 'mousemove', 'scroll'].forEach(e => document.addEventListener(e, () => AdminSession.reset(), { passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && AdminSession.on) lockAdmin(); });
  document.querySelectorAll('.overlay').forEach(el => el.addEventListener('click', e => { if (e.target === el) closeOverlay(el.id); }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.overlay').forEach(el => { if (el.style.display === 'flex') closeOverlay(el.id); });
      clearAdminInput();
    }
  });
  document.addEventListener('contextmenu', e => { if (e.target.type === 'password') e.preventDefault(); });
}

function restoreNavUser() {
  const user = LeagueStore.current;
  if (user) updateNavUser(user);
}

/* Admin */
function openAdminPrompt() {
  if (AdminSession.on) { lockAdmin(); return; }
  clearAdminInput(); openOverlay('adminModal');
  setTimeout(() => { const i = document.getElementById('adminPwInput'); if (i) i.focus(); }, 120);
  return false;
}
function clearAdminInput() {
  const i = document.getElementById('adminPwInput'); if (i) i.value = '';
  const e = document.getElementById('adminError'); if (e) { e.textContent = ''; e.style.display = 'none'; }
}
async function verifyAdmin() {
  const input = document.getElementById('adminPwInput');
  const pw = input.value; input.value = '';
  const e = document.getElementById('adminError'); e.style.display = 'none';
  if (!pw.trim()) { showAdminErr('Enter the passphrase.'); return; }
  await new Promise(r => setTimeout(r, 400));
  if (!(await AdminSession.unlock(pw))) { showAdminErr('Incorrect passphrase.'); return; }
  closeOverlay('adminModal');
  applyAdminMode(true);
  notify('🔐 Admin mode active. Auto-locks in 30 min.', 'gold');
}
function showAdminErr(m) { const e = document.getElementById('adminError'); e.textContent = '❌ ' + m; e.style.display = 'block'; }
window.lockAdmin = function () { AdminSession.lock(); applyAdminMode(false); notify('🔒 Admin session locked.'); };
function applyAdminMode(on) {
  document.body.classList.toggle('admin-mode', on);
  const banner = document.getElementById('adminBanner');
  if (banner) banner.style.display = on ? 'flex' : 'none';
  const btn = document.getElementById('adminNavBtn');
  if (btn) btn.classList.toggle('active-admin', on);
  const footer = document.querySelector('footer');
  if (footer) footer.style.paddingBottom = on ? '64px' : '';
  const ab = document.getElementById('adminRegisterBtn');
  if (ab) ab.style.display = on ? 'block' : 'none';
  if (typeof renderTeams === 'function') renderTeams();
  if (typeof renderLineupCard === 'function') renderLineupCard();
}

/* Auth */
function showAuthView(view) {
  const login = document.getElementById('authViewLogin');
  const reg = document.getElementById('authViewRegister');
  if (login) login.style.display = view === 'login' ? 'block' : 'none';
  if (reg) reg.style.display = view === 'register' ? 'block' : 'none';
  ['loginErr', 'regErr'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}
function checkPwStrength(pw) {
  const b = document.getElementById('pwBar'), lbl = document.getElementById('pwStrengthLabel');
  if (!b) return;
  if (!pw) { b.className = 'pw-strength-bar'; if (lbl) lbl.textContent = ''; return; }
  const strong = pw.length >= 10 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  const medium = pw.length >= 6 && (/[A-Z]/.test(pw) || /[0-9]/.test(pw));
  const level = strong ? 'strong' : medium ? 'medium' : 'weak';
  b.className = 'pw-strength-bar ' + level;
  if (lbl) lbl.textContent = '— ' + { strong: 'Strong ✓', medium: 'Good', weak: 'Too weak' }[level];
}
async function signInEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPw').value;
  const err = document.getElementById('loginErr'); err.style.display = 'none';
  if (!email || !pw) { showAuthErr(err, 'Enter email and password.'); return; }
  if (pw.length < 6) { showAuthErr(err, 'Password must be 6+ characters.'); return; }
  const res = await LeagueStore.login(email, pw);
  document.getElementById('loginPw').value = '';
  if (!res.ok) { showAuthErr(err, res.msg); return; }
  onSignedIn(res.user);
}
async function registerEmail() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pw = document.getElementById('regPw').value;
  const role = document.getElementById('regRole').value;
  const skill = document.getElementById('regSkill').value;
  const terms = document.getElementById('regTerms').checked;
  const err = document.getElementById('regErr'); err.style.display = 'none';
  if (!name) { showAuthErr(err, 'Enter your name.'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthErr(err, 'Enter a valid email.'); return; }
  if (pw.length < 8) { showAuthErr(err, 'Password must be 8+ characters.'); return; }
  if (!terms) { showAuthErr(err, 'Please accept the terms.'); return; }
  const res = await LeagueStore.registerMember({ name, email, pw, role, skill });
  if (!res.ok) { showAuthErr(err, res.msg); return; }
  const login = await LeagueStore.login(email, pw);
  document.getElementById('regPw').value = '';
  onSignedIn(login.user);
}
function showAuthErr(el, m) { el.textContent = m; el.style.display = 'block'; }
function onSignedIn(user) {
  closeOverlay('authModal');
  ['loginEmail', 'loginPw', 'regName', 'regEmail', 'regPw'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const pb = document.getElementById('pwBar'); if (pb) pb.className = 'pw-strength-bar';
  updateNavUser(user);
  updateCaptainPanel();
  notify('👋 Welcome, ' + user.name + '!');
  if (user.role === 'captain') {
    const ci = document.getElementById('rtCaptain'); if (ci) ci.value = user.name;
    const ei = document.getElementById('rtEmail'); if (ei) ei.value = user.email;
  }
}
function updateNavUser(user) {
  const initials = user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const roleTag = user.role === 'captain' ? '<span class="role-badge role-captain">Captain</span>' : '';
  const area = document.getElementById('navUserArea');
  if (!area) return;
  area.style.cssText = 'display:flex;align-items:center;gap:6px;';
  area.innerHTML = `<div class="member-avatar-sm">${initials}</div><span style="color:var(--mint);font-size:.76rem;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.name.split(' ')[0]}</span>${roleTag}<a href="#" style="color:rgba(245,240,232,.4);font-size:.68rem;cursor:pointer;text-transform:uppercase" onclick="signOut();return false" title="Sign out">↩</a>`;
}
function updateCaptainPanel() {
  const panel = document.getElementById('captainRegisterPanel');
  if (!panel) return;
  const user = LeagueStore.current;
  panel.classList.toggle('visible', !!(user && (user.role === 'captain' || AdminSession.on)));
}
function signOut() {
  LeagueStore.logout();
  const area = document.getElementById('navUserArea');
  if (area) {
    area.style.cssText = '';
    area.innerHTML = `<a href="#" onclick="openAuth('login');return false" class="nav-cta">Sign In</a>`;
  }
  updateCaptainPanel();
  notify('Signed out.');
  return false;
}

function openOverlay(id) { const el = document.getElementById(id); if (el) { el.style.display = 'flex'; el.offsetHeight; } }
function closeOverlay(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function openAuth(view) { showAuthView(view || 'login'); openOverlay('authModal'); return false; }

function requireAdmin() {
  if (!AdminSession.on) { notify('🔒 Admin access required.', 'error'); return false; }
  return true;
}

function registerTeam() {
  const user = LeagueStore.current;
  if (!user && !AdminSession.on) { notify('🔒 Please sign in first.', 'error'); return; }
  const name = document.getElementById('rtName').value.trim();
  const cap = document.getElementById('rtCaptain').value.trim();
  const div = document.getElementById('rtDivision').value;
  const err = document.getElementById('rtErr'); err.style.display = 'none';
  if (!name) { err.textContent = 'Enter a team name.'; err.style.display = 'block'; return; }
  if (!cap) { err.textContent = "Enter the captain's name."; err.style.display = 'block'; return; }
  const t = teams();
  if (t.find(x => x.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'A team with that name already exists.'; err.style.display = 'block'; return; }
  const id = LeagueStore.nextTeamId;
  LeagueStore.nextTeamId = id + 1;
  t.push({
    id, name, captain: cap, division: div,
    email: document.getElementById('rtEmail').value.trim(),
    players: [{ name: cap, isCaptain: true, ecRank: 1, rankPicked: 1, lane: '' }]
  });
  standings().push({ id, name, w: 0, l: 0, sw: 0, sl: 0, pts: 0 });
  LeagueStore.persist();
  ['rtName', 'rtEmail'].forEach(x => { const el = document.getElementById(x); if (el) el.value = ''; });
  closeOverlay('registerTeamModal');
  renderTeams(); renderStandings(); updateTeamSelects();
  if (typeof renderLineupTeamSelect === 'function') { renderLineupTeamSelect(); renderLineupCard(); }
  updateStats();
  notify(`✅ Team "${name}" registered!`);
}

function renderTeams() {
  const grid = document.getElementById('teamsGrid');
    if (!grid) return; 
  const loading = document.getElementById('teamsLoading');
  if (loading) loading.remove();
  const t = teams();
  if (!t.length) {
    grid.innerHTML = `<div class="empty-state reveal" style="grid-column:1/-1">
      <div class="empty-icon">🎾</div><h3>No Teams Yet</h3>
      <p>Captains can sign in and register their team. Admin can also add teams directly.</p>
      <button class="btn-primary" onclick="openAuth('register')">Sign In to Register</button></div>`;
    setupReveal(); return;
  }
  grid.innerHTML = t.map((team, idx) => `
    <div class="team-card reveal visible">
      <div class="team-card-header">
        <div class="team-number">${String(idx + 1).padStart(2, '0')}</div>
        <div class="t-name">${team.name}</div>
        <div class="captain-badge">👑 ${team.captain}</div>
        <div class="div-label">${team.division}</div>
      </div>
      <div class="team-card-body">
        <ul class="lineup-list">${team.players.map((p, i) => {
          const n = normalizePlayer(p);
          const lane = n.lane ? `<span class="player-lane">${n.lane}</span>` : '';
          const rankMeta = n.ecRank != null ? `<span class="player-rank-meta">EC ${n.ecRank} · Pick #${n.rankPicked}</span>` : '';
          return `<li>
          <div class="player-pos ${playerIsCaptain(p, i) ? 'captain-pos' : ''}">${playerIsCaptain(p, i) ? 'C' : playerRankLabel(p, i)}</div>
          <span class="player-name-wrap">
            <span class="${playerIsCaptain(p, i) ? 'player-name-captain' : ''}">${n.name}</span>
            ${rankMeta}${lane}
          </span>
          ${!playerIsCaptain(p, i) ? `<button class="remove-player-btn" onclick="removePlayerByIndex(${team.id},${i})" title="Remove">✕</button>` : ''}
        </li>`;
        }).join('')}</ul>
        <div class="add-player-form">
          <input type="text" id="pi_${team.id}" placeholder="Add player…" onkeydown="if(event.key==='Enter')addPlayer(${team.id})">
          <button class="btn-sm" onclick="addPlayer(${team.id})">Add</button>
        </div>
        <div class="team-admin-bar">
          <button class="btn-sm gold" onclick="openChangeCaptain(${team.id})">👑 Captain</button>
          <button class="btn-sm danger" onclick="removeTeam(${team.id})">Remove Team</button>
        </div>
      </div>
    </div>`).join('');
  setupReveal();
  updateCaptainPanel();
  if (!requireAdmin()) return;
  const teamsList = teams();
  const stats = {};
  teamsList.forEach(t => {
    stats[t.name] = { id: t.id, name: t.name, w:0, l:0, sw:0, sl:0, pts:0, weekly: {1:0,2:0,3:0,4:0,5:0} };
  });
  const lineups = LeagueStore.matchLineups || [];
  lineups.forEach(entry => {
    if (!entry || entry.status !== 'played' || !entry.winner) return;
    const winner = entry.winner, loser = entry.loser;
    const weekInfo = getWeekForDate(entry.date);
    let weekNum = null;
    if (weekInfo && typeof weekInfo.week === 'string') {
      const m = weekInfo.week.match(/\d+/);
      weekNum = m ? parseInt(m[0],10) : null;
    }
    if (stats[winner]) { stats[winner].w = (stats[winner].w || 0) + 1; stats[winner].pts = (stats[winner].pts || 0) + 1; if (weekNum && stats[winner].weekly[weekNum] !== undefined) stats[winner].weekly[weekNum] += 1; }
    if (stats[loser]) { stats[loser].l = (stats[loser].l || 0) + 1; }
  });
  const newStandings = Object.values(stats).map(s => ({ id: s.id, name: s.name, w: s.w, l: s.l, sw: s.sw || 0, sl: s.sl || 0, pts: s.pts || 0 }));
  LeagueStore.standings = newStandings;
  renderStandings();
  notify('🔁 Standings recomputed from match history.');
}

function removeTeam(id) {
  if (!requireAdmin() || !confirm('Remove this team?')) return;
  const t = teams().find(x => x.id === id);
  if (!t) return;
  LeagueStore.teams = teams().filter(x => x.id !== id);
  LeagueStore.standings = standings().filter(s => s.id !== id);
  renderTeams(); renderStandings(); updateTeamSelects();
  if (typeof renderLineupTeamSelect === 'function') { renderLineupTeamSelect(); renderLineupCard(); }
  updateStats();
  notify(`🗑 "${t.name}" removed.`);
}

function addPlayer(teamId) {
  if (!requireAdmin()) return;
  const inp = document.getElementById('pi_' + teamId);
  const name = inp ? inp.value.trim() : '';
  if (!name) return;
  const team = teams().find(x => x.id === teamId);
  if (team.players.some(p => playerName(p).toLowerCase() === name.toLowerCase())) { notify('⚠️ Player already on this team.'); return; }
  team.players.push({ name, isCaptain: false, ecRank: null, rankPicked: team.players.length + 1, lane: '' });
  LeagueStore.persist();
  renderTeams(); updateStats();
  if (typeof renderLineupCard === 'function') renderLineupCard();
  notify(`✅ ${name} added to ${team.name}`);
}

function removePlayerByIndex(teamId, idx) {
  if (!requireAdmin()) return;
  const team = teams().find(x => x.id === teamId);
  if (playerIsCaptain(team.players[idx], idx)) { notify('⚠️ Cannot remove captain. Change captain first.'); return; }
  const removed = playerName(team.players.splice(idx, 1)[0]);
  LeagueStore.persist();
  renderTeams(); updateStats();
  if (typeof renderLineupCard === 'function') renderLineupCard();
  notify(`🗑 ${removed} removed.`);
}

function openChangeCaptain(teamId) {
  if (!requireAdmin()) return;
  const team = teams().find(x => x.id === teamId);
  const others = team.players.filter((p, i) => !playerIsCaptain(p, i)).map(playerName);
  if (!others.length) { notify('No other players to promote.'); return; }
  _capTarget = teamId;
  document.getElementById('captainModalSub').textContent = team.name + ' — select new captain';
  document.getElementById('captainSelect').innerHTML = others.map(n => `<option value="${n}">${n}</option>`).join('');
  openOverlay('captainModal');
}

function confirmChangeCaptain() {
  if (!requireAdmin()) return;
  const newCap = document.getElementById('captainSelect').value;
  const team = teams().find(x => x.id === _capTarget);
  if (!team || !newCap) return;
  team.players.forEach((p, i) => {
    if (typeof p === 'object') p.isCaptain = false;
  });
  const idx = team.players.findIndex(p => playerName(p).toLowerCase() === newCap.toLowerCase());
  if (idx === -1) { notify('Player not found.'); return; }
  if (typeof team.players[idx] === 'object') team.players[idx].isCaptain = true;
  const cap = team.players.splice(idx, 1)[0];
  team.players.unshift(cap);
  team.captain = newCap;
  LeagueStore.persist();
  closeOverlay('captainModal');
  renderTeams();
  if (typeof renderLineupCard === 'function') renderLineupCard();
  notify(`👑 ${newCap} is now captain of ${team.name}`);
}

/**
 * Find all lineups scheduled for a specific match
 * @param {object} match - Match object with home, away, date properties
 * @returns {array} Array of matching lineups
 */
function getLineupsForMatch(match) {
  const lineups = LeagueStore.matchLineups || [];
  return lineups.filter(l => 
    l.homeTeam === match.home && 
    l.awayTeam === match.away
  );
}

function matchCardHtml(m) {
  const d = new Date(m.date + 'T12:00:00');
  const day = d.getDate(), month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
  const sLabel = m.status === 'live' ? '🔴 Live' : m.status.charAt(0).toUpperCase() + m.status.slice(1);
  const scoreHtml = m.score ? `<span>📊 ${m.score}</span>` : '';
  const weekHtml = m.week ? `<span>📆 ${m.week}${m.weekWindow ? ' (' + m.weekWindow + ')' : ''}</span>` : '';
  const typeHtml = m.matchType ? `<span>${m.matchType}</span>` : '';
  
  // Get DL lineups scheduled for this match
  const lineups = getLineupsForMatch(m);
  const dlCount = lineups.length;
  const dlsScheduled = lineups.map(l => l.dl).sort((a, b) => a - b);
  const lineupIndicator = dlCount > 0 ? `<span style="color:var(--lime);font-weight:600">✓ ${dlCount} DL${dlCount !== 1 ? 's' : ''} scheduled</span>` : '';
  
  let lineupDetailsHtml = '';
  if (lineups.length > 0) {
    const lineupCards = lineups.map(lineup => {
      const schedDate = new Date(lineup.date + 'T12:00:00');
      const schedDateStr = schedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<div style="font-size:.8rem;padding:8px;background:rgba(102,232,178,.05);border-radius:6px;margin-top:6px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600;color:var(--mint)">DL #${lineup.dl}</span>
          <span>📅 ${schedDateStr} · 🕐 ${lineup.time}</span>
        </div>
        <div style="margin-top:4px;font-size:.75rem;color:var(--muted)">📍 ${lineup.court}</div>
      </div>`;
    }).join('');
    lineupDetailsHtml = `<div style="margin-top:8px;border-top:1px solid rgba(102,232,178,.15);padding-top:8px">${lineupCards}</div>`;
  }
  
  return `<div class="match-card reveal visible">
    <div class="match-date-block"><div class="match-day">${day}</div><div class="match-month">${month}</div></div>
    <div class="match-divider"></div>
    <div class="match-info">
      <div class="match-teams">${m.home}<span class="match-vs">vs</span>${m.away}</div>
      <div class="match-meta">${weekHtml}${typeHtml}<span>🕐 ${m.time}</span><span>📍 ${m.court}</span><span>🎾 ${m.format}</span>${scoreHtml}${lineupIndicator}</div>
      ${lineupDetailsHtml}
    </div>
    <div style="text-align:right;flex-shrink:0">
      <span class="match-status status-${m.status}">${sLabel}</span>
      ${m.status !== 'completed' ? `<button class="match-cancel-btn" onclick="removeMatch(${m.id})">Cancel</button>` : ''}
    </div>
  </div>`;
}

function renderScheduledMatches() {
  const list = document.getElementById('scheduledMatchesList');
  if (!list) return;
  const m = matches();
  const upcoming = m.filter(x => x.status === 'upcoming' || x.status === 'live');
  if (!upcoming.length) {
    list.innerHTML = `<div style="text-align:center;padding:36px;color:rgba(245,240,232,.4)">
      <div style="font-size:2.5rem;margin-bottom:10px">🎾</div>
      <p>${m.length ? 'No upcoming matches right now.' : 'No matches scheduled yet. Check back once the season calendar is posted.'}</p></div>`;
    return;
  }
  list.innerHTML = upcoming.map(matchCardHtml).join('');
  setupReveal();
}

function getFilteredMatches(filter = 'all') {
  let m = matches();
  if (currentWeekFilter) m = m.filter(x => x.week === currentWeekFilter);
  if (filter !== 'all') m = m.filter(x => x.status === filter);
  return m;
}

function renderMatches(filter = 'all') {
  const list = document.getElementById('matchesList');
  const filtered = getFilteredMatches(filter);
  if (list) {
    if (!filtered.length) {
      const total = matches().length;
      list.innerHTML = `<div style="text-align:center;padding:36px;color:rgba(245,240,232,.4)">
        <div style="font-size:2.5rem;margin-bottom:10px">📅</div>
        <p>${total ? 'No matches in this filter.' : 'No matches scheduled yet. Admin can add matches once teams are registered.'}</p></div>`;
    } else list.innerHTML = filtered.map(matchCardHtml).join('');
  }
  renderScheduledMatches();
  updateStats();
  setupReveal();
}

function filterMatches(filter, btn) {
  currentFilter = filter;
  currentWeekFilter = null;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMatches(filter);
}

function filterMatchesByWeek(week, btn) {
  currentFilter = 'all';
  currentWeekFilter = week;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMatches('all');
}

function addMatch() {
  if (!requireAdmin()) return;
  const t = teams();
  if (t.length < 2) { notify('⚠️ Need at least 2 teams to schedule a match.'); return; }
  const home = document.getElementById('matchHome').value;
  const away = document.getElementById('matchAway').value;
  const date = document.getElementById('matchDate').value;
  const time = document.getElementById('matchTime').value;
  const court = document.getElementById('matchCourt').value;
  const format = document.getElementById('matchFormat').value;
  if (!home || !away || !date) { notify('⚠️ Fill in home team, away team, and date.'); return; }
  if (home === away) { notify('⚠️ Home and away must be different.'); return; }
  const hr = parseInt(time.split(':')[0]), mn = time.split(':')[1];
  const ampm = hr >= 12 ? 'PM' : 'AM', hr12 = hr % 12 || 12;
  const id = LeagueStore.nextMatchId;
  LeagueStore.nextMatchId = id + 1;
  matches().unshift({ id, home, away, date, time: `${hr12}:${mn} ${ampm}`, court, format, status: 'upcoming' });
  LeagueStore.persist();
  renderMatches(currentFilter);
  notify(`📅 Match scheduled: ${home} vs ${away}`);
}

function removeMatch(id) {
  if (!requireAdmin()) return;
  LeagueStore.matches = matches().filter(x => x.id !== id);
  renderMatches(currentFilter);
  notify('🗑 Match cancelled.');
}

function updateTeamSelects() {
  ['matchHome', 'matchAway', 'lineupOpponent'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = teams().map(t => `<option>${t.name}</option>`).join('');
  });
}

function renderStandings() {
  const wrap = document.getElementById('standingsWrap');
  if (!wrap) return;
  // Compute standings from matchLineups so percentages are calculated by points
  const teamsList = teams();
  if (!teamsList.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><h3>No Standings Yet</h3><p>Standings will appear here once teams are registered and matches are played.</p></div>`;
    return;
  }

  // Initialize team stats
  const stats = {};
  teamsList.forEach(t => {
    stats[t.name] = { name: t.name, id: t.id, totalPoints: 0, weekly: { 1:0,2:0,3:0,4:0,5:0 }, matchesPlayed: 0 };
  });

  // Tally points from played DL entries (each DL = 1 point for winner)
  const lineups = LeagueStore.matchLineups || [];
  lineups.forEach(entry => {
    if (!entry || entry.status !== 'played' || !entry.winner) return;
    const winner = entry.winner;
    const weekInfo = getWeekForDate(entry.date);
    let weekNum = null;
    if (weekInfo && typeof weekInfo.week === 'string') {
      const m = weekInfo.week.match(/\d+/);
      weekNum = m ? parseInt(m[0],10) : null;
    }
    if (!stats[winner]) return; // ignore unknown teams
    stats[winner].totalPoints = (stats[winner].totalPoints || 0) + 1;
    if (weekNum && stats[winner].weekly[weekNum] !== undefined) stats[winner].weekly[weekNum] += 1;
  });

  // Compute derived metrics and build array
  const MAX_TOTAL = 15; // 5 matches * 3 lines
  const MAX_WEEK = 3; // 3 points per week
  const rows = Object.values(stats).map(s => {
    const overallPct = Math.round((s.totalPoints / MAX_TOTAL) * 100);
    const weeklyPct = {};
    for (let w=1; w<=5; w++) weeklyPct[w] = Math.round((s.weekly[w] / MAX_WEEK) * 100);
    return { ...s, overallPct, weeklyPct };
  });

  // Sorting: if a week filter is active, sort by that week's points, else by totalPoints
  const weekFilter = currentWeekFilter; // null means overall
  const sorted = rows.sort((a,b) => {
    if (weekFilter) {
      const diff = (b.weekly[weekFilter]||0) - (a.weekly[weekFilter]||0);
      if (diff !== 0) return diff;
    }
    return (b.totalPoints || 0) - (a.totalPoints || 0);
  });

  // Render table with a column for the selected week percentage
  wrap.innerHTML = `<table class="standings-table"><thead><tr><th>#</th><th>Team</th><th style="min-width:60px">Pts (of ${MAX_TOTAL})</th><th style="min-width:90px">Overall %</th><th style="min-width:120px">Week %</th></tr></thead><tbody>
    ${sorted.map((row, i) => {
      const cls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
      const weekDisplay = weekFilter ? `${row.weekly[weekFilter]||0}/${MAX_WEEK} · ${row.weekly[weekFilter] != null ? row.weekly[weekFilter] : 0}` : Object.keys(row.weekly).map(w => `W${w}: ${row.weekly[w]||0}`).join(' · ');
      const weekPctDisplay = weekFilter ? `${row.weekly[weekFilter]||0}/${MAX_WEEK} · ${row.weekly[weekFilter] != null ? row.weekly[weekFilter] : 0}` : Object.keys(row.weekly).map(w => `${row.weekly[w]||0}/${MAX_WEEK}`).join(' · ');
      return `<tr><td><span class="rank-badge ${cls}">${i + 1}</span></td><td><div class="team-name-cell">🎾 ${row.name}</div></td><td><strong>${row.totalPoints}</strong></td><td><span class="win-pct">${row.overallPct}%</span></td><td style="font-size:.9rem;color:var(--muted)">${weekFilter ? `${row.weekly[weekFilter]||0}/${MAX_WEEK} · ${row.weekly[weekFilter]!=null?row.weekly[weekFilter]:0}%` : Object.keys(row.weekly).map(w=>`W${w}: ${row.weekly[w]||0}/${MAX_WEEK} (${row.weekly[w]?Math.round((row.weekly[w]/MAX_WEEK)*100):0}%)`).join(' · ')}</td></tr>`;
    }).join('')}</tbody></table>`;
}

function getLineup(teamId) {
  if (!lineups[teamId]) {
    const team = teams().find(t => t.id === teamId);
    lineups[teamId] = POSITIONS.map((_, i) => team && team.players[i] ? playerName(team.players[i]) : '');
  }
  return lineups[teamId];
}

function renderLineupTeamSelect() {
  const sel = document.getElementById('lineupTeamSelect');
  if (!sel) return;
  const t = teams();
  sel.innerHTML = t.length ? t.map(x => `<option value="${x.id}">${x.name}</option>`).join('') : '<option value="">No teams yet</option>';
}

function renderLineupCard() {
  const sel = document.getElementById('lineupTeamSelect');
  const card = document.getElementById('lineupCard');
  const actionsEl = document.getElementById('lineupActions');
  const hintEl = document.getElementById('lineupHint');
  if (!sel || !card) return;
  const isAdmin = AdminSession.on;
  const t = teams();
  if (!sel.value || !t.length) {
    card.innerHTML = '<li style="color:var(--muted);font-size:.83rem;padding:10px 0">No teams registered yet.</li>';
    if (actionsEl) actionsEl.style.display = 'none';
    if (hintEl) hintEl.style.display = 'none';
    return;
  }
  const teamId = parseInt(sel.value);
  const team = t.find(x => x.id === teamId);
  if (!team) return;
  const lineup = getLineup(teamId);
  card.innerHTML = POSITIONS.map((pos, i) => {
    const name = lineup[i] || '';
    const isEmpty = !name.trim();
    const rosterOpts = team.players.map(playerName).map(p => `<option value="${p}" ${p === name ? 'selected' : ''}>${p}</option>`).join('');
    return `<li class="lineup-position-item" id="lpos_${i}">
      <span class="pos-label">${pos}</span>
      <span class="pos-player-display ${isEmpty ? 'empty' : ''}" id="lpname_${i}">${isEmpty ? '— Unassigned' : name}</span>
      ${isAdmin ? `<div class="pos-controls">
        <select class="pos-select" id="lpsel_${i}" onchange="assignFromRoster(${teamId},${i},this.value)">
          <option value="">— Roster —</option>${rosterOpts}
        </select>
        <button class="pos-custom-btn" onclick="toggleCustomInput(${i})">Custom</button>
        <button class="pos-clear-btn" onclick="clearSlot(${teamId},${i})">Clear</button>
      </div>
      <input type="text" class="pos-custom-input" id="lpcustom_${i}" placeholder="Custom name…" value="${name}"
        onkeydown="if(event.key==='Enter')saveCustomName(${teamId},${i})" onblur="saveCustomName(${teamId},${i})">` : ''}
    </li>`;
  }).join('');
  if (actionsEl) actionsEl.style.display = isAdmin ? 'flex' : 'none';
  if (hintEl) hintEl.style.display = isAdmin ? 'block' : 'none';
  updateLineupPreview(teamId);
}

function toggleCustomInput(i) {
  const inp = document.getElementById('lpcustom_' + i);
  if (!inp) return;
  const show = inp.style.display !== 'inline-block';
  inp.style.display = show ? 'inline-block' : 'none';
  if (show) { inp.focus(); inp.select(); }
}
function assignFromRoster(teamId, i, name) {
  if (!requireAdmin()) return;
  getLineup(teamId)[i] = name;
  const ci = document.getElementById('lpcustom_' + i); if (ci) { ci.value = name; ci.style.display = 'none'; }
  refreshSlot(i, name); updateLineupPreview(teamId);
  if (name) notify(`✅ ${name} → ${POSITIONS[i]}`);
}
function saveCustomName(teamId, i) {
  if (!requireAdmin()) return;
  const inp = document.getElementById('lpcustom_' + i); if (!inp) return;
  getLineup(teamId)[i] = inp.value.trim();
  refreshSlot(i, inp.value.trim()); updateLineupPreview(teamId);
}
function clearSlot(teamId, i) {
  if (!requireAdmin()) return;
  getLineup(teamId)[i] = '';
  refreshSlot(i, ''); updateLineupPreview(teamId);
  notify(`🗑 ${POSITIONS[i]} cleared.`);
}
function refreshSlot(i, name) {
  const d = document.getElementById('lpname_' + i);
  if (!d) return;
  d.textContent = name || '— Unassigned';
  d.classList.toggle('empty', !name);
}
function autoFillLineup() {
  if (!requireAdmin()) return;
  const sel = document.getElementById('lineupTeamSelect');
  const team = teams().find(x => x.id === parseInt(sel.value));
  if (!team) return;
  lineups[team.id] = POSITIONS.map((_, i) => team.players[i] ? playerName(team.players[i]) : '');
  renderLineupCard();
  notify('⚡ Lineup auto-filled from roster.');
}
function clearFullLineup() {
  if (!requireAdmin() || !confirm('Clear all 6 lineup slots?')) return;
  lineups[parseInt(document.getElementById('lineupTeamSelect').value)] = ['', '', '', '', '', ''];
  renderLineupCard();
  notify('🗑 All slots cleared.');
}
function updateLineupPreview(teamId) {
  const preview = document.getElementById('lineupPreview');
  const list = document.getElementById('lineupPreviewList');
  if (!preview || !list) return;
  const lineup = getLineup(teamId);
  preview.style.display = lineup.some(n => n.trim()) ? 'block' : 'none';
  list.innerHTML = POSITIONS.map((pos, i) => {
    const n = lineup[i] || '';
    return `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border)"><span style="color:var(--grove);font-weight:600;font-family:'Bebas Neue';font-size:.9rem">${pos}</span><span style="${n ? '' : 'color:var(--muted);font-style:italic'}">${n || 'Unassigned'}</span></div>`;
  }).join('');
}
function submitLineup() {
  const date = document.getElementById('lineupDate')?.value;
  const opp = document.getElementById('lineupOpponent')?.value;
  if (!date || !opp) { notify('⚠️ Select date and opponent.'); return; }
  const sel = document.getElementById('lineupTeamSelect');
  if (sel?.value) updateLineupPreview(parseInt(sel.value));
  notify('✅ Lineup submitted! Captain notified.');
}

function renderRules() {
  const wrap = document.getElementById('rulesContent');
  if (!wrap || typeof SEASON3_RULES === 'undefined') return;
  wrap.innerHTML = SEASON3_RULES.map(([title, items]) => `
    <h3>${title}</h3>
    <ul>${items.map(li => `<li>${li}</li>`).join('')}</ul>
  `).join('');
  setupReveal();
}

function renderNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.innerHTML = news.map(n => `
    <div class="news-card reveal">
      <div class="news-card-img">${n.emoji}</div>
      <div class="news-card-body">
        <div class="news-tag">${n.tag}</div>
        <div class="news-title">${n.title}</div>
        <div class="news-date">${n.date}</div>
        <p style="font-size:.8rem;color:var(--muted);margin-top:6px;line-height:1.6">${n.text}</p>
      </div>
    </div>`).join('');
  setupReveal();
}

function updateStats() {
  const t = teams(), m = matches();
  const playerCount = t.reduce((s, x) => s + x.players.length, 0);
  const upcoming = m.filter(x => x.status === 'upcoming' || x.status === 'live').length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-teams', t.length);
  set('stat-players', playerCount);
  set('dash-teams', t.length);
  set('dash-players', playerCount);
  set('dash-matches', m.length);
  set('dash-upcoming', upcoming);
}

function closeNavDropdowns() {
  document.querySelectorAll('.nav-item.open').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.nav-dropdown-toggle.open').forEach(el => el.classList.remove('open'));
}
function toggleLeagueDropdown(e) {
  e.stopPropagation();
  const item = document.getElementById('leagueNavItem');
  const btn = item?.querySelector('.nav-dropdown-toggle');
  const open = item?.classList.contains('open');
  closeNavDropdowns();
  if (!open) { item?.classList.add('open'); btn?.classList.add('open'); }
}
function toggleMobileNav() {
  document.getElementById('navMenuWrap')?.classList.toggle('open');
}

let _nt = null;
function notify(msg, type = '') {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.className = 'notification show' + (type ? ' ' + type : '');
  clearTimeout(_nt);
  _nt = setTimeout(() => el.classList.remove('show'), 3400);
}
function setupReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.07 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    obs.observe(el);
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('visible');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  Layout.inject();
  boot();
});
