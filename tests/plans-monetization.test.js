const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'hotmart-payments-migration.sql'), 'utf8');
const webhook = fs.readFileSync(path.join(root, 'supabase', 'functions', 'hotmart-webhook', 'index.ts'), 'utf8');

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
  'id="profile-payment-plan"',
  'id="profile-payment-credits"'
].forEach((token) => assert.ok(html.includes(token), `resumo de pagamento ausente: ${token}`));

[
  'const monetizationPlans =',
  'function openSalesConversation(',
  'function openHotmartCheckout(',
  'const hotmartCreditOffers =',
  'async function fetchPaymentEntitlements(',
  'function renderPlansScreen()',
  'function openPlans()',
  "document.querySelectorAll('[data-credit-amount]')",
  "document.querySelectorAll('[data-plans-tab]')",
  "if (id === 'plans-screen') return 'plans';",
  "else if (button.dataset.nav === 'plans') openPlans();",
  "else if (destination === 'plans') openPlans();"
].forEach((token) => assert.ok(app.includes(token), `lógica ausente: ${token}`));

[
  '30uc8atl',
  'a0e3ryfd',
  'vdqbfpv9',
  '9i2k4f9f',
  '1bpijdg2',
  'm3fy8v03',
  'ey24917x',
  'data-plan-checkout="premium-monthly"',
  'data-plan-checkout="family-annual"'
].forEach((token) => assert.ok(app.includes(token), `checkout Hotmart ausente: ${token}`));

[
  'create table if not exists public.hotmart_webhook_events',
  'create table if not exists public.user_subscriptions',
  'create table if not exists public.user_credit_wallets',
  'create or replace function public.apply_hotmart_purchase',
  'grant execute on function public.apply_hotmart_purchase'
].forEach((token) => assert.ok(migration.includes(token), `migração de pagamento ausente: ${token}`));

[
  "request.headers.get('X-HOTMART-HOTTOK')",
  'apply_hotmart_purchase',
  'subscriptionOffers',
  'creditOffers'
].forEach((token) => assert.ok(webhook.includes(token), `webhook Hotmart ausente: ${token}`));

[
  '.plans-screen',
  '.plans-screen:not(.active)',
  '.plans-screen.active',
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
