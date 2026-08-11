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
  'data-plans-tab="subscriptions"',
  'data-plans-tab="credits"',
  'data-plans-tab="commercial"',
  'id="plans-panel-commercial"',
  'id="plans-contact-button"'
].forEach((token) => assert.ok(html.includes(token), `elemento ausente: ${token}`));

[
  'const monetizationPlans =',
  'function openSalesConversation(',
  'function renderPlansScreen()',
  'function openPlans()',
  "document.querySelectorAll('[data-credit-amount]')",
  "document.querySelectorAll('[data-plans-tab]')",
  "if (id === 'plans-screen') return 'plans';",
  "else if (button.dataset.nav === 'plans') openPlans();",
  "else if (destination === 'plans') openPlans();"
].forEach((token) => assert.ok(app.includes(token), `lógica ausente: ${token}`));

[
  '.plans-screen',
  '.plans-tabs',
  '.plans-tab-panel',
  '.plans-grid',
  '.plans-credit-purchase',
  '.plans-commercial-card'
].forEach((token) => assert.ok(css.includes(token), `estilo ausente: ${token}`));

['premium-services-grid', 'school-plans-grid', 'plans-comparison-table', 'plans-faq-list', 'material-upsell-card']
  .forEach((token) => assert.ok(!html.includes(token), `bloco antigo ainda presente: ${token}`));

assert.strictEqual((app.match(/function renderPlansScreen\(\)/g) || []).length, 1, 'deve existir apenas uma implementação da tela de planos');

console.log('plans-monetization.test.js: todos os testes passaram');
