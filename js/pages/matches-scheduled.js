function BGTA_PAGE_INIT() {
  renderCaptainScheduledLineups();
  updateStats();
}

function renderCaptainScheduledLineups() {
  const wrap = document.getElementById('scheduledMatchesList');
  if (!wrap) return;
  
  const lineups = LeagueStore.matchLineups || [];
  if (!lineups.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:36px;color:rgba(245,240,232,.4)">
      <div style="font-size:2.5rem;margin-bottom:10px">📋</div>
      <p>No doubles lines scheduled yet. Home captains schedule lineups in the <strong>Lineup Manager</strong>.</p></div>`;
    return;
  }

  // Group lineups by week
  const lineupsByWeek = {};
  const unscheduledLineups = [];
  
  lineups.forEach(entry => {
    const weekInfo = getWeekForDate(entry.date);
    if (weekInfo) {
      const weekKey = weekInfo.week;
      if (!lineupsByWeek[weekKey]) {
        lineupsByWeek[weekKey] = {
          week: weekInfo.week,
          weekWindow: weekInfo.weekWindow,
          matchType: weekInfo.matchType,
          lineups: []
        };
      }
      lineupsByWeek[weekKey].lineups.push(entry);
    } else {
      unscheduledLineups.push(entry);
    }
  });

  // Sort weeks
  const sortedWeekKeys = Object.keys(lineupsByWeek).sort((a, b) => {
    const aNum = parseInt(a.match(/\d+/)?.[0] || 999);
    const bNum = parseInt(b.match(/\d+/)?.[0] || 999);
    return aNum - bNum;
  });

  let html = '';
  
  // Render each week group
  sortedWeekKeys.forEach(weekKey => {
    const weekData = lineupsByWeek[weekKey];
    const lineupCardsHtml = weekData.lineups.map(entry => {
      const d = new Date(entry.date + 'T12:00:00');
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const homePlayersDisplay = (entry.homePlayers && Array.isArray(entry.homePlayers)) ? entry.homePlayers.join(' / ') : '—';
      const awayPlayersDisplay = (entry.awayPlayers && Array.isArray(entry.awayPlayers)) ? entry.awayPlayers.join(' / ') : '—';
      
      return `<div class="match-card reveal visible">
        <div class="match-date-block"><div class="match-day">${d.getDate()}</div><div class="match-month">${d.toLocaleString('default', { month: 'short' }).toUpperCase()}</div></div>
        <div class="match-divider"></div>
        <div class="match-info">
          <div class="match-teams">${entry.homeTeam}<span class="match-vs">vs</span>${entry.awayTeam}</div>
          <div class="match-meta">
            <span style="color:var(--mint);font-weight:600">🎾 DL #${entry.dl}</span>
            <span>🕐 ${entry.time}</span>
            <span>📍 ${entry.court}</span>
          </div>
          <div style="margin-top:8px;padding:10px;background:rgba(102,232,178,.05);border-radius:6px;font-size:.85rem">
            <div><strong>${entry.homeTeam}</strong>: ${homePlayersDisplay}</div>
            <div style="margin-top:4px"><strong>${entry.awayTeam}</strong>: ${awayPlayersDisplay}</div>
            <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
              <label style="font-size:.85rem;color:var(--muted)">Status:</label>
              <select onchange="updateScheduledLineupStatus(${entry.id}, this.value)" style="padding:6px;border-radius:6px">
                <option value="scheduled" ${entry.status==='scheduled'?'selected':''}>Scheduled</option>
                <option value="played" ${entry.status==='played'?'selected':''}>Played</option>
                <option value="canceled" ${entry.status==='canceled'?'selected':''}>Canceled</option>
                <option value="postponed" ${entry.status==='postponed'?'selected':''}>Postponed</option>
              </select>
              <button class="btn-sm" onclick="startEditingScheduledLineup(${entry.id})">Edit</button>
              <button class="btn-sm danger" onclick="removeScheduledLineup(${entry.id})">Remove</button>
              ${entry.status === 'played' ? `<span style="background:var(--mint);color:#022;padding:6px 10px;border-radius:6px;font-weight:600">Winner: ${entry.winner}</span><span style="color:var(--muted)">Loser: ${entry.loser}</span><button class="btn-sm" style="margin-left:8px" onclick="clearDLResult(${entry.id})">Clear Result</button>` : `<button class="btn-sm" onclick="setDLResult(${entry.id}, 'home')">Mark ${entry.homeTeam} Winner</button><button class="btn-sm" onclick="setDLResult(${entry.id}, 'away')">Mark ${entry.awayTeam} Winner</button>`}
            </div>
          </div>
        </div>
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
          ${lineupCardsHtml}
        </div>
      </div>
    `;
  });

  // Add unscheduled lineups section if any
  if (unscheduledLineups.length > 0) {
    const unscheduledHtml = unscheduledLineups.map(entry => {
      const d = new Date(entry.date + 'T12:00:00');
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const homePlayersDisplay = (entry.homePlayers && Array.isArray(entry.homePlayers)) ? entry.homePlayers.join(' / ') : '—';
      const awayPlayersDisplay = (entry.awayPlayers && Array.isArray(entry.awayPlayers)) ? entry.awayPlayers.join(' / ') : '—';
      
      return `<div class="match-card reveal visible">
        <div class="match-date-block"><div class="match-day">${d.getDate()}</div><div class="match-month">${d.toLocaleString('default', { month: 'short' }).toUpperCase()}</div></div>
        <div class="match-divider"></div>
        <div class="match-info">
          <div class="match-teams">${entry.homeTeam}<span class="match-vs">vs</span>${entry.awayTeam}</div>
          <div class="match-meta">
            <span style="color:rgba(255,170,80,.8);font-weight:600">🎾 DL #${entry.dl}</span>
            <span>🕐 ${entry.time}</span>
            <span>📍 ${entry.court}</span>
          </div>
          <div style="margin-top:8px;padding:10px;background:rgba(255,170,80,.05);border-radius:6px;font-size:.85rem">
            <div><strong>${entry.homeTeam}</strong>: ${homePlayersDisplay}</div>
            <div style="margin-top:4px"><strong>${entry.awayTeam}</strong>: ${awayPlayersDisplay}</div>
            <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
              <label style="font-size:.85rem;color:var(--muted)">Status:</label>
              <select onchange="updateScheduledLineupStatus(${entry.id}, this.value)" style="padding:6px;border-radius:6px">
                <option value="scheduled" ${entry.status==='scheduled'?'selected':''}>Scheduled</option>
                <option value="played" ${entry.status==='played'?'selected':''}>Played</option>
                <option value="canceled" ${entry.status==='canceled'?'selected':''}>Canceled</option>
                <option value="postponed" ${entry.status==='postponed'?'selected':''}>Postponed</option>
              </select>
              <button class="btn-sm" onclick="startEditingScheduledLineup(${entry.id})">Edit</button>
              <button class="btn-sm danger" onclick="removeScheduledLineup(${entry.id})">Remove</button>
              ${entry.status === 'played' ? `<span style="background:var(--mint);color:#022;padding:6px 10px;border-radius:6px;font-weight:600">Winner: ${entry.winner}</span><span style="color:var(--muted)">Loser: ${entry.loser}</span><button class="btn-sm" style="margin-left:8px" onclick="clearDLResult(${entry.id})">Clear Result</button>` : `<button class="btn-sm" onclick="setDLResult(${entry.id}, 'home')">Mark ${entry.homeTeam} Winner</button><button class="btn-sm" onclick="setDLResult(${entry.id}, 'away')">Mark ${entry.awayTeam} Winner</button>`}
            </div>
          </div>
        </div>
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
