const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'stripe-payments-migration.sql'), 'utf8');
const checkoutFunction = fs.readFileSync(path.join(root, 'supabase', 'functions', 'create-stripe-checkout', 'index.ts'), 'utf8');
const webhook = fs.readFileSync(path.join(root, 'supabase', 'functions', 'stripe-webhook', 'index.ts'), 'utf8');

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
  'id="plans-contact-button"',
  'id="plans-payment-notice"',
  'id="profile-payment-plan"',
  'id="profile-payment-credits"'
].forEach((token) => assert.ok(html.includes(token), `elemento ausente: ${token}`));

[
  'const monetizationPlans =',
  'async function openStripeCheckout(',
  'const stripeCreditOffers =',
  'async function fetchPaymentEntitlements(',
  'function renderPlansScreen()',
  'function openPlans()',
  "supabaseClient.functions.invoke('create-stripe-checkout'",
  'function friendlyCheckoutError(',
  "showPlansPaymentNotice(friendlyCheckoutError(details?.error), 'error')",
  "document.querySelectorAll('[data-credit-amount]')",
  "document.querySelectorAll('[data-plans-tab]')",
  "if (id === 'plans-screen') return 'plans';",
  "else if (button.dataset.nav === 'plans') openPlans();",
  "else if (destination === 'plans') openPlans();"
].forEach((token) => assert.ok(app.includes(token), `lógica ausente: ${token}`));

[
  'estuda_premium_monthly',
  'estuda_premium_annual',
  'estuda_family_monthly',
  'estuda_family_annual',
  'estuda_credits_10',
  'estuda_credits_25',
  'estuda_credits_60',
  'data-plan-checkout="premium-monthly"',
  'data-plan-checkout="family-annual"',
  'Pagamento seguro pelo Stripe'
].forEach((token) => assert.ok(app.includes(token), `checkout Stripe ausente: ${token}`));

[
  'create table if not exists public.stripe_webhook_events',
  'create or replace function public.apply_stripe_purchase',
  'grant execute on function public.apply_stripe_purchase'
].forEach((token) => assert.ok(migration.includes(token), `migração Stripe ausente: ${token}`));

[
  'stripe.checkout.sessions.create',
  'supabase.auth.getUser()',
  'lookup_keys: [offer.lookupKey]',
  "error: 'PAYMENT_CONFIGURATION_MISMATCH'",
  "integration_identifier: 'estuda_web_kjrwvhtn'",
  'mode: offer.mode',
  "request.method === 'OPTIONS'",
  "'Access-Control-Allow-Origin': '*'",
  "'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'"
].forEach((token) => assert.ok(checkoutFunction.includes(token), `checkout function ausente: ${token}`));

[
  "request.headers.get('Stripe-Signature')",
  'constructEventAsync',
  'apply_stripe_purchase',
  'checkout.session.completed',
  'customer.subscription.deleted'
].forEach((token) => assert.ok(webhook.includes(token), `webhook Stripe ausente: ${token}`));

[
  'pay.hotmart.com',
  'openHotmartCheckout',
  'hotmartCreditOffers'
].forEach((token) => assert.ok(!app.includes(token), `referência Hotmart não deve ficar no app: ${token}`));

[
  '.plans-screen',
  '.plans-screen:not(.active)',
  '.plans-screen.active',
  '.plans-tabs',
  '.plans-payment-notice',
  '.plans-tab-panel',
  '.plans-grid',
  '.plans-credit-purchase',
  '.plans-commercial-card'
].forEach((token) => assert.ok(css.includes(token), `estilo ausente: ${token}`));

['premium-services-grid', 'school-plans-grid', 'plans-comparison-table', 'plans-faq-list', 'material-upsell-card']
  .forEach((token) => assert.ok(!html.includes(token), `bloco antigo ainda presente: ${token}`));

assert.strictEqual((app.match(/function renderPlansScreen\(\)/g) || []).length, 1, 'deve existir apenas uma implementação da tela de planos');

console.log('plans-monetization.test.js: todos os testes passaram');
