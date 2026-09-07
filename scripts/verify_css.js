import fs from 'fs';

const css = fs.readFileSync('src/styles.css', 'utf-8');

console.log('CSS Total length:', css.length);

const checks = [
  { name: 'Root fluid variables', test: css.includes('--font-fluid-h1') && css.includes('--safe-bottom') },
  { name: 'Zero overflow reset', test: css.includes('overflow-x: hidden') && css.includes('max-width: 100%') },
  { name: 'Touch target minimum', test: css.includes('--touch-target-min: 44px') },
  { name: 'Mobile-first dual-wallets-grid', test: css.includes('.dual-wallets-grid') && css.includes('grid-template-columns: 1fr !important') },
  { name: 'Mobile-first settings-wallets-grid', test: css.includes('.settings-wallets-grid') && css.includes('grid-template-columns: 1fr !important') },
  { name: 'Mobile-first stats 1-column', test: css.includes('.stats') && css.includes('grid-template-columns: 1fr !important') },
  { name: 'Large mobile min-width: 481px enhancement', test: css.includes('@media (min-width: 481px)') && css.includes('grid-template-columns: repeat(2, 1fr) !important') },
  { name: 'Tablet min-width: 768px enhancement', test: css.includes('@media (min-width: 768px)') && css.includes('padding: 0 24px') },
  { name: 'Desktop min-width: 1025px enhancement', test: css.includes('@media (min-width: 1025px)') && css.includes('repeat(4, 1fr) !important') },
  { name: 'Plans matrix tables non-scrollable', test: css.includes('.package-matrix-card') && css.includes('overflow-x: hidden !important') && css.includes('.matrix-table') && css.includes('table-layout: fixed !important') },
  { name: 'Hero banners 2-column landscape grid', test: css.includes('.home-hero') && css.includes('grid-template-columns: 1.25fr 0.75fr !important') },
  { name: 'Hero visual artwork preserved & scaled', test: css.includes('.hero-visual') && css.includes('.task-art') && css.includes('.team-visual') && css.includes('min-height: 125px !important') },
  { name: 'Hero action buttons inline wrap', test: css.includes('.home-hero .actions') && css.includes('flex-direction: row !important') && css.includes('flex-wrap: wrap !important') },
  { name: 'Topbar header single row non-wrapping', test: css.includes('.cc-topbar-container') && css.includes('flex-wrap: nowrap !important') },
  { name: 'Topbar header position fixed and offset', test: css.includes('.cc-topbar') && css.includes('position: fixed !important') && css.includes('.cc-main') && css.includes('padding-top: 58px !important') },
  { name: 'Topbar container locks to var(--container-max)', test: css.includes('.cc-topbar-container') && css.includes('max-width: var(--container-max) !important') },
  { name: 'Topbar desktop & large desktop padding', test: css.includes('@media (min-width: 1025px)') && css.includes('padding: 0 28px !important') && css.includes('@media (min-width: 1441px)') && css.includes('padding: 0 36px !important') },
  { name: 'Unified page wrappers 100% container alignment', test: css.includes('.settings-v2-page') && css.includes('width: 100% !important') && css.includes('max-width: 100% !important') },
  { name: 'Bottom dock expands fluidly with content container', test: css.includes('.cc-bottom-dock-container') && css.includes('max-width: var(--container-max)') && css.includes('.cc-bottom-dock') }
];

let allPassed = true;
checks.forEach((c) => {
  if (c.test) {
    console.log(`[PASS] ${c.name}`);
  } else {
    console.log(`[FAIL] ${c.name}`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\nALL RESPONSIVE ARCHITECTURE & TOPBAR BOUNDARY CHECKS PASSED!');
} else {
  process.exit(1);
}
