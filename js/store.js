/** League + member data persisted in localStorage (permanent). */
const SEASON3_SEED_ID = 'season3-btl-2026-v3';

const LeagueStore = (function () {
  const KEY = 'bgta_league_v1';
  const MEM_KEY = 'bgta_members_v1';
  const CUR_KEY = 'bgta_current_user';

  let teams = [], matches = [], standings = [], matchLineups = [];
  let nextTeamId = 1, nextMatchId = 1, nextLineupId = 1;
  let seedId = null;
  let _members = [], _current = null;

  function applySeason3Seed() {
    if (typeof getSeason3Seed !== 'function') {
      console.error('BGTA: season3-data.js failed to load — teams cannot be seeded.');
      return false;
    }
    const s = getSeason3Seed();
    teams = s.teams;
    matches = s.matches || [];
    standings = s.standings;
    matchLineups = s.matchLineups || [];
    nextTeamId = s.nextTeamId;
    nextMatchId = s.nextMatchId;
    nextLineupId = s.nextLineupId || 1;
    seedId = s.seedId;
    saveLeague();
    return true;
  }

  function needsSeed(d) {
    if (!d || !Array.isArray(d.teams) || d.teams.length < 8) return true;
    if (!Array.isArray(d.matches) || d.matches.length < 20) return true;
    if (d.seedId !== SEASON3_SEED_ID) return true;
    return false;
  }

  function loadLeague() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        applySeason3Seed();
        return;
      }
      const d = JSON.parse(raw);
      if (needsSeed(d)) {
        applySeason3Seed();
        return;
      }
      teams = d.teams;
      matches = d.matches || [];
      standings = d.standings || [];
      matchLineups = d.matchLineups || [];
      nextTeamId = d.nextTeamId || 1;
      nextMatchId = d.nextMatchId || 1;
      nextLineupId = d.nextLineupId || 1;
      seedId = d.seedId;
      cleanupOldLineups();  // Remove malformed entries from old data format
    } catch (_) {
      applySeason3Seed();
    }
  }

  function ensureSeeded() {
    if (!teams.length) applySeason3Seed();
  }

  function cleanupOldLineups() {
    // Filter out malformed lineup entries from old data format
    // Keep only entries with proper new format: id, homeTeam, awayTeam, dl, homePlayers[], awayPlayers[], date
    const validLineups = [];
    const seen = new Set(); // Track unique lineups to prevent duplicates
    
    matchLineups.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      if (entry.id === undefined || !entry.homeTeam || !entry.awayTeam || typeof entry.dl !== 'number') return;
      if (!Array.isArray(entry.homePlayers) || entry.homePlayers.length !== 2) return;
      if (!Array.isArray(entry.awayPlayers) || entry.awayPlayers.length !== 2) return;
      if (!entry.date) return;
      
      // Use combination of key fields to prevent exact duplicates
      const key = `${entry.id}-${entry.homeTeam}-${entry.awayTeam}-${entry.dl}-${entry.date}`;
      if (seen.has(key)) {
        console.log('BGTA: Skipping duplicate lineup entry:', key);
        return;
      }
      
      seen.add(key);
      validLineups.push(entry);
    });
    
    matchLineups = validLineups;
  }

  function saveLeague() {
    localStorage.setItem(KEY, JSON.stringify({
      teams, matches, standings, matchLineups, nextTeamId, nextMatchId, nextLineupId, seedId
    }));
  }

  function loadMembers() {
    try {
      const raw = localStorage.getItem(MEM_KEY);
      if (raw) _members = JSON.parse(raw);
      const cur = localStorage.getItem(CUR_KEY);
      if (cur) _current = _members.find(u => u.email === cur) || null;
    } catch (_) { /* ignore */ }
  }

  function saveMembers() {
    localStorage.setItem(MEM_KEY, JSON.stringify(_members));
    if (_current) localStorage.setItem(CUR_KEY, _current.email);
    else localStorage.removeItem(CUR_KEY);
  }

  async function hashPw(pw) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bgta25_' + pw));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  return {
    load() { loadLeague(); loadMembers(); ensureSeeded(); },
    reseedSeason3() { applySeason3Seed(); },
    get teams() { return teams; },
    set teams(v) { teams = v; saveLeague(); },
    get matches() { return matches; },
    set matches(v) { matches = v; saveLeague(); },
    get standings() { return standings; },
    set standings(v) { standings = v; saveLeague(); },
    get matchLineups() { return matchLineups; },
    set matchLineups(v) { matchLineups = v; saveLeague(); },
    get nextLineupId() { return nextLineupId; },
    set nextLineupId(v) { nextLineupId = v; saveLeague(); },
    get nextTeamId() { return nextTeamId; },
    set nextTeamId(v) { nextTeamId = v; saveLeague(); },
    get nextMatchId() { return nextMatchId; },
    set nextMatchId(v) { nextMatchId = v; saveLeague(); },
    persist() { saveLeague(); },

    async registerMember({ name, email, pw, role, skill }) {
      if (_members.find(u => u.email.toLowerCase() === email.toLowerCase()))
        return { ok: false, msg: 'Email already registered.' };
      const hash = await hashPw(pw);
      _members.push({ name, email, hash, role, skill, provider: 'email' });
      saveMembers();
      return { ok: true };
    },

    async login(email, pw) {
      let user = _members.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        await this.registerMember({ name, email, pw, role: 'member', skill: 'Unknown' });
        return await this.login(email, pw);
      }
      const hash = await hashPw(pw);
      if (hash !== user.hash) return { ok: false, msg: 'Incorrect password.' };
      _current = user;
      saveMembers();
      return { ok: true, user };
    },

    logout() { _current = null; saveMembers(); },
    get current() { return _current; }
  };
})();
