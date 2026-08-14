const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'clean-app-layout.css'), 'utf8');

[
  'href="clean-app-layout.css"',
  'id="mobile-more-toggle"',
  'id="mobile-more-menu"',
  'data-nav="avatar"',
  'data-nav="essay"',
  'data-nav="review"',
  'data-nav="plans"'
].forEach((token) => assert.ok(html.includes(token), `estrutura ausente: ${token}`));

[
  'function closeMobileMoreMenu()',
  'function toggleMobileMoreMenu()',
  "button.dataset.nav === 'more'",
  "const moreDestinations = new Set(['avatar', 'essay', 'review', 'plans'])"
].forEach((token) => assert.ok(app.includes(token), `comportamento ausente: ${token}`));

[
  'grid-template-columns: 238px minmax(0, 1fr)',
  '.hero-panel .side-mascot-interactive',
  '.mobile-more-menu:not([hidden])',
  'grid-template-columns: repeat(6, minmax(0, 1fr))',
  '@media (min-width: 1320px)',
  '.dashboard-screen > .profile-card'
].forEach((token) => assert.ok(css.includes(token), `estilo ausente: ${token}`));

console.log('clean-layout.test.js: todos os testes passaram');
