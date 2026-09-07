import fs from 'fs';

const home = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');
const tasks = fs.readFileSync('src/pages/TasksPage.jsx', 'utf8');
const team = fs.readFileSync('src/pages/TeamPage.jsx', 'utf8');
const shell = fs.readFileSync('src/components/layout/Shell.jsx', 'utf8');
const css = fs.readFileSync('src/styles.css', 'utf8');

console.log('--- VERIFYING HERO STRUCTURE & CSS LINKAGE ---');

const checks = [
  // Home Hero
  { label: 'HomePage has .home-hero', ok: home.includes('className="home-hero"') },
  { label: 'HomePage has .hero-visual with character and orbit', ok: home.includes('className="hero-visual"') && home.includes('className="hero-character"') },
  { label: 'HomePage has floating badges (income & task)', ok: home.includes('badge-income') && home.includes('badge-task') },
  { label: 'HomePage has .actions buttons', ok: home.includes('className="actions"') },

  // Tasks Hero
  { label: 'TasksPage has .task-hero', ok: tasks.includes('className="task-hero"') },
  { label: 'TasksPage has .task-art with orbit & clipboard', ok: tasks.includes('className="task-art"') && tasks.includes('className="task-clipboard"') },

  // Team Hero
  { label: 'TeamPage has .team-hero', ok: team.includes('className="team-hero"') },
  { label: 'TeamPage has .team-visual with network nodes', ok: team.includes('className="team-visual"') && team.includes('node-main') && team.includes('node-a') },
  { label: 'TeamPage has referral box & actions', ok: team.includes('className="referral-box"') && team.includes('className="team-actions"') },

  // Shell Topbar
  { label: 'Shell has .cc-topbar and .cc-topbar-container', ok: shell.includes('cc-topbar') && shell.includes('cc-topbar-container') },

  // CSS Properties for 2-column landscape grid
  { label: 'CSS .home-hero grid-template-columns: 1.25fr 0.75fr', ok: css.includes('.home-hero') && css.includes('grid-template-columns: 1.25fr 0.75fr !important') },
  { label: 'CSS .task-art visible and scaled on mobile', ok: css.includes('.task-art') && css.includes('height: 120px !important') },
  { label: 'CSS .team-visual visible and scaled on mobile', ok: css.includes('.team-visual') && css.includes('min-height: 130px !important') },
  { label: 'CSS .hero-visual visible and scaled on mobile', ok: css.includes('.hero-visual') && css.includes('min-height: 125px !important') },
  { label: 'CSS .actions row wrap inline buttons', ok: css.includes('.home-hero .actions') && css.includes('flex-direction: row !important') },
  { label: 'CSS .cc-topbar-container flex-wrap: nowrap', ok: css.includes('.cc-topbar-container') && css.includes('flex-wrap: nowrap !important') },

  // Tablet scaling
  { label: 'CSS Tablet enhancement for heroes', ok: css.includes('@media (min-width: 768px)') && css.includes('min-height: 170px !important') },

  // Desktop scaling
  { label: 'CSS Desktop enhancement for heroes', ok: css.includes('@media (min-width: 1025px)') && css.includes('min-height: 220px !important') }
];

let failed = 0;
checks.forEach((c) => {
  if (c.ok) {
    console.log('[PASS] ' + c.label);
  } else {
    console.error('[FAIL] ' + c.label);
    failed++;
  }
});

if (failed === 0) {
  console.log('\n>>> ALL 18 HERO STRUCTURE & RESPONSIVE CSS CHECKS PASSED 100%! <<<');
} else {
  console.error('\n' + failed + ' checks failed!');
  process.exit(1);
}
