/** Site paths — base is set on <body data-base=""> */
const BGTA = {
  name: 'Bramblett Tennis League',
  season: 'Season 3 BTL 2026',
  paths: {
    home: 'index.html',
    dashboard: 'dashboard.html',
    lineup: 'lineup.html',
    news: 'index.html#news',
    league: {
      rules: 'league/rules.html',
      standings: 'league/standings.html',
      teams: 'league/teams.html',
      schedule: 'league/schedule.html',
      matchesScheduled: 'league/matches-scheduled.html'
    }
  }
};

function bgtaHref(rel) {
  const base = document.body?.dataset?.base || '';
  return base + rel;
}

function bgtaPageId() {
  return document.body?.dataset?.page || 'home';
}
