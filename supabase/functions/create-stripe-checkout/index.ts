import Stripe from 'npm:stripe@^22';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Offer = {
  id: string;
  lookupKey: string;
  label: string;
  mode: 'subscription' | 'payment';
  planId?: string;
  creditAmount?: number;
};

const offers: Record<string, Offer> = {
  'premium-monthly': { id: 'premium-monthly', lookupKey: 'estuda_premium_monthly', label: 'Premium Mensal', mode: 'subscription', planId: 'premium-monthly' },
  'premium-annual': { id: 'premium-annual', lookupKey: 'estuda_premium_annual', label: 'Premium Anual', mode: 'subscription', planId: 'premium-annual' },
  'family-monthly': { id: 'family-monthly', lookupKey: 'estuda_family_monthly', label: 'Família Mensal', mode: 'subscription', planId: 'family-monthly' },
  'family-annual': { id: 'family-annual', lookupKey: 'estuda_family_annual', label: 'Família Anual', mode: 'subscription', planId: 'family-annual' },
  'credits-10': { id: 'credits-10', lookupKey: 'estuda_credits_10', label: '10 créditos', mode: 'payment', creditAmount: 10 },
  'credits-25': { id: 'credits-25', lookupKey: 'estuda_credits_25', label: '25 créditos', mode: 'payment', creditAmount: 25 },
  'credits-60': { id: 'credits-60', lookupKey: 'estuda_credits_60', label: '60 créditos', mode: 'payment', creditAmount: 60 },
};

function readSupabasePublishableKey() {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;
  const raw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || '';
  } catch {
    return '';
  }
}

function safeReturnUrl(value: unknown, fallback: string) {
  const allowedHosts = new Set([
    'estudamais.net',
    'www.estudamais.net',
    'app-estudo-one.vercel.app',
    'localhost',
    '127.0.0.1',
  ]);
  try {
    const url = new URL(String(value || ''));
    if ((url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') && allowedHosts.has(url.hostname)) {
      return url.toString();
    }
  } catch {
    // usa fallback
  }
  return fallback;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('STRIPE_API_KEY') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publishableKey = readSupabasePublishableKey();
  if (!stripeSecretKey || !supabaseUrl || !publishableKey) {
    return Response.json({ ok: false, error: 'MISSING_SERVER_SECRETS' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) {
    return Response.json({ ok: false, error: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const offer = offers[String(payload.offerId || '')];
  if (!offer) return Response.json({ ok: false, error: 'INVALID_OFFER' }, { status: 400 });

  const stripe = new Stripe(stripeSecretKey);
  const prices = await stripe.prices.list({ lookup_keys: [offer.lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) return Response.json({ ok: false, error: 'PRICE_NOT_FOUND', lookupKey: offer.lookupKey }, { status: 404 });

  const origin = request.headers.get('Origin') || 'https://www.estudamais.net';
  const successUrl = safeReturnUrl(payload.successUrl, `${origin}/?checkout=success`);
  const cancelUrl = safeReturnUrl(payload.cancelUrl, `${origin}/?checkout=cancelled`);
  const metadata = {
    app: 'estuda_mais',
    user_id: userData.user.id,
    email: userData.user.email,
    offer_id: offer.id,
    plan_id: offer.planId || '',
    plan_label: offer.label,
    credit_amount: String(offer.creditAmount || 0),
  };

  const session = await stripe.checkout.sessions.create({
    mode: offer.mode,
    customer_email: userData.user.email,
    client_reference_id: userData.user.id,
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    ...(offer.mode === 'subscription' ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
  });

  return Response.json({ ok: true, url: session.url });
});
