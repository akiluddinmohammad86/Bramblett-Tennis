/** Injects shared nav, footer, modals, admin banner. */
const Layout = (function () {
  const leaguePages = ['rules', 'standings', 'teams', 'schedule', 'matches-scheduled'];

  function isActive(page) {
    return bgtaPageId() === page;
  }

  function isLeagueSection() {
    return leaguePages.includes(bgtaPageId());
  }

  function navLink(href, label, page) {
    const active = isActive(page) ? ' class="active"' : '';
    return `<li><a href="${bgtaHref(href)}" data-nav="${page}"${active}>${label}</a></li>`;
  }

  function leagueDropdown() {
    const items = [
      ['league/rules.html', 'Rules', 'rules'],
      ['league/standings.html', 'Dashboard (Team Standings)', 'standings'],
      ['league/teams.html', 'Teams (Team Pics)', 'teams'],
      ['league/schedule.html', 'Schedule', 'schedule'],
      ['league/matches-scheduled.html', 'Matches Scheduled', 'matches-scheduled']
    ];
    return `<li class="nav-item${isLeagueSection() ? ' active' : ''}" id="leagueNavItem">
      <button type="button" class="nav-dropdown-toggle" onclick="toggleLeagueDropdown(event)">
        League <span class="caret">▼</span>
      </button>
      <ul class="nav-dropdown">
        <li class="nav-dropdown-label">${BGTA.season}</li>
        ${items.map(([h, l, p]) => `<li><a href="${bgtaHref(h)}" data-nav="${p}"${isActive(p) ? ' class="active"' : ''}>${l}</a></li>`).join('')}
      </ul>
    </li>`;
  }

  function renderNav() {
    return `<nav>
      <a href="${bgtaHref('index.html')}" class="nav-logo">
        <div class="logo-icon">🎾</div>
        <span>Bramblett<br><em>Tennis League</em></span>
      </a>
      <button class="nav-toggle" id="navToggle" onclick="toggleMobileNav()" aria-label="Menu">☰</button>
      <div class="nav-menu-wrap" id="navMenuWrap">
        <ul class="nav-links">
          ${navLink('index.html', 'Home', 'home')}
          ${navLink('dashboard.html', 'Dashboard', 'dashboard')}
          ${leagueDropdown()}
          ${navLink('league/rules.html', 'Rules', 'rules')}
          <li id="navUserArea"><a href="#" onclick="openAuth('login');return false" class="nav-cta">Sign In</a></li>
          <li><a href="#" onclick="openAdminPrompt();return false" class="admin-nav-btn" id="adminNavBtn">⚙ Admin</a></li>
        </ul>
      </div>
    </nav>`;
  }

  function renderAdminBanner() {
    return `<div id="adminBanner">
      <div class="admin-banner-left">
        <span class="admin-banner-badge">🔐 Admin</span>
        <span class="admin-banner-text">Edit mode active</span>
        <span class="admin-timer" id="adminTimer">AUTO-LOCK: 30:00</span>
      </div>
      <button class="btn-sm danger" onclick="lockAdmin()" style="font-size:.72rem">🔒 Lock</button>
    </div>`;
  }

  function renderFooter() {
    return `<footer>
      <div class="footer-logo">Bramblett <em>Tennis League</em></div>
      <p>Season 3 · Summer 2026</p>
      <ul class="footer-links">
        <li><a href="${bgtaHref('index.html')}">Home</a></li>
        <li><a href="${bgtaHref('dashboard.html')}">Dashboard</a></li>
        <li><a href="${bgtaHref('league/standings.html')}">Standings</a></li>
        <li><a href="${bgtaHref('league/teams.html')}">Teams</a></li>
        <li><a href="${bgtaHref('league/schedule.html')}">Schedule</a></li>
        <li><a href="${bgtaHref('league/rules.html')}">Rules</a></li>
      </ul>
      <hr class="divider">
      <p class="copyright">© 2026 Bramblett Tennis League. All rights reserved.</p>
    </footer>`;
  }

  function renderModals() {
    return `<!-- ADMIN -->
<div class="overlay" id="adminModal">
  <div class="modal-box">
    <button class="modal-close" onclick="closeOverlay('adminModal');clearAdminInput()">✕</button>
    <div class="admin-lock-icon">🔐</div>
    <h2 style="text-align:center;font-size:1.25rem">Admin Console</h2>
    <p class="modal-sub" style="text-align:center">Enter the admin passphrase to unlock full edit access.</p>
    <input type="password" id="adminPwInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
      placeholder="Enter passphrase…" onkeydown="if(event.key==='Enter')verifyAdmin()">
    <p class="pw-hint">Passphrase is never stored or transmitted.</p>
    <div class="admin-error" id="adminError"></div>
    <div class="modal-actions" style="justify-content:center;margin-top:16px">
      <button class="btn-primary" style="min-width:130px" onclick="verifyAdmin()">Unlock</button>
    </div>
  </div>
</div>
<!-- AUTH -->
<div class="overlay" id="authModal">
  <div class="modal-box">
    <button class="modal-close" onclick="closeOverlay('authModal')">✕</button>
    <div id="authViewLogin">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:2rem;margin-bottom:8px">🎾</div>
        <h2>Sign In</h2>
        <p class="modal-sub">Welcome back to Bramblett Tennis League.</p>
      </div>
      <div class="aform-group"><label>Email</label>
        <input type="email" id="loginEmail" placeholder="you@example.com" autocomplete="email"
          onkeydown="if(event.key==='Enter')document.getElementById('loginPw').focus()">
      </div>
      <div class="aform-group"><label>Password</label>
        <input type="password" id="loginPw" placeholder="Your password" autocomplete="current-password"
          onkeydown="if(event.key==='Enter')signInEmail()">
      </div>
      <div class="auth-err" id="loginErr"></div>
      <button class="btn-primary" style="width:100%;margin-top:14px;padding:13px" onclick="signInEmail()">Sign In</button>
      <p style="text-align:center;font-size:.82rem;color:var(--muted);margin-top:16px">
        No account? <a href="#" onclick="showAuthView('register');return false" style="color:var(--grove);cursor:pointer;font-weight:600">Register here</a>
      </p>
    </div>
    <div id="authViewRegister" style="display:none">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:2rem;margin-bottom:8px">🎾</div>
        <h2>Create Account</h2>
        <p class="modal-sub">Join the association. Captains can register teams after signing up.</p>
      </div>
      <div class="aform-group"><label>Full Name</label><input type="text" id="regName" placeholder="Your full name" autocomplete="name"></div>
      <div class="aform-group"><label>Email</label><input type="email" id="regEmail" placeholder="you@example.com" autocomplete="email"></div>
      <div class="aform-group">
        <label>Password <span id="pwStrengthLabel" style="font-weight:400;color:var(--muted);text-transform:none;letter-spacing:0"></span></label>
        <input type="password" id="regPw" placeholder="Min 8 characters" autocomplete="new-password"
          oninput="checkPwStrength(this.value)" onkeydown="if(event.key==='Enter')registerEmail()">
        <div class="pw-strength-bar" id="pwBar"></div>
      </div>
      <div class="aform-group"><label>I am registering as a…</label>
        <select id="regRole"><option value="member">Member / Player</option><option value="captain">Team Captain</option></select>
      </div>
      <div class="aform-group"><label>Skill Level</label>
        <select id="regSkill">
          <option>Beginner (NTRP 2.0–2.5)</option><option>Intermediate (NTRP 3.0–3.5)</option>
          <option>Advanced (NTRP 4.0–4.5)</option><option>Expert (NTRP 5.0+)</option>
        </select>
      </div>
      <div class="terms-row">
        <input type="checkbox" id="regTerms">
        <label for="regTerms">I agree to BTL rules, code of conduct, and member terms.</label>
      </div>
      <div class="auth-err" id="regErr"></div>
      <button class="btn-primary" style="width:100%;margin-top:14px;padding:13px" onclick="registerEmail()">Create Account</button>
      <p style="text-align:center;font-size:.82rem;color:var(--muted);margin-top:16px">
        Already have an account? <a href="#" onclick="showAuthView('login');return false" style="color:var(--grove);cursor:pointer;font-weight:600">Sign in</a>
      </p>
    </div>
  </div>
</div>
<!-- REGISTER TEAM -->
<div class="overlay" id="registerTeamModal">
  <div class="modal-box" style="border-top:4px solid var(--lime)">
    <button class="modal-close" onclick="closeOverlay('registerTeamModal')">✕</button>
    <h2>🎾 Register a Team</h2>
    <p class="modal-sub">Fill in your team details. You'll be listed as captain and can add players after registration.</p>
    <div class="aform-group"><label>Team Name</label><input type="text" id="rtName" placeholder="e.g. The Aces"></div>
    <div class="aform-group"><label>Captain Name</label><input type="text" id="rtCaptain" placeholder="Captain's full name"></div>
    <div class="aform-group"><label>Division</label>
      <select id="rtDivision">
        <option>Division A – Open</option><option>Division B – Intermediate</option><option>Division C – Beginner</option>
      </select>
    </div>
    <div class="aform-group"><label>Contact Email</label><input type="email" id="rtEmail" placeholder="team contact email"></div>
    <div class="auth-err" id="rtErr"></div>
    <div class="modal-actions">
      <button class="btn-outline" style="border-color:var(--border);color:var(--muted)" onclick="closeOverlay('registerTeamModal')">Cancel</button>
      <button class="btn-primary" onclick="registerTeam()">Register Team</button>
    </div>
  </div>
</div>
<!-- CHANGE CAPTAIN -->
<div class="overlay" id="captainModal">
  <div class="modal-box" style="border-top:4px solid var(--gold);max-width:360px">
    <button class="modal-close" onclick="closeOverlay('captainModal')">✕</button>
    <h2 style="font-size:1.2rem">👑 Change Captain</h2>
    <p class="modal-sub" id="captainModalSub">Select new captain</p>
    <div class="aform-group"><label>New Captain</label><select id="captainSelect"></select></div>
    <div class="modal-actions">
      <button class="btn-outline" style="border-color:var(--border);color:var(--muted)" onclick="closeOverlay('captainModal')">Cancel</button>
      <button class="btn-primary" onclick="confirmChangeCaptain()">Confirm</button>
    </div>
  </div>
</div>
<div class="notification" id="notification"></div>`;
  }

  function inject() {
    const shell = document.getElementById('bgta-shell');
    if (!shell) return;
    shell.insertAdjacentHTML('afterbegin', renderNav() + renderAdminBanner());
    shell.insertAdjacentHTML('beforeend', renderFooter() + renderModals());
    document.addEventListener('click', () => closeNavDropdowns());
  }

  return { inject };
})();
