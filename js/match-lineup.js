/** Weekly match scheduler — 3 doubles lines, home captain schedules vs opponent. */
const DOUBLES_LINES = [1, 2, 3];

function getTeamByName(name) {
  return teams().find(t => t.name === name);
}

/**
 * Determine which season week a given date falls into based on season3 match schedule
 * @param {string} dateStr - ISO date string (e.g., "2026-05-31")
 * @returns {object} week info { week, weekWindow, matchType } or null if not found
 */
function getWeekForDate(dateStr) {
  const scheduleMatches = matches().filter(m => m.week); // Get season schedule matches
  if (!scheduleMatches.length) return null;
  
  const scheduledDate = new Date(dateStr);
  const weekMap = {}; // Map to avoid duplicate week entries
  
  // Build a map of weeks with their date ranges
  scheduleMatches.forEach(m => {
    if (!weekMap[m.week]) {
      weekMap[m.week] = {
        week: m.week,
        weekWindow: m.weekWindow,
        matchType: m.matchType,
        date: new Date(m.date)
      };
    }
  });
  
  // Find the matching week (match date should fall within the week window date)
  const weeks = Object.values(weekMap).sort((a, b) => a.date - b.date);
  for (let i = 0; i < weeks.length; i++) {
    const currentWeek = weeks[i];
    const nextWeekDate = weeks[i + 1] ? weeks[i + 1].date : new Date('2026-12-31');
    
    if (scheduledDate >= currentWeek.date && scheduledDate < nextWeekDate) {
      return {
        week: currentWeek.week,
        weekWindow: currentWeek.weekWindow,
        matchType: currentWeek.matchType
      };
    }
  }
  
  return null;
}

function playerOptionsHtml(team, selected) {
  if (!team) return '<option value="">— Select team first —</option>';
  const names = team.players.map(p => playerName(p));
  return '<option value="">— Select player —</option>' +
    names.map(n => `<option value="${n.replace(/"/g, '&quot;')}"${n === selected ? ' selected' : ''}>${n}</option>`).join('');
}

function initSchedulerDLines() {
  const container = document.getElementById('dlLinesContainer');
  if (!container) return;
  container.innerHTML = DOUBLES_LINES.map(dl => `
    <div class="dl-block reveal visible" style="margin-bottom:24px;padding:16px;border:1px solid var(--border);border-radius:8px;background:rgba(102,232,178,.02)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--mint-fade)">
        <h4 class="dl-title" style="margin:0;color:var(--mint)">🎾 Doubles Line #${dl}</h4>
        <span style="font-size:.75rem;color:var(--muted);background:rgba(102,232,178,.1);padding:4px 10px;border-radius:4px">DL #${dl}</span>
      </div>
      
      <div class="dl-matchup" style="margin-bottom:16px">
        <div class="dl-side">
          <span class="dl-side-label" id="dlHomeLabel${dl}">Home Team</span>
          <div class="dl-players">
            <select class="dl-select" id="dl${dl}HomeP1" aria-label="DL${dl} home player 1"></select>
            <select class="dl-select" id="dl${dl}HomeP2" aria-label="DL${dl} home player 2"></select>
          </div>
        </div>
        <div class="dl-vs-col">VS</div>
        <div class="dl-side">
          <span class="dl-side-label" id="dlAwayLabel${dl}">Opponent Team</span>
          <div class="dl-players">
            <select class="dl-select" id="dl${dl}AwayP1" aria-label="DL${dl} away player 1"></select>
            <select class="dl-select" id="dl${dl}AwayP2" aria-label="DL${dl} away player 2"></select>
          </div>
        </div>
      </div>

      <div class="form-row" style="margin-bottom:12px;gap:12px">
        <div class="fg" style="flex:1"><label>Date</label><input type="date" id="dl${dl}Date"></div>
        <div class="fg" style="flex:1"><label>Time</label><input type="time" id="dl${dl}Time" value="19:00"></div>
        <div class="fg" style="flex:1"><label>Court</label>
          <select id="dl${dl}Court">
            <option value="Bramblett">Bramblett</option>
            <option value="Matt Community Park">Matt Community Park</option>
            <option value="Sawnee Community Park">Sawnee Community Park</option>
          </select>
        </div>
      </div>

      <div style="display:flex;gap:8px">
        <button id="saveDLBtn${dl}" class="btn-primary" onclick="saveDLLineup(${dl})" style="flex:1;padding:10px">Save DL #${dl}</button>
        <button id="cancelDLBtn${dl}" class="btn-secondary" onclick="cancelEditingScheduledLineup(${dl})" style="display:none">Cancel</button>
      </div>
    </div>
  `).join('');
}

function initSchedulerTeamDropdowns() {
  const homeSel = document.getElementById('schedHomeTeam');
  const awaySel = document.getElementById('schedAwayTeam');
  const t = teams();
  const opts = '<option value="">— Select team —</option>' +
    t.map(x => `<option value="${x.name}">${x.name}</option>`).join('');
  if (homeSel) homeSel.innerHTML = opts;
  if (awaySel) awaySel.innerHTML = opts;
}

function onSchedulerTeamChange() {
  const home = document.getElementById('schedHomeTeam')?.value || '';
  const away = document.getElementById('schedAwayTeam')?.value || '';
  const homeTeam = getTeamByName(home);
  const awayTeam = getTeamByName(away);

  DOUBLES_LINES.forEach(dl => {
    ['P1', 'P2'].forEach(slot => {
      const hId = `dl${dl}Home${slot}`;
      const aId = `dl${dl}Away${slot}`;
      const hEl = document.getElementById(hId);
      const aEl = document.getElementById(aId);
      const hVal = hEl?.value || '';
      const aVal = aEl?.value || '';
      if (hEl) hEl.innerHTML = playerOptionsHtml(homeTeam, hVal);
      if (aEl) aEl.innerHTML = playerOptionsHtml(awayTeam, aVal);
    });
    const hl = document.getElementById(`dlHomeLabel${dl}`);
    const al = document.getElementById(`dlAwayLabel${dl}`);
    if (hl) hl.textContent = home || 'Home Team';
    if (al) al.textContent = away || 'Opponent Team';
  });
}



function formatSchedTime(time24) {
  if (!time24) return '7:00 PM';
  const [h, m] = time24.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const hr12 = hr % 12 || 12;
  return `${hr12}:${m} ${ampm}`;
}

/**
 * Save an individual doubles line lineup
 * @param {number} dl - Doubles line number (1, 2, or 3)
 */
function saveDLLineup(dl) {
  const home = document.getElementById('schedHomeTeam')?.value?.trim();
  const away = document.getElementById('schedAwayTeam')?.value?.trim();
  const homeP1 = document.getElementById(`dl${dl}HomeP1`)?.value?.trim();
  const homeP2 = document.getElementById(`dl${dl}HomeP2`)?.value?.trim();
  const awayP1 = document.getElementById(`dl${dl}AwayP1`)?.value?.trim();
  const awayP2 = document.getElementById(`dl${dl}AwayP2`)?.value?.trim();
  const date = document.getElementById(`dl${dl}Date`)?.value;
  const time24 = document.getElementById(`dl${dl}Time`)?.value;
  const court = document.getElementById(`dl${dl}Court`)?.value;

  // Validation
  if (!home || !away) { notify('⚠️ Select home team and opponent team first.', 'error'); return; }
  if (home === away) { notify('⚠️ Home and opponent must be different teams.', 'error'); return; }
  if (!homeP1 || !homeP2) { notify(`⚠️ Select both players for ${home} on DL #${dl}.`, 'error'); return; }
  if (!awayP1 || !awayP2) { notify(`⚠️ Select both players for ${away} on DL #${dl}.`, 'error'); return; }
  if (!date) { notify(`⚠️ Select a date for DL #${dl}.`, 'error'); return; }
  if (!time24) { notify(`⚠️ Select a time for DL #${dl}.`, 'error'); return; }

  // If editing an existing lineup, update it instead of creating
  if (window._editingLineupId) {
    const editingId = window._editingLineupId;
    const list = [...LeagueStore.matchLineups];
    const idx = list.findIndex(x => x.id === editingId);
    if (idx === -1) { notify('⚠️ Editing lineup not found.', 'error'); return; }
    const entry = list[idx];
    entry.homeTeam = home;
    entry.awayTeam = away;
    entry.homePlayers = [homeP1, homeP2];
    entry.awayPlayers = [awayP1, awayP2];
    entry.date = date;
    entry.time24 = time24;
    entry.time = formatSchedTime(time24);
    entry.court = court;
    entry.status = 'scheduled';
    entry.modifiedAt = new Date().toISOString();

    list[idx] = entry;
    LeagueStore.matchLineups = list;
    LeagueStore.persist();

    notify(`✏️ DL #${dl} updated: ${home} vs ${away} on ${new Date(date).toLocaleDateString()}`);
    renderScheduledLineupsList();
    // Reset editing state and UI for this DL
    delete window._editingLineupId;
    const saveBtn = document.getElementById(`saveDLBtn${dl}`);
    if (saveBtn) saveBtn.textContent = `Save DL #${dl}`;
    const cancelBtn = document.getElementById(`cancelDLBtn${dl}`);
    if (cancelBtn) cancelBtn.style.display = 'none';
    // Clear fields
    document.getElementById(`dl${dl}HomeP1`).value = '';
    document.getElementById(`dl${dl}HomeP2`).value = '';
    document.getElementById(`dl${dl}AwayP1`).value = '';
    document.getElementById(`dl${dl}AwayP2`).value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById(`dl${dl}Date`).value = today;
    document.getElementById(`dl${dl}Time`).value = '19:00';
    return;
  }

  // Create individual DL entry
  const id = LeagueStore.nextLineupId;
  LeagueStore.nextLineupId = id + 1;
  const entry = {
    id,
    homeTeam: home,
    awayTeam: away,
    dl,
    homePlayers: [homeP1, homeP2],
    awayPlayers: [awayP1, awayP2],
    date,
    time: formatSchedTime(time24),
    time24,
    court,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  const list = [...LeagueStore.matchLineups];
  list.unshift(entry);
  LeagueStore.matchLineups = list;
  LeagueStore.persist();

  notify(`✅ DL #${dl} scheduled: ${home} vs ${away} on ${new Date(date).toLocaleDateString()}`);
  renderScheduledLineupsList();
  
  // Clear this DL's fields only
  document.getElementById(`dl${dl}HomeP1`).value = '';
  document.getElementById(`dl${dl}HomeP2`).value = '';
  document.getElementById(`dl${dl}AwayP1`).value = '';
  document.getElementById(`dl${dl}AwayP2`).value = '';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById(`dl${dl}Date`).value = today;
  document.getElementById(`dl${dl}Time`).value = '19:00';
}

function removeScheduledLineup(id) {
  if (!confirm('Remove this scheduled match lineup?')) return;
  LeagueStore.matchLineups = LeagueStore.matchLineups.filter(x => x.id !== id);
  LeagueStore.persist();
  renderScheduledLineupsList();
  notify('🗑 Scheduled lineup removed.');
}

function startEditingScheduledLineup(id) {
  const entry = LeagueStore.matchLineups.find(x => x.id === id);
  if (!entry) { notify('⚠️ Lineup not found.', 'error'); return; }
  // If scheduler form not present on this page, redirect to lineup manager with edit param
  if (!document.getElementById('schedHomeTeam')) {
    // Determine relative path to lineup.html
    const base = location.pathname.includes('/league/') ? '../lineup.html' : 'lineup.html';
    location.href = `${base}?edit=${id}`;
    return;
  }
  window._editingLineupId = id;
  // Populate main scheduler form and the DL block
  document.getElementById('schedHomeTeam').value = entry.homeTeam;
  document.getElementById('schedAwayTeam').value = entry.awayTeam;
  onSchedulerTeamChange();
  const dl = entry.dl;
  // set players
  const setIf = (selId, val) => {
    const el = document.getElementById(selId);
    if (el) el.value = val || '';
  };
  setIf(`dl${dl}HomeP1`, entry.homePlayers?.[0] || '');
  setIf(`dl${dl}HomeP2`, entry.homePlayers?.[1] || '');
  setIf(`dl${dl}AwayP1`, entry.awayPlayers?.[0] || '');
  setIf(`dl${dl}AwayP2`, entry.awayPlayers?.[1] || '');
  setIf(`dl${dl}Date`, entry.date || '');
  setIf(`dl${dl}Time`, entry.time24 || '19:00');
  setIf(`dl${dl}Court`, entry.court || 'Bramblett');
  const saveBtn = document.getElementById(`saveDLBtn${dl}`);
  if (saveBtn) saveBtn.textContent = `Update DL #${dl}`;
  const cancelBtn = document.getElementById(`cancelDLBtn${dl}`);
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  // focus
  document.getElementById(`dl${dl}HomeP1`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEditingScheduledLineup(dl) {
  if (window._editingLineupId) delete window._editingLineupId;
  const saveBtn = document.getElementById(`saveDLBtn${dl}`);
  if (saveBtn) saveBtn.textContent = `Save DL #${dl}`;
  const cancelBtn = document.getElementById(`cancelDLBtn${dl}`);
  if (cancelBtn) cancelBtn.style.display = 'none';
  // Clear fields for that DL
  ['HomeP1','HomeP2','AwayP1','AwayP2'].forEach(s => {
    const el = document.getElementById(`dl${dl}${s}`);
    if (el) el.value = '';
  });
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById(`dl${dl}Date`);
  if (dateEl) dateEl.value = today;
  const timeEl = document.getElementById(`dl${dl}Time`);
  if (timeEl) timeEl.value = '19:00';
}

function updateScheduledLineupStatus(id, status) {
  const list = [...LeagueStore.matchLineups];
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) { notify('⚠️ Lineup not found.', 'error'); return; }
  list[idx].status = status;
  list[idx].modifiedAt = new Date().toISOString();
  LeagueStore.matchLineups = list;
  LeagueStore.persist();
  renderScheduledLineupsList();
  // Also refresh matches-scheduled page view if present
  if (typeof renderCaptainScheduledLineups === 'function') renderCaptainScheduledLineups();
  notify(`Status updated to ${status}.`);
}

function setDLResult(id, winnerSide) {
  // winnerSide: 'home' or 'away'
  const list = [...LeagueStore.matchLineups];
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) { notify('⚠️ Lineup not found.', 'error'); return; }
  const entry = list[idx];
  // Capture previous result before changing
  const prevWinner = entry.winner;
  const prevLoser = entry.loser;

  if (winnerSide === 'home') {
    entry.winner = entry.homeTeam;
    entry.loser = entry.awayTeam;
  } else if (winnerSide === 'away') {
    entry.winner = entry.awayTeam;
    entry.loser = entry.homeTeam;
  } else {
    notify('⚠️ Invalid winner side.', 'error');
    return;
  }

  // Update standings: remove previous result if any, then apply new result
  const S = LeagueStore.standings || [];
  // Helper to find standing row by team name
  const findRow = name => S.find(r => r.name === name);
  // If entry already had a previous winner, revert previous counts
  if (prevWinner) {
    const prevWinnerRow = findRow(prevWinner);
    const prevLoserRow = findRow(prevLoser);
    if (prevWinnerRow) { prevWinnerRow.w = Math.max(0, prevWinnerRow.w - 1); prevWinnerRow.pts = Math.max(0, prevWinnerRow.pts - 1); }
    if (prevLoserRow) { prevLoserRow.l = Math.max(0, prevLoserRow.l - 1); }
  }

  entry.status = 'played';
  entry.modifiedAt = new Date().toISOString();
  // Apply new standings adjustments
  const winnerName = entry.winner;
  const loserName = entry.loser;
  const winnerRow = findRow(winnerName) || null;
  const loserRow = findRow(loserName) || null;
  if (winnerRow) { winnerRow.w = (winnerRow.w || 0) + 1; winnerRow.pts = (winnerRow.pts || 0) + 1; }
  if (loserRow) { loserRow.l = (loserRow.l || 0) + 1; }
  list[idx] = entry;
  LeagueStore.matchLineups = list;
  LeagueStore.persist();
  // Refresh both views
  renderScheduledLineupsList();
  if (typeof renderCaptainScheduledLineups === 'function') renderCaptainScheduledLineups();
  if (typeof renderStandings === 'function') renderStandings();
  notify(`🏁 Result recorded: ${entry.winner} def. ${entry.loser}`);
}

function clearDLResult(id) {
  if (!confirm('Clear the recorded result for this DL? This will revert standings.')) return;
  const list = [...LeagueStore.matchLineups];
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) { notify('⚠️ Lineup not found.', 'error'); return; }
  const entry = list[idx];
  if (!entry.winner && !entry.loser) { notify('⚠️ No result to clear.', 'error'); return; }

  const S = LeagueStore.standings || [];
  const findRow = name => S.find(r => r.name === name);
  const prevWinner = entry.winner;
  const prevLoser = entry.loser;
  if (prevWinner) {
    const wRow = findRow(prevWinner);
    const lRow = findRow(prevLoser);
    if (wRow) { wRow.w = Math.max(0, (wRow.w || 0) - 1); wRow.pts = Math.max(0, (wRow.pts || 0) - 1); }
    if (lRow) { lRow.l = Math.max(0, (lRow.l || 0) - 1); }
  }

  // Remove winner/loser and revert to scheduled
  delete entry.winner;
  delete entry.loser;
  entry.status = 'scheduled';
  entry.modifiedAt = new Date().toISOString();
  list[idx] = entry;
  LeagueStore.matchLineups = list;
  LeagueStore.persist();
  renderScheduledLineupsList();
  if (typeof renderCaptainScheduledLineups === 'function') renderCaptainScheduledLineups();
  if (typeof renderStandings === 'function') renderStandings();
  notify('↩️ Result cleared and standings reverted.');
}

function renderScheduledLineupsList() {
  const wrap = document.getElementById('scheduledLineupsList');
  if (!wrap) return;
  const list = LeagueStore.matchLineups;
  if (!list.length) {
    wrap.innerHTML = `<p style="font-size:.84rem;color:var(--muted);text-align:center;padding:24px">No doubles lines scheduled yet. Home captains can schedule each DL independently above.</p>`;
    return;
  }

  // Group lineups by matchup (home vs away team)
  const matchupsByWeek = {};
  const unscheduledLineups = [];
  
  list.forEach(entry => {
    const weekInfo = getWeekForDate(entry.date);
    const weekKey = weekInfo ? weekInfo.week : null;
    const matchKey = `${entry.homeTeam}vs${entry.awayTeam}`;
    
    if (weekKey) {
      if (!matchupsByWeek[weekKey]) {
        matchupsByWeek[weekKey] = {
          week: weekInfo.week,
          weekWindow: weekInfo.weekWindow,
          matchType: weekInfo.matchType,
          matchups: {}
        };
      }
      if (!matchupsByWeek[weekKey].matchups[matchKey]) {
        matchupsByWeek[weekKey].matchups[matchKey] = {
          homeTeam: entry.homeTeam,
          awayTeam: entry.awayTeam,
          lineups: []
        };
      }
      matchupsByWeek[weekKey].matchups[matchKey].lineups.push(entry);
    } else {
      unscheduledLineups.push(entry);
    }
  });

  // Sort weeks
  const sortedWeekKeys = Object.keys(matchupsByWeek).sort((a, b) => {
    const aNum = parseInt(a.match(/\d+/)?.[0] || 999);
    const bNum = parseInt(b.match(/\d+/)?.[0] || 999);
    return aNum - bNum;
  });

  // Build HTML for each week group
  let html = '';
  
  sortedWeekKeys.forEach(weekKey => {
    const weekData = matchupsByWeek[weekKey];
    const matchupCardsHtml = Object.entries(weekData.matchups).map(([matchKey, matchup]) => {
      const dlCardsHtml = matchup.lineups.map(entry => {
        const d = new Date(entry.date + 'T12:00:00');
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const homePlayersDisplay = (entry.homePlayers && Array.isArray(entry.homePlayers)) ? entry.homePlayers.join(' / ') : '—';
        const awayPlayersDisplay = (entry.awayPlayers && Array.isArray(entry.awayPlayers)) ? entry.awayPlayers.join(' / ') : '—';
        return `<div style="padding:12px;background:rgba(102,232,178,.08);border-radius:6px;border-left:3px solid var(--mint)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-weight:600;color:var(--mint)">DL #${entry.dl}</span>
            <span style="font-size:.75rem;color:var(--muted)">${dateStr} · 🕐 ${entry.time}</span>
          </div>
          <div style="font-size:.85rem;color:var(--cream);margin-bottom:6px">
            <strong>${entry.homeTeam}</strong>: ${homePlayersDisplay}
          </div>
          <div style="font-size:.85rem;color:var(--cream);margin-bottom:8px">
            <strong>${entry.awayTeam}</strong>: ${awayPlayersDisplay}
          </div>
          <div style="font-size:.8rem;color:var(--muted)">📍 ${entry.court}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <button class="btn-sm" onclick="startEditingScheduledLineup(${entry.id})" style="font-size:.75rem">Edit DL #${entry.dl}</button>
            <button class="btn-sm danger" onclick="removeScheduledLineup(${entry.id})" style="font-size:.75rem">Remove DL #${entry.dl}</button>
          </div>
        </div>`;
      }).join('');

      return `<div style="background:rgba(102,232,178,.02);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--mint-fade)">
          <div style="font-size:1rem;font-weight:600;color:var(--cream)">
            ${matchup.homeTeam} <span style="color:var(--muted)">vs</span> ${matchup.awayTeam}
          </div>
          <span style="font-size:.8rem;color:var(--muted);background:rgba(102,232,178,.1);padding:4px 8px;border-radius:4px">${matchup.lineups.length} DL${matchup.lineups.length !== 1 ? 's' : ''}</span>
        </div>
        <div style="display:grid;gap:10px">${dlCardsHtml}</div>
      </div>`;
    }).join('');

    html += `
      <div class="week-group reveal visible" style="margin-bottom:32px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--mint-fade)">
          <h3 style="margin:0;font-size:1.1rem;color:var(--mint)">${weekData.week}</h3>
          <span style="font-size:.8rem;color:var(--muted);font-weight:500">${weekData.weekWindow}</span>
          <span style="font-size:.75rem;color:var(--muted);background:rgba(102,232,178,.08);padding:3px 8px;border-radius:4px;margin-left:auto">${weekData.matchType}</span>
        </div>
        <div class="week-lineups-container" style="display:grid;gap:12px">
          ${matchupCardsHtml}
        </div>
      </div>
    `;
  });

  // Add unscheduled lineups section if any
  if (unscheduledLineups.length > 0) {
    const unscheduledByMatchup = {};
    unscheduledLineups.forEach(entry => {
      const matchKey = `${entry.homeTeam}vs${entry.awayTeam}`;
      if (!unscheduledByMatchup[matchKey]) {
        unscheduledByMatchup[matchKey] = {
          homeTeam: entry.homeTeam,
          awayTeam: entry.awayTeam,
          lineups: []
        };
      }
      unscheduledByMatchup[matchKey].lineups.push(entry);
    });

    const unscheduledHtml = Object.entries(unscheduledByMatchup).map(([matchKey, matchup]) => {
      const dlCardsHtml = matchup.lineups.map(entry => {
        const d = new Date(entry.date + 'T12:00:00');
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const homePlayersDisplay = (entry.homePlayers && Array.isArray(entry.homePlayers)) ? entry.homePlayers.join(' / ') : '—';
        const awayPlayersDisplay = (entry.awayPlayers && Array.isArray(entry.awayPlayers)) ? entry.awayPlayers.join(' / ') : '—';
        return `<div style="padding:12px;background:rgba(255,170,80,.08);border-radius:6px;border-left:3px solid rgba(255,170,80,.5)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-weight:600;color:rgba(255,170,80,.8)">DL #${entry.dl}</span>
            <span style="font-size:.75rem;color:var(--muted)">${dateStr} · 🕐 ${entry.time}</span>
          </div>
          <div style="font-size:.85rem;color:var(--cream);margin-bottom:6px">
            <strong>${entry.homeTeam}</strong>: ${homePlayersDisplay}
          </div>
          <div style="font-size:.85rem;color:var(--cream);margin-bottom:8px">
            <strong>${entry.awayTeam}</strong>: ${awayPlayersDisplay}
          </div>
          <div style="font-size:.8rem;color:var(--muted)">📍 ${entry.court}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <button class="btn-sm" onclick="startEditingScheduledLineup(${entry.id})" style="font-size:.75rem">Edit DL #${entry.dl}</button>
            <button class="btn-sm danger" onclick="removeScheduledLineup(${entry.id})" style="font-size:.75rem">Remove DL #${entry.dl}</button>
          </div>
        </div>`;
      }).join('');

      return `<div style="background:rgba(255,170,80,.02);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,170,80,.2)">
          <div style="font-size:1rem;font-weight:600;color:var(--cream)">
            ${matchup.homeTeam} <span style="color:var(--muted)">vs</span> ${matchup.awayTeam}
          </div>
          <span style="font-size:.8rem;color:var(--muted);background:rgba(255,170,80,.1);padding:4px 8px;border-radius:4px">${matchup.lineups.length} DL${matchup.lineups.length !== 1 ? 's' : ''}</span>
        </div>
        <div style="display:grid;gap:10px">${dlCardsHtml}</div>
      </div>`;
    }).join('');

    html += `
      <div class="week-group reveal visible">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid rgba(255,170,80,.2)">
          <h3 style="margin:0;font-size:1.1rem;color:rgba(255,170,80,.8)">📋 Other Dates</h3>
          <span style="font-size:.75rem;color:var(--muted);background:rgba(255,170,80,.08);padding:3px 8px;border-radius:4px;margin-left:auto">Not in regular schedule</span>
        </div>
        <div class="week-lineups-container" style="display:grid;gap:12px">
          ${unscheduledHtml}
        </div>
      </div>
    `;
  }

  wrap.innerHTML = html;
  setupReveal();
}

function initMatchScheduler() {
  initSchedulerDLines();
  initSchedulerTeamDropdowns();
  const today = new Date().toISOString().split('T')[0];
  
  // Initialize date fields for each DL
  DOUBLES_LINES.forEach(dl => {
    const dateEl = document.getElementById(`dl${dl}Date`);
    if (dateEl) dateEl.value = today;
  });
  
  onSchedulerTeamChange();
  renderScheduledLineupsList();

  // If page query has ?edit=ID then open that lineup for editing
  try {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
      const id = parseInt(editId, 10);
      if (!isNaN(id)) startEditingScheduledLineup(id);
    }
  } catch (e) { /* ignore */ }
}
