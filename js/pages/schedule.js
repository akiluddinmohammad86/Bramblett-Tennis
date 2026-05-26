function BGTA_PAGE_INIT() {
  const today = new Date().toISOString().split('T')[0];
  const md = document.getElementById('matchDate');
  if (md) md.value = today;
  updateTeamSelects();
  currentWeekFilter = null;
  currentFilter = 'all';
  renderMatches('all');
}
