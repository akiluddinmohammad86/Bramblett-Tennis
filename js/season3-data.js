/** Season 3 BTL 2026 — teams, schedule, rules (from Tennis_Tournament_D0518.xlsx). */
const DIVISION_A = new Set(['Hyderabad Hurricanes', 'Mumbai Strikers', 'Chennai Smashers', 'Bangalore Bulls']);

const SEASON3_RULES = [
  ['General', ['Bramblett Tennis League is a friendly league. EC or organizers will NOT be held responsible for any injuries, accidents or health issues.']],
  ['League Format', [
    'Bramblett Tennis League, Season 3 — Summer 2026',
    'Division A (4 teams): Hyderabad Hurricanes, Mumbai Strikers, Chennai Smashers, Bangalore Bulls',
    'Division B (4 teams): Vizag Warriors, Amaravathi Anchors, Varanasi Veers, Delhi Dragons',
    'Total league size: 48 players',
    '1 point per each line won.',
    'Weekly match score example: 1-2, 2-1, 3-0, 0-3 (main score; early bird extras are separate).',
    'Each team plays every other team in its division plus 2 cross-division matches — 5 league matches per team.'
  ]],
  ['Team Roster', [
    'Each team has 6 players and 3 doubles lines.',
    'Rank 1 players must play Line 1; Rank 6 players must play Line 3.'
  ]],
  ['Player Replacement', [
    'Emergency or injury replacements come from the Waitlist only.',
    'Once replaced, the original player cannot play again this season.'
  ]],
  ['Match Completion Timeline', [
    'Each round has one week to complete matches: Friday (start) through Thursday (end).'
  ]],
  ['Scheduling Responsibilities', [
    'Home captain coordinates with away captain within 3 days of lineup publish (by Sunday 10 PM).',
    'Home team offers 3 play dates per line (2 in week 1, 1 in week 2); each player offers at least 2 dates.',
    'If no agreement, away team offers 3 dates; default is Thursday 7 PM — team present wins.',
    'Home team books courts and provides balls; home captain reports scores to EC.',
    'Divisions A and B maintain separate standings. Walk-overs count as completed.',
    'Pausing matches only for inclement weather.'
  ]],
  ['Line-up Exchange Rules', [
    'Lineups must be exchanged by 10 PM Thursday.',
    'Default play day: first Wednesday after lineup exchange.',
    'Tiebreakers: points, head-to-head, fewest sets lost, fewest games lost, coin toss.'
  ]],
  ['Line Formation Rules', [
    'Rank 1 → Line 1; Rank 6 → Line 3.',
    'Line 1 rank sum ≤ Line 2 rank sum ≤ Line 3 rank sum.'
  ]],
  ['Semifinals & Finals', [
    'Semi 1: Division A #1 vs Division B #2 (home/away per seeding)',
    'Semi 2: Division B #1 vs Division A #2',
    'Final: winners of Semi 1 vs Semi 2',
    'Playoff lineup rules match the regular season.',
    'Season celebration: July 17, 2026.'
  ]],
  ['On-Court Rules', [
    '15-minute default: late team forfeits.',
    'Best 2 of 3 sets with full third set; optional 12-point match tiebreak if all four agree.',
    'Changeover rest: 1 minute; between sets: up to 5 minutes.',
    'One medical timeout up to 5 minutes per injury occurrence.'
  ]],
  ['Match Continuity', [
    'No pausing to finish another day unless valid (rain, courts, lights). Injury or personal commitments are not valid.',
    'ECs and captains resolve exceptions; EC decision is final.'
  ]],
  ['Match Rescheduling', [
    'Request at least 12 hours before match; new time set before rescheduling; complete by that week\'s play-by date.'
  ]],
  ['Late Passes', [
    'Two late passes per team in the regular season; captain requests before scheduling.'
  ]],
  ['Sportsmanship & Conduct', [
    'Captains enforce ranking compliance; no coaching between games.',
    'Disputes go to league ECs. Undefined cases use ALTA rules as guidance; EC decisions are final.'
  ]],
  ['Donation', ['League donations are non-refundable.']]
];

function buildSeason3Matches() {
  const weeks = [
    ['Week 1', '2026-05-31', 'May 28 – Jun 3', 'Intra-Division', [
      ['Hyderabad Hurricanes', 'Mumbai Strikers'], ['Chennai Smashers', 'Bangalore Bulls'],
      ['Vizag Warriors', 'Amaravathi Anchors'], ['Varanasi Veers', 'Delhi Dragons']
    ]],
    ['Week 2', '2026-06-07', 'Jun 4 – Jun 10', 'Cross-Division', [
      ['Vizag Warriors', 'Hyderabad Hurricanes'], ['Mumbai Strikers', 'Varanasi Veers'],
      ['Delhi Dragons', 'Chennai Smashers'], ['Bangalore Bulls', 'Amaravathi Anchors']
    ]],
    ['Week 3', '2026-06-14', 'Jun 11 – Jun 17', 'Intra-Division', [
      ['Chennai Smashers', 'Hyderabad Hurricanes'], ['Bangalore Bulls', 'Mumbai Strikers'],
      ['Varanasi Veers', 'Vizag Warriors'], ['Amaravathi Anchors', 'Delhi Dragons']
    ]],
    ['Week 4', '2026-06-21', 'Jun 18 – Jun 24', 'Cross-Division', [
      ['Hyderabad Hurricanes', 'Amaravathi Anchors'], ['Delhi Dragons', 'Mumbai Strikers'],
      ['Chennai Smashers', 'Vizag Warriors'], ['Varanasi Veers', 'Bangalore Bulls']
    ]],
    ['Week 5', '2026-06-28', 'Jun 25 – Jul 1', 'Intra-Division', [
      ['Hyderabad Hurricanes', 'Bangalore Bulls'], ['Mumbai Strikers', 'Chennai Smashers'],
      ['Vizag Warriors', 'Delhi Dragons'], ['Amaravathi Anchors', 'Varanasi Veers']
    ]],
    ['Semi Finals', '2026-07-05', 'Jul 2 – Jul 8', 'Playoffs', [
      ['Division A 1st seed', 'Division B 2nd seed'], ['Division B 1st seed', 'Division A 2nd seed']
    ]],
    ['Finals', '2026-07-12', 'Jul 9 – Jul 15', 'Playoffs', [
      ['Winner Semi Final 1', 'Winner Semi Final 2']
    ]]
  ];
  let id = 1;
  const matches = [];
  weeks.forEach(([week, date, weekWindow, matchType, pairs]) => {
    pairs.forEach(([home, away]) => {
      matches.push({
        id: id++, home, away, date, time: '7:00 PM', court: 'Courts 1–5',
        format: 'Team Match (6 courts)', status: 'upcoming', week, weekWindow, matchType
      });
    });
  });
  return matches;
}

function buildSeason3Teams() {
  const rosters = [
    {
      name: 'Amaravathi Anchors',
      players: [
        ['Ganesh Nukala', 1, 'Bramblett Place 2', 1],
        ['Kalyan Vadlamudi', 2, 'Trefoil Path', 2],
        ['Surya Nandury', 3, 'Bramblett Place 2', 3],
        ['Joga', 4, 'Trefoil Path', 4],
        ['Jeelan Shaik', 5, 'Walking Fern', 5],
        ['Naresh Varma Kucha', 6, 'Burning Bush', 6]
      ]
    },
    {
      name: 'Bangalore Bulls',
      players: [
        ['Sathiyaraj', 1, 'Bramblett Place 1', 1],
        ['Sreekanth Nadimpalli', 2, 'Burning Bush', 2],
        ['Pavan', 4, 'Burning Bush', 3],
        ['Shashi', 5, 'Phase1', 4],
        ['Rakesh Sarma Raparla', 4, 'Trefoil Path', 5],
        ['Santhosh Vangari', 6, 'Bramblett Place 2', 6]
      ]
    },
    {
      name: 'Chennai Smashers',
      players: [
        ['Saravanan Shanmugam', 1, 'Walking Fern', 1],
        ['Senthil Kumar Anbalahan', 2, 'Walking Fern', 2],
        ['Srinivas Doppalpudi', 2, 'Bramblett Place 1', 3],
        ['SriHarsha Boinapally', 4, 'Bramblett Place 2', 4],
        ['Janardhan', 5, 'Trefoil Path', 5],
        ['Arun Pittampalli', 6, 'Bramblett Place 1', 6]
      ]
    },
    {
      name: 'Delhi Dragons',
      players: [
        ['Shyam Kanakadandi', 1, 'Phase1', 1],
        ['Chanikya Gara', 3, 'Burning Bush', 2],
        ['Shrinivas SK', 3, 'Walking Fern', 3],
        ['Ashish', 5, 'Bramblett Place 1', 4],
        ['Manohara Puttaswamy', 6, 'Burning Bush', 5],
        ['Krishna Gandhi', 6, 'Burning Bush', 6]
      ]
    },
    {
      name: 'Hyderabad Hurricanes',
      players: [
        ['Saravana Ramesh', 1, 'Bramblett Place 1', 1],
        ['Hemanth Kumar Yadav', 2, 'Bramblett Place 2', 2],
        ['Dushyanth Reddy', 3, 'Bramblett Place 1', 3],
        ['AB - Arvind Bellur', 4, 'Trefoil Path', 4],
        ['Praveen Mekala', 5, 'Trefoil Path', 5],
        ['Abhishek Pulla', 6, 'Inkberry', 6]
      ]
    },
    {
      name: 'Mumbai Strikers',
      players: [
        ['Amol Joshi', 1, 'Burning Bush', 1],
        ['Anand', 2, 'Bramblett Place 1', 2],
        ['Adithan', 3, 'Inkberry', 3],
        ['Karthikeyan Selva', 4, 'Inkberry', 4],
        ['Narendra Peddineni', 5, 'Walking Fern', 5],
        ['Mounesh', 6, 'Walking Fern', 6]
      ]
    },
    {
      name: 'Varanasi Veers',
      players: [
        ['Varun Dontula', 1, 'Inkberry', 1],
        ['Shankaran', 2, 'Walking Fern', 2],
        ['Chavva Pradeep', 3, 'Phase1', 3],
        ['Gopi Srungavarapu', 3, 'Bramblett Place 2', 4],
        ['Akhil', 4, 'Trefoil Path', 5],
        ['Sreekanth Gnananeethi', 5, 'Bramblett Place 1', 6]
      ]
    },
    {
      name: 'Vizag Warriors',
      players: [
        ['Mallikharjuna Notu', 1, 'Bramblett Place 2', 1],
        ['Santosh Sadasivuni', 2, 'Trefoil Path', 2],
        ['Arunakumar Arahunashi', 3, 'Burning Bush', 3],
        ['Maddy', 4, 'Walking Fern', 4],
        ['Kalyan Sanubala', 5, 'Bramblett Place 2', 5],
        ['Mahesh', 6, 'Walking Fern', 6]
      ]
    }
  ];

  const teams = rosters.map((r, i) => {
    const id = i + 1;
    const players = r.players.map(([name, ecRank, lane, rankPicked], idx) => ({
      name,
      ecRank,
      lane,
      rankPicked,
      isCaptain: idx === 0
    }));
    return {
      id,
      name: r.name,
      captain: players[0].name,
      division: DIVISION_A.has(r.name) ? 'Division A' : 'Division B',
      email: '',
      players
    };
  });

  const standings = teams.map(t => ({
    id: t.id,
    name: t.name,
    w: 0,
    l: 0,
    sw: 0,
    sl: 0,
    pts: 0
  }));

  const matches = buildSeason3Matches();
  return {
    seedId: 'season3-btl-2026-v3',
    teams,
    standings,
    matches,
    matchLineups: [],
    nextTeamId: teams.length + 1,
    nextMatchId: matches.length + 1,
    nextLineupId: 1
  };
}

function getSeason3Seed() {
  return buildSeason3Teams();
}
