import Stripe from 'npm:stripe@22.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://estudamais.net',
  'https://www.estudamais.net',
  'https://app-estudo-one.vercel.app',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

function corsHeadersFor(request: Request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://www.estudamais.net',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(request: Request, body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeadersFor(request) });
}

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

function safeReturnUrl(value: unknown) {
  try {
    const url = new URL(String(value || ''));
    if (allowedOrigins.has(url.origin)) return url.toString();
  } catch {
    // Usa a página pública como retorno seguro.
  }
  return 'https://www.estudamais.net/?billing=return';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(request) });
  if (request.method !== 'POST') return jsonResponse(request, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('STRIPE_API_KEY') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publishableKey = readSupabasePublishableKey();
  if (!stripeSecretKey || !supabaseUrl || !publishableKey) {
    return jsonResponse(request, { ok: false, error: 'MISSING_SERVER_SECRETS' }, 500);
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') || '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return jsonResponse(request, { ok: false, error: 'AUTH_REQUIRED' }, 401);

  const { data: subscription, error: subscriptionError } = await supabase
    .from('user_subscriptions')
    .select('offer_code, source, status')
    .eq('user_id', userData.user.id)
    .eq('source', 'stripe')
    .in('status', ['active', 'paid', 'complete', 'trialing', 'past_due'])
    .maybeSingle();
  if (subscriptionError) {
    console.error('Billing portal subscription lookup failed', { code: subscriptionError.code });
    return jsonResponse(request, { ok: false, error: 'SUBSCRIPTION_CHECK_FAILED' }, 503);
  }
  if (!subscription?.offer_code) return jsonResponse(request, { ok: false, error: 'NO_STRIPE_SUBSCRIPTION' }, 404);

  const payload = await request.json().catch(() => ({}));
  try {
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.offer_code,
      return_url: safeReturnUrl(payload.returnUrl),
    });
    return jsonResponse(request, { ok: true, url: session.url });
  } catch (error) {
    const stripeError = error as { code?: string; requestId?: string; type?: string };
    console.error('Stripe Billing Portal creation failed', { code: stripeError.code, requestId: stripeError.requestId, type: stripeError.type });
    return jsonResponse(request, { ok: false, error: 'PORTAL_CREATION_FAILED' }, 502);
  }
});
