const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

[
  'data-side-nav="plans"',
  'data-nav="plans"',
  'id="plans-screen"',
  'id="plans-grid"',
  'id="credit-packs-grid"',
  'id="premium-services-grid"',
  'id="school-plans-grid"',
  'id="plans-comparison-table"',
  'id="plans-faq-list"',
  'id="open-plans-from-material"'
].forEach((token) => assert.ok(html.includes(token), `elemento ausente: ${token}`));

[
  'const monetizationPlans =',
  'const monetizationCreditPacks =',
  'const monetizationServices =',
  'const monetizationB2B =',
  'const monetizationComparison =',
  'const monetizationFaq =',
  'function plansSummaryText()',
  'function openSalesConversation(',
  'function renderPlansScreen()',
  'function openPlans()',
  "if (id === 'plans-screen') return 'plans';",
  "else if (button.dataset.nav === 'plans') openPlans();",
  "else if (destination === 'plans') openPlans();"
].forEach((token) => assert.ok(app.includes(token), `lógica ausente: ${token}`));

[
  '.plans-screen',
  '.plans-hero-card',
  '.plans-grid',
  '.plans-mini-grid',
  '.plans-b2b-grid',
  '.plans-comparison-table'
].forEach((token) => assert.ok(css.includes(token), `estilo ausente: ${token}`));

console.log('plans-monetization.test.js: todos os testes passaram');
